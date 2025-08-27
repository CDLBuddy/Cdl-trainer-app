// Path: src/data/certifications.ts
// ---------------------------------------------------------------------------
// Certifications repository (historical submissions)
// - In-memory stub now; swap internals to Firestore/HTTP later
// - Shapes play nicely with your TPRCompletion payload
// ---------------------------------------------------------------------------

import type { TPRCompletion } from '@/types/eldt'

export type CertStatus = 'draft' | 'queued' | 'submitted' | 'error'

export interface CertificationRecord {
  id: string
  studentId: string
  schoolId?: string
  providerId?: string
  payload: TPRCompletion
  status: CertStatus
  createdAt: string
  updatedAt?: string
  submittedAt?: string
  tprReceipt?: unknown
  error?: string
}

const mem = new Map<string, CertificationRecord>()

function newId() {
  return `cert_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`
}

/** Create or update a certification record. */
export async function save(record: Partial<CertificationRecord> & { payload: TPRCompletion; studentId: string }): Promise<CertificationRecord> {
  const id = record.id || newId()
  const now = new Date().toISOString()
  const prev = mem.get(id)
  const merged: CertificationRecord = {
    id,
    studentId: record.studentId,
    schoolId: record.schoolId ?? prev?.schoolId,
    providerId: record.providerId ?? prev?.providerId,
    payload: record.payload,
    status: (record.status ?? prev?.status ?? 'draft') as CertStatus,
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
    submittedAt: record.submittedAt ?? prev?.submittedAt,
    tprReceipt: record.tprReceipt ?? prev?.tprReceipt,
    error: record.error ?? prev?.error,
  }
  mem.set(id, merged)
  return merged
}

export async function getById(id: string): Promise<CertificationRecord | null> {
  return mem.get(id) ?? null
}

export async function listByStudent(studentId: string, limit = 20): Promise<CertificationRecord[]> {
  return Array.from(mem.values())
    .filter(r => r.studentId === studentId)
    .sort((a, b) => (b.updatedAt! > a.updatedAt! ? 1 : -1))
    .slice(0, limit)
}

export async function listRecent(limit = 50): Promise<CertificationRecord[]> {
  return Array.from(mem.values())
    .sort((a, b) => (b.updatedAt! > a.updatedAt! ? 1 : -1))
    .slice(0, limit)
}

export default { save, getById, listByStudent, listRecent }