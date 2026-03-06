import type { BetterAuthClientOptions, InferSessionFromClient, InferUserFromClient } from 'better-auth/client'

export function useAuth() {
  const client = useAuthClient()
  const headers = import.meta.server ? useRequestHeaders() : undefined

  const session = useState<InferSessionFromClient<BetterAuthClientOptions> | null>('auth:session', () => null)
  const user = useState<InferUserFromClient<BetterAuthClientOptions> | null>('auth:user', () => null)
  const sessionFetching = import.meta.server ? ref(false) : useState('auth:sessionFetching', () => false)

  const fetchSession = async () => {
    if (sessionFetching.value) return
    sessionFetching.value = true
    const { data } = await client.getSession({
      fetchOptions: { headers },
    })
    session.value = data?.session || null
    user.value = data?.user || null
    sessionFetching.value = false
    return data
  }

  if (import.meta.client) {
    client.$store.listen('$sessionSignal', async (signal) => {
      if (!signal) return
      await fetchSession()
    })
  }

  return {
    session,
    user,
    loggedIn: computed(() => !!session.value),
    fetchSession,
    async signOut(redirectTo?: string) {
      await client.signOut()
      session.value = null
      user.value = null
      if (redirectTo) {
        await navigateTo(redirectTo)
      }
    },
    client,
  }
}
