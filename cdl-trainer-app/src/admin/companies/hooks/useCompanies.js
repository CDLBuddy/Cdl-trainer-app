// Path: src/admin/companies/hooks/useCompanies.js
// ======================================================================
// useCompanies (admin)
// - Loads/filters companies for a school and exposes CRUD + export actions
// - Race-condition safe (unmount guards), resilient errors, tiny UX niceties
// - Services encapsulate all I/O; hook remains pure React state/derivations
// - Back-compat: stable API surface for existing callers
// ======================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  listCompaniesBySchool,
  addCompany,
  updateCompany,
  removeCompany,
  removeCompaniesBulk,
  exportCompaniesToCSV,
  exportCompaniesToPDF,
  downloadCompanyTemplateCSV,
  existsByNameInSchool,
} from '../services'

/** Company name rule (letters, numbers, space, - ' . &) */
const NAME_RE = /^[\w\s\-'.&]+$/

/**
 * @typedef {Object} UseCompaniesParams
 * @property {string}  schoolId
 * @property {string}  userEmail
 * @property {(msg:string, timeout?:number, type?:'info'|'success'|'error')=>void} [showToast]
 *
 * @typedef {Object} UseCompaniesReturn
 * @property {boolean} loading
 * @property {null|Error} error
 * @property {Object} brand
 * @property {(b:Object)=>void} setBrand
 * @property {string} search
 * @property {(s:string)=>void} setSearch
 * @property {boolean} adding
 * @property {Array<Object>} companies
 * @property {Array<Object>} filtered
 * @property {Set<string>} selected
 * @property {boolean} allChecked
 * @property {React.MutableRefObject<HTMLInputElement|null>} importRef
 * @property {() => Promise<void>} refresh
 * @property {(opts:{name:string,contact?:string,address?:string})=>Promise<void>} addOne
 * @property {(id:string, values:{name:string,contact?:string,address?:string,status:boolean})=>Promise<void>} saveOne
 * @property {(id:string)=>Promise<void>} removeOne
 * @property {() => Promise<void>} bulkDelete
 * @property {() => void} exportCSV
 * @property {() => void} exportPDF
 * @property {() => void} downloadTemplate
 * @property {(id:string)=>void} toggleRow
 * @property {(checked:boolean)=>void} toggleAll
 * @property {() => void} resetImportInput
 */

/**
 * @param {UseCompaniesParams} params
 * @returns {UseCompaniesReturn}
 */
export function useCompanies({ schoolId, userEmail, showToast }) {
  // --------------------------- state ----------------------------------
  const [brand, setBrand] = useState({})
  const [companies, setCompanies] = useState([])
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [selected, setSelected] = useState(() => new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(/** @type {Error|null} */ (null))

  const importRef = useRef(/** @type {HTMLInputElement|null} */ (null))
  const aliveRef = useRef(true)

  // --------------------------- helpers --------------------------------
  const toast = useCallback(
    (msg, timeout, type) => showToast?.(msg, timeout, type),
    [showToast]
  )

  const resetImportInput = useCallback(() => {
    try {
      if (importRef.current) importRef.current.value = ''
    } catch {
      /* noop */
    }
  }, [])

  // --------------------------- load list -------------------------------
  const refresh = useCallback(async () => {
    if (!schoolId) {
      setCompanies([])
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const rows = await listCompaniesBySchool(schoolId)
      if (!aliveRef.current) return
      setCompanies(Array.isArray(rows) ? rows : [])
      // Keep selection as-is; callers might rely on it.
    } catch (err) {
      if (!aliveRef.current) return
      const e =
        err instanceof Error ? err : new Error('Failed to load companies')

      console.error('[useCompanies] list error:', err)
      setError(e)
      toast('Failed to load companies.', 3000, 'error')
    } finally {
      if (aliveRef.current) setLoading(false)
    }
  }, [schoolId, toast])

  useEffect(() => {
    aliveRef.current = true
    refresh()
    return () => {
      aliveRef.current = false
    }
  }, [refresh])

  // --------------------------- local filter ----------------------------
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return companies
    return companies.filter(c =>
      `${c.name ?? ''} ${c.contact ?? ''} ${c.address ?? ''}`
        .toLowerCase()
        .includes(term)
    )
  }, [companies, search])

  const allChecked = useMemo(
    () => filtered.length > 0 && selected.size === filtered.length,
    [filtered.length, selected.size]
  )

  // --------------------------- actions --------------------------------
  const addOne = useCallback(
    async ({ name, contact, address }) => {
      const safeName = (name || '').trim()
      if (!safeName) return toast('Enter a company name.')
      if (!NAME_RE.test(safeName)) return toast('Invalid company name.')

      setAdding(true)
      try {
        if (await existsByNameInSchool(schoolId, safeName)) {
          toast('Company already exists.', 3000, 'error')
          return
        }
        await addCompany({
          schoolId,
          userEmail,
          name: safeName,
          contact: contact?.trim() || '',
          address: address?.trim() || '',
        })
        toast('Company added!', 2000, 'success')
        await refresh()
        setSelected(new Set()) // clear selection to avoid accidental bulk ops
      } catch (err) {
        console.error('[useCompanies] addOne error:', err)
        toast('Failed to add company.', 3000, 'error')
      } finally {
        setAdding(false)
      }
    },
    [refresh, schoolId, userEmail, toast]
  )

  const saveOne = useCallback(
    async (id, values) => {
      try {
        const name = (values?.name || '').trim()
        if (!name) return toast('Company name cannot be empty.')
        if (!NAME_RE.test(name)) return toast('Invalid company name.')

        await updateCompany(id, { ...values, name, updatedBy: userEmail })
        toast('Company updated.', 2000, 'success')
        await refresh()
      } catch (err) {
        console.error('[useCompanies] saveOne error:', err)
        toast('Failed to update company.', 3000, 'error')
      }
    },
    [refresh, userEmail, toast]
  )

  const removeOne = useCallback(
    async id => {
      if (!window.confirm('Remove company? This cannot be undone.')) return
      try {
        await removeCompany(id)
        toast('Company removed.', 2200, 'success')
        await refresh()
        setSelected(prev => {
          const n = new Set(prev)
          n.delete(id)
          return n
        })
      } catch (err) {
        console.error('[useCompanies] removeOne error:', err)
        toast('Failed to remove company.', 3000, 'error')
      }
    },
    [refresh, toast]
  )

  const bulkDelete = useCallback(async () => {
    if (!selected.size) return
    if (
      !window.confirm(
        `Delete ${selected.size} companies? This cannot be undone!`
      )
    )
      return
    try {
      await removeCompaniesBulk(Array.from(selected))
      toast('Deleted selected companies.', 2400, 'success')
      await refresh()
      setSelected(new Set())
    } catch (err) {
      console.error('[useCompanies] bulkDelete error:', err)
      toast('Failed to delete selected companies.', 3000, 'error')
    }
  }, [selected, refresh, toast])

  // --------------------------- exports --------------------------------
  const exportCSV = useCallback(() => {
    try {
      exportCompaniesToCSV(filtered, toast)
    } catch (err) {
      console.error('[useCompanies] exportCSV error:', err)
      toast('Failed to export CSV.', 3000, 'error')
    }
  }, [filtered, toast])

  const exportPDF = useCallback(() => {
    try {
      exportCompaniesToPDF(filtered, toast)
    } catch (err) {
      console.error('[useCompanies] exportPDF error:', err)
      toast('Failed to export PDF.', 3000, 'error')
    }
  }, [filtered, toast])

  const downloadTemplate = useCallback(() => {
    try {
      downloadCompanyTemplateCSV()
      toast?.('Template downloaded.', 1500, 'success')
    } catch (err) {
      console.error('[useCompanies] downloadTemplate error:', err)
      toast('Failed to download template.', 3000, 'error')
    }
  }, [toast])

  // --------------------------- selection -------------------------------
  const toggleRow = useCallback(id => {
    setSelected(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }, [])

  const toggleAll = useCallback(
    checked => {
      setSelected(checked ? new Set(filtered.map(c => c.id)) : new Set())
    },
    [filtered]
  )

  // Keep a stable reference shape (minor perf nicety for consumers)
  return useMemo(
    () => ({
      // status
      loading,
      error,

      // branding passthrough (page can set from its own fetch)
      brand,
      setBrand,

      // search/filter
      search,
      setSearch,

      // list
      adding,
      companies,
      filtered,

      // selection
      selected,
      allChecked,
      importRef,

      // actions
      refresh,
      addOne,
      saveOne,
      removeOne,
      bulkDelete,
      exportCSV,
      exportPDF,
      downloadTemplate,
      toggleRow,
      toggleAll,
      resetImportInput,
    }),
    [
      loading,
      error,
      brand,
      setBrand,
      search,
      setSearch,
      adding,
      companies,
      filtered,
      selected,
      allChecked,
      refresh,
      addOne,
      saveOne,
      removeOne,
      bulkDelete,
      exportCSV,
      exportPDF,
      downloadTemplate,
      toggleRow,
      toggleAll,
      resetImportInput,
    ]
  )
}

export default useCompanies
