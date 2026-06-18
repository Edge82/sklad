import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'

// Перехватчик fetch для автоматического разлогина при истечении токена
const originalFetch = window.fetch

window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await originalFetch.call(this, input, init)

  // Если ответ 401 или 403 — токен истёк или невалиден
  if (response.status === 401 || response.status === 403) {
    // Проверяем, что это API-запрос (не статика)
    const url = typeof input === 'string' ? input : input.toString()
    if (url.includes('/sklad/api/') || url.includes('/api/')) {
      const userStore = useUserStore()
      const router = useRouter()

      // Очищаем сессию
      userStore.token = null
      userStore.user = null
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_data')

      // Редирект на логин
      router.push('/login')
    }
  }

  return response
}
