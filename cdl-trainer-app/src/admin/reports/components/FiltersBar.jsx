// src/admin/reports/components/FiltersBar.jsx
// ======================================================================
// FiltersBar
// - Role filter + search + pluggable right-side controls
// - A11y-friendly, keyboard niceties, optional debounced search
// - Back-compat: supports UsersExport & CompaniesExport props
// - Memoized to reduce re-renders
// ======================================================================

import PropTypes from 'prop-types'
import React from 'react'
import styles from './FiltersBar.module.css'

const cx = (...c) => c.filter(Boolean).join(' ')

function FiltersBarImpl({
  roleFilter,
  setRoleFilter,
  search,
  setSearch,
  RightControls,          // preferred: a component that renders any controls you want
  UsersExport,            // back-compat: will render if provided
  CompaniesExport,        // back-compat: will render if provided
  debounceMs = 0,         // set >0 to debounce search updates
  onReset,                // optional "Reset filters" handler
  className = '',
}) {
  // local input state (supports optional debounce)
  const [localSearch, setLocalSearch] = React.useState(search || '')
  const inputRef = React.useRef(null)

  const roleId = React.useId()
  const searchId = React.useId()

  // keep local input in sync if parent changes search externally
  React.useEffect(() => { setLocalSearch(search || '') }, [search])

  // push updates upstream (debounced if requested)
  React.useEffect(() => {
    if (typeof setSearch !== 'function') return
    if (!debounceMs) {
      setSearch(localSearch)
      return
    }
    const t = setTimeout(() => setSearch(localSearch), debounceMs)
    return () => clearTimeout(t)
  }, [localSearch, debounceMs, setSearch])

  // "/" focuses search (outside of inputs); Esc (when focused) clears
  React.useEffect(() => {
    const onGlobalKey = (e) => {
      const tag = String(e.target?.tagName || '').toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === '/') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onGlobalKey)
    return () => document.removeEventListener('keydown', onGlobalKey)
  }, [])

  const clearSearch = React.useCallback(() => setLocalSearch(''), [])

  const onSearchKeyDown = React.useCallback((e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      clearSearch()
      return
    }
    if (e.key === 'Enter') {
      // flush immediately even if debounced
      setSearch?.(localSearch)
    }
  }, [clearSearch, localSearch, setSearch])

  const hasActiveFilters = Boolean((roleFilter && roleFilter !== '') || (localSearch && localSearch !== ''))

  return (
    <div className={cx(styles.controls || styles.toolbar, className)}>

      {/* Role filter */}
      <div style={{ minWidth: 280, display: 'flex', alignItems: 'center', gap: 8 }}>
        <label htmlFor={roleId} style={{ fontWeight: 700 }}>Filter by role:</label>
        <select
          id={roleId}
          className={styles.select || 'glass-select'}
          value={roleFilter}
          onChange={(e) => setRoleFilter?.(e.target.value)}
          aria-label="Filter users by role"
        >
          <option value="">All</option>
          <option value="student">Student</option>
          <option value="instructor">Instructor</option>
          <option value="admin">Admin</option>
        </select>

        {typeof onReset === 'function' && (
          <button
            type="button"
            className={styles.fadedBtn || 'btn btn-ghost'}
            onClick={onReset}
            title="Reset filters"
            aria-label="Reset filters"
            disabled={!hasActiveFilters}
          >
            Reset
          </button>
        )}
      </div>

      {/* Right-side controls */}
      <div style={{ display: 'flex', gap: 8, marginLeft: 8 }}>
        {RightControls
          ? <RightControls />
          : (
            <>
              {UsersExport ? <UsersExport /> : null}
              {CompaniesExport ? <CompaniesExport /> : null}
            </>
          )}
      </div>

      {/* Search (align right) */}
      <div className={styles.searchWrap || ''} style={{ marginLeft: 'auto', position: 'relative', minWidth: 260, maxWidth: 360 }}>
        <label htmlFor={searchId} className={styles.srOnly || ''}>Search users/companies</label>
        <input
          ref={inputRef}
          id={searchId}
          type="text"
          className={styles.input || ''}
          placeholder="Search users/companies… ( / )"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          onKeyDown={onSearchKeyDown}
          spellCheck={false}
          autoComplete="off"
          aria-label="Search users and companies"
          aria-keyshortcuts="/"
        />
        {/* leading icon (if the CSS provides .searchIcon it will place nicely) */}
        <span aria-hidden className={styles.searchIcon || ''}>🔎</span>

        {/* clear button */}
        {localSearch && (
          <button
            type="button"
            onClick={clearSearch}
            aria-label="Clear search"
            title="Clear"
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              border: 0,
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 16,
              opacity: .75,
            }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}

const FiltersBar = React.memo(FiltersBarImpl)
export default FiltersBar

FiltersBar.propTypes = {
  roleFilter: PropTypes.string.isRequired,
  setRoleFilter: PropTypes.func.isRequired,
  search: PropTypes.string.isRequired,
  setSearch: PropTypes.func.isRequired,

  // preferred slot for custom right-side controls (export, bulk upload, etc.)
  RightControls: PropTypes.elementType,

  // back-compat props (will render if RightControls is not provided)
  UsersExport: PropTypes.elementType,
  CompaniesExport: PropTypes.elementType,

  debounceMs: PropTypes.number,
  onReset: PropTypes.func,
  className: PropTypes.string,
}

FiltersBar.defaultProps = {
  RightControls: undefined,
  UsersExport: undefined,
  CompaniesExport: undefined,
  debounceMs: 0,
  onReset: undefined,
  className: '',
}