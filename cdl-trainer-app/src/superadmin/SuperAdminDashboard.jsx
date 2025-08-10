// src/superadmin/SuperAdminDashboard.jsx
import { collection, getDocs, query, where } from 'firebase/firestore'
import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import Shell from '@components/Shell.jsx'
import { db } from '@utils/firebase.js'
import { showToast } from '@utils/ui-helpers.js'

import styles from './SuperAdminDashboard.module.css'

export default function SuperAdminDashboard() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState(null)
  const [email, setEmail] = useState('')
  const [stats, setStats] = useState({
    schools: 0,
    users: 0,
    complianceAlerts: 0,
  })

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        // --- Guard ---
        const role = (
          localStorage.getItem('userRole') ||
          window.currentUserRole ||
          ''
        ).toLowerCase()
        if (role !== 'superadmin') {
          showToast('Access denied: Super Admins only.', 3500, 'error')
          if (window.handleLogout) window.handleLogout()
          navigate('/login', { replace: true })
          return
        }

        // --- Current user email ---
        const e =
          localStorage.getItem('currentUserEmail') ||
          window.currentUserEmail ||
          ''
        if (alive) setEmail(e)

        // --- Profile (best-effort) ---
        if (e) {
          try {
            const qUser = query(
              collection(db, 'users'),
              where('email', '==', e)
            )
            const snap = await getDocs(qUser)
            if (!snap.empty && alive) setMe(snap.docs[0].data())
          } catch {
            /* non-fatal */
          }
        }

        // --- Stats ---
        try {
          const schoolsSnap = await getDocs(collection(db, 'schools'))
          const usersSnap = await getDocs(collection(db, 'users'))
          const alertsSnap = await getDocs(
            query(
              collection(db, 'complianceAlerts'),
              where('resolved', '==', false)
            )
          )
          if (alive) {
            setStats({
              schools: schoolsSnap.size,
              users: usersSnap.size,
              complianceAlerts: alertsSnap.size,
            })
          }
        } catch {
          /* non-fatal */
        }
      } finally {
        alive && setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const name = me?.name || 'Super Admin'
  const avatar = me?.profilePicUrl || ''

  return (
    <Shell title="Super Admin Dashboard">
      <div className={styles.wrapper}>
        {/* Header */}
        <h2 className={styles.dashHead}>
          🏆 Super Admin Panel{' '}
          <span className={`${styles.roleBadge} ${styles.superadmin}`}>
            Super Admin
          </span>
        </h2>

        {/* Stats bar */}
        <div className={styles.statsBar}>
          <span className={styles.stat}>
            🏫 Schools: <b>{stats.schools}</b>
          </span>
          <span className={styles.stat}>
            👤 Users: <b>{stats.users}</b>
          </span>
          <span className={`${styles.stat} ${styles.dangerText}`}>
            🛡️ Compliance Alerts: <b>{stats.complianceAlerts}</b>
          </span>
        </div>

        {/* Profile card */}
        <div className={styles.profileCard}>
          {avatar ? (
            <img src={avatar} alt="Profile" className={styles.profilePic} />
          ) : (
            <div
              className={`${styles.profilePic} ${'placeholder'}`}
              aria-hidden
            >
              SA
            </div>
          )}
          <div>
            <div className="bold">{name}</div>
            <div className="muted">{email}</div>
          </div>
        </div>

        {/* Feature grid */}
        <div className={styles.grid}>
          <FeatureCard
            title="🏫 School Management"
            desc="Create, edit, view, or remove CDL training schools. Manage TPR IDs, locations, and compliance status."
            btn="Manage Schools"
            to="/superadmin/schools"
          />
          <FeatureCard
            title="👤 User Management"
            desc="Add, remove, or modify instructor, admin, and student accounts. Set roles, reset passwords, or assign users."
            btn="Manage Users"
            to="/superadmin/users"
          />
          <FeatureCard
            title="🛡️ Compliance Center"
            desc="Audit schools and users for ELDT/FMCSA compliance. Generate reports or track documentation."
            btn="Open Compliance"
            to="/superadmin/compliance"
          />
          <FeatureCard
            title="💳 Billing & Licensing"
            desc="View or manage school billing, subscriptions, and license renewals."
            btn="Open Billing"
            to="/superadmin/billing"
          />
          <FeatureCard
            title="⚙️ Platform Settings"
            desc="Configure system-wide settings, defaults, and advanced options."
            btn="Open Settings"
            to="/superadmin/settings"
          />
          <FeatureCard
            title="🪵 Audit Logs"
            desc="View platform activity logs, user actions, and system events."
            btn="View Logs"
            to="/superadmin/logs"
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
    <div className={styles.featureCard}>
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
