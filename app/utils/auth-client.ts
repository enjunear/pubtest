import { createAuthClient } from 'better-auth/vue'

export function useAuthClient() {
  const url = useRequestURL()
  const headers = import.meta.server ? useRequestHeaders() : undefined

  return createAuthClient({
    baseURL: url.origin,
    fetchOptions: { headers },
  })
}
