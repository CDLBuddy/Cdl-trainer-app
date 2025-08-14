// src/superadmin/SuperAdminDashboard.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'

import Shell from '@components/Shell.jsx'
import { useToast } from '@components/ToastContext'
import { db } from '@utils/firebase.js'

import styles from './SuperAdminDashboard.module.css'

// Small helpers
const safeEmail = () =>
  localStorage.getItem('currentUserEmail') ||
  (typeof window !== 'undefined' ? window.currentUserEmail : '') ||
  ''

const safeRole = () =>
  (localStorage.getItem('userRole') ||
    (typeof window !== 'undefined' ? window.currentUserRole : '') ||
    ''
  ).toLowerCase()

const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase())
    .join('') || 'SA'

export default function SuperAdminDashboard() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState(null)
  const [email, setEmail] = useState('')
  const [stats, setStats] = useState({ schools: 0, users: 0, complianceAlerts: 0 })

  // Title management
  useEffect(() => {
    const prev = document.title
    document.title = 'Super Admin • CDL Trainer'
    return () => { document.title = prev }
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        // Guard
        if (safeRole() !== 'superadmin') {
          showToast('Access denied: Super Admins only.', 'error')
          window.handleLogout?.()
          navigate('/login', { replace: true })
          return
        }

        const e = safeEmail()
        if (alive) setEmail(e)

        // Parallel fetches
        const [meSnap, schoolsSnap, usersSnap, alertsSnap] = await Promise.all([
          e
            ? getDocs(query(collection(db, 'users'), where('email', '==', e)))
            : Promise.resolve({ empty: true }),
          getDocs(collection(db, 'schools')),
          getDocs(collection(db, 'users')),
          getDocs(query(collection(db, 'complianceAlerts'), where('resolved', '==', false))),
        ])

        if (!alive) return
        if (meSnap && !meSnap.empty) setMe(meSnap.docs[0].data() || null)

        setStats({
          schools: schoolsSnap.size || 0,
          users: usersSnap.size || 0,
          complianceAlerts: alertsSnap.size || 0,
        })
      } catch (err) {
        if (import.meta.env.DEV) console.error('[SuperAdminDashboard]', err)
        showToast('Failed to load dashboard data.', 'error')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Memoized profile display
  const name = useMemo(() => me?.name || 'Super Admin', [me])
  const avatar = useMemo(() => me?.profilePicUrl || '', [me])

  if (loading) {
    return (
      <Shell title="Super Admin Dashboard">
        <div className="center" style={{ marginTop: 40 }}>
          <div className="spinner" aria-label="Loading" />
          <p className="mt-3">Loading super admin dashboard…</p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell title="Super Admin Dashboard">
      <div className={styles.wrapper}>
        {/* Header */}
        <h2 className={styles.dashHead}>
          🏆 Super Admin Panel{' '}
          <span className={`${styles.roleBadge} ${styles.superadmin}`}>Super Admin</span>
        </h2>

        {/* Stats */}
        <div className={styles.statsBar} role="group" aria-label="Platform stats">
          <span className={styles.stat}>🏫 Schools: <b>{stats.schools}</b></span>
          <span className={styles.stat}>👤 Users: <b>{stats.users}</b></span>
          <span className={`${styles.stat} ${styles.dangerText}`}>
            🛡️ Compliance Alerts: <b>{stats.complianceAlerts}</b>
          </span>
        </div>

        {/* Profile */}
        <section className={styles.profileCard} aria-label="Your profile">
          {avatar ? (
            <img src={avatar} alt="Profile" className={styles.profilePic} />
          ) : (
            <div className={`${styles.profilePic} ${styles.placeholder}`} aria-hidden>
              {initials(name)}
            </div>
          )}
          <div>
            <div className={styles.profileName}>{name}</div>
            <div className={styles.profileEmail}>{email}</div>
          </div>
        </section>

        {/* Features */}
        <div className={styles.grid} role="list" aria-label="Admin features">
          <FeatureCard
            title="🏫 School Management"
            desc="Create, edit, and review schools. Manage TPR IDs, locations, and status."
            btn="Manage Schools"
            to="/superadmin/schools"
          />
          <FeatureCard
            title="👤 User Management"
            desc="Add, remove, and modify users. Assign roles and reset access."
            btn="Manage Users"
            to="/superadmin/users"
          />
          <FeatureCard
            title="🛡️ Compliance Center"
            desc="Audit ELDT/FMCSA compliance and generate reports."
            btn="Open Compliance"
            to="/superadmin/compliance"
          />
          <FeatureCard
            title="💳 Billing & Licensing"
            desc="Subscriptions, invoices, and license renewals."
            btn="Open Billing"
            to="/superadmin/billing"
          />
          <FeatureCard
            title="⚙️ Platform Settings"
            desc="System defaults, branding, and advanced options."
            btn="Open Settings"
            to="/superadmin/settings"
          />
          <FeatureCard
            title="🪵 Audit Logs"
            desc="Review platform activity and events."
            btn="View Logs"
            to="/superadmin/logs"
          />
          {/* Bonus: direct link to the Walkthrough Manager you built */}
          <FeatureCard
            title="🧭 Walkthrough Manager"
            desc="Edit default or per-school CDL walkthrough scripts."
            btn="Open Walkthroughs"
            to="/superadmin/walkthrough-manager"
          />
        </div>
      </div>
    </Shell>
  )
}

function FeatureCard({ title, desc, btn, to }) {
  const navigate = useNavigate()
  const onClick = useCallback(() => navigate(to), [navigate, to])

  return (
    <div className={styles.featureCard} role="listitem">
      <div className={styles.cardTitle}>{title}</div>
      <p className={styles.cardDesc}>{desc}</p>
      <div className={styles.actions}>
        <button className="btn wide" onClick={onClick} aria-label={btn}>
          {btn}
        </button>
      </div>
    </div>
  )
}