/**
 * server/api/onec/stocks.get.ts
 * 
 * GET /api/onec/stocks
 * Проксирует запрос к 1С OData API для получения материалов/товаров
 * 
 * Query параметры:
 * ?filter=name~contains~'фанера'
 * ?sort=code
 * 
 * Response: Array of stocks from 1C
 */

import { defineEventHandler, getQuery, createError } from 'h3'
import { onecRequest } from '~/server/services/onec.service'

export default defineEventHandler(async (event: any) => {
  try {
    // Получаем query параметры
    const query = getQuery(event)
    
    // Формируем фильтр для 1С OData
    let endpoint = '/Catalog_Materials?$format=json'
    
    // Если передан filter параметр, добавляем его
    if (query.filter && typeof query.filter === 'string') {
      endpoint += `&$filter=${encodeURIComponent(query.filter)}`
    }
    
    // Если передан sort параметр
    if (query.sort && typeof query.sort === 'string') {
      endpoint += `&$orderby=${encodeURIComponent(query.sort)}`
    }
    
    // Если передан $top для пагинации
    if (query.top && typeof query.top === 'string') {
      endpoint += `&$top=${query.top}`
    }

    // Выполняем запрос к 1С
    const data = await onecRequest(endpoint)

    return {
      statusCode: 200,
      data,
      // Опционально: добавляем информацию о пользователе для логирования
      _meta: {
        user: event.context.user?.login,
        timestamp: new Date().toISOString()
      }
    }

  } catch (error) {
    console.error('[API] /api/onec/stocks error:', error)
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch stocks from 1C',
      data: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    })
  }
})
