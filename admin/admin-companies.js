// admin/admin-companies.js

import { db, auth } from '../firebase.js';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import {
  getCurrentUserRole,
  getCurrentSchoolId,
  showToast,
  setupNavigation,
} from '../ui-helpers.js';
import { getCurrentSchoolBranding } from '../school-branding.js';

// === Lazy Load jsPDF for PDF export (only on demand) ===
let jsPDF = null;
async function ensureJsPDF() {
  if (!jsPDF) {
    const mod = await import(
      'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'
    );
    jsPDF = mod.jspdf.jsPDF;
  }
}

// === Utility: Format Date ===
function fmtDate(val) {
  if (!val) return '';
  try {
    const d = typeof val === 'string' ? new Date(val) : val.toDate();
    return d.toLocaleDateString();
  } catch {
    return '';
  }
}

// === Fetch all companies for a given schoolId ===
async function fetchCompanyListForSchool(schoolId) {
  if (!schoolId) return [];
  const companiesSnap = await getDocs(
    query(collection(db, 'companies'), where('schoolId', '==', schoolId))
  );
  const companies = [];
  companiesSnap.forEach((docSnap) => {
    const c = docSnap.data();
    companies.push({
      id: docSnap.id,
      name: c.name,
      contact: c.contact || '',
      address: c.address || '',
      createdAt: c.createdAt || '',
      createdBy: c.createdBy || '',
      updatedAt: c.updatedAt || c.createdAt || '',
      updatedBy: c.updatedBy || c.createdBy || '',
      status: c.status === false ? false : true, // default to active
    });
  });
  companies.sort((a, b) => a.name.localeCompare(b.name));
  return companies;
}

