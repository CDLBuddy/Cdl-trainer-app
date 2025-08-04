// admin/admin-companies.js

import { db } from '../firebase.js';
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
import { showToast, setupNavigation } from '../ui-helpers.js';
import { getCurrentSchoolBranding } from '../school-branding.js';

// --- Get current schoolId from localStorage or window
function getCurrentSchoolId() {
  return localStorage.getItem('schoolId') || window.schoolId;
}

// --- Only fetch companies for this school ---
async function fetchCompanyListForSchool(schoolId) {
  if (!schoolId) return [];
  const companiesSnap = await getDocs(
    query(collection(db, 'companies'), where('schoolId', '==', schoolId))
  );
  const companies = [];
  companiesSnap.forEach((docSnap) => {
    const c = docSnap.data();
    if (c.name) companies.push({ name: c.name, id: docSnap.id });
  });
  companies.sort((a, b) => a.name.localeCompare(b.name));
  return companies;
}

/** Render the Admin Companies Management page */
export async function renderAdminCompanies(
  container = document.getElementById('app')
) {
  container = container || document.getElementById('app');
  const schoolId = getCurrentSchoolId();

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

  // --- Companies for THIS SCHOOL ---
  let companies = [];
  try {
    companies = await fetchCompanyListForSchool(schoolId);
  } catch (e) {
    companies = [];
    showToast('Failed to load companies.', 4200, 'error');
    console.error('Admin companies fetch error', e);
  }

  // --- Render company management UI ---
  container.innerHTML = `
    <div class="screen-wrapper fade-in admin-companies-page" style="padding: 24px; max-width: 780px; margin: 0 auto;">
      <header style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.1em;">
        <span style="font-size:1.25em;font-weight:500;color:${accent};">${schoolName}</span>
        ${headerLogo}
      </header>
      <h2 style="margin-top:0;">🏢 Manage Companies</h2>
      <div class="dashboard-card" style="margin-bottom:1.3rem;">
        <form id="add-company-form" style="display:flex;gap:0.7em;margin-bottom:1.1em;">
          <input type="text" name="companyName" placeholder="New Company Name" required style="flex:1;min-width:160px;">
          <button class="btn" type="submit" style="background:${accent};border:none;">+ Add Company</button>
        </form>
        <table class="company-table" style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th>Company Name</th>
              <th style="width:120px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${companies
              .map(
                (c) => `
              <tr data-company-id="${c.id}">
                <td>
                  <input class="company-name-input" value="${c.name}" style="width:90%;padding:2px 7px;" />
                </td>
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
      </div>
      <button class="btn outline wide" id="back-to-admin-dashboard-btn" style="margin-top:1.3rem;">⬅ Back to Dashboard</button>
    </div>
  `;

  setupNavigation();

  // --- Add company handler (scoped to this school only) ---
  container
    .querySelector('#add-company-form')
    ?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const companyName = form.companyName.value.trim();
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
          schoolId,
          createdAt: new Date().toISOString(),
        });
        showToast('Company added!', 2200, 'success');
        renderAdminCompanies(container); // Refresh
      } catch (err) {
        showToast('Failed to add company.', 3200, 'error');
      }
    });

  // --- Save company (rename, future fields, scoped) ---
  container.querySelectorAll('.btn-save-company').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const companyId = btn.dataset.companyId;
      const row = btn.closest('tr');
      const input = row.querySelector('.company-name-input');
      const newName = input.value.trim();
      if (!newName) return showToast('Company name cannot be empty.');
      try {
        await updateDoc(doc(db, 'companies', companyId), { name: newName });
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
