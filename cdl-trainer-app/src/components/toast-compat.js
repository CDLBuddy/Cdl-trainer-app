// src/components/toast-compat.js
// ======================================================================
// Single source of truth for legacy-compatible toasts.
// - When ToastProvider binds, we route to React.
// - Otherwise we show a styled DOM fallback (stacked, positioned, a11y).
// - Supports show / dismiss / clear / update.
// ======================================================================

let _api = null // { showToast(msg|obj, ...), dismiss(id?), clear()?, update(id, patch)? }

/** Bind from React provider (called in ToastProvider useEffect) */
export function __bindToastCompat(api) {
  _api = api && typeof api.showToast === 'function' ? api : null
}

/** Is a React provider bound? */
export function __isToastCompatBound() {
  return !!_api
}

/* =========================================================================
   Public API (legacy-safe)
   ========================================================================= */

/**
 * showToast(message, type?, duration?, opts?)           // legacy
 * showToast(message, duration, type)                    // legacy alt
 * showToast({ message, type, duration, position, ... }) // new
 *
 * Always returns a toast id (string).
 */
export function showToast(messageOrObj, a, b, opts) {
  const t = _normalizeArgs(messageOrObj, a, b, opts)
  if (_api) {
    return _api.showToast(t) // Provider accepts object, returns id
  }
  _domShowToast(t)
  return t.id
}

/** Update a toast by id (message/type/duration/position/etc) */
export function updateToast(id, patch = {}) {
  if (!id) return
  if (_api && typeof _api.update === 'function') return _api.update(id, patch)
  _domUpdateToast(id, patch)
}

/** Dismiss a toast by id (no-op if unknown) */
export function dismissToast(id) {
  if (_api && typeof _api.dismiss === 'function') return _api.dismiss(id)
  _domDismissToast(id)
}

/** Clear all visible toasts */
export function clearToasts() {
  if (_api && typeof _api.clear === 'function') return _api.clear()
  _domClearAll()
}

/* =========================================================================
   Args normalization (robust)
   ========================================================================= */

function _normalizeArgs(messageOrObj, a, b, opts) {
  // Object style
  if (
    messageOrObj &&
    typeof messageOrObj === 'object' &&
    'message' in messageOrObj
  ) {
    const o = messageOrObj
    return {
      id: o.id || _genId(),
      message: String(o.message ?? ''),
      type: o.type || 'info',
      duration: Number.isFinite(o.duration) ? o.duration : 3000,
      position: _validPos(o.position) ? o.position : 'bottom-right',
      dismissible: o.dismissible ?? true,
      showProgress: o.showProgress ?? true,
      action: _normalizeAction(o.action),
    }
  }

  // Legacy overloads: (msg, duration, type)
  if (typeof a === 'number') {
    return {
      id: _genId(),
      message: String(messageOrObj ?? ''),
      type: typeof b === 'string' ? b : 'info',
      duration: a ?? 3000,
      position: _validPos(opts?.position) ? opts.position : 'bottom-right',
      dismissible: opts?.dismissible ?? true,
      showProgress: opts?.showProgress ?? true,
      action: _normalizeAction(opts?.action),
    }
  }

  // (msg, type, duration, opts)
  const type = typeof a === 'string' ? a : 'info'
  const duration = typeof b === 'number' ? b : 3000
  return {
    id: _genId(),
    message: String(messageOrObj ?? ''),
    type,
    duration,
    position: _validPos(opts?.position) ? opts.position : 'bottom-right',
    dismissible: opts?.dismissible ?? true,
    showProgress: opts?.showProgress ?? true,
    action: _normalizeAction(opts?.action),
  }
}

function _normalizeAction(a) {
  if (!a) return null
  const label = typeof a.label === 'string' ? a.label : ''
  const onClick = typeof a.onClick === 'function' ? a.onClick : null
  return label && onClick ? { label, onClick } : null
}

function _validPos(p) {
  return (
    p === 'bottom-right' ||
    p === 'bottom-left' ||
    p === 'bottom' ||
    p === 'top-right' ||
    p === 'top-left' ||
    p === 'top'
  )
}

/* =========================================================================
   DOM fallback (stacked, positioned, accessible)
   ========================================================================= */

