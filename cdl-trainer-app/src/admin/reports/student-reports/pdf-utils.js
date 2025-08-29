// src/admin/reports/student-reports/pdf-utils.js
// ======================================================================
// Lightweight utils for printing/downloading without extra deps
// - openPrintableCert(cert): opens a printable window (user can Save as PDF)
// - csvFromCert(cert, opts?): builds CSV text from a single cert (with BOM)
// - downloadCsv(rowsOrCsv, filename, headers?): triggers a CSV download
// - copy(text): clipboard helper with safe fallbacks
// ======================================================================

import { buildTprCsvRow, toCsv, toISODate } from './cert-template.js'

/* --------------------------------- Helpers -------------------------------- */

const hasWindow = typeof window !== 'undefined'
const BOM = '\uFEFF' // Excel-friendly

const esc = v =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const fmtHours = n => {
  const x = Number(n)
  return Number.isFinite(x) ? x.toFixed(1) : '0.0'
}

// Get a stable header order from the CSV row literal (keeps buildTprCsvRow order)
const getHeaders = row => Object.keys(row || {})

/** Build CSV text (with BOM) from a single cert, using stable headers. */
export function csvFromCert(cert, { addBOM = true, headers } = {}) {
  const row = buildTprCsvRow(cert || {})
  const hdrs =
    Array.isArray(headers) && headers.length ? headers : getHeaders(row)
  const csv = toCsv([row], hdrs)
  return addBOM ? BOM + csv : csv
}

