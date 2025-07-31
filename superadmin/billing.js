// superadmin/billing.js

import { db } from '../firebase.js';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
import { showToast, setupNavigation } from '../ui-helpers.js';
import { renderSuperadminDashboard } from './superadmin-dashboard.js';

// Utility for date formatting
function formatDate(d) {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return '-';
  }
}

// === MAIN BILLING PAGE ===
export async function renderBilling(
  container = document.getElementById('app')
) {
  if (!container) return;

  // Fetch all schools and their billing info
  let schools = [];
  try {
    const schoolsSnap = await getDocs(collection(db, 'schools'));
    schools = schoolsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    showToast('Failed to load schools or billing info.');
    schools = [];
  }

  container.innerHTML = `
    <div class="screen-wrapper fade-in billing-page" style="max-width:1100px;margin:0 auto;">
      <h2 class="dash-head">💳 Billing & Licensing <span class="role-badge superadmin">Super Admin</span></h2>
      <div class="dashboard-card">
        <h3>Manage School Subscriptions, Licensing & Payments</h3>
        <button class="btn small outline" id="export-billing-csv" style="float:right;margin-top:-38px;">Export CSV</button>
        <table class="schools-billing-table" style="width:100%;margin-top:1.4rem;">
          <thead>
            <tr>
              <th>School Name</th>
              <th>Location</th>
              <th>TPR ID</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Renewal</th>
              <th>Last Payment</th>
              <th>Invoice</th>
              <th>Licensing Docs</th>
              <th>Notes</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${
              schools.length === 0
                ? `
              <tr><td colspan="11" style="text-align:center;">No schools found.</td></tr>
            `
                : schools
                    .map((school) => {
                      // --- Overdue badges ---
                      const overdue =
                        school.renewalDate &&
                        new Date(school.renewalDate) < new Date();
                      return `
                <tr>
                  <td>${school.name || '-'}</td>
                  <td>${school.location || '-'}</td>
                  <td>${school.tprId || '-'}</td>
                  <td>${school.billingPlan || 'Standard'}</td>
                  <td>
                    ${
                      school.isActive
                        ? `<span class="badge badge-success">Active</span>`
                        : `<span class="badge badge-fail">Inactive</span>`
                    }
                    ${overdue ? `<span class="badge badge-fail">Renewal Overdue</span>` : ''}
                  </td>
                  <td>${school.renewalDate ? formatDate(school.renewalDate) : '-'}</td>
                  <td>${school.lastPaymentDate ? formatDate(school.lastPaymentDate) : '-'}</td>
                  <td>
                    ${
                      school.invoiceUrl
                        ? `<a href="${school.invoiceUrl}" target="_blank">Download</a>`
                        : `<span class="badge badge-neutral">No Invoice</span>`
                    }
                  </td>
                  <td>
                    ${
                      school.licensingDocs && school.licensingDocs.length
                        ? school.licensingDocs
                            .map(
                              (url, i) =>
                                `<a href="${url}" target="_blank">Lic ${i + 1}</a>`
                            )
                            .join(', ')
                        : `<span class="badge badge-neutral">None</span>`
                    }
                  </td>
                  <td style="max-width:160px;font-size:.97em;word-break:break-word;">
                    ${school.billingNotes ? school.billingNotes : ''}
                  </td>
                  <td>
                    <button class="btn small outline" data-school-id="${school.id}" data-action="view">View</button>
                    <button class="btn small" data-school-id="${school.id}" data-action="edit">Edit</button>
                  </td>
                </tr>
              `;
                    })
                    .join('')
            }
          </tbody>
        </table>
        <div class="billing-hint" style="margin:1em 0 .3em;font-size:.98em;color:#777;">
          <b>Note:</b> All changes are logged for audit. Export full records or upload invoices/licensing docs as needed.
        </div>
        <button class="btn outline" id="back-to-superadmin-dashboard-btn" style="margin-top:2.2rem;">⬅ Dashboard</button>
      </div>
      <div id="billing-modal-root"></div>
    </div>
  `;

  setupNavigation();

  // --- CSV Export handler ---
  document
    .getElementById('export-billing-csv')
    ?.addEventListener('click', () => {
      const rows = [
        [
          'School Name',
          'Location',
          'TPR ID',
          'Plan',
          'Status',
          'Renewal',
          'Last Payment',
          'Invoice',
          'Licensing Docs',
          'Notes',
        ],
      ].concat(
        schools.map((school) => [
          school.name || '',
          school.location || '',
          school.tprId || '',
          school.billingPlan || 'Standard',
          school.isActive ? 'Active' : 'Inactive',
          school.renewalDate ? formatDate(school.renewalDate) : '',
          school.lastPaymentDate ? formatDate(school.lastPaymentDate) : '',
          school.invoiceUrl || '',
          school.licensingDocs && school.licensingDocs.length
            ? school.licensingDocs.join(', ')
            : '',
          school.billingNotes || '',
        ])
      );
      const csv = rows
        .map((r) => r.map((x) => `"${(x + '').replace(/"/g, '""')}"`).join(','))
        .join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `cdl-schools-billing-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
    });

  // Back button
  document
    .getElementById('back-to-superadmin-dashboard-btn')
    ?.addEventListener('click', () => {
      renderSuperadminDashboard(container);
    });

  // Action buttons: View/Edit
  container.querySelectorAll('.btn[data-action="view"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const schoolId = btn.getAttribute('data-school-id');
      showBillingModal(
        schools.find((s) => s.id === schoolId),
        'view',
        container
      );
    });
  });
  container.querySelectorAll('.btn[data-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const schoolId = btn.getAttribute('data-school-id');
      showBillingModal(
        schools.find((s) => s.id === schoolId),
        'edit',
        container
      );
    });
  });
}

// --- Billing modal for View/Edit (with invoices, docs, manual override, and notes) ---
function showBillingModal(school, mode = 'view', container) {
  const modalRoot =
    document.getElementById('billing-modal-root') || document.body;
  const isEdit = mode === 'edit';
  const renewal = school.renewalDate
    ? new Date(school.renewalDate).toISOString().slice(0, 10)
    : '';
  const payment = school.lastPaymentDate
    ? new Date(school.lastPaymentDate).toISOString().slice(0, 10)
    : '';

  // Modal overlay
  const modal = document.createElement('div');
  modal.className = 'modal-overlay fade-in';
  modal.innerHTML = `
    <div class="modal-card billing-modal" style="max-width:510px;">
      <button class="modal-close" aria-label="Close">&times;</button>
      <h3>${isEdit ? 'Edit' : 'View'} Billing: ${school.name}</h3>
      <form id="billing-form">
        <label>School Name: <input type="text" name="name" value="${school.name || ''}" ${isEdit ? '' : 'readonly'} /></label>
        <label>Location: <input type="text" name="location" value="${school.location || ''}" ${isEdit ? '' : 'readonly'} /></label>
        <label>TPR ID: <input type="text" name="tprId" value="${school.tprId || ''}" ${isEdit ? '' : 'readonly'} /></label>
        <label>Billing Plan:
          <select name="billingPlan" ${isEdit ? '' : 'disabled'}>
            <option value="Standard" ${school.billingPlan === 'Standard' ? 'selected' : ''}>Standard</option>
            <option value="Premium" ${school.billingPlan === 'Premium' ? 'selected' : ''}>Premium</option>
            <option value="Enterprise" ${school.billingPlan === 'Enterprise' ? 'selected' : ''}>Enterprise</option>
            <option value="Custom" ${school.billingPlan === 'Custom' ? 'selected' : ''}>Custom/Manual</option>
          </select>
        </label>
        <label>Status:
          <select name="isActive" ${isEdit ? '' : 'disabled'}>
            <option value="true" ${school.isActive ? 'selected' : ''}>Active</option>
            <option value="false" ${!school.isActive ? 'selected' : ''}>Inactive</option>
          </select>
        </label>
        <label>Renewal Date: <input type="date" name="renewalDate" value="${renewal}" ${isEdit ? '' : 'readonly'} /></label>
        <label>Last Payment Date: <input type="date" name="lastPaymentDate" value="${payment}" ${isEdit ? '' : 'readonly'} /></label>
        <label>Invoice URL: 
          ${
            isEdit
              ? `<input type="text" name="invoiceUrl" value="${school.invoiceUrl || ''}" placeholder="Link to invoice PDF (optional)"/>`
              : school.invoiceUrl
                ? `<a href="${school.invoiceUrl}" target="_blank">Download Invoice</a>`
                : `<span class="badge badge-neutral">None</span>`
          }
        </label>
        <label>Licensing Docs: 
          ${
            isEdit
              ? `<input type="text" name="licensingDocs" value="${(school.licensingDocs || []).join(', ')}" placeholder="Links, comma separated"/>`
              : school.licensingDocs && school.licensingDocs.length
                ? school.licensingDocs
                    .map(
                      (url, i) =>
                        `<a href="${url}" target="_blank">License ${i + 1}</a>`
                    )
                    .join(', ')
                : `<span class="badge badge-neutral">None</span>`
          }
        </label>
        <label>Billing Notes: <textarea name="billingNotes" ${isEdit ? '' : 'readonly'}>${school.billingNotes || ''}</textarea></label>
        <label>Manual Override: 
          ${
            isEdit
              ? `<input type="text" name="manualOverride" value="${school.manualOverride || ''}" placeholder="e.g. comp, discount, note"/>`
              : school.manualOverride
                ? `<span>${school.manualOverride}</span>`
                : `<span class="badge badge-neutral">None</span>`
          }
        </label>
        ${isEdit ? `<button class="btn primary wide" type="submit">Save Changes</button>` : ''}
        <button class="btn outline wide" type="button" id="close-billing-modal">Close</button>
      </form>
    </div>
  `;
  // Remove existing modals
  document.querySelectorAll('.modal-overlay').forEach((el) => el.remove());
  modalRoot.appendChild(modal);

  // Close modal
  modal.querySelector('.modal-close').onclick = modal.querySelector(
    '#close-billing-modal'
  ).onclick = () => modal.remove();

  // Save handler (only if editing)
  if (isEdit) {
    modal.querySelector('#billing-form').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const updated = {
        name: fd.get('name'),
        location: fd.get('location'),
        tprId: fd.get('tprId'),
        billingPlan: fd.get('billingPlan'),
        isActive: fd.get('isActive') === 'true',
        renewalDate: fd.get('renewalDate'),
        lastPaymentDate: fd.get('lastPaymentDate'),
        invoiceUrl: fd.get('invoiceUrl'),
        licensingDocs: fd.get('licensingDocs')
          ? fd
              .get('licensingDocs')
              .split(',')
              .map((x) => x.trim())
          : [],
        billingNotes: fd.get('billingNotes'),
        manualOverride: fd.get('manualOverride'),
      };
      try {
        await updateDoc(doc(db, 'schools', school.id), updated);
        showToast('Billing info updated!');
        modal.remove();
        renderBilling(container);
      } catch (err) {
        showToast('❌ Failed to update billing info.');
      }
    };
  }
}