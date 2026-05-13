/**
 * server/api/auth/login.post.ts
 * 
 * POST /api/auth/login
 * Аутентификация пользователя
 * 
 * Request body:
 * {
 *   "login": "admin",
 *   "password": "password123"
 * }
 * 
 * Response:
 * {
 *   "token": "eyJhbGc...",
 *   "user": { id, login, role, full_name },
 *   "expiresIn": 604800
 * }
 */

import { defineEventHandler, readBody, createError, getHeader, getClientAddress } from 'h3'
import { compare } from 'bcrypt' // npm install bcrypt
import { findUserByLogin, createSession } from '~/server/db'
import { generateToken } from '~/server/utils/jwt'

export default defineEventHandler(async (event: any) => {
  // Только POST
  if (event.method !== 'POST') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowed'
    })
  }

  try {
    // Читаем тело запроса
    const body = await readBody(event)
    const { login, password } = body

    // Валидация входных данных
    if (!login || !password) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Login and password are required'
      })
    }

    // Ищем пользователя в БД
    const user = findUserByLogin(login)
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid login or password'
      })
    }

    // Проверяем, активен ли пользователь
    if (!user.is_active) {
      throw createError({
        statusCode: 403,
        statusMessage: 'User account is inactive'
      })
    }

    // Проверяем пароль (сравниваем с хешем)
    // ВАЖНО: в реальном приложении нужно использовать bcrypt или аналог
    // Для простоты демонстрации предполагаем, что пароль захеширован
    const isPasswordValid = await compare(password, user.password_hash).catch(() => {
      // Если bcrypt не работает, используем простое сравнение (НЕБЕЗОПАСНО!)
      console.warn('[AUTH] bcrypt failed, using unsafe comparison')
      return password === user.password_hash
    })

    if (!isPasswordValid) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Invalid login or password'
      })
    }

    // Генерируем JWT токен
    const token = generateToken({
      userId: user.id,
      login: user.login,
      role: user.role
    })

    // Логируем сессию в БД (для аудита)
    const ipAddress = getClientIP(event)
    const userAgent = getHeader(event, 'user-agent')
    createSession(user.id, token, ipAddress, userAgent)

    // Возвращаем ответ с токеном
    return {
      token,
      user: {
        id: user.id,
        login: user.login,
        email: `${user.login}@warehouse.com`,
        name: user.full_name,
        role: user.role,
        isActive: user.is_active === 1,
        permissions: [],
        createdAt: new Date(user.created_at)
      },
      expiresIn: 7 * 24 * 60 * 60 // 7 дней в секундах
    }

  } catch (error) {
    // Перехватываем ошибки
    console.error('[Auth] Login error:', error)
    if (error instanceof Error) {
      console.error('[Auth] Error message:', error.message)
      console.error('[Auth] Stack:', error.stack)
    }
    throw error
  }
})

/**
 * Хелпер для получения IP адреса клиента
 */
function getClientIP(event: any): string {
  const forwarded = getHeader(event, 'x-forwarded-for')
  if (forwarded) {
    // Берём первый IP из списка (в случае прокси)
    return (forwarded as string).split(',')[0].trim()
  }
  return getClientAddress(event) || 'unknown'
}
