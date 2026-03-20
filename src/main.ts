import './styles/global.css';
import './styles/stamps.css';
import './styles/chart.css';
import './styles/form.css';
import './styles/calendar.css';
import { initSettings } from './db/database';
import { initAppShell } from './components/app-shell';

async function main(): Promise<void> {
  await initSettings();
  initAppShell();
}

main();
