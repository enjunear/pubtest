import { describe, it, expect, beforeEach } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'
import { resetDatabase, seedData, createTestUser } from '../helpers/seed'
import { authFetch, fetchStatus } from '../helpers/setup'

describe('/api/votes', async () => {
  await setup({ dev: true })

  let token: string
  let af: ReturnType<typeof authFetch>

  beforeEach(async () => {
    await resetDatabase()
    await seedData({
      clusters: [
        { id: 1, storyCount: 1 },
        { id: 2, storyCount: 1 },
      ],
      sources: [{ id: 1, domain: 'test.com', name: 'Test', tier: 1 }],
      stories: [
        { id: 1, urlHash: 'h1', url: 'https://test.com/1', headline: 'Story 1', sourceId: 1, clusterId: 1, status: 'active' },
        { id: 2, urlHash: 'h2', url: 'https://test.com/2', headline: 'Story 2', sourceId: 1, clusterId: 2, status: 'active' },
      ],
    })
    const user = await createTestUser()
    token = user.token
    af = authFetch(token)
  })

  describe('POST /api/votes', () => {
    it('casts a new vote', async () => {
      const data = await af('/api/votes', {
        method: 'POST',
        body: { clusterId: 1, vote: 'pass' },
      })
      expect(data).toEqual({ action: 'voted', vote: 'pass' })
    })

    it('toggles off when same vote sent again', async () => {
      await af('/api/votes', { method: 'POST', body: { clusterId: 1, vote: 'pass' } })
      const data = await af('/api/votes', { method: 'POST', body: { clusterId: 1, vote: 'pass' } })
      expect(data).toEqual({ action: 'removed' })
    })

    it('changes vote when different value sent', async () => {
      await af('/api/votes', { method: 'POST', body: { clusterId: 1, vote: 'pass' } })
      const data = await af('/api/votes', { method: 'POST', body: { clusterId: 1, vote: 'fail' } })
      expect(data).toEqual({ action: 'changed', vote: 'fail' })
    })

    it('rejects unauthenticated requests', async () => {
      const status = await fetchStatus('/api/votes', {
        method: 'POST',
        body: { clusterId: 1, vote: 'pass' },
      })
      expect(status).toBe(401)
    })

    it('rejects invalid vote value', async () => {
      const status = await fetchStatus('/api/votes', {
        method: 'POST',
        body: { clusterId: 1, vote: 'maybe' },
        sessionToken: token,
      })
      expect(status).toBe(400)
    })
  })

  describe('DELETE /api/votes', () => {
    it('removes an existing vote', async () => {
      await af('/api/votes', { method: 'POST', body: { clusterId: 1, vote: 'pass' } })
      const data = await af('/api/votes', { method: 'DELETE', body: { clusterId: 1 } })
      expect(data).toEqual({ action: 'removed' })
    })

    it('rejects unauthenticated requests', async () => {
      const status = await fetchStatus('/api/votes', {
        method: 'DELETE',
        body: { clusterId: 1 },
      })
      expect(status).toBe(401)
    })
  })

  describe('GET /api/votes/mine', () => {
    it('returns user vote map', async () => {
      await af('/api/votes', { method: 'POST', body: { clusterId: 1, vote: 'pass' } })
      await af('/api/votes', { method: 'POST', body: { clusterId: 2, vote: 'fail' } })

      const data = await af('/api/votes/mine')
      expect(data).toEqual({ 1: 'pass', 2: 'fail' })
    })

    it('returns empty object when not authenticated', async () => {
      const data = await $fetch('/api/votes/mine')
      expect(data).toEqual({})
    })
  })

  describe('rate limiting', () => {
    it('enforces new account daily limit', async () => {
      const newUser = await createTestUser({
        id: 'new-user',
        email: 'new@test.com',
        createdAt: new Date().toISOString(),
      })
      const newAf = authFetch(newUser.token)

      await seedData({
        clusters: Array.from({ length: 11 }, (_, i) => ({ id: 100 + i, storyCount: 1 })),
        stories: Array.from({ length: 11 }, (_, i) => ({
          id: 100 + i,
          urlHash: `rl-${i}`,
          url: `https://test.com/rl-${i}`,
          headline: `RL Story ${i}`,
          sourceId: 1,
          clusterId: 100 + i,
          status: 'active',
        })),
      })

      // Cast 10 votes (should all succeed)
      for (let i = 0; i < 10; i++) {
        await newAf('/api/votes', {
          method: 'POST',
          body: { clusterId: 100 + i, vote: 'pass' },
        })
      }

      // 11th vote should be rate limited
      const status = await fetchStatus('/api/votes', {
        method: 'POST',
        body: { clusterId: 110, vote: 'pass' },
        sessionToken: newUser.token,
      })
      expect(status).toBe(429)
    })
  })
})
