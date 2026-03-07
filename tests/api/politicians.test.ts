import { describe, it, expect, beforeEach } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'
import { resetDatabase, seedData, createTestUser } from '../helpers/seed'
import { authFetch, fetchStatus } from '../helpers/setup'

describe('/api/politicians', async () => {
  await setup({ dev: true })

  beforeEach(async () => {
    await resetDatabase()
    await seedData({
      electorates: [
        { id: 1, name: 'Wentworth', state: 'NSW' },
        { id: 2, name: 'Melbourne', state: 'VIC' },
      ],
      politicians: [
        { id: 1, name: 'Smith, Jane', displayName: 'Jane Smith', party: 'Labor', chamber: 'house', electorateId: 1, state: 'NSW' },
        { id: 2, name: 'Jones, Bob', displayName: 'Bob Jones', party: 'Liberal', chamber: 'senate', state: 'VIC' },
        { id: 3, name: 'Lee, Sarah', displayName: 'Sarah Lee', party: 'Greens', chamber: 'house', electorateId: 2, state: 'VIC' },
      ],
    })
  })

  describe('GET /api/politicians', () => {
    it('returns politicians list', async () => {
      const data = await $fetch('/api/politicians')
      expect(data.politicians).toHaveLength(3)
      expect(data.page).toBe(1)
    })

    it('filters by party', async () => {
      const data = await $fetch('/api/politicians?party=Labor')
      expect(data.politicians).toHaveLength(1)
      expect(data.politicians[0].party).toBe('Labor')
    })

    it('filters by chamber', async () => {
      const data = await $fetch('/api/politicians?chamber=senate')
      expect(data.politicians).toHaveLength(1)
      expect(data.politicians[0].name).toBe('Jones, Bob')
    })

    it('filters by search', async () => {
      const data = await $fetch('/api/politicians?search=Lee')
      expect(data.politicians).toHaveLength(1)
      expect(data.politicians[0].displayName).toBe('Sarah Lee')
    })
  })

  describe('GET /api/politicians/:id', () => {
    it('returns politician detail', async () => {
      const data = await $fetch('/api/politicians/1')
      expect(data.politician.displayName).toBe('Jane Smith')
      expect(data.politician.electorateName).toBe('Wentworth')
    })

    it('returns 404 for missing politician', async () => {
      const status = await fetchStatus('/api/politicians/999')
      expect(status).toBe(404)
    })
  })

  describe('GET /api/politicians/:id/approval', () => {
    it('returns zero counts with no votes', async () => {
      const data = await $fetch('/api/politicians/1/approval')
      expect(data.politicianId).toBe(1)
      expect(data.totalVotes).toBe(0)
      expect(data.approvalPct).toBeNull()
    })

    it('calculates approval from linked story votes', async () => {
      const { token } = await createTestUser()
      await seedData({
        sources: [{ id: 1, domain: 'test.com', name: 'Test News' }],
        clusters: [{ id: 1, storyCount: 1 }],
        stories: [{ id: 1, urlHash: 'hash1', url: 'https://test.com/1', headline: 'Test', sourceId: 1, clusterId: 1 }],
        storyPoliticians: [{ storyId: 1, politicianId: 1 }],
      })

      const af = authFetch(token)
      await af('/api/votes', { method: 'POST', body: { clusterId: 1, vote: 'pass' } })

      const data = await $fetch('/api/politicians/1/approval')
      expect(data.passCount).toBe(1)
      expect(data.totalVotes).toBe(1)
      expect(data.approvalPct).toBe(100)
    })
  })
})
