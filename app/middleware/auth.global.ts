interface AuthMetaOptions {
  only?: 'guest' | 'user'
}

declare module '#app' {
  interface PageMeta {
    auth?: false | AuthMetaOptions
  }
}

declare module 'vue-router' {
  interface RouteMeta {
    auth?: false | AuthMetaOptions
  }
}

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.meta?.auth === false) return

  const { loggedIn, fetchSession } = useAuth()

  // Fetch session on client-side navigation
  if (import.meta.client) {
    await fetchSession()
  }

  const meta = to.meta?.auth as AuthMetaOptions | undefined
  if (!meta?.only) return

  // Guest-only pages (login): redirect logged-in users away
  if (meta.only === 'guest' && loggedIn.value) {
    if (to.path === '/') return
    return navigateTo('/')
  }

  // User-only pages: redirect guests to login
  if (meta.only === 'user' && !loggedIn.value) {
    if (to.path === '/login') return
    return navigateTo('/login')
  }
})
