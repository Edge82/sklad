/**
 * Скрипт сброса пароля администратора
 * Запуск: node server/reset-admin.js [новый_пароль]
 */
import Database from 'better-sqlite3'
import { hashSync } from 'bcrypt'

const newPassword = process.argv[2] || 'admin'
const dbPath = process.env.DB_PATH || '.data/app.db'

try {
  const db = new Database(dbPath)

  // Проверяем существует ли пользователь admin
  const user = db.prepare('SELECT id, login, full_name FROM users WHERE login = ?').get('admin')

  if (!user) {
    console.log('❌ Пользователь admin не найден в базе данных')
    console.log('Создаём нового пользователя admin...')

    const passwordHash = hashSync(newPassword, 10)
    db.prepare(`
      INSERT INTO users (login, password_hash, full_name, role, is_active, needs_password_change)
      VALUES (?, ?, ?, ?, 1, 1)
    `).run('admin', passwordHash, 'Admin User', 'director')

    console.log('✅ Пользователь admin создан')
  } else {
    console.log(`✓ Найден пользователь: ${user.full_name} (ID: ${user.id})`)

    const passwordHash = hashSync(newPassword, 10)
    db.prepare('UPDATE users SET password_hash = ?, needs_password_change = 1 WHERE login = ?')
      .run(passwordHash, 'admin')

    console.log('✅ Пароль администратора сброшен')
  }

  console.log(`\n🔑 Новый пароль: ${newPassword}`)
  console.log('⚠️  При первом входе система потребует сменить пароль')

  db.close()
} catch (err) {
  console.error('❌ Ошибка:', err.message)
  process.exit(1)
}
