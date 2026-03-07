import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

describe('/api/health', async () => {
  await setup({ dev: true })

  it('returns ok', async () => {
    const data = await $fetch('/api/health')
    expect(data).toHaveProperty('status', 'ok')
    expect(data).toHaveProperty('timestamp')
  })
})
