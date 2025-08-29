// Path: /src/admin/companies/company-detail/components/SortableTH.jsx
import PropTypes from 'prop-types'
import React, { memo } from 'react'

import styles from './SortableTH.module.css'

function SortableTH({
  label,
  active = false,
  dir = 'asc',
  onClick,
  asStatic = false,
  title,
}) {
  if (asStatic) return <th scope="col">{label}</th>

  const ariaSort = active
    ? dir === 'asc'
      ? 'ascending'
      : 'descending'
    : 'none'
  const nextDir = active ? (dir === 'asc' ? 'desc' : 'asc') : 'asc'
  const ariaLabel = `Sort by ${label}. ${active ? `Currently ${dir}ending; activate to sort ${nextDir}ending.` : 'Activate to sort ascending.'}`

  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={`${styles.sortable} ${active ? styles.activeTh : ''}`}
      title={title}
    >
      <button
        type="button"
        className={styles.btn}
        onClick={onClick}
        aria-label={ariaLabel}
      >
        <span className={styles.label}>{label}</span>
        <span
          className={`${styles.caret} ${active ? styles.caretActive : styles.caretDim}`}
          data-dir={dir}
          aria-hidden="true"
        />
      </button>
    </th>
  )
}

SortableTH.propTypes = {
  label: PropTypes.string.isRequired,
  active: PropTypes.bool,
  dir: PropTypes.oneOf(['asc', 'desc']),
  onClick: PropTypes.func,
  asStatic: PropTypes.bool,
  title: PropTypes.string,
}

export default memo(SortableTH)
