/**
 * server/middleware/auth.ts
 * 
 * Проверяет JWT токен для всех запросов к /api/onec/*
 * Если токен невалиден - возвращает 401
 * Если токен валиден - добавляет user info в event
 */

import { defineEventHandler, createError, getHeader } from 'h3'
import { extractTokenFromHeader, verifyToken } from '~/server/utils/jwt'

export default defineEventHandler((event: any) => {
  // Проверяем только /api/onec/* маршруты
  const url = event.node.req.url || ''
  if (!url.startsWith('/api/onec')) {
    return // Пропускаем другие маршруты
  }

  // Извлекаем токен из заголовка Authorization
  const authHeader = getHeader(event, 'authorization')
  const token = extractTokenFromHeader(authHeader)

  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Missing or invalid Authorization header',
      data: {
        error: 'Token required',
        hint: 'Add "Authorization: Bearer <token>" header'
      }
    })
  }

  // Проверяем токен
  const payload = verifyToken(token)

  if (!payload) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Invalid or expired token',
      data: {
        error: 'Token verification failed',
        hint: 'Please login again'
      }
    })
  }

  // Сохраняем информацию о пользователе в контексте event
  // Доступно в API маршрутах как event.context.user
  event.context.user = {
    id: payload.userId,
    login: payload.login,
    role: payload.role
  }

  console.log(`[Auth] User ${payload.login} (${payload.role}) accessing ${event.node.req.method} ${url}`)
})

/**
 * Типизация для TypeScript
 * Добавить в types/h3.d.ts или app.config.ts
 */
interface UserContext {
  user?: {
    id: number
    login: string
    role: string
  }
}
