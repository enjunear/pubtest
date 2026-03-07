export default defineNuxtRouteMiddleware(async () => {
  const { loggedIn } = useAuth()
  if (!loggedIn.value) return navigateTo('/login')

  const isAdmin = useState<boolean | null>('admin:isAdmin', () => null)

  if (isAdmin.value === null) {
    try {
      const headers = import.meta.server ? useRequestHeaders() : undefined
      const data = await $fetch('/api/me', { headers })
      isAdmin.value = !!data?.profile?.isAdmin
    }
    catch {
      isAdmin.value = false
    }
  }

  if (!isAdmin.value) return navigateTo('/')
})
