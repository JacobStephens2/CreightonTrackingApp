import './styles/global.css';
import './styles/stamps.css';
import './styles/chart.css';
import './styles/form.css';
import './styles/calendar.css';
import { initSettings } from './db/database';
import { initAppShell } from './components/app-shell';
import { authService } from './services/auth-service';
import { syncService } from './services/sync-service';

async function main(): Promise<void> {
  await initSettings();
  const auth = await authService.checkAuth().catch(() => authService.state);
  initAppShell();

  // Auto-download from server on load if logged in, then re-render
  if (auth.loggedIn) {
    syncService.download()
      .then(() => {
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      })
      .catch(() => {});
  }
}

main();
