// Path: src/admin/billing/services/billingApi.js
// ============================================================================
// Admin • Billing • Services (pure)
// - Mock data for now; swap to Firestore when ready
// ============================================================================

/** @typedef {'unpaid'|'partial'|'paid'} InvoiceStatus */
/** @typedef {'pending'|'partial'|'paid'|'waived'} PaymentStatus */

export function fetchEmployerInvoicesMock() {
  /** @type {Array<{id:string,companyName:string,poNumber?:string,amountCents:number,issuedAt:any,dueAt:any,status:InvoiceStatus,contactEmail?:string}>} */
  return [
    {
      id: 'inv_001', companyName: 'Acme Logistics', poNumber: 'PO-1042',
      amountCents: 320000, issuedAt: '2025-07-01', dueAt: '2025-07-31',
      status: 'unpaid', contactEmail: 'ap@acmelogistics.com'
    },
    {
      id: 'inv_002', companyName: 'RoadRunner Freight', poNumber: 'PO-1045',
      amountCents: 185000, issuedAt: '2025-07-10', dueAt: '2025-08-10',
      status: 'partial', contactEmail: 'billing@roadrunner.com'
    },
    {
      id: 'inv_003', companyName: 'Blue Sky Haulers', poNumber: 'PO-1048',
      amountCents: 257500, issuedAt: '2025-06-15', dueAt: '2025-07-15',
      status: 'paid', contactEmail: 'ap@bluesky.com'
    },
  ]
}

export function fetchIndividualPaymentsMock() {
  /** @type {Array<{email:string,name?:string,course?:string,cdlClass?:string,paymentStatus:PaymentStatus,paymentProofUrl?:string,reconciled:boolean}>} */
  return [
    {
      email: 'sam@example.com', name: 'Sam Lopez', course: 'ELDT Class B',
      cdlClass: 'B', paymentStatus: 'paid',
      paymentProofUrl: 'https://example.com/receipt-sam.jpg', reconciled: true
    },
    {
      email: 'alex@example.com', name: 'Alex Jordan', course: 'ELDT Class A',
      cdlClass: 'A', paymentStatus: 'partial',
      paymentProofUrl: '', reconciled: false
    },
    {
      email: 'riley@example.com', name: 'Riley Chen', course: 'Passenger Bus',
      cdlClass: 'PASSENGER-BUS', paymentStatus: 'pending',
      paymentProofUrl: '', reconciled: false
    },
    {
      email: 'morgan@example.com', name: 'Morgan Yu', course: 'ELDT Class A',
      cdlClass: 'A', paymentStatus: 'waived',
      paymentProofUrl: '', reconciled: true
    },
  ]
}

// TODO: replace mocks with Firestore queries:
// export async function fetchEmployerInvoices() { ... }
// export async function fetchIndividualPayments() { ... }