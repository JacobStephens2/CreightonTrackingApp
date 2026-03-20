import './styles/global.css';
import './styles/stamps.css';
import './styles/chart.css';
import './styles/form.css';
import './styles/calendar.css';
import { initSettings } from './db/database';
import { initAppShell } from './components/app-shell';
import { authService } from './services/auth-service';

async function main(): Promise<void> {
  await initSettings();
  authService.checkAuth().catch(() => {});
  initAppShell();
}

main();
