// Path: src/admin/companies/components/CompanyHeader.jsx
// ============================================================================
// CompanyHeader
// - Displays school/company branding: name + optional logo
// - Fallbacks for missing data (defaults + initials avatar)
// - A11y-friendly, resilient against long names + bad logos
// - Memoized for perf
// ============================================================================

import React, { memo } from 'react'
import PropTypes from 'prop-types'

/**
 * @typedef {{ schoolName?: string, logoUrl?: string, primaryColor?: string }} Brand
 */

/**
 * Generate a simple initials avatar if no logo exists.
 */
function FallbackAvatar({ name = 'CDL Trainer', color = '#6c5ce7' }) {
  const initials = name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')

  return (
    <div
      aria-label={`${name} initials`}
      role="img"
      style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        backgroundColor: color,
        color: '#fff',
        fontWeight: 600,
        fontSize: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
      }}
    >
      {initials}
    </div>
  )
}

function CompanyHeader({ brand }) {
  const name = brand?.schoolName?.trim() || 'CDL Trainer'
  const color = brand?.primaryColor || '#6c5ce7'
  const logoUrl = brand?.logoUrl?.trim() || ''

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.1em',
        gap: 12,
      }}
    >
      {/* Name */}
      <span
        aria-label="School name"
        title={name}
        style={{
          fontSize: '1.25em',
          fontWeight: 600,
          color,
          maxWidth: 560,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {name}
      </span>

      {/* Logo or fallback avatar */}
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={`${name} logo`}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
          style={{
            maxWidth: 100,
            maxHeight: 48,
            height: 'auto',
            verticalAlign: 'middle',
            marginBottom: 3,
            objectFit: 'contain',
          }}
        />
      ) : (
        <FallbackAvatar name={name} color={color} />
      )}
    </header>
  )
}

CompanyHeader.propTypes = {
  brand: PropTypes.shape({
    schoolName: PropTypes.string,
    logoUrl: PropTypes.string,
    primaryColor: PropTypes.string,
  }),
}

export default memo(CompanyHeader)