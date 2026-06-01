/**
 * Инициализация базы данных
 * Создание таблиц, миграции, тестовые пользователи
 */
import fs from 'fs'
import crypto from 'crypto'
import Database from 'better-sqlite3'
import { hashSync } from 'bcrypt'

const dataDir = '.data'
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const db = new Database(`${dataDir}/app.db`)
db.pragma('foreign_keys = ON')

export default db

// ============================================================
// Создание таблиц
// ============================================================

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

db.exec(`
  CREATE TABLE IF NOT EXISTS onec_units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ref_key TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS onec_warehouses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ref_key TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS onec_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ref_key TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS onec_stocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ref_key TEXT,
    name TEXT NOT NULL,
    sku TEXT DEFAULT '',
    product TEXT NOT NULL,
    warehouse TEXT NOT NULL,
    location TEXT,
    quantity REAL DEFAULT 0,
    current_stock REAL DEFAULT 0,
    unit TEXT,
    unit_key TEXT,
    category TEXT DEFAULT '',
    reserved REAL DEFAULT 0,
    purchasePrice REAL DEFAULT 0,
    status TEXT DEFAULT 'in_stock',
    barcode TEXT,
    storageBin TEXT,
    image TEXT,
    local_only INTEGER DEFAULT 0,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

// Миграция: добавляем колонки если их нет
try { db.exec(`ALTER TABLE onec_stocks ADD COLUMN ref_key TEXT`) } catch(e) { /* already exists */ }
try { db.exec(`ALTER TABLE onec_stocks ADD COLUMN name TEXT`) } catch(e) { /* already exists */ }
try { db.exec(`ALTER TABLE onec_stocks ADD COLUMN sku TEXT DEFAULT ''`) } catch(e) { /* already exists */ }
try { db.exec(`ALTER TABLE onec_stocks ADD COLUMN current_stock REAL DEFAULT 0`) } catch(e) { /* already exists */ }
try { db.exec(`ALTER TABLE onec_stocks ADD COLUMN unit_key TEXT`) } catch(e) { /* already exists */ }
try { db.exec(`ALTER TABLE onec_stocks ADD COLUMN unit_key TEXT`) } catch(e) { /* already exists */ }
try { db.exec(`ALTER TABLE onec_stocks ADD COLUMN category TEXT DEFAULT ''`) } catch(e) { /* already exists */ }
try { db.exec(`ALTER TABLE onec_stocks ADD COLUMN status TEXT DEFAULT 'in_stock'`) } catch(e) { /* already exists */ }
try { db.exec(`ALTER TABLE onec_stocks ADD COLUMN location TEXT`) } catch(e) { /* already exists */ }
try { db.exec(`ALTER TABLE onec_stocks ADD COLUMN reserved REAL DEFAULT 0`) } catch(e) { /* already exists */ }
try { db.exec(`ALTER TABLE onec_stocks ADD COLUMN purchasePrice REAL DEFAULT 0`) } catch(e) { /* already exists */ }
try { db.exec(`ALTER TABLE onec_stocks ADD COLUMN averagePrice REAL DEFAULT 0`) } catch(e) { /* already exists */ }
try { db.exec(`ALTER TABLE onec_stocks ADD COLUMN reservesByOrder TEXT DEFAULT '{}'`) } catch(e) { /* already exists */ }
try { db.exec(`ALTER TABLE onec_stocks ADD COLUMN storageBin TEXT`) } catch(e) { /* already exists */ }
try { db.exec(`ALTER TABLE onec_stocks ADD COLUMN storageBin TEXT`) } catch(e) { /* already exists */ }
try { db.exec(`ALTER TABLE onec_stocks ADD COLUMN barcode TEXT`) } catch(e) { /* already exists */ }
try { db.exec(`ALTER TABLE onec_stocks ADD COLUMN image TEXT`) } catch(e) { /* already exists */ }
try { db.exec(`ALTER TABLE onec_stocks ADD COLUMN local_only INTEGER DEFAULT 0`) } catch(e) { /* already exists */ }
try { db.exec(`ALTER TABLE onec_orders ADD COLUMN items TEXT DEFAULT '[]'`) } catch(e) { /* already exists */ }

db.exec(`
  CREATE TABLE IF NOT EXISTS onec_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ref_key TEXT UNIQUE,
    order_number TEXT UNIQUE NOT NULL,
    date TEXT,
    customer TEXT,
    status TEXT,
    amount REAL DEFAULT 0,
    items_count INTEGER DEFAULT 0,
    items TEXT DEFAULT '[]',
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

try { db.exec(`ALTER TABLE onec_orders ADD COLUMN painting TEXT DEFAULT ''`) } catch(e) { /* already exists */ }

db.exec(`
  CREATE TABLE IF NOT EXISTS transfer_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ref_key TEXT UNIQUE,
    order_number TEXT NOT NULL,
    date TEXT,
    source_warehouse_key TEXT,
    source_warehouse_name TEXT,
    destination_warehouse_key TEXT,
    destination_warehouse_name TEXT,
    customer_order_key TEXT,
    customer_order_number TEXT,
    posted INTEGER DEFAULT 0,
    items TEXT DEFAULT '[]',
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

// Таблица для результатов сканирования заказов на перемещение
db.exec(`
  CREATE TABLE IF NOT EXISTS transfer_order_scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_ref_key TEXT NOT NULL,
    item_barcode TEXT,
    scanned_qty INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(order_ref_key) REFERENCES transfer_orders(ref_key) ON DELETE CASCADE,
    UNIQUE(order_ref_key, item_barcode)
  )
`)

// Таблица QR кодов (глобально уникальные для всего приложения)
db.exec(`
  CREATE TABLE IF NOT EXISTS local_qr_codes (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    order_id TEXT NOT NULL,
    order_number TEXT,
    product_id TEXT NOT NULL,
    product_name TEXT,
    status TEXT DEFAULT 'generated',
    label_order TEXT,
    label_info TEXT,
    scanned_at DATETIME,
    scanned_by TEXT,
    generated_at DATETIME NOT NULL,
    generated_by TEXT NOT NULL,
    is_package INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(order_id) REFERENCES onec_orders(ref_key) ON DELETE CASCADE
  )
`)

// Индексы для быстрого поиска QR кодов
try {
  db.exec(`CREATE INDEX IF NOT EXISTS idx_qr_order ON local_qr_codes(order_id)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_qr_code ON local_qr_codes(code)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_qr_status ON local_qr_codes(status)`)
} catch (e) { /* indexes might already exist */ }

// Миграция: заполнить label_info и label_order у существующих кодов
try {
  const countNull = db.prepare('SELECT COUNT(*) as cnt FROM local_qr_codes WHERE label_info IS NULL OR label_order IS NULL').get()
  if (countNull && countNull.cnt > 0) {
    console.log(`📦 [DB MIGRATION] Updating ${countNull.cnt} QR codes with missing label data...`)
    db.prepare(`
      UPDATE local_qr_codes
      SET label_order = COALESCE(label_order, order_number, 'Unknown')
      WHERE label_order IS NULL
    `).run()
    db.prepare(`
      UPDATE local_qr_codes
      SET label_info = NULL
      WHERE label_info = product_name
    `).run()
    console.log(`✓ [DB MIGRATION] QR codes updated`)
  }
} catch (e) {
  console.error('Migration error:', e.message)
}

// Таблица логирования операций
db.exec(`
  CREATE TABLE IF NOT EXISTS operation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operation_type TEXT NOT NULL,
    employee_id TEXT,
    employee_name TEXT,
    order_id TEXT,
    order_number TEXT,
    product_id TEXT,
    product_name TEXT,
    qr_code_id TEXT,
    qr_code TEXT,
    details TEXT,
    status TEXT DEFAULT 'success',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(order_id) REFERENCES onec_orders(ref_key),
    FOREIGN KEY(qr_code_id) REFERENCES local_qr_codes(id)
  )
