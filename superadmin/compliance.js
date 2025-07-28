// superadmin/compliance.js

import { db, storage } from '../firebase.js';
import { showToast, setupNavigation } from '../ui-helpers.js';
import { renderSuperadminDashboard } from './superadmin-dashboard.js';

// Utility: return days until (or since) date, used for reminders
function daysUntil(date) {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  return Math.floor((d - now) / (1000 * 60 * 60 * 24));
}

export async function renderComplianceCenter(
  container = document.getElementById('app')
) {
  if (!container) return;

  // Fetch all schools and compliance info
  let schools = [];
  try {
    const schoolsSnap = await db.collection('schools').get();
    schools = schoolsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    showToast('Failed to load schools.');
    schools = [];
  }

  container.innerHTML = `
    <div class="screen-wrapper fade-in compliance-page" style="max-width:1040px;margin:0 auto;">
      <h2 class="dash-head">🛡️ Compliance Center <span class="role-badge superadmin">Super Admin</span></h2>
      <div class="dashboard-card">
        <h3>School Regulatory Compliance Overview</h3>
        <table class="compliance-table" style="width:100%;margin-top:1.2rem;">
          <thead>
            <tr>
              <th>School</th>
              <th>TPR ID</th>
              <th>Status</th>
              <th>Renewal</th>
              <th>Last Audit</th>
              <th>Curriculum</th>
              <th>Instructors</th>
              <th>Human Trafficking</th>
              <th>Compliance Score</th>
              <th>Alerts</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${
              schools.length === 0
                ? `<tr><td colspan="11" style="text-align:center;">No schools found.</td></tr>`
                : schools
                    .map((school) => {
                      // Expiry, audit/renewal checks
                      const daysToRenewal = daysUntil(school.renewalDate);
                      const renewalBadge =
                        daysToRenewal !== null
                          ? daysToRenewal < 0
                            ? `<span class="badge badge-fail">Overdue</span>`
                            : daysToRenewal < 30
                              ? `<span class="badge badge-warn">${daysToRenewal} days</span>`
                              : `<span class="badge badge-success">${daysToRenewal} days</span>`
                          : '-';
                      const daysSinceAudit = school.lastAuditDate
                        ? daysUntil(school.lastAuditDate) * -1
                        : null;
                      const auditBadge =
                        daysSinceAudit !== null
                          ? daysSinceAudit > 365
                            ? `<span class="badge badge-fail">${daysSinceAudit}d ago</span>`
                            : `<span class="badge badge-success">${daysSinceAudit}d ago</span>`
                          : '-';
                      // Missing/flags logic
                      const missing = [];
                      if (!school.lastAuditDate) missing.push('No audit date');
                      if (!school.curriculumFile)
                        missing.push('Missing curriculum');
                      if (
                        !school.instructorFiles ||
                        !school.instructorFiles.length
                      )
                        missing.push('No instructor files');
                      if (!school.humanTraffickingPolicy)
                        missing.push('Missing trafficking cert');
                      if (!school.tprStatus || school.tprStatus !== 'Active')
                        missing.push('TPR problem');
                      if (daysToRenewal !== null && daysToRenewal < 0)
                        missing.push('Renewal overdue');

                      // Health score (green/yellow/red)
                      let score = 'green';
                      if (missing.length)
                        score = missing.length > 2 ? 'red' : 'yellow';
                      if (school.complianceFlag) score = 'red';

                      return `
                  <tr>
                    <td>${school.name || '-'}</td>
                    <td>${school.tprId || '-'}</td>
                    <td>
                      ${
                        school.tprStatus === 'Active'
                          ? `<span class="badge badge-success">Active</span>`
                          : `<span class="badge badge-fail">${school.tprStatus || 'Unknown'}</span>`
                      }
                    </td>
                    <td>${school.renewalDate ? renewalBadge : '-'}</td>
                    <td>${school.lastAuditDate ? auditBadge : '-'}</td>
                    <td>
                      ${
                        school.curriculumFile
                          ? `<a href="${school.curriculumFile}" target="_blank">View</a> <span class="badge badge-version">${school.curriculumVersion || 'v1'}</span>`
                          : `<span class="badge badge-fail">Missing</span>`
                      }
                    </td>
                    <td>
                      ${
                        school.instructorFiles && school.instructorFiles.length
                          ? `<span class="badge badge-success">✔️ ${school.instructorFiles.length}</span>`
                          : `<span class="badge badge-fail">None</span>`
                      }
                    </td>
                    <td>
                      ${
                        school.humanTraffickingPolicy
                          ? `<span class="badge badge-success">Yes</span>`
                          : `<span class="badge badge-fail">No</span>`
                      }
                    </td>
                    <td>
                      <span class="compliance-health compliance-${score}">${score.toUpperCase()}</span>
                    </td>
                    <td style="color:#d37a53;font-size:.98em;">
                      ${missing.length ? missing.join(', ') : `<span style="color:#39b970">All good</span>`}
                    </td>
                    <td>
                      <button class="btn small outline" data-school-id="${school.id}" data-action="review">Review</button>
                      <button class="btn small" data-school-id="${school.id}" data-action="edit">Edit</button>
                    </td>
                  </tr>
                  `;
                    })
                    .join('')
            }
          </tbody>
        </table>
        <div class="compliance-notice" style="margin:1em 0 .3em;font-size:.98em;color:#666;">
          <b>Note:</b> All compliance changes are logged. Upload latest docs, flag issues, and keep audit/renewal dates up to date.
        </div>
        <button class="btn outline" id="back-to-superadmin-dashboard-btn" style="margin-top:2.2rem;">⬅ Dashboard</button>
      </div>
      <div id="compliance-modal-root"></div>
    </div>
  `;

  setupNavigation();

  // Back button
  document
    .getElementById('back-to-superadmin-dashboard-btn')
    ?.addEventListener('click', () => {
      renderSuperadminDashboard(container);
    });

  // Action handlers: Review/Edit
  container.querySelectorAll('.btn[data-action="review"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const schoolId = btn.getAttribute('data-school-id');
      showComplianceModal(
        schools.find((s) => s.id === schoolId),
        'view',
        container
      );
    });
  });
  container.querySelectorAll('.btn[data-action="edit"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const schoolId = btn.getAttribute('data-school-id');
      showComplianceModal(
        schools.find((s) => s.id === schoolId),
        'edit',
        container
      );
    });
  });
}

