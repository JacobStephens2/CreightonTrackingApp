import './styles/global.css';
import './styles/stamps.css';
import './styles/chart.css';
import './styles/form.css';
import './styles/calendar.css';
import { initSettings, db } from './db/database';
import { initAppShell } from './components/app-shell';
import { authService } from './services/auth-service';
import { syncService } from './services/sync-service';
import { showToast } from './utils/toast';

export function applyTheme(theme: 'light' | 'dark' | 'system' = 'system'): void {
  if (theme === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

async function main(): Promise<void> {
  await initSettings();

  // Apply saved theme before rendering
  const settings = await db.settings.get(1);
  applyTheme(settings?.theme ?? 'system');

  const auth = await authService.checkAuth().catch(() => authService.state);
  initAppShell();

  // Auto-download from server on load if logged in, then re-render
  if (auth.loggedIn) {
    syncService.download()
      .then(() => {
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      })
      .catch(() => showToast('Could not sync from server', 'error'));
  }

  // Auto-sync pending data when connectivity returns
  window.addEventListener('online', () => {
    if (authService.state.loggedIn) {
      syncService.flushPending();
    }
  });
}

main();
