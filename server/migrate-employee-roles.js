#!/usr/bin/env node
/**
 * Миграция: унификация ролей Employee
 * warehouse → storekeeper
 * production → worker
 * Запуск: node server/migrate-employee-roles.js
 */

import Database from 'better-sqlite3'

const dbPath = process.env.DB_PATH || '.data/app.db'

try {
  const db = new Database(dbPath)

  // warehouse → storekeeper
  const warehouseResult = db.prepare("UPDATE employees SET role = 'storekeeper' WHERE role = 'warehouse'").run()
  console.log(`✓ employees: warehouse → storekeeper: ${warehouseResult.changes} записей`)

  // production → worker
  const productionResult = db.prepare("UPDATE employees SET role = 'worker' WHERE role = 'production'").run()
  console.log(`✓ employees: production → worker: ${productionResult.changes} записей`)

  // Проверяем невалидные роли
  const invalidRoles = db.prepare("SELECT id, name, role FROM employees WHERE role NOT IN ('admin', 'manager', 'storekeeper', 'worker')").all()
  if (invalidRoles.length > 0) {
    console.log(`⚠️ Найдены записи с невалидными ролями (${invalidRoles.length}):`)
    for (const emp of invalidRoles) {
      console.log(`  - ${emp.name} (id: ${emp.id}, role: ${emp.role})`)
      // Маппим на worker по умолчанию
      db.prepare("UPDATE employees SET role = 'worker' WHERE id = ?").run(emp.id)
      console.log(`    → исправлено на 'worker'`)
    }
  }

  db.close()
  console.log('✅ Миграция ролей сотрудников завершена!')
} catch (err) {
  console.error('❌ Ошибка:', err.message)
  process.exit(1)
}
