/**
 * server/api/inventory/receive-finished-product.post.ts
 * 
 * POST /api/inventory/receive-finished-product
 * Приёмка товара на склад готовой продукции (первое сканирование QR кода)
 * 
 * Request body:
 * {
 *   "qrId": "qr-code-id",
 *   "productName": "Название товара",
 *   "quantity": 1,
 *   "orderNumber": "Номер заказа"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "invoiceId": "RECV-FP-xxx"
 * }
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { getDatabase } from '~/server/db'

export default defineEventHandler(async (event) => {
  if (event.method !== 'POST') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowed'
    })
  }

  try {
    const body = await readBody(event)
    const { qrId, productName, quantity = 1, orderNumber = 'Без номера' } = body

    if (!qrId || !productName) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: qrId, productName'
      })
    }

    // Получаем экземпляр БД
    const db = getDatabase()
    const timestamp = new Date().toISOString()
    const invoiceId = `RECV-FP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Добавляем запись в material_invoices
    const invoiceItems = JSON.stringify([{
      qrId,
      name: productName,
      quantity: quantity || 1
    }])

    db.prepare(`
      INSERT INTO material_invoices (
        id, order_number, source, destination, type, items, 
        quantity, total_price, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      invoiceId,
      orderNumber,
      'Производство',
      'Готовая продукция',
      'receipt',
      invoiceItems,
      quantity || 1,
      0,
      'QR Scan',
      timestamp
    )

    // Проверяем существует ли товар в onec_stocks
    const existingStock = db.prepare(`
      SELECT * FROM onec_stocks WHERE name = ? AND warehouse = 'Готовая продукция'
    `).get(productName) as any

    if (existingStock) {
      // Обновляем количество
      db.prepare(`
        UPDATE onec_stocks 
        SET quantity = quantity + ?, last_modified = ?
        WHERE name = ? AND warehouse = 'Готовая продукция'
      `).run(quantity || 1, timestamp, productName)
    } else {
      // Создаём новую запись
      const stockId = `STOCK-FP-${Date.now()}`
      db.prepare(`
        INSERT INTO onec_stocks (id, name, warehouse, quantity, unit, category, last_modified)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        stockId,
        productName,
        'Готовая продукция',
        quantity || 1,
        'шт',
        'Готовая продукция',
        timestamp
      )
    }

    console.log(`✓ Product received to FP warehouse: ${productName} (qty: ${quantity || 1})`)

    return {
      success: true,
      invoiceId
    }
  } catch (err) {
    console.error('Error receiving product:', err)
    throw createError({
      statusCode: 500,
      statusMessage: err instanceof Error ? err.message : 'Internal server error'
    })
  }
})
