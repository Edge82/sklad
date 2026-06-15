#!/usr/bin/env node
/**
 * Миграция: унификация всех ролей в БД
 * users: warehouse → storekeeper, production → worker, director → admin
 * employees: warehouse → storekeeper, production → worker
 */

import Database from 'better-sqlite3'

const dbPath = process.env.DB_PATH || '.data/app.db'

try {
  const db = new Database(dbPath)

  // === USERS TABLE ===
  console.log('=== Users table ===')
  const userWarehouse = db.prepare("UPDATE users SET role = 'storekeeper' WHERE role = 'warehouse'").run()
  console.log(`  warehouse → storekeeper: ${userWarehouse.changes}`)

  const userProduction = db.prepare("UPDATE users SET role = 'worker' WHERE role = 'production'").run()
  console.log(`  production → worker: ${userProduction.changes}`)

  const userDirector = db.prepare("UPDATE users SET role = 'admin' WHERE role = 'director'").run()
  console.log(`  director → admin: ${userDirector.changes}`)

  // === EMPLOYEES TABLE ===
  console.log('\n=== Employees table ===')
  const empWarehouse = db.prepare("UPDATE employees SET role = 'storekeeper' WHERE role = 'warehouse'").run()
  console.log(`  warehouse → storekeeper: ${empWarehouse.changes}`)

  const empProduction = db.prepare("UPDATE employees SET role = 'worker' WHERE role = 'production'").run()
  console.log(`  production → worker: ${empProduction.changes}`)

  const empDirector = db.prepare("UPDATE employees SET role = 'admin' WHERE role = 'director'").run()
  console.log(`  director → admin: ${empDirector.changes}`)

  // Fix invalid roles → worker
  const invalidUsers = db.prepare("SELECT id, login, role FROM users WHERE role NOT IN ('admin', 'manager', 'storekeeper', 'worker')").all()
  for (const u of invalidUsers) {
    db.prepare("UPDATE users SET role = 'worker' WHERE id = ?").run(u.id)
    console.log(`  ⚠️ User '${u.login}' role '${u.role}' → 'worker'`)
  }

  const invalidEmps = db.prepare("SELECT id, name, role FROM employees WHERE role NOT IN ('admin', 'manager', 'storekeeper', 'worker')").all()
  for (const e of invalidEmps) {
    db.prepare("UPDATE employees SET role = 'worker' WHERE id = ?").run(e.id)
    console.log(`  ⚠️ Employee '${e.name}' role '${e.role}' → 'worker'`)
  }

  // Summary
  console.log('\n=== Final distribution ===')
  console.log('Users:')
  db.prepare('SELECT role, COUNT(*) as count FROM users GROUP BY role').all().forEach(r => console.log(`  ${r.role}: ${r.count}`))
  console.log('Employees:')
  db.prepare('SELECT role, COUNT(*) as count FROM employees GROUP BY role').all().forEach(r => console.log(`  ${r.role}: ${r.count}`))

  db.close()
  console.log('\n✅ Миграция завершена!')
} catch (err) {
  console.error('❌ Ошибка:', err.message)
  process.exit(1)
}
