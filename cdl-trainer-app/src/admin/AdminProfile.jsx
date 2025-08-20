// src/admin/AdminProfile.jsx
import { collection, getDocs, query, where } from 'firebase/firestore'
import React, { useEffect, useState } from 'react'

import Shell from '@components/Shell.jsx'
import { db, auth } from '@utils/firebase.js'
import { getCurrentSchoolBranding } from '@utils/school-branding.js'

import { useToast } from '@/components/ToastContext.js'

export default function AdminProfile() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [brand, setBrand] = useState({})
  const [admin, setAdmin] = useState(null)
  const [snap, setSnap] = useState({
    compliance: { tprId: '', license: '', insuranceExpiry: '' },
    billing: { plan: 'standard', payerDefault: 'mixed', nextInvoice: '' },
    usage: { students30d: 0, instructors: 0, enrollmentsThisMonth: 0 },
  })

  const currentUserEmail =
    auth?.currentUser?.email ||
    window.currentUserEmail ||
    localStorage.getItem('currentUserEmail') ||
    null

  const schoolId = window.schoolId || localStorage.getItem('schoolId') || null

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!currentUserEmail || !schoolId) {
        showToast('Missing account or school. Please sign in again.', 'error')
        return
      }
      setLoading(true)
      try {
        const branding = (await getCurrentSchoolBranding()) || {}
        if (alive) setBrand(branding)

        // fetch admin profile (read-only)
        const usersRef = collection(db, 'users')
        const qy = query(usersRef, where('email', '==', currentUserEmail))
        const snap = await getDocs(qy)
        const data = !snap.empty ? { id: snap.docs[0].id, ...snap.docs[0].data() } : null

        if (!data || data.role !== 'admin' || data.schoolId !== schoolId) {
          showToast('Access denied: Admin profile only.', 'error')
          window.location.assign('/admin/dashboard')
          return
        }
        if (alive) setAdmin(data)

        // TODO: hydrate real snapshots from Firestore when ready
        // Placeholder values to demonstrate visual
        if (alive) {
          setSnap({
            compliance: {
              tprId: data.tprId || branding?.tprId || '',
              license: data.stateLicense || branding?.stateLicense || '',
              insuranceExpiry: data.insuranceExpiry || branding?.insuranceExpiry || '',
            },
            billing: {
              plan: branding?.plan || 'standard',
              payerDefault: branding?.payerDefault || 'mixed',
              nextInvoice: branding?.nextInvoice || '',
            },
            usage: {
              students30d: data.students30d || 0,
              instructors: data.instructorCount || 0,
              enrollmentsThisMonth: data.enrollmentsThisMonth || 0,
            },
          })
        }
      } catch {
        showToast('Failed to load admin profile.', 'error')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [currentUserEmail, schoolId, showToast])

  if (loading) {
    return (
      <Shell title="Admin Profile">
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <div className="spinner" />
          <p>Loading profile…</p>
        </div>
      </Shell>
    )
  }

  const primary = brand.primaryColor || '#4fb0c6'

  return (
    <Shell title="Admin Profile">
      <div className="screen-wrapper fade-in" style={{ maxWidth: 760, margin: '0 auto' }}>
        {/* Header: school identity */}
        <header
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '1rem',
          }}
        >
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: primary }}>
              {brand.schoolName || 'Your School'}
            </div>
            <div style={{ opacity: 0.8 }}>
              {admin?.companyAddress || brand?.address || 'Add school address in Settings → Branding'}
            </div>
          </div>
          {brand.logoUrl && (
            <img
              src={brand.logoUrl}
              alt="School logo"
              style={{ height: 56, borderRadius: 8, background: '#ffffff10', padding: 8 }}
            />
          )}
        </header>

        {/* Admin contact card */}
        <section className="dashboard-card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>Primary Admin</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><b>Name:</b> {admin?.name || '—'}</div>
            <div><b>Email:</b> <span style={{ fontFamily: 'ui-monospace,monospace' }}>{admin?.email}</span></div>
            <div><b>Phone:</b> {admin?.phone || '—'}</div>
            <div><b>Role:</b> Admin</div>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a className="btn outline" href="/admin/settings#branding">Edit School & Branding</a>
            <a className="btn outline" href="/admin/settings#users">Invite Staff</a>
            <a className="btn outline" href="/admin/billing">Manage Billing</a>
          </div>
        </section>

        {/* Snapshots */}
        <div className="u-grid u-grid-3 u-gap-16">
          <section className="dashboard-card">
            <h3 style={{ marginTop: 0 }}>Compliance</h3>
            <div><b>TPR ID:</b> {snap.compliance.tprId || '—'}</div>
            <div><b>State License:</b> {snap.compliance.license || '—'}</div>
            <div><b>Insurance Expiry:</b> {snap.compliance.insuranceExpiry || '—'}</div>
            <div style={{ marginTop: 10 }}>
              <a className="btn small outline" href="/admin/settings#compliance">Update Compliance</a>
            </div>
          </section>

          <section className="dashboard-card">
            <h3 style={{ marginTop: 0 }}>Billing</h3>
            <div><b>Plan:</b> {snap.billing.plan}</div>
            <div><b>Default Payer:</b> {snap.billing.payerDefault}</div>
            <div><b>Next Invoice:</b> {snap.billing.nextInvoice || '—'}</div>
            <div style={{ marginTop: 10 }}>
              <a className="btn small outline" href="/admin/billing">Open Billing</a>
              <a className="btn small outline" href="/admin/settings#billing" style={{ marginLeft: 8 }}>Billing Settings</a>
            </div>
          </section>

          <section className="dashboard-card">
            <h3 style={{ marginTop: 0 }}>Usage (last 30 days)</h3>
            <div><b>Active Students:</b> {snap.usage.students30d}</div>
            <div><b>Instructors:</b> {snap.usage.instructors}</div>
            <div><b>Enrollments (month):</b> {snap.usage.enrollmentsThisMonth}</div>
            <div style={{ marginTop: 10 }}>
              <a className="btn small outline" href="/admin/reports">View Reports</a>
            </div>
          </section>
        </div>

        {/* Secondary links */}
        <div className="dashboard-card" style={{ marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>Shortcuts</h3>
          <div className="u-flex u-wrap" style={{ gap: 8 }}>
            <a className="btn outline" href="/admin/companies">Manage Companies</a>
            <a className="btn outline" href="/admin/users">Manage Users</a>
            <a className="btn outline" href="/admin/walkthroughs">Walkthrough Manager</a>
          </div>
        </div>
      </div>
    </Shell>
  )
}