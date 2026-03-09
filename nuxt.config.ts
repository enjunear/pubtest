// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  app: {
    head: {
      titleTemplate: '%s - The Pub Test',
      meta: [
        { name: 'description', content: 'Hold Australian politicians accountable. Vote on whether their actions pass the pub test.' },
      ],
    },
  },

  css: ['~/assets/css/main.css'],

  modules: ['@nuxt/ui', '@nuxtjs/turnstile'],

  turnstile: {
    siteKey: '1x00000000000000000000AA',
  },

  nitro: {
    preset: 'cloudflare-pages',
  },

  runtimeConfig: {
    turnstile: {
      secretKey: '1x0000000000000000000000000000000AA',
    },
    public: {
      auth: {
        redirectGuestTo: '/login',
        redirectUserTo: '/',
      },
    },
  },
})