function buildPrintableHTML(cert = {}) {
  const r = cert || {}
  const p = r.provider || {}
  const t = r.training || {}
  const u = r.trainee || {}

  const theoryCompletedAt =
    t.theory && t.theory.completedAt ? toISODate(t.theory.completedAt) : ''
  const btwCompletedAt =
    t.btw && t.btw.completedAt ? toISODate(t.btw.completedAt) : ''

  // Build one CSV row + headers once so the table AND the download use the same order
  const csvRow = buildTprCsvRow(r)
  const headers = getHeaders(csvRow)

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>ELDT Completion Certificate</title>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <style>
    :root {
      --ink:#111; --muted:#666; --border:#e5e5e5; --brand: var(--brand-light, #0b6aa2); --surface:#fff;
    }
    @media (prefers-color-scheme: dark) {
      :root { --ink:#f5f7fa; --muted:#aab3be; --border:#334155; --surface:#0b1117; }
    }
    * { box-sizing: border-box; }
    html,body { height: 100%; }
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color:var(--ink); background: var(--surface); margin:0; }
    .sheet { width: 8.5in; margin: 0 auto; padding: 1in; }
    h1 { font-size: 22px; letter-spacing: .4px; margin: 0 0 8px; }
    h2 { font-size: 14px; color: var(--muted); margin: 0 0 16px; font-weight: 600; }
    .box { border:1px solid var(--border); border-radius:10px; padding:16px; margin:12px 0; }
    .grid { display:grid; grid-template-columns: 1fr 1fr; gap:12px 20px; }
    .label { color: var(--muted); font-size:12px; }
    .value { font-weight:600; }
    footer { margin-top: 24px; font-size: 11px; color: var(--muted);}
    .badge { display:inline-block; padding:2px 8px; border-radius:999px; background:#eef6fb; color:#0b6aa2; font-weight:700; font-size:11px; }
    @media (prefers-color-scheme: dark) { .badge { background:#0f172a; color:#9bd2ee; } }
    .brand { color: var(--brand); }
    .no-print { margin-top:16px }
    .btn { padding:8px 12px; border-radius:8px; border:1px solid var(--border); background:#fff; cursor:pointer; font-weight:600; }
    .btn-primary { background: var(--brand); color: #fff; border-color: rgba(255,255,255,.2); }
    @media print { .no-print { display: none; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    table.meta { width:100%; border-collapse: collapse; margin-top: 8px; }
    table.meta th, table.meta td { border: 1px solid var(--border); padding: 8px 10px; text-align: left; font-size: 12px; }
    table.meta th { width: 38%; background: #f7fafc; }
    @media (prefers-color-scheme: dark) { table.meta th { background:#0f172a; } }
  </style>
</head>
<body>
  <div class="sheet" role="document">
    <h1>
      ELDT Completion Certificate
      <span class="badge">${esc(t.classType || '')}${t.endorsement ? ' • ' + esc(t.endorsement) : ''}</span>
    </h1>
    <h2>
      Training Provider: <span class="brand">${esc(p.name || '')}</span>
      • TPR ID: ${esc(p.tprId || '')}
    </h2>

    <div class="box grid" aria-labelledby="traineeSection">
      <div id="traineeSection" class="label" style="grid-column:1/-1;margin-bottom:4px;">Trainee</div>
      <div><div class="label">Name</div><div class="value">${esc(u.fullName || '')}</div></div>
      <div><div class="label">Date of Birth</div><div class="value">${esc(u.dob || '')}</div></div>
      <div><div class="label">CLP/CDL #</div><div class="value">${esc(u.clpNumber || u.licenseNumber || '')}</div></div>
      <div><div class="label">Issuing State</div><div class="value">${esc(u.clpState || u.licenseState || '')}</div></div>
    </div>

    <div class="box grid" aria-labelledby="trainingSection">
      <div id="trainingSection" class="label" style="grid-column:1/-1;margin-bottom:4px;">Training</div>
      <div><div class="label">Training Class</div><div class="value">Class ${esc(t.classType || '')}</div></div>
      <div><div class="label">Endorsement</div><div class="value">${esc(t.endorsement || '—')}</div></div>
      <div><div class="label">Theory Completed</div>
        <div class="value">${t.theory?.completed ? 'Yes' : 'No'} ${theoryCompletedAt ? '(' + esc(theoryCompletedAt) + ')' : ''}</div>
      </div>
      <div><div class="label">BTW Completed</div>
        <div class="value">${t.btw?.completed ? 'Yes' : 'No'} ${btwCompletedAt ? '(' + esc(btwCompletedAt) + ')' : ''}</div>
      </div>
      <div><div class="label">Range Hours</div><div class="value">${fmtHours(t.btw?.rangeHours)}</div></div>
      <div><div class="label">Public Road Hours</div><div class="value">${fmtHours(t.btw?.publicRoadHours)}</div></div>
      <div><div class="label">Completion Date</div><div class="value">${esc(t.completionDate || '')}</div></div>
      <div><div class="label">Record ID</div><div class="value">${esc(r.meta?.recordId || '')}</div></div>
    </div>

    <!-- CSV peek (same headers used for download) -->
    <div class="box">
      <div class="label" style="margin-bottom:6px;">TPR CSV Fields</div>
      <table class="meta" aria-label="TPR completion fields">
        <tbody>
          ${headers
            .map(
              h => `
            <tr>
              <th scope="row">${esc(h)}</th>
              <td>${esc(csvRow[h] ?? '')}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>

    <footer>
      Generated ${esc(new Date().toLocaleString())} • This sheet is for your records.
      Official reporting is through FMCSA’s Training Provider Registry.
    </footer>

    <div class="no-print">
      <button class="btn" onclick="window.print()">Print / Save as PDF</button>
      <button class="btn btn-primary" id="dl">Download CSV</button>
    </div>
  </div>

  <script>
    const BOM='${BOM}';
    const headers=${JSON.stringify(headers)};
    const row=${JSON.stringify(csvRow)};

    function escCell(s) {
      s = String(s ?? '');
      const needs = s.includes(',') || s.includes('"') || s.includes('\\n') || s.includes('\\r') || /^\\s|\\s$/.test(s);
      return needs ? '"' + s.replace(/"/g, '""') + '"' : s;
    }
    function toCsv(headers, rows) {
      const eol='\\r\\n';
      const lines = [headers.join(',')].concat(
        rows.map(r => headers.map(h => escCell(r[h])).join(','))
      );
      return BOM + lines.join(eol) + eol;
    }
    function downloadCsv(name, text) {
      try {
        const blob = new Blob([text], { type:'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = name; a.rel='noopener'; a.style.display='none';
        document.body.appendChild(a); a.click();
        setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
      } catch(e) {
        try { const w=window.open(); if (w) { w.document.write('<pre>'+text.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))+'</pre>'); w.document.close(); } } catch {}
      }
    }
    document.getElementById('dl')?.addEventListener('click', () => {
      const csv = toCsv(headers, [row]);
      const last = String(${JSON.stringify(u?.lastName || '')}).toLowerCase().replace(/\\s+/g,'-') || 'student';
      downloadCsv('tpr-completion-' + last + '.csv', csv);
    });
  </script>
</body>
</html>`
}

/* -------------------------- Printable certificate ------------------------ */

/**
 * Open a printable tab with the completion details. User can print or save as PDF.
 * Returns true if a window/tab was opened, false if blocked/unavailable.
 */
export function openPrintableCert(cert) {
  if (!hasWindow) return false

  const html = buildPrintableHTML(cert)

  // Prefer Blob URL to avoid document.write timing quirks
  let opened = null
  try {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    opened = window.open(url, '_blank', 'noopener,noreferrer')
    if (opened) {
      const revoke = () => URL.revokeObjectURL(url)
      opened.addEventListener?.('load', revoke, { once: true })
      setTimeout(revoke, 10000)
      return true
    }
    URL.revokeObjectURL(url)
  } catch {
    // fall back below
  }

  try {
    const w = window.open('', '_blank', 'noopener,noreferrer')
    if (!w) return false
    w.document.open()
    w.document.write(html)
    w.document.close()
    try {
      w.focus()
    } catch {}
    return true
  } catch {
    return false
  }
}

/* --------------------------------- CSV ----------------------------------- */

/**
 * Trigger a CSV download. Accepts either:
 *  - a CSV string, or
 *  - an array of objects + optional headers (header inference if omitted).
 */
export function downloadCsv(
  rowsOrCsv,
  filename = 'tpr-completions.csv',
  headers
) {
  if (!hasWindow) return
  let csv = ''

  if (typeof rowsOrCsv === 'string') {
    csv = rowsOrCsv
  } else if (Array.isArray(rowsOrCsv)) {
    const cols =
      Array.isArray(headers) && headers.length
        ? headers
        : Array.from(new Set(rowsOrCsv.flatMap(r => Object.keys(r || {}))))
    const escapeCell = v => {
      const s = String(v ?? '')
      const q = s.replace(/"/g, '""')
      return /[",\n]/.test(q) ? `"${q}"` : q
    }
    const head = cols.map(escapeCell).join(',')
    const body = rowsOrCsv
      .map(row => cols.map(c => escapeCell(row?.[c])).join(','))
      .join('\n')
    csv = BOM + head + '\n' + body
  } else {
    csv = BOM // empty CSV with BOM so Excel opens as UTF-8
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 0)
}

/* ------------------------------ Clipboard -------------------------------- */

export async function copy(text) {
  const s = String(text ?? '')
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(s)
      return true
    }
  } catch {
    /* fall through */
  }

  try {
    const ta = document.createElement('textarea')
    ta.value = s
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '-1000px'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return !!ok
  } catch {
    return false
  }
}

// Optional convenience bundle
export default { openPrintableCert, csvFromCert, downloadCsv, copy }
