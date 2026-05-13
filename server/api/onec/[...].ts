/**
 * server/api/onec/[...].ts
 * 
 * GET/POST /api/onec/[any-path]
 * Универсальный прокси-маршрут для запросов к 1С OData
 * 
 * Примеры:
 * GET /api/onec/Catalog_Goods → проксирует к 1C /Catalog_Goods
 * GET /api/onec/Document_Orders?$top=10 → проксирует с параметрами
 * POST /api/onec/Document_Movement → отправляет POST запрос
 */

import { defineEventHandler, getQuery, readBody, createError, getMethod } from 'h3'
import { onecRequest } from '~/server/services/onec.service'

export default defineEventHandler(async (event: any) => {
  try {
    // Получаем динамический путь из параметра
    const route = event.context.params?._
    if (!route) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Resource path is required'
      })
    }

    // Метод запроса
    const method = getMethod(event)

    // Для GET - формируем строку запроса
    let endpoint = `/${route}`
    
    if (method === 'GET') {
      const query = getQuery(event)
      const params = new URLSearchParams()
      
      // Добавляем стандартный $format=json если его нет
      if (!query.$format) {
        params.append('$format', 'json')
      }
      
      // Добавляем остальные параметры
      Object.entries(query).forEach(([key, value]) => {
        if (value) {
          params.append(key, String(value))
        }
      })

      const queryString = params.toString()
      if (queryString) {
        endpoint += `?${queryString}`
      }
    }

    // Для POST/PUT - читаем body
    let body: any = undefined
    if (method === 'POST' || method === 'PUT') {
      try {
        body = await readBody(event)
      } catch {
        // Пустое body это нормально
      }
    }

    // Выполняем запрос к 1С
    const result = await onecRequest(endpoint, { method: method as any, body })

    return {
      statusCode: 200,
      data: result,
      _meta: {
        method,
        path: route,
        user: event.context.user?.login,
        timestamp: new Date().toISOString()
      }
    }

  } catch (error) {
    console.error('[API] /api/onec/[...] error:', error)

    const message = error instanceof Error ? error.message : 'Unknown error'
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to proxy request to 1C',
      data: { error: message }
    })
  }
})
