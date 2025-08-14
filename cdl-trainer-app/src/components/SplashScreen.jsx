// src/components/SplashScreen.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react'

import {
  getCachedBrandingSummary,
  subscribeBrandingUpdated,
} from '@utils/school-branding.js'

import styles from './SplashScreen.module.css'

/**
 * Props:
 * - message?: string                 // main loading message
 * - showTip?: boolean                // show a tip line
 * - tips?: string[]                  // custom tips (randomized)
 * - disableRandomTip?: boolean       // lock to first tip if true
 */
export default function SplashScreen({
  message = 'Loading, please wait…',
  showTip = true,
  tips = [
    'Say the three-point brake check out loud during practice.',
    'Review your ELDT checklist daily to stay on track.',
    'Use flashcards to drill tough sections.',
    'Take timed quizzes to simulate the real test.',
  ],
  disableRandomTip = false,
}) {
  /* 1) Branding: pull from cache instantly, then live-update */
  const [brand, setBrand] = useState(() => getCachedBrandingSummary())

  useEffect(() => {
    const unsub = subscribeBrandingUpdated(detail => {
      setBrand(prev => ({
        logoUrl: detail?.logoUrl ?? prev.logoUrl ?? '/default-logo.svg',
        schoolName: detail?.schoolName ?? prev.schoolName ?? 'CDL Trainer',
        primaryColor: detail?.primaryColor ?? prev.primaryColor ?? '',
        subHeadline: detail?.subHeadline ?? prev.subHeadline ?? '',
      }))

      // SSR/Unit-test safe document access
      if (typeof document !== 'undefined' && detail?.primaryColor) {
        document.documentElement.style.setProperty('--brand-primary', detail.primaryColor)
      }
    })
    return unsub
  }, [])

  const logo = brand?.logoUrl || '/default-logo.svg'
  const name = brand?.schoolName || 'CDL Trainer'
  const sub  = brand?.subHeadline || ''
  const primary = brand?.primaryColor || 'var(--brand-light)'

  /* 2) Random tip (stable seed so it doesn't reshuffle on re-renders) */
  const tipIndexRef = useRef(
    disableRandomTip || !tips?.length ? 0 : Math.floor(Math.random() * tips.length)
  )
  const tipText = useMemo(() => {
    if (!showTip || !tips?.length) return ''
    const idx = disableRandomTip ? 0 : Math.min(tipIndexRef.current, tips.length - 1)
    return tips[idx]
  }, [showTip, tips, disableRandomTip])

  /* 3) Inline CSS var to tint spinner/accents to brand color */
  const themeStyle = useMemo(() => ({ ['--splash-accent']: primary }), [primary])

  /* 4) Fallback handler if logo fails to load (prevents broken image icon) */
  const onLogoError = e => {
    if (e?.currentTarget && e.currentTarget.src !== window.location.origin + '/default-logo.svg') {
      e.currentTarget.src = '/default-logo.svg'
    }
  }

  /* 5) Respect reduced-motion (disable spinner animation via data attr) */
  const [reduceMotion, setReduceMotion] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduceMotion(!!mq.matches)
    update()
    mq.addEventListener?.('change', update)
    return () => mq.removeEventListener?.('change', update)
  }, [])

  return (
    <div
      className={`${styles['splash-root']} ${styles.deluxe}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={themeStyle}
      data-reduce-motion={reduceMotion ? 'true' : 'false'}
    >
      {/* Background vignette gradient follows brand */}
      <div className={styles['splash-bg']} aria-hidden="true" />

      <div className={`${styles['splash-card']} ${styles.glass}`}>
        <div className={styles['splash-brand']}>
          <img
            className={styles['splash-logo']}
            src={logo}
            alt={`${name} logo`}
            width="96"
            height="96"
            decoding="async"
            loading="eager"
            onError={onLogoError}
          />
          <div className={styles['splash-title']} aria-label={name}>
            {name}
          </div>
          {sub ? <div className={styles['splash-sub']}>{sub}</div> : null}
        </div>

        {/* Brand-tinted triple spinner */}
        <div className={styles['splash-spinner']} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <div className={styles['splash-message']}>{message}</div>

        {showTip && tipText ? (
          <div className={styles['splash-tip']}>Tip: {tipText}</div>
        ) : null}
      </div>
    </div>
  )
}