`)

// Индексы для быстрой фильтрации логов
try {
  db.exec(`CREATE INDEX IF NOT EXISTS idx_log_employee ON operation_logs(employee_id)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_log_order ON operation_logs(order_id)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_log_operation ON operation_logs(operation_type)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_log_created ON operation_logs(created_at DESC)`)
} catch (e) { /* indexes might already exist */ }

// Добавляем новые колонки если их нет (миграция)
try {
  db.prepare('ALTER TABLE transfer_orders ADD COLUMN customer_order_key TEXT').run()
  console.log('✓ Added customer_order_key column')
} catch (e) { /* column already exists */ }

try {
  db.prepare('ALTER TABLE transfer_orders ADD COLUMN customer_order_number TEXT').run()
  console.log('✓ Added customer_order_number column')
} catch (e) { /* column already exists */ }

try {
  db.prepare('ALTER TABLE transfer_orders ADD COLUMN selected_product TEXT').run()
  console.log('✓ Added selected_product column')
} catch (e) { /* column already exists */ }

try {
  db.prepare('ALTER TABLE transfer_orders ADD COLUMN created_by TEXT').run()
  console.log('✓ Added created_by column to transfer_orders')
} catch (e) { /* column already exists */ }

try {
  db.prepare('ALTER TABLE users ADD COLUMN needs_password_change INTEGER DEFAULT 1').run()
  console.log('✓ Added needs_password_change column to users')
} catch (e) { /* column already exists */ }

try {
  db.prepare('ALTER TABLE local_qr_codes ADD COLUMN is_package INTEGER DEFAULT 0').run()
  console.log('✓ Added is_package column to local_qr_codes')
} catch (e) { /* column already exists */ }

// Миграция: обновляем старые plain-text пароли на bcrypt
try {
  const oldUsers = db.prepare('SELECT id, login, password_hash FROM users WHERE LENGTH(password_hash) < 30').all()
  for (const user of oldUsers) {
    const passwordHash = hashSync(user.password_hash, 10)
    db.prepare('UPDATE users SET password_hash = ?, needs_password_change = 0 WHERE id = ?').run(passwordHash, user.id)
    console.log(`✓ Migrated user password hash: ${user.login}`)
  }
} catch (err) {
  console.error('Error migrating passwords:', err.message)
}

try {
  db.prepare('ALTER TABLE onec_stocks ADD COLUMN last_receipt TEXT').run()
  console.log('✓ Added last_receipt column to onec_stocks')
} catch (e) { /* column already exists */ }

// ============================================================
// Дополнительные таблицы (employees, tools, tool_breakdowns, material_invoices)
// ============================================================

try {
  const employeesTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='employees'").get()
  if (!employeesTableExists) {
    db.exec(`
      CREATE TABLE employees (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        phone TEXT NOT NULL,
        photo TEXT,
        avatar TEXT,
        position TEXT NOT NULL,
        department TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'worker',
        status TEXT NOT NULL DEFAULT 'active',
        salary INTEGER DEFAULT 0,
        hire_date TEXT NOT NULL,
        birth_date TEXT,
        address TEXT,
        skills TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        created_by TEXT,
        updated_by TEXT
      )
    `)
    console.log('✓ Created employees table')
  }
} catch (err) {
  console.error('Error initializing employees table:', err.message)
}

// ============================================================
// Тестовые пользователи
// ============================================================

export const testUsers = [
  { login: 'admin', password: 'admin', fullName: 'Admin User', role: 'director' },
  { login: 'manager', password: 'manager', fullName: 'Manager User', role: 'manager' },
  { login: 'storekeeper', password: 'storekeeper', fullName: 'Storekeeper User', role: 'storekeeper' },
  { login: 'worker', password: 'worker', fullName: 'Worker User', role: 'worker' }
]

for (const user of testUsers) {
  try {
    const existing = db.prepare('SELECT id, password_hash FROM users WHERE login = ?').get(user.login)
    let userId = existing?.id

    if (!existing) {
      const passwordHash = hashSync(user.password, 10)
      const result = db.prepare('INSERT INTO users (login, password_hash, full_name, role, is_active, needs_password_change) VALUES (?, ?, ?, ?, 1, 1)')
        .run(user.login, passwordHash, user.fullName, user.role)
      userId = result.lastInsertRowid
      console.log(`✓ Created user: ${user.login} (ID: ${userId})`)
    } else if (existing.password_hash === user.login) {
      const passwordHash = hashSync(user.password, 10)
      db.prepare('UPDATE users SET password_hash = ? WHERE login = ?')
        .run(passwordHash, user.login)
      console.log(`✓ Updated user password hash: ${user.login}`)
    }

    // Создаём сотрудника для каждого пользователя, если его ещё нет
    if (userId) {
      const existingEmp = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(String(userId))
      if (!existingEmp) {
        const now = new Date().toISOString()
        const empId = `emp-${user.login}-${Date.now()}`
        const deptMap = {
          admin: 'Управление',
          manager: 'Продажи',
          storekeeper: 'Склад',
          worker: 'Производство'
        }
        const positionMap = {
          admin: 'Главный администратор',
          manager: 'Менеджер',
          storekeeper: 'Кладовщик',
          worker: 'Рабочий'
        }
        db.prepare(`
          INSERT INTO employees (id, user_id, name, email, phone, position, department, role, status, salary, hire_date, created_at, updated_at, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          empId,
          String(userId),
          user.fullName,
          `${user.login}@warehouse.local`,
          '+7-000-000-00-00',
          positionMap[user.login] || user.role,
          deptMap[user.login] || 'Общее',
          user.role,
          'active',
          0,
          now,
          now,
          now,
          'System'
        )
        console.log(`✓ Created employee for ${user.login} (user_id: ${userId})`)
      }
    }
  } catch (err) {
    console.error(`Error creating/updating user ${user.login}:`, err.message)
  }
}

