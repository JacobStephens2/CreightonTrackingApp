import type { Observation, StampType, MucusStretchCode, MucusCharacteristic } from '../db/models';

/** Determine the stamp type for an observation based on Creighton rules */
export function determineStamp(
  obs: Observation,
  context?: { peakDay?: string; postPeakCount?: number; inFertileWindow?: boolean; pastPostPeakWindow?: boolean }
): StampType {
  // Manual override takes precedence
  if (obs.stampOverride) return obs.stampOverride;

  // Peak day
  if (obs.isPeakDay) return 'whiteBabyP';

  // Post-peak count days — always fertile, regardless of observation
  if (context?.postPeakCount && context.postPeakCount >= 1 && context.postPeakCount <= 3) {
    const count = context.postPeakCount as 1 | 2 | 3;
    if (hasMucus(obs)) {
      return `whiteBaby${count}` as StampType;
    }
    return `greenBaby${count}` as StampType;
  }

  // Menstrual bleeding
  if (obs.bleeding && ['H', 'M', 'L'].includes(obs.bleeding)) {
    return 'red';
  }

  // Very light bleeding — still red stamp in Creighton
  if (obs.bleeding === 'VL') {
    return 'red';
  }

  // Brown bleeding alone — still red stamp in Creighton
  if (obs.brown) {
    return 'red';
  }

  // Mucus present
  if (hasMucus(obs)) {
    // Past the 3 post-peak count days — non-peak mucus is no longer fertile,
    // but peak-type mucus (10/K/L) still indicates fertility.
    if (context?.pastPostPeakWindow && !hasPeakTypeMucus(obs.mucusStretch, obs.mucusCharacteristics)) {
      return 'white';
    }
    return 'whiteBaby';
  }

  // Dry day
  if (isDryDay(obs)) {
    if (context?.inFertileWindow) {
      return 'greenBaby';
    }
    return 'green';
  }

  // Default: green (dry/unknown)
  return 'green';
}

const NON_MUCUS_CODES = new Set(['0', '2', '2W', '4']);

function isDryDay(obs: Observation): boolean {
  return !obs.bleeding && !obs.brown && (!obs.mucusStretch || NON_MUCUS_CODES.has(obs.mucusStretch));
}

function hasMucus(obs: Observation): boolean {
  if (!obs.mucusStretch) return false;
  return !NON_MUCUS_CODES.has(obs.mucusStretch);
}

/** Get the display color for a stamp type */
export function getStampColor(stamp: StampType): string {
  if (stamp === 'red') return 'var(--stamp-red)';
  if (stamp.startsWith('white')) return 'var(--stamp-white)';
  if (stamp.startsWith('yellow')) return 'var(--stamp-yellow)';
  return 'var(--stamp-green)';
}

/** Get stamp display label */
export function getStampLabel(stamp: StampType): string {
  switch (stamp) {
    case 'green': return '';
    case 'greenBaby': return '🐣';
    case 'whiteBaby': return '🐣';
    case 'whiteBabyP': return 'P';
    case 'whiteBaby1': return '1';
    case 'whiteBaby2': return '2';
    case 'whiteBaby3': return '3';
    case 'greenBaby1': return '1';
    case 'greenBaby2': return '2';
    case 'greenBaby3': return '3';
    case 'red': return '';
    case 'yellow': return '';
    case 'yellowBaby': return '🐣';
    default: return '';
  }
}

/** Check if stamp is a "baby" stamp (indicates potential fertility) */
export function isBabyStamp(stamp: StampType): boolean {
  return stamp.includes('Baby') || stamp.includes('baby');
}

/** Check if observation has peak-type mucus qualities */
export function hasPeakTypeMucus(stretch?: MucusStretchCode, chars?: MucusCharacteristic[]): boolean {
  if (!stretch) return false;
  const num = parseInt(stretch, 10);
  if (isNaN(num)) return false;
  if (num >= 10) return true;
  if (chars?.includes('K') || chars?.includes('L')) return true;
  return false;
}
