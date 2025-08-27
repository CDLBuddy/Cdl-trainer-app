//src/admin/walkthroughs/Editor/hooks/useWalkthroughParsers.js
import { ensureScriptShape } from '../services/wtValidation.js'
import { parseCsv, parseMarkdown } from '@walkthrough-data/utils'

const byId = (id) => /** @type {HTMLTextAreaElement|null} */ (document.getElementById(id))

export function useWalkthroughParsers({ setScript, setActiveTab, setErrors, scrollTop, parseXlsx }) {
  const toVisual = (sections) => {
    setScript(ensureScriptShape(sections))
    setErrors([])
    setActiveTab('visual')
    scrollTop()
  }

  const parseFromMarkdown = () => {
    try {
      const el = byId('wt-md-input')
      const out = parseMarkdown(el?.value || '')
      toVisual(out?.sections)
    } catch (e) {
      setErrors([`Markdown parse error: ${e?.message || e}`])
    }
  }

  const parseFromCsv = () => {
    try {
      const el = byId('wt-csv-input')
      const out = parseCsv(el?.value || '')
      toVisual(out?.sections)
    } catch (e) {
      setErrors([`CSV parse error: ${e?.message || e}`])
    }
  }

  const parseFromJson = () => {
    try {
      const el = byId('wt-json-input')
      const obj = JSON.parse(el?.value || 'null')
      toVisual(obj?.sections || obj)
    } catch (e) {
      setErrors([`JSON parse error: ${e?.message || e}`])
    }
  }

  const handleXlsxFile = async (file) => {
    if (!parseXlsx) {
      setErrors(['XLSX parsing is not enabled in this build. Wire a `parseXlsx(file)` prop.'])
      return
    }
    try {
      const out = await parseXlsx(file) // expected { sections: [...] }
      toVisual(out?.sections)
    } catch (e) {
      setErrors([`XLSX parse error: ${e?.message || e}`])
    }
  }

  return { parseFromMarkdown, parseFromCsv, parseFromJson, handleXlsxFile }
}