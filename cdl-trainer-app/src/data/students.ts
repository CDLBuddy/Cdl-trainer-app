// Path: src/data/students.ts
// ---------------------------------------------------------------------------
// Students repository (typed facade)
// - Start with safe mocks; later swap to Firestore/HTTP underneath
// - Shapes align with Admin Reports + company rosters
// ---------------------------------------------------------------------------

export type StudentStatus = 'enrolled' | 'completed' | 'inactive' | 'pending'

export interface StudentRow {
  id: string
  fullName: string
  firstName?: string
  lastName?: string
  email?: string
  companyId?: string
  companyName?: string
  status?: StudentStatus
  licenseNumber?: string
  licenseState?: string
  clpNumber?: string
  clpState?: string
  dob?: string
  // passthroughs welcome
  [k: string]: unknown
}

// ---------------------- minimal in-memory seed ------------------------------

const seed: StudentRow[] = [
  {
    id: 's-1',
    fullName: 'Alex Ortiz',
    email: 'alex@example.com',
    companyId: 'acme',
    companyName: 'ACME Logistics',
    status: 'enrolled',
  },
  {
    id: 's-2',
    fullName: 'Min Chen',
    email: 'min@example.com',
    companyId: 'road',
    companyName: 'RoadStar Freight',
    status: 'pending',
  },
  {
    id: 's-3',
    fullName: 'Priya Patel',
    email: 'priya@example.com',
    companyId: 'acme',
    companyName: 'ACME Logistics',
    status: 'completed',
  },
]

// ------------------------------ API ----------------------------------------

export async function getById(id: string): Promise<StudentRow | null> {
  return seed.find(s => s.id === id) ?? null
}

export async function listByCompany(
  schoolId: string | undefined,
  companyId: string,
  limit = 200
): Promise<StudentRow[]> {
  void schoolId // not used in mock
  return seed.filter(s => s.companyId === companyId).slice(0, limit)
}

export async function search(
  schoolId: string | undefined,
  q: string,
  limit = 50
): Promise<StudentRow[]> {
  void schoolId // not used in mock
  const needle = String(q || '').toLowerCase()
  if (!needle) return []
  return seed
    .filter(
      s =>
        s.fullName.toLowerCase().includes(needle) ||
        (s.email || '').toLowerCase().includes(needle) ||
        (s.companyName || '').toLowerCase().includes(needle)
    )
    .slice(0, limit)
}

export default { getById, listByCompany, search }
