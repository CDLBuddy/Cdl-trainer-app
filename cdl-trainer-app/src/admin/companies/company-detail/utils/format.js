//src/admin/companies/company-detail/utils/format.js
// Percent clamp/round
export const pct = (n) => Math.max(0, Math.min(100, Math.round(Number.isFinite(n) ? n : 0)))

// Billing mode → label
export const fmtBilling = (mode) => {
  const m = String(mode || '').toLowerCase()
  return m === 'employer' ? 'Employer' : m === 'individual' ? 'Individual' : '—'
}

// Stable dates
const dateFmt = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: '2-digit' })
export function toDate(v) {
  try {
    if (!v) return null
    if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v
    if (typeof v?.toDate === 'function') {
      const d = v.toDate()
      return Number.isNaN(d.getTime()) ? null : d
    }
    const d = new Date(v)
    return Number.isNaN(d.getTime()) ? null : d
  } catch { return null }
}
export const fmtDate = (v) => {
  const d = toDate(v)
  return d ? dateFmt.format(d) : ''
}

// Visually-hidden style (shared)
export const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
}