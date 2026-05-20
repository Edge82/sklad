/**
 * Конфигурация приложения
 * Загружает переменные окружения из .env
 */
import { config } from 'dotenv'
config()

export const PORT = process.env.BACKEND_PORT || process.env.PORT || 8000
export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'

export const ONEC_CONFIG = {
  baseUrl: process.env.ONEC_BASE_URL || process.env.VITE_1C_BASE_URL || 'http://192.168.1.100:8080/1c-demo/odata/standard.odata',
  username: process.env.ONEC_LOGIN || process.env.VITE_1C_USERNAME || 'admin',
  password: process.env.ONEC_PASSWORD || process.env.VITE_1C_PASSWORD || 'password',
  warehouseGuid: process.env.WAREHOUSE_GUID || process.env.VITE_1C_WAREHOUSE_GUID || 'd8da6724-e264-11f0-862e-fa163e5c9fa8',
  timeout: parseInt(process.env.API_TIMEOUT || '60000', 10) // 60 секунд для реальной 1C
}

// Debug: выводим конфиг на старте
console.log('🔐 1C Config loaded:')
console.log('   baseUrl:', ONEC_CONFIG.baseUrl)
console.log('   username:', ONEC_CONFIG.username)
console.log('   password:', ONEC_CONFIG.password ? '***' + ONEC_CONFIG.password.substring(ONEC_CONFIG.password.length - 3) : 'NOT SET')
console.log('   Auth string will be:', `${ONEC_CONFIG.username}:${ONEC_CONFIG.password}`)

/**
 * Создаёт Basic Auth заголовок для 1C
 */
export function getBasicAuthHeader() {
  const credentials = `${ONEC_CONFIG.username}:${ONEC_CONFIG.password}`
  return 'Basic ' + Buffer.from(credentials).toString('base64')
}
