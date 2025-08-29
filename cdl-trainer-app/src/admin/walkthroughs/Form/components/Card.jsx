//src/admin/walkthroughs/Form/components/Card.jsx
import React from 'react'

export default function Card({ children, style, ...props }) {
  return (
    <div
      {...props}
      style={{
        border: '1px solid #e2e2e2',
        borderRadius: 8,
        padding: 12,
        background: 'var(--card-bg, #fff)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
