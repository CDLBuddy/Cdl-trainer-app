// Path: src/admin/dashboard/components/AdminSections.jsx
import React, { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Small reusable card that makes the entire surface clickable (and keyboard-accessible).
 */
function CardLink({ emoji, title, description, to, cta = 'Open', badge, disabled = false }) {
  const navigate = useNavigate()
  const go = useCallback(() => {
    if (!disabled && to) navigate(to)
  }, [disabled, navigate, to])

  return (
    <article
      className="dashboard-card"
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled ? 'true' : 'false'}
      onClick={go}
      onKeyDown={(e) => {
        if (disabled) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          go()
        }
      }}
      style={{
        cursor: disabled ? 'not-allowed' : 'pointer',
        outline: 'none',
        display: 'grid',
        gap: 8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>
          <span aria-hidden style={{ marginRight: 6 }}>{emoji}</span>
          {title}
        </h3>
        {badge && (
          <span
            aria-label={typeof badge === 'string' ? badge : 'badge'}
            style={{
              fontSize: 12,
              padding: '2px 8px',
              borderRadius: 999,
              background: '#eef2ff',
              color: '#3730a3',
              alignSelf: 'center',
            }}
          >
            {badge}
          </span>
        )}
      </div>

      <p style={{ margin: 0, color: '#6b7280' }}>{description}</p>

      <div style={{ marginTop: 6 }}>
        <button
          type="button"
          className={`btn wide ${disabled ? 'outline' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            go()
          }}
          disabled={disabled}
          aria-label={`${cta}: ${title}`}
        >
          {cta}
        </button>
      </div>
    </article>
  )
}

export default function AdminSections() {
  return (
    <div className="u-grid u-grid-2 u-gap-16" style={{ marginTop: 16 }}>
      <CardLink
        emoji="🏢"
        title="Manage Companies"
        description="Create, edit, and view all companies that send students to your school."
        to="/admin/companies"
        cta="Open Companies Page"
      />

      <CardLink
        emoji="💳"
        title="Billing"
        description="Review employer invoices and individual payments, reconcile, and export CSVs."
        to="/admin/billing"
        cta="Open Billing"
      />

      <CardLink
        emoji="📝"
        title="Reports & Batch Messaging"
        description="Download user data, filter for missing docs, and message students or instructors in bulk."
        to="/admin/reports"
        cta="Open Reports Page"
        badge="Coming soon"
      />
    </div>
  )
}