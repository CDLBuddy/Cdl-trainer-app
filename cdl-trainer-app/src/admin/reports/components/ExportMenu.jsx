// src/admin/reports/components/ExportMenu.jsx
// ======================================================================
// ExportMenu
// - Compact, accessible menu for exporting Users/Company rosters
// - Lazy-loads ../services/exporters.js only when used (smaller route)
// - Keyboard: ↑/↓/Home/End to navigate, Enter to select, Esc to close,
//   ',' (comma) quick-exports CSV
// - Falls back to tiny local CSV/JSON exporters if service import fails
// - Matches your dashboard theme (via component CSS module)
// ======================================================================

import React from 'react'
import styles from './ExportMenu.module.css'

// -------- tiny local fallbacks (only used if services/exporters fails) -----
function csvEscape(val) {
  const s = String(val ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
function localCSV(rows) {
  if (!rows?.length) return ''
  const headers = Object.keys(rows[0])
  const lines = [headers.join(',')]
  for (const r of rows) {
    lines.push(headers.map(h => csvEscape(r[h])).join(','))
  }
  return lines.join('\n')
}
function downloadBlob(filename, data, type) {
  const blob = new Blob([data], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function ExportMenu({
  users = [],
  company = null,
  disabled = false,
  onExport,            // (type, { rows, company, filename }) => void
  className = '',
  fileBase = 'users',  // filename base; auto-suffixed with -YYYY-MM-DD
}) {
  const [open, setOpen] = React.useState(false)
  const wrapRef = React.useRef(null)
  const btnRef = React.useRef(null)
  const menuRef = React.useRef(null)
  const itemRefs = React.useRef([])

  const rows = React.useMemo(() => (Array.isArray(users) ? users : []), [users])
  const dateStamp = React.useMemo(() => new Date().toISOString().slice(0, 10), [])
  const companyPart = company?.id || company?.name ? `-${String(company.id || company.name).replace(/\s+/g, '-')}` : ''
  const base = `${fileBase}${companyPart}-${dateStamp}`

  // Normalize subset for consistent exports (matches UsersTable columns)
  const compactRows = React.useMemo(() => {
    const safe = (v) => (v == null ? '' : String(v).trim())
    const fmtDate = (v) => {
      if (!v) return ''
      try {
        const dt = new Date(v)
        if (!Number.isFinite(dt.getTime())) return ''
        return dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' })
      } catch { return '' }
    }
    const pct = (v) => {
      const n = Number(v); if (!Number.isFinite(n)) return ''
      return Math.max(0, Math.min(100, Math.round(n)))
    }
    return rows.map((u) => ({
      name: safe(u?.name || u?.fullName || u?.displayName),
      email: safe(u?.email),
      role: safe((u?.role || '').toLowerCase()),
      company: safe(u?.assignedCompany || u?.company),
      permitExpiry: fmtDate(u?.permitExpiry),
      profilePercent: pct(u?.profileProgress),
    }))
  }, [rows])

  const menuId = React.useId()

  // Close on outside click / ESC
  React.useEffect(() => {
    if (!open) return
    const onDocClick = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false)
    }
    const onEsc = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        btnRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  // Focus first menu item when opened
  React.useEffect(() => {
    if (!open) return
    requestAnimationFrame(() => {
      itemRefs.current[0]?.focus?.()
    })
  }, [open])

  // Prefetch exporters when user shows intent
  const prefetchExporters = React.useCallback(() => {
    import('../services/exporters.js').catch(() => {})
  }, [])

  async function handleExport(type) {
    if (typeof onExport === 'function') {
      onExport(type, { rows: compactRows, company, filename: base })
      setOpen(false)
      return
    }

    try {
      let svc = null
      try {
        svc = await import('../services/exporters.js')
      } catch {
        svc = null
      }

      switch (type) {
        case 'csv': {
          if (svc?.toCSV) svc.toCSV(compactRows, `${base}.csv`)
          else downloadBlob(`${base}.csv`, localCSV(compactRows), 'text/csv;charset=utf-8')
          break
        }
        case 'json': {
          if (svc?.toJSON) svc.toJSON(compactRows, `${base}.json`)
          else downloadBlob(`${base}.json`, JSON.stringify(compactRows, null, 2), 'application/json;charset=utf-8')
          break
        }
        case 'pdf': {
          openPrintableTable(compactRows, {
            title: company?.name ? `Roster — ${company.name}` : 'Users Export',
            subtitle: `Generated ${new Date().toLocaleString()}`,
          })
          break
        }
        default:
          break
      }
    } finally {
      setOpen(false)
    }
  }

  // Keyboard navigation inside the menu
  const onMenuKeyDown = (e) => {
    const items = itemRefs.current.filter(Boolean)
    if (!items.length) return
    const i = items.indexOf(document.activeElement)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      items[(i + 1) % items.length].focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      items[(i - 1 + items.length) % items.length].focus()
    } else if (e.key === 'Home') {
      e.preventDefault(); items[0].focus()
    } else if (e.key === 'End') {
      e.preventDefault(); items[items.length - 1].focus()
    } else if (e.key === ',' && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault(); handleExport('csv')
    } else if (e.key === 'Enter' && i >= 0) {
      e.preventDefault(); items[i].click()
    }
  }

  return (
    <div
      ref={wrapRef}
      className={`${styles.wrap} ${className}`}
      onMouseEnter={prefetchExporters}
      onFocus={prefetchExporters}
    >
      <button
        ref={btnRef}
        type="button"
        className={`btn ${styles.trigger}`}
        disabled={disabled || compactRows.length === 0}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        title={compactRows.length ? 'Export options' : 'Nothing to export'}
      >
        ⭳ Export
        <span className={styles.caret} aria-hidden>▾</span>
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className={styles.menu}
          aria-label="Export options"
          ref={menuRef}
          onKeyDown={onMenuKeyDown}
        >
          <button
            ref={(el) => (itemRefs.current[0] = el)}
            role="menuitem"
            type="button"
            className={styles.item}
            onClick={() => handleExport('csv')}
          >
            Export CSV
            <kbd className={styles.kbd}>,</kbd>
          </button>
          <button
            ref={(el) => (itemRefs.current[1] = el)}
            role="menuitem"
            type="button"
            className={styles.item}
            onClick={() => handleExport('json')}
          >
            Export JSON
          </button>
          <button
            ref={(el) => (itemRefs.current[2] = el)}
            role="menuitem"
            type="button"
            className={styles.item}
            onClick={() => handleExport('pdf')}
          >
            Print / Save PDF
            <span className={styles.meta}>opens a new tab</span>
          </button>
        </div>
      )}
    </div>
  )
}

/* ----------------- internals ----------------- */

function openPrintableTable(rows, { title = 'Users Export', subtitle = '' } = {}) {
  if (typeof window === 'undefined') return
  const cols = ['name', 'email', 'role', 'company', 'permitExpiry', 'profilePercent']
  const labels = {
    name: 'Name',
    email: 'Email',
    role: 'Role',
    company: 'Company',
    permitExpiry: 'Permit Expiry',
    profilePercent: 'Profile %',
  }

  const escape = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[c]))

  const rowsHtml = rows.map(r => `
    <tr>
      ${cols.map(c => `<td>${escape(r[c] ?? '')}</td>`).join('')}
    </tr>
  `).join('')

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>${escape(title)}</title>
<style>
  :root { --ink:#111; --muted:#666; --border:#e5e5e5; --brand:#0b6aa2; }
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color:var(--ink); margin:0; }
  .wrap { width: 8.5in; margin: 0 auto; padding: .8in; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .sub { color: var(--muted); margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid var(--border); padding: 8px 10px; text-align: left; font-size: 12px; }
  thead th { background: #f7fafc; }
  tfoot { font-size: 12px; color: var(--muted); }
  .no-print { margin-top: 12px; }
  @media print { .no-print { display:none } }
</style>
</head>
<body>
  <div class="wrap">
    <h1>${escape(title)}</h1>
    <div class="sub">${escape(subtitle)}</div>
    <table>
      <thead>
        <tr>${cols.map(c => `<th>${labels[c]}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${rowsHtml || '<tr><td colspan="6">No data</td></tr>'}
      </tbody>
    </table>
    <div class="no-print">
      <button onclick="window.print()" style="margin-top:12px;padding:8px 12px;border:1px solid #ccc;border-radius:8px;background:#fff;cursor:pointer">Print / Save as PDF</button>
    </div>
    <footer class="sub" style="margin-top: 10px">Generated ${new Date().toLocaleString()}</footer>
  </div>
</body>
</html>`
  const w = window.open('', '_blank')
  if (!w) return
  w.document.open()
  w.document.write(html)
  w.document.close()
  try { w.focus() } catch {}
}