// superadmin/settings.js

import { db } from '../firebase.js';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { showToast, setupNavigation } from '../ui-helpers.js';
import { renderSuperadminDashboard } from './superadmin-dashboard.js';

// Utility: Get all schools for dropdown
async function getAllSchools() {
  const snap = await getDocs(collection(db, 'schools'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Utility: Fetch global settings
async function getGlobalSettings() {
  const snap = await getDoc(doc(db, 'settings', 'global'));
  return snap.exists() ? snap.data() : {};
}

// Utility: Fetch settings for a school (overrides)
async function getSchoolSettings(schoolId) {
  const snap = await getDoc(doc(db, 'schools', schoolId));
  return snap.exists() && snap.data().settings ? snap.data().settings : {};
}

// Utility: Save settings (global or per-school)
async function saveSettings(type, settings, schoolId = null) {
  if (type === 'global') {
    await setDoc(doc(db, 'settings', 'global'), settings, { merge: true });
    logSettingsChange('global', settings);
  } else if (type === 'school' && schoolId) {
    await updateDoc(
      doc(db, 'schools', schoolId),
      { settings },
      { merge: true }
    );
    logSettingsChange(schoolId, settings);
  }
}

// Utility: Log all settings changes for audit trail
async function logSettingsChange(target, newSettings) {
  await setDoc(doc(collection(db, 'settingsLogs')), {
    target, // "global" or schoolId
    newSettings,
    changedBy: localStorage.getItem('currentUserEmail'),
    changedAt: serverTimestamp(),
  });
}

// Utility: Fetch API Keys
async function getApiKeys() {
  const snap = await getDocs(collection(db, 'apiKeys'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Utility: Create/rotate/revoke API Key
async function createApiKey(label, schoolId = null) {
  const key = crypto.randomUUID();
  await setDoc(doc(collection(db, 'apiKeys')), {
    key,
    label,
    schoolId,
    createdAt: serverTimestamp(),
    active: true,
    createdBy: localStorage.getItem('currentUserEmail'),
  });
  logSettingsChange('apiKey', { key, label, schoolId });
  return key;
}
async function revokeApiKey(keyId) {
  await updateDoc(doc(db, 'apiKeys', keyId), {
    active: false,
    revokedAt: serverTimestamp(),
  });
  logSettingsChange('apiKey', { keyId, action: 'revoked' });
}

// ======== SUPER ADMIN SETTINGS UI RENDERER ========
export async function renderSettings(
  container = document.getElementById('app')
) {
  if (!container) return;
  setupNavigation();

  // Get all settings
  const [globalSettings, schools, apiKeys] = await Promise.all([
    getGlobalSettings(),
    getAllSchools(),
    getApiKeys(),
  ]);
  let selectedSchoolId = null;
  let schoolSettings = {};

  // HTML render helpers
  const renderSettingsForm = (settings, type = 'global') => `
    <form id="${type}-settings-form" class="settings-form" style="margin-bottom:2rem;">
      <label>Platform Logo URL:
        <input name="logoUrl" type="text" value="${settings.logoUrl || ''}" />
      </label>
      <label>Primary Brand Color:
        <input name="brandColor" type="color" value="${settings.brandColor || '#b48aff'}" />
      </label>
      <label>Minimum Passing Score (%):
        <input name="minPassingScore" type="number" value="${settings.minPassingScore || 80}" min="0" max="100" />
      </label>
      <label>Require Human Trafficking Video (Indiana):
        <input name="requireTraffickingVideo" type="checkbox" ${settings.requireTraffickingVideo ? 'checked' : ''} />
      </label>
      <label>Custom Certificate Footer:
        <input name="certificateFooter" type="text" value="${settings.certificateFooter || ''}" />
      </label>
      <button class="btn primary" type="submit">Save ${type === 'global' ? 'Global' : 'School'} Settings</button>
      ${type === 'school' ? '<button class="btn outline" type="button" id="reset-school-settings">Reset to Default</button>' : ''}
    </form>
  `;

  // School selector & settings
  container.innerHTML = `
    <div class="screen-wrapper fade-in" style="max-width:700px;margin:0 auto;padding:20px;">
      <h2 class="dash-head">⚙️ Super Admin: Settings & Overrides</h2>
      <details open>
        <summary><strong>Global Platform Settings</strong></summary>
        ${renderSettingsForm(globalSettings, 'global')}
      </details>
      <details>
        <summary><strong>School-Specific Overrides</strong></summary>
        <label>Choose School:
          <select id="school-select">
            <option value="">-- Select a school --</option>
            ${schools.map((s) => `<option value="${s.id}">${s.name || s.id}</option>`).join('')}
          </select>
        </label>
        <div id="school-settings-form-container" style="margin-top: 1.2em;"></div>
      </details>
      <details>
        <summary><strong>API Key Management</strong></summary>
        <form id="api-key-form" style="margin-bottom:1em;">
          <input name="label" type="text" placeholder="Label (e.g. 'TPR Integration')" required />
          <select name="schoolId">
            <option value="">Platform-wide Key</option>
            ${schools.map((s) => `<option value="${s.id}">${s.name || s.id}</option>`).join('')}
          </select>
          <button class="btn" type="submit">Generate API Key</button>
        </form>
        <div>
          <strong>Active API Keys:</strong>
          <ul class="api-key-list">
            ${
              apiKeys.length === 0
                ? '<li>No API keys issued yet.</li>'
                : apiKeys
                    .map(
                      (k) => `
                <li>
                  <span style="font-family:monospace;">${k.key}</span>
                  ${k.label ? `-- ${k.label}` : ''}
                  ${k.schoolId ? `-- for ${schools.find((s) => s.id === k.schoolId)?.name || k.schoolId}` : ''}
                  ${!k.active ? "<span style='color:#c22'>(Revoked)</span>" : ''}
                  <button class="btn outline btn-revoke-api" data-id="${k.id}" ${!k.active ? 'disabled' : ''}>Revoke</button>
                </li>
              `
                    )
                    .join('')
            }
          </ul>
        </div>
      </details>
      <details>
        <summary><strong>Settings Change Log</strong></summary>
        <div id="settings-log-list" style="max-height:120px;overflow:auto;font-size:0.97em;background:rgba(240,240,255,0.11);padding:8px 14px;border-radius:7px;">
          (Loading logs...)
        </div>
      </details>
      <button class="btn outline" id="back-to-superadmin-dashboard-btn" style="margin-top:2.2rem;">⬅ Dashboard</button>
    </div>
  `;

  // ========== EVENT HANDLERS ==========

  // Save global settings
  container
    .querySelector('#global-settings-form')
    ?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const newSettings = {
        logoUrl: fd.get('logoUrl'),
        brandColor: fd.get('brandColor'),
        minPassingScore: Number(fd.get('minPassingScore')),
        requireTraffickingVideo: !!fd.get('requireTraffickingVideo'),
        certificateFooter: fd.get('certificateFooter'),
      };
      await saveSettings('global', newSettings);
      showToast('Global settings updated!');
      renderSettings(container);
    });

  // School select/change
  container
    .querySelector('#school-select')
    ?.addEventListener('change', async (e) => {
      selectedSchoolId = e.target.value;
      if (selectedSchoolId) {
        schoolSettings = await getSchoolSettings(selectedSchoolId);
        container.querySelector('#school-settings-form-container').innerHTML =
          renderSettingsForm(schoolSettings, 'school');
        // Attach school save/reset handlers
        container
          .querySelector('#school-settings-form')
          ?.addEventListener('submit', async (evt) => {
            evt.preventDefault();
            const fd = new FormData(evt.target);
            const newSettings = {
              logoUrl: fd.get('logoUrl'),
              brandColor: fd.get('brandColor'),
              minPassingScore: Number(fd.get('minPassingScore')),
              requireTraffickingVideo: !!fd.get('requireTraffickingVideo'),
              certificateFooter: fd.get('certificateFooter'),
            };
            await saveSettings('school', newSettings, selectedSchoolId);
            showToast('School override saved!');
            renderSettings(container);
          });
        // Reset school settings to default
        container
          .querySelector('#reset-school-settings')
          ?.addEventListener('click', async () => {
            await saveSettings('school', {}, selectedSchoolId); // clear overrides
            showToast('School settings reset to default.');
            renderSettings(container);
          });
      } else {
        container.querySelector('#school-settings-form-container').innerHTML =
          '';
      }
    });

  // Generate API Key
  container
    .querySelector('#api-key-form')
    ?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const key = await createApiKey(
        fd.get('label'),
        fd.get('schoolId') || null
      );
      showToast('API Key generated! ' + key);
      renderSettings(container);
    });

  // Revoke API Key
  container.querySelectorAll('.btn-revoke-api').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await revokeApiKey(btn.dataset.id);
      showToast('API Key revoked.');
      renderSettings(container);
    });
  });

  // Load settings logs
  const logSnap = await getDocs(collection(db, 'settingsLogs'));
  container.querySelector('#settings-log-list').innerHTML = logSnap.empty
    ? '(No changes yet.)'
    : logSnap.docs
        .map(
          (l) =>
            `<div>[${l.data().changedAt?.toDate?.().toLocaleString?.() || '-'}] <strong>${l.data().changedBy || ''}</strong>: ${JSON.stringify(l.data().newSettings)}</div>`
        )
        .join('');

  // --- Routing: Back to dashboard with hash ---
  container
    .querySelector('#back-to-superadmin-dashboard-btn')
    ?.addEventListener('click', () => {
      window.location.hash = '#superadmin-dashboard';
    });
}
