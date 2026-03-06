// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxt/ui'],

  nitro: {
    preset: 'cloudflare-pages',
  },

  // Future: add runtimeConfig for secrets
  // runtimeConfig: {
  //   betterAuthSecret: '',
  //   googleClientId: '',
  //   googleClientSecret: '',
  //   resendApiKey: '',
  //   turnstileSecretKey: '',
  //   public: {
  //     turnstileSiteKey: '',
  //   },
  // },
})
