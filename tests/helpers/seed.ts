import { $fetch } from '@nuxt/test-utils/e2e'

function seed(action: string, data?: any) {
  return $fetch('/api/_test/seed', {
    method: 'POST',
    body: { action, data },
  })
}

export function migrateDatabase() {
  return seed('migrate')
}

export function resetDatabase() {
  return seed('reset')
}

export function createTestUser(overrides: {
  id?: string
  name?: string
  email?: string
  sessionToken?: string
  isAdmin?: boolean
  onboardingComplete?: boolean
  electorateId?: number
  createdAt?: string
} = {}) {
  const id = overrides.id ?? 'test-user-1'
  const token = overrides.sessionToken ?? `token-${id}`
  return seed('createUser', {
    id,
    name: overrides.name ?? 'Test User',
    email: overrides.email ?? `${id}@test.com`,
    sessionToken: token,
    isAdmin: overrides.isAdmin ?? false,
    onboardingComplete: overrides.onboardingComplete ?? true,
    electorateId: overrides.electorateId,
    createdAt: overrides.createdAt,
  }).then(() => ({ id, token }))
}

export function seedData(data: {
  electorates?: Array<{ id?: number; name: string; state: string }>
  politicians?: Array<{
    id?: number; name: string; displayName: string; party: string
    chamber: 'house' | 'senate'; electorateId?: number; state?: string
  }>
  sources?: Array<{ id?: number; domain: string; name: string; tier?: number }>
  stories?: Array<{
    id?: number; urlHash: string; url: string; headline: string
    description?: string; sourceId?: number; status?: string; clusterId?: number
    embedding?: string
  }>
  clusters?: Array<{ id?: number; primaryStoryId?: number; storyCount?: number }>
  storyPoliticians?: Array<{ storyId: number; politicianId: number }>
}) {
  return seed('seed', data)
}
