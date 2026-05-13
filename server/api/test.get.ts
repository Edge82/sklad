export default defineEventHandler(async (event: any) => {
  return {
    status: 'ok',
    message: 'API is working',
    path: event.node.req.url,
    method: event.node.req.method
  }
})
