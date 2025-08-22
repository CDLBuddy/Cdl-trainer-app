// src/utils/env.js
// Single, safe place to read Vite env flags without optional chaining.
export const ENV =
  (typeof import.meta !== 'undefined' && import.meta.env) || {};

export const __DEV__  = !!ENV.DEV;
export const __PROD__ = !!ENV.PROD;
