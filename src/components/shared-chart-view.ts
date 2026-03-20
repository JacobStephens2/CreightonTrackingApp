import { renderStamp } from './stamp';
import { displayDate, daysBetween } from '../utils/date-utils';
import type { Observation, Cycle } from '../db/models';

const CHART_COLUMNS = 35;

interface SharedData {
  firstName?: string;
  observations: Observation[];
  cycles: Cycle[];
  updatedAt: string;
}

export function renderSharedChartView(container: HTMLElement, data: SharedData): void {
  // Header
  const header = document.createElement('header');
  header.className = 'header';
  const h1 = document.createElement('h1');
  h1.textContent = data.firstName ? `${data.firstName}'s Chart` : 'Shared Chart';
  header.appendChild(h1);
  container.appendChild(header);

  const content = document.createElement('main');
  content.className = 'content';
  content.style.paddingBottom = '24px';

  // Last updated
  const updated = document.createElement('p');
  updated.style.cssText = 'text-align:center;font-size:0.8125rem;color:var(--text-secondary);margin:8px 0';
  updated.textContent = `Last updated: ${new Date(data.updatedAt).toLocaleString()}`;
  content.appendChild(updated);

  const cycles = data.cycles;
  const observations = data.observations;

  if (cycles.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<h2>No Data</h2><p>No chart data has been synced yet.</p>';
    content.appendChild(empty);
    container.appendChild(content);
    return;
  }

  // Legend
  const legend = document.createElement('div');
  legend.className = 'chart-legend';
  const legendItems = [
    { color: 'green', label: 'Dry / Infertile' },
    { color: 'red', label: 'Bleeding' },
    { color: 'white', label: 'Fertile (Mucus)' },
    { color: 'yellow', label: 'BIP' },
  ];
  for (const item of legendItems) {
    const li = document.createElement('div');
    li.className = 'legend-item';
    li.innerHTML = `<span class="legend-dot legend-dot-${item.color}"></span>${item.label}`;
    legend.appendChild(li);
  }
  content.appendChild(legend);

  // Build observation lookup by date
  const obsByDate = new Map<string, Observation>();
  for (const obs of observations) {
    obsByDate.set(obs.date, obs);
  }

  // Chart table
  const wrapper = document.createElement('div');
  wrapper.className = 'chart-container';

  const table = document.createElement('table');
  table.className = 'chart-table';

  // Header row
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headerRow.className = 'chart-header';
  const thCycle = document.createElement('th');
  thCycle.textContent = 'Cycle';
  headerRow.appendChild(thCycle);
  for (let i = 1; i <= CHART_COLUMNS; i++) {
    const th = document.createElement('th');
    th.textContent = String(i);
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Cycle rows (newest first)
  const tbody = document.createElement('tbody');
  const sortedCycles = [...cycles].sort((a, b) => b.startDate.localeCompare(a.startDate));

  for (let i = 0; i < sortedCycles.length; i++) {
    const cycle = sortedCycles[i];
    const cycleNumber = cycles.length - i;
    const row = document.createElement('tr');
    row.className = 'cycle-row';

    // Cycle label
    const tdLabel = document.createElement('td');
    const labelDiv = document.createElement('div');
    labelDiv.className = 'cycle-label';
    const numSpan = document.createElement('span');
    numSpan.className = 'cycle-label-num';
    numSpan.textContent = `#${cycleNumber}`;
    const dateSpan = document.createElement('span');
    dateSpan.className = 'cycle-label-date';
    dateSpan.textContent = displayDate(cycle.startDate);
    labelDiv.appendChild(numSpan);
    labelDiv.appendChild(dateSpan);
    if (cycle.length) {
      const lenSpan = document.createElement('span');
      lenSpan.className = 'cycle-label-len';
      lenSpan.textContent = `${cycle.length}d`;
      labelDiv.appendChild(lenSpan);
    }
    tdLabel.appendChild(labelDiv);
    row.appendChild(tdLabel);

    // Get observations for this cycle
    const cycleObs = observations.filter(o => o.cycleId === cycle.id);
    const obsByDay = new Map<number, Observation>();
    for (const obs of cycleObs) {
      const dayNum = daysBetween(cycle.startDate, obs.date) + 1;
      obsByDay.set(dayNum, obs);
    }

    const totalDays = cycle.endDate
      ? daysBetween(cycle.startDate, cycle.endDate)
      : cycleObs.length > 0
        ? daysBetween(cycle.startDate, cycleObs[cycleObs.length - 1].date) + 1
        : 1;

    for (let dayNum = 1; dayNum <= CHART_COLUMNS; dayNum++) {
      const td = document.createElement('td');

      if (dayNum > totalDays && cycle.endDate) {
        td.className = 'chart-empty';
      } else {
        const obs = obsByDay.get(dayNum);

        if (obs) {
          const stampEl = renderStamp(obs, {
            showDay: dayNum,
            showCode: true,
          });
          td.appendChild(stampEl);
        } else if (dayNum <= totalDays) {
          const emptyStamp = document.createElement('div');
          emptyStamp.className = 'stamp';
          const dayLabel = document.createElement('span');
          dayLabel.className = 'stamp-day';
          dayLabel.textContent = String(dayNum);
          emptyStamp.appendChild(dayLabel);
          const circle = document.createElement('div');
          circle.className = 'stamp-circle';
          circle.style.border = '2px dashed var(--border-color)';
          circle.style.background = 'transparent';
          emptyStamp.appendChild(circle);
          td.appendChild(emptyStamp);
        }

        if (cycle.peakDay) {
          const peakDayNum = daysBetween(cycle.startDate, cycle.peakDay) + 1;
          if (dayNum === peakDayNum) {
            td.classList.add('chart-peak-col');
          }
        }
      }

      row.appendChild(td);
    }

    tbody.appendChild(row);
  }

  table.appendChild(tbody);
  wrapper.appendChild(table);
  content.appendChild(wrapper);

  // Disclaimer
  const disclaimer = document.createElement('div');
  disclaimer.className = 'disclaimer';
  disclaimer.textContent =
    'This is a shared read-only view of a Creighton Model chart. ' +
    'This app is a personal charting tool and is not a substitute for instruction from a certified FertilityCare Practitioner.';
  content.appendChild(disclaimer);

  // Link to main site
  const link = document.createElement('p');
  link.style.cssText = 'text-align:center;margin-top:16px';
  link.innerHTML = '<a href="https://creighton.stephens.page/" style="color:var(--primary);font-size:0.875rem">Start tracking with Creighton Tracker</a>';
  content.appendChild(link);

  container.appendChild(content);
}
