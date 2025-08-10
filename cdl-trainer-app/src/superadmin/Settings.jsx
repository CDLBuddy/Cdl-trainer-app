import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  serverTimestamp,
  addDoc,
  orderBy,
  query,
} from 'firebase/firestore'
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { showToast } from '@components/ToastContext' // <- global toast, styled to your theme
import { getUserRole } from '@utils/auth.js' // <- same helper used elsewhere
import { db } from '@utils/firebase.js' // <- adjust if needed

/* ============================================================================
   Utilities (Firestore CRUD)
   ========================================================================== */
async function getAllSchools() {
  const snap = await getDocs(query(collection(db, 'schools'), orderBy('name')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
async function getGlobalSettings() {
  const snap = await getDoc(doc(db, 'settings', 'global'))
  return snap.exists() ? snap.data() : {}
}
async function getSchoolSettings(schoolId) {
  const snap = await getDoc(doc(db, 'schools', schoolId))
  return snap.exists() && snap.data().settings ? snap.data().settings : {}
}
async function logSettingsChange(target, newSettings) {
  await addDoc(collection(db, 'settingsLogs'), {
    target, // "global" or schoolId or "apiKey"
    newSettings,
    changedBy: localStorage.getItem('currentUserEmail') || 'superadmin',
    changedAt: serverTimestamp(),
  })
}
async function saveSettings(scope, settings, schoolId = null) {
  if (scope === 'global') {
    await setDoc(doc(db, 'settings', 'global'), settings, { merge: true })
    await logSettingsChange('global', settings)
  } else if (scope === 'school' && schoolId) {
    await updateDoc(doc(db, 'schools', schoolId), { settings })
    await logSettingsChange(schoolId, settings)
  }
}
async function getApiKeys() {
  const snap = await getDocs(
    query(collection(db, 'apiKeys'), orderBy('createdAt', 'desc'))
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
async function createApiKey(label, schoolId = null) {
  // crypto.randomUUID is available in modern browsers
  const key = crypto.randomUUID()
  const payload = {
    key,
    label,
    schoolId: schoolId || null,
    createdAt: serverTimestamp(),
    active: true,
    createdBy: localStorage.getItem('currentUserEmail') || 'superadmin',
  }
  await addDoc(collection(db, 'apiKeys'), payload)
  await logSettingsChange('apiKey', {
    action: 'created',
    label,
    schoolId: schoolId || null,
  })
  return key
}
async function revokeApiKey(keyId) {
  await updateDoc(doc(db, 'apiKeys', keyId), {
    active: false,
    revokedAt: serverTimestamp(),
  })
  await logSettingsChange('apiKey', { keyId, action: 'revoked' })
}

/* ============================================================================
   Small UI helpers
   ========================================================================== */
function Section({ title, children, defaultOpen = true }) {
  return (
    <details open={defaultOpen} className="settings-section">
      <summary className="section-title">
        <strong>{title}</strong>
      </summary>
      <div className="section-body">{children}</div>
    </details>
  )
}

function KeyRow({ item, schoolName, onRevoke, disabled }) {
  return (
    <li className="api-key-row">
      <span className="api-key-value">{item.key}</span>
      {item.label ? (
        <span className="api-key-label">-- {item.label}</span>
      ) : null}
      {item.schoolId ? (
        <span className="api-key-school">
          {' '}
          -- for {schoolName ?? item.schoolId}
        </span>
      ) : (
        <span className="api-key-scope"> -- platform-wide</span>
      )}
      {!item.active && <span className="api-key-revoked">(Revoked)</span>}
      <button
        className="btn outline"
        onClick={() => onRevoke(item.id)}
        disabled={!item.active || disabled}
        title={!item.active ? 'Already revoked' : 'Revoke key'}
        style={{ marginLeft: 8 }}
      >
        Revoke
      </button>
      <button
        className="btn outline"
        onClick={() =>
          navigator.clipboard.writeText(item.key).then(
            () => showToast('API key copied to clipboard!', 1600, 'success'),
            () => showToast('Failed to copy.', 1600, 'error')
          )
        }
        style={{ marginLeft: 8 }}
      >
        Copy
      </button>
    </li>
  )
}

/* ============================================================================
   Form Blocks
   ========================================================================== */
function SettingsForm({
  id,
  initial,
  scope,
  onSubmit,
  onResetToDefault,
  includeReset = false,
}) {
  const [form, setForm] = useState(() => ({
    logoUrl: initial?.logoUrl || '',
    brandColor: initial?.brandColor || '#b48aff',
    minPassingScore: Number.isFinite(initial?.minPassingScore)
      ? Number(initial.minPassingScore)
      : 80,
    requireTraffickingVideo: !!initial?.requireTraffickingVideo,
    certificateFooter: initial?.certificateFooter || '',
  }))

  useEffect(() => {
    setForm({
      logoUrl: initial?.logoUrl || '',
      brandColor: initial?.brandColor || '#b48aff',
      minPassingScore: Number.isFinite(initial?.minPassingScore)
        ? Number(initial.minPassingScore)
        : 80,
      requireTraffickingVideo: !!initial?.requireTraffickingVideo,
      certificateFooter: initial?.certificateFooter || '',
    })
  }, [initial])

  function handleChange(e) {
    const { name, type, value, checked } = e.target
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    // basic guardrails
    const score = Number(form.minPassingScore)
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      showToast(
        'Minimum Passing Score must be between 0 and 100.',
        2500,
        'error'
      )
      return
    }
    onSubmit({
      logoUrl: form.logoUrl.trim(),
      brandColor: form.brandColor,
      minPassingScore: score,
      requireTraffickingVideo: !!form.requireTraffickingVideo,
      certificateFooter: form.certificateFooter.trim(),
    })
  }

  return (
    <form id={id} className="settings-form" onSubmit={handleSubmit}>
      <label>
        Platform Logo URL:
        <input
          name="logoUrl"
          type="text"
          value={form.logoUrl}
          onChange={handleChange}
        />
      </label>
      <label>
        Primary Brand Color:
        <input
          name="brandColor"
          type="color"
          value={form.brandColor}
          onChange={handleChange}
        />
      </label>
      <label>
        Minimum Passing Score (%):
        <input
          name="minPassingScore"
          type="number"
          min="0"
          max="100"
          value={form.minPassingScore}
          onChange={handleChange}
        />
      </label>
      <label className="checkbox-row">
        <input
          name="requireTraffickingVideo"
          type="checkbox"
          checked={form.requireTraffickingVideo}
          onChange={handleChange}
        />
        Require Human Trafficking Video (Indiana)
      </label>
      <label>
        Custom Certificate Footer:
        <input
          name="certificateFooter"
          type="text"
          value={form.certificateFooter}
          onChange={handleChange}
        />
      </label>

      {/* Tiny theme preview bubble */}
      <div className="theme-preview">
        <span className="dot" style={{ background: form.brandColor }} />
        <span>Theme Preview</span>
      </div>

      <div className="form-actions">
        <button className="btn primary" type="submit">
          Save {scope === 'global' ? 'Global' : 'School'} Settings
        </button>
        {includeReset && (
          <button
            type="button"
            className="btn outline"
            onClick={onResetToDefault}
            title="Clear overrides and fall back to global defaults"
          >
            Reset to Default
          </button>
        )}
      </div>
    </form>
  )
}

/* ============================================================================
   Main Component
   ========================================================================== */
export default function Settings() {
  const navigate = useNavigate()

  // Role guard
  useEffect(() => {
    const role = getUserRole?.() || localStorage.getItem('userRole') || ''
    if (role !== 'superadmin') {
      showToast('Access denied: Super Admins only.')
      navigate('/login')
    }
  }, [navigate])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [globalSettings, setGlobalSettings] = useState({})
  const [schools, setSchools] = useState([])
  const [apiKeys, setApiKeys] = useState([])
  const [logs, setLogs] = useState([])

  const [selectedSchoolId, setSelectedSchoolId] = useState('')
  const [schoolSettings, setSchoolSettings] = useState({})

  // Load initial data
  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const [gs, scs, keys, logsSnap] = await Promise.all([
          getGlobalSettings(),
          getAllSchools(),
          getApiKeys(),
          getDocs(
            query(collection(db, 'settingsLogs'), orderBy('changedAt', 'desc'))
          ),
        ])
        if (!mounted) return
        setGlobalSettings(gs || {})
        setSchools(scs || [])
        setApiKeys(keys || [])
        setLogs(
          logsSnap.docs.map(d => {
            const data = d.data()
            const ts = data.changedAt?.toDate?.() || null
            return { id: d.id, ...data, changedAtDate: ts }
          })
        )
      } catch {
        showToast('Failed to load settings.', 3200, 'error')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  // Handlers: Global settings
  async function handleSaveGlobalSettings(values) {
    try {
      setSaving(true)
      await saveSettings('global', values)
      setGlobalSettings(values)
      showToast('Global settings updated!', 2000, 'success')
    } catch {
      showToast('Failed to save global settings.', 2600, 'error')
    } finally {
      setSaving(false)
    }
  }

  // Handlers: School selection + save/reset
  async function handleSchoolChange(e) {
    const id = e.target.value
    setSelectedSchoolId(id)
    setSchoolSettings({})
    if (!id) return
    try {
      setSaving(true)
      const s = await getSchoolSettings(id)
      setSchoolSettings(s || {})
    } catch {
      showToast('Failed to load school overrides.', 2400, 'error')
    } finally {
      setSaving(false)
    }
  }
  async function handleSaveSchoolSettings(values) {
    if (!selectedSchoolId) return
    try {
      setSaving(true)
      await saveSettings('school', values, selectedSchoolId)
      setSchoolSettings(values)
      showToast('School overrides saved!', 2000, 'success')
    } catch {
      showToast('Failed to save school overrides.', 2400, 'error')
    } finally {
      setSaving(false)
    }
  }
  async function handleResetSchoolSettings() {
    if (!selectedSchoolId) return
    try {
      setSaving(true)
      await saveSettings('school', {}, selectedSchoolId) // clear overrides
      setSchoolSettings({})
      showToast('School settings reset to default.', 2000, 'success')
    } catch {
      showToast('Failed to reset school settings.', 2400, 'error')
    } finally {
      setSaving(false)
    }
  }

  // Handlers: API keys
  async function handleCreateApiKey(e) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const label = (fd.get('label') || '').toString().trim()
    const schoolId = (fd.get('schoolId') || '').toString().trim() || null
    if (!label) {
      showToast('Please enter a label for the key.', 2000, 'error')
      return
    }
    try {
      setSaving(true)
      const newKeyValue = await createApiKey(label, schoolId || null)
      const updated = await getApiKeys()
      setApiKeys(updated)
      await navigator.clipboard.writeText(newKeyValue).catch(() => {})
      showToast('API Key generated and copied!', 2400, 'success')
      e.currentTarget.reset()
    } catch {
      showToast('Failed to generate API key.', 2400, 'error')
    } finally {
      setSaving(false)
    }
  }
  async function handleRevokeApiKey(id) {
    try {
      setSaving(true)
      await revokeApiKey(id)
      setApiKeys(await getApiKeys())
      showToast('API key revoked.', 2000, 'success')
    } catch {
      showToast('Failed to revoke key.', 2400, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="screen-wrapper centered-page">
        <div className="loading-spinner" />
        <p>Loading settings…</p>
      </div>
    )
  }

  return (
    <div
      className="screen-wrapper fade-in"
      style={{ maxWidth: 820, margin: '0 auto', padding: 20 }}
    >
      <h2 className="dash-head">
        ⚙️ Super Admin: Settings & Overrides
        {saving ? (
          <span style={{ marginLeft: 10, fontSize: '.8em', opacity: 0.8 }}>
            Saving…
          </span>
        ) : null}
      </h2>

      {/* GLOBAL SETTINGS */}
      <Section title="Global Platform Settings" defaultOpen>
        <SettingsForm
          id="global-settings-form"
          initial={globalSettings}
          scope="global"
          onSubmit={handleSaveGlobalSettings}
        />
      </Section>

      {/* SCHOOL OVERRIDES */}
      <Section title="School-Specific Overrides" defaultOpen={false}>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Choose School:
          <select
            id="school-select"
            value={selectedSchoolId}
            onChange={handleSchoolChange}
            style={{ marginLeft: 8 }}
          >
            <option value="">-- Select a school --</option>
            {schools.map(s => (
              <option key={s.id} value={s.id}>
                {s.name || s.id}
              </option>
            ))}
          </select>
        </label>

        {selectedSchoolId ? (
          <SettingsForm
            id="school-settings-form"
            initial={schoolSettings}
            scope="school"
            onSubmit={handleSaveSchoolSettings}
            onResetToDefault={handleResetSchoolSettings}
            includeReset
          />
        ) : (
          <div style={{ color: '#aaa', fontSize: '.95em' }}>
            Select a school to view or edit overrides.
          </div>
        )}
      </Section>

      {/* API KEYS */}
      <Section title="API Key Management" defaultOpen={false}>
        <form
          id="api-key-form"
          onSubmit={handleCreateApiKey}
          style={{
            marginBottom: '1em',
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <input
            name="label"
            type="text"
            placeholder="Label (e.g. 'TPR Integration')"
            required
            style={{ minWidth: 220 }}
          />
          <select name="schoolId">
            <option value="">Platform-wide Key</option>
            {schools.map(s => (
              <option key={s.id} value={s.id}>
                {s.name || s.id}
              </option>
            ))}
          </select>
          <button className="btn" type="submit">
            Generate API Key
          </button>
        </form>

        <div>
          <strong>Active API Keys:</strong>
          <ul className="api-key-list">
            {apiKeys.length === 0 ? (
              <li>No API keys issued yet.</li>
            ) : (
              apiKeys.map(k => (
                <KeyRow
                  key={k.id}
                  item={k}
                  schoolName={
                    k.schoolId
                      ? schools.find(s => s.id === k.schoolId)?.name
                      : undefined
                  }
                  onRevoke={handleRevokeApiKey}
                  disabled={saving}
                />
              ))
            )}
          </ul>
        </div>
      </Section>

      {/* SETTINGS LOGS */}
      <Section title="Settings Change Log" defaultOpen={false}>
        <div
          id="settings-log-list"
          style={{
            maxHeight: 160,
            overflow: 'auto',
            fontSize: '0.97em',
            background: 'rgba(240,240,255,0.11)',
            padding: '8px 14px',
            borderRadius: 7,
          }}
        >
          {logs.length === 0 ? (
            <div>(No changes yet.)</div>
          ) : (
            logs.map(l => (
              <div key={l.id} style={{ marginBottom: 6 }}>
                [{l.changedAtDate ? l.changedAtDate.toLocaleString() : '-'}]{' '}
                <strong>{l.changedBy || ''}</strong> →{' '}
                <code style={{ fontSize: '.92em' }}>{l.target}</code>:{' '}
                <span style={{ fontSize: '.95em', color: '#cfe' }}>
                  {(() => {
                    try {
                      return JSON.stringify(l.newSettings)
                    } catch {
                      return String(l.newSettings)
                    }
                  })()}
                </span>
              </div>
            ))
          )}
        </div>
      </Section>

      <button
        className="btn outline"
        style={{ marginTop: '1.6rem' }}
        onClick={() => navigate('/superadmin')}
      >
        ⬅ Dashboard
      </button>
    </div>
  )
}