const MAX_PER_POSITION = 4
const _containers = new Map() // pos -> HTMLElement
const _indexById = new Map() // id -> { pos, node }
const _reduceMotion = (() => {
  try {
    return (
      typeof window !== 'undefined' &&
      !!window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
  } catch {
    return false
  }
})()

function _domShowToast(t) {
  if (typeof document === 'undefined') return

  const pos = t.position || 'bottom-right'
  const container = _ensureContainer(pos)

  // Cap stack size per position
  while (container.children.length >= MAX_PER_POSITION) {
    const first = container.firstElementChild
    if (first) {
      const id = first.getAttribute('data-toast-id')
      if (id) _cleanupIndex(id, first)
      first.remove()
    } else {
      break
    }
  }

  const node = _createToastNode(t, pos)
  _indexById.set(t.id, { pos, node })
  container.appendChild(node)
  node.focus?.({ preventScroll: true })

  // Auto-dismiss
  if (t.duration > 0) {
    node.__timer = setTimeout(() => _domDismissToast(t.id), t.duration)
  }
}

function _domUpdateToast(id, patch) {
  const rec = _indexById.get(id)
  if (!rec) return // nothing to update
  const { node, pos: oldPos } = rec

  // Update message
  if (Object.prototype.hasOwnProperty.call(patch, 'message')) {
    const body = node.querySelector('.tc-body')
    if (body) body.textContent = String(patch.message ?? '')
  }

  // Update type (colors + icon)
  if (Object.prototype.hasOwnProperty.call(patch, 'type')) {
    const type = patch.type || 'info'
    _applyTypeStyles(node, type)
  }

  // Update action
  if (Object.prototype.hasOwnProperty.call(patch, 'action')) {
    _rebuildAction(node, patch.action)
  }

  // Update dismissible
  if (Object.prototype.hasOwnProperty.call(patch, 'dismissible')) {
    _rebuildClose(node, !!patch.dismissible)
  }

  // Update progress + timers when duration/showProgress change
  const hasDur = Object.prototype.hasOwnProperty.call(patch, 'duration')
  const hasProg = Object.prototype.hasOwnProperty.call(patch, 'showProgress')
  if (hasDur || hasProg) {
    const duration = hasDur ? Number(patch.duration) : node.__duration
    const showProgress = hasProg ? !!patch.showProgress : node.__showProgress
    node.__duration = Number.isFinite(duration) ? duration : 3000
    node.__showProgress = showProgress

    if (node.__timer) clearTimeout(node.__timer)
    if (node.__progress) clearInterval(node.__progress)

    if (node.__duration > 0) {
      // restart timer
      node.__timer = setTimeout(() => _domDismissToast(id), node.__duration)

      // rebuild progress
      const track = node.querySelector('.tc-track')
      const bar = node.querySelector('.tc-bar')
      if (showProgress) {
        if (!track || !bar) {
          _rebuildProgress(node) // create if missing
        }
        const started = Date.now()
        node.__progress = setInterval(() => {
          const elapsed = Date.now() - started
          const pct = Math.max(0, 100 - (elapsed / node.__duration) * 100)
          const el = node.querySelector('.tc-bar')
          if (el) el.style.width = pct + '%'
          if (pct <= 0) clearInterval(node.__progress)
        }, 100)
      } else {
        // remove progress if present
        const trackNode = node.querySelector('.tc-track')
        trackNode?.remove()
      }
    }
  }

  // Update position (move container)
  if (Object.prototype.hasOwnProperty.call(patch, 'position')) {
    const nextPos = _validPos(patch.position) ? patch.position : oldPos
    if (nextPos !== oldPos) {
      const nextC = _ensureContainer(nextPos)
      _indexById.set(id, { pos: nextPos, node })
      nextC.appendChild(node)
      _restack(nextPos)
    }
  }
}

function _domDismissToast(id) {
  const rec = _indexById.get(id)
  if (!rec) return
  const { node } = rec
  _indexById.delete(id)

  if (node.__timer) clearTimeout(node.__timer)
  if (node.__progress) clearInterval(node.__progress)
  if (node.__onKey) window.removeEventListener('keydown', node.__onKey)

  // Fade out then remove
  node.style.opacity = '0'
  if (_reduceMotion) {
    node.remove()
    return
  }
  setTimeout(() => node.remove(), 180)
}

function _domClearAll() {
  for (const { node } of _indexById.values()) {
    if (node.__timer) clearTimeout(node.__timer)
    if (node.__progress) clearInterval(node.__progress)
    if (node.__onKey) window.removeEventListener('keydown', node.__onKey)
    node.remove()
  }
  _indexById.clear()
  for (const c of _containers.values()) c.remove()
  _containers.clear()
}

function _ensureContainer(position) {
  if (_containers.has(position)) return _containers.get(position)

  const c = document.createElement('div')
  c.className = 'toast-compat-container'
  c.style.position = 'fixed'
  c.style.zIndex = '99999'
  c.style.pointerEvents = 'none'

  // Safe-area aware offsets (iOS notch)
  const insetTop = 'env(safe-area-inset-top, 0px)'
  const insetBottom = 'env(safe-area-inset-bottom, 0px)'
  const insetLeft = 'env(safe-area-inset-left, 0px)'
  const insetRight = 'env(safe-area-inset-right, 0px)'
  const offset = '12px'

  switch (position) {
    case 'top':
      c.style.top = `calc(${offset} + ${insetTop})`
      c.style.left = '50%'
      c.style.transform = 'translateX(-50%)'
      break
    case 'bottom':
      c.style.bottom = `calc(${offset} + ${insetBottom})`
      c.style.left = '50%'
      c.style.transform = 'translateX(-50%)'
      break
    case 'top-left':
      c.style.top = `calc(${offset} + ${insetTop})`
      c.style.left = `calc(${offset} + ${insetLeft})`
      break
    case 'top-right':
      c.style.top = `calc(${offset} + ${insetTop})`
      c.style.right = `calc(${offset} + ${insetRight})`
      break
    case 'bottom-left':
      c.style.bottom = `calc(${offset} + ${insetBottom})`
      c.style.left = `calc(${offset} + ${insetLeft})`
      break
    case 'bottom-right':
    default:
      c.style.bottom = `calc(${offset} + ${insetBottom})`
      c.style.right = `calc(${offset} + ${insetRight})`
      break
  }

  document.body.appendChild(c)
  _containers.set(position, c)
  return c
}

function _createToastNode(t, position) {
  const n = document.createElement('div')
  n.className = `toast-compat toast-${t.type}`
  n.dataset.toastId = t.id
  n.setAttribute('tabindex', '0')
  n.setAttribute('role', t.type === 'error' ? 'alert' : 'status')
  n.setAttribute('aria-live', t.type === 'error' ? 'assertive' : 'polite')
  n.style.pointerEvents = 'auto'
  n.style.display = 'flex'
  n.style.alignItems = 'center'
  n.style.gap = '10px'
  n.style.minWidth = '220px'
  n.style.maxWidth = '420px'
  n.style.padding = '12px 14px'
  n.style.borderRadius = '10px'
  n.style.boxShadow = '0 10px 30px rgba(0,0,0,.25)'
  n.style.userSelect = 'none'
  n.style.opacity = '1'
  n.style.transition = _reduceMotion
    ? 'none'
    : 'transform .15s ease, opacity .18s ease'
  n.__duration = Number.isFinite(t.duration) ? t.duration : 3000
  n.__showProgress = !!t.showProgress

  _applyTypeStyles(n, t.type)

  // stack offset (base Y transform)
  const children = _containers.get(position)?.children?.length || 0
  const baseTranslateY = position.startsWith('top')
    ? children * 12
    : -children * 12
  n.__baseTranslateY = baseTranslateY
  n.style.transform = `translateY(${baseTranslateY}px)`

  // icon
  const icon = document.createElement('span')
  icon.setAttribute('aria-hidden', 'true')
  icon.style.fontSize = '18px'
  icon.style.lineHeight = '1'
  icon.className = 'tc-icon'
  icon.textContent = _iconForType(t.type)
  n.appendChild(icon)

  // body
  const body = document.createElement('div')
  body.style.flex = '1'
  body.style.fontWeight = '500'
  body.style.wordBreak = 'break-word'
  body.className = 'tc-body'
  body.textContent = String(t.message || '')
  n.appendChild(body)

  // action (optional)
  _rebuildAction(n, t.action)

  // progress
  if (t.showProgress && t.duration > 0) {
    _rebuildProgress(n)
  }

  // optional dismiss button
  _rebuildClose(n, t.dismissible)

  // Click toast background to dismiss
  n.addEventListener('click', e => {
    if (e.target && e.target !== n) return
    _domDismissToast(t.id)
  })

  // ESC to dismiss
  const onKey = e => {
    if (e.key === 'Escape') _domDismissToast(t.id)
  }
  window.addEventListener('keydown', onKey)
  n.__onKey = onKey

  // Swipe to dismiss (mobile) – preserve stack Y while translating X
  let startX = null
  n.addEventListener(
    'touchstart',
    e => {
      startX = e.changedTouches[0].clientX
    },
    { passive: true }
  )
  n.addEventListener(
    'touchmove',
    e => {
      if (startX == null) return
      const dx = e.changedTouches[0].clientX - startX
      n.style.transform = `translateX(${dx}px) translateY(${baseTranslateY}px)`
    },
    { passive: true }
  )
  n.addEventListener('touchend', () => {
    const m = /translateX\(([-\d.]+)px\)/.exec(n.style.transform || '')
    const dx = m ? parseFloat(m[1]) : 0
    if (Math.abs(dx) > 80) _domDismissToast(t.id)
    else n.style.transform = `translateY(${baseTranslateY}px)`
    startX = null
  })

  n.addEventListener('transitionend', () => {
    // cleanup progress + key listener on remove
    if (!document.body.contains(n)) _cleanupNode(n)
  })

  return n
}

function _applyTypeStyles(n, type) {
  n.className = `toast-compat toast-${type}`
  const isWarn = type === 'warning'
  n.style.background =
    type === 'error'
      ? 'var(--error, #e53e3e)'
      : type === 'success'
        ? 'var(--success, #48bb78)'
        : isWarn
          ? 'var(--warning, #d69e2e)'
          : 'var(--toast-bg, rgba(0,0,0,.85))'
  n.style.color = isWarn ? '#111' : 'var(--toast-text, #fff)'
  const icon = n.querySelector('.tc-icon')
  if (icon) icon.textContent = _iconForType(type)
}

function _iconForType(type) {
  return type === 'success'
    ? '✅'
    : type === 'error'
      ? '⚠️'
      : type === 'warning'
        ? '🚧'
        : '💬'
}

function _rebuildAction(n, action) {
  // remove old
  const old = n.querySelector('.tc-action')
  old?.remove()
  if (!action?.label || typeof action.onClick !== 'function') return
  const btn = document.createElement('button')
  btn.className = 'tc-action'
  Object.assign(btn.style, {
    background: 'transparent',
    border: '1px solid currentColor',
    color: 'inherit',
    padding: '4px 8px',
    borderRadius: '7px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  })
  btn.textContent = action.label
  btn.addEventListener('click', e => {
    e.stopPropagation()
    try {
      action.onClick()
    } catch {
      /* ignore */
    }
    // common pattern is to close after action; keep it consistent
    _domDismissToast(n.dataset.toastId)
  })
  n.appendChild(btn)
}

function _rebuildClose(n, dismissible) {
  const old = n.querySelector('.tc-close')
  old?.remove()
  if (!dismissible) return
  const close = document.createElement('button')
  close.className = 'tc-close'
  close.setAttribute('aria-label', 'Dismiss notification')
  Object.assign(close.style, {
    background: 'transparent',
    border: '0',
    color: 'inherit',
    fontSize: '18px',
    cursor: 'pointer',
    marginLeft: '6px',
  })
  close.textContent = '×'
  close.addEventListener('click', e => {
    e.stopPropagation()
    _domDismissToast(n.dataset.toastId)
  })
  n.appendChild(close)
}

function _rebuildProgress(n) {
  // remove old
  const oldTrack = n.querySelector('.tc-track')
  if (oldTrack) oldTrack.remove()
  if (!(n.__showProgress && n.__duration > 0)) return

  const body = n.querySelector('.tc-body')
  if (!body) return
  const track = document.createElement('div')
  track.className = 'tc-track'
  track.setAttribute('aria-hidden', 'true')
  Object.assign(track.style, {
    marginTop: '8px',
    height: '3px',
    width: '100%',
    borderRadius: '999px',
    background: 'rgba(255,255,255,.25)',
    overflow: 'hidden',
  })
  const bar = document.createElement('div')
  bar.className = 'tc-bar'
  Object.assign(bar.style, {
    height: '100%',
    width: '100%',
    background: 'var(--brand-primary, #4e91ad)',
    transition: _reduceMotion ? 'none' : 'width .1s linear',
  })
  track.appendChild(bar)
  body.appendChild(track)

  const started = Date.now()
  n.__progress = setInterval(() => {
    const elapsed = Date.now() - started
    const pct = Math.max(0, 100 - (elapsed / n.__duration) * 100)
    bar.style.width = pct + '%'
    if (pct <= 0) clearInterval(n.__progress)
  }, 100)
}

function _restack(position) {
  const c = _containers.get(position)
  if (!c) return
  const isTop = position.startsWith('top')
  const nodes = Array.from(c.children)
  nodes.forEach((n, idx) => {
    const y = (isTop ? idx : -idx) * 12
    n.__baseTranslateY = y
    n.style.transform = `translateY(${y}px)`
  })
}

function _cleanupIndex(id, node) {
  if (_indexById.has(id)) _indexById.delete(id)
  _cleanupNode(node)
}

function _cleanupNode(n) {
  if (n.__timer) clearTimeout(n.__timer)
  if (n.__progress) clearInterval(n.__progress)
  if (n.__onKey) window.removeEventListener('keydown', n.__onKey)
}

/* =========================================================================
   Utils
   ========================================================================= */

function _genId() {
  return `tc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
}
