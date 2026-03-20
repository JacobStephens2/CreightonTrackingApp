import type { Observation, StampType, MucusStretchCode, MucusCharacteristic } from '../db/models';

/** Determine the stamp type for an observation based on Creighton rules */
export function determineStamp(
  obs: Observation,
  context?: { peakDay?: string; postPeakCount?: number; inFertileWindow?: boolean }
): StampType {
  // Manual override takes precedence
  if (obs.stampOverride) return obs.stampOverride;

  // Peak day
  if (obs.isPeakDay) return 'whiteBabyP';

  // Post-peak count days
  if (context?.postPeakCount && context.postPeakCount >= 1 && context.postPeakCount <= 3) {
    const isDry = isDryDay(obs);
    const count = context.postPeakCount as 1 | 2 | 3;
    if (isDry) {
      return `greenBaby${count}` as StampType;
    }
    return `whiteBaby${count}` as StampType;
  }

  // Menstrual bleeding
  if (obs.bleeding && ['H', 'M', 'L'].includes(obs.bleeding)) {
    return 'red';
  }

  // Light bleeding / brown bleeding — still red stamp in Creighton
  if (obs.bleeding && ['VL', 'B'].includes(obs.bleeding)) {
    return 'red';
  }

  // Mucus present — fertile
  if (hasMucus(obs)) {
    return 'whiteBaby';
  }

  // Dry day
  if (isDryDay(obs)) {
    // If in a fertile window context, green baby
    if (context?.inFertileWindow) {
      return 'greenBaby';
    }
    return 'green';
  }

  // Default: green (dry/unknown)
  return 'green';
}

function isDryDay(obs: Observation): boolean {
  return !obs.bleeding && (!obs.mucusStretch || obs.mucusStretch === '0');
}

function hasMucus(obs: Observation): boolean {
  if (!obs.mucusStretch) return false;
  return obs.mucusStretch !== '0';
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
    case 'greenBaby': return 'B';
    case 'whiteBaby': return 'B';
    case 'whiteBabyP': return 'P';
    case 'whiteBaby1': return '1';
    case 'whiteBaby2': return '2';
    case 'whiteBaby3': return '3';
    case 'greenBaby1': return '1';
    case 'greenBaby2': return '2';
    case 'greenBaby3': return '3';
    case 'red': return '';
    case 'yellow': return '';
    case 'yellowBaby': return 'B';
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
