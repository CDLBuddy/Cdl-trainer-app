// src/components/useToast.js
import { useContext } from 'react';
import ToastContext from './ToastContext.js';

/**
 * Hook to access the toast API from anywhere in React.
 * Example:
 *   const { showToast } = useToast();
 *   showToast('Saved!', 'success');
 */
export function useToast() {
  return useContext(ToastContext);
}

export default useToast;
