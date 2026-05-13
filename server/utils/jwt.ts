/**
 * server/utils/jwt.ts
 * 
 * Работа с JWT токенами
 * - Генерация токена при логине
 * - Проверка и распарсивание токена
 */

import jwt from 'jsonwebtoken'

export interface JwtPayload {
  userId: number
  login: string
  role: string
  iat?: number
  exp?: number
}

/**
 * Получить SECRET из .env
 * Если не установлен, используем дефолтный (НЕБЕЗОПАСНО для production!)
 */
function getSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    console.warn('[JWT] JWT_SECRET не установлен, используется дефолтный (ВНИМАНИЕ: небезопасно!)')
    return 'dev-secret-change-in-production-plz'
  }
  return secret
}

/**
 * Сгенерировать JWT токен
 * Токен содержит: userId, login, role
 * Срок действия: 7 дней
 */
export function generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  const secret = getSecret()
  const token = jwt.sign(payload, secret, {
    expiresIn: '7d', // 7 дней
    algorithm: 'HS256'
  })
  return token
}

/**
 * Проверить и распарсить токен
 * @param token - JWT строка из заголовка Authorization: Bearer <token>
 * @returns JwtPayload с данными или null если невалиден
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const secret = getSecret()
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] })
    return payload as JwtPayload
  } catch (error) {
    // Токен невалиден, истёк, или подделан
    console.log('[JWT] Invalid token:', error instanceof Error ? error.message : 'unknown')
    return null
  }
}

/**
 * Извлечь токен из заголовка Authorization
 * @param authHeader - строка вида "Bearer eyJhbGc..."
 * @returns токен без "Bearer " или null если формат неправильный
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) return null

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null
  }

  return parts[1]
}

/**
 * Декодировать токен БЕЗ проверки подписи
 * Используется для получения информации из истёкшего токена
 * (опционально - может не потребоваться)
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    const payload = jwt.decode(token)
    return payload as JwtPayload | null
  } catch {
    return null
  }
}
