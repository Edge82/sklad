#!/usr/bin/env node
/**
 * Скрипт инициализации тестовых пользователей
 * Запустить: node server/init-users.js
 */

import Database from 'better-sqlite3'
import { hashSync } from 'bcrypt'
import { existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = '.data'
const dbPath = `${dataDir}/app.db`

// Создаём директорию если не существует
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true })
}

const db = new Database(dbPath)

// Создаём таблицу users если её нет
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    login TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'user',
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

// Тестовые пользователи
const testUsers = [
  {
    login: 'admin',
    password: 'admin',
    fullName: 'Александр Иванов',
    role: 'admin'
  }
]

console.log('📝 Инициализация пользователей...\n')

for (const user of testUsers) {
  try {
    // Проверяем существует ли пользователь
    const existing = db.prepare('SELECT id FROM users WHERE login = ?').get(user.login)
    
    if (existing) {
      console.log(`✓ Пользователь "${user.login}" уже существует`)
      continue
    }

    // Хешируем пароль
    const passwordHash = hashSync(user.password, 10)

    // Создаём пользователя
    const stmt = db.prepare(`
      INSERT INTO users (login, password_hash, full_name, role, is_active)
      VALUES (?, ?, ?, ?, 1)
    `)
    
    stmt.run(user.login, passwordHash, user.fullName, user.role)
    
    console.log(`✓ Создан пользователь: ${user.login} (${user.fullName}) - ${user.role}`)
    console.log(`  Пароль: ${user.password}\n`)
  } catch (err) {
    console.error(`✗ Ошибка при создании пользователя "${user.login}":`, err.message)
  }
}

db.close()
console.log('✅ Инициализация завершена!')
