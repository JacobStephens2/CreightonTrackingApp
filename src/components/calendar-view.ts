import { observationService } from '../services/observation-service';
import { cycleService } from '../services/cycle-service';
import { renderMiniStamp } from './stamp';
import { showObservationForm } from './observation-form';
import { today, getDatesInMonth, firstDayOfMonth, displayMonth } from '../utils/date-utils';
import type { Observation } from '../db/models';

let currentYear: number;
let currentMonth: number;

export async function renderCalendarView(container: HTMLElement): Promise<void> {
  const now = new Date();
  if (!currentYear) currentYear = now.getFullYear();
  if (currentMonth === undefined) currentMonth = now.getMonth();

  await renderMonth(container);
}

async function renderMonth(container: HTMLElement): Promise<void> {
  container.innerHTML = '';

  // Navigation
  const nav = document.createElement('div');
  nav.className = 'calendar-nav';

  const prevBtn = document.createElement('button');
  prevBtn.className = 'calendar-nav-btn';
  prevBtn.innerHTML = '&#8249;';
  prevBtn.addEventListener('click', async () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    await renderMonth(container);
  });

  const title = document.createElement('h2');
  title.textContent = displayMonth(currentYear, currentMonth);

  const nextBtn = document.createElement('button');
  nextBtn.className = 'calendar-nav-btn';
  nextBtn.innerHTML = '&#8250;';
  nextBtn.addEventListener('click', async () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    await renderMonth(container);
  });

  nav.appendChild(prevBtn);
  nav.appendChild(title);
  nav.appendChild(nextBtn);
  container.appendChild(nav);

  // Calendar grid
  const grid = document.createElement('div');
  grid.className = 'calendar-grid';

  // Weekday headers
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (const wd of weekdays) {
    const wdEl = document.createElement('div');
    wdEl.className = 'calendar-weekday';
    wdEl.textContent = wd;
    grid.appendChild(wdEl);
  }

  // Get dates and observations
  const dates = getDatesInMonth(currentYear, currentMonth);
  const startPad = firstDayOfMonth(currentYear, currentMonth);
  const todayStr = today();

  // Fetch observations and cycles for this month
  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];
  const observations = await observationService.getRange(firstDate, lastDate);
  const obsByDate = new Map<string, Observation>();
  for (const obs of observations) {
    obsByDate.set(obs.date, obs);
  }

  // Get cycle start dates for boundary indicators
  const cycles = await cycleService.getAll();
  const cycleStartDates = new Set(cycles.map(c => c.startDate));

  // Empty padding cells
  for (let i = 0; i < startPad; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calendar-day empty';
    grid.appendChild(emptyCell);
  }

  // Day cells
  for (const dateStr of dates) {
    const dayNum = parseInt(dateStr.slice(8), 10);
    const obs = obsByDate.get(dateStr);

    const cell = document.createElement('button');
    cell.className = 'calendar-day';
    if (dateStr === todayStr) cell.classList.add('today');
    if (obs) cell.classList.add('has-obs');
    if (cycleStartDates.has(dateStr)) cell.classList.add('cycle-start');

    const numEl = document.createElement('span');
    numEl.className = 'calendar-day-num';
    numEl.textContent = String(dayNum);
    cell.appendChild(numEl);

    if (obs?.stamp) {
      cell.appendChild(renderMiniStamp(obs.stamp));
    }

    cell.addEventListener('click', () => {
      showObservationForm(dateStr, obs, () => renderMonth(container));
    });

    grid.appendChild(cell);
  }

  container.appendChild(grid);

  // Today button
  const todayBtn = document.createElement('button');
  todayBtn.className = 'btn btn-secondary btn-block';
  todayBtn.textContent = 'Go to Today';
  todayBtn.style.marginTop = '16px';
  todayBtn.addEventListener('click', async () => {
    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth();
    await renderMonth(container);
  });
  container.appendChild(todayBtn);
}

/** Reset calendar to current month (called on navigation) */
export function resetCalendar(): void {
  const now = new Date();
  currentYear = now.getFullYear();
  currentMonth = now.getMonth();
}
