// src/admin/settings/utils/defaults.js
// App-level defaults for settings sections

export const DEFAULT_BRAND = Object.freeze({
  schoolName: '',
  primaryColor: '',
  logoUrl: '',
})

export const DEFAULT_PREFS = Object.freeze({
  billing: {
    mode: 'employer',        // 'student' | 'employer'
    currency: 'USD',
    invoicePrefix: '',
    acceptedMethods: ['card'],
    defaultTermsNetDays: 15,
    autopay: false,
  },
  users: {
    defaultRole: 'student',
    inviteEmailTemplate: 'default',
    requireProfileBeforeEnroll: true,
    requiredFields: ['name', 'phone', 'address'],
  },
  courses: {
    enableELDT: true,
    enablePractice: true,
    enableWalkthrough: true,
  },
  compliance: {
    requiredDocs: ['insurance', 'bonding'],
    notifyBeforeDays: 30,
  },
  notifications: {
    email: true,
    sms: false,
    weeklyDigest: true,
  },
})