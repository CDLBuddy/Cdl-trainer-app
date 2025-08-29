// Path: /src/admin/walkthroughs/WalkthroughUpload.jsx

import React from 'react'

import {
  CsvPanel,
  ErrorsCard,
  JsonPanel,
  MarkdownPanel,
  MetaFields,
  StatsBar,
  Tabs,
  XlsxPanel,
} from './components'
import { useUpload } from './hooks'
import cls from './WalkthroughUpload.module.css'

export default function WalkthroughUpload({ onImported, onCancel, parseXlsx }) {
  const up = useUpload({ onImported, parseXlsx })

  return (
    <div className={cls.container}>
      <h2 className={cls.h2}>Import Walkthrough</h2>

      <div className={cls.card}>
        <MetaFields
          label={up.label}
          classCode={up.classCode}
          version={up.version}
          onLabel={up.setLabel}
          onClassCode={up.setClassCode}
          onVersion={up.setVersion}
        />
      </div>

      <Tabs value={up.tab} onChange={up.setTab} />

      {up.tab === 'markdown' && (
        <MarkdownPanel
          value={up.rawMd}
          onChange={up.setRawMd}
          onParse={up.handleParseMarkdown}
        />
      )}

      {up.tab === 'csv' && (
        <CsvPanel
          value={up.rawCsv}
          onChange={up.setRawCsv}
          onParse={up.handleParseCsv}
        />
      )}

      {up.tab === 'xlsx' && (
        <XlsxPanel
          busy={up.busy}
          name={up.xlsxName}
          onChoose={up.handleXlsxChange}
        />
      )}

      {up.tab === 'json' && (
        <JsonPanel
          value={up.rawJson}
          onChange={up.setRawJson}
          onParse={up.handleParseJson}
        />
      )}

      <ErrorsCard errors={up.errors} />

      <StatsBar stats={up.stats} />

      <div className={cls.footer}>
        {onCancel && (
          <button type="button" className={cls.btn} onClick={onCancel}>
            Cancel
          </button>
        )}
        <button
          type="button"
          className={cls.btnPrimary}
          onClick={up.handleImport}
          disabled={!up.canImport}
        >
          Import as Draft
        </button>
      </div>
    </div>
  )
}
