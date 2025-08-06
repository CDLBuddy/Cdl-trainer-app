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
      name: c.name,
      contact: c.contact || '',
      address: c.address || '',
      id: docSnap.id,
      createdAt: c.createdAt || '',
    });
  });
  companies.sort((a, b) => a.name.localeCompare(b.name));
  return companies;
}

// === CSV Export Utility ===
function exportCompaniesToCSV(companies) {
  if (!companies.length) return showToast('No companies to export.');
  const headers = Object.keys(companies[0]);
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

// === PDF Export Utility ===
async function exportCompaniesToPDF(companies) {
  if (!companies.length) return showToast('No companies to export.');
  await ensureJsPDF();
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text('Companies List', 10, 16);
  const headers = Object.keys(companies[0]);
  let y = 25;
  doc.setFontSize(10);
  doc.text(headers.join(' | '), 10, y);
  y += 7;
  companies.forEach((c) => {
    doc.text(headers.map((h) => c[h] ?? '').join(' | '), 10, y);
    y += 6;
    if (y > 280) {
      doc.addPage();
      y = 15;
    }
  });
  doc.save(`companies-export-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// === Bulk Import from CSV ===
async function bulkImportCompaniesFromCSV(csvText, schoolId, onComplete) {
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
    if (nameIdx === -1) throw new Error('CSV must have a "name" column.');
    let added = 0,
      skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',').map((v) => v.trim());
      const name = vals[nameIdx];
      if (!name) continue;
      const contact = contactIdx !== -1 ? vals[contactIdx] : '';
      const address = addressIdx !== -1 ? vals[addressIdx] : '';
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
        createdAt: new Date().toISOString(),
      });
      added++;
    }
    if (onComplete) onComplete({ added, skipped });
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

  // --- Permissions: only admins/instructors/superadmins can access ---
  if (!['admin', 'instructor', 'superadmin'].includes(userRole)) {
    container.innerHTML = `<div style="padding:2em;color:#b22;"><b>Access denied.</b><br>You do not have permission to manage companies.</div>`;
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

  // --- Fetch Companies for this School ---
  let companies = [];
  try {
    companies = await fetchCompanyListForSchool(schoolId);
  } catch (e) {
    companies = [];
    showToast('Failed to load companies.', 4200, 'error');
    console.error('Admin companies fetch error', e);
  }

  // --- Main page HTML with search/filter, export, bulk import ---
  container.innerHTML = `
    <div class="screen-wrapper fade-in admin-companies-page" style="padding: 24px; max-width: 820px; margin: 0 auto;">
      <header style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.1em;">
        <span style="font-size:1.25em;font-weight:500;color:${accent};">${schoolName}</span>
        ${headerLogo}
      </header>
      <h2 style="margin-top:0;">🏢 Manage Companies</h2>
      <div class="dashboard-card" style="margin-bottom:1.3rem;">
        <form id="add-company-form" style="display:flex;gap:0.7em;margin-bottom:1.1em;">
          <input type="text" name="companyName" placeholder="New Company Name" required style="flex:1;min-width:160px;">
          <input type="text" name="companyContact" placeholder="Contact (optional)" style="min-width:120px;">
          <input type="text" name="companyAddress" placeholder="Address (optional)" style="min-width:120px;">
          <button class="btn" type="submit" style="background:${accent};border:none;">+ Add Company</button>
        </form>
        <div style="display: flex; gap: 12px; margin-bottom: 1em;flex-wrap:wrap;">
          <input type="text" id="company-search" placeholder="Search companies..." style="flex:1;min-width:170px;max-width:260px;padding:6px 11px;border-radius:7px;border:1px solid #ddd;margin-bottom:0;">
          <button class="btn outline" id="export-csv-btn" type="button">Export to CSV</button>
          <button class="btn outline" id="export-pdf-btn" type="button">Export to PDF</button>
          <label class="btn outline" style="margin-bottom:0;cursor:pointer;">
            <input type="file" id="import-csv-input" accept=".csv" style="display:none;">
            Bulk Import CSV
          </label>
        </div>
        <table class="company-table" style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th>Company Name</th>
              <th>Contact</th>
              <th>Address</th>
              <th>Created</th>
              <th style="width:120px;">Actions</th>
            </tr>
          </thead>
          <tbody id="companies-tbody">
            ${companies
              .map(
                (c) => `
              <tr data-company-id="${c.id}">
                <td><input class="company-name-input" value="${c.name}" style="width:98%;padding:2px 7px;" /></td>
                <td><input class="company-contact-input" value="${c.contact}" style="width:98%;padding:2px 7px;" /></td>
                <td><input class="company-address-input" value="${c.address}" style="width:98%;padding:2px 7px;" /></td>
                <td>${c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''}</td>
                <td>
                  <button class="btn outline btn-save-company" data-company-id="${c.id}">Save</button>
                  <button class="btn outline btn-remove-company" data-company-id="${c.id}" style="margin-left:6px;">Remove</button>
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
        <div style="font-size:0.98em;color:#888;margin-top:7px;">
          Bulk import supports columns: <b>name</b>, <b>contact</b>, <b>address</b> (first row: header)
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
      tbody.innerHTML = filteredCompanies
        .map(
          (c) => `
        <tr data-company-id="${c.id}">
          <td><input class="company-name-input" value="${c.name}" style="width:98%;padding:2px 7px;" /></td>
          <td><input class="company-contact-input" value="${c.contact}" style="width:98%;padding:2px 7px;" /></td>
          <td><input class="company-address-input" value="${c.address}" style="width:98%;padding:2px 7px;" /></td>
          <td>${c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''}</td>
          <td>
            <button class="btn outline btn-save-company" data-company-id="${c.id}">Save</button>
            <button class="btn outline btn-remove-company" data-company-id="${c.id}" style="margin-left:6px;">Remove</button>
          </td>
        </tr>
      `
        )
        .join('');
    });
  }

  // --- Export Handlers ---
  container.querySelector('#export-csv-btn')?.addEventListener('click', () => {
    exportCompaniesToCSV(filteredCompanies);
  });
  container.querySelector('#export-pdf-btn')?.addEventListener('click', () => {
    exportCompaniesToPDF(filteredCompanies);
  });

  // --- Bulk Import Handler ---
  const importInput = container.querySelector('#import-csv-input');
  importInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    bulkImportCompaniesFromCSV(text, schoolId, ({ added, skipped }) => {
      showToast(
        `Imported: ${added}, Skipped duplicates: ${skipped}`,
        4300,
        'success'
      );
      renderAdminCompanies(container);
    });
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
          schoolId,
          createdAt: new Date().toISOString(),
        });
        showToast('Company added!', 2200, 'success');
        renderAdminCompanies(container); // Refresh
      } catch (err) {
        showToast('Failed to add company.', 3200, 'error');
      }
    });

  // --- Save company (edit name/contact/address) ---
  container.querySelectorAll('.btn-save-company').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const companyId = btn.dataset.companyId;
      const row = btn.closest('tr');
      const name = row.querySelector('.company-name-input').value.trim();
      const contact = row.querySelector('.company-contact-input').value.trim();
      const address = row.querySelector('.company-address-input').value.trim();
      if (!name) return showToast('Company name cannot be empty.');
      try {
        await updateDoc(doc(db, 'companies', companyId), {
          name,
          contact,
          address,
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

  // --- Back to Dashboard ---
  container
    .querySelector('#back-to-admin-dashboard-btn')
    ?.addEventListener('click', () => {
      import('./admin-dashboard.js').then((mod) => mod.renderAdminDashboard());
    });
}