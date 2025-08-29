// Path: src/admin/billing/hooks/public/useBillingSummary.js
// ============================================================================
// Admin • Billing • Public Hook — useBillingSummary
// - Safe, stable, widget-friendly summary for Companies/Dashboard
// - Wraps internal billing hooks; does NOT expose low-level services
// - Shape is intentionally small & future-proof
// ----------------------------------------------------------------------------
// Returns:
//   {
//     summary: {
//       mode: 'employer' | 'student',
//       balance: number,             // cents
//       balanceLabel: string,        // formatted, e.g. "$3.2k"
//       openInvoices: number,
//       lastPaymentLabel: string,    // human-friendly or '—'
//     } | null,
//     loading: boolean
//   }
// ----------------------------------------------------------------------------
// Notes:
// - MVP infers summary from Employer invoices (employer-billed mode).
// - When student-billing summary lands, we can branch on `mode` or props.
// - Keep imports limited to public barrels when consumed outside billing/.
// ============================================================================

import { useMemo } from 'react'

import { toCurrencyShort } from '@admin/billing/utils/index.js'

import useEmployerBilling from '../internal/useEmployerBilling.js'

/**
 * @typedef {'employer'|'student'} BillingMode
 */

/**
 * Public, stable summary of billing for a given org scope.
 * Outside consumers (Companies, Dashboard) should use this hook instead of internal hooks.
 *
 * @param {Object} params
 * @param {string=} params.schoolId    - Scope: current school (for Firestore queries)
 * @param {string=} params.companyId   - Optional: future use to narrow within school
 * @param {BillingMode=} params.mode   - Force a mode ('employer'|'student'); defaults to 'employer' until student mode is implemented
 * @returns {{ summary: {
 *   mode: BillingMode,
 *   balance: number,
 *   balanceLabel: string,
 *   openInvoices: number,
 *   lastPaymentLabel: string,
 * } | null, loading: boolean }}
 */
export default function useBillingSummary({
  schoolId,
  mode = 'employer',
} = {}) {
  // For MVP we aggregate employer invoices to produce a compact summary.
  // When student mode is ready, branch on `mode` and compute from student payments.
  const { loading: empLoading, filtered: employerInvoices } =
    useEmployerBilling({ schoolId })

  const summary = useMemo(() => {
    if (mode !== 'employer') {
      // Placeholder for future student-billing summary.
      return {
        mode: 'student',
        balance: 0,
        balanceLabel: toCurrencyShort(0),
        openInvoices: 0,
        lastPaymentLabel: '—',
      }
    }

    if (!Array.isArray(employerInvoices) || employerInvoices.length === 0) {
      return {
        mode: 'employer',
        balance: 0,
        balanceLabel: toCurrencyShort(0),
        openInvoices: 0,
        lastPaymentLabel: '—',
      }
    }

    // Balance = unpaid + partial amounts. (Assumes amountCents is the open amount in mocks/MVP.)
    let openInvoices = 0
    let balanceCents = 0
    const lastPaymentLabel = '—' // Unknown in MVP; can wire from payments later.

    for (const inv of employerInvoices) {
      const status = inv.status || 'unpaid'
      if (status === 'unpaid' || status === 'partial') {
        openInvoices++
        const amt = Number.isFinite(inv.amountCents) ? inv.amountCents : 0
        balanceCents += amt
      }
    }

    return {
      mode: 'employer',
      balance: balanceCents,
      balanceLabel: toCurrencyShort(balanceCents),
      openInvoices,
      lastPaymentLabel,
    }
  }, [employerInvoices, mode])

  return {
    summary,
    loading: Boolean(empLoading),
  }
}
