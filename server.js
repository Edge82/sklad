#!/usr/bin/env node
/**
 * Простой бэкенд сервер для API
 */

// Загружаем переменные окружения из .env файла
import { config } from 'dotenv'
config()

import http from 'http'
import fs from 'fs'
import Database from 'better-sqlite3'
import jwt from 'jsonwebtoken'
import { compareSync, hashSync } from 'bcrypt'

const PORT = process.env.BACKEND_PORT || process.env.PORT || 8000
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'

// 1C OData конфигурация
const ONEC_CONFIG = {
  baseUrl: process.env.ONEC_BASE_URL || process.env.VITE_1C_BASE_URL || 'http://192.168.1.100:8080/1c-demo/odata/standard.odata',
  username: process.env.ONEC_LOGIN || process.env.VITE_1C_USERNAME || 'admin',
  password: process.env.ONEC_PASSWORD || process.env.VITE_1C_PASSWORD || 'password',
  warehouseGuid: process.env.WAREHOUSE_GUID || process.env.VITE_1C_WAREHOUSE_GUID || 'd8da6724-e264-11f0-862e-fa163e5c9fa8',
  timeout: parseInt(process.env.API_TIMEOUT || '30000', 10)  // 30 секунд для реальной 1C
}

// Debug: выводим конфиг на старте
console.log('🔐 1C Config loaded:')
console.log('   baseUrl:', ONEC_CONFIG.baseUrl)
console.log('   username:', ONEC_CONFIG.username)
console.log('   password:', ONEC_CONFIG.password ? '***' + ONEC_CONFIG.password.substring(ONEC_CONFIG.password.length - 3) : 'NOT SET')
console.log('   Auth string will be:', `${ONEC_CONFIG.username}:${ONEC_CONFIG.password}`)

// Функция для создания Basic Auth заголовка
function getBasicAuthHeader() {
  const credentials = `${ONEC_CONFIG.username}:${ONEC_CONFIG.password}`
  return 'Basic ' + Buffer.from(credentials).toString('base64')
}

// Функция логирования операций
function logOperation(operationType, data) {
  try {
    const {
      employeeId = null,
      employeeName = null,
      orderId = null,
      orderNumber = null,
      productId = null,
      productName = null,
      qrCodeId = null,
      qrCode = null,
      details = null,
      status = 'success'
    } = data

    const stmt = db.prepare(`
      INSERT INTO operation_logs (
        operation_type, employee_id, employee_name, order_id, order_number,
        product_id, product_name, qr_code_id, qr_code, details, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      operationType,
      employeeId,
      employeeName,
      orderId,
      orderNumber,
      productId,
      productName,
      qrCodeId,
      qrCode,
      details ? JSON.stringify(details) : null,
      status
    )

    console.log(`📝 [LOG] ${operationType} - ${employeeName || 'unknown'} - ${orderNumber || ''}`)
  } catch (err) {
    console.error('❌ Error logging operation:', err.message)
  }
}

// Инициализируем БД
const dataDir = '.data'
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const db = new Database(`${dataDir}/app.db`)
db.pragma('foreign_keys = ON')

// Кэш для единиц измерения (GUID -> Строка)
let unitsCache = new Map()

// Функция для кэширования единиц измерения
async function loadUnitsCache() {
  try {
    const authHeader = getBasicAuthHeader()

    // Первый вариант: загружаем из каталога ЕдиницыИзмерения
    console.log(`📡 Loading units cache from Catalog_ЕдиницыИзмерения...`)
    let url = `${ONEC_CONFIG.baseUrl.replace(/\/$/, '')}/Catalog_ЕдиницыИзмерения?$format=json&$select=Ref_Key,Description`

    let response = await fetch(url, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      },
      timeout: ONEC_CONFIG.timeout
    })

    if (response.ok) {
      const data = await response.json()
      if (data.value && Array.isArray(data.value) && data.value.length > 0) {
        data.value.forEach(unit => {
          unitsCache.set(unit.Ref_Key, unit.Description)
        })
        console.log(`✅ Loaded ${unitsCache.size} units from Catalog_ЕдиницыИзмерения:`)
        data.value.forEach(unit => {
          console.log(`   ${unit.Ref_Key} = "${unit.Description}"`)
        })
        return
      }
    }

    // Второй вариант: загружаем из номенклатуры (если каталог пуст)
    console.log(`📡 Catalog_ЕдиницыИзмерения empty, extracting from Nomenclature...`)
    url = `${ONEC_CONFIG.baseUrl.replace(/\/$/, '')}/Catalog_Номенклатура?$format=json&$select=ЕдиницаИзмерения_Key`

    response = await fetch(url, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      },
      timeout: ONEC_CONFIG.timeout
    })

    if (response.ok) {
      const data = await response.json()
      if (data.value && Array.isArray(data.value)) {
        const uniqueUnits = new Set()
        data.value.forEach(item => {
          if (item.ЕдиницаИзмерения_Key) {
            uniqueUnits.add(item.ЕдиницаИзмерения_Key)
          }
        })

        console.log(`✅ Found ${uniqueUnits.size} unique units in Nomenclature`)

        // Загружаем описания единиц
        for (const unitKey of uniqueUnits) {
          url = `${ONEC_CONFIG.baseUrl.replace(/\/$/, '')}/Catalog_ЕдиницыИзмерения(guid'${unitKey}')?$format=json&$select=Ref_Key,Description`
          try {
            const unitResponse = await fetch(url, {
              headers: {
                'Authorization': authHeader,
                'Accept': 'application/json'
              },
              timeout: 5000
            })

            if (unitResponse.ok) {
              const unitData = await unitResponse.json()
              if (unitData.Description) {
                unitsCache.set(unitKey, unitData.Description)
                console.log(`   ✓ ${unitKey} = "${unitData.Description}"`)
              }
            }
          } catch (_err) {
            // Пропускаем ошибки отдельных единиц
          }
        }

        if (unitsCache.size > 0) {
          console.log(`✅ Loaded ${unitsCache.size} units total`)
          return
        }
      }
    }

    throw new Error('Could not load units from any source')
  } catch (err) {
    console.error(`⚠️ Failed to load units cache: ${err.message}`)
    // Добавляем дефолтные значения если не удалось загрузить
    console.log(`✅ Using default units cache`)
    unitsCache.set('4f2a121c-e233-11f0-862e-fa163e5c9fa8', 'кг')
    unitsCache.set('ead49f26-116c-11f1-9cfd-fa163e5c9fa8', 'шт')
    console.log(`   ${unitsCache.size} default units loaded`)
  }
}

// Загружаем кэш при старте сервера
loadUnitsCache()

// Создаём таблицы
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
try {
  db.exec(`ALTER TABLE onec_stocks ADD COLUMN ref_key TEXT`)
} catch(e) { /* already exists */ }
try {
  db.exec(`ALTER TABLE onec_stocks ADD COLUMN name TEXT`)
} catch(e) { /* already exists */ }
try {
  db.exec(`ALTER TABLE onec_stocks ADD COLUMN sku TEXT DEFAULT ''`)
} catch(e) { /* already exists */ }
try {
  db.exec(`ALTER TABLE onec_stocks ADD COLUMN current_stock REAL DEFAULT 0`)
} catch(e) { /* already exists */ }
try {
  db.exec(`ALTER TABLE onec_stocks ADD COLUMN unit_key TEXT`)
} catch(e) { /* already exists */ }
try {
  db.exec(`ALTER TABLE onec_stocks ADD COLUMN category TEXT DEFAULT ''`)
} catch(e) { /* already exists */ }
try {
  db.exec(`ALTER TABLE onec_stocks ADD COLUMN status TEXT DEFAULT 'in_stock'`)
} catch(e) { /* already exists */ }
try {
  db.exec(`ALTER TABLE onec_stocks ADD COLUMN location TEXT`)
} catch(e) { /* already exists */ }
try {
  db.exec(`ALTER TABLE onec_stocks ADD COLUMN reserved REAL DEFAULT 0`)
} catch(e) { /* already exists */ }
try {
  db.exec(`ALTER TABLE onec_stocks ADD COLUMN purchasePrice REAL DEFAULT 0`)
} catch(e) { /* already exists */ }
try {
  db.exec(`ALTER TABLE onec_stocks ADD COLUMN averagePrice REAL DEFAULT 0`)
} catch(e) { /* already exists */ }
try {
  db.exec(`ALTER TABLE onec_stocks ADD COLUMN reservesByOrder TEXT DEFAULT '{}'`)
} catch(e) { /* already exists */ }
try {
  db.exec(`ALTER TABLE onec_stocks ADD COLUMN storageBin TEXT`)
} catch(e) { /* already exists */ }
try {
  db.exec(`ALTER TABLE onec_stocks ADD COLUMN barcode TEXT`)
} catch(e) { /* already exists */ }
try {
  db.exec(`ALTER TABLE onec_stocks ADD COLUMN image TEXT`)
} catch(e) { /* already exists */ }
try {
  db.exec(`ALTER TABLE onec_stocks ADD COLUMN local_only INTEGER DEFAULT 0`)
} catch(e) { /* already exists */ }
try {
  db.exec(`ALTER TABLE onec_orders ADD COLUMN items TEXT DEFAULT '[]'`)
} catch(e) { /* already exists */ }
try {
  db.exec(`ALTER TABLE onec_orders ADD COLUMN painting TEXT DEFAULT ''`)
} catch(e) { /* already exists */ }

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
    // For label_info, set to NULL if it equals product_name (old auto-fill logic)
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
  db.prepare('ALTER TABLE users ADD COLUMN needs_password_change INTEGER DEFAULT 1').run()
  console.log('✓ Added needs_password_change column to users')
} catch (e) { /* column already exists */ }

// Миграция: обновляем старые plain-text пароли на bcrypt
try {
  const oldUsers = db.prepare('SELECT id, login, password_hash FROM users WHERE LENGTH(password_hash) < 30').all()
  for (const user of oldUsers) {
    // Если hash слишком короткий, это вероятно plain-text пароль
    // Перехешируем его с bcrypt
    const passwordHash = hashSync(user.password_hash, 10)
    db.prepare('UPDATE users SET password_hash = ?, needs_password_change = 0 WHERE id = ?').run(passwordHash, user.id)
    console.log(`✓ Migrated user password hash: ${user.login}`)
  }
} catch (err) {
  console.error('Error migrating passwords:', err.message)
}

// Создаём тестовых пользователей если их нет
const testUsers = [
  { login: 'admin', password: 'admin', fullName: 'Admin User', role: 'director' },
  { login: 'manager', password: 'manager', fullName: 'Manager User', role: 'manager' },
  { login: 'storekeeper', password: 'storekeeper', fullName: 'Storekeeper User', role: 'storekeeper' },
  { login: 'worker', password: 'worker', fullName: 'Worker User', role: 'worker' }
]

for (const user of testUsers) {
  try {
    const existing = db.prepare('SELECT id, password_hash FROM users WHERE login = ?').get(user.login)
    if (!existing) {
      // Создаем новых пользователей с bcrypt хешем
      const passwordHash = hashSync(user.password, 10)
      db.prepare('INSERT INTO users (login, password_hash, full_name, role, is_active, needs_password_change) VALUES (?, ?, ?, ?, 1, 0)')
        .run(user.login, passwordHash, user.fullName, user.role)
      console.log(`✓ Created user: ${user.login}`)
    } else if (existing.password_hash === user.login) {
      // Обновляем старых пользователей с plain text паролем на bcrypt
      const passwordHash = hashSync(user.password, 10)
      db.prepare('UPDATE users SET password_hash = ? WHERE login = ?')
        .run(passwordHash, user.login)
      console.log(`✓ Updated user password hash: ${user.login}`)
    }
  } catch (err) {
    console.error(`Error creating/updating user ${user.login}:`, err.message)
  }
}

// Initialize employees table if it doesn't exist
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

// Initialize tools table if it doesn't exist
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

// Initialize tool_breakdowns table if it doesn't exist
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

// Initialize material_invoices table if it doesn't exist
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

// Initialize material_invoice_items table if it doesn't exist
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

// In-memory cache для 1C данных
const cache = {
  units: [],
  categories: [],
  warehouses: [],
  stocks: [],
  orders: []
}

// Переменные для отслеживания синхронизации
let lastSyncTime = {
  value: null,
  status: 'pending',
  error: null,
  connectionStatus: 'unknown',
  lastSyncByType: {
    units: null,
    warehouses: null,
    stocks: null,
    orders: null
  }
}

// Логирование синхронизации
function writeSyncLog(message) {
  const logsDir = '.data'
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true })
  }
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] ${message}\n`
  const logFile = `${logsDir}/sync.log`
  fs.appendFileSync(logFile, logMessage)
}

// Функция для инициализации 1C данных в БД


// Функция для загрузки кэша из БД
// Функция для запроса к 1C OData (как в TypeScript сервисе)
async function fetch1COData(endpoint, params = {}) {
  const authHeader = getBasicAuthHeader()

  // Убираем слэш в конце baseUrl если он есть
  const baseUrl = ONEC_CONFIG.baseUrl.replace(/\/$/, '')

  // Формируем параметры запроса
  const queryParams = new URLSearchParams()
  queryParams.append('$format', 'json')
  if (params.$top) queryParams.append('$top', params.$top)
  if (params.$skip) queryParams.append('$skip', params.$skip)
  if (params.$select) queryParams.append('$select', params.$select)
  if (params.$filter) queryParams.append('$filter', params.$filter)
  if (params.$orderby) queryParams.append('$orderby', params.$orderby)

  // Очищаем endpoint от параметров если они там есть
  const cleanEndpoint = endpoint.split('?')[0]
  // Формируем полный URL (добавляем слэш если его нет)
  const url = `${baseUrl}/${cleanEndpoint}?${queryParams.toString()}`

  console.log(`📡 [1C] GET ${cleanEndpoint}`)
  console.log(`   URL: ${url}`)
  console.log(`   Auth: ${authHeader.substring(0, 30)}...`)

  try {
    // Используем AbortController для timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), ONEC_CONFIG.timeout)

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      console.warn(`⚠️ [1C] HTTP ${response.status}: ${response.statusText}`)
      console.warn(`   Response: ${errorText.substring(0, 300)}`)
      return null
    }

    const data = await response.json()
    const items = data.value || []
    console.log(`✓ [1C] Got ${items.length} items from ${cleanEndpoint}`)
    return items
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn(`⚠️ [1C] Timeout: ${cleanEndpoint} (${ONEC_CONFIG.timeout}ms)`)
    } else {
      console.warn(`⚠️ [1C] Error: ${err.message}`)
    }
    return null
  }
}

// Функции для загрузки конкретных данных из 1C
// На основе реальных запросов из useStockBalances.ts
async function fetch1CUnits() {
  // Получаем единицы измерения из ПРАВИЛЬНОГО классификатора 1C
  let units = await fetch1COData('Catalog_КлассификаторЕдиницИзмерения', {
    '$select': 'Ref_Key,Description,Code',
    '$orderby': 'Description'
  })

  // Если там нет, пробуем альтернативный каталог
  if (!units || units.length === 0) {
    console.log('⚠️  No units from Catalog_КлассификаторЕдиницИзмерения, trying Catalog_ЕдиницыИзмерения...')
    units = await fetch1COData('Catalog_ЕдиницыИзмерения', {
      '$select': 'Ref_Key,Description'
    })
  }

  // Если всё ещё ничего нет, извлекаем из номенклатуры как fallback
  if (!units || units.length === 0) {
    console.log('⚠️  No units from either catalog, extracting from Nomenclature...')

    const nomenclature = await fetch1COData('Catalog_Номенклатура', {
      '$select': 'Ref_Key,ЕдиницаИзмерения_Key',
      '$top': '10000'
    })

    if (nomenclature && nomenclature.length > 0) {
      const uniqueUoms = new Map()
      for (const nom of nomenclature) {
        const uomKey = nom.ЕдиницаИзмерения_Key
        if (uomKey && !uniqueUoms.has(uomKey)) {
          uniqueUoms.set(uomKey, { Ref_Key: uomKey, Description: '?' })
        }
      }

      if (uniqueUoms.size > 0) {
        units = Array.from(uniqueUoms.values())
        console.log(`  ⚠️  Found ${units.length} unique units in Nomenclature`)
      }
    }
  }

  // Если всё ещё ничего нет, используем дефолтные
  if (!units || units.length === 0) {
    console.log('⚠️  No units found anywhere, using default units')
    units = [
      { Ref_Key: '00000000-0000-0000-0000-000000000001', Description: 'шт' },
      { Ref_Key: '00000000-0000-0000-0000-000000000002', Description: 'кг' },
      { Ref_Key: '00000000-0000-0000-0000-000000000003', Description: 'л' },
      { Ref_Key: '00000000-0000-0000-0000-000000000004', Description: 'м' },
      { Ref_Key: '00000000-0000-0000-0000-000000000005', Description: 'м²' }
    ]
  }

  return units.map((unit) => ({
    ref_key: unit.Ref_Key || unit.ref_key,
    description: unit.Description || unit.description
  }))
}

async function fetch1CCategories() {
  // Получаем категории номенклатуры из справочника
  const categories = await fetch1COData('Catalog_КатегорииНоменклатуры', {
    '$select': 'Ref_Key,Description'
  })

  if (!categories || categories.length === 0) return null

  return categories.map((cat) => ({
    ref_key: cat.Ref_Key,
    description: cat.Description
  }))
}

async function fetch1CWarehouses() {
  // Запрашиваем только склады (DeletionMark eq false) - как в реальном коде useStockBalances.ts
  // Если основной запрос не работает, пробуем без фильтров

  // Попытка 1: с фильтром
  let warehouses = await fetch1COData('Catalog_СтруктурныеЕдиницы', {
    '$select': 'Ref_Key,Code,Description,ТипСтруктурнойЕдиницы',
    '$filter': "DeletionMark eq false and (ТипСтруктурнойЕдиницы eq 'Склад' or ТипСтруктурнойЕдиницы eq 'Розница')",
    '$orderby': 'Description'
  })

  // Попытка 2: без фильтра, если первое не сработало
  if (!warehouses || warehouses.length === 0) {
    warehouses = await fetch1COData('Catalog_СтруктурныеЕдиницы', {
      '$select': 'Ref_Key,Description'
    })
  }

  if (warehouses && warehouses.length > 0) {
    return warehouses.map((w) => ({
      ref_key: w.Ref_Key || w.ref_key,
      description: w.Description || w.description
    }))
  }
  return null
}

