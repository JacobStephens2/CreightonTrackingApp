import { db } from '../db/database';
import type { Cycle, Observation } from '../db/models';
import { daysBetween } from '../utils/date-utils';
import { hasPeakTypeMucus } from '../utils/stamp-logic';

export const cycleService = {
  /** Get all cycles ordered by start date */
  async getAll(): Promise<Cycle[]> {
    return db.cycles.orderBy('startDate').toArray();
  },

  /** Get a cycle by ID */
  async getById(id: number): Promise<Cycle | undefined> {
    return db.cycles.get(id);
  },

  /** Evaluate all observations and auto-detect cycle boundaries.
   *  A new cycle starts when bleeding (H, M, L) occurs after non-bleeding days,
   *  or when it's the very first observation. */
  async evaluateCycles(): Promise<void> {
    const allObs = await db.observations.orderBy('date').toArray();
    if (allObs.length === 0) return;

    const cycles: { startDate: string; endDate?: string }[] = [];
    let currentCycleStart: string | null = null;
    let prevWasBleeding = false;

    for (const obs of allObs) {
      const isBleeding = !!obs.bleeding && ['H', 'M', 'L'].includes(obs.bleeding);

      if (currentCycleStart === null) {
        // First observation starts first cycle
        currentCycleStart = obs.date;
        prevWasBleeding = isBleeding;
        continue;
      }

      // New cycle if we see heavy/moderate/light bleeding after non-bleeding
      if (isBleeding && !prevWasBleeding) {
        // End previous cycle
        cycles.push({ startDate: currentCycleStart });
        currentCycleStart = obs.date;
      }

      prevWasBleeding = isBleeding;
    }

    // Push the last/current cycle
    if (currentCycleStart) {
      cycles.push({ startDate: currentCycleStart });
    }

    // Set end dates (day before next cycle starts)
    for (let i = 0; i < cycles.length - 1; i++) {
      cycles[i].endDate = cycles[i + 1].startDate;
    }

    // Sync with database
    const existingCycles = await db.cycles.orderBy('startDate').toArray();

    await db.transaction('rw', db.cycles, db.observations, async () => {
      // Remove cycles that no longer match
      for (const ec of existingCycles) {
        const match = cycles.find(c => c.startDate === ec.startDate);
        if (!match) {
          await db.cycles.delete(ec.id!);
        }
      }

      // Add or update cycles
      for (const c of cycles) {
        const existing = existingCycles.find(ec => ec.startDate === c.startDate);
        if (existing) {
          const length = c.endDate ? daysBetween(c.startDate, c.endDate) : undefined;
          await db.cycles.update(existing.id!, {
            endDate: c.endDate,
            length,
          });
          // Assign cycleId to observations
          await this.assignObservationsToCycle(existing.id!, c.startDate, c.endDate);
        } else {
          const length = c.endDate ? daysBetween(c.startDate, c.endDate) : undefined;
          const id = await db.cycles.add({
            startDate: c.startDate,
            endDate: c.endDate,
            length,
          });
          await this.assignObservationsToCycle(id as number, c.startDate, c.endDate);
        }
      }
    });

    // Detect peak days for each cycle
    await this.detectPeakDays();
  },

  /** Assign observations within a date range to a cycle */
  async assignObservationsToCycle(cycleId: number, startDate: string, endDate?: string): Promise<void> {
    let obs: Observation[];
    if (endDate) {
      obs = await db.observations
        .where('date')
        .between(startDate, endDate, true, false)
        .toArray();
    } else {
      obs = await db.observations
        .where('date')
        .aboveOrEqual(startDate)
        .toArray();
    }
    for (const o of obs) {
      await db.observations.update(o.id!, { cycleId });
    }
  },

  /** Auto-detect peak days: the last day of peak-type mucus in each cycle */
  async detectPeakDays(): Promise<void> {
    const cycles = await db.cycles.toArray();
    for (const cycle of cycles) {
      const obs = await db.observations
        .where('cycleId')
        .equals(cycle.id!)
        .sortBy('date');

      let lastPeakTypeDate: string | null = null;
      for (const o of obs) {
        if (hasPeakTypeMucus(o.mucusStretch, o.mucusCharacteristics)) {
          lastPeakTypeDate = o.date;
        }
      }

      if (lastPeakTypeDate) {
        await db.cycles.update(cycle.id!, { peakDay: lastPeakTypeDate });
      }
    }
  },

  /** Get stamp context for a given date (peak day info, post-peak count) */
  async getStampContext(date: string): Promise<{
    peakDay?: string;
    postPeakCount?: number;
    inFertileWindow?: boolean;
  }> {
    // Find which cycle this date belongs to
    const obs = await db.observations.where('date').equals(date).first();
    if (!obs?.cycleId) return {};

    const cycle = await db.cycles.get(obs.cycleId);
    if (!cycle?.peakDay) return {};

    if (date === cycle.peakDay) {
      return { peakDay: cycle.peakDay };
    }

    const daysAfterPeak = daysBetween(cycle.peakDay, date);
    if (daysAfterPeak > 0 && daysAfterPeak <= 3) {
      return {
        peakDay: cycle.peakDay,
        postPeakCount: daysAfterPeak,
      };
    }

    // Check if in fertile window (mucus has started but peak not yet passed)
    if (daysAfterPeak < 0) {
      // Before peak day — check if mucus has been seen in this cycle
      const cycleObs = await db.observations
        .where('cycleId')
        .equals(obs.cycleId)
        .sortBy('date');

      const mucusStarted = cycleObs.some(
        o => o.date <= date && o.mucusStretch && o.mucusStretch !== '0'
      );
      if (mucusStarted) {
        return { inFertileWindow: true };
      }
    }

    return {};
  },
};
