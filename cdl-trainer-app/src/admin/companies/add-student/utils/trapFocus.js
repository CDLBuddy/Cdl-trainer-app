// Path: src/admin/companies/add-student/utils/trapFocus.js

/**
 * Return tabbable elements inside a container (DOM order).
 * - Skips disabled / aria-hidden / display:none / visibility:hidden
 * - Allows explicit positive/zero tabindex
 */
export function getTabbables(container) {
  if (!container) return [];
  const CANDIDATE_SELECTOR = [
    'a[href]',
    'button',
    'input',
    'select',
    'textarea',
    '[tabindex]',
  ].join(',');

  const isVisible = (el) => {
    // Fast checks first
    if (!el || el.disabled) return false;
    if (el.getAttribute?.('aria-hidden') === 'true') return false;
    // Hidden via CSS
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    // detached or fully collapsed
    const rect = el.getBoundingClientRect?.();
    if (!rect || (rect.width === 0 && rect.height === 0)) {
      // zero-rect is often fine for inputs, so fall back to offset checks
      if (!el.offsetParent && style.position !== 'fixed') return false;
    }
    return true;
  };

  const nodes = Array.from(container.querySelectorAll(CANDIDATE_SELECTOR));
  return nodes
    .filter((el) => {
      // Must be in the container and focusable
      if (!(el instanceof HTMLElement)) return false;
      // tabindex: allow >= 0; exclude -1
      const ti = el.getAttribute('tabindex');
      if (ti != null && Number.parseInt(ti, 10) < 0) return false;
      // Disabled / hidden checks
      if (el.hasAttribute('disabled')) return false;
      return isVisible(el);
    });
}

/**
 * Focus the first tabbable element in the container (or the container itself)
 * Returns true if focus was moved.
 */
export function focusFirstIn(container) {
  const tabbables = getTabbables(container);
  const target = tabbables[0] || container;
  if (target && target.focus) {
    try { target.focus(); return true; } catch { /* noop */ }
  }
  return false;
}

/**
 * trapFocusKeydown
 * Call this from a keydown listener on the document while the drawer is open.
 *
 * Example:
 *   const onKey = (e) => trapFocusKeydown(e, panelRef.current, onClose)
 *   document.addEventListener('keydown', onKey)
 */
export default function trapFocusKeydown(e, container, onEscape) {
  if (e.key !== 'Tab') {
    if (e.key === 'Escape' && typeof onEscape === 'function') onEscape(e);
    return;
  }
  if (!container) return;

  const tabbables = getTabbables(container);
  // Nothing to trap → move focus to the container and stop the page from jumping
  if (tabbables.length === 0) {
    if (!container.contains(document.activeElement)) {
      e.preventDefault();
      focusFirstIn(container);
    }
    return;
  }

  const first = tabbables[0];
  const last  = tabbables[tabbables.length - 1];
  const active = document.activeElement;

  // If focus starts outside the container (e.g., the page body), pull it in.
  if (!container.contains(active)) {
    e.preventDefault();
    (e.shiftKey ? last : first).focus();
    return;
  }

  // Cycle focus
  if (e.shiftKey && active === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}