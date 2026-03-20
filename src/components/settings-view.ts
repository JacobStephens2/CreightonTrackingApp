import { db } from '../db/database';
import { exportService } from '../services/export-service';

export async function renderSettingsView(container: HTMLElement): Promise<void> {
  container.innerHTML = '';

  const settings = (await db.settings.get(1)) ?? { id: 1, defaultView: 'chart' as const };

  const wrapper = document.createElement('div');

  // Default view
  const viewCard = document.createElement('div');
  viewCard.className = 'card';
  viewCard.innerHTML = '<div class="section-label" style="margin-top:0">Default View</div>';
  const viewGroup = document.createElement('div');
  viewGroup.className = 'toggle-group';

  for (const view of ['chart', 'calendar'] as const) {
    const btn = document.createElement('button');
    btn.className = `toggle-btn ${settings.defaultView === view ? 'active' : ''}`;
    btn.textContent = view === 'chart' ? 'Chart' : 'Calendar';
    btn.addEventListener('click', async () => {
      await db.settings.put({ ...settings, defaultView: view });
      renderSettingsView(container);
    });
    viewGroup.appendChild(btn);
  }
  viewCard.appendChild(viewGroup);
  wrapper.appendChild(viewCard);

  // BIP description
  const bipCard = document.createElement('div');
  bipCard.className = 'card';
  bipCard.innerHTML = `
    <div class="section-label" style="margin-top:0">Base Infertile Pattern (BIP)</div>
    <p style="font-size:0.8125rem;color:var(--text-secondary);margin-bottom:8px">
      Describe your basic infertile pattern as identified with your FertilityCare Practitioner.
    </p>
  `;
  const bipInput = document.createElement('textarea');
  bipInput.value = settings.bipDescription ?? '';
  bipInput.placeholder = 'e.g., Dry, nothing to see or touch';
  bipInput.addEventListener('change', async () => {
    await db.settings.put({ ...settings, bipDescription: bipInput.value || undefined });
  });
  bipCard.appendChild(bipInput);
  wrapper.appendChild(bipCard);

  // Export / Import
  const dataCard = document.createElement('div');
  dataCard.className = 'card';
  dataCard.innerHTML = '<div class="section-label" style="margin-top:0">Data Management</div>';

  const btnGroup = document.createElement('div');
  btnGroup.style.cssText = 'display:flex;flex-direction:column;gap:8px';

  // Export JSON
  const exportJsonBtn = document.createElement('button');
  exportJsonBtn.className = 'btn btn-secondary btn-block';
  exportJsonBtn.textContent = 'Export Data (JSON)';
  exportJsonBtn.addEventListener('click', async () => {
    const json = await exportService.exportJSON();
    exportService.downloadFile(json, `creighton-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
  });
  btnGroup.appendChild(exportJsonBtn);

  // Export CSV
  const exportCsvBtn = document.createElement('button');
  exportCsvBtn.className = 'btn btn-secondary btn-block';
  exportCsvBtn.textContent = 'Export Chart (CSV)';
  exportCsvBtn.addEventListener('click', async () => {
    const csv = await exportService.exportCSV();
    exportService.downloadFile(csv, `creighton-chart-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv');
  });
  btnGroup.appendChild(exportCsvBtn);

  // Import JSON
  const importBtn = document.createElement('button');
  importBtn.className = 'btn btn-secondary btn-block';
  importBtn.textContent = 'Import Data (JSON)';
  importBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const result = await exportService.importJSON(text);
        alert(`Imported ${result.cycles} cycles and ${result.observations} observations.`);
        renderSettingsView(container);
      } catch (e) {
        alert(`Import failed: ${(e as Error).message}`);
      }
    });
    input.click();
  });
  btnGroup.appendChild(importBtn);

  // Clear all data
  const clearBtn = document.createElement('button');
  clearBtn.className = 'btn btn-danger btn-block';
  clearBtn.textContent = 'Clear All Data';
  clearBtn.addEventListener('click', async () => {
    if (confirm('Are you sure? This will permanently delete all your observations and cycles.')) {
      await db.observations.clear();
      await db.cycles.clear();
      alert('All data cleared.');
      renderSettingsView(container);
    }
  });
  btnGroup.appendChild(clearBtn);

  dataCard.appendChild(btnGroup);
  wrapper.appendChild(dataCard);

  // Disclaimer
  const disclaimer = document.createElement('div');
  disclaimer.className = 'disclaimer';
  disclaimer.textContent =
    'This app is a personal charting tool and is not a substitute for instruction from a certified FertilityCare Practitioner. ' +
    'The Creighton Model FertilityCare System should be learned through proper instruction. ' +
    'All data is stored locally on your device and is never sent to any server.';
  wrapper.appendChild(disclaimer);

  // Version
  const version = document.createElement('p');
  version.style.cssText = 'text-align:center;font-size:0.75rem;color:var(--text-secondary);margin-top:16px';
  version.textContent = 'Creighton Cycle Tracker v1.0.0';
  wrapper.appendChild(version);

  container.appendChild(wrapper);
}
