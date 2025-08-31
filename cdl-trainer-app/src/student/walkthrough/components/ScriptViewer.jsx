//src/student/walkthrough/components/ScriptViewer.jsx
import PropTypes from 'prop-types'
import React, { useId, useMemo } from 'react'

import styles from './ScriptViewer.module.css'

/**
 * ScriptViewer — read-only walkthrough script viewer.
 * Renders sections with semantic lists and clear pass/fail badges.
 */
export default function ScriptViewer({ script }) {
  const regionId = useId()

  const sections = useMemo(() => {
    if (!Array.isArray(script)) return []
    return script
      .filter(Boolean)
      .map((s, i) => ({
        id: String(s.id ?? `sec-${i}`),
        section: String(s.section || s.title || `Section ${i + 1}`),
        critical: !!(s.critical || s.passFail),
        passFail: !!s.passFail,
        steps: Array.isArray(s.steps) ? s.steps.filter(Boolean) : [],
      }))
  }, [script])

  if (sections.length === 0) return null

  return (
    <div
      className={styles.card}
      role="region"
      aria-label="Walkthrough script"
      aria-describedby={regionId}
    >
      <span id={regionId} className="sr-only">
        Sections with steps. Critical sections are marked pass or fail.
      </span>

      {sections.map((sec, _) => {
        const titleId = `${sec.id}-title`
        return (
          <section
            key={sec.id}
            className={`${styles.section} ${sec.critical ? styles.isCritical : ''}`}
            aria-labelledby={titleId}
          >
            <h3 id={titleId} className={styles.title}>
              {sec.critical ? '🚨' : '✅'} {sec.section}
              {sec.critical && <span className={styles.flag}>(Pass/Fail)</span>}
            </h3>

            {sec.steps.length > 0 ? (
              <ol className={styles.steps}>
                {sec.steps.map((step, j) => {
                  const label = step?.label ? String(step.label).trim() : ''
                  const text = String(step?.script || step?.text || '').trim()
                  const mustSay = !!step?.mustSay
                  const pf = !!step?.passFail
                  if (!text) return null
                  return (
                    <li key={String(step?.id ?? `${sec.id}-s${j}`)} className={styles.step}>
                      {label && <strong className={styles.stepLabel}>{label}: </strong>}
                      <span className={styles.stepText}>{text}</span>
                      {mustSay && <em className={styles.badgeMust}>(Must Say)</em>}
                      {pf && <em className={styles.badgePF}>(Pass/Fail)</em>}
                    </li>
                  )
                })}
              </ol>
            ) : (
              <p className={styles.empty}>No steps in this section.</p>
            )}
          </section>
        )
      })}
    </div>
  )
}

ScriptViewer.propTypes = {
  script: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      section: PropTypes.string,
      title: PropTypes.string, // accepted as alias
      critical: PropTypes.bool,
      passFail: PropTypes.bool,
      steps: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
          label: PropTypes.string,
          script: PropTypes.string, // preferred
          text: PropTypes.string,   // alias
          mustSay: PropTypes.bool,
          passFail: PropTypes.bool,
        })
      ),
    })
  ),
}