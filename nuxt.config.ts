// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  extends: ['github:rhyden153/neogames-ui'],
  css: ['~/assets/main.css'],
  runtimeConfig: {
    leaderboard: { redisUrlEnv: 'PITFALL_SCORES_REDIS_URL' },
    public: { leaderboard: { game: 'pitfall' } },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      meta: [{ name: 'theme-color', content: '#233d2f' }],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }]
    }
  }
})
