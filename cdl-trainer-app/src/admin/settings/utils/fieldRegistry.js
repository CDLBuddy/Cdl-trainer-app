// src/admin/settings/utils/fieldRegistry.js
// Canonical field definitions for dynamic profile requirements

export const FIELD_DEFS = Object.freeze({
  phone: { label: 'Phone', type: 'tel', placeholder: '(555) 555-5555' },
  address: { label: 'Address', type: 'text', placeholder: 'Street, City, ST' },
  dob: { label: 'Date of Birth', type: 'date' },
  permitNumber: {
    label: 'Permit Number',
    type: 'text',
    placeholder: 'If applicable',
  },
})

export function getFieldDef(key) {
  return FIELD_DEFS[key] || { label: key, type: 'text' }
}
