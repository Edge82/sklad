#!/usr/bin/env node
/**
 * Миграция: создать material_invoices для существующих transfer orders
 * Запуск: node server/migrate-transfer-orders-to-invoices.js
 */

import Database from 'better-sqlite3'

const dbPath = process.env.DB_PATH || '.data/app.db'

try {
  const db = new Database(dbPath)

  // Находим transfer orders без соответствующего material_invoices
  const orders = db.prepare(`
    SELECT ref_key, order_number, date, created_by, items
    FROM transfer_orders
    WHERE created_by IS NOT NULL AND created_by != ''
  `).all()

  let created = 0
  let skipped = 0

  for (const order of orders) {
    // Проверяем есть ли уже invoice
    const existing = db.prepare(
      "SELECT id FROM material_invoices WHERE order_number = ? AND destination = 'Перемещение'"
    ).get(order.order_number)

    if (existing) {
      skipped++
      continue
    }

    // Определяем employee_id по created_by (login)
    const user = db.prepare("SELECT id FROM users WHERE login = ?").get(order.created_by)
    const employee = user
      ? db.prepare("SELECT id FROM employees WHERE user_id = ? OR user_id = ?").get(String(user.id), String(user.id) + '.0')
      : null
    const employeeId = employee ? employee.id : null

    if (!employeeId) {
      console.log(`⚠️ Employee not found for created_by='${order.created_by}' (user_id: ${user?.id}), skipping order ${order.order_number}`)
      skipped++
      continue
    }

    const invoiceId = `TO-MIGRATED-${order.ref_key}`
    db.prepare(`
      INSERT INTO material_invoices (id, employee_id, date, order_number, destination, total_amount, created_at, updated_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(invoiceId, employeeId, order.date, order.order_number, 'Перемещение', 0, order.date, order.date, order.created_by)

    // Parse items and create invoice items
    try {
      const parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items
      if (Array.isArray(parsedItems)) {
        for (const item of parsedItems) {
          const itemId = `TO-ITEM-MIGRATED-${order.ref_key}-${Math.random().toString(36).substr(2, 6)}`
          db.prepare(`
            INSERT INTO material_invoice_items (id, invoice_id, product_name, quantity, unit, article, price, scanned_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(itemId, invoiceId, item.productName || '', Number(item.quantity) || 0, 'шт', item.barcode || '', 0, order.date)
        }
      }
    } catch (e) {
      console.log(`⚠️ Failed to parse items for order ${order.order_number}: ${e.message}`)
    }

    created++
  }

  console.log(`✅ Миграция завершена: создано ${created} записей, пропущено ${skipped}`)
  db.close()
} catch (err) {
  console.error('❌ Ошибка:', err.message)
  process.exit(1)
}