async function fetch1CStocks() {
  console.log('📦 Загружаем материалы: номенклатура + единицы + остатки...')

  // 0. Сначала загружаем каталог номенклатуры чтобы получить единицы оттуда
  const nomenclature = await fetch1COData('Catalog_Номенклатура', {
    '$select': 'Ref_Key,Description,Артикул,ЕдиницаИзмерения_Key,КатегорияНоменклатуры_Key,DeletionMark',
    '$top': '10000'
  })

  if (!nomenclature || nomenclature.length === 0) {
    console.warn('⚠️ Номенклатура не получена')
    return null
  }
  console.log(`  ✓ Номенклатура: ${nomenclature.length} позиций`)

  // 1. Загружаем единицы измерения из каталога 1C
  let uomData = await fetch1COData('Catalog_ЕдиницыИзмерения', { '$select': 'Ref_Key,Description' })

  // Если в 1C нет единиц, извлекаем уникальные GUID из номенклатуры
  if (!uomData || uomData.length === 0) {
    console.log('⚠️  No units from Catalog_ЕдиницыИзмерения, extracting from Nomenclature...')

    // Собираем уникальные GUID единиц из номенклатуры
    const uniqueUoms = new Map()
    for (const nom of nomenclature) {
      const uomKey = nom.ЕдиницаИзмерения_Key
      if (uomKey && !uniqueUoms.has(uomKey)) {
        uniqueUoms.set(uomKey, { Ref_Key: uomKey, Description: '?' })
      }
    }

    if (uniqueUoms.size > 0) {
      console.log(`  ⚠️  Found ${uniqueUoms.size} unique units in Nomenclature`)
      uomData = Array.from(uniqueUoms.values())
    }
  }

  // Если всё ещё ничего нет, используем дефолтные с нашими GUID
  if (!uomData || uomData.length === 0) {
    console.log('⚠️  No units found anywhere, using default UOM mapping')
    uomData = [
      { Ref_Key: '00000000-0000-0000-0000-000000000001', Description: 'шт' },
      { Ref_Key: '00000000-0000-0000-0000-000000000002', Description: 'кг' },
      { Ref_Key: '00000000-0000-0000-0000-000000000003', Description: 'л' },
      { Ref_Key: '00000000-0000-0000-0000-000000000004', Description: 'м' },
      { Ref_Key: '00000000-0000-0000-0000-000000000005', Description: 'м²' }
    ]
  }

  const uomMap = new Map()
  if (uomData) {
    for (const u of uomData) uomMap.set(u.Ref_Key, u.Description)
    console.log(`  ✓ UOM: ${uomData.length} единиц измерения`)
  }

  // Строим карту номенклатуры по Ref_Key
  const nomMap = new Map()
  for (const n of nomenclature) {
    if (!n.DeletionMark) { // пропускаем помеченные на удаление
      nomMap.set(n.Ref_Key, n)
    }
  }

  // 3. Загружаем остатки из регистра накопления
  // Регистр может возвращать вложенную структуру: [{Recorder, RecordSet: [{Номенклатура_Key,...}]}]
  // или плоский список - нужно обработать оба варианта как в fetchMovements()
  // ВАЖНО: нельзя использовать $select с полями для регистра накопления!
  let registerRaw = await fetch1COData('AccumulationRegister_ЗапасыНаСкладах', {
    '$top': '100000'
  })

  if (!registerRaw || registerRaw.length === 0) {
    registerRaw = await fetch1COData('AccumulationRegister_Запасы', { '$top': '100000' })
  }

  // Разворачиваем RecordSet если данные в вложенном формате (как в fetchMovements)
  const movements = []
  if (registerRaw && Array.isArray(registerRaw)) {
    registerRaw.forEach((record) => {
      // Если запись пришла в виде набора (RecordSet)
      if (record.RecordSet && Array.isArray(record.RecordSet)) {
        record.RecordSet.forEach((item) => {
          const itemId = item.Номенклатура_Key
          if (!itemId) return

          const type = String(item.RecordType)
          const isReceipt = type === 'Receipt' || type === '0' || type === 'true' || type === 'Active'
          movements.push({
            nomId: itemId,
            quantity: Number(item.Количество) || 0,
            isReceipt: isReceipt,
            warehouse: item.СтруктурнаяЕдиница_Key || item.Склад_Key
          })
        })
      } else {
        // Если запись пришла плоским списком (стандартный формат)
        const itemId = record.Номенклатура_Key
        if (!itemId) return

        const type = String(record.RecordType)
        const isReceipt = type === 'Receipt' || type === '0' || type === 'true' || type === 'Active'
        movements.push({
          nomId: itemId,
          quantity: Number(record.Количество) || 0,
          isReceipt: isReceipt,
          warehouse: record.СтруктурнаяЕдиница_Key || record.Склад_Key
        })
      }
    })
  }

  // 4. Загружаем склады для получения имён
  const warehouseData = await fetch1COData('Catalog_СтруктурныеЕдиницы', {
    '$select': 'Ref_Key,Description'
  })
  const warehouseMap = new Map()
  if (warehouseData) {
    for (const w of warehouseData) warehouseMap.set(w.Ref_Key, w.Description)
  }

  // 4a. Загружаем категории для получения имён
  const categoryData = await fetch1COData('Catalog_КатегорииНоменклатуры', {
    '$select': 'Ref_Key,Description'
  })
  const categoryMap = new Map()
  if (categoryData) {
    for (const c of categoryData) categoryMap.set(c.Ref_Key, c.Description)
  }

  // 5. Агрегируем остатки по номенклатуре: Приход - Расход = остаток
  const balanceMap = new Map() // nomKey → quantity
  const warehouseByNom = new Map() // nomKey → первый склад
  if (movements && movements.length > 0) {
    console.log(`  ✓ Регистр остатков: ${movements.length} записей`)
    for (const m of movements) {
      const nomKey = m.nomId
      if (!nomKey) continue
      const qty = m.quantity
      // isReceipt = true → приход (+), false → расход (-)
      const delta = m.isReceipt ? qty : -qty
      balanceMap.set(nomKey, (balanceMap.get(nomKey) || 0) + delta)
      if (!warehouseByNom.has(nomKey) && m.warehouse) {
        warehouseByNom.set(nomKey, m.warehouse)
      }
    }
  } else {
    console.warn('⚠️ Данные регистра остатков не получены, остатки будут 0')
  }

  // 6. Загружаем цены товаров
  const priceMap = await fetchPrices()

  // 7. Собираем финальный список материалов
  const result = []
  for (const n of nomenclature) {
    if (n.DeletionMark) continue // пропускаем удалённые
    const qty = balanceMap.get(n.Ref_Key) || 0
    const unitName = uomMap.get(n.ЕдиницаИзмерения_Key) || 'шт'
    const whKey = warehouseByNom.get(n.Ref_Key) || ''
    const whName = warehouseMap.get(whKey) || 'Основной склад'
    const price = priceMap.get(n.Ref_Key) || 0

    // Если ЕдиницаИзмерения_Key из номенклатуры не в таблице, ищем соответствующий GUID по названию
    let unitKey = n.ЕдиницаИзмерения_Key || ''
    if (unitKey && !uomMap.has(unitKey)) {
      // Не нашли эту единицу, ищем по названию
      for (const [key, name] of uomMap) {
        if (name === unitName) {
          unitKey = key
          break
        }
      }
    }

    // Получаем название категории по КатегорияНоменклатуры_Key
    const categoryName = categoryMap.get(n.КатегорияНоменклатуры_Key) || ''

    result.push({
      id: n.Ref_Key,
      ref_key: n.Ref_Key,
      name: n.Description || 'Без названия',
      sku: n.Артикул || '',
      product: n.Description || 'Без названия',
      warehouse: whName,
      location: '',  // location - это локальное поле, загружается из БД
      quantity: Math.max(0, qty),
      current_stock: Math.max(0, qty),
      unit: unitName,
      unit_key: unitKey,
      category: categoryName,
      reserved: 0,
      available: Math.max(0, qty),
      minStock: 0,
      purchasePrice: price,
      averagePrice: price,
      status: qty > 0 ? 'in_stock' : 'out_of_stock'
    })
  }

  console.log(`  ✓ Итого материалов: ${result.length} позиций (${result.filter(r => r.quantity > 0).length} с остатком)`)
  return result
}

async function fetch1COrders() {
  // Запрашиваем заказы покупателей с именами клиентов и статусами
  const orders = await fetch1COData('Document_ЗаказПокупателя', {
    '$select': 'Ref_Key,Number,Date,Контрагент____Presentation,СостояниеЗаказа____Presentation,СуммаДокумента',
    '$orderby': 'Date desc',
    '$top': '500'
  })
  if (!orders) return null

  // Для каждого заказа загружаем позиции
  const result = []
  for (const o of orders) {
    const orderId = o.Ref_Key
    let items = []

    try {
      // Пытаемся получить позиции для заказа
      const selectFields = 'LineNumber,Номенклатура_Key,Номенклатура____Presentation,Номенклатура_Presentation,Количество,Цена,Сумма,ЕдиницаИзмерения_Key'
      const orderItems = await fetch1COData(`Document_ЗаказПокупателя(guid'${orderId}')/Запасы`, {
        '$select': selectFields
      })

      if (orderItems && Array.isArray(orderItems)) {
        // Строим карту названий товаров - сначала из кэша, если нужно то из 1C
        const nomMap = new Map()
        if (cache.stocks && cache.stocks.length > 0) {
          cache.stocks.forEach((stock) => {
            if (stock.ref_key) {
              nomMap.set(stock.ref_key, stock.name || stock.product)
            }
          })
        }

        items = orderItems.map((item) => {
          const prodId = item.Номенклатура_Key || item.Номенклатура || ''
          let prodName = item.Номенклатура____Presentation || item.Номенклатура_Presentation || ''

          // Если название пусто, ищем в кэше материалов
          if (!prodName && prodId) {
            prodName = nomMap.get(prodId) || 'Неизвестный товар'
          } else if (!prodName) {
            prodName = 'Неизвестный товар'
          }

          return {
            id: item.LineNumber || `${orderId}-${Math.random()}`,
            orderId: orderId,
            productId: prodId,
            productName: prodName,
            itemName: prodName,
            quantity: Number(item.Количество) || 0,
            unitPrice: Number(item.Цена) || 0,
            totalPrice: Number(item.Сумма) || 0,
            unit: item.ЕдиницаИзмерения_Key ? (cache.units?.find((u) => u.ref_key === item.ЕдиницаИзмерения_Key)?.description || 'шт') : 'шт',
            plannedQuantity: Number(item.Количество) || 0,
            actualQuantity: 0,
            remainingQuantity: Number(item.Количество) || 0,
            materialUsed: '',
            paintUsed: ''
          }
        })
      }
    } catch (err) {
      console.warn(`⚠️ Could not load items for order ${orderId}:`, err.message)
    }

    result.push({
      id: o.Ref_Key || o.Number,
      ref_key: o.Ref_Key,
      order_number: o.Number || o.Ref_Key,
      date: o.Date || new Date().toISOString().split('T')[0],
      customer: o.Контрагент____Presentation || 'Unknown Customer',
      status: o.СостояниеЗаказа____Presentation || 'pending',
      amount: Number(o.СуммаДокумента || 0),
      items_count: items.length,
      items: items
    })
  }

  return result
}

async function fetch1CTransferOrders() {
  console.log('📦 Загружаем заказы на перемещение из 1C...')
  try {
    const baseUrl = ONEC_CONFIG.baseUrl.replace(/\/$/, '')
    const url = `${baseUrl}/Document_ЗаказНаПеремещение?$format=json&$top=500&$select=Ref_Key,Number,Date,СтруктурнаяЕдиницаРезерв_Key,СтруктурнаяЕдиницаПолучатель_Key,Posted,ЗаказПокупателя_Key,СтруктурнаяЕдиницаРезерв____Presentation,СтруктурнаяЕдиницаПолучатель____Presentation,ЗаказПокупателя____Presentation&$orderby=Date desc`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    const response = await fetch(url, {
      headers: {
        'Authorization': getBasicAuthHeader(),
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.warn(`⚠️ 1C error fetching transfer orders: ${response.status}`)
      return []
    }

    const data = await response.json()
    const orders = (data.value || []).map(order => ({
      ref_key: order.Ref_Key,
      order_number: order.Number,
      date: order.Date,
      source_warehouse_key: order.СтруктурнаяЕдиницаРезерв_Key,
      source_warehouse_name: order.СтруктурнаяЕдиницаРезерв____Presentation || 'Unknown',
      destination_warehouse_key: order.СтруктурнаяЕдиницаПолучатель_Key,
      destination_warehouse_name: order.СтруктурнаяЕдиницаПолучатель____Presentation || 'Unknown',
      customer_order_key: order.ЗаказПокупателя_Key || '',
      customer_order_number: order.ЗаказПокупателя____Presentation || '',
      posted: order.Posted ? 1 : 0
    }))

    console.log(`  ✓ Transfer orders: ${orders.length} загружено`)
    return orders
  } catch (err) {
    console.warn('⚠️ Error fetching transfer orders:', err.message)
    return []
  }
}

function loadCacheFromDB() {
  try {
    cache.units = db.prepare('SELECT ref_key, description FROM onec_units').all()
    cache.warehouses = db.prepare('SELECT ref_key, description FROM onec_warehouses').all()
    cache.categories = db.prepare('SELECT ref_key, description FROM onec_categories').all()

    // Создаём карту для преобразования unit_key -> unit название
    const unitsMap = new Map()
    cache.units.forEach(u => {
      unitsMap.set(u.ref_key, u.description)
    })

    cache.stocks = db.prepare(`
      SELECT
        id, ref_key, name, sku, product, warehouse, location,
        COALESCE(current_stock, quantity) as currentStock,
        COALESCE(current_stock, quantity) as quantity,
        unit, unit_key, category, status, reserved, purchasePrice, averagePrice, reservesByOrder, storageBin, local_only
      FROM onec_stocks
    `).all().map(s => ({
      ...s,
      type: (s.category === 'Готовая продукция' || s.warehouse === 'Готовая продукция') ? 'product' : 'material',
      categoryId: (s.category === 'Готовая продукция' || s.warehouse === 'Готовая продукция') ? '99' : '',
      // Преобразуем unit_key в нормальное название, если оно есть
      unit: (s.unit_key && unitsMap.has(s.unit_key)) ? unitsMap.get(s.unit_key) : (s.unit || 'шт'),
      available: Math.max(0, (s.currentStock || 0) - (s.reserved || 0)),
      minStock: 0,
      averagePrice: Number(s.averagePrice || s.purchasePrice || 0),
      purchasePrice: Number(s.purchasePrice || 0),
      status: (s.currentStock || 0) > 0 ? 'in_stock' : 'out_of_stock',
      reservesByOrder: s.reservesByOrder ? JSON.parse(s.reservesByOrder) : {}
    }))
    cache.orders = db.prepare('SELECT ref_key as id, order_number, date, customer, status, items_count as items, amount, items as items_json, painting FROM onec_orders').all().map(o => ({
      ...o,
      notes: o.painting,
      items: o.items_json ? JSON.parse(o.items_json) : []
    }))
    console.log('✓ Loaded cache from database')
  } catch (err) {
    console.error('Error loading cache from DB:', err.message)
    // На случай ошибки пытаемся ещё раз после синхронизации
  }
}

// Инициализируем и загружаем данные
loadCacheFromDB()

// Вспомогательная функция для отправки JSON
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

// Вспомогательная функция для чтения body
function _readBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch (err) {
        reject(err)
      }
    })
    req.on('error', reject)
  })
}

// Функция для расчета резервов из заказов и регистра Запасы
async function calculateReserves() {
  try {
    console.log('  📦 Calculating reserves from orders...')
    // Получаем данные о резервах из регистра Запасы с привязкой к заказам
    const reserveData = await fetch1COData('AccumulationRegister_Запасы', { '$top': '100000' })
    const reserveMap = new Map() // { nomId -> { total: number, byOrder: { orderId -> qty } } }

    if (reserveData && Array.isArray(reserveData)) {
      reserveData.forEach(record => {
        // Обрабатываем как RecordSet так и плоский список
        const items = (record.RecordSet && Array.isArray(record.RecordSet)) ? record.RecordSet : [record]

        items.forEach(item => {
          const nomId = item.Номенклатура_Key
          if (!nomId) return

          // Проверяем есть ли привязка к заказу
          const orderId = item.ЗаказПокупателя_Key || item.Заказ_Key
          const hasOrder = orderId && orderId !== '00000000-0000-0000-0000-000000000000'

          if (!hasOrder) return // Нас интересуют только зарезервированные под заказы

          const qty = Number(item.Количество) || 0
          const type = String(item.RecordType)
          const isPlus = type === 'Receipt' || type === '0' || type === 'true' || type === 'Active'
          const finalQty = isPlus ? qty : -qty

          if (!reserveMap.has(nomId)) {
            reserveMap.set(nomId, { total: 0, byOrder: {} })
          }

          const reserve = reserveMap.get(nomId)
          reserve.total = Number((reserve.total + finalQty).toFixed(3))

          const orderQty = reserve.byOrder[orderId] || 0
          reserve.byOrder[orderId] = Number((orderQty + finalQty).toFixed(3))
        })
      })
    }

    console.log(`  ✓ Calculated reserves for ${reserveMap.size} materials`)
    return reserveMap
  } catch (err) {
    console.warn('  ⚠️ Error calculating reserves:', err.message)
    return new Map()
  }
}

// Функция для получения цен товаров из регистра цен
async function fetchPrices() {
  try {
    console.log('  💰 Fetching prices from 1C...')
    const priceRegisters = ['InformationRegister_ЦеныНоменклатуры', 'InformationRegister_ЦеныНоменклатурыИХарактеристик']

    for (const register of priceRegisters) {
      try {
        const prices = await fetch1COData(register, {
          '$select': 'Номенклатура_Key,Цена,Period',
          '$orderby': 'Period desc',
          '$top': '5000'
        })

        if (prices && Array.isArray(prices) && prices.length > 0) {
          const priceMap = new Map()
          prices.forEach(p => {
            const nomId = p.Номенклатура_Key
            const price = Number(p.Цена) || 0
            // Сохраняем только последнюю (最新) цену для каждого товара
            if (nomId && !priceMap.has(nomId)) {
              priceMap.set(nomId, price)
            }
          })
          console.log(`  ✓ Got prices for ${priceMap.size} materials from ${register}`)
          return priceMap
        }
      } catch (err) {
        console.log(`  ⚠️ Register ${register} not available`)
        continue
      }
    }
    return new Map()
  } catch (err) {
    console.warn('  ⚠️ Error fetching prices:', err.message)
    return new Map()
  }
}

