//src/admin/walkthroughs/Manager/components/ManagerToolbar.jsx
import React from 'react'

export default function ManagerToolbar({ view, onBack, onCreate, onImport }) {
  const base = {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    background: '#fff',
    cursor: 'pointer',
  }
  const primary = { ...base, background: '#111827', color: '#fff', borderColor: '#111827' }
  const subtle = { color: '#6b7280' }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Walkthrough Manager</h1>
      <span style={subtle}>Admin</span>
      <div style={{ flex: 1 }} />
      {view !== 'list' ? (
        <button type="button" onClick={onBack} style={base} aria-label="Back to list">← Back</button>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => onCreate('A')} style={primary}>+ New (Class A)</button>
          <button type="button" onClick={() => onCreate('B')} style={base}>+ New (Class B)</button>
          <button type="button" onClick={() => onCreate('PASSENGER-BUS')} style={base}>+ New (Passenger Bus)</button>
          <button type="button" onClick={onImport} style={base}>Import (MD/CSV/XLSX)</button>
        </div>
      )}
    </div>
  )
}