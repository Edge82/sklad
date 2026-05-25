/**
 * Функции для работы с JWT и проверки ролей
 */
import jwt from 'jsonwebtoken'
import { JWT_SECRET } from './config.js'

/**
 * Извлекает роль пользователя из JWT токена в запросе
 */
export function getUserRoleFromRequest(req) {
  try {
    // Пробуем получить токен из заголовка Authorization
    const authHeader = req.headers.authorization || ''
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })
      return payload?.role || null
    }

    // Пробуем получить токен из кук
    const cookies = req.headers.cookie || ''
    const authTokenMatch = cookies.match(/auth_token=([^;]+)/)
    if (authTokenMatch) {
      const token = decodeURIComponent(authTokenMatch[1])
      const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })
      return payload?.role || null
    }

    return null
  } catch {
    return null
  }
}

/**
 * Проверяет, есть ли у пользователя одна из разрешённых ролей
 */
export function requireRole(res, allowedRoles) {
  const role = getUserRoleFromRequest(res.req || res)
  if (!role || !allowedRoles.includes(role)) {
    return false
  }
  return true
}
