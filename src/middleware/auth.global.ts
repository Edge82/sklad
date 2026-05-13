/**
 * middleware/auth.global.ts
 * 
 * Route Guard - выполняется перед каждым переходом по маршруту
 * Проверяет наличие токена для protected routes
 */

export default defineRouteMiddleware(async (to, from) => {
  const userStore = useUserStore()

  // Если пользователь уже авторизован
  if (userStore.isAuthenticated) {
    return
  }

  // Публичные маршруты (не требуют авторизации)
  const publicRoutes = ['/login']

  // Если переходим на публичный маршрут
  if (publicRoutes.includes(to.path)) {
    return
  }

  // Если требуется авторизация - редирект на логин
  // (проверяем наличие токена в localStorage)
  const token = localStorage.getItem('auth_token')

  if (!token) {
    // Нет токена - редирект на login
    await navigateTo('/login')
    return
  }

  // Пытаемся восстановить сессию из сохранённого токена
  try {
    await userStore.restoreSessionFromToken(token)
  } catch (error) {
    console.error('[Auth] Failed to restore session:', error)
    localStorage.removeItem('auth_token')
    await navigateTo('/login')
  }
})