// ---- Modal: Review or Edit Compliance for a school ----
function showComplianceModal(school, mode = 'view', container) {
  const modalRoot =
    document.getElementById('compliance-modal-root') || document.body;
  const isEdit = mode === 'edit';

  const lastAudit = school.lastAuditDate
    ? new Date(school.lastAuditDate).toISOString().slice(0, 10)
    : '';
  const renewal = school.renewalDate
    ? new Date(school.renewalDate).toISOString().slice(0, 10)
    : '';

  // Modal
  const modal = document.createElement('div');
  modal.className = 'modal-overlay fade-in';
  modal.innerHTML = `
    <div class="modal-card compliance-modal" style="max-width:540px;">
      <button class="modal-close" aria-label="Close">&times;</button>
      <h3>${isEdit ? 'Edit' : 'Review'} Compliance: ${school.name}</h3>
      <form id="compliance-form">
        <label>School Name: <input type="text" name="name" value="${school.name || ''}" ${isEdit ? '' : 'readonly'} /></label>
        <label>TPR ID: <input type="text" name="tprId" value="${school.tprId || ''}" ${isEdit ? '' : 'readonly'} /></label>
        <label>FMCSA Status:
          <select name="tprStatus" ${isEdit ? '' : 'disabled'}>
            <option value="Active" ${school.tprStatus === 'Active' ? 'selected' : ''}>Active</option>
            <option value="Inactive" ${school.tprStatus === 'Inactive' ? 'selected' : ''}>Inactive</option>
            <option value="Suspended" ${school.tprStatus === 'Suspended' ? 'selected' : ''}>Suspended</option>
            <option value="Pending" ${school.tprStatus === 'Pending' ? 'selected' : ''}>Pending</option>
          </select>
        </label>
        <label>Last Audit: <input type="date" name="lastAuditDate" value="${lastAudit}" ${isEdit ? '' : 'readonly'} /></label>
        <label>Renewal Date: <input type="date" name="renewalDate" value="${renewal}" ${isEdit ? '' : 'readonly'} /></label>
        <label>Curriculum File: 
          ${
            isEdit
              ? `<input type="text" name="curriculumFile" value="${school.curriculumFile || ''}" /> 
               <input type="text" name="curriculumVersion" value="${school.curriculumVersion || ''}" placeholder="Version (v1, v2...)" />`
              : school.curriculumFile
                ? `<a href="${school.curriculumFile}" target="_blank">View Curriculum</a> <span class="badge badge-version">${school.curriculumVersion || 'v1'}</span>`
                : `<span class="badge badge-fail">None</span>`
          }
        </label>
        <label>Instructor Files: 
          ${
            isEdit
              ? `<input type="text" name="instructorFiles" value="${(school.instructorFiles || []).join(', ')}" />`
              : school.instructorFiles && school.instructorFiles.length
                ? `<span>${school.instructorFiles.join(', ')}</span>`
                : `<span class="badge badge-fail">None</span>`
          }
        </label>
        <label>Human Trafficking Policy:
          <select name="humanTraffickingPolicy" ${isEdit ? '' : 'disabled'}>
            <option value="true" ${school.humanTraffickingPolicy ? 'selected' : ''}>Yes</option>
            <option value="false" ${!school.humanTraffickingPolicy ? 'selected' : ''}>No</option>
          </select>
        </label>
        <label>Compliance Flag/Issue: 
          <select name="complianceFlag" ${isEdit ? '' : 'disabled'}>
            <option value="">None</option>
            <option value="audit" ${school.complianceFlag === 'audit' ? 'selected' : ''}>Audit/Review</option>
            <option value="renewal" ${school.complianceFlag === 'renewal' ? 'selected' : ''}>Renewal Due</option>
            <option value="docs" ${school.complianceFlag === 'docs' ? 'selected' : ''}>Missing Docs</option>
            <option value="other" ${school.complianceFlag === 'other' ? 'selected' : ''}>Other Issue</option>
          </select>
        </label>
        <label>Compliance Notes: <textarea name="notes" ${isEdit ? '' : 'readonly'}>${school.notes || ''}</textarea></label>
        <label>Audit Findings (if any): <textarea name="auditFindings" ${isEdit ? '' : 'readonly'}>${school.auditFindings || ''}</textarea></label>
        ${isEdit ? `<button class="btn primary wide" type="submit">Save Changes</button>` : ''}
        <button class="btn outline wide" type="button" id="close-compliance-modal">Close</button>
      </form>
    </div>
  `;
  // Remove any previous modals
  document.querySelectorAll('.modal-overlay').forEach((el) => el.remove());
  modalRoot.appendChild(modal);

  // Close modal
  modal.querySelector('.modal-close').onclick = modal.querySelector(
    '#close-compliance-modal'
  ).onclick = () => modal.remove();

  // Save handler (edit mode only)
  if (isEdit) {
    modal.querySelector('#compliance-form').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const updated = {
        name: fd.get('name'),
        tprId: fd.get('tprId'),
        tprStatus: fd.get('tprStatus'),
        lastAuditDate: fd.get('lastAuditDate'),
        renewalDate: fd.get('renewalDate'),
        curriculumFile: fd.get('curriculumFile'),
        curriculumVersion: fd.get('curriculumVersion') || 'v1',
        instructorFiles: fd.get('instructorFiles')
          ? fd
              .get('instructorFiles')
              .split(',')
              .map((x) => x.trim())
          : [],
        humanTraffickingPolicy: fd.get('humanTraffickingPolicy') === 'true',
        complianceFlag: fd.get('complianceFlag'),
        notes: fd.get('notes'),
        auditFindings: fd.get('auditFindings'),
      };
      try {
        await db.collection('schools').doc(school.id).update(updated);
        showToast('Compliance info updated!');
        modal.remove();
        renderComplianceCenter(container);
      } catch (err) {
        showToast('❌ Failed to update compliance info.');
      }
    };
  }
}