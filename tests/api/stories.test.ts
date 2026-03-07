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
        { id: 1, storyCount: 1, primaryStoryId: 1 },
        { id: 2, storyCount: 1, primaryStoryId: 2 },
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

    it('includes storyCount for each story', async () => {
      const data = await $fetch('/api/stories')
      for (const story of data.stories) {
        expect(story.storyCount).toBeDefined()
        expect(story.storyCount).toBeGreaterThanOrEqual(1)
      }
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

    it('returns clusterStories array', async () => {
      const data = await $fetch('/api/stories/1')
      expect(data.clusterStories).toBeDefined()
      expect(Array.isArray(data.clusterStories)).toBe(true)
    })
  })

  describe('clustering', () => {
    beforeEach(async () => {
      await resetDatabase()
      await seedData({
        electorates: [{ id: 1, name: 'Wentworth', state: 'NSW' }],
        politicians: [
          { id: 1, name: 'Smith, Jane', displayName: 'Jane Smith', party: 'Labor', chamber: 'house', electorateId: 1, state: 'NSW' },
          { id: 2, name: 'Doe, John', displayName: 'John Doe', party: 'Liberal', chamber: 'senate', state: 'VIC' },
        ],
        sources: [
          { id: 1, domain: 'abc.net.au', name: 'ABC News', tier: 1 },
          { id: 2, domain: 'smh.com.au', name: 'SMH', tier: 1 },
        ],
        clusters: [
          { id: 1, storyCount: 2, primaryStoryId: 1 },
          { id: 2, storyCount: 1, primaryStoryId: 3 },
        ],
        stories: [
          { id: 1, urlHash: 'c1', url: 'https://abc.net.au/budget', headline: 'Budget announcement shocks nation', sourceId: 1, clusterId: 1, status: 'active' },
          { id: 2, urlHash: 'c2', url: 'https://smh.com.au/budget', headline: 'Federal budget reveals spending cuts', sourceId: 2, clusterId: 1, status: 'active' },
          { id: 3, urlHash: 'c3', url: 'https://abc.net.au/other', headline: 'Unrelated story', sourceId: 1, clusterId: 2, status: 'active' },
        ],
        storyPoliticians: [
          { storyId: 1, politicianId: 1 },
          { storyId: 2, politicianId: 2 },
          { storyId: 3, politicianId: 1 },
        ],
      })
    })

    it('feed shows one card per cluster with storyCount', async () => {
      const data = await $fetch('/api/stories')
      // Should show 2 stories (one per cluster), not 3
      expect(data.stories).toHaveLength(2)
      const budgetStory = data.stories.find((s: any) => s.headline === 'Budget announcement shocks nation')
      expect(budgetStory).toBeDefined()
      expect(budgetStory.storyCount).toBe(2)
    })

    it('feed includes otherSources for multi-story clusters', async () => {
      const data = await $fetch('/api/stories')
      const budgetStory = data.stories.find((s: any) => s.headline === 'Budget announcement shocks nation')
      expect(budgetStory.otherSources).toHaveLength(1)
      expect(budgetStory.otherSources[0].headline).toBe('Federal budget reveals spending cuts')
      expect(budgetStory.otherSources[0].source.name).toBe('SMH')
    })

    it('feed unions politicians across cluster stories', async () => {
      const data = await $fetch('/api/stories')
      const budgetStory = data.stories.find((s: any) => s.headline === 'Budget announcement shocks nation')
      // Should have both politicians (one from each story in cluster)
      expect(budgetStory.politicians).toHaveLength(2)
      const names = budgetStory.politicians.map((p: any) => p.name).sort()
      expect(names).toEqual(['Doe, John', 'Smith, Jane'])
    })

    it('story detail includes clusterStories', async () => {
      const data = await $fetch('/api/stories/1')
      expect(data.clusterStories).toHaveLength(1)
      expect(data.clusterStories[0].headline).toBe('Federal budget reveals spending cuts')
      expect(data.clusterStories[0].source.name).toBe('SMH')
    })

    it('story detail unions politicians across cluster', async () => {
      const data = await $fetch('/api/stories/1')
      expect(data.politicians).toHaveLength(2)
    })

    it('single-story cluster has empty otherSources and clusterStories', async () => {
      const feedData = await $fetch('/api/stories')
      const unrelated = feedData.stories.find((s: any) => s.headline === 'Unrelated story')
      expect(unrelated.storyCount).toBe(1)
      expect(unrelated.otherSources).toHaveLength(0)

      const detailData = await $fetch('/api/stories/3')
      expect(detailData.clusterStories).toHaveLength(0)
    })
  })
})
