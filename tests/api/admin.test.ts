import { describe, it, expect, beforeEach } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'
import { resetDatabase, seedData, createTestUser } from '../helpers/seed'
import { authFetch, fetchStatus } from '../helpers/setup'

describe('admin endpoints', async () => {
  await setup({ dev: true })

  let adminToken: string
  let adminAf: ReturnType<typeof authFetch>

  beforeEach(async () => {
    await resetDatabase()
    const admin = await createTestUser({
      id: 'admin-1',
      name: 'Admin',
      email: 'admin@test.com',
      isAdmin: true,
    })
    adminToken = admin.token
    adminAf = authFetch(adminToken)
  })

  describe('GET /api/admin/stats', () => {
    it('returns platform statistics', async () => {
      const data = await adminAf('/api/admin/stats')
      expect(data).toHaveProperty('totalUsers')
      expect(data).toHaveProperty('totalStories')
      expect(data).toHaveProperty('totalVotes')
      expect(data).toHaveProperty('totalPoliticians')
    })

    it('rejects non-admin users', async () => {
      const { token } = await createTestUser({
        id: 'regular',
        email: 'regular@test.com',
      })
      const status = await fetchStatus('/api/admin/stats', {
        sessionToken: token,
      })
      expect(status).toBe(403)
    })

    it('rejects unauthenticated requests', async () => {
      const status = await fetchStatus('/api/admin/stats')
      expect(status).toBe(401)
    })
  })

  describe('GET /api/admin/users', () => {
    it('lists users', async () => {
      await createTestUser({ id: 'user-2', email: 'user2@test.com' })
      const data = await adminAf('/api/admin/users')
      expect(data.users.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('PUT /api/admin/users/:id', () => {
    it('updates user status', async () => {
      const { id } = await createTestUser({ id: 'user-to-ban', email: 'ban@test.com' })
      const data = await adminAf(`/api/admin/users/${id}`, {
        method: 'PUT',
        body: { status: 'suspended' },
      })
      expect(data).toEqual({ ok: true })
    })

    it('rejects invalid status', async () => {
      const status = await fetchStatus('/api/admin/users/someone', {
        method: 'PUT',
        body: { status: 'invalid' },
        sessionToken: adminToken,
      })
      expect(status).toBe(400)
    })
  })

  describe('admin politician CRUD', () => {
    it('creates a politician', async () => {
      await seedData({ electorates: [{ id: 1, name: 'Test', state: 'NSW' }] })
      const data = await adminAf('/api/admin/politicians', {
        method: 'POST',
        body: {
          name: 'New, Polly',
          displayName: 'Polly New',
          party: 'Labor',
          chamber: 'house',
          electorateId: 1,
          state: 'NSW',
        },
      })
      expect(data).toHaveProperty('id')
      expect(data.name).toBe('New, Polly')
    })

    it('lists politicians (admin view)', async () => {
      await seedData({
        electorates: [{ id: 1, name: 'Test', state: 'NSW' }],
        politicians: [
          { id: 1, name: 'Test, One', displayName: 'One Test', party: 'Labor', chamber: 'house', state: 'NSW' },
        ],
      })
      const data = await adminAf('/api/admin/politicians')
      expect(data.politicians.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('admin story moderation', () => {
    beforeEach(async () => {
      await seedData({
        sources: [{ id: 1, domain: 'test.com', name: 'Test', tier: 1 }],
        stories: [
          { id: 1, urlHash: 'h1', url: 'https://test.com/1', headline: 'Pending Story', sourceId: 1, status: 'moderation' },
          { id: 2, urlHash: 'h2', url: 'https://test.com/2', headline: 'Active Story', sourceId: 1, status: 'active' },
        ],
      })
    })

    it('lists stories with status filter', async () => {
      const data = await adminAf('/api/admin/stories?status=moderation')
      expect(data.stories).toHaveLength(1)
      expect(data.stories[0].headline).toBe('Pending Story')
    })

    it('approves a story', async () => {
      const data = await adminAf('/api/admin/stories/1', {
        method: 'PUT',
        body: { status: 'active' },
      })
      expect(data).toEqual({ ok: true })
    })

    it('rejects a story', async () => {
      const data = await adminAf('/api/admin/stories/2', {
        method: 'PUT',
        body: { status: 'rejected' },
      })
      expect(data).toEqual({ ok: true })
    })
  })

  describe('admin source management', () => {
    it('creates and lists sources', async () => {
      const created = await adminAf('/api/admin/sources', {
        method: 'POST',
        body: { domain: 'news.com.au', name: 'News Corp', tier: 2 },
      })
      expect(created).toHaveProperty('id')

      const data = await adminAf('/api/admin/sources')
      expect(data.sources.length).toBeGreaterThanOrEqual(1)
    })
  })
})
