// Path: src/admin/companies/components/CompanyHeader.jsx
// ============================================================================
// CompanyHeader
// - Displays school/company branding: name + optional logo
// - Fallbacks for missing data (defaults + initials avatar)
// - A11y-friendly, resilient against long names + bad logos
// - Memoized for perf
// ============================================================================

import PropTypes from 'prop-types'
import React, { memo } from 'react'

import cls from './CompanyHeader.module.css'
/**
 * @typedef {{ schoolName?: string, logoUrl?: string, primaryColor?: string }} Brand
 */

/**
 * Generate a simple initials avatar if no logo exists.
 */
function FallbackAvatar({ name = 'CDL Trainer', color = '#6c5ce7' }) {
  const initials = name
    .split(' ')
    .map(part => part.charAt(0).toUpperCase())
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
    <header className={cls.header}>
      {/* Name */}
      <span
        aria-label="School name"
        title={name}
        className={cls.name}
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
          onError={e => {
            e.currentTarget.style.display = 'none'
          }}
          className={cls.logo}
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
