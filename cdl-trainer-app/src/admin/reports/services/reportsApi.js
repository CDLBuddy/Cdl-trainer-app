//src/admin/reports/services/reportsApi.js
// ======================================================================
// Reports API (pure)
// - Thin wrappers around your existing admin-data utils
// - Keeps the screen decoupled from where data comes from
// ======================================================================
import { fetchUsersForSchool, fetchCompaniesForSchool } from '@utils/admin-data.js'
import { getCurrentSchoolBranding } from '@utils/school-branding.js'

export async function loadReportsBundle(schoolId) {
  const [brand, users, companies] = await Promise.all([
    getCurrentSchoolBranding(),
    fetchUsersForSchool(schoolId),
    fetchCompaniesForSchool(schoolId),
  ])
  return {
    brand: brand || {},
    users: Array.isArray(users) ? users : [],
    companies: Array.isArray(companies) ? companies : [],
  }
}