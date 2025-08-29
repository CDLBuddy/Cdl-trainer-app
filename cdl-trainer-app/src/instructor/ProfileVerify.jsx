// src/instructor/ProfileVerify.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import Shell from '@components/Shell.jsx'
import { useToast } from '@components/useToast.js'
// Shared student helpers
import { auth } from '@utils/firebase.js'
import {
  subscribeUserProfile,
  updateUserProfileFields,
} from '@utils/userProfile.js'

import {
  getBTWReadiness,
  getEnrollmentReadiness,
  getSectionStatus,
} from '@student/profile/schema/calculators.js'
import SectionHeader from '@student/profile/sections/SectionHeader.jsx'

const SECTION_META = [
  { key: 'basicInfo', title: 'Basic Info' },
  { key: 'permit', title: 'CDL Permit' },
  { key: 'license', title: 'Driver License' },
  { key: 'medical', title: 'Medical Card' },
  { key: 'vehicle', title: 'Vehicle Qualification' },
]

export default function ProfileVerify() {
  const { studentId } = useParams() // email, URI-encoded
  const email = useMemo(() => decodeURIComponent(studentId || ''), [studentId])
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const unsubRef = useRef(null)
  const actorEmail =
    auth?.currentUser?.email ||
    window.currentUserEmail ||
    localStorage.getItem('currentUserEmail') ||
    'instructor@unknown'

  // Subscribe to the student's profile
  useEffect(() => {
    if (!email) return
    setLoading(true)
    try {
      unsubRef.current = subscribeUserProfile(email, snap => {
        setProfile(snap || {})
        setLoading(false)
      })
    } catch {
      setLoading(false)
      showToast('Failed to subscribe to student profile.', 'error')
    }
    return () => {
      try {
        unsubRef.current?.()
      } catch {
        // intentionally ignored
      }
    }
  }, [email, showToast])

  const verified = useMemo(() => profile?.verified || {}, [profile])
  const sectionStatuses = useMemo(() => {
    if (!profile) return {}
    return SECTION_META.reduce((acc, s) => {
      acc[s.key] = getSectionStatus(s.key, profile, verified)
      return acc
    }, {})
  }, [profile, verified])

  const enrollmentPct = useMemo(
    () => getEnrollmentReadiness(profile || {}),
    [profile]
  )
  const btwPct = useMemo(() => getBTWReadiness(profile || {}), [profile])

  const canVerify = sectionKey => {
    const st = sectionStatuses[sectionKey]
    return st === 'complete' || st === 'pending-verify'
  }

  // Save verified toggle for a section
  const updateVerified = useCallback(
    async (sectionKey, checked) => {
      if (!email || !profile) return
      try {
        setSaving(true)
        const next = {
          ...(profile.verified || {}),
          [sectionKey]: !!checked,
          by: actorEmail,
          at: new Date().toISOString(),
          notes: { ...(profile?.verified?.notes || {}) },
        }
        await updateUserProfileFields(email, { verified: next }, actorEmail)
        showToast(
          checked
            ? `Marked ${sectionKey} verified.`
            : `Unverified ${sectionKey}.`,
          'success'
        )
      } catch {
        showToast('Failed to update verification.', 'error')
      } finally {
        setSaving(false)
      }
    },
    [actorEmail, email, profile, showToast]
  )

  // Save a per-section note (inline)
  const updateNote = useCallback(
    async (sectionKey, text) => {
      if (!email || !profile) return
      try {
        setSaving(true)
        const notes = {
          ...(profile?.verified?.notes || {}),
          [sectionKey]: text,
        }
        const next = {
          ...(profile.verified || {}),
          notes,
          by: actorEmail,
          at: new Date().toISOString(),
        }
        await updateUserProfileFields(email, { verified: next }, actorEmail)
      } catch {
        showToast('Failed to save note.', 'error')
      } finally {
        setSaving(false)
      }
    },
    [actorEmail, email, profile, showToast]
  )

  // Optional bulk helpers
  const verifyAll = useCallback(async () => {
    if (!email || !profile) return
    try {
      setSaving(true)
      const next = {
        ...(profile.verified || {}),
        by: actorEmail,
        at: new Date().toISOString(),
        notes: { ...(profile?.verified?.notes || {}) },
      }
      for (const s of SECTION_META) next[s.key] = true
      await updateUserProfileFields(email, { verified: next }, actorEmail)
      showToast('All sections verified.', 'success')
    } catch {
      showToast('Failed to verify all.', 'error')
    } finally {
      setSaving(false)
    }
  }, [actorEmail, email, profile, showToast])

  const clearAll = useCallback(async () => {
    if (!email) return
    try {
      setSaving(true)
      const next = {
        by: actorEmail,
        at: new Date().toISOString(),
        notes: { ...(profile?.verified?.notes || {}) },
      }
      for (const s of SECTION_META) next[s.key] = false
      await updateUserProfileFields(email, { verified: next }, actorEmail)
      showToast('Cleared all verifications.', 'success')
    } catch {
      showToast('Failed to clear all.', 'error')
    } finally {
      setSaving(false)
    }
  }, [actorEmail, email, profile?.verified?.notes, showToast])

  if (loading) {
    return (
      <Shell title="Verify Student">
        <div
          style={{ display: 'grid', placeItems: 'center', padding: '3rem 0' }}
        >
          <div className="spinner" aria-label="Loading student…" />
        </div>
      </Shell>
    )
  }

  if (!profile) {
    return (
      <Shell title="Verify Student">
        <div style={{ padding: '1.25rem' }}>
          <p>Student not found.</p>
          <button
            className="btn outline"
            onClick={() => navigate('/instructor/dashboard')}
          >
            ⬅ Back
          </button>
        </div>
      </Shell>
    )
  }

  const name = profile.name || '(no name)'
  const cdl = profile.cdlClass || '—'
  const billingMode = (profile?.billing?.mode || '—').toString()

  return (
    <Shell title="Verify Student">
      {/* Header summary + readiness */}
      <div
        className="dashboard-card"
        style={{
          padding: '1rem',
          display: 'grid',
          gap: 8,
          marginBottom: '1rem',
        }}
      >
        <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>{name}</div>
        <div style={{ color: '#666' }}>{email}</div>
        <div
          style={{ display: 'flex', gap: 16, flexWrap: 'wrap', color: '#444' }}
        >
          <span>
            <b>CDL Class:</b> {cdl}
          </span>
          <span>
            <b>Billing:</b> {billingMode}
          </span>
        </div>

        {/* Readiness bars */}
        <div
          style={{
            display: 'grid',
            gap: 10,
            gridTemplateColumns: '1fr 1fr',
            alignItems: 'center',
            marginTop: 6,
          }}
        >
          <Progress label="Enrollment" value={enrollmentPct} />
          <Progress label="BTW" value={btwPct} alt />
        </div>

        <div style={{ marginTop: 2, fontSize: '.9rem', color: '#666' }}>
          {saving ? (
            'Saving…'
          ) : verified?.by ? (
            <>
              Last verified by <b>{verified.by}</b> •{' '}
              <b>{formatDate(verified.at)}</b>
            </>
          ) : (
            '—'
          )}
        </div>

        <div
          style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}
        >
          <button className="btn outline" onClick={clearAll}>
            Clear All
          </button>
          <button className="btn" onClick={verifyAll}>
            Verify All
          </button>
          <button
            className="btn outline"
            onClick={() => navigate('/instructor/dashboard')}
          >
            ⬅ Back
          </button>
        </div>
      </div>

      {/* Verification blocks */}
      <div className="dashboard-card" style={{ padding: 0 }}>
        {SECTION_META.map(({ key, title }, idx) => {
          const status = sectionStatuses[key]
          const checked = !!verified?.[key]
          const note = verified?.notes?.[key] || ''
          const allowed = canVerify(key)

          return (
            <section
              key={key}
              style={{
                borderTop: idx ? '1px solid #eee' : 'none',
                padding: '1rem',
              }}
            >
              <SectionHeader
                title={title}
                status={status}
                verifiedBy={verified?.by}
                verifiedAt={verified?.at}
              />

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  flexWrap: 'wrap',
                  marginTop: 8,
                }}
              >
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!allowed}
                    onChange={e => updateVerified(key, e.target.checked)}
                    aria-disabled={!allowed || undefined}
                    aria-label={checked ? 'Unverify section' : 'Verify section'}
                  />
                  <span>
                    {checked ? 'Verified' : 'Mark verified'}
                    {!allowed && ' (complete required fields first)'}
                  </span>
                </label>
              </div>

              {/* Notes */}
              <div style={{ marginTop: 10 }}>
                <label
                  htmlFor={`note_${key}`}
                  style={{ display: 'block', fontWeight: 500 }}
                >
                  Internal note (optional)
                </label>
                <textarea
                  id={`note_${key}`}
                  rows={2}
                  placeholder="Add a short note for staff (not visible to students)…"
                  value={note}
                  onChange={e => updateNote(key, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #ddd',
                    borderRadius: 8,
                    fontSize: '0.95rem',
                    marginTop: 6,
                  }}
                />
                <div
                  style={{ fontSize: '.85rem', color: '#777', marginTop: 4 }}
                >
                  Autosaves as you type. Students only see the status chip.
                </div>
              </div>
            </section>
          )
        })}
        <div style={{ padding: '8px 12px', color: '#6b7280', fontSize: 12 }}>
          {saving ? 'Saving…' : 'All changes saved'}
        </div>
      </div>
    </Shell>
  )
}

/* ------------------------------ UI bits ------------------------------ */
function Progress({ label, value, alt }) {
  const bg = alt ? '#e0f2fe' : '#eef2ff'
  const fg = alt ? '#0ea5e9' : '#6366f1'
  const pct = Math.max(0, Math.min(100, Math.round(value || 0)))
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 6,
        }}
      >
        <strong>{label}</strong>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        style={{
          position: 'relative',
          height: 10,
          background: bg,
          borderRadius: 999,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            width: `${pct}%`,
            background: fg,
          }}
        />
      </div>
    </div>
  )
}

function formatDate(val) {
  if (!val) return '—'
  try {
    const d =
      typeof val === 'string'
        ? new Date(val)
        : (val?.toDate?.() ?? new Date(val))
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString()
  } catch {
    return '—'
  }
}
