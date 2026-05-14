/**
 * server/services/onec.service.ts
 *
 * Единая точка входа для всех запросов к 1С OData API
 * Обрабатывает:
 * - Базовую аутентификацию (login:password)
 * - Формирование правильных заголовков
 * - Ошибки подключения
 * - Кэширование (опционально)
 */

interface OnecRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: Record<string, any>
  timeout?: number
}

interface OnecServiceConfig {
  baseUrl: string
  login: string
  password: string
}

/**
 * Получить конфиг из переменных окружения
 */
function getConfig(): OnecServiceConfig {
  const baseUrl = process.env.ONEC_BASE_URL || 'http://192.168.1.100:8080/odata/standard.odata'
  const login = process.env.ONEC_LOGIN || 'admin'
  const password = process.env.ONEC_PASSWORD || 'admin'

  if (!baseUrl) {
    throw new Error('ONEC_BASE_URL не установлен в .env')
  }

  return { baseUrl, login, password }
}

/**
 * Создать Basic Auth заголовок
 * Authorization: Basic base64(login:password)
 */
function getBasicAuthHeader(login: string, password: string): string {
  const credentials = `${login}:${password}`
  const encoded = Buffer.from(credentials).toString('base64')
  return `Basic ${encoded}`
}

/**
 * Основная функция для запроса к 1С
 *
 * @param endpoint - путь после базового URL (например: "/Catalog_Materials")
 * @param options - опции запроса (method, body, timeout)
 * @returns Парсенный JSON ответ от 1С
 *
 * @example
 * const materials = await onecRequest('/Catalog_Materials?$format=json')
 * const movement = await onecRequest('/Document_MovementOfMaterials', { method: 'POST', body: {...} })
 */
export async function onecRequest(
  endpoint: string,
  options: OnecRequestOptions = {}
): Promise<any> {
  const config = getConfig()
  const { method = 'GET', body, timeout = 30000 } = options

  // Формируем полный URL
  const url = `${config.baseUrl}${endpoint}`

  try {
    // Готовим заголовки
    const headers: Record<string, string> = {
      'Authorization': getBasicAuthHeader(config.login, config.password),
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }

    // Формируем fetch опции
    const fetchOptions: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(timeout)
    }

    // Добавляем body для POST/PUT
    if (body && (method === 'POST' || method === 'PUT')) {
      fetchOptions.body = JSON.stringify(body)
    }

    // console.log(`[1C] ${method} ${url}`) // Debug логирование

    // Отправляем запрос
    const response = await fetch(url, fetchOptions)

    // Обработка ошибок HTTP
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `[1C] HTTP ${response.status}: ${response.statusText}\n${errorText}`
      )
    }

    // Парсим JSON
    const data = await response.json()
    return data

  } catch (error) {
    // Обработка timeout, network errors и т.д.
    if (error instanceof Error) {
      console.error(`[1C Service Error] ${endpoint}:`, error.message)
      throw new Error(`Ошибка при запросе к 1С: ${error.message}`)
    }
    throw error
  }
}

/**
 * Удобные обёртки для часто используемых запросов
 */

export async function getStocks(filter?: string) {
  const query = filter ? `?$filter=${encodeURIComponent(filter)}&$format=json` : '?$format=json'
  return onecRequest(`/Catalog_Materials${query}`)
}

export async function getGoods(filter?: string) {
  const query = filter ? `?$filter=${encodeURIComponent(filter)}&$format=json` : '?$format=json'
  return onecRequest(`/Catalog_Goods${query}`)
}

export async function createMovement(data: Record<string, any>) {
  return onecRequest('/Document_MovementOfMaterials', {
    method: 'POST',
    body: data
  })
}

export async function getEmployees() {
  return onecRequest('/Catalog_Employees?$format=json')
}

export async function getOrders(filter?: string) {
  const query = filter ? `?$filter=${encodeURIComponent(filter)}&$format=json` : '?$format=json'
  return onecRequest(`/Document_Orders${query}`)
}
