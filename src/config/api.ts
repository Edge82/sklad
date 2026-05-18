/**
 * API configuration
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/sklad/api'

export const ONEC_PROXY_BASE_URL = import.meta.env.VITE_1C_PROXY_TARGET || '/api-1c'

export const apiCall = async (endpoint: string, options?: RequestInit) => {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    ...options
  })
  return response
}
