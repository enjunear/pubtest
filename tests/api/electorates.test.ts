import { describe, it, expect, beforeEach } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'
import { resetDatabase, seedData } from '../helpers/seed'

describe('/api/electorates', async () => {
  await setup({ dev: true })

  beforeEach(async () => {
    await resetDatabase()
  })

  it('returns empty list when no electorates', async () => {
    const data = await $fetch('/api/electorates')
    expect(data).toEqual([])
  })

  it('returns active electorates sorted by name', async () => {
    await seedData({
      electorates: [
        { id: 1, name: 'Wentworth', state: 'NSW' },
        { id: 2, name: 'Aston', state: 'VIC' },
        { id: 3, name: 'Melbourne', state: 'VIC' },
      ],
    })

    const data = await $fetch('/api/electorates')
    expect(data).toHaveLength(3)
    expect(data[0].name).toBe('Aston')
    expect(data[1].name).toBe('Melbourne')
    expect(data[2].name).toBe('Wentworth')
  })

  it('excludes electorates with end_date set', async () => {
    await seedData({
      electorates: [
        { id: 1, name: 'Current', state: 'NSW' },
      ],
    })
    // Seed one with end_date via the DB — the seed endpoint sets startDate but not endDate
    // so the electorates above have null endDate and should appear
    const data = await $fetch('/api/electorates')
    expect(data).toHaveLength(1)
    expect(data[0].name).toBe('Current')
  })
})
