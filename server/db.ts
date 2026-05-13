/**
 * server/db.ts
 * 
 * Инициализация SQLite БД
 * Создаёт таблицу users если её нет
 * Предоставляет функции для работы с БД
 */

import Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import { fileURLToPath } from 'url'

// Получаем путь к .data директории
const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = '.data'
const dbPath = `${dataDir}/app.db`

/**
 * Инициализировать БД
 * Вызывается один раз при старте приложения
 */
function initializeDatabase(): any {
  // Создаём директорию если не существует
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
  }

  // Открываем/создаём БД
  const db = new Database(dbPath)

  // Включаем foreign keys
  db.pragma('foreign_keys = ON')

  // Создаём таблицу users
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

  // Создаём таблицу sessions (для audit логов - опционально)
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  console.log(`[DB] Инициализирована в ${dbPath}`)

  return db
}

// Глобальный экземпляр БД
let db: any = null

/**
 * Получить экземпляр БД
 * Singleton паттерн - БД инициализируется один раз
 */
export function getDatabase(): any {
  if (!db) {
    db = initializeDatabase()
  }
  return db
}

/**
 * Закрыть БД (при shutdown)
 */
export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

/**
 * Типы для TypeScript
 */
export interface User {
  id: number
  login: string
  password_hash: string
  full_name: string | null
  role: string
  is_active: number
  created_at: string
  updated_at: string
}

export interface Session {
  id: number
  user_id: number
  token: string
  ip_address: string | null
  user_agent: string | null
  created_at: string
  expires_at: string | null
}

/**
 * Удобные функции для работы с users
 */

export function findUserByLogin(login: string): User | undefined {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM users WHERE login = ?')
  return stmt.get(login) as User | undefined
}

export function findUserById(id: number): User | undefined {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?')
  return stmt.get(id) as User | undefined
}

export function createUser(
  login: string,
  passwordHash: string,
  fullName?: string,
  role: string = 'user'
): User {
  const db = getDatabase()
  const stmt = db.prepare(`
    INSERT INTO users (login, password_hash, full_name, role)
    VALUES (?, ?, ?, ?)
  `)
  
  const result = stmt.run(login, passwordHash, fullName || null, role)
  
  // Возвращаем только что созданного пользователя
  const user = findUserById(result.lastInsertRowid as number)
  if (!user) throw new Error('Failed to create user')
  return user
}

export function getAllUsers(): User[] {
  const db = getDatabase()
  const stmt = db.prepare('SELECT * FROM users ORDER BY id DESC')
  return stmt.all() as User[]
}

export function updateUser(id: number, updates: Partial<Omit<User, 'id' | 'created_at'>>): void {
  const db = getDatabase()
  
  // Формируем SET часть динамически
  const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'created_at')
  if (fields.length === 0) return

  const setClause = fields.map(f => `${f} = ?`).join(', ')
  const values = fields.map(f => updates[f as keyof typeof updates])
  
  const stmt = db.prepare(`
    UPDATE users 
    SET ${setClause}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `)
  
  stmt.run(...values, id)
}

export function deleteUser(id: number): void {
  const db = getDatabase()
  const stmt = db.prepare('DELETE FROM users WHERE id = ?')
  stmt.run(id)
}

/**
 * Функции для sessions (audit логирование)
 */

export function createSession(
  userId: number,
  token: string,
  ipAddress?: string,
  userAgent?: string
): Session {
  const db = getDatabase()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // +7 дней
  
  const stmt = db.prepare(`
    INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `)
  
  const result = stmt.run(userId, token, ipAddress || null, userAgent || null, expiresAt.toISOString())
  
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?')
    .get(result.lastInsertRowid) as Session
  return session
}

export function getActiveSessions(userId: number): Session[] {
  const db = getDatabase()
  const stmt = db.prepare(`
    SELECT * FROM sessions 
    WHERE user_id = ? 
    AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    ORDER BY created_at DESC
  `)
  return stmt.all(userId) as Session[]
}

export function deleteExpiredSessions(): number {
  const db = getDatabase()
  const stmt = db.prepare('DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP')
  return stmt.run().changes
}
