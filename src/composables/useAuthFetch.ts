import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'

/**
 * Декодирует JWT payload без верификации подписи.
 * JWT — это три base64-блока, второй — payload.
 */
function decodeJwtPayload(token: string): any {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = atob(parts[1])
    return JSON.parse(payload)
  } catch {
    return null
  }
}

/**
 * Проверяет, истёк ли токен (с запасом 5 минут).
 */
function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token)
  if (!payload || !payload.exp) return false
  const now = Date.now() / 1000
  // Истёк или истечёт менее чем через 5 минут
  return payload.exp - now < 300
}

function clearSession() {
  const userStore = useUserStore()
  const router = useRouter()
  userStore.token = null
  userStore.user = null
  localStorage.removeItem('auth_token')
  localStorage.removeItem('user_data')
  router.push('/login')
}

// Перехватчик fetch для автоматического разлогина при истечении токена
const originalFetch = window.fetch

window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input.toString()
  const isApiCall = url.includes('/sklad/api/') || url.includes('/api/')

  // Проверяем истечение токена перед API-запросом
  if (isApiCall) {
    const token = localStorage.getItem('auth_token')
    if (token && isTokenExpired(token)) {
      clearSession()
      return originalFetch.call(this, input, init)
    }
  }

  const response = await originalFetch.call(this, input, init)

  // Если ответ 401 или 403 — токен невалиден
  if (response.status === 401 || response.status === 403) {
    if (isApiCall) {
      clearSession()
    }
  }

  return response
}
