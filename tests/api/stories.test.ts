import { describe, it, expect, beforeEach } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'
import { resetDatabase, seedData } from '../helpers/seed'
import { fetchStatus } from '../helpers/setup'

describe('/api/stories', async () => {
  await setup({ dev: true })

  beforeEach(async () => {
    await resetDatabase()
    await seedData({
      electorates: [{ id: 1, name: 'Wentworth', state: 'NSW' }],
      politicians: [
        { id: 1, name: 'Smith, Jane', displayName: 'Jane Smith', party: 'Labor', chamber: 'house', electorateId: 1, state: 'NSW' },
      ],
      sources: [{ id: 1, domain: 'abc.net.au', name: 'ABC News', tier: 1 }],
      clusters: [
        { id: 1, storyCount: 1 },
        { id: 2, storyCount: 1 },
      ],
      stories: [
        { id: 1, urlHash: 'h1', url: 'https://abc.net.au/1', headline: 'First Story', sourceId: 1, clusterId: 1, status: 'active' },
        { id: 2, urlHash: 'h2', url: 'https://abc.net.au/2', headline: 'Second Story', sourceId: 1, clusterId: 2, status: 'active' },
        { id: 3, urlHash: 'h3', url: 'https://abc.net.au/3', headline: 'Hidden Story', sourceId: 1, status: 'moderation' },
      ],
      storyPoliticians: [
        { storyId: 1, politicianId: 1 },
      ],
    })
  })

  describe('GET /api/stories', () => {
    it('returns active stories only', async () => {
      const data = await $fetch('/api/stories')
      expect(data.stories).toHaveLength(2)
      expect(data.stories.every((s: any) => s.headline !== 'Hidden Story')).toBe(true)
    })

    it('includes source and politician data', async () => {
      const data = await $fetch('/api/stories')
      const first = data.stories.find((s: any) => s.headline === 'First Story')
      expect(first.source).toEqual({ name: 'ABC News', domain: 'abc.net.au' })
      expect(first.politicians).toHaveLength(1)
      expect(first.politicians[0].name).toBe('Smith, Jane')
    })

    it('paginates results', async () => {
      const data = await $fetch('/api/stories?limit=1&page=1')
      expect(data.stories).toHaveLength(1)
      expect(data.hasMore).toBe(true)
    })
  })

  describe('GET /api/stories/:id', () => {
    it('returns story detail with politicians and vote counts', async () => {
      const data = await $fetch('/api/stories/1')
      expect(data.headline).toBe('First Story')
      expect(data.source).toEqual({ name: 'ABC News', domain: 'abc.net.au' })
      expect(data.politicians).toHaveLength(1)
      expect(data.totalVotes).toBe(0)
    })

    it('returns 404 for missing story', async () => {
      const status = await fetchStatus('/api/stories/999')
      expect(status).toBe(404)
    })
  })
})
