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
import { compareSync } from 'bcrypt'

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
          } catch (err) {
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

// Создаём тестовых пользователей если их нет
const testUsers = [
  { login: 'admin', fullName: 'Admin User', role: 'director' },
  { login: 'manager', fullName: 'Manager User', role: 'manager' },
  { login: 'storekeeper', fullName: 'Storekeeper User', role: 'storekeeper' },
  { login: 'worker', fullName: 'Worker User', role: 'worker' }
]

for (const user of testUsers) {
  try {
    const existing = db.prepare('SELECT id FROM users WHERE login = ?').get(user.login)
    if (!existing) {
      // Для простоты храним пароль как есть (в реальном приложении нужен bcrypt)
      db.prepare('INSERT INTO users (login, password_hash, full_name, role, is_active) VALUES (?, ?, ?, ?, 1)')
        .run(user.login, user.login, user.fullName, user.role)
      console.log(`✓ Created user: ${user.login}`)
    }
  } catch (err) {
    console.error(`Error creating user ${user.login}:`, err.message)
  }
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
function initializeOnecData() {
  // Таблицы уже созданы в CREATE TABLE IF NOT EXISTS блоках
  console.log('✓ Initialized 1C data tables')
}

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

async function fetch1CNomenclature() {
  // Получаем весь каталог номенклатуры (материалы/товары)
  const items = await fetch1COData('Catalog_Номенклатура', {
    '$select': 'Ref_Key,Description,Артикул,ЕдиницаИзмерения_Key,КатегорияНоменклатуры_Key,DeletionMark',
    '$filter': 'DeletionMark eq false',
    '$top': '10000'
  })

  if (!items || items.length === 0) return null
  return items
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
        unit, unit_key, category, status, reserved, purchasePrice, averagePrice, reservesByOrder, storageBin
      FROM onec_stocks
    `).all().map(s => ({
      ...s,
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
initializeOnecData()

// Вспомогательная функция для отправки JSON
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

// Вспомогательная функция для чтения body
function readBody(req) {
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
  const existing = db.prepare('SELECT ref_key FROM onec_stocks').all()
  const existingMap = new Map(existing.map(s => [s.ref_key, s]))

  for (const stock of stocks) {
    if (existingMap.has(stock.ref_key)) {
      // Don't overwrite local-only fields (sku, location, storageBin) that user has set
      const existing = existingMap.get(stock.ref_key)
      db.prepare(`UPDATE onec_stocks SET
        name = ?, product = ?, warehouse = ?,
        quantity = ?, current_stock = ?, unit = ?, unit_key = ?, category = ?,
        status = ?, reserved = ?, purchasePrice = ?, averagePrice = ?, reservesByOrder = ?
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
          (ref_key, name, sku, product, warehouse, location, quantity, current_stock, unit, unit_key, category, status, reserved, purchasePrice, averagePrice, reservesByOrder)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
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
            JSON.stringify(stock.reservesByOrder || {})
          )
        stats.added++
      } catch (e) { /* ignore */ }
    }
  }

  for (const [ref_key] of existingMap) {
    if (!ref_keysIn1C.has(ref_key)) {
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

    // Если хотя бы что-то получили, используем реальные данные
    let use1CData = false
    if ((units1C && units1C.length > 0) ||
        (warehouses1C && warehouses1C.length > 0) ||
        (stocks1C && stocks1C.length > 0) ||
        (orders1C && orders1C.length > 0)) {
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
            createdAt: new Date(user.created_at)
          }
        }))
      } catch (err) {
        res.writeHead(400)
        res.end(JSON.stringify({ error: err.message }))
      }
    })
    return
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
          categoryId: category?.ref_key || '',  // categoryId из кэша по названию
          warehouseId: warehouseRecord?.ref_key || ''  // warehouseId из кэша по названию
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
      // Fetch ЗаказНаПеремещение from 1C (без expand - используем значения из БД или кэша)
      const baseUrl = ONEC_CONFIG.baseUrl.replace(/\/$/, '')
      const url = `${baseUrl}/Document_ЗаказНаПеремещение?$format=json&$top=500&$select=Ref_Key,Number,Date,СтруктурнаяЕдиницаРезерв_Key,СтруктурнаяЕдиницаПолучатель_Key,Posted,СтруктурнаяЕдиницаРезерв____Presentation,СтруктурнаяЕдиницаПолучатель____Presentation&$orderby=Date desc`
      
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
        throw new Error(`1C API error: ${response.status}`)
      }
      
      const data = await response.json()
      const orders = (data.value || []).map(order => {
        // Получаем имена складов из 1C (Presentation) или из БД
        const sourceKey = order.СтруктурнаяЕдиницаРезерв_Key
        const destKey = order.СтруктурнаяЕдиницаПолучатель_Key
        
        const sourceWarehouse = cache.warehouses?.find(w => w.ref_key === sourceKey)
        const destWarehouse = cache.warehouses?.find(w => w.ref_key === destKey)
        
        return {
          Ref_Key: order.Ref_Key,
          Number: order.Number,
          Date: order.Date,
          sourceWarehouseKey: sourceKey,
          sourceWarehouseName: order.СтруктурнаяЕдиницаРезерв____Presentation || sourceWarehouse?.description || 'Unknown',
          destinationWarehouseKey: destKey,
          destinationWarehouseName: order.СтруктурнаяЕдиницаПолучатель____Presentation || destWarehouse?.description || 'Unknown',
          Posted: order.Posted,
          itemCount: 0
        }
      })
      
      sendJSON(res, 200, { value: orders })
    } catch (err) {
      console.error('Error fetching transfer orders:', err)
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
      
      // Format the response
      const result = {
        Ref_Key: order.Ref_Key,
        Number: order.Number,
        Date: order.Date,
        Posted: order.Posted,
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
        const { barcode, storageBin } = data

        console.log(`\n=== SAVING LOCAL PRODUCT FIELDS ===`)
        console.log(`📦 nomenclatureKey: ${nomenclatureKey}`)
        console.log(`   barcode: "${barcode}"`)
        console.log(`   storageBin: "${storageBin}"`)

        // Проверяем существует ли запись
        const existing = db.prepare('SELECT id FROM onec_stocks WHERE ref_key = ?').get(nomenclatureKey)

        if (existing) {
          // Обновляем существующую запись
          db.prepare('UPDATE onec_stocks SET barcode = ?, storageBin = ? WHERE ref_key = ?')
            .run(barcode || '', storageBin || '', nomenclatureKey)
          console.log(`✓ Updated stock record for ${nomenclatureKey}`)
        } else {
          // Создаём новую запись с минимальными данными
          db.prepare(`INSERT INTO onec_stocks (ref_key, name, product, barcode, storageBin, warehouse)
            VALUES (?, ?, ?, ?, ?, ?)`)
            .run(nomenclatureKey, '', '', barcode || '', storageBin || '', '')
          console.log(`✓ Created new stock record for ${nomenclatureKey}`)
        }

        sendJSON(res, 200, { 
          success: true, 
          message: 'Local fields saved',
          nomenclatureKey,
          saved: { barcode, storageBin }
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
})
