// Path: src/admin/companies/components/CompanyHeader.jsx
import React from 'react'

/**
 * @typedef {{ schoolName?: string, logoUrl?: string, primaryColor?: string }} Brand
 */

/**
 * CompanyHeader
 * - Shows school name + optional logo
 * - Defensive defaults so it renders even if brand is missing
 * - Memoized to avoid unnecessary re-renders
 */
function CompanyHeader({ brand }) {
  const name = brand?.schoolName || 'CDL Trainer'
  const color = brand?.primaryColor || '#6c5ce7'
  const logoUrl = brand?.logoUrl || ''

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.1em',
      }}
    >
      <span
        aria-label="School name"
        title={name}
        style={{
          fontSize: '1.25em',
          fontWeight: 600,
          color,
          // prevent layout shift on extremely long names
          maxWidth: 560,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {name}
      </span>

      {logoUrl ? (
        <img
          src={logoUrl}
          alt={`${name} logo`}
          loading="lazy"
          decoding="async"
          style={{
            maxWidth: 100,
            height: 'auto',
            verticalAlign: 'middle',
            marginBottom: 3,
            // small polish: keep it tidy if the image comes with a huge intrinsic size
            objectFit: 'contain',
          }}
        />
      ) : null}
    </header>
  )
}

export default React.memo(CompanyHeader)