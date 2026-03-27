import { db } from '../db/database';
import { exportService } from '../services/export-service';
import { authService } from '../services/auth-service';
import { syncService } from '../services/sync-service';
import { shareService } from '../services/share-service';
import { showToast } from '../utils/toast';
import { applyTheme } from '../main';

let renderGeneration = 0;

export async function renderSettingsView(container: HTMLElement): Promise<void> {
  const thisRender = ++renderGeneration;
  container.innerHTML = '';

  const settings = (await db.settings.get(1)) ?? { id: 1, defaultView: 'chart' as const };
  if (thisRender !== renderGeneration) return;
  await authService.checkAuth();
  if (thisRender !== renderGeneration) return;

  const wrapper = document.createElement('div');

  // Account & Sync card
  const accountCard = document.createElement('div');
  accountCard.className = 'card';
  accountCard.innerHTML = '<div class="section-label" style="margin-top:0">Account & Sync</div>';

  if (authService.state.loggedIn) {
    const lastSync = syncService.getLastSyncTime();
    const lastSyncText = lastSync ? new Date(lastSync).toLocaleString() : 'Never';

    const info = document.createElement('div');
    info.style.cssText = 'margin-bottom:12px';

    const nameRow = document.createElement('div');
    nameRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:4px';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = authService.state.firstName || '';
    nameInput.placeholder = 'First name';
    nameInput.style.cssText = 'font-size:0.875rem;flex:1;padding:4px 8px';
    nameInput.setAttribute('aria-label', 'First name');
    let nameTimeout: ReturnType<typeof setTimeout>;
    nameInput.addEventListener('input', () => {
      clearTimeout(nameTimeout);
      nameTimeout = setTimeout(async () => {
        if (nameInput.value.trim()) {
          await authService.updateName(nameInput.value.trim()).catch(() => showToast('Could not save name', 'error'));
        }
      }, 500);
    });
    nameRow.appendChild(nameInput);
    info.appendChild(nameRow);

    const emailP = document.createElement('p');
    emailP.style.cssText = 'font-size:0.8125rem;color:var(--text-secondary);margin:0';
    emailP.textContent = authService.state.email || '';
    info.appendChild(emailP);

    const syncP = document.createElement('p');
    syncP.style.cssText = 'font-size:0.8125rem;color:var(--text-secondary);margin:4px 0 0';
    syncP.textContent = `Last synced: ${lastSyncText}`;
    info.appendChild(syncP);

    accountCard.appendChild(info);

    // Email verification banner
    if (!authService.state.emailVerified) {
      const banner = document.createElement('div');
      banner.style.cssText = 'background:#FFF3E0;border-radius:var(--radius-sm);padding:10px 12px;margin-bottom:12px;display:flex;align-items:center;gap:8px;flex-wrap:wrap';
      const bannerText = document.createElement('span');
      bannerText.style.cssText = 'font-size:0.8125rem;color:#E65100;flex:1';
      bannerText.textContent = 'Email not verified. Check your inbox for a verification link.';
      banner.appendChild(bannerText);
      const resendBtn = document.createElement('button');
      resendBtn.style.cssText = 'background:none;border:none;color:#E65100;font-size:0.8125rem;cursor:pointer;text-decoration:underline;font-family:inherit;padding:0;white-space:nowrap';
      resendBtn.textContent = 'Resend';
      resendBtn.addEventListener('click', async () => {
        resendBtn.textContent = 'Sending...';
        resendBtn.style.pointerEvents = 'none';
        try {
          await authService.resendVerification();
          resendBtn.textContent = 'Sent!';
        } catch {
          resendBtn.textContent = 'Failed. Try again.';
          resendBtn.style.pointerEvents = '';
        }
      });
      banner.appendChild(resendBtn);
      accountCard.appendChild(banner);
    }

    const syncBtns = document.createElement('div');
    syncBtns.style.cssText = 'display:flex;flex-direction:column;gap:8px';

    const uploadBtn = document.createElement('button');
    uploadBtn.className = 'btn btn-secondary btn-block';
    uploadBtn.textContent = 'Sync Now';
    uploadBtn.addEventListener('click', async () => {
      uploadBtn.disabled = true;
      uploadBtn.classList.add('btn-loading');
      try {
        await syncService.upload();
        showToast('Synced successfully', 'success');
        renderSettingsView(container);
      } catch (e) {
        showToast((e as Error).message, 'error');
        uploadBtn.disabled = false;
        uploadBtn.classList.remove('btn-loading');
      }
    });
    syncBtns.appendChild(uploadBtn);

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'btn btn-secondary btn-block';
    downloadBtn.textContent = 'Download from Server';
    downloadBtn.addEventListener('click', async () => {
      if (!confirm('This will replace all local data with the server copy. Continue?')) return;
      downloadBtn.disabled = true;
      downloadBtn.classList.add('btn-loading');
      try {
        const result = await syncService.download();
        showToast(`Downloaded ${result.cycles} cycles and ${result.observations} observations`, 'success');
        renderSettingsView(container);
      } catch (e) {
        showToast((e as Error).message, 'error');
        downloadBtn.disabled = false;
        downloadBtn.classList.remove('btn-loading');
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

    let createAccountMode = false;

    const nameField = document.createElement('div');
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = 'First name';
    nameInput.autocomplete = 'given-name';
    nameInput.setAttribute('aria-label', 'First name');
    nameField.appendChild(nameInput);

    const emailInput = document.createElement('input');
    emailInput.type = 'email';
    emailInput.placeholder = 'Email';
    emailInput.autocomplete = 'email';
    emailInput.setAttribute('aria-label', 'Email');
    form.appendChild(emailInput);

    const passwordInput = document.createElement('input');
    passwordInput.type = 'password';
    passwordInput.placeholder = 'Password (min 8 characters)';
    passwordInput.autocomplete = 'current-password';
    passwordInput.setAttribute('aria-label', 'Password');
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
      createAccountMode = false;
      nameField.remove();
      errorMsg.style.display = 'none';
      errorMsg.style.color = '#d32f2f';
      loginBtn.disabled = true;
      loginBtn.classList.add('btn-loading');
      const emailValue = emailInput.value.trim();
      const passwordValue = passwordInput.value;
      if (!emailValue || !passwordValue) {
        errorMsg.textContent = 'Email and password are required';
        errorMsg.style.display = 'block';
        loginBtn.disabled = false;
        loginBtn.classList.remove('btn-loading');
        return;
      }
      try {
        await authService.login(emailValue.toLowerCase(), passwordValue);
        renderSettingsView(container);
      } catch (e) {
        errorMsg.textContent = (e as Error).message;
        errorMsg.style.display = 'block';
        loginBtn.disabled = false;
        loginBtn.classList.remove('btn-loading');
      }
    });
    btnRow.appendChild(loginBtn);

    const registerBtn = document.createElement('button');
    registerBtn.className = 'btn btn-secondary';
    registerBtn.style.flex = '1';
    registerBtn.textContent = 'Create Account';
    registerBtn.addEventListener('click', async () => {
      if (!createAccountMode) {
        createAccountMode = true;
        form.insertBefore(nameField, emailInput);
        errorMsg.style.display = 'none';
        requestAnimationFrame(() => nameInput.focus());
        return;
      }

      errorMsg.style.display = 'none';
      errorMsg.style.color = '#d32f2f';
      if (!nameInput.value.trim()) {
        errorMsg.textContent = 'Enter your first name to create an account';
        errorMsg.style.display = 'block';
        return;
      }
      registerBtn.disabled = true;
      registerBtn.classList.add('btn-loading');
      try {
        await authService.register(nameInput.value.trim(), emailInput.value, passwordInput.value);
        renderSettingsView(container);
      } catch (e) {
        errorMsg.textContent = (e as Error).message;
        errorMsg.style.display = 'block';
        registerBtn.disabled = false;
        registerBtn.classList.remove('btn-loading');
      }
    });
    btnRow.appendChild(registerBtn);

    form.appendChild(btnRow);

    // Forgot password link
    const forgotRow = document.createElement('div');
    forgotRow.style.cssText = 'text-align:center;margin-top:4px';

    const forgotLink = document.createElement('button');
    forgotLink.style.cssText = 'background:none;border:none;color:var(--accent);font-size:0.8125rem;cursor:pointer;padding:4px;font-family:inherit;text-decoration:underline';
    forgotLink.textContent = 'Forgot password?';
    forgotLink.addEventListener('click', async () => {
      const email = emailInput.value;
      if (!email) {
        errorMsg.textContent = 'Enter your email address first';
        errorMsg.style.display = 'block';
        return;
      }
      errorMsg.style.display = 'none';
      forgotLink.textContent = 'Sending...';
      forgotLink.style.pointerEvents = 'none';
      try {
        await authService.forgotPassword(email);
        errorMsg.style.color = 'var(--accent)';
        errorMsg.textContent = 'If an account exists with that email, a reset link has been sent.';
        errorMsg.style.display = 'block';
      } catch {
        errorMsg.style.color = '#d32f2f';
        errorMsg.textContent = 'Could not send reset email. Try again later.';
        errorMsg.style.display = 'block';
      }
      forgotLink.textContent = 'Forgot password?';
      forgotLink.style.pointerEvents = '';
    });
    forgotRow.appendChild(forgotLink);
    form.appendChild(forgotRow);

    accountCard.appendChild(form);
  }

  wrapper.appendChild(accountCard);

  // Provider Sharing card (only when logged in)
  if (authService.state.loggedIn) {
    const shareCard = document.createElement('div');
    shareCard.className = 'card';
    shareCard.innerHTML = '<div class="section-label" style="margin-top:0">Provider Sharing</div>';

    const shareContent = document.createElement('div');
    shareContent.style.cssText = 'display:flex;flex-direction:column;gap:8px';

    try {
      const status = await shareService.getStatus();
      if (thisRender !== renderGeneration) return;

      if (status.active) {
        const info = document.createElement('p');
        info.style.cssText = 'font-size:0.8125rem;color:var(--text-secondary);margin:0';
        info.textContent = 'Your provider can view your charts at this link. They will see your last synced data.';
        shareContent.appendChild(info);

        if (status.expiresAt) {
          const expiryInfo = document.createElement('p');
          expiryInfo.style.cssText = 'font-size:0.75rem;color:var(--text-secondary);margin:4px 0 0';
          expiryInfo.textContent = `Link expires: ${new Date(status.expiresAt).toLocaleDateString()}`;
          shareContent.appendChild(expiryInfo);
        }

        const urlInput = document.createElement('input');
        urlInput.type = 'text';
        urlInput.readOnly = true;
        urlInput.value = status.url!;
        urlInput.style.cssText = 'font-size:0.8125rem';
        shareContent.appendChild(urlInput);

        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn btn-primary btn-block';
        copyBtn.textContent = 'Copy Link';
        copyBtn.addEventListener('click', async () => {
          await navigator.clipboard.writeText(status.url!);
          copyBtn.textContent = 'Copied!';
          setTimeout(() => { copyBtn.textContent = 'Copy Link'; }, 2000);
        });
        shareContent.appendChild(copyBtn);

        const revokeBtn = document.createElement('button');
        revokeBtn.className = 'btn btn-danger btn-block';
        revokeBtn.textContent = 'Revoke Link';
        revokeBtn.addEventListener('click', async () => {
          if (!confirm('Revoke this share link? Your provider will no longer be able to view your charts.')) return;
          await shareService.revoke();
          renderSettingsView(container);
        });
        shareContent.appendChild(revokeBtn);
      } else {
        const desc = document.createElement('p');
        desc.style.cssText = 'font-size:0.8125rem;color:var(--text-secondary);margin:0';
        desc.textContent = 'Generate a link to share your charts with your FertilityCare Practitioner. They will see a read-only view of your synced data.';
        shareContent.appendChild(desc);

        const generateBtn = document.createElement('button');
        generateBtn.className = 'btn btn-primary btn-block';
        generateBtn.textContent = 'Generate Share Link';
        generateBtn.addEventListener('click', async () => {
          generateBtn.disabled = true;
          generateBtn.classList.add('btn-loading');
          try {
            await shareService.generate();
            renderSettingsView(container);
          } catch (e) {
            showToast((e as Error).message, 'error');
            generateBtn.disabled = false;
            generateBtn.classList.remove('btn-loading');
          }
        });
        shareContent.appendChild(generateBtn);
      }
    } catch {
      const err = document.createElement('p');
      err.style.cssText = 'font-size:0.8125rem;color:#d32f2f;margin:0';
      err.textContent = 'Could not load sharing status.';
      shareContent.appendChild(err);
    }

    shareCard.appendChild(shareContent);
    wrapper.appendChild(shareCard);
  }

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

  // Theme
  const themeCard = document.createElement('div');
  themeCard.className = 'card';
  themeCard.innerHTML = '<div class="section-label" style="margin-top:0">Theme</div>';
  const themeGroup = document.createElement('div');
  themeGroup.className = 'toggle-group';

  const currentTheme = settings.theme ?? 'system';
  for (const theme of ['system', 'light', 'dark'] as const) {
    const btn = document.createElement('button');
    btn.className = `toggle-btn ${currentTheme === theme ? 'active' : ''}`;
    btn.textContent = theme.charAt(0).toUpperCase() + theme.slice(1);
    btn.addEventListener('click', async () => {
      await db.settings.put({ ...settings, theme });
      applyTheme(theme);
      renderSettingsView(container);
    });
    themeGroup.appendChild(btn);
  }
  themeCard.appendChild(themeGroup);
  wrapper.appendChild(themeCard);

  // Basic Infertile Pattern description
  const bipCard = document.createElement('div');
  bipCard.className = 'card';
  bipCard.innerHTML = `
    <div class="section-label" style="margin-top:0">Basic Infertile Pattern</div>
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

  // Learn More links
  const linksCard = document.createElement('div');
  linksCard.className = 'card';
  linksCard.innerHTML = `
    <div class="section-label" style="margin-top:0">Learn More</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      <a href="https://www.fertilitycare.org/" target="_blank" rel="noopener" class="btn btn-secondary btn-block" style="text-decoration:none;text-align:center">FertilityCare.org</a>
      <a href="https://saintpaulvi.com/" target="_blank" rel="noopener" class="btn btn-secondary btn-block" style="text-decoration:none;text-align:center">Saint Paul VI Institute</a>
      <a href="#/privacy" class="btn btn-secondary btn-block" style="text-decoration:none;text-align:center">Privacy Policy</a>
    </div>
  `;
  wrapper.appendChild(linksCard);

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
