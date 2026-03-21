import { router } from '../router';
import { renderChartView } from './chart-view';
import { renderCalendarView, resetCalendar } from './calendar-view';
import { renderDayDetail } from './day-detail';
import { renderSettingsView } from './settings-view';
import { renderResetPasswordView } from './reset-password-view';
import { renderVerifyEmailView } from './verify-email-view';
import { showObservationForm } from './observation-form';
import { today } from '../utils/date-utils';

// SVG icons
const ICON_CHART = `<svg viewBox="0 0 24 24"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>`;
const ICON_CALENDAR = `<svg viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg>`;
const ICON_SETTINGS = `<svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1115.6 12 3.6 3.6 0 0112 15.6z"/></svg>`;

type ActiveView = 'chart' | 'calendar' | 'day' | 'settings';

export function initAppShell(): void {
  const app = document.getElementById('app')!;
  app.innerHTML = '';

  // Header
  const header = document.createElement('header');
  header.className = 'header';
  const h1 = document.createElement('h1');
  h1.textContent = 'Creighton Tracker';
  header.appendChild(h1);
  app.appendChild(header);

  // Content
  const content = document.createElement('main');
  content.className = 'content';
  content.id = 'main-content';
  app.appendChild(content);

  // FAB
  const fab = document.createElement('button');
  fab.className = 'fab';
  fab.textContent = '+';
  fab.setAttribute('aria-label', 'Add observation for today');
  fab.addEventListener('click', () => {
    showObservationForm(today(), undefined, () => {
      // Re-render current view
      const hash = window.location.hash.slice(1) || '/';
      if (hash === '/' || hash === '/chart') renderChartView(content);
      else if (hash === '/calendar') renderCalendarView(content);
    });
  });
  app.appendChild(fab);

  // Bottom nav
  const nav = document.createElement('nav');
  nav.className = 'bottom-nav';

  const navItems: { icon: string; label: string; route: string; view: ActiveView }[] = [
    { icon: ICON_CHART, label: 'Chart', route: '/', view: 'chart' },
    { icon: ICON_CALENDAR, label: 'Calendar', route: '/calendar', view: 'calendar' },
    { icon: ICON_SETTINGS, label: 'Settings', route: '/settings', view: 'settings' },
  ];

  for (const item of navItems) {
    const btn = document.createElement('button');
    btn.className = 'nav-item';
    btn.innerHTML = `${item.icon}<span>${item.label}</span>`;
    btn.addEventListener('click', () => router.navigate(item.route));
    btn.dataset.view = item.view;
    nav.appendChild(btn);
  }
  app.appendChild(nav);

  // Set up routes
  router.on('/', () => {
    setActiveNav('chart');
    renderChartView(content);
  });

  router.on('/chart', () => {
    setActiveNav('chart');
    renderChartView(content);
  });

  router.on('/calendar', () => {
    setActiveNav('calendar');
    resetCalendar();
    renderCalendarView(content);
  });

  router.on('/day/:date', (params) => {
    setActiveNav('day');
    renderDayDetail(content, params.date);
  });

  router.on('/settings', () => {
    setActiveNav('settings');
    renderSettingsView(content);
  });

  router.on('/reset-password/:token', (params) => {
    setActiveNav('settings');
    renderResetPasswordView(content, params.token);
  });

  router.on('/verify-email/:token', (params) => {
    setActiveNav('settings');
    renderVerifyEmailView(content, params.token);
  });

  router.start();
}

function setActiveNav(view: ActiveView): void {
  document.querySelectorAll('.nav-item').forEach((el) => {
    const btn = el as HTMLElement;
    btn.classList.toggle('active', btn.dataset.view === view);
  });
}
