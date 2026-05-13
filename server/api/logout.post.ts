/**
 * server/api/logout.post.ts
 * 
 * POST /api/logout
 * Логаут пользователя (опционально - просто удаляет токен на клиенте)
 * На сервере можно добавить инвалидацию токена
 */

import { defineEventHandler, createError } from 'h3'

export default defineEventHandler((event) => {
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Not authenticated'
    })
  }

  console.log(`[Auth] User ${user.login} logged out`)

  // В будущем здесь можно добавить:
  // - Удаление сессии из БД
  // - Инвалидацию токена
  // - Очистку кэшей

  return {
    statusCode: 200,
    message: 'Logged out successfully'
  }
})
