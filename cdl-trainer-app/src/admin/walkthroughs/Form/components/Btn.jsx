//src/admin/walkthroughs/Form/components/Btn.jsx
import React from 'react'

export default function Btn({ children, variant = 'ghost', style, ...props }) {
  return (
    <button
      type="button"
      {...props}
      style={{
        appearance: 'none',
        borderRadius: 8,
        padding: '6px 10px',
        cursor: 'pointer',
        border: variant === 'primary' ? '1px solid var(--brand-light, #4e91ad)' : '1px solid #d0d0d0',
        background: variant === 'primary'
          ? 'color-mix(in oklab, var(--brand-light, #4e91ad), white 12%)'
          : '#fff',
        ...style,
      }}
    >
      {children}
    </button>
  )
}