// Incremental sync functions
function syncUnitsIncremental(units1C) {
  const stats = { added: 0, updated: 0, deleted: 0 }
  if (!units1C || units1C.length === 0) return stats

  const ref_keysIn1C = new Set(units1C.map(u => u.ref_key))
  const existing = db.prepare('SELECT ref_key FROM onec_units').all()
  const existingMap = new Map(existing.map(u => [u.ref_key, u]))

  // Добавляем новые и обновляем существующие
  for (const unit of units1C) {
    if (existingMap.has(unit.ref_key)) {
      db.prepare('UPDATE onec_units SET description = ? WHERE ref_key = ?')
        .run(unit.description, unit.ref_key)
      stats.updated++
    } else {
      try {
        db.prepare('INSERT INTO onec_units (ref_key, description) VALUES (?, ?)')
          .run(unit.ref_key, unit.description)
        stats.added++
      } catch (e) { /* ignore duplicates */ }
    }
  }

  // Удаляем старые
  for (const [ref_key] of existingMap) {
    if (!ref_keysIn1C.has(ref_key)) {
      db.prepare('DELETE FROM onec_units WHERE ref_key = ?').run(ref_key)
      stats.deleted++
    }
  }

  return stats
}

function syncCategoriesIncremental(categories1C) {
  const stats = { added: 0, updated: 0, deleted: 0 }
  if (!categories1C || categories1C.length === 0) return stats

  const ref_keysIn1C = new Set(categories1C.map(c => c.ref_key))
  const existing = db.prepare('SELECT ref_key FROM onec_categories').all()
  const existingMap = new Map(existing.map(c => [c.ref_key, c]))

  for (const cat of categories1C) {
    if (existingMap.has(cat.ref_key)) {
      db.prepare('UPDATE onec_categories SET description = ? WHERE ref_key = ?')
        .run(cat.description, cat.ref_key)
      stats.updated++
    } else {
      try {
        db.prepare('INSERT INTO onec_categories (ref_key, description) VALUES (?, ?)')
          .run(cat.ref_key, cat.description)
        stats.added++
      } catch (e) { /* ignore duplicates */ }
    }
  }

  for (const [ref_key] of existingMap) {
    if (!ref_keysIn1C.has(ref_key)) {
      db.prepare('DELETE FROM onec_categories WHERE ref_key = ?').run(ref_key)
      stats.deleted++
    }
  }

  return stats
}

function syncWarehousesIncremental(warehouses1C) {
  const stats = { added: 0, updated: 0, deleted: 0 }
  if (!warehouses1C || warehouses1C.length === 0) return stats

  const ref_keysIn1C = new Set(warehouses1C.map(w => w.ref_key))
  const existing = db.prepare('SELECT ref_key FROM onec_warehouses').all()
  const existingMap = new Map(existing.map(w => [w.ref_key, w]))

  for (const wh of warehouses1C) {
    if (existingMap.has(wh.ref_key)) {
      db.prepare('UPDATE onec_warehouses SET description = ? WHERE ref_key = ?')
        .run(wh.description, wh.ref_key)
      stats.updated++
    } else {
      try {
        db.prepare('INSERT INTO onec_warehouses (ref_key, description) VALUES (?, ?)')
          .run(wh.ref_key, wh.description)
        stats.added++
      } catch (e) { /* ignore duplicates */ }
    }
  }

  for (const [ref_key] of existingMap) {
    if (!ref_keysIn1C.has(ref_key)) {
      db.prepare('DELETE FROM onec_warehouses WHERE ref_key = ?').run(ref_key)
      stats.deleted++
    }
  }

  return stats
}

