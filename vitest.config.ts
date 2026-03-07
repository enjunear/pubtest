import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
  },
})
