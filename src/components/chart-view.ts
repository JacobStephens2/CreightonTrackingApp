import { toPng } from 'html-to-image';
import { cycleService } from '../services/cycle-service';
import { observationService } from '../services/observation-service';
import { renderStamp } from './stamp';
import { showObservationForm } from './observation-form';
import { displayDate, addDays, daysBetween, today } from '../utils/date-utils';
import { generateSampleData } from '../utils/sample-data';
import type { Observation } from '../db/models';

const CHART_COLUMNS = 35;

export async function renderChartView(container: HTMLElement): Promise<void> {
  container.innerHTML = '';

  const cycles = await cycleService.getAll();

  if (cycles.length === 0) {
    if (localStorage.getItem('sampleDismissed')) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = '<h2>No Observations Yet</h2><p>Tap the + button to record your first observation.</p>';
      container.appendChild(empty);
    } else {
      renderSampleChart(container);
    }
    return;
  }

  // Legend
  const legend = document.createElement('div');
  legend.className = 'chart-legend';
  const legendItems = [
    { color: 'green', label: 'Dry / Infertile' },
    { color: 'red', label: 'Bleeding' },
    { color: 'white', label: 'Fertile (Mucus)' },
    { color: 'yellow', label: 'Basic Infertile Pattern' },
  ];
  for (const item of legendItems) {
    const li = document.createElement('div');
    li.className = 'legend-item';
    li.innerHTML = `<span class="legend-dot legend-dot-${item.color}"></span>${item.label}`;
    if (item.color === 'yellow') {
      li.style.cursor = 'pointer';
      li.addEventListener('click', () => {
        const existing = legend.querySelector('.bip-popup');
        if (existing) {
          existing.remove();
          return;
        }
        const popup = document.createElement('div');
        popup.className = 'bip-popup card';
        popup.style.cssText = 'margin-top:8px;padding:12px;font-size:0.8125rem;line-height:1.5';
        popup.innerHTML = `
          <strong>Basic Infertile Pattern</strong><br>
          Your Basic Infertile Pattern is the pattern of discharge you consistently observe during
          infertile phases of your cycle, as identified with your FertilityCare Practitioner.
          Days matching your Basic Infertile Pattern are marked with a yellow stamp.
        `;
        popup.addEventListener('click', () => popup.remove());
        legend.appendChild(popup);
      });
    }
    legend.appendChild(li);
  }
  container.appendChild(legend);

  // Toolbar (print, export)
  const toolbar = document.createElement('div');
  toolbar.className = 'chart-toolbar';
  const printBtn = document.createElement('button');
  printBtn.type = 'button';
  printBtn.className = 'chart-toolbar-btn';
  printBtn.textContent = 'Print / Save PDF';
  printBtn.setAttribute('aria-label', 'Print chart or save as PDF');
  printBtn.addEventListener('click', () => window.print());
  toolbar.appendChild(printBtn);

  const imageBtn = document.createElement('button');
  imageBtn.type = 'button';
  imageBtn.className = 'chart-toolbar-btn';
  imageBtn.textContent = 'Save Image';
  imageBtn.setAttribute('aria-label', 'Save chart as PNG image');
  imageBtn.addEventListener('click', async () => {
    const wrapperEl = container.querySelector('.chart-container') as HTMLElement | null;
    if (!wrapperEl) return;
    const originalText = imageBtn.textContent;
    imageBtn.disabled = true;
    imageBtn.textContent = 'Saving…';
    try {
      // Render at 2x for crisper output and use a white background so
      // the image looks the same on light/dark themes.
      const dataUrl = await toPng(wrapperEl, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `creighton-chart-${today()}.png`;
      link.click();
    } catch (err) {
      console.error('Failed to export chart image', err);
      alert('Could not save image. Please try again.');
    } finally {
      imageBtn.disabled = false;
      imageBtn.textContent = originalText;
    }
  });
  toolbar.appendChild(imageBtn);
  container.appendChild(toolbar);

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
  const sortedCycles = [...cycles].reverse();

  for (let i = 0; i < sortedCycles.length; i++) {
    const cycle = sortedCycles[i];
    const cycleNumber = cycles.length - i;
    const row = document.createElement('tr');
    row.className = 'cycle-row';

    // Cycle label cell
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
    const observations = await observationService.getByCycle(cycle.id!);
    const obsByDay = new Map<number, Observation>();
    for (const obs of observations) {
      const dayNum = daysBetween(cycle.startDate, obs.date) + 1;
      obsByDay.set(dayNum, obs);
    }

    // Determine how many days to show
    const totalDays = cycle.endDate
      ? daysBetween(cycle.startDate, cycle.endDate)
      : observations.length > 0
        ? daysBetween(cycle.startDate, observations[observations.length - 1].date) + 1
        : 1;

    // For active cycles, extend clickable range up to today so users can
    // fill in missed days between their last observation and now.
    const lastClickableDay = cycle.endDate
      ? totalDays
      : Math.max(totalDays, daysBetween(cycle.startDate, today()) + 1);

    for (let dayNum = 1; dayNum <= CHART_COLUMNS; dayNum++) {
      const td = document.createElement('td');

      if (dayNum > totalDays && cycle.endDate) {
        td.className = 'chart-empty';
      } else {
        const obs = obsByDay.get(dayNum);
        const dateStr = addDays(cycle.startDate, dayNum - 1);

        if (obs) {
          const stampEl = renderStamp(obs, {
            showDate: dateStr,
            showCode: true,
            onClick: () => {
              showObservationForm(dateStr, obs, () => renderChartView(container));
            },
          });
          td.appendChild(stampEl);
        } else if (dayNum <= lastClickableDay) {
          // Empty day within cycle - clickable to add
          const emptyStamp = document.createElement('div');
          emptyStamp.className = 'stamp';
          const dayLabel = document.createElement('span');
          dayLabel.className = 'stamp-day';
          dayLabel.textContent = displayDate(dateStr);
          emptyStamp.appendChild(dayLabel);
          const circle = document.createElement('div');
          circle.className = 'stamp-circle';
          circle.style.border = '2px dashed var(--border-color)';
          circle.style.background = 'transparent';
          emptyStamp.appendChild(circle);
          emptyStamp.style.cursor = 'pointer';
          emptyStamp.addEventListener('click', () => {
            showObservationForm(dateStr, undefined, () => renderChartView(container));
          });
          td.appendChild(emptyStamp);
        }

        // Peak day column highlight
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
  container.appendChild(wrapper);
}

function renderSampleChart(container: HTMLElement): void {
  // Banner
  const banner = document.createElement('div');
  banner.className = 'sample-banner';
  banner.innerHTML = `
    <strong>Sample Chart</strong>
    <p>This is an example of what your chart will look like. Tap the + button to record your first observation and start tracking.</p>
  `;

  const dismissBtn = document.createElement('button');
  dismissBtn.className = 'btn btn-secondary';
  dismissBtn.style.cssText = 'margin-top:8px;font-size:0.8125rem;padding:8px 16px;min-height:36px';
  dismissBtn.textContent = 'Dismiss Sample';
  dismissBtn.addEventListener('click', () => {
    localStorage.setItem('sampleDismissed', 'true');
    container.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<h2>No Observations Yet</h2><p>Tap the + button to record your first observation.</p>';
    container.appendChild(empty);
  });
  banner.appendChild(dismissBtn);

  container.appendChild(banner);

  // Legend
  const legend = document.createElement('div');
  legend.className = 'chart-legend';
  const legendItems = [
    { color: 'green', label: 'Dry / Infertile' },
    { color: 'red', label: 'Bleeding' },
    { color: 'white', label: 'Fertile (Mucus)' },
    { color: 'yellow', label: 'Basic Infertile Pattern' },
  ];
  for (const item of legendItems) {
    const li = document.createElement('div');
    li.className = 'legend-item';
    li.innerHTML = `<span class="legend-dot legend-dot-${item.color}"></span>${item.label}`;
    legend.appendChild(li);
  }
  container.appendChild(legend);

  const { cycles, observationsByCycle } = generateSampleData();

  // Chart table
  const wrapper = document.createElement('div');
  wrapper.className = 'chart-container';

  const table = document.createElement('table');
  table.className = 'chart-table';
  table.style.opacity = '0.7';

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
  const sortedCycles = [...cycles].reverse();

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
    const observations = observationsByCycle.get(cycle.id!) ?? [];
    const obsByDay = new Map<number, Observation>();
    for (const obs of observations) {
      const dayNum = daysBetween(cycle.startDate, obs.date) + 1;
      obsByDay.set(dayNum, obs);
    }

    const totalDays = cycle.length ?? observations.length;

    for (let dayNum = 1; dayNum <= CHART_COLUMNS; dayNum++) {
      const td = document.createElement('td');

      if (dayNum > totalDays && cycle.endDate) {
        td.className = 'chart-empty';
      } else {
        const obs = obsByDay.get(dayNum);

        if (obs) {
          const stampEl = renderStamp(obs, {
            showDate: addDays(cycle.startDate, dayNum - 1),
            showCode: true,
          });
          td.appendChild(stampEl);
        }

        // Peak day column highlight
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
  container.appendChild(wrapper);
}
