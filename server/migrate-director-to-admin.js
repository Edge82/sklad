#!/usr/bin/env node
/**
 * Миграция: переименование роли 'director' → 'admin'
 * Запуск: node server/migrate-director-to-admin.js
 */

import Database from 'better-sqlite3'

const dbPath = process.env.DB_PATH || '.data/app.db'

try {
  const db = new Database(dbPath)

  // Обновляем роль в таблице users
  const usersResult = db.prepare("UPDATE users SET role = 'admin' WHERE role = 'director'").run()
  console.log(`✓ users: обновлено ${usersResult.changes} записей (director → admin)`)

  // Обновляем роль в таблице employees
  const employeesResult = db.prepare("UPDATE employees SET role = 'admin' WHERE role = 'director'").run()
  console.log(`✓ employees: обновлено ${employeesResult.changes} записей (director → admin)`)

  db.close()
  console.log('✅ Миграция завершена!')
} catch (err) {
  console.error('❌ Ошибка:', err.message)
  process.exit(1)
}
