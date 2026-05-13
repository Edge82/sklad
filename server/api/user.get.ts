/**
 * server/api/user.get.ts
 * 
 * GET /api/user
 * Возвращает информацию о текущем авторизованном пользователе
 * Требует валидный JWT токен
 */

import { defineEventHandler, createError } from 'h3'
import { findUserById } from '~/server/db'

export default defineEventHandler((event) => {
  // Проверяем, есть ли информация о пользователе в контексте
  const user = event.context.user

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  // Получаем полную информацию о пользователе из БД
  const userFromDb = findUserById(user.id)

  if (!userFromDb) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found'
    })
  }

  // Возвращаем данные (без password_hash!)
  return {
    id: userFromDb.id,
    login: userFromDb.login,
    fullName: userFromDb.full_name,
    role: userFromDb.role,
    isActive: userFromDb.is_active === 1,
    createdAt: userFromDb.created_at,
    updatedAt: userFromDb.updated_at
  }
})
