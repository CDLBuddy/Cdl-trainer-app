// Path: src/admin/companies/hooks/useCompanyDocuments.js
// ======================================================================
// useCompanyDocuments (admin)
// - Mock-backed document loader for a single company
// - Exposes refresh + upload + optional open/download/delete stubs
// - Safe defaults, a11y-friendly error strings, SSR-safe
// - Swap internals to Firestore/Storage later (kept behind a single hook)
// ======================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/**
 * @typedef {'ok'|'missing'|'expired'} DocStatus
 * @typedef {{ id:string, name:string, type?:string, status?:DocStatus, expiresAtLabel?:string }} CompanyDoc
 *
 * @typedef {Object} UseCompanyDocumentsReturn
 * @property {CompanyDoc[]} docs
 * @property {boolean} loading
 * @property {string} error
 * @property {()=>Promise<void>} refresh
 * @property {(file:File)=>Promise<void>} upload
 * @property {(doc:CompanyDoc)=>Promise<void>} [open]
 * @property {(doc:CompanyDoc)=>Promise<void>} [download]
 * @property {(doc:CompanyDoc)=>Promise<void>} [remove]
 * @property {{ ok:number, expired:number, missing:number, total:number }} counts
 */

const MOCK_DOCS = /** @type {CompanyDoc[]} */ ([
  { id: 'd1', name: 'Carrier Agreement', type: 'PDF', status: 'ok',      expiresAtLabel: '' },
  { id: 'd2', name: 'Insurance (COI)',   type: 'PDF', status: 'expired', expiresAtLabel: '2025-07-01' },
])

/**
 * useCompanyDocuments
 * Minimal, mock-backed documents hook. Replace internals with Firestore/Storage
 * without changing consumers (CompanyDocumentsCard, etc).
 *
 * @param {string|null|undefined} companyId
 * @returns {UseCompanyDocumentsReturn}
 */
export default function useCompanyDocuments(companyId) {
  const [docs, setDocs] = useState(/** @type {CompanyDoc[]} */([]))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const aliveRef = useRef(true)

  // ----------------------------- I/O ------------------------------
  const refresh = useCallback(async () => {
    if (!companyId) {
      setDocs([])
      setError('')
      return
    }
    setLoading(true)
    setError('')
    try {
      // TODO: Replace with Firestore:
      // const snap = await getDocs(query(collection(db,'companies',companyId,'documents')))
      // const rows = snap.docs.map(d => ({ id:d.id, ...d.data() }))
      await new Promise(r => setTimeout(r, 220)) // simulate network
      if (!aliveRef.current) return
      setDocs(MOCK_DOCS)
    } catch (err) {
       
      console.error('[useCompanyDocuments] load failed', err)
      if (!aliveRef.current) return
      setError('Failed to load documents.')
      setDocs([])
    } finally {
      if (aliveRef.current) setLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    aliveRef.current = true
    refresh()
    return () => { aliveRef.current = false }
  }, [refresh])

  // Upload stub (replace with Storage put + metadata write)
  const upload = useCallback(async (/* file: File */) => {
    try {
      setLoading(true)
      await new Promise(r => setTimeout(r, 240))
      // TODO: storage upload → get downloadURL → write doc record in Firestore
      await refresh()
    } catch (err) {
       
      console.error('[useCompanyDocuments] upload failed', err)
      setError('Failed to upload document.')
    } finally {
      setLoading(false)
    }
  }, [refresh])

  // Optional item actions (mocked)
  const open = useCallback(async (doc) => {
    // TODO: open in viewer (e.g., new tab with downloadURL)
    // window.open(doc.url, '_blank', 'noopener,noreferrer')
    await Promise.resolve(doc)
  }, [])

  const download = useCallback(async (doc) => {
    // TODO: trigger browser download of doc.url
    await Promise.resolve(doc)
  }, [])

  const remove = useCallback(async (doc) => {
    try {
      setLoading(true)
      // TODO: delete from Storage + remove Firestore doc
      await new Promise(r => setTimeout(r, 200))
      setDocs(prev => prev.filter(d => d.id !== doc.id))
    } catch (err) {
       
      console.error('[useCompanyDocuments] delete failed', err)
      setError('Failed to delete document.')
    } finally {
      setLoading(false)
    }
  }, [])

  // --------------------------- derived ----------------------------
  const counts = useMemo(() => {
    const acc = { ok: 0, expired: 0, missing: 0, total: docs.length }
    for (const d of docs) {
      const k = (d.status || 'ok')
      if (k in acc) acc[k] += 1
    }
    return acc
  }, [docs])

  return { docs, loading, error, refresh, upload, open, download, remove, counts }
}