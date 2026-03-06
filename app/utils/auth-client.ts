import { createAuthClient } from 'better-auth/vue'
import { magicLinkClient } from 'better-auth/client/plugins'

export function useAuthClient() {
  const url = useRequestURL()
  const headers = import.meta.server ? useRequestHeaders() : undefined

  return createAuthClient({
    baseURL: url.origin,
    fetchOptions: { headers },
    plugins: [magicLinkClient()],
  })
}
