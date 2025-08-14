// src/utils/layout-hooks.js
// ======================================================================
// Layout Hooks & Utilities
// - useBrandingSync(): keep brand (name/logo/color/subHeadline) in state,
//   update CSS var --brand-primary, and (optionally) <meta name="theme-color">
// - useHideNavBar(): hide NavBar on auth/welcome routes (configurable)
// - useRouteChangeEffect(): run an effect whenever the route path changes
// - shouldShowNavBar(): pure helper if you need it without hooks
// ======================================================================

import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  subscribeBrandingUpdated,
  getCachedBrandingSummary,
} from '@/utils/school-branding.js'

// ----------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------

/**
 * Default routes where the NavBar should be hidden.
 * You can pass your own patterns into useHideNavBar() to override/extend.
 */
export const NAVBAR_HIDDEN_PATHS = [
  /^\/$/,              // welcome
  /^\/login$/,         // auth
  /^\/signup$/,        // auth
  /^\/reset-password/, // auth flow (prefix)
]

/** CSS custom property for the brand primary color */
export const BRAND_PRIMARY_VAR = '--brand-primary'

/** Whether to also mirror brand color to <meta name="theme-color"> */
export const MIRROR_TO_THEME_COLOR_META = true

// ----------------------------------------------------------------------
// Helpers (no hooks)
// ----------------------------------------------------------------------

/**
 * Pure function to decide NavBar visibility based on a path string.
 * @param {string} pathname
 * @param {(string|RegExp)[]} patterns
 * @returns {boolean} true if NavBar should be shown
 */
export function shouldShowNavBar(pathname, patterns = NAVBAR_HIDDEN_PATHS) {
  const hide = patterns.some(p =>
    p instanceof RegExp ? p.test(pathname) : p === pathname
  )
  return !hide
}

/**
 * Safely set a CSS custom property on :root (no-ops on SSR).
 */
export function setRootCssVar(name, value) {
  if (typeof document === 'undefined') return
  try {
    document.documentElement.style.setProperty(name, value ?? '')
  } catch {}
}

/**
 * Update <meta name="theme-color"> (no-ops if absent/SSR).
 */
export function setThemeColorMeta(color) {
  if (typeof document === 'undefined') return
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta && color) meta.setAttribute('content', color)
}

// ----------------------------------------------------------------------
// Hooks
// ----------------------------------------------------------------------

/**
 * Keep branding in React state and reflect primary color to CSS/meta.
 * Source of truth is the branding bus from school-branding.js.
 * @returns {{logoUrl:string, schoolName:string, primaryColor:string, subHeadline:string}}
 */
export function useBrandingSync() {
  const [brand, setBrand] = useState(() => getCachedBrandingSummary())

  // On mount: subscribe to branding updates, reflect CSS var & meta
  useEffect(() => {
    // initial paint safety (in case cache already has a color)
    if (brand?.primaryColor) {
      setRootCssVar(BRAND_PRIMARY_VAR, brand.primaryColor)
      if (MIRROR_TO_THEME_COLOR_META) setThemeColorMeta(brand.primaryColor)
    }

    const unsub = subscribeBrandingUpdated(detail => {
      const next = {
        logoUrl: detail?.logoUrl || '',
        schoolName: detail?.schoolName || '',
        primaryColor: detail?.primaryColor || '',
        subHeadline: detail?.subHeadline || '',
      }

      // Reflect to CSS var + (optional) theme-color meta for OS chrome
      if (next.primaryColor) {
        setRootCssVar(BRAND_PRIMARY_VAR, next.primaryColor)
        if (MIRROR_TO_THEME_COLOR_META) setThemeColorMeta(next.primaryColor)
      }

      setBrand(next)
    })
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // subscribe once

  // Stable object identity when values don't actually change
  const stable = useMemo(
    () => ({
      logoUrl: brand?.logoUrl || '',
      schoolName: brand?.schoolName || '',
      primaryColor: brand?.primaryColor || '',
      subHeadline: brand?.subHeadline || '',
    }),
    [brand?.logoUrl, brand?.schoolName, brand?.primaryColor, brand?.subHeadline]
  )

  return stable
}

/**
 * Determine if the NavBar should be hidden for the current route.
 * @param {(string|RegExp)[]=} patterns optional override/extension
 * @returns {boolean} true if NavBar should be hidden
 */
export function useHideNavBar(patterns = NAVBAR_HIDDEN_PATHS) {
  const { pathname } = useLocation()
  const hide = useMemo(() => {
    return patterns.some(p =>
      p instanceof RegExp ? p.test(pathname) : p === pathname
    )
  }, [pathname, patterns])
  return hide
}

/**
 * Run an effect whenever the route (pathname) changes.
 * Useful for analytics, page titles, or custom scroll logic.
 * (Note: the data router already gives you <ScrollRestoration/>.)
 * @param {(pathname:string)=>void} onChange
 */
export function useRouteChangeEffect(onChange) {
  const { pathname } = useLocation()
  useEffect(() => {
    if (typeof onChange === 'function') onChange(pathname)
  }, [pathname, onChange])
}