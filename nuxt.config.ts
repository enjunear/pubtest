// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxt/ui'],

  nitro: {
    preset: 'cloudflare-pages',
  },

  runtimeConfig: {
    public: {
      auth: {
        redirectGuestTo: '/login',
        redirectUserTo: '/',
      },
    },
  },
})
