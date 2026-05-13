import { ref, computed } from 'vue'
import { useUserStore } from '@/stores/user'

export function useOnec() {
  const userStore = useUserStore() as any
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Выполнить запрос к 1С через API
   */
  async function request(
    endpoint: string,
    options: RequestInit = {}
  ) {
    isLoading.value = true
    error.value = null

    try {
      const url = `http://localhost:8000/sklad/api/onec/${endpoint}`

      const headers: HeadersInit = {
        ...(options.headers || {}),
        'Authorization': `Bearer ${userStore.token}`
      }

      const response = await fetch(url, {
        ...options,
        headers
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return response.json()

    } catch (err) {
      if (err instanceof Error) {
        error.value = err.message
      } else {
        error.value = String(err)
      }
      throw err

    } finally {
      isLoading.value = false
    }
  }

  /**
   * GET запрос к 1С
   */
  async function get(endpoint: string, query?: Record<string, any>) {
    let url = endpoint
    if (query) {
      const params = new URLSearchParams()
      Object.entries(query).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          params.append(key, String(value))
        }
      })
      const queryString = params.toString()
      if (queryString) {
        url += `?${queryString}`
      }
    }

    return request(url, { method: 'GET' })
  }

  /**
   * POST запрос к 1С
   */
  async function post(endpoint: string, data: any) {
    return request(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
  }

  /**
   * Хелпер для получения материалов/товаров
   */
  async function getStocks(filter?: string) {
    const query = filter
      ? { $filter: filter }
      : undefined

    const response = await get('stocks', query)
    return response?.data || response
  }

  /**
   * Хелпер для получения готовой продукции
   */
  async function getGoods(filter?: string) {
    const query = filter
      ? { $filter: filter }
      : undefined

    const response = await get('goods', query)
    return response?.data || response
  }

  /**
   * Хелпер для создания движения товара
   */
  async function createMovement(data: any) {
    return post('Document_Movement', data)
  }

  /**
   * Получить заказы
   */
  async function getOrders(filter?: string) {
    const query = filter
      ? { $filter: filter }
      : undefined
    const response = await get('orders', query)
    return response?.data || response
  }

  /**
   * Получить сотрудников
   */
  async function getEmployees(filter?: string) {
    const query = filter
      ? { $filter: filter }
      : undefined
    const response = await get('employees', query)
    return response?.data || response
  }

  return {
    // Состояние
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),

    // Методы
    request,
    get,
    post,

    // Специальные методы
    getStocks,
    getGoods,
    createMovement,
    getOrders,
    getEmployees
  }
}
