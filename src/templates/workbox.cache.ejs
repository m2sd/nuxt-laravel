const CACHE_NAME = '<%= options.name %>'
const TOKEN_ENDPOINT = '<%= options.endpoint %>'

workbox.routing.registerRoute(
  TOKEN_ENDPOINT,
  async ({ event }) => {
    const { request } = event

    const body = await request.json()
    const response = new Response(
      JSON.stringify({
        success: body
      })
    )

    const cache = await caches.open(CACHE_NAME)
    await cache.put(TOKEN_ENDPOINT, response.clone())

    return response
  },
  'PUT'
)

workbox.routing.registerRoute(TOKEN_ENDPOINT, async () => {
  const cache = await caches.open(CACHE_NAME)
  const response = await cache.match(TOKEN_ENDPOINT)

  return response || new Response('{}')
})
