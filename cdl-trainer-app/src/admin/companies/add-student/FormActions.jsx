import React from 'react'

/**
 * FormActions — footer actions for the Add Student drawer.
 *
 * Props:
 * - saving: boolean
 * - canSave: boolean
 * - error?: string
 * - onCancel: () => void
 * - onSubmit: (e?: React.FormEvent | React.MouseEvent) => void
 * - formId?: string   // optional: if your inputs live in a <form id="...">
 */
export default function FormActions({ saving, canSave, error, onCancel, onSubmit, formId }) {
  return (
    <footer
      style={{
        padding: 12,
        borderTop: '1px solid #eef0f4',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        justifyContent: 'flex-end',
      }}
    >
      {/* Left side: error message (if any) */}
      {error ? (
        <div
          role="alert"
          style={{
            marginRight: 'auto',
            color: '#b91c1c',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            padding: '6px 10px',
            borderRadius: 8,
            fontSize: '.95rem',
          }}
        >
          {error}
        </div>
      ) : (
        <div style={{ marginRight: 'auto' }} />
      )}

      {/* Actions */}
      <button type="button" className="btn outline" onClick={onCancel}>
        Cancel
      </button>

      {/* If you pass formId, this becomes a semantic submit for that form. */}
      <button
        type={formId ? 'submit' : 'button'}
        form={formId || undefined}
        className="btn"
        disabled={saving || !canSave}
        onClick={formId ? undefined : onSubmit}
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
    </footer>
  )
}