// ============================================================
// Дополнительные таблицы (tools, tool_breakdowns, material_invoices)
// ============================================================

try {
  const toolsTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tools'").get()
  if (!toolsTableExists) {
    db.exec(`
      CREATE TABLE tools (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        inventory_number TEXT NOT NULL UNIQUE,
        serial_number TEXT,
        type TEXT NOT NULL DEFAULT 'hand_tool',
        model TEXT,
        manufacturer TEXT,
        status TEXT NOT NULL DEFAULT 'in_stock',
        location TEXT,
        price REAL DEFAULT 0,
        qr_code TEXT,
        issued_to TEXT,
        issued_to_name TEXT,
        issued_at TEXT,
        breakdown_description TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        created_by TEXT
      )
    `)
    console.log('✓ Created tools table')
  }
} catch (err) {
  console.error('Error initializing tools table:', err.message)
}

try {
  const breakdownsTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tool_breakdowns'").get()
  if (!breakdownsTableExists) {
    db.exec(`
      CREATE TABLE tool_breakdowns (
        id TEXT PRIMARY KEY,
        tool_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'reported',
        description TEXT,
        reported_by TEXT,
        reported_at TEXT NOT NULL,
        repair_status TEXT,
        repair_notes TEXT,
        completed_at TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(tool_id) REFERENCES tools(id) ON DELETE CASCADE
      )
    `)
    console.log('✓ Created tool_breakdowns table')
  }
} catch (err) {
  console.error('Error initializing tool_breakdowns table:', err.message)
}

