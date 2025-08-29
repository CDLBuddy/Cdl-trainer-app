// src/admin/billing/hooks/public/useBillingDashboard.js
// Admin • Billing • Public Bridge — useBillingDashboard
// - Safe, limited row-level data for Dashboard only
// - Wraps internal services; exposes tiny shape + guarded actions

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  fetchEmployerInvoices,
  fetchIndividualPayments,
  markEmployerInvoicePaid,
  mockEmployerInvoices,
  mockIndividualPayments,
  setPaymentReconciled,
  USE_BILLING_MOCKS,
} from '../../services'

/**
 * useBillingDashboard
 * @param {{ schoolId?: string, onToast?: (msg:string, tone?:'info'|'success'|'error'|'warning') => void }} [opts]
 * @returns {{
 *   loading: boolean,
 *   employerInvoices: any[],
 *   individualPayments: any[],
 *   refreshEmployerInvoices: () => Promise<void>,
 *   refreshIndividualPayments: () => Promise<void>,
 *   handleMarkInvoicePaid: (invoiceId: string) => Promise<void>,
 *   handleToggleReconciled: (paymentId: string, next: boolean) => Promise<void>,
 * }}
 */
export function useBillingDashboard({ schoolId, onToast } = {}) {
  const toast = useCallback(
    (msg, tone = 'info') => onToast?.(msg, tone),
    [onToast]
  )

  const [loadingInv, setLoadingInv] = useState(false)
  const [loadingPay, setLoadingPay] = useState(false)

  const [employerInvoices, setEmployerInvoices] = useState(() =>
    USE_BILLING_MOCKS ? mockEmployerInvoices() : []
  )
  const [individualPayments, setIndividualPayments] = useState(() =>
    USE_BILLING_MOCKS ? mockIndividualPayments() : []
  )

  const aliveRef = useRef(true)
  useEffect(
    () => () => {
      aliveRef.current = false
    },
    []
  )

  const refreshEmployerInvoices = useCallback(async () => {
    if (!schoolId && !USE_BILLING_MOCKS) return
    setLoadingInv(true)
    try {
      const rows = USE_BILLING_MOCKS
        ? mockEmployerInvoices()
        : await fetchEmployerInvoices({ schoolId })
      if (!aliveRef.current) return
      setEmployerInvoices(Array.isArray(rows) ? rows : [])
    } catch (e) {
      console.error('[useBillingDashboard] employer load failed', e)
      toast('Error loading employer invoices.', 'error')
      if (aliveRef.current) setEmployerInvoices([])
    } finally {
      if (aliveRef.current) setLoadingInv(false)
    }
  }, [schoolId, toast])

  const refreshIndividualPayments = useCallback(async () => {
    if (!schoolId && !USE_BILLING_MOCKS) return
    setLoadingPay(true)
    try {
      const rows = USE_BILLING_MOCKS
        ? mockIndividualPayments()
        : await fetchIndividualPayments({ schoolId })
      if (!aliveRef.current) return
      setIndividualPayments(Array.isArray(rows) ? rows : [])
    } catch (e) {
      console.error('[useBillingDashboard] payments load failed', e)
      toast('Error loading payments.', 'error')
      if (aliveRef.current) setIndividualPayments([])
    } finally {
      if (aliveRef.current) setLoadingPay(false)
    }
  }, [schoolId, toast])

  useEffect(() => {
    refreshEmployerInvoices()
    refreshIndividualPayments()
  }, [refreshEmployerInvoices, refreshIndividualPayments])

  const handleMarkInvoicePaid = useCallback(
    async invoiceId => {
      if (!invoiceId) return
      try {
        if (!USE_BILLING_MOCKS) {
          await markEmployerInvoicePaid({ invoiceId, schoolId })
        }
        toast('Invoice marked paid.', 'success')
        await refreshEmployerInvoices()
      } catch (e) {
        console.error('[useBillingDashboard] mark paid failed', e)
        toast('Error marking invoice paid.', 'error')
      }
    },
    [schoolId, refreshEmployerInvoices, toast]
  )

  const handleToggleReconciled = useCallback(
    async (paymentId, next) => {
      if (!paymentId) return
      try {
        if (!USE_BILLING_MOCKS) {
          await setPaymentReconciled({ paymentId, next, schoolId })
        }
        toast(next ? 'Payment reconciled.' : 'Payment unreconciled.', 'success')
        await refreshIndividualPayments()
      } catch (e) {
        console.error('[useBillingDashboard] reconcile failed', e)
        toast('Error updating reconciliation.', 'error')
      }
    },
    [schoolId, refreshIndividualPayments, toast]
  )

  return {
    loading: loadingInv || loadingPay,
    employerInvoices,
    individualPayments,
    refreshEmployerInvoices,
    refreshIndividualPayments,
    handleMarkInvoicePaid,
    handleToggleReconciled,
  }
}

// Keep default export too, so both import styles work:
//   import useBillingDashboard from '...'
//   import { useBillingDashboard } from '...'
export default useBillingDashboard
