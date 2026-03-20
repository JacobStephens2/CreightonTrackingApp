import { db } from '../db/database';

export const syncService = {
  async upload(): Promise<void> {
    const observations = await db.observations.toArray();
    const cycles = await db.cycles.toArray();
    const settings = await db.settings.get(1);

    const res = await fetch('/api/sync/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ observations, cycles, settings }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Sync upload failed');
    }

    localStorage.setItem('lastSyncTime', new Date().toISOString());
  },

  async download(): Promise<{ observations: number; cycles: number }> {
    const res = await fetch('/api/sync/download');
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Sync download failed');
    }

    const data = await res.json();

    await db.transaction('rw', db.observations, db.cycles, db.settings, async () => {
      await db.observations.clear();
      await db.cycles.clear();

      if (data.cycles) {
        for (const cycle of data.cycles) {
          const { id: _id, ...rest } = cycle;
          await db.cycles.add(rest);
        }
      }

      for (const obs of data.observations) {
        const { id: _id, ...rest } = obs;
        await db.observations.add(rest);
      }

      if (data.settings) {
        await db.settings.put({ ...data.settings, id: 1 });
      }
    });

    localStorage.setItem('lastSyncTime', new Date().toISOString());
    return { observations: data.observations.length, cycles: data.cycles?.length || 0 };
  },

  getLastSyncTime(): string | null {
    return localStorage.getItem('lastSyncTime');
  },
};