try {
  const invoicesTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='material_invoices'").get()
  if (!invoicesTableExists) {
    db.exec(`
      CREATE TABLE material_invoices (
        id TEXT PRIMARY KEY,
        employee_id TEXT NOT NULL,
        date TEXT NOT NULL,
        order_number TEXT NOT NULL,
        destination TEXT,
        total_amount REAL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        created_by TEXT,
        FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
      )
    `)
    console.log('✓ Created material_invoices table')
  }
} catch (err) {
  console.error('Error initializing material_invoices table:', err.message)
}

try {
  const itemsTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='material_invoice_items'").get()
  if (!itemsTableExists) {
    db.exec(`
      CREATE TABLE material_invoice_items (
        id TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        article TEXT,
        price REAL DEFAULT 0,
        scanned_at TEXT,
        FOREIGN KEY(invoice_id) REFERENCES material_invoices(id) ON DELETE CASCADE
      )
    `)
    console.log('✓ Created material_invoice_items table')
  }
} catch (err) {
  console.error('Error initializing material_invoice_items table:', err.message)
}

try {
  const toolOperationsTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tool_operations'").get()
  if (!toolOperationsTableExists) {
    db.exec(`
      CREATE TABLE tool_operations (
        id TEXT PRIMARY KEY,
        tool_id TEXT NOT NULL,
        tool_name TEXT NOT NULL,
        inventory_number TEXT NOT NULL,
        employee_id TEXT NOT NULL,
        action TEXT NOT NULL,
        date TEXT NOT NULL,
        performed_by TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY(tool_id) REFERENCES tools(id) ON DELETE CASCADE,
        FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE
      )
    `)
    console.log('✓ Created tool_operations table')
  }
} catch (err) {
  console.error('Error initializing tool_operations table:', err.message)
}

console.log('✅ Database initialized')
