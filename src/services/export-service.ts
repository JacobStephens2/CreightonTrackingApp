import { db } from '../db/database';
import type { Observation, Cycle } from '../db/models';
import { buildObservationCode } from '../utils/creighton-codes';

interface ExportData {
  version: number;
  exportDate: string;
  cycles: Cycle[];
  observations: Observation[];
}

export const exportService = {
  /** Export all data as JSON */
  async exportJSON(): Promise<string> {
    const cycles = await db.cycles.toArray();
    const observations = await db.observations.toArray();

    const data: ExportData = {
      version: 1,
      exportDate: new Date().toISOString(),
      cycles,
      observations,
    };

    return JSON.stringify(data, null, 2);
  },

  /** Export as CSV for practitioner sharing */
  async exportCSV(): Promise<string> {
    const observations = await db.observations.orderBy('date').toArray();
    const lines = [
      'Date,Cycle,Code,Stamp,Bleeding,Mucus Stretch,Mucus Chars,Frequency,Peak Day,Intercourse,Notes',
    ];

    for (const obs of observations) {
      const code = buildObservationCode(
        obs.bleeding,
        obs.mucusStretch,
        obs.mucusCharacteristics,
        obs.frequency
      );
      const row = [
        obs.date,
        obs.cycleId ?? '',
        `"${code}"`,
        obs.stamp ?? '',
        obs.bleeding ?? '',
        obs.mucusStretch ?? '',
        obs.mucusCharacteristics?.join('') ?? '',
        obs.frequency ?? '',
        obs.isPeakDay ? 'Y' : '',
        obs.intercourse ? 'Y' : '',
        `"${(obs.notes ?? '').replace(/"/g, '""')}"`,
      ];
      lines.push(row.join(','));
    }

    return lines.join('\n');
  },

  /** Import data from JSON */
  async importJSON(jsonStr: string): Promise<{ cycles: number; observations: number }> {
    const data: ExportData = JSON.parse(jsonStr);

    if (!data.version || !data.observations) {
      throw new Error('Invalid export file format');
    }

    let cycleCount = 0;
    let obsCount = 0;

    await db.transaction('rw', db.cycles, db.observations, async () => {
      // Import cycles
      if (data.cycles) {
        for (const cycle of data.cycles) {
          const existing = await db.cycles
            .where('startDate')
            .equals(cycle.startDate)
            .first();
          if (!existing) {
            const { id: _id, ...rest } = cycle;
            await db.cycles.add(rest);
            cycleCount++;
          }
        }
      }

      // Import observations
      for (const obs of data.observations) {
        const existing = await db.observations
          .where('date')
          .equals(obs.date)
          .first();
        if (!existing) {
          const { id: _id, ...rest } = obs;
          await db.observations.add(rest);
          obsCount++;
        }
      }
    });

    return { cycles: cycleCount, observations: obsCount };
  },

  /** Trigger browser download of a string as a file */
  downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },
};
