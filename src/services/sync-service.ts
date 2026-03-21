import { db } from '../db/database';
import { cycleService } from './cycle-service';
import { showToast } from '../utils/toast';

const SYNC_PENDING_KEY = 'syncPending';
const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 5000, 15000]; // exponential-ish backoff

export const syncService = {
  _retryTimer: 0 as ReturnType<typeof setTimeout> | number,

  async upload(retryCount = 0): Promise<void> {
    const observations = await db.observations.toArray();
    const cycles = await db.cycles.toArray();
    const settings = await db.settings.get(1);

    try {
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
      localStorage.removeItem(SYNC_PENDING_KEY);
    } catch (err) {
      // Mark as pending for offline queue
      localStorage.setItem(SYNC_PENDING_KEY, 'true');

      if (retryCount < MAX_RETRIES) {
        clearTimeout(this._retryTimer as ReturnType<typeof setTimeout>);
        this._retryTimer = setTimeout(() => {
          this.upload(retryCount + 1);
        }, RETRY_DELAYS[retryCount]);
      } else {
        throw err;
      }
    }
  },

  /** Flush any pending sync when we come back online */
  flushPending(): void {
    if (localStorage.getItem(SYNC_PENDING_KEY)) {
      this.upload().then(() => {
        showToast('Data synced successfully', 'success');
      }).catch(() => {});
    }
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

    // Re-evaluate cycles to fix cycleId references
    await cycleService.evaluateCycles();

    localStorage.setItem('lastSyncTime', new Date().toISOString());
    return { observations: data.observations.length, cycles: data.cycles?.length || 0 };
  },

  getLastSyncTime(): string | null {
    return localStorage.getItem('lastSyncTime');
  },
};