// === CSV Export Utility ===
function exportCompaniesToCSV(companies) {
  if (!companies.length) return showToast('No companies to export.');
  const headers = [
    'name',
    'contact',
    'address',
    'status',
    'createdAt',
    'createdBy',
    'updatedAt',
    'updatedBy',
  ];
  const csv = [
    headers.join(','),
    ...companies.map((c) =>
      headers
        .map((h) => `"${(c[h] ?? '').toString().replace(/"/g, '""')}"`)
        .join(',')
    ),
  ].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `companies-export-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// === CSV Template Download ===
function downloadCompanyTemplateCSV() {
  const headers = ['name', 'contact', 'address', 'status'];
  const csv = headers.join(',') + '\r\n';
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'company-import-template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// === PDF Export Utility ===
async function exportCompaniesToPDF(companies) {
  if (!companies.length) return showToast('No companies to export.');
  await ensureJsPDF();
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text('Companies List', 10, 16);
  const headers = [
    'Name',
    'Contact',
    'Address',
    'Status',
    'Created',
    'Created By',
    'Updated',
    'Updated By',
  ];
  let y = 25;
  doc.setFontSize(10);
  doc.text(headers.join(' | '), 10, y);
  y += 7;
  companies.forEach((c) => {
    doc.text(
      [
        c.name,
        c.contact,
        c.address,
        c.status ? 'Active' : 'Inactive',
        fmtDate(c.createdAt),
        c.createdBy || '',
        fmtDate(c.updatedAt),
        c.updatedBy || '',
      ].join(' | '),
      10,
      y
    );
    y += 6;
    if (y > 280) {
      doc.addPage();
      y = 15;
    }
  });
  doc.save(`companies-export-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// === Bulk Import Preview Modal ===
function showCSVImportPreview(headers, rows, onConfirm) {
  // Remove any existing modal
  document.querySelectorAll('.modal-overlay').forEach((el) => el.remove());

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style =
    'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(10,18,30,0.64);z-index:9999;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = `
    <div class="modal-card" style="background:#fff;border-radius:13px;box-shadow:0 4px 44px #023  ;max-width:97vw;min-width:270px;width:380px;padding:2em;">
      <h3 style="margin-top:0;">Preview Import</h3>
      <table style="font-size:.98em;width:100%;border-collapse:collapse;margin-bottom:1.2em;">
        <thead>
          <tr>${headers.map((h) => `<th style="font-weight:600;text-align:left;border-bottom:1.3px solid #b8e2ff;padding:5px 7px;">${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows
            .slice(0, 7)
            .map(
              (row) =>
                `<tr>${row.map((cell, i) => `<td style="padding:5px 7px;border-bottom:1px solid #e0f6ff;">${cell || ''}</td>`).join('')}</tr>`
            )
            .join('')}
        </tbody>
      </table>
      <div style="font-size:.95em;color:#6a7e99;margin-bottom:.6em;">
        ${rows.length > 7 ? `Previewing first 7 of ${rows.length} rows.` : ''}
      </div>
      <button class="btn outline" id="confirm-import-btn" style="margin-right:7px;">Import</button>
      <button class="btn outline" id="cancel-import-btn">Cancel</button>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#confirm-import-btn').onclick = () => {
    overlay.remove();
    onConfirm();
  };
  overlay.querySelector('#cancel-import-btn').onclick = () => overlay.remove();
}

// === Bulk Import from CSV ===
async function bulkImportCompaniesFromCSV(
  csvText,
  schoolId,
  userEmail,
  onComplete
) {
  try {
    const lines = csvText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) throw new Error('No data found.');
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const nameIdx = headers.indexOf('name');
    const contactIdx = headers.indexOf('contact');
    const addressIdx = headers.indexOf('address');
    const statusIdx = headers.indexOf('status');
    if (nameIdx === -1) throw new Error('CSV must have a "name" column.');

    // Preview: let user review parsed data before importing
    const rows = lines.slice(1).map((line) => line.split(','));
    showCSVImportPreview(headers, rows, async () => {
      let added = 0,
        skipped = 0;
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map((v) => v.trim());
        const name = vals[nameIdx];
        if (!name) continue;
        const contact = contactIdx !== -1 ? vals[contactIdx] : '';
        const address = addressIdx !== -1 ? vals[addressIdx] : '';
        let status = statusIdx !== -1 ? vals[statusIdx] : 'Active';
        status = /^inactive$/i.test(status) ? false : true;
        // Check for duplicate by name+school
        const q = query(
          collection(db, 'companies'),
          where('name', '==', name),
          where('schoolId', '==', schoolId)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          skipped++;
          continue;
        }
        await addDoc(collection(db, 'companies'), {
          name,
          contact,
          address,
          schoolId,
          status,
          createdAt: new Date().toISOString(),
          createdBy: userEmail,
          updatedAt: new Date().toISOString(),
          updatedBy: userEmail,
        });
        added++;
      }
      if (onComplete) onComplete({ added, skipped });
    });
  } catch (err) {
    showToast('Import error: ' + err.message, 4000, 'error');
  }
}

// === Search/Filter Companies Utility ===
function filterCompanies(companies, searchTerm) {
  if (!searchTerm) return companies;
  const term = searchTerm.toLowerCase();
  return companies.filter(
    (c) =>
      c.name.toLowerCase().includes(term) ||
      c.contact.toLowerCase().includes(term) ||
      c.address.toLowerCase().includes(term)
  );
}

// === Main Page Renderer ===
export async function renderAdminCompanies(
  container = document.getElementById('app')
) {
  container = container || document.getElementById('app');
  const schoolId = getCurrentSchoolId();
  const userRole = getCurrentUserRole();
  const userEmail =
    auth?.currentUser?.email ||
    window.currentUserEmail ||
    localStorage.getItem('currentUserEmail') ||
    '';

  // --- Permissions: only admins/instructors/superadmins can access ---
  if (!['admin', 'instructor', 'superadmin'].includes(userRole)) {
    container.innerHTML = `<div class="dashboard-card" style="margin:2em auto;max-width:440px;">
      <h3>Access Denied</h3>
      <p>This page is for admins, instructors, or superadmins only.</p>
    </div>`;
    return;
  }

  if (!schoolId) {
    showToast('No school assigned. Please log in again.');
    return;
  }

  // --- School Branding (header, color, logo) ---
  const brand = getCurrentSchoolBranding?.() || {};
  const headerLogo = brand.logoUrl
    ? `<img src="${brand.logoUrl}" alt="School Logo" class="dashboard-logo" style="max-width:90px;vertical-align:middle;margin-bottom:3px;">`
    : '';
  const schoolName = brand.schoolName || 'CDL Trainer';
  const accent = brand.primaryColor || '#b48aff';

  // --- Loading state ---
  container.innerHTML = `
    <div class="screen-wrapper fade-in admin-companies-page" style="padding: 24px; max-width: 860px; margin: 0 auto;">
      <div class="dashboard-card" style="text-align:center;">
        <span class="loading-spinner" style="margin-right:7px;"></span> Loading companies...
      </div>
    </div>
  `;

  // --- Fetch Companies for this School ---
  let companies = [];
  try {
    companies = await fetchCompanyListForSchool(schoolId);
  } catch (e) {
    companies = [];
    showToast('Failed to load companies.', 4200, 'error');
    console.error('Admin companies fetch error', e);
  }

  // --- Bulk Actions State ---
  let selectedIds = new Set();

  // --- Main page HTML with search/filter, export, bulk import, bulk actions ---
  container.innerHTML = `
    <div class="screen-wrapper fade-in admin-companies-page" style="padding: 24px; max-width: 860px; margin: 0 auto;">
      <header style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.1em;">
        <span style="font-size:1.25em;font-weight:500;color:${accent};">${schoolName}</span>
        ${headerLogo}
      </header>
      <h2 style="margin-top:0;">🏢 Manage Companies</h2>
      <div class="dashboard-card" style="margin-bottom:1.3rem;">
        <form id="add-company-form" style="display:flex;gap:0.7em;margin-bottom:1.1em;">
          <input type="text" name="companyName" maxlength="60" placeholder="New Company Name" required style="flex:1;min-width:140px;">
          <input type="text" name="companyContact" maxlength="60" placeholder="Contact (optional)" style="min-width:120px;">
          <input type="text" name="companyAddress" maxlength="100" placeholder="Address (optional)" style="min-width:120px;">
          <button class="btn" type="submit" style="background:${accent};border:none;">+ Add Company</button>
        </form>
        <div style="display: flex; gap: 12px; margin-bottom: 1em;flex-wrap:wrap;">
          <input type="text" id="company-search" placeholder="Search companies..." style="flex:1;min-width:170px;max-width:260px;padding:6px 11px;border-radius:7px;border:1px solid #ddd;margin-bottom:0;">
          <button class="btn outline" id="export-csv-btn" type="button">Export to CSV</button>
          <button class="btn outline" id="export-pdf-btn" type="button">Export to PDF</button>
          <button class="btn outline" id="download-template-btn" type="button" title="Download CSV template">CSV Template</button>
          <label class="btn outline" style="margin-bottom:0;cursor:pointer;">
            <input type="file" id="import-csv-input" accept=".csv" style="display:none;">
            Bulk Import CSV
          </label>
        </div>
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:7px;">
          <button class="btn outline" id="bulk-delete-btn" type="button" disabled style="display:none;">Delete Selected</button>
          <button class="btn outline" id="bulk-export-btn" type="button" disabled style="display:none;">Export Selected</button>
          <span id="selected-count" style="font-size:.95em;color:#386;">0 selected</span>
        </div>
        <div style="overflow-x:auto;">
        <table class="company-table" style="width:100%;border-collapse:collapse;min-width:700px;">
          <thead style="position:sticky;top:0;background:rgba(30,90,140,.09);z-index:4;">
            <tr>
              <th style="width:22px;"><input type="checkbox" id="select-all-companies" title="Select all"></th>
              <th>Company Name</th>
              <th>Contact</th>
              <th>Address</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="companies-tbody">
            ${
              companies.length === 0
                ? `<tr><td colspan="7" style="text-align:center;color:#799;">No companies found for this school.</td></tr>`
                : companies
                    .map(
                      (c) => `
                <tr data-company-id="${c.id}">
                  <td><input type="checkbox" class="select-company" data-id="${c.id}"></td>
                  <td><input class="company-name-input" value="${c.name}" maxlength="60" style="width:97%;padding:2px 7px;" /></td>
                  <td><input class="company-contact-input" value="${c.contact}" maxlength="60" style="width:97%;padding:2px 7px;" /></td>
                  <td><input class="company-address-input" value="${c.address}" maxlength="100" style="width:97%;padding:2px 7px;" /></td>
                  <td>
                    <select class="company-status-input" style="border-radius:7px;">
                      <option value="active"${c.status ? ' selected' : ''}>Active</option>
                      <option value="inactive"${!c.status ? ' selected' : ''}>Inactive</option>
                    </select>
                  </td>
                  <td>
                    <span style="font-size:.93em;">${fmtDate(c.createdAt)}</span>
                    <br>
                    <span style="font-size:.87em;color:#999;">${c.createdBy || ''}</span>
                  </td>
                  <td>
                    <button class="btn outline btn-save-company" data-company-id="${c.id}">Save</button>
                    <button class="btn outline btn-remove-company" data-company-id="${c.id}" style="margin-left:6px;">Remove</button>
                    <button class="btn outline btn-view-users" data-company-name="${c.name}" data-company-id="${c.id}" style="margin-left:6px;">View Users</button>
                  </td>
                </tr>
              `
                    )
                    .join('')
            }
          </tbody>
        </table>
        </div>
        <div style="font-size:0.98em;color:#888;margin-top:7px;">
          Bulk import supports columns: <b>name</b>, <b>contact</b>, <b>address</b>, <b>status</b> (first row: header).
          Activity logs and user assignments coming soon.
        </div>
      </div>
      <button class="btn outline wide" id="back-to-admin-dashboard-btn" style="margin-top:1.3rem;">⬅ Back to Dashboard</button>
    </div>
  `;

  setupNavigation();

  // --- Dynamic filter/search ---
  let filteredCompanies = [...companies];
  const tbody = container.querySelector('#companies-tbody');
  const searchInput = container.querySelector('#company-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const val = e.target.value;
      filteredCompanies = filterCompanies(companies, val);
      tbody.innerHTML = filteredCompanies.length
        ? filteredCompanies
            .map(
              (c) => `
                <tr data-company-id="${c.id}">
                  <td><input type="checkbox" class="select-company" data-id="${c.id}"></td>
                  <td><input class="company-name-input" value="${c.name}" maxlength="60" style="width:97%;padding:2px 7px;" /></td>
                  <td><input class="company-contact-input" value="${c.contact}" maxlength="60" style="width:97%;padding:2px 7px;" /></td>
                  <td><input class="company-address-input" value="${c.address}" maxlength="100" style="width:97%;padding:2px 7px;" /></td>
                  <td>
                    <select class="company-status-input" style="border-radius:7px;">
                      <option value="active"${c.status ? ' selected' : ''}>Active</option>
                      <option value="inactive"${!c.status ? ' selected' : ''}>Inactive</option>
                    </select>
                  </td>
                  <td>
                    <span style="font-size:.93em;">${fmtDate(c.createdAt)}</span>
                    <br>
                    <span style="font-size:.87em;color:#999;">${c.createdBy || ''}</span>
                  </td>
                  <td>
                    <button class="btn outline btn-save-company" data-company-id="${c.id}">Save</button>
                    <button class="btn outline btn-remove-company" data-company-id="${c.id}" style="margin-left:6px;">Remove</button>
                    <button class="btn outline btn-view-users" data-company-name="${c.name}" data-company-id="${c.id}" style="margin-left:6px;">View Users</button>
                  </td>
                </tr>
              `
            )
            .join('')
        : `<tr><td colspan="7" style="text-align:center;color:#799;">No companies found.</td></tr>`;
    });
  }

  // --- Select All / Bulk select logic ---
  const selectAll = container.querySelector('#select-all-companies');
  const selectedCountEl = container.querySelector('#selected-count');
  const bulkDeleteBtn = container.querySelector('#bulk-delete-btn');
  const bulkExportBtn = container.querySelector('#bulk-export-btn');
  function updateBulkButtons() {
    const allBoxes = container.querySelectorAll('.select-company');
    const checkedBoxes = [...allBoxes].filter((b) => b.checked);
    selectedIds = new Set(checkedBoxes.map((b) => b.dataset.id));
    selectedCountEl.textContent = `${selectedIds.size} selected`;
    bulkDeleteBtn.style.display = selectedIds.size ? '' : 'none';
    bulkExportBtn.style.display = selectedIds.size ? '' : 'none';
    bulkDeleteBtn.disabled = bulkExportBtn.disabled = selectedIds.size === 0;
  }
  if (selectAll) {
    selectAll.addEventListener('change', (e) => {
      container
        .querySelectorAll('.select-company')
        .forEach((b) => (b.checked = e.target.checked));
      updateBulkButtons();
    });
  }
  container.addEventListener('change', (e) => {
    if (e.target.classList.contains('select-company')) updateBulkButtons();
  });

  bulkDeleteBtn.addEventListener('click', async () => {
    if (!selectedIds.size) return;
    if (
      !confirm(`Delete ${selectedIds.size} companies? This cannot be undone!`)
    )
      return;
    for (const id of selectedIds) {
      await deleteDoc(doc(db, 'companies', id));
    }
    showToast('Deleted selected companies.', 2600, 'success');
    renderAdminCompanies(container);
  });

  bulkExportBtn.addEventListener('click', () => {
    const selectedCompanies = companies.filter((c) => selectedIds.has(c.id));
    exportCompaniesToCSV(selectedCompanies);
  });

  // --- Export Handlers ---
  container.querySelector('#export-csv-btn')?.addEventListener('click', () => {
    exportCompaniesToCSV(filteredCompanies);
  });
  container.querySelector('#export-pdf-btn')?.addEventListener('click', () => {
    exportCompaniesToPDF(filteredCompanies);
  });
  container
    .querySelector('#download-template-btn')
    ?.addEventListener('click', () => {
      downloadCompanyTemplateCSV();
    });

  // --- Bulk Import Handler ---
  const importInput = container.querySelector('#import-csv-input');
  importInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    bulkImportCompaniesFromCSV(
      text,
      schoolId,
      userEmail,
      ({ added, skipped }) => {
        showToast(
          `Imported: ${added}, Skipped duplicates: ${skipped}`,
          4300,
          'success'
        );
        renderAdminCompanies(container);
      }
    );
  });

  // --- Add company handler (scoped to this school only) ---
  container
    .querySelector('#add-company-form')
    ?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const companyName = form.companyName.value.trim();
      const companyContact = form.companyContact.value.trim();
      const companyAddress = form.companyAddress.value.trim();
      if (!companyName) return showToast('Enter a company name.');
      if (!/^[\w\s\-'.&]+$/.test(companyName))
        return showToast('Invalid company name.');
      try {
        // Check for duplicates in THIS school
        const q = query(
          collection(db, 'companies'),
          where('name', '==', companyName),
          where('schoolId', '==', schoolId)
        );
        const snap = await getDocs(q);
        if (!snap.empty)
          return showToast('Company already exists.', 3000, 'error');
        await addDoc(collection(db, 'companies'), {
          name: companyName,
          contact: companyContact,
          address: companyAddress,
          status: true,
          schoolId,
          createdAt: new Date().toISOString(),
          createdBy: userEmail,
          updatedAt: new Date().toISOString(),
          updatedBy: userEmail,
        });
        showToast('Company added!', 2200, 'success');
        renderAdminCompanies(container); // Refresh
      } catch (err) {
        showToast('Failed to add company.', 3200, 'error');
      }
    });

  // --- Save company (edit name/contact/address/status) ---
  container.querySelectorAll('.btn-save-company').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const companyId = btn.dataset.companyId;
      const row = btn.closest('tr');
      const name = row.querySelector('.company-name-input').value.trim();
      const contact = row.querySelector('.company-contact-input').value.trim();
      const address = row.querySelector('.company-address-input').value.trim();
      const status =
        row.querySelector('.company-status-input').value === 'active';
      if (!name) return showToast('Company name cannot be empty.');
      if (!/^[\w\s\-'.&]+$/.test(name))
        return showToast('Invalid company name.');
      try {
        await updateDoc(doc(db, 'companies', companyId), {
          name,
          contact,
          address,
          status,
          updatedAt: new Date().toISOString(),
          updatedBy: userEmail,
        });
        showToast('Company updated.', 2200, 'success');
        renderAdminCompanies(container);
      } catch (err) {
        showToast('Failed to update company.', 3000, 'error');
      }
    });
  });

  // --- Remove company (deletes from companies collection, scoped) ---
  container.querySelectorAll('.btn-remove-company').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const companyId = btn.dataset.companyId;
      if (!confirm(`Remove company? This cannot be undone.`)) return;
      try {
        await deleteDoc(doc(db, 'companies', companyId));
        showToast(`Company removed.`, 2400, 'success');
        renderAdminCompanies(container);
      } catch (err) {
        showToast('Failed to remove company.', 3000, 'error');
      }
    });
  });

  // --- View Users for Company (future-ready) ---
  container.querySelectorAll('.btn-view-users').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const companyName = btn.dataset.companyName || '';
      // You can upgrade here to import admin-users.js and pass filter!
      showToast(`Viewing users for company: ${companyName}`, 3500, 'info');
      // Example: import('./admin-users.js').then(mod => mod.renderAdminUsers(container, { filterCompany: companyName }))
    });
  });

  // --- Back to Dashboard ---
  container
    .querySelector('#back-to-admin-dashboard-btn')
    ?.addEventListener('click', () => {
      import('./admin-dashboard.js').then((mod) => mod.renderAdminDashboard());
    });
}
