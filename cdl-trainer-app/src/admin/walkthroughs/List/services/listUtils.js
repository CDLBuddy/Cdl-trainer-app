//src/admin/walkthroughs/List/services/listUtils.js
export const fmtDate = v => {
  if (!v) return '—'
  const d = v instanceof Date ? v : new Date(v)
  return Number.isNaN(+d) ? '—' : d.toLocaleString()
}

export const statusTone = s =>
  s === 'published'
    ? 'ok'
    : s === 'in-review'
      ? 'warn'
      : s === 'archived'
        ? 'err'
        : 'neutral'

export const sourceFrom = it =>
  it.source || (it.isDefault ? 'default' : 'custom')
