import { describe, it, expect, beforeEach } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'
import { resetDatabase, seedData, createTestUser } from '../helpers/seed'
import { authFetch, fetchStatus } from '../helpers/setup'

describe('auth endpoints', async () => {
  await setup({ dev: true })

  beforeEach(async () => {
    await resetDatabase()
  })

  describe('GET /api/me', () => {
    it('returns null when not authenticated', async () => {
      const data = await $fetch('/api/me')
      expect(data.user).toBeNull()
      expect(data.profile).toBeNull()
    })

    it('returns user and profile when authenticated', async () => {
      await seedData({ electorates: [{ id: 1, name: 'Wentworth', state: 'NSW' }] })
      const { token } = await createTestUser({ electorateId: 1 })
      const af = authFetch(token)

      const data = await af('/api/me')
      expect(data.user).toBeTruthy()
      expect(data.user.email).toBe('test-user-1@test.com')
      expect(data.profile).toBeTruthy()
      expect(data.profile.electorateId).toBe(1)
    })
  })

  describe('POST /api/onboarding', () => {
    it('sets electorate and marks onboarding complete', async () => {
      await seedData({ electorates: [{ id: 1, name: 'Wentworth', state: 'NSW' }] })
      const { token } = await createTestUser({ onboardingComplete: false })
      const af = authFetch(token)

      const data = await af('/api/onboarding', {
        method: 'POST',
        body: { electorateId: 1 },
      })
      expect(data).toEqual({ ok: true })

      const me = await af('/api/me')
      expect(me.profile.electorateId).toBe(1)
      expect(me.profile.onboardingComplete).toBe(true)
    })

    it('rejects invalid electorate', async () => {
      const { token } = await createTestUser()
      const status = await fetchStatus('/api/onboarding', {
        method: 'POST',
        body: { electorateId: 999 },
        sessionToken: token,
      })
      expect(status).toBe(400)
    })

    it('rejects unauthenticated requests', async () => {
      const status = await fetchStatus('/api/onboarding', {
        method: 'POST',
        body: { electorateId: 1 },
      })
      expect(status).toBe(401)
    })
  })

  describe('PUT /api/settings/electorate', () => {
    it('updates user electorate', async () => {
      await seedData({
        electorates: [
          { id: 1, name: 'Wentworth', state: 'NSW' },
          { id: 2, name: 'Melbourne', state: 'VIC' },
        ],
      })
      const { token } = await createTestUser({ electorateId: 1 })
      const af = authFetch(token)

      const data = await af('/api/settings/electorate', {
        method: 'PUT',
        body: { electorateId: 2 },
      })
      expect(data).toEqual({ ok: true })

      const me = await af('/api/me')
      expect(me.profile.electorateId).toBe(2)
    })

    it('rejects unauthenticated requests', async () => {
      const status = await fetchStatus('/api/settings/electorate', {
        method: 'PUT',
        body: { electorateId: 1 },
      })
      expect(status).toBe(401)
    })
  })
})
