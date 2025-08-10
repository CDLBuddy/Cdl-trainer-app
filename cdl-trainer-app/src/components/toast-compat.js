// src/components/toast-compat.js
// Single source of truth for legacy-compatible toasts.
// - When ToastProvider binds, we route to React.
// - Otherwise we show a styled DOM toast as a fallback.

let _api = null; // { showToast(message, type?, duration?) }

export function __bindToastCompat(api) {
  _api = api && typeof api.showToast === 'function' ? api : null;
}

export function __isToastCompatBound() {
  return !!_api;
}

// Robust arg parsing: supports (msg, type, duration) and (msg, duration, type)
function _parseArgs(message, a, b) {
  let type = 'info';
  let duration = 3000;

  if (typeof a === 'number') {
    duration = a;
    if (typeof b === 'string') type = b;
  } else if (typeof a === 'string') {
    type = a;
    if (typeof b === 'number') duration = b;
  }
  return { message: String(message ?? ''), type, duration };
}

export function showToast(message, a, b) {
  const { type, duration } = _parseArgs(message, a, b);

  if (_api) {
    // Provider expects (message, type?, duration?)
    return _api.showToast(message, type, duration);
  }
  _domToast(message, type, duration);
}

// ----------------- DOM fallback (styled) -----------------
const _queue = [];
let _isShowing = false;

function _domToast(message, type = 'info', duration = 3000) {
  if (typeof document === 'undefined') return;
  _queue.push({ message, type, duration });
  if (!_isShowing) _showNext();
}

function _showNext() {
  if (!_queue.length) {
    _isShowing = false;
    return;
  }
  _isShowing = true;

  const { message, type, duration } = _queue.shift();

  document.querySelectorAll('.toast-message').forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = `toast-message toast-${type}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.tabIndex = 0;
  toast.innerHTML = `<span>${message}</span>`;

  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    background:
      type === 'error' ? '#e35656'
      : type === 'success' ? '#44a368'
      : type === 'warning' ? '#d19a2a'
      : '#333',
    color: '#fff',
    padding: '12px 26px',
    fontWeight: '500',
    borderRadius: '7px',
    opacity: '1',
    boxShadow: '0 4px 18px rgba(0,0,0,0.15)',
    transition: 'opacity 0.45s cubic-bezier(.4,0,.2,1)',
    zIndex: '99999',
    cursor: 'pointer',
  });

  document.body.appendChild(toast);

  const dismiss = () => {
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
      _showNext();
    }, 500);
  };

  toast.addEventListener('click', dismiss);
  setTimeout(dismiss, duration);
}
