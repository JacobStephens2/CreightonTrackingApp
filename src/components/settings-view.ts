import { db } from '../db/database';
import { exportService } from '../services/export-service';
import { authService } from '../services/auth-service';
import { syncService } from '../services/sync-service';

export async function renderSettingsView(container: HTMLElement): Promise<void> {
  container.innerHTML = '';

  const settings = (await db.settings.get(1)) ?? { id: 1, defaultView: 'chart' as const };
  await authService.checkAuth();

  const wrapper = document.createElement('div');

  // Account & Sync card
  const accountCard = document.createElement('div');
  accountCard.className = 'card';
  accountCard.innerHTML = '<div class="section-label" style="margin-top:0">Account & Sync</div>';

  if (authService.state.loggedIn) {
    const lastSync = syncService.getLastSyncTime();
    const lastSyncText = lastSync ? new Date(lastSync).toLocaleString() : 'Never';

    const info = document.createElement('div');
    info.innerHTML = `
      <p style="font-size:0.875rem;margin-bottom:4px">Signed in as <strong>${authService.state.email}</strong></p>
      <p style="font-size:0.8125rem;color:var(--text-secondary);margin-bottom:12px">Last synced: ${lastSyncText}</p>
    `;
    accountCard.appendChild(info);

    const syncBtns = document.createElement('div');
    syncBtns.style.cssText = 'display:flex;flex-direction:column;gap:8px';

    const uploadBtn = document.createElement('button');
    uploadBtn.className = 'btn btn-secondary btn-block';
    uploadBtn.textContent = 'Sync Now';
    uploadBtn.addEventListener('click', async () => {
      uploadBtn.disabled = true;
      uploadBtn.textContent = 'Syncing...';
      try {
        await syncService.upload();
        renderSettingsView(container);
      } catch (e) {
        alert((e as Error).message);
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Sync Now';
      }
    });
    syncBtns.appendChild(uploadBtn);

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'btn btn-secondary btn-block';
    downloadBtn.textContent = 'Download from Server';
    downloadBtn.addEventListener('click', async () => {
      if (!confirm('This will replace all local data with the server copy. Continue?')) return;
      downloadBtn.disabled = true;
      downloadBtn.textContent = 'Downloading...';
      try {
        const result = await syncService.download();
        alert(`Downloaded ${result.cycles} cycles and ${result.observations} observations.`);
        renderSettingsView(container);
      } catch (e) {
        alert((e as Error).message);
        downloadBtn.disabled = false;
        downloadBtn.textContent = 'Download from Server';
      }
    });
    syncBtns.appendChild(downloadBtn);

    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'btn btn-secondary btn-block';
    logoutBtn.textContent = 'Sign Out';
    logoutBtn.addEventListener('click', async () => {
      await authService.logout();
      renderSettingsView(container);
    });
    syncBtns.appendChild(logoutBtn);

    accountCard.appendChild(syncBtns);
  } else {
    const desc = document.createElement('p');
    desc.style.cssText = 'font-size:0.8125rem;color:var(--text-secondary);margin-bottom:12px';
    desc.textContent = 'Sign in to back up your data to the server and access it across devices. Your data always stays on your device too.';
    accountCard.appendChild(desc);

    const form = document.createElement('div');
    form.style.cssText = 'display:flex;flex-direction:column;gap:8px';

    const emailInput = document.createElement('input');
    emailInput.type = 'email';
    emailInput.placeholder = 'Email';
    emailInput.autocomplete = 'email';
    form.appendChild(emailInput);

    const passwordInput = document.createElement('input');
    passwordInput.type = 'password';
    passwordInput.placeholder = 'Password (min 8 characters)';
    passwordInput.autocomplete = 'current-password';
    form.appendChild(passwordInput);

    const errorMsg = document.createElement('p');
    errorMsg.style.cssText = 'font-size:0.8125rem;color:#d32f2f;margin:0;display:none';
    form.appendChild(errorMsg);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px';

    const loginBtn = document.createElement('button');
    loginBtn.className = 'btn btn-primary';
    loginBtn.style.flex = '1';
    loginBtn.textContent = 'Sign In';
    loginBtn.addEventListener('click', async () => {
      errorMsg.style.display = 'none';
      loginBtn.disabled = true;
      try {
        await authService.login(emailInput.value, passwordInput.value);
        renderSettingsView(container);
      } catch (e) {
        errorMsg.textContent = (e as Error).message;
        errorMsg.style.display = 'block';
        loginBtn.disabled = false;
      }
    });
    btnRow.appendChild(loginBtn);

    const registerBtn = document.createElement('button');
    registerBtn.className = 'btn btn-secondary';
    registerBtn.style.flex = '1';
    registerBtn.textContent = 'Create Account';
    registerBtn.addEventListener('click', async () => {
      errorMsg.style.display = 'none';
      registerBtn.disabled = true;
      try {
        await authService.register(emailInput.value, passwordInput.value);
        renderSettingsView(container);
      } catch (e) {
        errorMsg.textContent = (e as Error).message;
        errorMsg.style.display = 'block';
        registerBtn.disabled = false;
      }
    });
    btnRow.appendChild(registerBtn);

    form.appendChild(btnRow);
    accountCard.appendChild(form);
  }

  wrapper.appendChild(accountCard);

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
    'All data is stored locally on your device. If you sign in, your data can also be backed up to our server for cross-device access.';
  wrapper.appendChild(disclaimer);

  // Version
  const version = document.createElement('p');
  version.style.cssText = 'text-align:center;font-size:0.75rem;color:var(--text-secondary);margin-top:16px';
  version.textContent = 'Creighton Cycle Tracker v1.0.0';
  wrapper.appendChild(version);

  container.appendChild(wrapper);
}
