// Path: src/admin/companies/add-student/utils/trapFocus.js
// ============================================================================
// Focus trapping utilities for drawers/dialogs
// - getTabbables(container): returns tabbable nodes in DOM order
// - focusFirstIn(container): focuses first tabbable (or container)
// - trapFocus(e, container, onEscape?): keydown handler for Tab/Escape
// ============================================================================

/**
 * Return tabbable elements inside a container (DOM order).
 * Skips: disabled, aria-hidden, inert, display:none, visibility:hidden,
 * fieldset[disabled] descendants, tabindex < 0, and detached/fully collapsed.
 * @param {HTMLElement|null} container
 * @returns {HTMLElement[]}
 */
export function getTabbables(container) {
  if (!container || typeof window === 'undefined') return []

  // Buttons/links/inputs/select/textarea + [tabindex] + contenteditable + [role="button"]
  const CANDIDATE_SELECTOR = [
    'a[href]',
    'button',
    'input',
    'select',
    'textarea',
    '[tabindex]',
    '[contenteditable="true"]',
    '[role="button"]',
  ].join(',')

  const isVisible = el => {
    if (!el) return false
    // Disabled via attribute or ancestor fieldset
    if (el.hasAttribute('disabled')) return false
    const fs = el.closest?.('fieldset[disabled]')
    if (fs) return false

    // aria-hidden or inert (or ancestor inert)
    if (el.getAttribute?.('aria-hidden') === 'true') return false
    if (el.hasAttribute?.('inert') || el.closest?.('[inert]')) return false

    // CSS visibility
    const style = window.getComputedStyle(el)
    if (style.display === 'none' || style.visibility === 'hidden') return false

    // detached or zero rect (allow fixed)
    const rect = el.getBoundingClientRect?.()
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      if (!el.offsetParent && style.position !== 'fixed') return false
    }
    return true
  }

  /** @type {HTMLElement[]} */
  const nodes = Array.from(container.querySelectorAll(CANDIDATE_SELECTOR))

  return nodes.filter(el => {
    if (!(el instanceof HTMLElement)) return false

    // Exclude negative tabindex
    const tiRaw = el.getAttribute('tabindex')
    if (tiRaw != null && Number.parseInt(tiRaw, 10) < 0) return false

    // Inputs that are truly disabled or readOnly radios (let’s be conservative)
    if (
      (el.tagName === 'INPUT' || el.tagName === 'BUTTON') &&
      el.hasAttribute('disabled')
    ) {
      return false
    }

    return isVisible(el)
  })
}

/**
 * Focus the first tabbable element in the container (or the container itself).
 * Returns true if focus was moved.
 * @param {HTMLElement|null} container
 */
export function focusFirstIn(container) {
  if (typeof document === 'undefined') return false
  const tabbables = getTabbables(container)
  const target = tabbables[0] || container
  if (target && target.focus) {
    try {
      target.focus()
      return true
    } catch {
      /* noop */
    }
  }
  return false
}

/**
 * trapFocus
 * Call this from a keydown listener while the drawer/dialog is open.
 * Example:
 *   const onKey = (e) => trapFocus(e, panelRef.current, onClose)
 *   document.addEventListener('keydown', onKey, true)
 *
 * @param {KeyboardEvent} e
 * @param {HTMLElement|null} container
 * @param {(e?: KeyboardEvent) => void} [onEscape]
 */
export default function trapFocus(e, container, onEscape) {
  if (!container) return

  if (e.key !== 'Tab') {
    if (e.key === 'Escape' && typeof onEscape === 'function') onEscape(e)
    return
  }

  const tabbables = getTabbables(container)

  // Nothing to trap → move focus inside and prevent page jump
  if (tabbables.length === 0) {
    if (!container.contains(document.activeElement)) {
      e.preventDefault()
      focusFirstIn(container)
    }
    return
  }

  const first = tabbables[0]
  const last = tabbables[tabbables.length - 1]
  const active = /** @type {HTMLElement|null} */ (document.activeElement)

  // If focus starts outside the container, pull it in.
  if (!container.contains(active)) {
    e.preventDefault()
    ;(e.shiftKey ? last : first).focus()
    return
  }

  // Cycle focus within
  if (e.shiftKey && active === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && active === last) {
    e.preventDefault()
    first.focus()
  }
}
