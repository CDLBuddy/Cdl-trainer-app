// Path: src/data/providerProfile.ts
// ---------------------------------------------------------------------------
// Provider profile repository (typed)
// - getProviderProfile(schoolId): Promise<ProviderProfile>
// - In-memory cache + safe mocks (reads branding / window globals)
// ---------------------------------------------------------------------------

export interface ProviderProfile {
  tprId: string
  name?: string
  tin?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  address?: { street?: string; city?: string; state?: string; zip?: string }
  updatedAt?: string
  // passthroughs welcome
  [k: string]: unknown
}

const cache = new Map<string, ProviderProfile>()

function fromGlobals(): ProviderProfile {
  const w = typeof window !== 'undefined' ? (window as any) : {}
  return {
    tprId: String(w.__TPR_ID__ ?? '') || '',
    name: String(w.__SCHOOL_NAME__ ?? w.__PROVIDER_NAME__ ?? '') || undefined,
    tin: w.__TPR_TIN__ ? String(w.__TPR_TIN__) : undefined,
    updatedAt: new Date().toISOString(),
  }
}

export async function getProviderProfile(
  schoolId?: string,
  opts?: { signal?: AbortSignal }
): Promise<ProviderProfile> {
  const key = String(schoolId || 'default')
  const hit = cache.get(key)
  if (hit) return hit

  // TODO: replace this block with your real data source (Firestore/HTTP).
  // Minimal mock that reads from window branding/env.
  const mock = fromGlobals()
  cache.set(key, mock)
  return mock
}

export default { getProviderProfile }