function syncStocksIncremental(stocks) {
  const stats = { added: 0, updated: 0, deleted: 0 }
  if (!stocks || stocks.length === 0) return stats

  const ref_keysIn1C = new Set(stocks.map(s => s.ref_key))
  const _existing = db.prepare('SELECT ref_key, COALESCE(local_only, 0) as local_only FROM onec_stocks').all()
  const existingMap = new Map(_existing.map(s => [s.ref_key, s]))

  for (const stock of stocks) {
    if (existingMap.has(stock.ref_key)) {
      // Don't overwrite local-only fields (sku, location, storageBin) that user has set
      const existing = existingMap.get(stock.ref_key)
      
      // Логика для картинок: если из 1С пришла картинка И у нас ее нет - сохранить 1С версию
      // Если у нас уже есть картинка - оставить нашу
      const existingRecord = db.prepare('SELECT image FROM onec_stocks WHERE ref_key = ?').get(stock.ref_key)
      const imageToSave = existingRecord?.image || stock.image || null
      
      db.prepare(`UPDATE onec_stocks SET
        name = ?, product = ?, warehouse = ?,
        quantity = ?, current_stock = ?, unit = ?, unit_key = ?, category = ?,
      status = ?, reserved = ?, purchasePrice = ?, averagePrice = ?, reservesByOrder = ?, image = ?, local_only = COALESCE(local_only, 0)
        WHERE ref_key = ?`)
        .run(
          stock.name || stock.product,
          stock.product || stock.name,
          stock.warehouse || '',
          stock.quantity || 0,
          stock.current_stock || stock.quantity || 0,
          stock.unit || 'шт',
          stock.unit_key || '',
          stock.category || '',
          stock.status || 'in_stock',
          stock.reserved || 0,
          stock.purchasePrice || 0,
          stock.averagePrice || stock.purchasePrice || 0,
          JSON.stringify(stock.reservesByOrder || {}),
          imageToSave,
          stock.ref_key
        )
      stats.updated++
    } else {
      try {
        // Определяем правильное значение unit для нового товара
        let unitValue = 'шт'  // Default unit
        if (stock.unit_key) {
          // Если есть unit_key, ищем описание в кэше
          const unitRecord = cache.units?.find(u => u.ref_key === stock.unit_key)
          if (unitRecord) {
            unitValue = unitRecord.description
          }
        } else if (stock.unit && stock.unit !== '?' && stock.unit.length > 0 && !stock.unit.match(/^[a-f0-9\-]{36}$/)) {
          // Если unit существует, это не GUID и это не '?', используем его
          unitValue = stock.unit
        }

        db.prepare(`INSERT INTO onec_stocks
          (ref_key, name, sku, product, warehouse, location, quantity, current_stock, unit, unit_key, category, status, reserved, purchasePrice, averagePrice, reservesByOrder, image, local_only)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(
            stock.ref_key || null,
            stock.name || stock.product,
            '',  // sku always empty initially (local-only field)
            stock.product || stock.name,
            stock.warehouse || '',
            '',  // location always empty initially (local-only field)
            stock.quantity || 0,
            stock.current_stock || stock.quantity || 0,
            unitValue,  // Сохраняем правильное значение unit
            stock.unit_key || '',
            stock.category || '',
            stock.status || 'in_stock',
            stock.reserved || 0,
            stock.purchasePrice || 0,
            stock.averagePrice || stock.purchasePrice || 0,
            JSON.stringify(stock.reservesByOrder || {}),
            stock.image || null,
            stock.local_only || 0
          )
        stats.added++
      } catch (e) { /* ignore */ }
    }
  }

  for (const [ref_key] of existingMap) {
    if (!ref_keysIn1C.has(ref_key) && Number(existingMap.get(ref_key)?.local_only || 0) !== 1) {
      db.prepare('DELETE FROM onec_stocks WHERE ref_key = ?').run(ref_key)
      stats.deleted++
    }
  }

  return stats
}

// Функция для трансформации статуса из 1C в наш формат
function transformOrderStatus(status1C) {
  // Маппинг русских статусов из 1C на английские
  const statusMap = {
    'Завершен': 'ready',
    'Выполнен': 'completed',
    'В работе': 'in_progress',
    'На выполнении': 'in_progress',
    'В обработке': 'processing',
    'Печать QR': 'printing',
    'Готов': 'ready',
    'Отгружен': 'shipped',
    'Отменен': 'cancelled'
  }

  // Если статус есть в маппинге, используем маппированное значение
  if (statusMap[status1C]) {
    return statusMap[status1C]
  }

  // Если статус уже в английском формате, возвращаем как есть
  if (['new', 'processing', 'printing', 'in_progress', 'partially_ready', 'ready', 'partially_shipped', 'shipped', 'completed', 'cancelled'].includes(status1C)) {
    return status1C
  }

  // По умолчанию считаем, что это "in_progress"
  return 'in_progress'
}

function syncTransferOrdersIncremental(orders) {
  const stats = { added: 0, updated: 0, deleted: 0 }
  if (!orders || orders.length === 0) return stats

  const idsIn1C = new Set(orders.map(o => o.ref_key))
  const existing = db.prepare('SELECT ref_key FROM transfer_orders').all()
  const existingMap = new Map(existing.map(o => [o.ref_key, o]))

  for (const order of orders) {
    const ref_key = order.ref_key

    if (existingMap.has(ref_key)) {
      db.prepare(`UPDATE transfer_orders SET
        order_number = ?, date = ?, source_warehouse_key = ?, source_warehouse_name = ?,
        destination_warehouse_key = ?, destination_warehouse_name = ?, customer_order_key = ?,
        customer_order_number = ?, posted = ?
        WHERE ref_key = ?`)
        .run(
          order.order_number,
          order.date,
          order.source_warehouse_key,
          order.source_warehouse_name,
          order.destination_warehouse_key,
          order.destination_warehouse_name,
          order.customer_order_key,
          order.customer_order_number,
          order.posted,
          ref_key
        )
      stats.updated++
    } else {
      try {
        db.prepare(`INSERT INTO transfer_orders (ref_key, order_number, date, source_warehouse_key,
          source_warehouse_name, destination_warehouse_key, destination_warehouse_name, customer_order_key,
          customer_order_number, posted)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(
            ref_key,
            order.order_number,
            order.date,
            order.source_warehouse_key,
            order.source_warehouse_name,
            order.destination_warehouse_key,
            order.destination_warehouse_name,
            order.customer_order_key,
            order.customer_order_number,
            order.posted
          )
        stats.added++
      } catch (e) { /* ignore duplicates */ }
    }
  }

  for (const [ref_key] of existingMap) {
    if (!idsIn1C.has(ref_key)) {
      db.prepare('DELETE FROM transfer_orders WHERE ref_key = ?').run(ref_key)
      stats.deleted++
    }
  }

  return stats
}

function syncOrdersIncremental(orders) {
  const stats = { added: 0, updated: 0, deleted: 0 }
  if (!orders || orders.length === 0) return stats

  const idsIn1C = new Set(orders.map(o => o.id || o.order_number))
  const existing = db.prepare('SELECT ref_key FROM onec_orders').all()
  const existingMap = new Map(existing.map(o => [o.ref_key, o]))

  for (const order of orders) {
    const ref_key = order.id || order.order_number
    const itemsJson = order.items ? JSON.stringify(order.items) : '[]'
    const transformedStatus = transformOrderStatus(order.status)

    if (existingMap.has(ref_key)) {
      db.prepare(`UPDATE onec_orders SET
        order_number = ?, date = ?, customer = ?, status = ?, amount = ?, items_count = ?, items = ?
        WHERE ref_key = ?`)
        .run(
          order.order_number || order.id,
          order.date,
          order.customer,
          transformedStatus,
          order.amount || 0,
          order.items_count || 0,
          itemsJson,
          ref_key
        )
      stats.updated++
    } else {
      try {
        db.prepare(`INSERT INTO onec_orders (ref_key, order_number, date, customer, status, amount, items_count, items)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(
            ref_key,
            order.order_number || order.id,
            order.date,
            order.customer,
            transformedStatus,
            order.amount || 0,
            order.items_count || 0,
            itemsJson
          )
        stats.added++
      } catch (e) { /* ignore duplicates */ }
    }
  }

  for (const [ref_key] of existingMap) {
    if (!idsIn1C.has(ref_key)) {
      db.prepare('DELETE FROM onec_orders WHERE ref_key = ?').run(ref_key)
      stats.deleted++
    }
  }

  return stats
}

// Функция для синхронизации всех данных с 1C
async function syncWith1C() {
  const syncLog = {
    timestamp: new Date().toISOString(),
    results: {
      units: { status: 'pending', count: 0 },
      categories: { status: 'pending', count: 0 },
      warehouses: { status: 'pending', count: 0 },
      stocks: { status: 'pending', count: 0 },
      orders: { status: 'pending', count: 0 }
    },
    usedFallback: false
  }

  try {
    // Попытаемся загрузить данные из 1C
    const units1C = await fetch1CUnits()
    const categories1C = await fetch1CCategories()
    const warehouses1C = await fetch1CWarehouses()
    const stocks1C = await fetch1CStocks()

    // Заполняем cache для использования в fetch1COrders
    if (stocks1C && stocks1C.length > 0) {
      cache.stocks = stocks1C
    }

    // Теперь загружаем заказы которые используют cache.stocks для разрешения названий товаров
    const orders1C = await fetch1COrders()

    // Загружаем заказы на перемещение
    const transferOrders1C = await fetch1CTransferOrders()

    // Если хотя бы что-то получили, используем реальные данные
    let use1CData = false
    if ((units1C && units1C.length > 0) ||
        (warehouses1C && warehouses1C.length > 0) ||
        (stocks1C && stocks1C.length > 0) ||
        (orders1C && orders1C.length > 0) ||
        (transferOrders1C && transferOrders1C.length > 0)) {
      use1CData = true
    }

    if (!use1CData) {
      const msg = '⚠️  1C unavailable - no data synchronized'
      console.log(msg)
      writeSyncLog(msg)
      syncLog.usedFallback = true
      lastSyncTime.connectionStatus = 'unavailable'

      // Не синхронизируем, просто выводим ошибку
      return syncLog
    }

    lastSyncTime.connectionStatus = 'connected'

    // Сохраняем категории в кэш (они редко меняются)
    if (categories1C && categories1C.length > 0) {
      cache.categories = categories1C
      console.log(`✓ Categories: ${categories1C.length} items cached`)
    }

    // Сохраняем единицы в кэш (они редко меняются)
    if (units1C && units1C.length > 0) {
      cache.units = units1C
      console.log(`✓ Units: ${units1C.length} items cached`)
    }

    // === INCREMENTAL SYNC ===
    const unitStats = syncUnitsIncremental(units1C)
    syncLog.results.units = { status: 'success', count: units1C?.length || 0, ...unitStats }
    console.log(`✓ Units: +${unitStats.added} ~${unitStats.updated} -${unitStats.deleted}`)
    writeSyncLog(`Units synced: +${unitStats.added} ~${unitStats.updated} -${unitStats.deleted}`)
    lastSyncTime.lastSyncByType.units = new Date().toISOString()

    const catStats = syncCategoriesIncremental(categories1C)
    syncLog.results.categories = { status: 'success', count: categories1C?.length || 0, ...catStats }
    console.log(`✓ Categories: +${catStats.added} ~${catStats.updated} -${catStats.deleted}`)
    writeSyncLog(`Categories synced: +${catStats.added} ~${catStats.updated} -${catStats.deleted}`)
    lastSyncTime.lastSyncByType.categories = new Date().toISOString()

    const whStats = syncWarehousesIncremental(warehouses1C)
    syncLog.results.warehouses = { status: 'success', count: warehouses1C?.length || 0, ...whStats }
    console.log(`✓ Warehouses: +${whStats.added} ~${whStats.updated} -${whStats.deleted}`)
    writeSyncLog(`Warehouses synced: +${whStats.added} ~${whStats.updated} -${whStats.deleted}`)
    lastSyncTime.lastSyncByType.warehouses = new Date().toISOString()

    const reserveMap = await calculateReserves()
    const stocksWithReserves = stocks1C.map(stock => {
      const reserveData = reserveMap.get(stock.ref_key)
      return {
        ...stock,
        reserved: reserveData ? reserveData.total : 0,
        reservesByOrder: reserveData ? reserveData.byOrder : {}
      }
    })
    const stockStats = syncStocksIncremental(stocksWithReserves)
    syncLog.results.stocks = { status: 'success', count: stocks1C.length, ...stockStats }
    console.log(`✓ Stocks: +${stockStats.added} ~${stockStats.updated} -${stockStats.deleted}`)
    writeSyncLog(`Stocks synced: +${stockStats.added} ~${stockStats.updated} -${stockStats.deleted}`)
    lastSyncTime.lastSyncByType.stocks = new Date().toISOString()

    const orderStats = syncOrdersIncremental(orders1C)
    syncLog.results.orders = { status: 'success', count: orders1C.length, ...orderStats }
    console.log(`✓ Orders: +${orderStats.added} ~${orderStats.updated} -${orderStats.deleted}`)
    lastSyncTime.lastSyncByType.orders = new Date().toISOString()

    const transferOrderStats = syncTransferOrdersIncremental(transferOrders1C)
    syncLog.results.transfer_orders = { status: 'success', count: transferOrders1C.length, ...transferOrderStats }
    console.log(`✓ Transfer Orders: +${transferOrderStats.added} ~${transferOrderStats.updated} -${transferOrderStats.deleted}`)
    lastSyncTime.lastSyncByType.transfer_orders = new Date().toISOString()

    // Перезагружаем кэш
    loadCacheFromDB()

    // Обновляем время последней синхронизации
    lastSyncTime.value = new Date().toISOString()
    lastSyncTime.status = syncLog.usedFallback ? 'fallback' : 'success'

    console.log('✓ Sync completed:', syncLog.results)
    return syncLog
  } catch (err) {
    const errorMsg = `✗ Sync error: ${err.message}`
    console.error(errorMsg)
    writeSyncLog(errorMsg)

    // Обновляем статус - осложнения при синхронизации
    lastSyncTime.value = new Date().toISOString()
    lastSyncTime.status = 'error'
    lastSyncTime.error = err.message
    lastSyncTime.connectionStatus = 'failed'

    syncLog.error = err.message
    syncLog.results = {
      units: { status: 'failed', count: 0, error: err.message },
      warehouses: { status: 'failed', count: 0, error: err.message },
      stocks: { status: 'failed', count: 0, error: err.message },
      orders: { status: 'failed', count: 0, error: err.message }
    }

    return syncLog
  }
}

// HTTP эндпоинты
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  const url = new URL(req.url, `http://${req.headers.host}`)
  const pathname = url.pathname

  // Auth Login
  if (pathname === '/sklad/api/auth/login' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const { login, password } = JSON.parse(body)
        const user = db.prepare('SELECT * FROM users WHERE login = ?').get(login)

        if (!user) {
          res.writeHead(401)
          res.end(JSON.stringify({ error: 'Invalid credentials' }))
          return
        }

        // Проверяем пароль с bcrypt
        const passwordValid = compareSync(password, user.password_hash)
        if (!passwordValid) {
          res.writeHead(401)
          res.end(JSON.stringify({ error: 'Invalid credentials' }))
          return
        }

        const token = jwt.sign({ userId: user.id, login: user.login, role: user.role }, JWT_SECRET, { expiresIn: '7d' })

        res.writeHead(200)
        res.end(JSON.stringify({
          token,
          user: {
            id: user.id,
            login: user.login,
            email: `${user.login}@warehouse.com`,
            name: user.full_name,
            role: user.role,
            isActive: user.is_active === 1,
            permissions: [],
            createdAt: new Date(user.created_at),
            needsPasswordChange: user.needs_password_change === 1
          }
        }))
      } catch (err) {
        res.writeHead(400)
        res.end(JSON.stringify({ error: err.message }))
      }
    })
    return
  }

  // Auth Logout
  if (pathname === '/sklad/api/auth/logout' || pathname === '/sklad/api/logout') {
    if (req.method === 'POST' || req.method === 'GET') {
      res.writeHead(200)
      res.end(JSON.stringify({ success: true, message: 'Logged out successfully' }))
      return
    }
  }

  // Test endpoint
  // Check 1C connection status
  if (pathname === '/sklad/api/1c/status' && req.method === 'GET') {
    const status = {
      baseUrl: ONEC_CONFIG.baseUrl,
      username: ONEC_CONFIG.username,
      configured: !!ONEC_CONFIG.username && !!ONEC_CONFIG.password,
      connectionStatus: lastSyncTime.connectionStatus,
      lastSync: lastSyncTime.value,
      syncStatus: lastSyncTime.status,
      error: lastSyncTime.error || null,
      lastSyncByType: lastSyncTime.lastSyncByType,
      cacheStatus: {
        units: cache.units.length,
        warehouses: cache.warehouses.length,
        stocks: cache.stocks.length,
        orders: cache.orders.length
      }
    }
    const statusCode = lastSyncTime.connectionStatus === 'failed' ? 503 : 200
    sendJSON(res, statusCode, status)
    return
  }

  // Get sync logs
  if (pathname === '/sklad/api/sync/logs' && req.method === 'GET') {
    try {
      const logsDir = '.data'
      const logFile = `${logsDir}/sync.log`
      if (fs.existsSync(logFile)) {
        const logContent = fs.readFileSync(logFile, 'utf-8')
        const lines = logContent.split('\n').filter(l => l.trim()).slice(-100) // Последние 100 строк
        sendJSON(res, 200, { logs: lines })
      } else {
        sendJSON(res, 200, { logs: [], message: 'No logs yet' })
      }
    } catch (err) {
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  if (pathname === '/sklad/api/test' && req.method === 'GET') {
    res.writeHead(200)
    res.end(JSON.stringify({ status: 'ok', message: 'Backend is working' }))
    return
  }

  // 1C Endpoints - Units
  if (pathname === '/sklad/api/onec/units' && req.method === 'GET') {
    sendJSON(res, 200, { value: cache.units })
    return
  }

  // 1C Endpoints - Categories
  if (pathname === '/sklad/api/onec/categories' && req.method === 'GET') {
    sendJSON(res, 200, { value: cache.categories })
    return
  }

  // 1C Endpoints - Materials (Nomenclature catalog)
  if (pathname === '/sklad/api/onec/materials' && req.method === 'GET') {
    // Загружаем полный каталог номенклатуры
    try {
      const materials = await fetch1COData('Catalog_Номенклатура', {
        '$select': 'Ref_Key,Description,Артикул,ЕдиницаИзмерения_Key,КатегорияНоменклатуры_Key'
      })
      const result = materials ? materials.map((item) => ({
        id: item.Ref_Key,
        name: item.Description,
        sku: item.Артикул || '',
        unitId: item.ЕдиницаИзмерения_Key,
        categoryId: item.КатегорияНоменклатуры_Key,
        price: 0,
        stock: 0
      })) : []
      sendJSON(res, 200, { value: result })
    } catch (err) {
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // 1C Endpoints - Warehouses
  if (pathname === '/sklad/api/onec/warehouses' && req.method === 'GET') {
    const warehouses = cache.warehouses.map(w => ({
      id: w.ref_key,
      name: w.description
    }))
    sendJSON(res, 200, { value: warehouses })
    return
  }

  // 1C Endpoints - Stocks
  if (pathname === '/sklad/api/onec/stocks' && req.method === 'GET') {
    // Читаем stocks прямо из БД, не из кэша!
    // Это гарантирует что всегда возвращаются актуальные данные
    try {
      const allStocks = db.prepare('SELECT * FROM onec_stocks').all()

      // Создаем map для трансформации unit_key в unit описание
      const unitsMap = new Map()
      cache.units?.forEach(u => {
        unitsMap.set(u.ref_key, u.description)
      })

      // Обогащаем stocks данными unitId, categoryId и warehouseId из cache
      const enrichedStocks = allStocks.map(stock => {
        // Ищем категорию по названию в кэше (description а не name!)
        const category = cache.categories?.find(c => c.description === stock.category)
        // Ищем склад по названию в кэше
        const warehouseRecord = cache.warehouses?.find(w => w.description === stock.warehouse)

        // Парсим JSON поля из БД
        let reservesByOrder = {}
        try {
          if (stock.reservesByOrder && typeof stock.reservesByOrder === 'string') {
            reservesByOrder = JSON.parse(stock.reservesByOrder)
          } else if (stock.reservesByOrder && typeof stock.reservesByOrder === 'object') {
            reservesByOrder = stock.reservesByOrder
          }
        } catch (e) {
          console.warn(`Failed to parse reservesByOrder for ${stock.name}:`, e)
          reservesByOrder = {}
        }

        // Преобразуем unit_key в unit описание
        let unitName = 'шт'  // Default unit
        if (stock.unit_key && unitsMap.has(stock.unit_key)) {
          // Если найдено в unitsMap, используем описание
          unitName = unitsMap.get(stock.unit_key)
        } else if (stock.unit && stock.unit !== '?' && stock.unit.length > 0) {
          // Если unit существует и это не '?' (неизвестная единица), используем его
          unitName = stock.unit
        }

        return {
          ...stock,
          reservesByOrder,  // Вернуть спарсенный объект вместо строки
          unit: unitName,  // Всегда возвращаем валидное имя единицы
          unitId: stock.unit_key || '',  // unit_key это GUID единицы из 1C
          categoryId: category?.ref_key || ((stock.category === 'Готовая продукция' || stock.warehouse === 'Готовая продукция') ? '99' : ''),  // categoryId из кэша по названию
          warehouseId: warehouseRecord?.ref_key || '',  // warehouseId из кэша по названию
          type: (stock.category === 'Готовая продукция' || stock.warehouse === 'Готовая продукция') ? 'product' : 'material'
        }
      })
      sendJSON(res, 200, { value: enrichedStocks })
    } catch (err) {
      console.error('Error fetching stocks:', err)
      sendJSON(res, 500, { error: 'Failed to fetch stocks' })
    }
    return
  }

  // 1C Endpoints - Orders
  if (pathname === '/sklad/api/onec/orders' && req.method === 'GET') {
    console.log('DEBUG: cache.orders[0]:', cache.orders[0])
    sendJSON(res, 200, { value: cache.orders })
    return
  }

  // Transfer Orders endpoints
  if (pathname === '/sklad/api/onec/transfer-orders' && req.method === 'GET') {
    try {
      // Возвращаем заказы на перемещение из локальной БД
      const orders = db.prepare('SELECT * FROM transfer_orders ORDER BY date DESC').all()
      const baseUrl = ONEC_CONFIG.baseUrl.replace(/\/$/, '')
      
      const result = orders.map(async (order) => {
        let statusDescription = 'В работе' // default
        let statusKey = ''
        
        // Пытаемся получить статус из 1C
        try {
          const url = `${baseUrl}/Document_ЗаказНаПеремещение(guid'${order.ref_key}')?$format=json&$select=СостояниеЗаказа_Key,СостояниеЗаказа____Presentation`
          const response = await fetch(url, {
            headers: {
              'Authorization': getBasicAuthHeader(),
              'Content-Type': 'application/json'
            }
          })
          
          if (response.ok) {
            const orderData = await response.json()
            statusKey = orderData.СостояниеЗаказа_Key || ''
            
            if (orderData.СостояниеЗаказа____Presentation) {
              statusDescription = orderData.СостояниеЗаказа____Presentation
            } else if (statusKey) {
              // Fetch status description from catalog
              const statusUrl = `${baseUrl}/Catalog_СостоянияЗаказовНаПеремещение(guid'${statusKey}')?$format=json&$select=Description`
              const statusResponse = await fetch(statusUrl, {
                headers: {
                  'Authorization': getBasicAuthHeader(),
                  'Content-Type': 'application/json'
                }
              })
              if (statusResponse.ok) {
                const statusData = await statusResponse.json()
                statusDescription = statusData.Description || 'В работе'
              }
            }
          }
        } catch (err) {
          console.warn(`⚠️ Error fetching status for order ${order.ref_key}:`, err.message)
        }
        
        return {
          Ref_Key: order.ref_key,
          Number: order.order_number,
          Date: order.date,
          sourceWarehouseKey: order.source_warehouse_key,
          sourceWarehouseName: order.source_warehouse_name,
          destinationWarehouseKey: order.destination_warehouse_key,
          destinationWarehouseName: order.destination_warehouse_name,
          customerOrderKey: order.customer_order_key,
          customerOrderNumber: order.customer_order_number,
          Posted: order.posted === 1,
          statusKey: statusKey,
          statusDescription: statusDescription
        }
      })

      // Wait for all status fetches to complete
      const resolvedResult = await Promise.all(result)
      sendJSON(res, 200, { value: resolvedResult })
    } catch (err) {
      console.error('Error fetching transfer orders from DB:', err)
      sendJSON(res, 500, { error: 'Failed to fetch transfer orders' })
    }
    return
  }

  // Transfer Order Details endpoint
  if (pathname.match(/^\/sklad\/api\/onec\/transfer-orders\/[a-f0-9\-]+$/) && req.method === 'GET') {
    try {
      const orderId = pathname.split('/').pop()
      const baseUrl = ONEC_CONFIG.baseUrl.replace(/\/$/, '')

      console.log(`\n📡 [Transfer Order Details] Fetching for ID: ${orderId}`)

      // Вариант 1: без expand (более надёжный)
      let url = `${baseUrl}/Document_ЗаказНаПеремещение(guid'${orderId}')?$format=json`

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const response = await fetch(url, {
        headers: {
          'Authorization': getBasicAuthHeader(),
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ 1C API error: ${response.status}`, errorText.substring(0, 200))
        throw new Error(`1C API error: ${response.status}`)
      }

      const order = await response.json()
      console.log(`✓ Got order: ${order.Number}`)

      // Теперь получаем Запасы отдельным запросом
      let items = []
      try {
        const itemsUrl = `${baseUrl}/Document_ЗаказНаПеремещение(guid'${orderId}')/Запасы?$format=json`
        const itemsResponse = await fetch(itemsUrl, {
          headers: {
            'Authorization': getBasicAuthHeader(),
            'Content-Type': 'application/json'
          }
        })

        if (itemsResponse.ok) {
          const itemsData = await itemsResponse.json()
          console.log(`✓ Got ${itemsData.value?.length || 0} items`)
          items = itemsData.value || []
          if (items.length > 0) {
            console.log(`📦 Sample item:`, JSON.stringify(items[0], null, 2))
          }
        } else {
          console.warn(`⚠️ Could not fetch items: ${itemsResponse.status}`)
        }
      } catch (err) {
        console.warn(`⚠️ Error fetching items:`, err.message)
      }

      // Строим карту названий товаров из кэша
      const nomMap = new Map()
      if (cache.stocks && cache.stocks.length > 0) {
        cache.stocks.forEach((stock) => {
          if (stock.ref_key) {
            nomMap.set(stock.ref_key, stock.name || stock.product)
          }
        })
      }

      // Получаем имена складов из кэша
      const sourceKey = order.СтруктурнаяЕдиницаРезерв_Key
      const destKey = order.СтруктурнаяЕдиницаПолучатель_Key

      const sourceWarehouse = cache.warehouses?.find(w => w.ref_key === sourceKey)
      const destWarehouse = cache.warehouses?.find(w => w.ref_key === destKey)

      // Get status name from catalog if statusKey is present
      let statusDescription = 'В работе' // default status
      if (order.СостояниеЗаказа_Key) {
        try {
          const statusKey = order.СостояниеЗаказа_Key
          // Try using the presentation field first if available
          if (order.СостояниеЗаказа____Presentation) {
            statusDescription = order.СостояниеЗаказа____Presentation
          } else {
            // Fetch status from catalog
            const statusUrl = `${baseUrl}/Catalog_СостоянияЗаказовНаПеремещение(guid'${statusKey}')?$format=json&$select=Description`
            const statusResponse = await fetch(statusUrl, {
              headers: {
                'Authorization': getBasicAuthHeader(),
                'Content-Type': 'application/json'
              }
            })
            if (statusResponse.ok) {
              const statusData = await statusResponse.json()
              statusDescription = statusData.Description || 'В работе'
            }
          }
        } catch (err) {
          console.warn(`⚠️ Error fetching status:`, err.message)
        }
      }

      // Format the response
      const result = {
        Ref_Key: order.Ref_Key,
        Number: order.Number,
        Date: order.Date,
        Posted: order.Posted,
        statusKey: order.СостояниеЗаказа_Key || '',
        statusDescription: statusDescription,
        sourceWarehouseKey: sourceKey,
        destinationWarehouseKey: destKey,
        sourceWarehouseName: order.СтруктурнаяЕдиницаРезерв____Presentation || sourceWarehouse?.description || 'Unknown',
        destinationWarehouseName: order.СтруктурнаяЕдиницаПолучатель____Presentation || destWarehouse?.description || 'Unknown',
        items: items.map((item, idx) => {
          // Debug: log first item to understand 1C structure
          if (idx === 0) {
            console.log(`📦 SAMPLE ITEM FROM 1C:`, JSON.stringify(item, null, 2))
          }

          const prodId = item.Номенклатура_Key || ''
          let prodName = nomMap.get(prodId) || 'Неизвестный товар'

          let stock = null
          try {
            stock = db.prepare('SELECT barcode, storageBin FROM onec_stocks WHERE ref_key = ?').get(prodId)
          } catch (err) {
            console.warn(`⚠️ DB error for ${prodId}:`, err.message)
          }

          if (idx === 0 && stock) {
            console.log(`📦 STOCK FROM DB:`, JSON.stringify(stock, null, 2))
          }

          return {
            LineNumber: item.LineNumber || idx + 1,
            Номенклатура_Key: prodId,
            nomenclatureName: prodName,
            Количество: item.Количество || 0,
            scannedQty: item.КоличествоСобрано || 0,
            barcode: stock?.barcode || '',
            storageBin: stock?.storageBin || ''
          }
        })
      }

      console.log(`✓ Response ready with ${result.items.length} items`)
      sendJSON(res, 200, result)
    } catch (err) {
      console.error('❌ Error fetching transfer order details:', err.message)
      sendJSON(res, 500, { error: 'Failed to fetch transfer order details', details: err.message })
    }
    return
  }

  // Завершить заказ на перемещение в 1C и очистить локальные сканы
  if (pathname.match(/^\/sklad\/api\/onec\/transfer-orders\/[a-f0-9\-]+\/complete$/) && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => {
      body += chunk.toString()
    })

    req.on('end', async () => {
      try {
        const match = pathname.match(/^\/sklad\/api\/onec\/transfer-orders\/([a-f0-9\-]+)\/complete$/)
        const orderId = match?.[1]

        if (!orderId) {
          sendJSON(res, 400, { error: 'Order ID is required' })
          return
        }

        const data = body ? JSON.parse(body) : {}
        const targetStatusName = String(data.statusName || 'Завершен').trim()
        const authHeader = getBasicAuthHeader()
        const baseUrl = ONEC_CONFIG.baseUrl.replace(/\/$/, '')
        
        console.log(`\n🔄 Обновляем заказ на перемещение ${orderId} - статус: "${targetStatusName}"`)

        // Для ЗаказНаПеремещение используем специальный справочник СостоянияЗаказовНаПеремещение
        const statusCatalog = 'Catalog_СостоянияЗаказовНаПеремещение'
        let statusKey = ''

        try {
          // Получаем все доступные статусы из справочника
          const catalogUrl = `${baseUrl}/${statusCatalog}?$format=json&$select=Ref_Key,Description`
          console.log(`  Ищем статус "${targetStatusName}" в ${statusCatalog}...`)
          
          const catalogResponse = await fetch(catalogUrl, {
            headers: {
              'Authorization': authHeader,
              'Accept': 'application/json'
            }
          })

          if (!catalogResponse.ok) {
            console.log(`  ✗ Справочник недоступен: ${catalogResponse.status}`)
            throw new Error(`Failed to fetch status catalog: ${catalogResponse.status}`)
          }

          const catalogData = await catalogResponse.json()
          const statusItems = catalogData.value || []
          
          console.log(`  📦 Найдено статусов: ${statusItems.length}`)
          statusItems.forEach(item => {
            console.log(`     - "${item.Description}" (${item.Ref_Key})`)
          })
          
          // Ищем статус по описанию - точное совпадение в начале
          let foundStatus = statusItems.find(item => {
            const desc = String(item.Description || '').trim()
            return desc === targetStatusName
          })

          // Если точный поиск не сработал, ищем "Завершен"
          if (!foundStatus) {
            foundStatus = statusItems.find(item => {
              const desc = String(item.Description || '').trim()
              return desc === 'Завершен' || desc.startsWith('Завершен')
            })
          }

          // Если всё ещё не нашли, ищем частичное совпадение
          if (!foundStatus && targetStatusName.toLowerCase().includes('завершен')) {
            foundStatus = statusItems.find(item => {
              const desc = String(item.Description || '').trim().toLowerCase()
              return desc.includes('завершен')
            })
          }

          if (foundStatus?.Ref_Key) {
            statusKey = foundStatus.Ref_Key
            console.log(`  ✓ Найден статус: "${foundStatus.Description}" (${statusKey})`)
          } else {
            // Если точный поиск не сработал, берем первый (это обычно текущий статус)
            // и пробуем второй (обычно это "Завершен")
            if (statusItems.length > 1) {
              statusKey = statusItems[1].Ref_Key
              console.log(`  ⚠️ Точный поиск не дал результатов, используем: "${statusItems[1].Description}"`)
            } else if (statusItems.length === 1) {
              statusKey = statusItems[0].Ref_Key
              console.log(`  ⚠️ Только один статус доступен: "${statusItems[0].Description}"`)
            } else {
              throw new Error('No statuses found in catalog')
            }
          }
        } catch (err) {
          console.log(`  ✗ Ошибка при поиске статуса: ${err.message}`)
          throw err
        }

        // Теперь обновляем документ
        let updated = false
        try {
          const transferUrl = `${baseUrl}/Document_ЗаказНаПеремещение(guid'${orderId}')`
          console.log(`  Попытка обновить документ с новым статусом...`)
          
          const response = await fetch(transferUrl, {
            method: 'PATCH',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ СостояниеЗаказа_Key: statusKey })
          })

          if (response.ok) {
            updated = true
            console.log(`  ✓ Статус успешно обновлен в 1С`)
          } else {
            const errorText = await response.text()
            console.log(`  ✗ Ошибка при обновлении: HTTP ${response.status}`)
            console.log(`     ${errorText.substring(0, 300)}`)
            // Не бросаем ошибку - продолжаем с удалением локальных данных
          }
        } catch (err) {
          console.log(`  ✗ Exception при обновлении: ${err.message}`)
        }

        // Удаляем локальные данные сканирования в любом случае
        const deletedScans = db.prepare('DELETE FROM transfer_order_scans WHERE order_ref_key = ?').run(orderId)
        
        console.log(`  ✓ Удалены ${deletedScans.changes || 0} локальных записей сканирования`)

        sendJSON(res, 200, {
          success: true,
          orderId,
          statusName: targetStatusName,
          statusKey,
          deletedScans: deletedScans.changes || 0,
          updated
        })
      } catch (err) {
        console.error('❌ Error completing transfer order:', err)
        sendJSON(res, 500, { error: err.message || 'Failed to complete transfer order' })
      }
    })
    return
  }

  // Update order painting (окраска)
  if (pathname === '/sklad/api/onec/orders/painting' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => {
      body += chunk.toString()
    })
    req.on('end', () => {
      try {
        const data = JSON.parse(body)
        const { orderId, painting } = data

        if (!orderId) {
          sendJSON(res, 400, { error: 'Order ID is required' })
          return
        }

        // Обновляем в БД
        const stmt = db.prepare('UPDATE onec_orders SET painting = ? WHERE ref_key = ?')
        const result = stmt.run(painting || '', orderId)

        if (result.changes === 0) {
          sendJSON(res, 404, { error: 'Order not found' })
          return
        }

        // Обновляем кэш
        const order = cache.orders.find(o => o.id === orderId)
        if (order) {
          order.notes = painting || ''
        }

        sendJSON(res, 200, { success: true, painting })
      } catch (err) {
        console.error('Error updating painting:', err)
        sendJSON(res, 500, { error: err.message })
      }
    })
    return
  }

  // Save local product fields (barcode, storageBin) - ONLY local storage, NOT to 1C
  if (pathname.match(/^\/sklad\/api\/onec\/stocks\/[a-f0-9\-]+$/) && (req.method === 'PUT' || req.method === 'POST')) {
    let body = ''
    req.on('data', chunk => { body += chunk.toString() })
    req.on('end', () => {
      try {
        const nomenclatureKey = pathname.split('/').pop()
        const data = JSON.parse(body)
        const { barcode, storageBin, image } = data

        console.log(`\n=== SAVING LOCAL PRODUCT FIELDS ===`)
        console.log(`📦 nomenclatureKey: ${nomenclatureKey}`)
        console.log(`   barcode: "${barcode}"`)
        console.log(`   storageBin: "${storageBin}"`)
        console.log(`   image: ${image ? `${image.substring(0, 50)}...` : 'empty'}`)

        // Проверяем существует ли запись
        const existing = db.prepare('SELECT id FROM onec_stocks WHERE ref_key = ?').get(nomenclatureKey)

        if (existing) {
          // Обновляем существующую запись
          db.prepare('UPDATE onec_stocks SET barcode = ?, storageBin = ?, image = ? WHERE ref_key = ?')
            .run(barcode || '', storageBin || '', image || '', nomenclatureKey)
          console.log(`✓ Updated stock record for ${nomenclatureKey}`)
        } else {
          // Создаём новую запись с минимальными данными
          db.prepare(`INSERT INTO onec_stocks (ref_key, name, product, barcode, storageBin, warehouse, image)
            VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(nomenclatureKey, '', '', barcode || '', storageBin || '', '', image || '')
          console.log(`✓ Created new stock record for ${nomenclatureKey}`)
        }

        sendJSON(res, 200, {
          success: true,
          message: 'Local fields saved',
          nomenclatureKey,
          saved: { barcode, storageBin, image: image ? 'saved' : 'empty' }
        })
      } catch (err) {
        console.error('Error saving local fields:', err)
        sendJSON(res, 500, { error: err.message })
      }
    })
    return
  }

  // Create new nomenclature (material/product) in 1C
  if (pathname === '/sklad/api/1c/nomenclature' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', async () => {
      try {
        const data = JSON.parse(body)

        console.log('\n=== CREATING NOMENCLATURE ===')
        console.log('📦 Received data from frontend:')
        console.log(JSON.stringify(data, null, 2))

        // Логирование каждого поля
        console.log(`  name: "${data.name}"`)
        console.log(`  sku: "${data.sku}"`)
        console.log(`  unitId: "${data.unitId}" (type: ${typeof data.unitId})`)
        console.log(`  categoryId: "${data.categoryId}" (type: ${typeof data.categoryId})`)
        console.log(`  warehouseId: "${data.warehouseId}" (type: ${typeof data.warehouseId})`)
        console.log(`  currentStock: ${data.currentStock}`)
        console.log(`  averagePrice: ${data.averagePrice}`)

        // Создаём материал в 1C через OData POST
        const authHeader = getBasicAuthHeader()
        const baseUrl = ONEC_CONFIG.baseUrl.replace(/\/$/, '')
        const url = `${baseUrl}/Catalog_Номенклатура`

        // Формируем тело запроса для OData
        const nomenclatureData = {
          'Description': data.name,
          'НаименованиеПолное': data.name,  // Full name = name
          'Артикул': data.sku || '',
          'DeletionMark': false  // Не помечена на удаление
        }

        // Добавляем единицу измерения если есть
        if (data.unitId) {
          nomenclatureData['ЕдиницаИзмерения_Key'] = data.unitId
          console.log(`✅ Unit ID: ${data.unitId}`)
        } else {
          console.log('⚠️  Unit ID is empty - will use default unit in 1C if required')
        }

        // Добавляем категорию если есть
        if (data.categoryId) {
          nomenclatureData['КатегорияНоменклатуры_Key'] = data.categoryId
          console.log(`✅ Category ID: ${data.categoryId}`)
        } else {
          console.log('⚠️  Category is empty - will use default category in 1C if required')
        }

        console.log(`\n📤 Sending to 1C OData:`)
        console.log(JSON.stringify(nomenclatureData, null, 2))

        console.log(`📡 POST ${url}`)

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000)

        const response = await fetch(url, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(nomenclatureData)
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`❌ [1C] HTTP ${response.status}: ${errorText.substring(0, 300)}`)
          sendJSON(res, 400, {
            success: false,
            error: `Failed to create in 1C: ${response.status}`
          })
          return
        }

        const result = await response.json()
        const newId = result['Ref_Key'] || result['@odata.id'] || `CREATED-${Date.now()}`

        console.log(`✓ Created nomenclature in 1C: ${newId}`)

        sendJSON(res, 201, {
          success: true,
          id: newId,
          message: 'Номенклатура создана в 1С'
        })
      } catch (err) {
        console.error('Error creating nomenclature:', err)
        sendJSON(res, 500, { error: err.message })
      }
    })
    req.on('error', (err) => {
      console.error('Request error:', err)
      sendJSON(res, 500, { error: 'Request error' })
    })
    return
  }

  // Sync endpoint - получить актуальные данные с 1C
  if (pathname === '/sklad/api/sync/1c' && req.method === 'POST') {
    try {
      // Запускаем синхронизацию с 1C
      const syncResult = await syncWith1C()

      sendJSON(res, 200, {
        status: 'synced',
        timestamp: syncResult.timestamp,
        usedFallback: syncResult.usedFallback,
        results: syncResult.results,
        error: syncResult.error || null,
        data: cache
      })
    } catch (err) {
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Sync only orders
  if (pathname === '/sklad/api/sync/orders' && req.method === 'POST') {
    try {
      const orders1C = await fetch1COrders()
      const orderStats = syncOrdersIncremental(orders1C)
      loadCacheFromDB()
      lastSyncTime.lastSyncByType.orders = new Date().toISOString()

      sendJSON(res, 200, {
        status: 'synced',
        type: 'orders',
        timestamp: lastSyncTime.lastSyncByType.orders,
        results: orderStats
      })
    } catch (err) {
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Sync only stocks (materials)
  if (pathname === '/sklad/api/sync/stocks' && req.method === 'POST') {
    try {
      const stocks1C = await fetch1CStocks()
      const reserveMap = await calculateReserves()
      const stocksWithReserves = stocks1C.map(stock => {
        const reserveData = reserveMap.get(stock.ref_key)
        return {
          ...stock,
          reserved: reserveData ? reserveData.total : 0,
          reservesByOrder: reserveData ? reserveData.byOrder : {}
        }
      })
      const stockStats = syncStocksIncremental(stocksWithReserves)
      loadCacheFromDB()
      lastSyncTime.lastSyncByType.stocks = new Date().toISOString()

      sendJSON(res, 200, {
        status: 'synced',
        type: 'stocks',
        timestamp: lastSyncTime.lastSyncByType.stocks,
        results: stockStats
      })
    } catch (err) {
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Sync transfer orders with 1C
  if (pathname === '/sklad/api/sync/transfer-orders' && req.method === 'POST') {
    try {
      const transferOrders1C = await fetch1CTransferOrders()
      const transferOrderStats = syncTransferOrdersIncremental(transferOrders1C)
      loadCacheFromDB()
      lastSyncTime.lastSyncByType.transfer_orders = new Date().toISOString()

      sendJSON(res, 200, {
        status: 'synced',
        type: 'transfer_orders',
        timestamp: lastSyncTime.lastSyncByType.transfer_orders,
        results: transferOrderStats
      })
    } catch (err) {
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Сохранить результаты сканирования заказа на перемещение
  if (pathname === '/sklad/api/transfer-orders/scans' && req.method === 'POST') {
    try {
      let body = ''
      req.on('data', chunk => { body += chunk })
      req.on('end', () => {
        const data = JSON.parse(body)
        const { orderRefKey, items } = data

        // Удаляем старые сканирования для этого заказа
        db.prepare('DELETE FROM transfer_order_scans WHERE order_ref_key = ?').run(orderRefKey)

        // Вставляем новые результаты сканирования
        const stmt = db.prepare(`
          INSERT INTO transfer_order_scans (order_ref_key, item_barcode, scanned_qty, updated_at)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        `)

        for (const item of items) {
          stmt.run(orderRefKey, item.barcode || '', item.scannedQty || 0)
        }

        sendJSON(res, 200, { status: 'saved', count: items.length })
      })
    } catch (err) {
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Загрузить результаты сканирования заказа на перемещение
  if (pathname.match(/^\/sklad\/api\/transfer-orders\/(.+)\/scans$/) && req.method === 'GET') {
    try {
      const orderRefKey = pathname.match(/^\/sklad\/api\/transfer-orders\/(.+)\/scans$/)[1]
      const scans = db.prepare(`
        SELECT item_barcode, scanned_qty 
        FROM transfer_order_scans 
        WHERE order_ref_key = ?
      `).all(orderRefKey)

      const result = scans.reduce((acc, scan) => {
        acc[scan.item_barcode] = scan.scanned_qty
        return acc
      }, {})

      sendJSON(res, 200, result)
    } catch (err) {
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Check 1C metadata - see what entities are available
  if (pathname === '/sklad/api/1c/metadata' && req.method === 'GET') {
    try {
      const authHeader = getBasicAuthHeader()
      const metadataUrl = `${ONEC_CONFIG.baseUrl}/odata/standard.odata/$metadata`

      console.log(`📡 Fetching 1C metadata from: ${metadataUrl}`)

      const response = await fetch(metadataUrl, {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/xml'
        }
      })

      if (!response.ok) {
        sendJSON(res, response.status, {
          error: `Failed to fetch metadata: ${response.status}`,
          url: metadataUrl
        })
        return
      }

      const metadata = await response.text()
      // Собираем список всех EntityType из метаданных
      const entityMatches = metadata.match(/EntityType Name="([^"]+)"/g) || []
      const entities = entityMatches.map(m => m.replace(/EntityType Name="|"/g, ''))

      sendJSON(res, 200, {
        status: 'ok',
        entityCount: entities.length,
        entities: entities.sort()
      })
    } catch (err) {
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // 1C Endpoints - Order items (позиции заказа)
  if (pathname === '/sklad/api/onec/order-items' && req.method === 'GET') {
    const orderId = url.searchParams.get('orderId')
    if (!orderId) {
      sendJSON(res, 400, { error: 'orderId is required' })
      return
    }

    try {
      console.log(`📦 Fetching order items for order: ${orderId}`)

      let items = null

      // Вариант 1: прямой путь к табличной части (как используется на фронте)
      // Пытаемся путь: Document_ЗаказПокупателя(guid'...')/Запасы
      const selectFields = 'LineNumber,Номенклатура_Key,Номенклатура____Presentation,Номенклатура_Presentation,Количество,Цена,Сумма,ЕдиницаИзмерения_Key'
      items = await fetch1COData(`Document_ЗаказПокупателя(guid'${orderId}')/Запасы`, {
        '$select': selectFields
      })

      if (!items || items.length === 0) {
        // Вариант 2: через коллекцию с фильтром (старый способ)
        console.log(`⚠️ Direct path failed, trying filter...`)
        items = await fetch1COData('Document_ЗаказПокупателя_Запасы', {
          '$filter': `Ref_Key eq guid'${orderId}'`,
          '$select': selectFields
        })
      }

      if (!items || items.length === 0) {
        // Вариант 3: запрашиваем весь заказ и пробуем получить позиции из него
        console.log(`⚠️ Filter path failed, trying full document...`)
        const orderData = await fetch1COData(`Document_ЗаказПокупателя('${orderId}')`, {})
        if (orderData && orderData.length > 0) {
          const order = orderData[0]
          // Если в ответе есть вложенные позиции, используем их
          if (order.Запасы) {
            items = Array.isArray(order.Запасы) ? order.Запасы : [order.Запасы]
          } else if (order.Items) {
            items = Array.isArray(order.Items) ? order.Items : [order.Items]
          }
        }
      }

      if (items && Array.isArray(items)) {
        // Строим карту названий товаров из кэша
        const nomMap = new Map()
        if (cache.stocks && cache.stocks.length > 0) {
          cache.stocks.forEach((stock) => {
            if (stock.ref_key) {
              nomMap.set(stock.ref_key, stock.name || stock.product)
            }
          })
        }

        const result = items.map((item) => {
          const prodId = item.Номенклатура_Key || item.Номенклатура || ''
          let prodName = item.Номенклатура____Presentation || item.Номенклатура_Presentation || ''

          // Если название пусто, ищем в кэше материалов
          if (!prodName && prodId) {
            prodName = nomMap.get(prodId) || 'Неизвестный товар'
          } else if (!prodName) {
            prodName = 'Неизвестный товар'
          }

          return {
            id: item.LineNumber || `${orderId}-${Math.random()}`,
            productId: prodId,
            productName: prodName,
            quantity: Number(item.Количество) || 0,
            price: Number(item.Цена) || 0,
            amount: Number(item.Сумма) || 0,
            unit: item.ЕдиницаИзмерения_Key ? (cache.units?.find((u) => u.ref_key === item.ЕдиницаИзмерения_Key)?.description || 'шт') : 'шт',
            lineNumber: Number(item.LineNumber) || 0
          }
        })
        console.log(`✓ Got ${result.length} items for order ${orderId}`)
        sendJSON(res, 200, { value: result })
      } else {
        // Если не удалось получить из 1C, возвращаем пустой массив
        console.log(`ℹ️ No items found for order ${orderId}`)
        sendJSON(res, 200, { value: [] })
      }
    } catch (err) {
      console.error('Error fetching order items:', err.message)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // 1C Endpoints - Organizations (организации)
  if (pathname === '/sklad/api/onec/organizations' && req.method === 'GET') {
    const organizations = [
      {
        id: '407d850a-e233-11f0-862e-fa163e5c9fa8',
        name: 'Основная организация',
        ref_key: '407d850a-e233-11f0-862e-fa163e5c9fa8'
      }
    ]
    sendJSON(res, 200, { value: organizations })
    return
  }

  // 1C Endpoints - Operations (хозяйственные операции)
  if (pathname === '/sklad/api/onec/operations' && req.method === 'GET') {
    const operations = [
      { id: '12dcfd1a-e265-11f0-862e-fa163e5c9fa8', name: 'Перемещение' },
      { id: '12dcfd1a-e265-11f0-862e-fa163e5c9fa9', name: 'Списание на расходы' },
      { id: '12dcfd1a-e265-11f0-862e-fa163e5c9faa', name: 'Передача в эксплуатацию' },
      { id: '12dcfd1a-e265-11f0-862e-fa163e5c9fab', name: 'Возврат из эксплуатации' }
    ]
    sendJSON(res, 200, { value: operations })
    return
  }

  // 1C Endpoints - Expense Accounts (расходные счета)
  if (pathname === '/sklad/api/onec/expense-accounts' && req.method === 'GET') {
    const accounts = [
      { id: '5001', name: '5001 - Материалы' },
      { id: '5002', name: '5002 - Расходы на продажу' },
      { id: '5003', name: '5003 - Общехозяйственные расходы' },
      { id: '5100', name: '5100 - Прочие расходы' }
    ]
    sendJSON(res, 200, { value: accounts })
    return
  }

  // 1C Endpoints - Transfer Document Defaults (значения по умолчанию)
  if (pathname === '/sklad/api/onec/transfer-defaults' && req.method === 'GET') {
    const defaults = {
      expenseAccountKey: '5001',
      currencyKey: 'RUB',
      sourceWarehouseKey: '',
      destinationWarehouseKey: '',
      includeVAT: true
    }
    sendJSON(res, 200, { value: [defaults] })
    return
  }

  // Create Material Transfer Document
  if (pathname === '/sklad/api/1c/material-transfer' && req.method === 'POST') {
    console.log(`\n🚀 INCOMING REQUEST: POST /sklad/api/1c/material-transfer`)
    let body = ''
    req.on('data', chunk => {
      console.log(`📥 Data chunk received: ${chunk.length} bytes`)
      body += chunk
    })
    req.on('end', async () => {
      try {
        console.log(`📦 Raw body: ${body}`)
        const data = JSON.parse(body)

        console.log('\n📦 ===== MATERIAL TRANSFER REQUEST =====')
        console.log('🔍 RAW JSON RECEIVED:')
        console.log(JSON.stringify(data, null, 2))

        console.log('\n📋 PARSED KEYS:')
        console.log(`  ✓ organizationKey: "${data.organizationKey}" (type: ${typeof data.organizationKey})`)
        console.log(`  ✓ sourceWarehouseKey: "${data.sourceWarehouseKey}" (type: ${typeof data.sourceWarehouseKey})`)
        console.log(`  ✓ destinationWarehouseKey: "${data.destinationWarehouseKey}" (type: ${typeof data.destinationWarehouseKey})`)
        console.log(`  ✓ operationKey: "${data.operationKey}" (type: ${typeof data.operationKey})`)
        console.log(`  ✓ expenseAccountKey: "${data.expenseAccountKey}" (type: ${typeof data.expenseAccountKey})`)
        console.log(`  ✓ currencyKey: "${data.currencyKey}" (type: ${typeof data.currencyKey})`)

        console.log(`\n📦 ITEMS (${data.items?.length || 0}):`)
        if (data.items && Array.isArray(data.items)) {
          data.items.forEach((item, idx) => {
            console.log(`  [Item ${idx + 1}]:`)
            console.log(`    - Номенклатура_Key: "${item.Номенклатура_Key}"`)
            console.log(`    - Количество: ${item.Количество}`)
            console.log(`    - Цена: ${item.Цена}`)
            console.log(`    - ЕдиницаИзмерения: "${item.ЕдиницаИзмерения}"`)
          })
        }
        console.log('📦 ===== END REQUEST =====\n')

        // Валидация критичных данных
        if (!data.sourceWarehouseKey) {
          console.error('❌ Missing sourceWarehouseKey')
          sendJSON(res, 400, { error: 'Source warehouse is required' })
          return
        }

        if (!data.destinationWarehouseKey) {
          console.error('❌ Missing destinationWarehouseKey')
          sendJSON(res, 400, { error: 'Destination warehouse is required' })
          return
        }

        if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
          console.error('❌ Missing or invalid items')
          sendJSON(res, 400, { error: 'At least one item is required' })
          return
        }

        // Проверяем что у каждого товара есть количество (Количество - правильный ключ!)
        const validItems = data.items.filter(item => item.Количество && item.Количество > 0)
        if (validItems.length === 0) {
          console.error('❌ No items with valid quantities')
          sendJSON(res, 400, { error: 'No items with valid quantities' })
          return
        }

        // Отправляем документ в 1C через OData POST
        try {
          const authHeader = getBasicAuthHeader()
          const baseUrl = ONEC_CONFIG.baseUrl.replace(/\/$/, '')
          const url = `${baseUrl}/Document_ПеремещениеЗапасов`

          // Date only (no time) - 1C expects just the date part
          const now = new Date()
          const utcYear = now.getUTCFullYear()
          const utcMonth = String(now.getUTCMonth() + 1).padStart(2, '0')
          const utcDay = String(now.getUTCDate()).padStart(2, '0')
          const dateString = `${utcYear}-${utcMonth}-${utcDay}`

          console.log('[TRANSFER] Document date:', { utcYear, utcMonth, utcDay, dateString })

          const transferDocData = {
            '@odata.type': 'StandardODATA.Document_ПеремещениеЗапасов',
            'Date': dateString,  // Main Date field: 2026-05-11
            'CreationDate': dateString,  // Creation date
            'ДатаСоздания': dateString,  // Russian name for creation date
            'Posted': false,  // Черновик, не проведён
            'DeletionMark': false,  // Не удалён
            'Организация_Key': data.organizationKey || '407d850a-e233-11f0-862e-fa163e5c9fa8',
            'СтруктурнаяЕдиница_Key': data.sourceWarehouseKey,  // Склад отправления
            'СтруктурнаяЕдиницаПолучатель_Key': data.destinationWarehouseKey,  // Склад получения
            'Автор_Key': 'd8da6724-e264-11f0-862e-fa163e5c9fa8',  // User/Employee GUID
            'ВидОперации': 'Перемещение',  // Строка, а не GUID!
            'Запасы': validItems.map((item, idx) => {
              // ЕдиницаИзмерения должна быть GUID (из каталога Catalog_КлассификаторЕдиницИзмерения)
              const unitGuid = item.ЕдиницаИзмерения || 'ead49f26-116c-11f1-9cfd-fa163e5c9fa8'  // Default GUID for 'шт'

              return {
                '@odata.type': 'StandardODATA.Document_ПеремещениеЗапасов_Запасы_RowType',
                'LineNumber': String(idx + 1),  // Line number as string
                'Номенклатура_Key': item.Номенклатура_Key,
                'Количество': item.Количество,
                'ЕдиницаИзмерения': unitGuid,  // GUID из каталога Catalog_КлассификаторЕдиницИзмерения
                'ЕдиницаИзмерения_Type': 'StandardODATA.Catalog_КлассификаторЕдиницИзмерения'  // REQUIRED!
              }
            })
          }

          console.log('\n📤 ===== SENDING TO 1C OData =====')
          console.log(`🔗 URL: ${url}`)
          console.log('📦 PAYLOAD (что отправляем в 1С):')
          console.log(JSON.stringify(transferDocData, null, 2))
          console.log('📤 ===== END PAYLOAD =====\n')

          console.log(`\n📤 Creating transfer document in 1C OData:`)
          console.log(`   URL: ${url}`)
          console.log(`   Document:`)
          console.log(JSON.stringify(transferDocData, null, 2))

          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 30000)

          const response = await fetch(url, {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(transferDocData)
          })

          clearTimeout(timeoutId)

          if (!response.ok) {
            const errorText = await response.text()
            console.error(`❌ [1C] HTTP ${response.status}:`)
            console.error(errorText.substring(0, 500))

            const documentId = `transfer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            sendJSON(res, 400, {
              success: false,
              error: `Failed to create in 1C: ${response.status}`,
              documentId: documentId,
              details: errorText.substring(0, 200)
            })
            return
          }

          const responseData = await response.json()
          console.log(`✅ Document created in 1C:`)
          console.log(JSON.stringify(responseData, null, 2))

          const documentKey = responseData.Ref_Key || responseData.Key || responseData.Ref

          console.log(`✅ Material transfer document created in 1C successfully`)
          console.log(`   Document Key: ${documentKey}`)
          console.log(`   From: ${data.sourceWarehouseKey}`)
          console.log(`   To: ${data.destinationWarehouseKey}`)
          console.log(`   Items: ${validItems.length}`)

          sendJSON(res, 200, {
            success: true,
            documentKey: documentKey,
            documentId: documentKey,
            message: 'Material transfer document created in 1C successfully',
            status: 'Сохранен',
            items: validItems.length,
            createdAt: new Date().toISOString()
          })

        } catch (err) {
          console.error(`❌ Error sending to 1C: ${err.message}`)

          const documentId = `transfer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          sendJSON(res, 500, {
            success: false,
            error: `Failed to send to 1C: ${err.message}`,
            documentId: documentId,
            message: 'Document saved locally but not sent to 1C'
          })
        }
      } catch (err) {
        console.error('❌ Error creating material transfer:', err.message)
        sendJSON(res, 500, { error: err.message })
      }
    })
    return
  }

  // Update item with storageBin
  if (pathname.startsWith('/sklad/api/items/') && req.method === 'PUT') {
    const itemId = pathname.split('/')[4]
    if (!itemId) {
      res.writeHead(400)
      res.end(JSON.stringify({ error: 'Item ID is required' }))
      return
    }

    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const updates = JSON.parse(body)

        // Сохраняем только storageBin и другие локальные поля (не отправляем в 1С)
        const localFields = ['storageBin', 'location', 'notes']
        const updateData = {}
        localFields.forEach(field => {
          if (field in updates) {
            updateData[field] = updates[field]
          }
        })

        // Обновляем товар в БД
        const stmt = db.prepare(`
          UPDATE onec_stocks
          SET storageBin = ?, location = ?
          WHERE id = ?
        `)
        stmt.run(updateData.storageBin || '', updateData.location || '', itemId)

        sendJSON(res, 200, { success: true, storageBin: updateData.storageBin })
      } catch (err) {
        console.error('Error updating item:', err.message)
        sendJSON(res, 500, { error: err.message })
      }
    })
    return
  }

  // Generate QR codes for order items
  if (pathname.match(/^\/sklad\/api\/orders\/[a-f0-9\-]+\/qr-codes\/generate$/) && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const orderId = pathname.split('/')[4]
        const data = JSON.parse(body)
        const { quantity = 1, productId, productName, generatedBy, employeeId, employeeName, labelInfo, labelOrder } = data

        if (!orderId || !productId) {
          sendJSON(res, 400, { error: 'Order ID and Product ID are required' })
          return
        }

        // Get order number for reference
        const order = db.prepare('SELECT order_number FROM onec_orders WHERE ref_key = ?').get(orderId)
        const orderNumber = order?.order_number || orderId

        // Generate N QR codes
        const generatedCodes = []
        const stmt = db.prepare(`
          INSERT INTO local_qr_codes (
            id, code, order_id, order_number, product_id, product_name,
            label_order, label_info, status, generated_at, generated_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)

        for (let i = 0; i < quantity; i++) {
          const qrId = `qr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          const randomSuffix = Math.random().toString(36).substr(2, 5).toUpperCase()
          const qrCode = `QR-${orderId.substring(0, 8)}-${productId.substring(0, 8)}-${randomSuffix}`

          stmt.run(
            qrId,
            qrCode,
            orderId,
            orderNumber,
            productId,
            productName || 'Unknown Product',
            labelOrder || orderNumber,
            labelInfo || null,  // Save only what user entered, not default value
            'generated',
            new Date().toISOString(),
            generatedBy || 'system'
          )

          generatedCodes.push({
            id: qrId,
            code: qrCode,
            order_number: orderNumber,
            product_id: productId,
            product_name: productName,
            label_order: labelOrder || orderNumber,
            label_info: labelInfo || null,  // Return actual value entered, not default
            status: 'generated'
          })

          // Log the operation
          logOperation('qr_code_generated', {
            orderId: orderId,
            orderNumber: orderNumber,
            productId: productId,
            productName: productName,
            qrCodeId: qrId,
            qrCode: qrCode,
            employeeId: employeeId,
            employeeName: employeeName,
            details: { quantity: quantity, index: i + 1 }
          })
        }

        sendJSON(res, 201, {
          success: true,
          orderId: orderId,
          productId: productId,
          quantity: generatedCodes.length,
          codes: generatedCodes,
          createdAt: new Date().toISOString()
        })
      } catch (err) {
        console.error('Error generating QR codes:', err)
        sendJSON(res, 500, { error: err.message })
      }
    })
    return
  }

  // Get QR codes for order
  if (pathname.match(/^\/sklad\/api\/orders\/[a-f0-9\-]+\/qr-codes$/) && req.method === 'GET') {
    try {
      const orderId = pathname.split('/')[4]
      const codes = db.prepare(`
        SELECT id, code, order_number, product_id, product_name, label_order, label_info,
               status, scanned_at, scanned_by, generated_at, generated_by
        FROM local_qr_codes
        WHERE order_id = ?
        ORDER BY generated_at DESC
      `).all(orderId)

      console.log(`📦 [QR FETCH] Fetching QR codes for order ${orderId}`)
      if (codes.length > 0) {
        console.log(`  Total codes: ${codes.length}`)
        console.log(`  First code: label_info="${codes[0].label_info}", product_name="${codes[0].product_name}"`)
        codes.slice(0, 3).forEach((c, i) => {
          console.log(`    [${i}] label_info="${c.label_info}"`)
        })
      }

      sendJSON(res, 200, {
        orderId: orderId,
        count: codes.length,
        codes: codes
      })
    } catch (err) {
      console.error('Error fetching QR codes:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Scan QR code (update status)
  if (pathname.match(/^\/sklad\/api\/qr-codes\/[^\/]+\/scan$/) && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const qrCodeId = pathname.split('/')[4]
        const data = JSON.parse(body)
        const { newStatus = 'scanned', employeeId, employeeName, details } = data

        if (!qrCodeId) {
          sendJSON(res, 400, { error: 'QR Code ID is required' })
          return
        }

        // Get current QR code info
        const qrCode = db.prepare(`
          SELECT id, code, order_id, order_number, product_id, product_name
          FROM local_qr_codes
          WHERE id = ?
        `).get(qrCodeId)

        if (!qrCode) {
          sendJSON(res, 404, { error: 'QR Code not found' })
          return
        }

        // Update QR code status
        const timestamp = new Date().toISOString()
        db.prepare(`
          UPDATE local_qr_codes
          SET status = ?, scanned_at = ?, scanned_by = ?
          WHERE id = ?
        `).run(newStatus, timestamp, employeeName || 'unknown', qrCodeId)

        // Log the operation
        logOperation('qr_code_scanned', {
          qrCodeId: qrCodeId,
          qrCode: qrCode.code,
          orderId: qrCode.order_id,
          orderNumber: qrCode.order_number,
          productId: qrCode.product_id,
          productName: qrCode.product_name,
          employeeId: employeeId,
          employeeName: employeeName,
          details: { status: newStatus, ...details }
        })

        // Log shipment completion if status is 'shipped'
        if (newStatus === 'shipped') {
          logOperation('qr_code_shipped', {
            qrCodeId: qrCodeId,
            qrCode: qrCode.code,
            orderId: qrCode.order_id,
            orderNumber: qrCode.order_number,
            productId: qrCode.product_id,
            productName: qrCode.product_name,
            employeeId: employeeId,
            employeeName: employeeName,
            details: { action: 'shipment_completed' }
          })
        }

        sendJSON(res, 200, {
          success: true,
          qrCodeId: qrCodeId,
          code: qrCode.code,
          status: newStatus,
          scannedAt: timestamp,
          scannedBy: employeeName
        })
      } catch (err) {
        console.error('Error scanning QR code:', err)
        sendJSON(res, 500, { error: err.message })
      }
    })
    return
  }

  // Delete QR code
  if (pathname.match(/^\/sklad\/api\/qr-codes\/[^\/]+$/) && req.method === 'DELETE') {
    try {
      const qrCodeId = pathname.split('/')[4]
      
      if (!qrCodeId) {
        sendJSON(res, 400, { error: 'QR Code ID is required' })
        return
      }

      // Get QR code info before deletion
      const qrCode = db.prepare(`
        SELECT id, code, order_id, order_number, product_id, product_name
        FROM local_qr_codes
        WHERE id = ?
      `).get(qrCodeId)

      if (!qrCode) {
        sendJSON(res, 404, { error: 'QR Code not found' })
        return
      }

      // First delete related operation logs (due to FOREIGN KEY constraint)
      db.prepare('DELETE FROM operation_logs WHERE qr_code_id = ?').run(qrCodeId)

      // Delete the QR code
      const result = db.prepare('DELETE FROM local_qr_codes WHERE id = ?').run(qrCodeId)

      sendJSON(res, 200, {
        success: true,
        qrCodeId: qrCodeId,
        code: qrCode.code,
        deletedAt: new Date().toISOString()
      })
    } catch (err) {
      console.error('Error deleting QR code:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Get operation logs with filtering
  if (pathname === '/sklad/api/operation-logs' && req.method === 'GET') {
    try {
      const operationType = url.searchParams.get('type')
      const employeeId = url.searchParams.get('employee')
      const orderId = url.searchParams.get('order')
      const limit = parseInt(url.searchParams.get('limit') || '100', 10)
      const offset = parseInt(url.searchParams.get('offset') || '0', 10)

      // Build query
      let query = 'SELECT * FROM operation_logs WHERE 1=1'
      const params = []

      if (operationType) {
        query += ' AND operation_type = ?'
        params.push(operationType)
      }
      if (employeeId) {
        query += ' AND employee_id = ?'
        params.push(employeeId)
      }
      if (orderId) {
        query += ' AND order_id = ?'
        params.push(orderId)
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
      params.push(limit, offset)

      const logs = db.prepare(query).all(...params)

      // Parse details JSON
      const parsedLogs = logs.map(log => ({
        ...log,
        details: log.details ? JSON.parse(log.details) : null
      }))

      sendJSON(res, 200, {
        logs: parsedLogs,
        count: parsedLogs.length,
        limit: limit,
        offset: offset
      })
    } catch (err) {
      console.error('Error fetching operation logs:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Get last N operations for an employee
  if (pathname.match(/^\/sklad\/api\/employees\/[^\/]+\/operations$/) && req.method === 'GET') {
    try {
      const employeeId = pathname.split('/')[4]
      const limit = parseInt(url.searchParams.get('limit') || '10', 10)

      const logs = db.prepare(`
        SELECT * FROM operation_logs
        WHERE employee_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `).all(employeeId, limit)

      // Parse details JSON
      const parsedLogs = logs.map(log => ({
        ...log,
        details: log.details ? JSON.parse(log.details) : null
      }))

      sendJSON(res, 200, {
        employeeId: employeeId,
        logs: parsedLogs,
        count: parsedLogs.length,
        limit: limit
      })
    } catch (err) {
      console.error('Error fetching employee operations:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Get operation log statistics
  if (pathname === '/sklad/api/operation-logs/stats' && req.method === 'GET') {
    try {
      const stats = db.prepare(`
        SELECT 
          operation_type,
          COUNT(*) as count,
          COUNT(DISTINCT employee_id) as unique_employees,
          MIN(created_at) as first_at,
          MAX(created_at) as last_at
        FROM operation_logs
        GROUP BY operation_type
        ORDER BY count DESC
      `).all()

      sendJSON(res, 200, {
        stats: stats
      })
    } catch (err) {
      console.error('Error fetching operation logs stats:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Get shipment history
  if (pathname === '/sklad/api/shipments/history' && req.method === 'GET') {
    try {
      // Get all shipments (operations where type is 'qr_code_shipped')
      const shipments = db.prepare(`
        SELECT 
          id,
          employee_name,
          created_at,
          order_number,
          product_name,
          details
        FROM operation_logs
        WHERE operation_type = 'qr_code_shipped'
        ORDER BY created_at DESC
      `).all()

      // Group shipments by timestamp and employee to show combined shipments
      const groupedShipments = new Map()

      shipments.forEach(shipment => {
        // Round to nearest minute to group multiple QR codes scanned in same operation
        const timestamp = new Date(shipment.created_at)
        timestamp.setSeconds(0, 0)
        const key = `${timestamp.toISOString()}-${shipment.employee_name}`

        if (!groupedShipments.has(key)) {
          groupedShipments.set(key, {
            id: key,
            date: shipment.created_at,
            userName: shipment.employee_name,
            orders: new Set(),
            count: 0
          })
        }

        const group = groupedShipments.get(key)
        group.count++
        if (shipment.order_number) {
          group.orders.add(shipment.order_number)
        }
      })

      // Convert to array and format orders as array
      const result = Array.from(groupedShipments.values())
        .map(item => ({
          id: item.id,
          date: item.date,
          userName: item.userName,
          count: item.count,
          orders: Array.from(item.orders)
        }))
        .slice(0, 100) // Return last 100 shipments

      sendJSON(res, 200, {
        shipments: result,
        total: shipments.length
      })
    } catch (err) {
      console.error('Error fetching shipment history:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Get all employees
  if (pathname === '/sklad/api/employees' && req.method === 'GET') {
    try {
      const employees = db.prepare(`
        SELECT * FROM employees ORDER BY created_at DESC
      `).all()

      sendJSON(res, 200, { employees })
    } catch (err) {
      console.error('Error fetching employees:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Create employee
  if (pathname === '/sklad/api/employees' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const data = JSON.parse(body)
        let {
          id,
          name,
          email,
          phone,
          photo,
          avatar,
          position,
          department,
          role = 'worker',
          status = 'active',
          salary = 0,
          hireDate,
          birthDate,
          address,
          skills,
          notes,
          createdBy
        } = data

        if (!id || !name || !phone || !position || !department || !hireDate) {
          sendJSON(res, 400, { error: 'Missing required fields' })
          return
        }

        // Generate email if not provided
        if (!email) {
          email = `${name.toLowerCase().replace(/\s+/g, '.')}@warehouse.local`
        }

        // Create user account for the employee
        // Generate login from email (part before @) or name
        const loginParts = email.split('@')
        let baseLogin = loginParts[0] || name.toLowerCase().replace(/\s+/g, '.')
        let login = baseLogin
        let counter = 1

        // Check if login already exists and make it unique
        while (db.prepare('SELECT id FROM users WHERE login = ?').get(login)) {
          login = `${baseLogin}${counter}`
          counter++
        }

        // Use default temporary password for all new employees
        const temporaryPassword = '12345678'
        const passwordHash = hashSync(temporaryPassword, 10)
        const now = new Date().toISOString()

        // Create user
        const userInsert = db.prepare(`
          INSERT INTO users (login, password_hash, full_name, role, is_active, needs_password_change, created_at, updated_at)
          VALUES (?, ?, ?, ?, 1, 1, ?, ?)
        `).run(login, passwordHash, name, role, now, now)

        const userId = userInsert.lastInsertRowid

        // Create employee with reference to user
        db.prepare(`
          INSERT INTO employees (
            id, user_id, name, email, phone, photo, avatar, position, department,
            role, status, salary, hire_date, birth_date, address, skills,
            notes, created_at, updated_at, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id, userId, name, email, phone, photo || null, avatar || null, position,
          department, role, status, salary, hireDate, birthDate || null,
          address || null, skills ? JSON.stringify(skills) : null, notes || null,
          now, now, createdBy || 'System'
        )

        console.log(`✓ Created employee: ${name} (${email})`)
        console.log(`  Login: ${login}, Password: [temporary: 12345678]`)

        sendJSON(res, 201, {
          success: true,
          employee: {
            id, name, email, phone, photo, avatar, position, department,
            role, status, salary, hireDate, birthDate, address, skills, notes
          },
          credentials: {
            login,
            password: temporaryPassword,
            note: 'Default temporary password: 12345678 - must change on first login'
          }
        })
      } catch (err) {
        console.error('Error creating employee:', err)
        sendJSON(res, 500, { error: err.message })
      }
    })
    return
  }

  // Update employee
  if (pathname.match(/^\/sklad\/api\/employees\/[^\/]+$/) && req.method === 'PUT') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const employeeId = pathname.split('/')[4]
        const data = JSON.parse(body)

        const now = new Date().toISOString()
        const updates = []
        const values = []

        for (const [key, value] of Object.entries(data)) {
          if (key === 'id') continue
          const dbKey = key === 'hireDate' ? 'hire_date'
            : key === 'birthDate' ? 'birth_date'
            : key === 'createdBy' ? null
            : key.replace(/([A-Z])/g, '_$1').toLowerCase()
          
          if (dbKey) {
            updates.push(`${dbKey} = ?`)
            values.push(
              Array.isArray(value) ? JSON.stringify(value) : value
            )
          }
        }

        updates.push('updated_at = ?')
        values.push(now)
        updates.push('updated_by = ?')
        values.push(data.updatedBy || 'System')
        values.push(employeeId)

        db.prepare(`UPDATE employees SET ${updates.join(', ')} WHERE id = ?`).run(...values)

        sendJSON(res, 200, { success: true })
      } catch (err) {
        console.error('Error updating employee:', err)
        sendJSON(res, 500, { error: err.message })
      }
    })
    return
  }

  // Delete employee
  if (pathname.match(/^\/sklad\/api\/employees\/[^\/]+$/) && req.method === 'DELETE') {
    try {
      const employeeId = pathname.split('/')[4]
      db.prepare('DELETE FROM employees WHERE id = ?').run(employeeId)
      sendJSON(res, 200, { success: true })
    } catch (err) {
      console.error('Error deleting employee:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Get or change employee credentials
  const employeeCredentialsMatch = pathname.match(/^\/sklad\/api\/employees\/([^/]+)\/credentials$/)
  if (employeeCredentialsMatch) {
    const employeeId = decodeURIComponent(employeeCredentialsMatch[1])

    if (req.method === 'GET') {
      try {
        const employee = db.prepare(`
          SELECT e.id, e.name, e.email, u.login
          FROM employees e
          LEFT JOIN users u ON u.id = e.user_id
          WHERE e.id = ?
        `).get(employeeId)

        if (!employee) {
          sendJSON(res, 404, { error: 'Employee not found' })
          return
        }

        sendJSON(res, 200, {
          success: true,
          credentials: {
            login: employee.login || '',
            name: employee.name,
            email: employee.email || ''
          }
        })
      } catch (err) {
        console.error('Error loading employee credentials:', err)
        sendJSON(res, 500, { error: err.message })
      }
      return
    }

    if (req.method === 'PUT') {
      let body = ''
      req.on('data', chunk => { body += chunk })
      req.on('end', () => {
        try {
          const data = JSON.parse(body)
          const login = String(data.login || '').trim()
          const password = String(data.password || '')

          if (!login || !password) {
            sendJSON(res, 400, { error: 'Login and password are required' })
            return
          }

          const employee = db.prepare('SELECT id, name, user_id FROM employees WHERE id = ?').get(employeeId)
          if (!employee) {
            sendJSON(res, 404, { error: 'Employee not found' })
            return
          }

          if (!employee.user_id) {
            sendJSON(res, 400, { error: 'Employee has no linked user account' })
            return
          }

          const loginExists = db.prepare('SELECT id FROM users WHERE login = ? AND id != ?').get(login, employee.user_id)
          if (loginExists) {
            sendJSON(res, 409, { error: 'Login already exists' })
            return
          }

          const now = new Date().toISOString()
          const passwordHash = hashSync(password, 10)

          db.prepare(`
            UPDATE users
            SET login = ?, password_hash = ?, needs_password_change = 1, updated_at = ?
            WHERE id = ?
          `).run(login, passwordHash, now, employee.user_id)

          sendJSON(res, 200, {
            success: true,
            credentials: {
              login,
              name: employee.name
            }
          })
        } catch (err) {
          console.error('Error changing employee credentials:', err)
          sendJSON(res, 500, { error: err.message })
        }
      })
      return
    }
  }

  // ===== TOOLS API =====
  // Get all tools
  if (pathname === '/sklad/api/tools' && req.method === 'GET') {
    try {
      const tools = db.prepare('SELECT * FROM tools ORDER BY created_at DESC').all()
      sendJSON(res, 200, { 
        success: true, 
        tools: tools.map(t => ({
          id: t.id,
          name: t.name,
          inventoryNumber: t.inventory_number,
          serialNumber: t.serial_number,
          type: t.type,
          model: t.model,
          manufacturer: t.manufacturer,
          status: t.status,
          location: t.location,
          price: t.price,
          qrCode: t.qr_code,
          issuedTo: t.issued_to,
          issuedToName: t.issued_to_name,
          issuedAt: t.issued_at,
          breakdownDescription: t.breakdown_description,
          createdAt: t.created_at,
          updatedAt: t.updated_at,
          createdBy: t.created_by
        }))
      })
    } catch (err) {
      console.error('Error getting tools:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Create new tool
  if (pathname === '/sklad/api/tools' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const data = JSON.parse(body)
        const {
          id,
          name,
          inventoryNumber,
          serialNumber,
          type = 'hand_tool',
          model,
          manufacturer,
          status = 'in_stock',
          location,
          price = 0,
          qrCode,
          issuedTo,
          issuedToName,
          issuedAt,
          breakdownDescription,
          createdBy
        } = data

        if (!id || !name || !inventoryNumber || !type) {
          sendJSON(res, 400, { error: 'Missing required fields' })
          return
        }

        const now = new Date().toISOString()
        db.prepare(`
          INSERT INTO tools (
            id, name, inventory_number, serial_number, type, model, manufacturer,
            status, location, price, qr_code, issued_to, issued_to_name, issued_at,
            breakdown_description, created_at, updated_at, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id, name, inventoryNumber, serialNumber, type, model, manufacturer,
          status, location, price, qrCode, issuedTo, issuedToName, issuedAt,
          breakdownDescription, now, now, createdBy || 'System'
        )

        logOperation('tool_created', {
          tool_id: id,
          tool_name: name,
          tool_type: type,
          created_by: createdBy || 'System'
        })

        console.log(`✓ Created tool: ${name} (${inventoryNumber})`)

        sendJSON(res, 201, {
          success: true,
          tool: {
            id, name, inventoryNumber, serialNumber, type, model, manufacturer,
            status, location, price, qrCode, issuedTo, issuedToName, issuedAt,
            breakdownDescription, createdAt: now, updatedAt: now, createdBy: createdBy || 'System'
          }
        })
      } catch (err) {
        console.error('Error creating tool:', err)
        sendJSON(res, 500, { error: err.message })
      }
    })
    return
  }

  // Update tool
  if (pathname.match(/^\/sklad\/api\/tools\/[^\/]+$/) && req.method === 'PUT') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const toolId = pathname.split('/')[4]
        const data = JSON.parse(body)

        const now = new Date().toISOString()
        const setClause = []
        const values = []

        // Build dynamic UPDATE query
        if (data.name !== undefined) { setClause.push('name = ?'); values.push(data.name) }
        if (data.inventoryNumber !== undefined) { setClause.push('inventory_number = ?'); values.push(data.inventoryNumber) }
        if (data.serialNumber !== undefined) { setClause.push('serial_number = ?'); values.push(data.serialNumber) }
        if (data.type !== undefined) { setClause.push('type = ?'); values.push(data.type) }
        if (data.model !== undefined) { setClause.push('model = ?'); values.push(data.model) }
        if (data.manufacturer !== undefined) { setClause.push('manufacturer = ?'); values.push(data.manufacturer) }
        if (data.status !== undefined) { 
          setClause.push('status = ?')
          values.push(data.status)
          // Clear issued fields when status changes to repair/written_off
          if (data.status === 'repair' || data.status === 'written_off') {
            setClause.push('issued_to = ?', 'issued_to_name = ?', 'issued_at = ?')
            values.push(null, null, null)
          }
        }
        if (data.location !== undefined) { setClause.push('location = ?'); values.push(data.location) }
        if (data.price !== undefined) { setClause.push('price = ?'); values.push(data.price) }
        if (data.qrCode !== undefined) { setClause.push('qr_code = ?'); values.push(data.qrCode) }
        if (data.issuedTo !== undefined) { setClause.push('issued_to = ?'); values.push(data.issuedTo || null) }
        if (data.issuedToName !== undefined) { setClause.push('issued_to_name = ?'); values.push(data.issuedToName || null) }
        if (data.issuedAt !== undefined) { setClause.push('issued_at = ?'); values.push(data.issuedAt || null) }
        if (data.breakdownDescription !== undefined) { setClause.push('breakdown_description = ?'); values.push(data.breakdownDescription) }

        setClause.push('updated_at = ?')
        values.push(now)
        values.push(toolId)

        db.prepare(`UPDATE tools SET ${setClause.join(', ')} WHERE id = ?`).run(...values)

        logOperation('tool_updated', {
          tool_id: toolId,
          changes: data
        })

        sendJSON(res, 200, { success: true })
      } catch (err) {
        console.error('Error updating tool:', err)
        sendJSON(res, 500, { error: err.message })
      }
    })
    return
  }

  // Delete tool
  if (pathname.match(/^\/sklad\/api\/tools\/[^\/]+$/) && req.method === 'DELETE') {
    try {
      const toolId = pathname.split('/')[4]
      db.prepare('DELETE FROM tools WHERE id = ?').run(toolId)
      
      logOperation('tool_deleted', {
        tool_id: toolId
      })

      sendJSON(res, 200, { success: true })
    } catch (err) {
      console.error('Error deleting tool:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Get tool breakdowns
  if (pathname.match(/^\/sklad\/api\/tools\/[^\/]+\/breakdowns$/) && req.method === 'GET') {
    try {
      const toolId = pathname.split('/')[4]
      const breakdowns = db.prepare('SELECT * FROM tool_breakdowns WHERE tool_id = ? ORDER BY reported_at DESC').all(toolId)
      sendJSON(res, 200, { 
        success: true, 
        breakdowns: breakdowns.map(b => ({
          id: b.id,
          toolId: b.tool_id,
          status: b.status,
          description: b.description,
          reportedBy: b.reported_by,
          reportedAt: b.reported_at,
          repairStatus: b.repair_status,
          repairNotes: b.repair_notes,
          completedAt: b.completed_at,
          createdAt: b.created_at
        }))
      })
    } catch (err) {
      console.error('Error getting tool breakdowns:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Report tool breakdown
  if (pathname.match(/^\/sklad\/api\/tools\/[^\/]+\/breakdowns$/) && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const toolId = pathname.split('/')[4]
        const data = JSON.parse(body)
        const { description, reportedBy } = data

        if (!description) {
          sendJSON(res, 400, { error: 'Missing description' })
          return
        }

        const breakdownId = Math.random().toString(36).substr(2, 9)
        const now = new Date().toISOString()

        db.prepare(`
          INSERT INTO tool_breakdowns (id, tool_id, status, description, reported_by, reported_at, created_at)
          VALUES (?, ?, 'reported', ?, ?, ?, ?)
        `).run(breakdownId, toolId, description, reportedBy || 'System', now, now)

        // Update tool status to repair
        db.prepare(`
          UPDATE tools SET status = 'repair', issued_to = NULL, issued_to_name = NULL, issued_at = NULL
          WHERE id = ?
        `).run(toolId)

        logOperation('tool_breakdown_reported', {
          tool_id: toolId,
          breakdown_id: breakdownId,
          description: description,
          reported_by: reportedBy || 'System'
        })

        console.log(`✓ Reported breakdown for tool: ${toolId}`)

        sendJSON(res, 201, {
          success: true,
          breakdown: {
            id: breakdownId,
            toolId,
            status: 'reported',
            description,
            reportedBy: reportedBy || 'System',
            reportedAt: now,
            createdAt: now
          }
        })
      } catch (err) {
        console.error('Error reporting tool breakdown:', err)
        sendJSON(res, 500, { error: err.message })
      }
    })
    return
  }

  const mapMaterialInvoiceRows = (invoicesRows) => invoicesRows.map(inv => ({
    id: inv.id,
    employeeId: inv.employee_id,
    date: inv.date,
    orderNumber: inv.order_number,
    destination: inv.destination,
    totalAmount: inv.total_amount,
    items: db.prepare(`
      SELECT id, product_name, quantity, unit, article, price, scanned_at
      FROM material_invoice_items
      WHERE invoice_id = ?
      ORDER BY scanned_at ASC, id ASC
    `).all(inv.id).map(item => ({
      id: item.id,
      productName: item.product_name,
      quantity: item.quantity,
      unit: item.unit,
      article: item.article,
      price: item.price,
      scannedAt: item.scanned_at
    })),
    createdAt: inv.created_at,
    updatedAt: inv.updated_at,
    createdBy: inv.created_by
  }))

  // Get all material invoices
  if (pathname === '/sklad/api/material-invoices' && req.method === 'GET') {
    try {
      const invoices = db.prepare(`
        SELECT *
        FROM material_invoices
        ORDER BY date DESC
      `).all()

      sendJSON(res, 200, { success: true, invoices: mapMaterialInvoiceRows(invoices) })
    } catch (err) {
      console.error('Error getting material invoices:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Create new material invoice
  if (pathname === '/sklad/api/material-invoices' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const data = JSON.parse(body)
        const {
          employeeId,
          date,
          orderNumber,
          destination,
          totalAmount = 0,
          items = [],
          createdBy
        } = data

        if (!employeeId || !date || !orderNumber) {
          sendJSON(res, 400, { error: 'Missing required fields' })
          return
        }

        const invoiceId = Math.random().toString(36).substr(2, 9)
        const now = new Date().toISOString()

        // Insert invoice
        db.prepare(`
          INSERT INTO material_invoices (id, employee_id, date, order_number, destination, total_amount, created_at, updated_at, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(invoiceId, employeeId, date, orderNumber, destination || null, totalAmount, now, now, createdBy || 'System')

        // Insert items
        items.forEach(item => {
          const itemId = Math.random().toString(36).substr(2, 9)
          db.prepare(`
            INSERT INTO material_invoice_items (id, invoice_id, product_name, quantity, unit, article, price, scanned_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            itemId,
            invoiceId,
            item.productName,
            item.quantity,
            item.unit,
            item.article || null,
            item.price || 0,
            item.scannedAt || now
          )
        })

        logOperation('invoice_created', {
          invoice_id: invoiceId,
          employee_id: employeeId,
          order_number: orderNumber,
          items_count: items.length,
          created_by: createdBy || 'System'
        })

        sendJSON(res, 201, {
          success: true,
          invoice: {
            id: invoiceId,
            employeeId,
            date,
            orderNumber,
            destination,
            totalAmount,
            items,
            createdAt: now,
            updatedAt: now,
            createdBy: createdBy || 'System'
          }
        })
      } catch (err) {
        console.error('Error creating material invoice:', err)
        sendJSON(res, 500, { error: err.message })
      }
    })
    return
  }

  // Get material invoices for employee
  if (pathname.match(/^\/sklad\/api\/employees\/[^\/]+\/material-invoices$/) && req.method === 'GET') {
    try {
      const employeeId = pathname.split('/')[4]
      const invoices = db.prepare(`
        SELECT *
        FROM material_invoices
        WHERE employee_id = ?
        ORDER BY date DESC
      `).all(employeeId)

      sendJSON(res, 200, { success: true, invoices: mapMaterialInvoiceRows(invoices) })
    } catch (err) {
      console.error('Error getting employee material invoices:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Reports: Orders summary
  if (pathname === '/sklad/api/reports/orders-summary' && req.method === 'GET') {
    try {
      const reportMap = {}
      
      // 1. Получаем данные из material_invoices (ручно введённые)
      const invoices = db.prepare(`
        SELECT mi.*, e.name as employee_name,
          GROUP_CONCAT(json_object('id', mii.id, 'productName', mii.product_name, 'quantity', mii.quantity, 'unit', mii.unit, 'article', mii.article, 'price', mii.price), ',') as items_json
        FROM material_invoices mi
        LEFT JOIN employees e ON mi.employee_id = e.id
        LEFT JOIN material_invoice_items mii ON mi.id = mii.invoice_id
        WHERE mi.order_number IS NOT NULL AND mi.order_number NOT IN ('ПРИХОД', 'ПРИХОД (СКЛАД)', 'НОВАЯ КАРТОЧКА', 'ИЗМЕНЕНИЕ ЦЕНЫ')
        GROUP BY mi.id
        ORDER BY mi.date DESC
      `).all()

      invoices.forEach(inv => {
        // Parse items - extract JSON objects properly (not just split by comma)
        let items = []
        if (inv.items_json) {
          try {
            // Use regex to find all JSON objects in the string
            const objectMatches = inv.items_json.match(/{[^{}]*}/g) || []
            items = objectMatches.map(itemStr => {
              try {
                const parsed = JSON.parse(itemStr)
                // Only include items with valid id (not null)
                return parsed.id ? parsed : null
              } catch (e) {
                return null
              }
            }).filter(item => item !== null)
          } catch (e) {
            items = []
          }
        }
        
        if (!reportMap[inv.order_number]) {
          reportMap[inv.order_number] = {
            orderNumber: inv.order_number,
            items: [],
            employees: new Set(),
            source: 'material_invoice'
          }
        }
        
        if (inv.employee_name) {
          reportMap[inv.order_number].employees.add(inv.employee_name)
        }
        
        items.forEach(item => {
          const existing = reportMap[inv.order_number].items.find(i => i.article === item.article)
          if (existing) {
            existing.quantity += item.quantity
          } else {
            reportMap[inv.order_number].items.push(item)
          }
        })
      })

      // 2. Получаем данные из onec_orders (автоматические заказы из 1С)
      const onecOrders = db.prepare(`
        SELECT id, order_number, date, customer, status, amount, items
        FROM onec_orders
        ORDER BY date DESC
      `).all()

      onecOrders.forEach(order => {
        // Пропускаем если уже есть в material_invoices
        if (reportMap[order.order_number]) {
          return
        }

        let orderItems = []
        if (order.items) {
          try {
            const parsed = JSON.parse(order.items)
            if (Array.isArray(parsed)) {
              orderItems = parsed.map(item => ({
                id: item.id,
                productName: item.productName || item.itemName || '',
                quantity: item.quantity || 0,
                unit: item.unit || 'шт',
                article: item.productId || '',
                price: item.unitPrice || 0
              }))
            }
          } catch (e) {
            // Invalid JSON, skip
          }
        }

        reportMap[order.order_number] = {
          orderNumber: order.order_number,
          items: orderItems,
          employees: new Set(order.customer ? [order.customer] : []),
          source: 'onec_order',
          date: order.date,
          status: order.status
        }
      })

      const result = Object.values(reportMap).map(entry => ({
        ...entry,
        employees: Array.from(entry.employees),
        totalAmount: entry.items.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0)
      }))

      sendJSON(res, 200, { success: true, reports: result })
    } catch (err) {
      console.error('Error getting orders report:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Reports: Movement history
  if (pathname === '/sklad/api/reports/movement-history' && req.method === 'GET') {
    try {
      const invoices = db.prepare(`
        SELECT mi.*, e.name as employee_name
        FROM material_invoices mi
        LEFT JOIN employees e ON mi.employee_id = e.id
        ORDER BY mi.date DESC
      `).all()

      const result = invoices.map(inv => {
        const items = db.prepare(`
          SELECT product_name, quantity, unit, article, price
          FROM material_invoice_items
          WHERE invoice_id = ?
          ORDER BY scanned_at ASC, id ASC
        `).all(inv.id).map(item => ({
          productName: item.product_name,
          quantity: item.quantity,
          unit: item.unit,
          article: item.article,
          price: item.price
        }))
        const isIncoming = ['ПРИХОД', 'ПРИХОД (СКЛАД)', 'НОВАЯ КАРТОЧКА', 'ИЗМЕНЕНИЕ ЦЕНЫ'].includes(inv.order_number)
        
        return {
          id: inv.id,
          date: inv.date,
          type: isIncoming ? 'Приход ТМЦ' : (inv.destination === 'Брак' ? 'Списание брака' : 'Выдача ТМЦ'),
          tagType: isIncoming ? 'success' : (inv.destination === 'Брак' ? 'warning' : 'info'),
          employeeName: inv.employee_name || 'System',
          orderNumber: inv.order_number,
          itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
          totalAmount: inv.total_amount
        }
      })

      sendJSON(res, 200, { success: true, movements: result })
    } catch (err) {
      console.error('Error getting movement history:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Reports: Write-off (списание на изделия)
  if (pathname === '/sklad/api/reports/write-off' && req.method === 'GET') {
    try {
      const reportMap = {}
      
      // Получаем данные из onec_orders (материалы используемые на изделия)
      const orders = db.prepare(`
        SELECT id, order_number, items
        FROM onec_orders
        WHERE items IS NOT NULL
        ORDER BY date DESC
      `).all()

      orders.forEach(order => {
        try {
          const items = JSON.parse(order.items)
          if (!Array.isArray(items)) return

          items.forEach(item => {
            // Парсим materialUsed JSON если есть
            let materials = []
            if (item.materialUsed) {
              try {
                const parsed = JSON.parse(item.materialUsed)
                if (Array.isArray(parsed)) {
                  materials = parsed
                }
              } catch (e) {
                // Invalid JSON, skip
              }
            }

            // Используем productName как идентификатор изделия
            const productName = item.productName || item.itemName || 'Unknown'

            if (!reportMap[productName]) {
              reportMap[productName] = {
                productName: productName,
                items: [],
                employees: new Set()
              }
            }

            // Добавляем материалы
            materials.forEach(mat => {
              const existing = reportMap[productName].items.find(i => i.article === (mat.article || mat.sku || ''))
              if (existing) {
                existing.quantity += (mat.quantity || 0)
              } else {
                reportMap[productName].items.push({
                  id: mat.id || '',
                  productName: mat.name || mat.productName || '',
                  quantity: mat.quantity || 0,
                  unit: mat.unit || 'шт',
                  article: mat.article || mat.sku || '',
                  price: mat.price || 0
                })
              }
            })
          })
        } catch (e) {
          // Skip if items JSON is invalid
        }
      })

      const result = Object.values(reportMap).map(entry => ({
        ...entry,
        employees: Array.from(entry.employees),
        totalAmount: entry.items.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0)
      }))

      sendJSON(res, 200, { success: true, writeoffs: result })
    } catch (err) {
      console.error('Error getting write-off report:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Reports: Top employees
  if (pathname === '/sklad/api/reports/top-employees' && req.method === 'GET') {
    try {
      const employees = db.prepare(`
        SELECT e.*, COUNT(mi.id) as operations_count
        FROM employees e
        LEFT JOIN material_invoices mi ON e.id = mi.employee_id
        GROUP BY e.id
        ORDER BY operations_count DESC
        LIMIT 5
      `).all()

      const result = employees.map(emp => ({
        id: emp.id,
        name: emp.name,
        position: emp.position,
        avatar: emp.avatar,
        operations: emp.operations_count || 0
      }))

      sendJSON(res, 200, { success: true, employees: result })
    } catch (err) {
      console.error('Error getting top employees:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Reports: Critical items (low stock)
  if (pathname === '/sklad/api/reports/critical-items' && req.method === 'GET') {
    try {
      // Note: This requires inventory data which is in memory in current implementation
      // For now return empty, can be expanded when inventory is moved to database
      const criticalItems = []
      
      sendJSON(res, 200, { success: true, items: criticalItems })
    } catch (err) {
      console.error('Error getting critical items:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Change password
  if (pathname === '/sklad/api/auth/change-password' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const data = JSON.parse(body)
        const { userId, oldPassword, newPassword } = data

        if (!userId || !oldPassword || !newPassword) {
          sendJSON(res, 400, { error: 'Missing required fields' })
          return
        }

        const user = db.prepare('SELECT id, password_hash FROM users WHERE id = ?').get(userId)
        if (!user) {
          sendJSON(res, 404, { error: 'User not found' })
          return
        }

        // Verify old password
        const passwordValid = compareSync(oldPassword, user.password_hash)
        if (!passwordValid) {
          sendJSON(res, 401, { error: 'Invalid old password' })
          return
        }

        // Hash new password
        const newPasswordHash = hashSync(newPassword, 10)
        db.prepare('UPDATE users SET password_hash = ?, needs_password_change = 0, updated_at = ? WHERE id = ?')
          .run(newPasswordHash, new Date().toISOString(), userId)

        sendJSON(res, 200, { success: true })
      } catch (err) {
        console.error('Error changing password:', err)
        sendJSON(res, 500, { error: err.message })
      }
    })
    return
  }

  // Get or change employee credentials
  const credentialsMatch = pathname.match(/^\/sklad\/api\/employees\/([^/]+)\/credentials$/)
  if (credentialsMatch) {
    const employeeId = decodeURIComponent(credentialsMatch[1])

    if (req.method === 'GET') {
      try {
        const employee = db.prepare(`
          SELECT e.id, e.name, e.email, e.user_id, u.login AS login
          FROM employees e
          LEFT JOIN users u ON u.id = e.user_id
          WHERE e.id = ?
        `).get(employeeId)

        if (!employee) {
          sendJSON(res, 404, { error: 'Employee not found' })
          return
        }

        sendJSON(res, 200, {
          success: true,
          credentials: {
            login: employee.login || '',
            name: employee.name,
            email: employee.email
          }
        })
      } catch (err) {
        console.error('Error loading employee credentials:', err)
        sendJSON(res, 500, { error: err.message })
      }
      return
    }

    if (req.method === 'PUT') {
      let body = ''
      req.on('data', chunk => { body += chunk })
      req.on('end', () => {
        try {
          const data = JSON.parse(body)
          const login = String(data.login || '').trim()
          const password = String(data.password || '')

          if (!login || !password) {
            sendJSON(res, 400, { error: 'Login and password are required' })
            return
          }

          const employee = db.prepare(`
            SELECT e.id, e.name, e.user_id, u.login AS current_login
            FROM employees e
            LEFT JOIN users u ON u.id = e.user_id
            WHERE e.id = ?
          `).get(employeeId)

          if (!employee) {
            sendJSON(res, 404, { error: 'Employee not found' })
            return
          }

          if (!employee.user_id) {
            sendJSON(res, 400, { error: 'Employee has no linked user account' })
            return
          }

          const loginOwner = db.prepare('SELECT id FROM users WHERE login = ? AND id != ?').get(login, employee.user_id)
          if (loginOwner) {
            sendJSON(res, 409, { error: 'Login already exists' })
            return
          }

          const passwordHash = hashSync(password, 10)
          const now = new Date().toISOString()

          db.prepare(`
            UPDATE users
            SET login = ?, password_hash = ?, needs_password_change = 1, updated_at = ?
            WHERE id = ?
          `).run(login, passwordHash, now, employee.user_id)

          sendJSON(res, 200, {
            success: true,
            credentials: {
              login,
              name: employee.name
            }
          })
        } catch (err) {
          console.error('Error changing employee credentials:', err)
          sendJSON(res, 500, { error: err.message })
        }
      })
      return
    }
  }

  // Приёмка товара на склад готовой продукции (первое сканирование QR кода)
  if (pathname === '/sklad/api/inventory/receive-finished-product' && req.method === 'POST') {
    console.log('📦 [ENDPOINT] Received request for receive-finished-product')
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => {
      console.log('📦 [ENDPOINT] Body received:', body.substring(0, 100))
      try {
        const { qrId, productName, quantity, orderNumber, employeeId: requestEmployeeId, employeeName: requestEmployeeName } = JSON.parse(body)
        console.log('📦 [ENDPOINT] Parsed data:', { qrId, productName, quantity, orderNumber, requestEmployeeId, requestEmployeeName })
        
        if (!qrId || !productName) {
          sendJSON(res, 400, { error: 'Missing required fields' })
          return
        }

        const timestamp = new Date().toISOString()
        const invoiceId = `RECV-FP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const itemId = `ITEM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const resolvedEmployee = requestEmployeeId
          ? db.prepare(`
              SELECT id, name
              FROM employees
              WHERE user_id = ? OR CAST(user_id AS TEXT) = ?
              LIMIT 1
            `).get(requestEmployeeId, String(requestEmployeeId))
          : null

        const employeeByName = !resolvedEmployee && requestEmployeeName
          ? db.prepare(`
              SELECT id, name
              FROM employees
              WHERE name = ?
              LIMIT 1
            `).get(requestEmployeeName)
          : null

        const employeeId = resolvedEmployee?.id || employeeByName?.id || null
        const employeeName = resolvedEmployee?.name || employeeByName?.name || requestEmployeeName || 'QR Scan'

        if (!employeeId) {
          sendJSON(res, 400, { error: 'Missing employee identity for material invoice' })
          return
        }

        // Добавляем запись в material_invoices (используем правильные колонки)
        db.prepare(`
          INSERT INTO material_invoices (
            id, employee_id, date, order_number, destination, total_amount, created_at, updated_at, created_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          invoiceId,
          employeeId,
          timestamp,
          orderNumber || 'Без номера',
          'Готовая продукция',
          0,
          timestamp,
          timestamp,
          employeeName
        )

        // Добавляем товар в material_invoice_items
        db.prepare(`
          INSERT INTO material_invoice_items (
            id, invoice_id, product_name, quantity, unit, article, price, scanned_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          itemId,
          invoiceId,
          productName,
          quantity || 1,
          'шт',
          qrId,
          0,
          timestamp
        )

        // Проверяем существует ли товар в onec_stocks
        const existingStock = db.prepare(`
          SELECT * FROM onec_stocks WHERE name = ? AND warehouse = 'Готовая продукция'
        `).get(productName)

        if (existingStock) {
          // Обновляем количество
          db.prepare(`
            UPDATE onec_stocks 
            SET quantity = quantity + ?, current_stock = quantity + ?, local_only = 1, synced_at = ?
            WHERE name = ? AND warehouse = 'Готовая продукция'
          `).run(quantity || 1, quantity || 1, timestamp, productName)
          console.log(`✓ Updated stock for ${productName}`)
        } else {
          // Создаём новую запись
          db.prepare(`
            INSERT INTO onec_stocks (ref_key, name, product, warehouse, quantity, current_stock, unit, category, status, barcode, storageBin, image, local_only, synced_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            qrId,
            productName,
            productName,
            'Готовая продукция',
            quantity || 1,
            quantity || 1,
            'шт',
            'Готовая продукция',
            'in_stock',
            qrId,
            '',
            '',
            1,
            timestamp
          )
          console.log(`✓ Created stock for ${productName}`)
        }

        console.log(`✓ Product received to FP warehouse: ${productName} (qty: ${quantity || 1})`)
        sendJSON(res, 200, { success: true, invoiceId })
      } catch (err) {
        console.error('Error receiving product:', err)
        sendJSON(res, 500, { error: err.message })
      }
    })
    return
  }

  // Default 404
  res.writeHead(404)
  res.end(JSON.stringify({ error: 'Not found' }))
})

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}/sklad/api`)
  console.log(`\n📝 Test users:`)
  testUsers.forEach(u => console.log(`  - ${u.login} / ${u.login}`))

  // При старте пытаемся синхронизироваться с 1C
  console.log('\n📡 Attempting to sync with 1C OData...')
  const initialSync = await syncWith1C()

  if (initialSync.usedFallback || lastSyncTime.connectionStatus === 'unavailable') {
    console.log('\n❌ 1C IS UNAVAILABLE')
    console.log('⚠️  Data synchronization failed - 1C server is not responding')
    console.log('\nTo restore connection, configure these environment variables:')
    console.log('   VITE_1C_BASE_URL      - URL to 1C OData service')
    console.log('   VITE_1C_USERNAME      - Username for 1C authentication')
    console.log('   VITE_1C_PASSWORD      - Password for 1C authentication')
    console.log('\nCheck /sklad/api/1c/status for current connection status')
    console.log('Check /sklad/api/sync/logs for synchronization logs\n')
  } else if (lastSyncTime.connectionStatus === 'failed') {
    console.log('\n⚠️  SYNC ERROR:')
    console.log(`Error: ${lastSyncTime.error}`)
    console.log('Check /sklad/api/sync/logs for details\n')
  } else {
    console.log('\n✅ Successfully synced with 1C')
    console.log('Results:', initialSync.results)
  }

  // === AUTOMATIC SYNC EVERY HOUR ===
  // Синхронизируем заказы на перемещение каждый час
  setInterval(async () => {
    try {
      const transferOrders1C = await fetch1CTransferOrders()
      if (transferOrders1C && transferOrders1C.length > 0) {
        const stats = syncTransferOrdersIncremental(transferOrders1C)
        loadCacheFromDB()
        lastSyncTime.lastSyncByType.transfer_orders = new Date().toISOString()
        console.log(`📡 [HOURLY SYNC] Transfer Orders: +${stats.added} ~${stats.updated} -${stats.deleted} at ${new Date().toLocaleTimeString()}`)
        writeSyncLog(`Auto-sync: Transfer Orders +${stats.added} ~${stats.updated} -${stats.deleted}`)
      }
    } catch (err) {
      console.error('[HOURLY SYNC ERROR] Transfer Orders:', err.message)
      writeSyncLog(`Auto-sync error: ${err.message}`)
    }
  }, 3600000) // 1 hour in milliseconds

  console.log('⏰ Automatic sync scheduled: Transfer Orders every 1 hour')
})
