export default defineEventHandler((event) => {
  return serverAuth(event).handler(toWebRequest(event))
})
