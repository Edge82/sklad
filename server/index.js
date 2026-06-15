/**
 * Точка входа backend-сервера
 * HTTP-сервер и все роуты
 */

import http from 'http'
import fs from 'fs'
import jwt from 'jsonwebtoken'
import { compareSync, hashSync } from 'bcrypt'

import { PORT, JWT_SECRET, getBasicAuthHeader, ONEC_CONFIG } from './config.js'

// Inline getUserRoleFromRequest to avoid ESM cache issues
function getUserRoleFromRequest(req) {
  try {
    const authHeader = req.headers.authorization || ''
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })
      return payload?.role || null
    }
    const cookies = req.headers.cookie || ''
    const authTokenMatch = cookies.match(/auth_token=([^;]+)/)
    if (authTokenMatch) {
      const token = decodeURIComponent(authTokenMatch[1])
      const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })
      return payload?.role || null
    }
    return null
  } catch {
    return null
  }
}

import { sendJSON, _readBody, writeSyncLog, logOperation, mapMaterialInvoiceRows, moscowNow } from './helpers.js'
import { cache, unitsCache, lastSyncTime, updateLastSyncTime } from './cache.js'
import {
  fetch1COData, fetch1CUnits, fetch1CCategories, fetch1CWarehouses,
  fetch1CStocks, fetch1COrders, fetch1CTransferOrders,
  fetchProductionOrders, fetchProductionOrderMaterials,
  loadUnitsCache, loadCacheFromDB, calculateReserves
} from './onec-client.js'
import {
  syncWith1C, syncUnitsIncremental, syncCategoriesIncremental,
  syncWarehousesIncremental, syncStocksIncremental,
  syncOrdersIncremental, syncTransferOrdersIncremental,
  syncTransferOrderItems, syncTransferOrderStatuses
} from './sync.js'
import db, { testUsers } from './db.js'

// Загружаем кэш при старте
loadUnitsCache()
loadCacheFromDB()

// ============================================================
// HTTP сервер
// ============================================================

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

  // Ping / version check
  if (pathname === '/sklad/api/ping' && req.method === 'GET') {
    sendJSON(res, 200, { ok: true, version: 2 })
    return
  }

  // -------------------------------------------------------
  // AUTH ROUTES
  // -------------------------------------------------------

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

  // Auth Change Password
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

        const passwordValid = compareSync(oldPassword, user.password_hash)
        if (!passwordValid) {
          sendJSON(res, 401, { error: 'Invalid old password' })
          return
        }

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

  // -------------------------------------------------------
  // STATUS / TEST ROUTES
  // -------------------------------------------------------

  // Test endpoint
  if (pathname === '/sklad/api/test' && req.method === 'GET') {
    sendJSON(res, 200, { status: 'ok', message: 'Backend is working' })
    return
  }

  // 1C Connection Status
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
    const statusCode = lastSyncTime.connectionStatus === 'failed' || lastSyncTime.connectionStatus === 'unavailable' ? 503 : 200
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
        const lines = logContent.split('\n').filter(l => l.trim()).slice(-100)
        sendJSON(res, 200, { logs: lines })
      } else {
        sendJSON(res, 200, { logs: [], message: 'No logs yet' })
      }
    } catch (err) {
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // 1C Metadata
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

  // -------------------------------------------------------
  // 1C DATA ROUTES (прокси к кэшу / БД)
  // -------------------------------------------------------

  // Units
  if (pathname === '/sklad/api/onec/units' && req.method === 'GET') {
    sendJSON(res, 200, { value: cache.units })
    return
  }

  // Categories
  if (pathname === '/sklad/api/onec/categories' && req.method === 'GET') {
    sendJSON(res, 200, { value: cache.categories })
    return
  }

  // Materials (Nomenclature catalog)
  if (pathname === '/sklad/api/onec/materials' && req.method === 'GET') {
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

  // Warehouses
  if (pathname === '/sklad/api/onec/warehouses' && req.method === 'GET') {
    const all = url.searchParams.get('all')
    let list = cache.warehouses
    if (all !== '1') {
      list = list.filter(w => (w.description || '').toLowerCase().includes('склад'))
    }
    const warehouses = list.map(w => ({
      id: w.ref_key,
      name: w.description
    }))
    sendJSON(res, 200, { value: warehouses })
    return
  }

  // Stocks (с обогащением из кэша)
  if (pathname === '/sklad/api/onec/stocks' && req.method === 'GET') {
    try {
      const search = url.searchParams.get('search')
      const category = url.searchParams.get('category')
      let allStocks = db.prepare('SELECT * FROM onec_stocks ORDER BY name').all()

      if (category) {
        allStocks = allStocks.filter(s => (s.category || '') === category)
      }

      if (search) {
        const q = search.toLowerCase()
        allStocks = allStocks.filter(s =>
          (s.name || '').toLowerCase().includes(q) ||
          (s.product || '').toLowerCase().includes(q) ||
          (s.barcode || '').toLowerCase().includes(q)
        ).slice(0, 50)
      }

      const unitsMap = new Map()
      cache.units?.forEach(u => {
        unitsMap.set(u.ref_key, u.description)
      })

      const enrichedStocks = allStocks.map(stock => {
        const category = cache.categories?.find(c => c.description === stock.category)
        const warehouseRecord = cache.warehouses?.find(w => w.description === stock.warehouse)

        let reservesByOrder = {}
        try {
          if (stock.reservesByOrder && typeof stock.reservesByOrder === 'string') {
            reservesByOrder = JSON.parse(stock.reservesByOrder)
          } else if (stock.reservesByOrder && typeof stock.reservesByOrder === 'object') {
            reservesByOrder = stock.reservesByOrder
          }
        } catch (e) {
          reservesByOrder = {}
        }

        let unitName = 'шт'
        if (stock.unit_key && unitsMap.has(stock.unit_key)) {
          unitName = unitsMap.get(stock.unit_key)
        } else if (stock.unit && stock.unit !== '?' && stock.unit.length > 0) {
          unitName = stock.unit
        }

        return {
          ...stock,
          reservesByOrder,
          unit: unitName,
          unitId: stock.unit_key || '',
          categoryId: category?.ref_key || ((stock.category === 'Готовая продукция' || stock.warehouse === 'Готовая продукция') ? '99' : ''),
          warehouseId: warehouseRecord?.ref_key || '',
          type: (stock.category === 'Готовая продукция' || stock.warehouse === 'Готовая продукция') ? 'product' : 'material',
          lastReceipt: stock.last_receipt || null
          // onecImageUrl — disabled: 1CFresh OData does not expose binary data from ValueStore attributes
        }
      })
      sendJSON(res, 200, { value: enrichedStocks })
    } catch (err) {
      console.error('Error fetching stocks:', err)
      sendJSON(res, 500, { error: 'Failed to fetch stocks' })
    }
    return
  }

  // Proxy endpoint: serve 1C image by ref_key
  const imageMatch = pathname.match(/^\/sklad\/api\/onec\/stocks\/([^/]+)\/image$/)
  if (imageMatch && req.method === 'GET') {
    const refKey = imageMatch[1]
    const stock = db.prepare('SELECT * FROM onec_stocks WHERE ref_key = ?').get(refKey)

    if (!stock) {
      sendJSON(res, 404, { error: 'Stock not found' })
      return
    }

    // If 1C image key exists, fetch from 1C OData
    if (stock.onec_image_key) {
      const authHeader = getBasicAuthHeader()
      const baseUrl = ONEC_CONFIG.baseUrl.replace(/\/$/, '')
      const imageUrl = `${baseUrl}/Catalog_НоменклатураПрисоединенныеФайлы(guid'${stock.onec_image_key}')/ФайлХранилище/$value`

      try {
        const response = await fetch(imageUrl, {
          headers: { 'Authorization': authHeader }
        })

        if (response.ok) {
          const buffer = Buffer.from(await response.arrayBuffer())
          if (buffer.length > 0) {
            const contentType = response.headers.get('content-type') || 'image/png'
            res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=3600' })
            res.end(buffer)
            return
          }
        }
        // If 1C fetch returns empty, fall through to local image
        console.warn(`⚠️ 1C image fetch failed/empty for ${refKey}, falling back to local image`)
      } catch (err) {
        console.warn(`⚠️ 1C image fetch error for ${refKey}: ${err.message}`)
      }
    }

    // Fallback: serve local (user-uploaded) image
    if (stock.image) {
      const base64Data = stock.image.replace(/^data:image\/\w+;base64,/, '')
      const imageBuffer = Buffer.from(base64Data, 'base64')
      // Determine content type from the data URL prefix
      const contentType = stock.image.startsWith('data:image/')
        ? stock.image.split(';')[0].split(':')[1]
        : 'image/png'
      res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=3600' })
      res.end(imageBuffer)
      return
    }

    sendJSON(res, 404, { error: 'No image available' })
    return
  }

  // Save local product fields (barcode, storageBin, image)
  if (pathname.match(/^\/sklad\/api\/onec\/stocks\/[^/]+$/) && (req.method === 'PUT' || req.method === 'POST')) {
    let body = ''
    req.on('data', chunk => { body += chunk.toString() })
    req.on('end', () => {
      try {
        const nomenclatureKey = pathname.split('/').pop()
        const data = JSON.parse(body)
        const { barcode, storageBin, image } = data

        const existing = db.prepare('SELECT id FROM onec_stocks WHERE ref_key = ?').get(nomenclatureKey)

        if (existing) {
          db.prepare('UPDATE onec_stocks SET barcode = ?, storageBin = ?, image = ? WHERE ref_key = ?')
            .run(barcode || '', storageBin || '', image || '', nomenclatureKey)
        } else {
          db.prepare(`INSERT INTO onec_stocks (ref_key, name, product, barcode, storageBin, warehouse, image)
            VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(nomenclatureKey, '', '', barcode || '', storageBin || '', '', image || '')
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

  // Barcode lookup in stocks
  if (pathname === '/sklad/api/onec/stocks/by-barcode' && req.method === 'GET') {
    try {
      const barcode = (url.searchParams.get('barcode') || '').trim()
      if (!barcode) {
        sendJSON(res, 400, { error: 'barcode parameter is required' })
        return
      }
      const stocks = db.prepare(
        'SELECT * FROM onec_stocks WHERE barcode LIKE ? LIMIT 50'
      ).all(`%${barcode}%`)

      sendJSON(res, 200, {
        success: true,
        items: stocks.map(s => ({
          ref_key: s.ref_key,
          name: s.name,
          product: s.product,
          sku: s.sku || '',
          barcode: s.barcode || '',
          storageBin: s.storageBin || '',
          warehouse: s.warehouse || '',
          quantity: s.quantity || 0,
          unit: s.unit || 'шт',
          unit_key: s.unit_key || '',
          category: s.category || '',
          purchasePrice: s.purchasePrice || 0,
          averagePrice: s.averagePrice || 0
        }))
      })
    } catch (err) {
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Material checkouts (issue/return tracking for household items)
  if (pathname === '/sklad/api/onec/stock-checkouts' && req.method === 'GET') {
    try {
      const employeeId = url.searchParams.get('employeeId')
      let checkouts
      if (employeeId) {
        checkouts = db.prepare('SELECT * FROM material_checkouts WHERE employee_id = ? ORDER BY created_at DESC').all(employeeId)
      } else {
        checkouts = db.prepare('SELECT * FROM material_checkouts ORDER BY created_at DESC').all()
      }
      sendJSON(res, 200, { success: true, checkouts })
    } catch (err) {
      console.error('Error getting checkouts:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Issue material to employee (create checkout + reduce stock)
  if (pathname.match(/^\/sklad\/api\/onec\/stocks\/[^/]+\/issue$/) && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const refKey = pathname.split('/')[5]
        const { employeeId, employeeName, quantity = 1, performedBy } = JSON.parse(body)

        if (!employeeId || !employeeName) {
          sendJSON(res, 400, { error: 'employeeId and employeeName are required' })
          return
        }

        const stock = db.prepare('SELECT * FROM onec_stocks WHERE ref_key = ?').get(refKey)
        if (!stock) {
          sendJSON(res, 404, { error: 'Stock item not found' })
          return
        }

        const currentQty = Number(stock.current_stock || 0)
        if (currentQty < quantity) {
          sendJSON(res, 400, { error: 'Недостаточно остатка на складе' })
          return
        }

        const now = moscowNow()
        db.prepare('UPDATE onec_stocks SET current_stock = current_stock - ? WHERE ref_key = ?')
          .run(quantity, refKey)

        const checkoutId = Math.random().toString(36).substr(2, 9)
        db.prepare(`
          INSERT INTO material_checkouts (id, material_ref_key, material_name, sku, employee_id, employee_name, quantity, date, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(checkoutId, refKey, stock.name, stock.sku || '', employeeId, employeeName, quantity, now, now)

        logOperation('material_issued', {
          productName: stock.name,
          productId: refKey,
          orderNumber: stock.sku || '',
          employee_id: employeeId,
          employee_name: employeeName,
          details: JSON.stringify({ quantity, sku: stock.sku, checkoutId })
        })

        sendJSON(res, 200, {
          success: true,
          message: `Выдано ${quantity} ${stock.unit || 'шт'}`,
          checkout: {
            id: checkoutId,
            materialRefKey: refKey,
            materialName: stock.name,
            sku: stock.sku,
            employeeId,
            employeeName,
            quantity,
            date: now
          },
          remainingStock: currentQty - quantity
        })
      } catch (err) {
        console.error('Error issuing material:', err)
        sendJSON(res, 500, { error: err.message })
      }
    })
    return
  }

  // Return material from employee (remove checkout + increase stock)
  if (pathname.match(/^\/sklad\/api\/onec\/stocks\/[^/]+\/return$/) && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const refKey = pathname.split('/')[5]
        const { employeeId, quantity = 1 } = JSON.parse(body)

        if (!employeeId) {
          sendJSON(res, 400, { error: 'employeeId is required' })
          return
        }

        // Find and delete matching checkout records
        const checkouts = db.prepare(
          'SELECT * FROM material_checkouts WHERE material_ref_key = ? AND employee_id = ? ORDER BY created_at ASC'
        ).all(refKey, employeeId)

        if (checkouts.length === 0) {
          sendJSON(res, 404, { error: 'Нет выданных записей для возврата' })
          return
        }

        let remaining = quantity
        const deletedIds = []
        for (const checkout of checkouts) {
          if (remaining <= 0) break
          const checkoutQty = Number(checkout.quantity)
          if (checkoutQty <= remaining) {
            db.prepare('DELETE FROM material_checkouts WHERE id = ?').run(checkout.id)
            deletedIds.push(checkout.id)
            remaining -= checkoutQty
          } else {
            db.prepare('UPDATE material_checkouts SET quantity = quantity - ? WHERE id = ?')
              .run(remaining, checkout.id)
            remaining = 0
            deletedIds.push(checkout.id)
          }
        }

        if (remaining > 0) {
          sendJSON(res, 400, { error: `Недостаточно выданных записей, не хватает ${remaining}` })
          return
        }

        const now = moscowNow()
        db.prepare('UPDATE onec_stocks SET current_stock = current_stock + ? WHERE ref_key = ?')
          .run(quantity, refKey)

        const stock = db.prepare('SELECT * FROM onec_stocks WHERE ref_key = ?').get(refKey)

        logOperation('material_returned', {
          productName: stock?.name || '',
          productId: refKey,
          orderNumber: stock?.sku || '',
          employee_id: employeeId,
          details: JSON.stringify({ quantity, deletedCheckoutIds: deletedIds })
        })

        sendJSON(res, 200, {
          success: true,
          message: `Возвращено ${quantity} ${stock?.unit || 'шт'}`,
          deletedCheckoutIds: deletedIds,
          remainingStock: Number(stock?.current_stock || 0) + quantity
        })
      } catch (err) {
        console.error('Error returning material:', err)
        sendJSON(res, 500, { error: err.message })
      }
    })
    return
  }

  // Orders
  if (pathname === '/sklad/api/onec/orders' && req.method === 'GET') {
    sendJSON(res, 200, { value: cache.orders })
    return
  }

  // Order items
  if (pathname === '/sklad/api/onec/order-items' && req.method === 'GET') {
    const orderId = url.searchParams.get('orderId')
    if (!orderId) {
      sendJSON(res, 400, { error: 'orderId is required' })
      return
    }

    try {
      let items = null
      const selectFields = 'LineNumber,Номенклатура_Key,Номенклатура____Presentation,Номенклатура_Presentation,Количество,Цена,Сумма,ЕдиницаИзмерения_Key'

      items = await fetch1COData(`Document_ЗаказПокупателя(guid'${orderId}')/Запасы`, {
        '$select': selectFields
      })

      if (!items || items.length === 0) {
        items = await fetch1COData('Document_ЗаказПокупателя_Запасы', {
          '$filter': `Ref_Key eq guid'${orderId}'`,
          '$select': selectFields
        })
      }

      const processedItems = items ? items.map((item, idx) => ({
        id: item.LineNumber || idx + 1,
        productId: item.Номенклатура_Key,
        productName: item.Номенклатура____Presentation || item.Номенклатура_Presentation || 'Unknown',
        quantity: item.Количество || 0,
        unitPrice: item.Цена || 0,
        totalPrice: item.Сумма || 0,
        unit: item.ЕдиницаИзмерения_Key
          ? (cache.units?.find((u) => u.ref_key === item.ЕдиницаИзмерения_Key)?.description || 'шт')
          : 'шт'
      })) : []

      sendJSON(res, 200, { items: processedItems })
    } catch (err) {
      console.error('Error fetching order items:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Update order painting (окраска)
  if (pathname === '/sklad/api/onec/orders/painting' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk.toString() })
    req.on('end', () => {
      try {
        const data = JSON.parse(body)
        const { orderId, painting } = data

        if (!orderId) {
          sendJSON(res, 400, { error: 'Order ID is required' })
          return
        }

        const stmt = db.prepare('UPDATE onec_orders SET painting = ? WHERE ref_key = ?')
        const result = stmt.run(painting || '', orderId)

        if (result.changes === 0) {
          sendJSON(res, 404, { error: 'Order not found' })
          return
        }

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

  // -------------------------------------------------------
  // TRANSFER ORDERS ROUTES
  // -------------------------------------------------------

  // Transfer Orders list (from local DB)
  if (pathname === '/sklad/api/onec/transfer-orders' && req.method === 'GET') {
    try {
      const orders = db.prepare('SELECT ref_key, order_number, date, source_warehouse_key, source_warehouse_name, destination_warehouse_key, destination_warehouse_name, customer_order_key, customer_order_number, posted, status_key, status_description FROM transfer_orders ORDER BY date DESC').all()

      const result = orders.map(order => ({
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
        statusKey: order.status_key || '',
        statusDescription: order.ref_key?.startsWith?.('LOCAL-') ? 'Черновик' : (order.status_description || 'В работе')
      }))

      sendJSON(res, 200, { value: result })
    } catch (err) {
      console.error('Error fetching transfer orders from DB:', err)
      sendJSON(res, 500, { error: 'Failed to fetch transfer orders' })
    }
    return
  }

  // Transfer Order Details (from local DB)
  if (pathname.match(/^\/sklad\/api\/onec\/transfer-orders\/[^/]+$/) && req.method === 'GET') {
    try {
      const orderId = pathname.split('/').pop()

      const order = db.prepare('SELECT * FROM transfer_orders WHERE ref_key = ?').get(orderId)

      if (!order) {
        sendJSON(res, 404, { error: 'Transfer order not found' })
        return
      }

      let items = []
      try {
        items = JSON.parse(order.items || '[]')
      } catch (e) { /* ignore */ }

      // Обогащаем items данными из onec_stocks (barcode, storageBin, price) и нормализуем формат
      const enrichedItems = items.map((item, idx) => {
        let stock = null
        let stockPrice = 0
        try {
          const refKey = item.Номенклатура_Key || item.nomenclatureKey || ''
          if (refKey) {
            stock = db.prepare('SELECT barcode, storageBin, name, purchasePrice, averagePrice FROM onec_stocks WHERE ref_key = ?').get(refKey)
          }
          // Fallback 1: ищем по названию товара
          if (!stock) {
            const name = item.nomenclatureName || item.productName || ''
            if (name) {
              stock = db.prepare('SELECT barcode, storageBin, name, purchasePrice, averagePrice FROM onec_stocks WHERE name = ? LIMIT 1').get(name)
              if (!stock) {
                stock = db.prepare('SELECT barcode, storageBin, name, purchasePrice, averagePrice FROM onec_stocks WHERE name LIKE ? LIMIT 1').get(name + '%')
              }
            }
          }
          // Fallback 2: ищем по штрихкоду/артикулу
          if (!stock) {
            const barcode = item.barcode || item.sku || ''
            if (barcode) {
              stock = db.prepare('SELECT barcode, storageBin, name, purchasePrice, averagePrice FROM onec_stocks WHERE barcode LIKE ? LIMIT 1').get(`%${barcode}%`)
            }
          }
          if (stock) {
            stockPrice = Number(stock.purchasePrice || stock.averagePrice || 0)
          }
        } catch (err) { /* ignore enrichment errors */ }

        const itemPrice = Number(item.Цена || item.price || 0)

        // Нормализация: поддержка старого формата (productName, quantity) -> новый (nomenclatureName, Количество)
        return {
          LineNumber: item.LineNumber || idx + 1,
          Номенклатура_Key: item.Номенклатура_Key || item.nomenclatureKey || stock?.name || item.barcode || '',
          nomenclatureName: item.nomenclatureName || item.productName || 'Без названия',
          Количество: item.Количество || item.quantity || 0,
          scannedQty: item.scannedQty || 0,
          barcode: stock?.barcode || stock?.sku || item.barcode || item.Номенклатура_Key || item.nomenclatureKey || '',
          storageBin: stock?.storageBin || item.storageBin || '',
          Цена: itemPrice || stockPrice,
          price: itemPrice || stockPrice
        }
      })

      const result = {
        Ref_Key: order.ref_key,
        Number: order.order_number,
        Date: order.date,
        Posted: order.posted === 1,
        statusKey: order.status_key || '',
        statusDescription: order.ref_key?.startsWith?.('LOCAL-') ? 'Черновик' : (order.status_description || 'В работе'),
        sourceWarehouseKey: order.source_warehouse_key,
        destinationWarehouseKey: order.destination_warehouse_key,
        sourceWarehouseName: order.source_warehouse_name || 'Unknown',
        destinationWarehouseName: order.destination_warehouse_name || 'Unknown',
        items: enrichedItems
      }

      sendJSON(res, 200, result)
    } catch (err) {
      console.error('❌ Error fetching transfer order details:', err.message)
      sendJSON(res, 500, { error: 'Failed to fetch transfer order details', details: err.message })
    }
    return
  }

  // Complete transfer order
  if (pathname.match(/^\/sklad\/api\/onec\/transfer-orders\/[a-f0-9\-]+\/complete$/) && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk.toString() })
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

        const statusCatalog = 'Catalog_СостоянияЗаказовНаПеремещение'
        let statusKey = ''

        try {
          const catalogUrl = `${baseUrl}/${statusCatalog}?$format=json&$select=Ref_Key,Description`
          const catalogResponse = await fetch(catalogUrl, {
            headers: { 'Authorization': authHeader, 'Accept': 'application/json' }
          })

          if (!catalogResponse.ok) {
            throw new Error(`Failed to fetch status catalog: ${catalogResponse.status}`)
          }

          const catalogData = await catalogResponse.json()
          const statusItems = catalogData.value || []

          let foundStatus = statusItems.find(item => {
            const desc = String(item.Description || '').trim()
            return desc === targetStatusName
          })

          if (!foundStatus) {
            foundStatus = statusItems.find(item => {
              const desc = String(item.Description || '').trim()
              return desc === 'Завершен' || desc.startsWith('Завершен')
            })
          }

          if (!foundStatus && targetStatusName.toLowerCase().includes('завершен')) {
            foundStatus = statusItems.find(item => {
              const desc = String(item.Description || '').trim().toLowerCase()
              return desc.includes('завершен')
            })
          }

          if (foundStatus?.Ref_Key) {
            statusKey = foundStatus.Ref_Key
          } else {
            if (statusItems.length > 1) {
              statusKey = statusItems[1].Ref_Key
            } else if (statusItems.length === 1) {
              statusKey = statusItems[0].Ref_Key
            } else {
              throw new Error('No statuses found in catalog')
            }
          }
        } catch (err) {
          throw err
        }

        let updated = false
        try {
          const transferUrl = `${baseUrl}/Document_ЗаказНаПеремещение(guid'${orderId}')`
          const response = await fetch(transferUrl, {
            method: 'PATCH',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ СостояниеЗаказа_Key: statusKey })
          })

          console.log('[1C COMPLETE TRANSFER ORDER] Patching with statusKey:', statusKey, 'response:', response.status)

          if (response.ok) {
            updated = true
          }
        } catch (err) {
          // continue despite error
        }

        const deletedScans = db.prepare('DELETE FROM transfer_order_scans WHERE order_ref_key = ?').run(orderId)

        // Get user info from JWT
        let employeeName = 'System'
        let employeeId = null
        try {
          const authHeader = req.headers.authorization || ''
          if (authHeader.startsWith('Bearer ')) {
            const payload = jwt.verify(authHeader.substring(7), JWT_SECRET, { algorithms: ['HS256'] })
            employeeName = payload?.login || 'System'
            employeeId = payload?.userId || null
          } else {
            const cookies = req.headers.cookie || ''
            const m = cookies.match(/auth_token=([^;]+)/)
            if (m) {
              const payload = jwt.verify(decodeURIComponent(m[1]), JWT_SECRET)
              employeeName = payload?.login || 'System'
              employeeId = payload?.userId || null
            }
          }
        } catch {}

        // Если у заказа нет ответственного — проставляем того, кто завершил
        const currentOrder = db.prepare('SELECT created_by FROM transfer_orders WHERE ref_key = ?').get(orderId)
        if (currentOrder && (!currentOrder.created_by || currentOrder.created_by === '')) {
          db.prepare('UPDATE transfer_orders SET created_by = ? WHERE ref_key = ?')
            .run(employeeName, orderId)
        }

        const order = db.prepare('SELECT * FROM transfer_orders WHERE ref_key = ?').get(orderId)
        logOperation('transfer_order_completed', {
          orderId,
          orderNumber: order?.order_number || orderId,
          employeeName,
          employeeId: String(employeeId),
          details: { statusName: targetStatusName, updated }
        })

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

  // Save transfer order scan results
  if (pathname === '/sklad/api/transfer-orders/scans' && req.method === 'POST') {
    try {
      let body = ''
      req.on('data', chunk => { body += chunk })
      req.on('end', () => {
        const data = JSON.parse(body)
        const { orderRefKey, items } = data

        db.prepare('DELETE FROM transfer_order_scans WHERE order_ref_key = ?').run(orderRefKey)

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

  // Get transfer order scan results
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

  // Get all transfer orders
  if (pathname === '/sklad/api/transfer-orders' && req.method === 'GET') {
    try {
      // Пробуем подтянуть состав из 1С для заказов с пустыми items
      try { await syncTransferOrderItems() } catch (e) { /* ignore */ }

      const orders = db.prepare(`
        SELECT ref_key, order_number, date, source_warehouse_key, source_warehouse_name, destination_warehouse_key, destination_warehouse_name, customer_order_key, customer_order_number, posted, items, selected_product, created_by, status_description
        FROM transfer_orders ORDER BY date DESC
      `).all()

      // Обогащаем items ценами из onec_stocks
      const enrichedOrders = orders.map(order => {
        let items = []
        try { items = JSON.parse(order.items || '[]') } catch { /* ignore */ }

        const enrichedItems = items.map(item => {
          let stockPrice = 0
          try {
            const refKey = item.nomenclatureKey || item.Номенклатура_Key || ''
            let stock = null
            if (refKey) {
              stock = db.prepare('SELECT purchasePrice, averagePrice FROM onec_stocks WHERE ref_key = ?').get(refKey)
            }
            if (!stock) {
              const name = item.productName || item.nomenclatureName || ''
              if (name) {
                stock = db.prepare('SELECT purchasePrice, averagePrice FROM onec_stocks WHERE name = ? LIMIT 1').get(name)
              }
            }
            if (!stock) {
              const barcode = item.barcode || ''
              if (barcode) {
                stock = db.prepare('SELECT purchasePrice, averagePrice FROM onec_stocks WHERE barcode LIKE ? LIMIT 1').get(`%${barcode}%`)
              }
            }
            if (stock) {
              stockPrice = Number(stock.purchasePrice || stock.averagePrice || 0)
            }
          } catch { /* ignore price enrichment errors */ }

          const itemPrice = Number(item.price || item.Цена || 0)

          return {
            ...item,
            price: itemPrice || stockPrice
          }
        })

        return {
          ...order,
          items: JSON.stringify(enrichedItems)
        }
      })

      sendJSON(res, 200, { success: true, orders: enrichedOrders })
    } catch (err) {
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Create new transfer order (local only)
  if (pathname === '/sklad/api/transfer-orders/create' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', async () => {
      try {
        const data = JSON.parse(body)
        const { sourceWarehouseKey, sourceWarehouseName, destinationWarehouseKey, destinationWarehouseName, items, customerOrderKey, customerOrderNumber, selectedProduct } = data

        if (!sourceWarehouseKey || !destinationWarehouseKey) {
          sendJSON(res, 400, { error: 'sourceWarehouseKey and destinationWarehouseKey are required' })
          return
        }

        let creatorName = 'Система'
        try {
          const authHeader = req.headers.authorization || ''
          if (authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7)
            const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })
            creatorName = payload?.login || 'Система'
          } else {
            const cookies = req.headers.cookie || ''
            const authTokenMatch = cookies.match(/auth_token=([^;]+)/)
            if (authTokenMatch) {
              const token = decodeURIComponent(authTokenMatch[1])
              const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })
              creatorName = payload?.login || 'Система'
            }
          }
        } catch { /* fallback to default */ }

        const localRefKey = `LOCAL-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
        const orderNumber = `LOCAL-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
        const now = moscowNow()
        const itemsJson = JSON.stringify(items || [])

        // Save locally only
        db.prepare(`
          INSERT INTO transfer_orders (ref_key, order_number, date, source_warehouse_key, source_warehouse_name,
            destination_warehouse_key, destination_warehouse_name, customer_order_key, customer_order_number, posted, items, synced_at, selected_product, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
        `).run(localRefKey, orderNumber, now, sourceWarehouseKey, sourceWarehouseName || '',
          destinationWarehouseKey, destinationWarehouseName || '', customerOrderKey || null,
          customerOrderNumber || null, itemsJson, now, selectedProduct || null, creatorName)

        let employeeName = 'System'
        let employeeId = null
        try {
          const cookies = req.headers.cookie || ''
          const m = cookies.match(/auth_token=([^;]+)/)
          if (m) {
            const payload = jwt.verify(decodeURIComponent(m[1]), JWT_SECRET)
            employeeName = payload?.login || 'System'
            employeeId = payload?.userId || null
          }
        } catch {}

        logOperation('transfer_order_created', {
          orderNumber,
          employeeName,
          employeeId: String(employeeId),
          details: {
            sourceWarehouse: sourceWarehouseName,
            destinationWarehouse: destinationWarehouseName,
            itemsCount: (items || []).length
          }
        })

        sendJSON(res, 201, {
          success: true,
          order: {
            ref_key: localRefKey,
            order_number: orderNumber,
            date: now,
            sourceWarehouseKey,
            sourceWarehouseName: sourceWarehouseName || '',
            destinationWarehouseKey,
            destinationWarehouseName: destinationWarehouseName || '',
            customerOrderKey: customerOrderKey || null,
            customerOrderNumber: customerOrderNumber || null,
            items: items || [],
            posted: false
          }
        })
      } catch (err) {
        sendJSON(res, 500, { error: err.message })
      }
    })
    return
  }

  // Send local transfer order to 1C with status 'В работе (к списанию)'
  const sendMatch = pathname.match(/^\/sklad\/api\/transfer-orders\/([^/]+)\/send-to-1c$/)
  if (sendMatch && req.method === 'POST') {
    const localRefKey = sendMatch[1]
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', async () => {
      try {
        const order = db.prepare('SELECT * FROM transfer_orders WHERE ref_key = ?').get(localRefKey)
        if (!order) {
          sendJSON(res, 404, { error: 'Order not found' })
          return
        }

        const authHeader = getBasicAuthHeader()
        const baseUrl = ONEC_CONFIG.baseUrl.replace(/\/$/, '')
        const url = `${baseUrl}/Document_ЗаказНаПеремещение`

        const items = JSON.parse(order.items || '[]')

        // Enrich items with unit keys
        const enrichedItems = await Promise.all(items.map(async (item) => {
          if (!item.unitKey && item.nomenclatureKey) {
            const stock = db.prepare('SELECT unit_key FROM onec_stocks WHERE ref_key = ?').get(item.nomenclatureKey)
            if (stock?.unit_key) {
              item.unitKey = stock.unit_key
            }
          }
          return item
        }))

        // Look up operation type key for 'Перемещение'
        let operationKey = null
        try {
          const opUrl = `${baseUrl}/Catalog_ХозяйственныеОперации?$format=json&$select=Ref_Key,Description&$filter=Description eq 'Перемещение'`
          const opResponse = await fetch(opUrl, {
            headers: { 'Authorization': authHeader, 'Accept': 'application/json' }
          })
          if (opResponse.ok) {
            const opData = await opResponse.json()
            const opItems = opData.value || []
            if (opItems.length > 0) {
              operationKey = opItems[0].Ref_Key
            }
          }
        } catch { /* ignore */ }

        // Look up 'В работе (к списанию)' status key
        let statusKey = null
        let statusDescription = ''
        try {
          const targetStatus = 'В работе (к списанию)'
          const stUrl = `${baseUrl}/Catalog_СостоянияЗаказовНаПеремещение?$format=json&$select=Ref_Key,Description`
          const stResponse = await fetch(stUrl, {
            headers: { 'Authorization': authHeader, 'Accept': 'application/json' }
          })
          if (stResponse.ok) {
            const stData = await stResponse.json()
            const stItems = stData.value || []
            let found = stItems.find(item => String(item.Description || '').trim() === targetStatus)
            if (!found) {
              found = stItems.find(item => String(item.Description || '').trim().startsWith('В работе'))
            }
            if (!found && stItems.length > 0) {
              found = stItems[0]
            }
            if (found) {
              statusKey = found.Ref_Key
              statusDescription = found.Description
            }
          }
        } catch (err) {
          console.warn(`⚠️ Error looking up status: ${err.message}`)
        }

        const docPayload = {
          Date: (() => {
            const d = new Date()
            const pad = (n) => String(n).padStart(2, '0')
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
          })(),
          СтруктурнаяЕдиницаРезерв_Key: order.source_warehouse_key,
          СтруктурнаяЕдиницаПолучатель_Key: order.destination_warehouse_key,
          ...(operationKey ? { ХозяйственнаяОперация_Key: operationKey } : {}),
          ...(statusKey ? { СостояниеЗаказа_Key: statusKey } : {}),
          ...(order.customer_order_key ? { ЗаказПокупателя_Key: order.customer_order_key } : {}),
          Posted: false,
          Запасы: enrichedItems.map((item, idx) => ({
            LineNumber: idx + 1,
            Номенклатура_Key: item.nomenclatureKey || '',
            Количество: Number(item.quantity) || 1,
            ...(item.unitKey
              ? { ЕдиницаИзмерения: item.unitKey, ЕдиницаИзмерения_Type: 'StandardODATA.Catalog_КлассификаторЕдиницИзмерения' }
              : {})
          }))
        }

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
          body: JSON.stringify(docPayload)
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          const result = await response.json()
          const onecRefKey = result['Ref_Key'] || null

          if (onecRefKey) {
            db.prepare('UPDATE transfer_orders SET ref_key = ?, posted = 1, status_key = ?, status_description = ? WHERE ref_key = ?')
              .run(onecRefKey, statusKey || '', statusDescription || 'В работе (к списанию)', localRefKey)
          }

          sendJSON(res, 200, { success: true, refKey: onecRefKey, status: statusDescription || 'В работе (к списанию)' })
        } else {
          const errorText = await response.text()
          sendJSON(res, 502, { success: false, error: `1C Error: ${response.status}: ${errorText.substring(0, 200)}` })
        }
      } catch (err) {
        sendJSON(res, 500, { error: err.message })
      }
    })
    return
  }

  // Update local transfer order items
  const updateMatch = pathname.match(/^\/sklad\/api\/transfer-orders\/(LOCAL-.+)\/items$/)
  if (updateMatch && req.method === 'PUT') {
    const localRefKey = updateMatch[1]
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const data = JSON.parse(body)
        const itemsJson = JSON.stringify(data.items || [])
        db.prepare('UPDATE transfer_orders SET items = ? WHERE ref_key = ?').run(itemsJson, localRefKey)
        sendJSON(res, 200, { success: true })
      } catch (err) {
        sendJSON(res, 500, { error: err.message })
      }
    })
    return
  }

  // -------------------------------------------------------
  // PRODUCTION ORDERS ROUTES
  // -------------------------------------------------------

  // Get production orders from 1C
  if (pathname === '/sklad/api/production-orders' && req.method === 'GET') {
    try {
      const orders = await fetchProductionOrders()
      sendJSON(res, 200, { value: orders })
    } catch (err) {
      console.error('Error fetching production orders:', err)
      sendJSON(res, 500, { error: 'Failed to fetch production orders' })
    }
    return
  }

  // Get materials for a production order
  if (pathname.match(/^\/sklad\/api\/production-orders\/[a-f0-9\-]+\/materials$/) && req.method === 'GET') {
    try {
      const orderRefKey = pathname.split('/')[4]
      const materials = await fetchProductionOrderMaterials(orderRefKey)
      sendJSON(res, 200, { value: materials })
    } catch (err) {
      console.error('Error fetching production order materials:', err)
      sendJSON(res, 500, { error: 'Failed to fetch production order materials' })
    }
    return
  }

  // -------------------------------------------------------
  // SYNC ROUTES
  // -------------------------------------------------------

  // Sync all
  if (pathname === '/sklad/api/sync/1c' && req.method === 'POST') {
    try {
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
      updateLastSyncTime({ lastSyncByType: { ...lastSyncTime.lastSyncByType, orders: new Date().toISOString() } })

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
      updateLastSyncTime({ lastSyncByType: { ...lastSyncTime.lastSyncByType, stocks: new Date().toISOString() } })

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

  // Sync transfer orders
  if (pathname === '/sklad/api/sync/transfer-orders' && req.method === 'POST') {
    try {
      const transferOrders1C = await fetch1CTransferOrders()
      const transferOrderStats = syncTransferOrdersIncremental(transferOrders1C)
      await syncTransferOrderItems()
      await syncTransferOrderStatuses()
      loadCacheFromDB()
      updateLastSyncTime({ lastSyncByType: { ...lastSyncTime.lastSyncByType, transfer_orders: new Date().toISOString() } })

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

  // -------------------------------------------------------
  // NOMENCLATURE ROUTES
  // -------------------------------------------------------

  // Create new nomenclature in 1C
  if (pathname === '/sklad/api/1c/nomenclature' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', async () => {
      try {
        const data = JSON.parse(body)

        const authHeader = getBasicAuthHeader()
        const baseUrl = ONEC_CONFIG.baseUrl.replace(/\/$/, '')
        const url = `${baseUrl}/Catalog_Номенклатура`

        const nomenclatureData = {
          'Description': data.name,
          'НаименованиеПолное': data.name,
          'Артикул': data.sku || '',
          'DeletionMark': false
        }

        if (data.unitId) {
          nomenclatureData['ЕдиницаИзмерения_Key'] = data.unitId
        }
        if (data.categoryId) {
          nomenclatureData['КатегорияНоменклатуры_Key'] = data.categoryId
        }

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
          sendJSON(res, 400, {
            success: false,
            error: `Failed to create in 1C: ${response.status}`
          })
          return
        }

        const result = await response.json()
        const newId = result['Ref_Key'] || result['@odata.id'] || `CREATED-${Date.now()}`

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
      sendJSON(res, 500, { error: 'Request error' })
    })
    return
  }

  // -------------------------------------------------------
  // QR CODES ROUTES
  // -------------------------------------------------------

  // Generate QR codes (new format: /sklad/api/orders/{orderId}/qr-codes/generate)
  if (pathname.match(/^\/sklad\/api\/orders\/[a-f0-9\-]+\/qr-codes\/generate$/) && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const data = JSON.parse(body)
        const orderId = pathname.split('/')[4]
        const { quantity, productId, productName, generatedBy, employeeId, employeeName, labelInfo, labelOrder, isPackage } = data

        if (!orderId || !quantity) {
          sendJSON(res, 400, { error: 'Missing required fields: orderId, quantity' })
          return
        }

        // Verify order exists
        const order = db.prepare('SELECT * FROM onec_orders WHERE ref_key = ?').get(orderId)
        if (!order) {
          sendJSON(res, 404, { error: 'Order not found' })
          return
        }

        const now = moscowNow()
        const result = []

        // Generate QR codes
        const qty = parseInt(quantity, 10) || 1
        for (let i = 0; i < qty; i++) {
          const qrId = `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

          // Generate unique code - check if exists and add suffix if needed
          const safeOrderNum = (order.order_number || orderId)
            .replace(/\//g, '-')
            .replace(/[^A-Za-z0-9\-_]/g, '')
          let code = `QR-${safeOrderNum}-${productId || ''}-${i + 1}`
          let existingCode = db.prepare('SELECT code FROM local_qr_codes WHERE code = ?').get(code)
          let suffix = 1
          while (existingCode) {
            code = `QR-${safeOrderNum}-${productId || ''}-${i + 1}-${suffix}`
            existingCode = db.prepare('SELECT code FROM local_qr_codes WHERE code = ?').get(code)
            suffix++
          }

          db.prepare(`
            INSERT INTO local_qr_codes (id, code, order_id, order_number, product_id, product_name, label_order, label_info, status, generated_at, generated_by, is_package)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'generated', ?, ?, ?)
          `).run(
            qrId,
            code,
            orderId,
            order.order_number || '',
            productId || '',
            productName || '',
            labelOrder || order.order_number || '',
            labelInfo || '',
            now,
            generatedBy || 'System',
            isPackage ? 1 : 0
          )

          result.push({
            id: qrId,
            code,
            label_order: labelOrder || order.order_number || '',
            label_info: labelInfo || '',
            status: 'generated',
            generated_at: now,
            generated_by: generatedBy || 'System'
          })
        }

        // Update order status to 'printing' if current status is 'processing' or 'new'
        if (order.status === 'processing' || order.status === 'new') {
          db.prepare('UPDATE onec_orders SET status = ? WHERE ref_key = ?').run('printing', orderId)
        }

        logOperation('qr_codes_generated', {
          orderId: orderId,
          orderNumber: order.order_number,
          qrCount: result.length,
          generatedBy: generatedBy || 'System'
        })

        sendJSON(res, 200, {
          success: true,
          codes: result,
          count: result.length,
          createdAt: now
        })
      } catch (err) {
        console.error('Error generating QR codes:', err)
        sendJSON(res, 500, { error: err.message })
      }
    })
    return
  }

  // Generate QR codes (old format: /sklad/api/qr-codes/generate)
  if (pathname === '/sklad/api/qr-codes/generate' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const data = JSON.parse(body)
        const { orderId, items, generatedBy } = data

        if (!orderId || !items || !Array.isArray(items)) {
          sendJSON(res, 400, { error: 'Missing required fields' })
          return
        }

        // Verify order exists
        const order = db.prepare('SELECT * FROM onec_orders WHERE ref_key = ?').get(orderId)
        if (!order) {
          sendJSON(res, 404, { error: 'Order not found' })
          return
        }

        const now = moscowNow()
        const result = []

        // Delete old QR codes for this order and product combinations
        for (const item of items) {
          db.prepare('DELETE FROM local_qr_codes WHERE order_id = ? AND product_id = ?')
            .run(orderId, item.productId || '')
        }

        // Generate new QR codes
        for (const item of items) {
          const qty = item.quantity || 1
          for (let i = 0; i < qty; i++) {
            const qrId = `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            const safeOrderNum = (order.order_number || orderId)
            .replace(/\//g, '-')
            .replace(/[^A-Za-z0-9\-_]/g, '')
            const code = `QR-${safeOrderNum}-${item.sku || ''}-${i + 1}`

            db.prepare(`
              INSERT INTO local_qr_codes (id, code, order_id, order_number, product_id, product_name, label_order, label_info, status, generated_at, generated_by)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'generated', ?, ?)
            `).run(
              qrId,
              code,
              orderId,
              order.order_number || '',
              item.productId || '',
              item.productName || '',
              item.labelOrder || order.order_number || '',
              item.labelInfo || '',
              now,
              generatedBy || 'System'
            )

            result.push({ id: qrId, code })
          }
        }

        // Update order status to 'printing' if current status is 'processing'
        if (order.status === 'processing' || order.status === 'new') {
          db.prepare('UPDATE onec_orders SET status = ? WHERE ref_key = ?').run('printing', orderId)
        }

        logOperation('qr_codes_generated', {
          orderId: orderId,
          orderNumber: order.order_number,
          qrCount: result.length,
          generatedBy: generatedBy || 'System'
        })

        sendJSON(res, 200, {
          success: true,
          qrCodes: result,
          count: result.length
        })
      } catch (err) {
        console.error('Error generating QR codes:', err)
        sendJSON(res, 500, { error: err.message })
      }
    })
    return
  }

  // Get QR codes for order (by query param) or by code
  if (pathname === '/sklad/api/qr-codes' && req.method === 'GET') {
    try {
      const orderId = url.searchParams.get('orderId')
      const orderNumber = url.searchParams.get('orderNumber')
      const codeQuery = url.searchParams.get('code')

      if (!orderId && !codeQuery && !orderNumber) {
        sendJSON(res, 400, { error: 'orderId, orderNumber or code is required', _version: 2 })
        return
      }

      let query = 'SELECT * FROM local_qr_codes WHERE 1=1'
      const params = []

      if (orderId) {
        query += ' AND order_id = ?'
        params.push(orderId)
      }
      if (orderNumber) {
        query += ' AND order_number = ?'
        params.push(orderNumber)
      }
      if (codeQuery) {
        query += ' AND code = ?'
        params.push(codeQuery)
        const exact = db.prepare('SELECT code FROM local_qr_codes WHERE code = ?').get(codeQuery)
        console.log('[QR LOOKUP] code:', codeQuery, 'exact:', !!exact)
        if (!exact && codeQuery.startsWith('QR-')) {
          const parts = codeQuery.split('-')
          for (let n = 1; n <= parts.length - 3; n++) {
            const orderNum = parts.slice(1, 1 + n).join('/')
            const rest = parts.slice(1 + n).join('-')
            const altCode = `QR-${orderNum}-${rest}`
            if (altCode === codeQuery) continue
            const alt = db.prepare('SELECT code FROM local_qr_codes WHERE code = ?').get(altCode)
            console.log('[QR LOOKUP] trying n=' + n, altCode, 'found:', !!alt)
            if (alt) {
              params[params.length - 1] = altCode
              break
            }
          }
        }
      }

      const status = url.searchParams.get('status')
      if (status) {
        query += ' AND status = ?'
        params.push(status)
      }

      query += ' ORDER BY generated_at DESC'

      const qrCodes = db.prepare(query).all(...params)
      sendJSON(res, 200, { qrCodes, _lookupCode: params[params.length - 1] || '' })
    } catch (err) {
      console.error('Error fetching QR codes:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Get QR code statistics for an order (aggregated per position)
  if (pathname === '/sklad/api/qr-codes/stats' && req.method === 'GET') {
    try {
      const orderNumber = url.searchParams.get('orderNumber')
      if (!orderNumber) {
        sendJSON(res, 400, { error: 'orderNumber is required' })
        return
      }

      const rows = db.prepare(`
        SELECT product_name, product_id, is_package, status, COUNT(*) as count
        FROM local_qr_codes
        WHERE order_number = ?
        GROUP BY product_name, product_id, is_package, status
      `).all(orderNumber)

      const positionsMap = new Map()
      let totalCodes = 0
      const summaryByStatus = {}

      rows.forEach(row => {
        totalCodes += row.count
        summaryByStatus[row.status] = (summaryByStatus[row.status] || 0) + row.count

        const key = row.product_id
        if (!positionsMap.has(key)) {
          positionsMap.set(key, {
            productName: row.product_name,
            productId: row.product_id,
            totalCodes: 0,
            byStatus: {},
            packageCount: 0,
            detailCount: 0,
            hasPackages: false,
            shippedPackages: 0,
            shippedDetails: 0
          })
        }
        const pos = positionsMap.get(key)
        pos.totalCodes += row.count
        pos.byStatus[row.status] = (pos.byStatus[row.status] || 0) + row.count
        if (row.is_package) {
          pos.packageCount += row.count
          pos.hasPackages = true
          if (row.status === 'shipped') pos.shippedPackages += row.count
        } else {
          pos.detailCount += row.count
          if (row.status === 'shipped') pos.shippedDetails += row.count
        }
      })

      const positions = Array.from(positionsMap.values())

      positions.forEach(pos => {
        pos.shipped = pos.byStatus.shipped || 0
        pos.scanned = pos.byStatus.scanned || 0
        pos.notReceived = pos.totalCodes - pos.shipped - pos.scanned
      })

      sendJSON(res, 200, {
        stats: {
          orderNumber,
          totalCodes,
          totalShipped: summaryByStatus.shipped || 0,
          totalScanned: summaryByStatus.scanned || 0,
          totalNotReceived: totalCodes - (summaryByStatus.shipped || 0) - (summaryByStatus.scanned || 0),
          hasPackages: positions.some(p => p.hasPackages),
          positions
        }
      })
    } catch (err) {
      console.error('Error fetching QR code stats:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Get QR codes for order (by path: /sklad/api/orders/{orderId}/qr-codes)
  if (pathname.match(/^\/sklad\/api\/orders\/[a-f0-9\-]+\/qr-codes$/) && req.method === 'GET') {
    try {
      const orderId = pathname.split('/')[4]

      const qrCodes = db.prepare(`
        SELECT * FROM local_qr_codes WHERE order_id = ? ORDER BY generated_at DESC
      `).all(orderId)

      sendJSON(res, 200, { qrCodes, codes: qrCodes })
    } catch (err) {
      console.error('Error fetching QR codes:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Scan QR code (by code in body)
  if (pathname === '/sklad/api/qr-codes/scan' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const data = JSON.parse(body)
        const { code, employeeId, employeeName, action } = data

        if (!code) {
          sendJSON(res, 400, { error: 'QR code is required' })
          return
        }

        const qrCode = db.prepare(`
          SELECT * FROM local_qr_codes WHERE code = ? OR id = ?
        `).get(code, code)

        if (!qrCode) {
          sendJSON(res, 404, { error: 'QR code not found' })
          return
        }

        const now = moscowNow()

        // Determine new status
        let newStatus = qrCode.status
        if (action === 'reject') {
          newStatus = 'rejected'
        } else if (action === 'rework') {
          newStatus = 'rework'
        } else {
          // Sequential status progression
          if (qrCode.status === 'generated') newStatus = 'scanned'
          else if (qrCode.status === 'scanned') newStatus = 'in_progress'
          else if (qrCode.status === 'in_progress') newStatus = 'ready'
          else if (qrCode.status === 'ready') newStatus = 'shipped'
          else newStatus = qrCode.status
        }

        db.prepare(`
          UPDATE local_qr_codes SET status = ?, scanned_at = ?, scanned_by = ? WHERE id = ?
        `).run(newStatus, now, employeeName || 'Unknown', qrCode.id)

        logOperation('qr_code_scanned', {
          qrCodeId: qrCode.id,
          qrCode: qrCode.code,
          orderId: qrCode.order_id,
          orderNumber: qrCode.order_number,
          productId: qrCode.product_id,
          productName: qrCode.product_name,
          employeeId: employeeId,
          employeeName: employeeName,
          details: { status: newStatus }
        })

        if (newStatus === 'shipped') {
          logOperation('qr_code_shipped', {
            qrCodeId: qrCode.id,
            qrCode: qrCode.code,
            orderId: qrCode.order_id,
            orderNumber: qrCode.order_number,
            productId: qrCode.product_id,
            productName: qrCode.product_name,
            employeeId: employeeId,
            employeeName: employeeName
          })
        }

        sendJSON(res, 200, {
          success: true,
          qrCodeId: qrCode.id,
          code: qrCode.code,
          orderNumber: qrCode.order_number,
          orderId: qrCode.order_id,
          productName: qrCode.product_name,
          productId: qrCode.product_id,
          status: newStatus,
          scannedAt: now,
          scannedBy: employeeName
        })
      } catch (err) {
        console.error('Error scanning QR code:', err)
        sendJSON(res, 500, { error: err.message })
      }
    })
    return
  }

  // Scan QR code (by ID in path: /sklad/api/qr-codes/{qrCodeId}/scan)
  if (pathname.match(/^\/sklad\/api\/qr-codes\/[^\/]+\/scan$/) && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const qrCodeId = pathname.split('/')[4]
        const data = JSON.parse(body)
        const { newStatus, employeeId, employeeName, action } = data

        const qrCode = db.prepare(`
          SELECT * FROM local_qr_codes WHERE id = ?
        `).get(qrCodeId)

        if (!qrCode) {
          sendJSON(res, 404, { error: 'QR code not found' })
          return
        }

        const now = moscowNow()

        // Determine new status
        let statusToSet = newStatus || qrCode.status
        if (action === 'reject') {
          statusToSet = 'rejected'
        } else if (action === 'rework') {
          statusToSet = 'rework'
        } else if (!newStatus) {
          // Sequential status progression
          if (qrCode.status === 'generated') statusToSet = 'scanned'
          else if (qrCode.status === 'scanned') statusToSet = 'in_progress'
          else if (qrCode.status === 'in_progress') statusToSet = 'ready'
          else if (qrCode.status === 'ready') statusToSet = 'shipped'
        }

        db.prepare(`
          UPDATE local_qr_codes SET status = ?, scanned_at = ?, scanned_by = ? WHERE id = ?
        `).run(statusToSet, now, employeeName || 'Unknown', qrCode.id)

        logOperation('qr_code_scanned', {
          qrCodeId: qrCode.id,
          qrCode: qrCode.code,
          orderId: qrCode.order_id,
          orderNumber: qrCode.order_number,
          productId: qrCode.product_id,
          productName: qrCode.product_name,
          employeeId: employeeId,
          employeeName: employeeName,
          details: { status: statusToSet }
        })

        if (statusToSet === 'shipped') {
          logOperation('qr_code_shipped', {
            qrCodeId: qrCode.id,
            qrCode: qrCode.code,
            orderId: qrCode.order_id,
            orderNumber: qrCode.order_number,
            productId: qrCode.product_id,
            productName: qrCode.product_name,
            employeeId: employeeId,
            employeeName: employeeName
          })
        }

        sendJSON(res, 200, {
          success: true,
          qrCodeId: qrCode.id,
          code: qrCode.code,
          orderNumber: qrCode.order_number,
          orderId: qrCode.order_id,
          productName: qrCode.product_name,
          productId: qrCode.product_id,
          status: statusToSet,
          scannedAt: now,
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

      const qrCode = db.prepare(`
        SELECT id, code, order_id, order_number, product_id, product_name
        FROM local_qr_codes WHERE id = ?
      `).get(qrCodeId)

      if (!qrCode) {
        sendJSON(res, 404, { error: 'QR Code not found' })
        return
      }

      db.prepare('DELETE FROM operation_logs WHERE qr_code_id = ?').run(qrCodeId)
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

  // -------------------------------------------------------
  // OPERATION LOGS ROUTES
  // -------------------------------------------------------

  // Get operation logs with filtering
  if (pathname === '/sklad/api/operation-logs' && req.method === 'GET') {
    try {
      const operationType = url.searchParams.get('type')
      const employeeId = url.searchParams.get('employee')
      const orderId = url.searchParams.get('order')
      const limit = parseInt(url.searchParams.get('limit') || '100', 10)
      const offset = parseInt(url.searchParams.get('offset') || '0', 10)

      let query = 'SELECT * FROM operation_logs WHERE 1=1'
      const params = []

      if (operationType) { query += ' AND operation_type = ?'; params.push(operationType) }
      if (employeeId) { query += ' AND employee_id = ?'; params.push(employeeId) }
      if (orderId) { query += ' AND order_id = ?'; params.push(orderId) }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
      params.push(limit, offset)

      const logs = db.prepare(query).all(...params)

      const parsedLogs = logs.map(log => ({
        ...log,
        details: log.details ? JSON.parse(log.details) : null
      }))

      sendJSON(res, 200, { logs: parsedLogs, count: parsedLogs.length, limit, offset })
    } catch (err) {
      console.error('Error fetching operation logs:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Get operation log statistics
  if (pathname === '/sklad/api/operation-logs/stats' && req.method === 'GET') {
    try {
      const stats = db.prepare(`
        SELECT operation_type, COUNT(*) as count, COUNT(DISTINCT employee_id) as unique_employees,
               MIN(created_at) as first_at, MAX(created_at) as last_at
        FROM operation_logs GROUP BY operation_type ORDER BY count DESC
      `).all()

      sendJSON(res, 200, { stats })
    } catch (err) {
      console.error('Error fetching operation logs stats:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // -------------------------------------------------------
  // EMPLOYEES ROUTES
  // -------------------------------------------------------

  // Get all employees
  if (pathname === '/sklad/api/employees' && req.method === 'GET') {
    try {
      const employees = db.prepare('SELECT * FROM employees ORDER BY created_at DESC').all()

      // Для каждого сотрудника загружаем историю материалов
      const employeesWithHistory = employees.map(emp => {
        const history = db.prepare('SELECT * FROM material_invoices WHERE employee_id = ? ORDER BY date DESC').all(emp.id)
        return {
          ...emp,
          materialHistory: history
        }
      })

      sendJSON(res, 200, { employees: employeesWithHistory })
    } catch (err) {
      console.error('Error fetching employees:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Create employee
  if (pathname === '/sklad/api/employees' && req.method === 'POST') {
    const userRole = getUserRoleFromRequest(req)
    if (!userRole || !['admin', 'manager'].includes(userRole)) {
      sendJSON(res, 403, { error: 'Forbidden: insufficient permissions' })
      return
    }
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const data = JSON.parse(body)
        let { id, name, email, phone, photo, avatar, position, department,
              role = 'worker', status = 'active', salary = 0, hireDate,
              birthDate, address, skills, notes, createdBy } = data

        if (!id || !name || !position || !department || !hireDate) {
          sendJSON(res, 400, { error: 'Missing required fields' })
          return
        }

        if (!phone) {
          phone = ''
        }

        if (!email) {
          email = `${name.toLowerCase().replace(/\s+/g, '.')}@warehouse.local`
        }

        const loginParts = email.split('@')
        let baseLogin = loginParts[0] || name.toLowerCase().replace(/\s+/g, '.')
        let login = baseLogin
        let counter = 1

        while (db.prepare('SELECT id FROM users WHERE login = ?').get(login)) {
          login = `${baseLogin}${counter}`
          counter++
        }

        const temporaryPassword = '12345678'
        const passwordHash = hashSync(temporaryPassword, 10)
        const now = moscowNow()

        const userInsert = db.prepare(`
          INSERT INTO users (login, password_hash, full_name, role, is_active, needs_password_change, created_at, updated_at)
          VALUES (?, ?, ?, ?, 1, 1, ?, ?)
        `).run(login, passwordHash, name, role, now, now)

        const userId = userInsert.lastInsertRowid

        db.prepare(`
          INSERT INTO employees (id, user_id, name, email, phone, photo, avatar, position, department,
            role, status, salary, hire_date, birth_date, address, skills, notes, created_at, updated_at, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, userId, name, email, phone, photo || null, avatar || null, position,
          department, role, status, salary, hireDate, birthDate || null,
          address || null, skills ? JSON.stringify(skills) : null, notes || null,
          now, now, createdBy || 'System')

        sendJSON(res, 201, {
          success: true,
          employee: { id, name, email, phone, photo, avatar, position, department, role, status, salary, hireDate, birthDate, address, skills, notes },
          credentials: { login, password: temporaryPassword, note: 'Default temporary password: 12345678 - must change on first login' }
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
    const userRole = getUserRoleFromRequest(req)
    if (!userRole || !['admin', 'manager'].includes(userRole)) {
      sendJSON(res, 403, { error: 'Forbidden: insufficient permissions' })
      return
    }
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const employeeId = pathname.split('/')[4]
        const data = JSON.parse(body)

        const now = moscowNow()
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
            values.push(Array.isArray(value) ? JSON.stringify(value) : value)
          }
        }

        updates.push('updated_at = ?'); values.push(now)
        updates.push('updated_by = ?'); values.push(data.updatedBy || 'System')
        values.push(employeeId)

        db.prepare(`UPDATE employees SET ${updates.join(', ')} WHERE id = ?`).run(...values)

        // Синхронизируем роль в таблицу users, если она изменилась
        if (data.role) {
          const emp = db.prepare('SELECT user_id FROM employees WHERE id = ?').get(employeeId)
          if (emp && emp.user_id) {
            const uid = parseFloat(String(emp.user_id))
            db.prepare('UPDATE users SET role = ? WHERE id = ?').run(data.role, uid)
          }
        }

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
    const userRole = getUserRoleFromRequest(req)
    if (!userRole || !['admin', 'manager'].includes(userRole)) {
      sendJSON(res, 403, { error: 'Forbidden: insufficient permissions' })
      return
    }
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

  // Employee credentials - GET
  const employeeCredentialsMatch = pathname.match(/^\/sklad\/api\/employees\/([^/]+)\/credentials$/)
  if (employeeCredentialsMatch) {
    const employeeId = decodeURIComponent(employeeCredentialsMatch[1])

    if (req.method === 'GET') {
      try {
        const employee = db.prepare(`
          SELECT e.id, e.name, e.email, u.login
          FROM employees e LEFT JOIN users u ON u.id = e.user_id WHERE e.id = ?
        `).get(employeeId)

        if (!employee) {
          sendJSON(res, 404, { error: 'Employee not found' })
          return
        }

        sendJSON(res, 200, {
          success: true,
          credentials: { login: employee.login || '', name: employee.name, email: employee.email || '' }
        })
      } catch (err) {
        console.error('Error loading employee credentials:', err)
        sendJSON(res, 500, { error: err.message })
      }
      return
    }

    if (req.method === 'PUT') {
      const userRole = getUserRoleFromRequest(req)
      console.log(`🔑 [CREDENTIALS] User role: ${userRole}, allowed: admin/manager`)
    if (!userRole || !['admin', 'manager'].includes(userRole)) {
      sendJSON(res, 403, { error: 'Forbidden: insufficient permissions' })
      return
    }
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

          const now = moscowNow()
          const passwordHash = hashSync(password, 10)

          db.prepare(`
            UPDATE users SET login = ?, password_hash = ?, needs_password_change = 1, updated_at = ? WHERE id = ?
          `).run(login, passwordHash, now, employee.user_id)

          sendJSON(res, 200, { success: true, credentials: { login, name: employee.name } })
        } catch (err) {
          console.error('Error changing employee credentials:', err)
          sendJSON(res, 500, { error: err.message })
        }
      })
      return
    }
  }

  // Employee operations
  if (pathname.match(/^\/sklad\/api\/employees\/[^\/]+\/operations$/) && req.method === 'GET') {
    try {
      const employeeId = pathname.split('/')[4]
      const limit = parseInt(url.searchParams.get('limit') || '5', 10)

      const employee = db.prepare(`
        SELECT id, user_id, name FROM employees WHERE id = ? OR user_id = ? OR CAST(user_id AS TEXT) = ? LIMIT 1
      `).get(employeeId, employeeId, String(employeeId))

      if (!employee) {
        sendJSON(res, 200, { employeeId, logs: [], count: 0, limit })
        return
      }

      const empId = String(employee.id)
      const targetId = String(employee.user_id || '')
      let searchIds = [empId]
      if (targetId && targetId !== empId) {
        searchIds.push(targetId)
      }
      const placeholders = searchIds.map(() => '?').join(', ')

      const operationLogs = db.prepare(`
        SELECT id, operation_type, created_at, employee_id, employee_name,
               order_number, product_name, qr_code, details, status
        FROM operation_logs
        WHERE employee_id IN (${placeholders}) OR CAST(employee_id AS TEXT) IN (${placeholders})
        ORDER BY created_at DESC
        LIMIT ?
      `).all(...searchIds, ...searchIds, limit)

      const toolOps = db.prepare(`
        SELECT id, ('tool_' || COALESCE(action, 'unknown')) as operation_type, created_at as created_at,
               employee_id, performed_by as employee_name,
               tool_name as product_name, inventory_number as qr_code,
               NULL as details, 'success' as status
        FROM tool_operations
        WHERE employee_id IN (${placeholders}) OR CAST(employee_id AS TEXT) IN (${placeholders})
        ORDER BY created_at DESC
        LIMIT ?
      `).all(...searchIds, ...searchIds, limit)

      const invoices = db.prepare(`
        SELECT id, ('invoice_' || COALESCE(destination, 'unknown')) as operation_type, created_at,
               employee_id, created_by as employee_name,
               order_number, NULL as product_name,
               NULL as qr_code, NULL as details, 'success' as status
        FROM material_invoices
        WHERE employee_id IN (${placeholders}) OR CAST(employee_id AS TEXT) IN (${placeholders})
        ORDER BY created_at DESC
        LIMIT ?
      `).all(...searchIds, ...searchIds, limit)

      // Resolve login for transfer_orders search (created_by stores login, not user_id)
      const userForLogin = db.prepare('SELECT login FROM users WHERE id = ?').get(employee.user_id)
      const loginForSearch = userForLogin ? userForLogin.login : ''

      const transferOrders = db.prepare(`
        SELECT ref_key as id, 'transfer_order' as operation_type,
               COALESCE(synced_at, date, '') as created_at,
               created_by as employee_id, created_by as employee_name,
               order_number, NULL as product_name,
               NULL as qr_code, '' as details, 'success' as status
        FROM transfer_orders
        WHERE created_by = ? OR created_by IN (${placeholders}) OR CAST(created_by AS TEXT) IN (${placeholders})
        ORDER BY created_at DESC
        LIMIT ?
      `).all(loginForSearch, ...searchIds, ...searchIds, limit * 2)

      const mixed = [...operationLogs, ...toolOps, ...invoices, ...transferOrders]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit)

      sendJSON(res, 200, { employeeId, logs: mixed, count: mixed.length, limit })
    } catch (err) {
      console.error('Error fetching employee operations:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Employee material invoices
  if (pathname.match(/^\/sklad\/api\/employees\/[^\/]+\/material-invoices$/) && req.method === 'GET') {
    try {
      const employeeId = pathname.split('/')[4]
      // Resolve user_id since material_invoices stores numeric user_id, not employee UUID
      const emp = db.prepare(`
        SELECT id, user_id FROM employees WHERE id = ? OR user_id = ? OR CAST(user_id AS TEXT) = ? LIMIT 1
      `).get(employeeId, employeeId, String(employeeId))
      const resolvedId = emp ? (emp.user_id || emp.id) : employeeId

      const invoices = db.prepare(`
        SELECT * FROM material_invoices WHERE employee_id = ? ORDER BY date DESC
      `).all(resolvedId)

      sendJSON(res, 200, { success: true, invoices: mapMaterialInvoiceRows(invoices) })
    } catch (err) {
      console.error('Error getting employee material invoices:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Employee tool operations - GET
  if (pathname.match(/^\/sklad\/api\/employees\/[^\/]+\/tool-operations$/) && req.method === 'GET') {
    try {
      const employeeId = pathname.split('/')[4]
      const operations = db.prepare(`
        SELECT * FROM tool_operations
        WHERE employee_id = ?
        ORDER BY date DESC
      `).all(employeeId)

      sendJSON(res, 200, {
        success: true,
        operations: operations.map(op => ({
          id: op.id,
          tool_id: op.tool_id,
          tool_name: op.tool_name,
          inventory_number: op.inventory_number,
          employee_id: op.employee_id,
          action: op.action,
          date: op.date,
          performed_by: op.performed_by,
          created_at: op.created_at
        }))
      })
    } catch (err) {
      console.error('Error getting employee tool operations:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Employee tool operations - POST (log operation)
  if (pathname.match(/^\/sklad\/api\/employees\/[^\/]+\/tool-operations$/) && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const employeeId = pathname.split('/')[4]
        const data = JSON.parse(body)
        const { tool_id, tool_name, inventory_number, action, performed_by } = data

        if (!tool_id || !tool_name || !inventory_number || !action) {
          sendJSON(res, 400, { error: 'Missing required fields: tool_id, tool_name, inventory_number, action' })
          return
        }

        const operationId = Math.random().toString(36).substr(2, 9)
        const now = moscowNow()
        const date = data.date || now

        db.prepare(`
          INSERT INTO tool_operations (id, tool_id, tool_name, inventory_number, employee_id, action, date, performed_by, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(operationId, tool_id, tool_name, inventory_number, employeeId, action, date, performed_by || 'System', now)

        logOperation('tool_operation', {
          tool_id,
          tool_name,
          action,
          employee_id: employeeId,
          performed_by: performed_by || 'System'
        })

        sendJSON(res, 201, {
          success: true,
          operation: {
            id: operationId,
            tool_id,
            tool_name,
            inventory_number,
            employee_id: employeeId,
            action,
            date,
            performed_by: performed_by || 'System',
            created_at: now
          }
        })
      } catch (err) {
        console.error('Error logging tool operation:', err)
        sendJSON(res, 500, { error: err.message })
      }
    })
    return
  }

  // -------------------------------------------------------
  // TOOLS ROUTES
  // -------------------------------------------------------

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
        const { id, name, inventoryNumber, serialNumber, type = 'hand_tool', model, manufacturer,
                status = 'in_stock', location, price = 0, qrCode, issuedTo, issuedToName, issuedAt,
                breakdownDescription, createdBy } = data

        if (!id || !name || !type) {
          sendJSON(res, 400, { error: 'Missing required fields' })
          return
        }

        // Если инвентарный номер не указан, используем ID инструмента
        const invNumber = inventoryNumber || id

        const now = moscowNow()
        db.prepare(`
          INSERT INTO tools (id, name, inventory_number, serial_number, type, model, manufacturer,
            status, location, price, qr_code, issued_to, issued_to_name, issued_at,
            breakdown_description, created_at, updated_at, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, name, invNumber, serialNumber, type, model, manufacturer,
          status, location, price, qrCode, issuedTo, issuedToName, issuedAt,
          breakdownDescription, now, now, createdBy || 'System')

        if (status === 'issued' && issuedTo) {
          const opId = Math.random().toString(36).substr(2, 9)
          db.prepare(`
            INSERT INTO tool_operations (id, tool_id, tool_name, inventory_number, employee_id, action, date, performed_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(opId, id, name, invNumber, issuedTo, 'issued', now, issuedToName || 'System', now)
        }

        logOperation('tool_created', { tool_id: id, tool_name: name, tool_type: type, created_by: createdBy || 'System' })

        sendJSON(res, 201, { success: true, tool: { id, name, inventoryNumber: invNumber, serialNumber, type, model, manufacturer,
          status, location, price, qrCode, issuedTo, issuedToName, issuedAt, breakdownDescription, createdAt: now, updatedAt: now, createdBy: createdBy || 'System' } })
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

        const now = moscowNow()
        const setClause = []
        const values = []

        if (data.name !== undefined) { setClause.push('name = ?'); values.push(data.name) }
        if (data.inventoryNumber !== undefined) { setClause.push('inventory_number = ?'); values.push(data.inventoryNumber) }
        if (data.serialNumber !== undefined) { setClause.push('serial_number = ?'); values.push(data.serialNumber) }
        if (data.type !== undefined) { setClause.push('type = ?'); values.push(data.type) }
        if (data.model !== undefined) { setClause.push('model = ?'); values.push(data.model) }
        if (data.manufacturer !== undefined) { setClause.push('manufacturer = ?'); values.push(data.manufacturer) }
        if (data.status !== undefined) {
          setClause.push('status = ?'); values.push(data.status)
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

        setClause.push('updated_at = ?'); values.push(now)
        values.push(toolId)

        const oldTool = db.prepare('SELECT * FROM tools WHERE id = ?').get(toolId)

        db.prepare(`UPDATE tools SET ${setClause.join(', ')} WHERE id = ?`).run(...values)
        logOperation('tool_updated', { tool_id: toolId, changes: data })

        if (oldTool) {
          let toolAction = null
          let employeeId = null
          const wasIssued = oldTool.issued_to
          const nowIssued = data.issuedTo !== undefined ? data.issuedTo : oldTool.issued_to

          if (wasIssued && !nowIssued) {
            toolAction = 'returned'
            employeeId = wasIssued
          } else if (!wasIssued && nowIssued) {
            toolAction = 'issued'
            employeeId = nowIssued
          } else if (wasIssued && nowIssued && wasIssued !== nowIssued) {
            // Сначала возврат от предыдущего сотрудника
            const opId1 = Math.random().toString(36).substr(2, 9)
            const toolName = data.name || oldTool.name
            const invNumber = data.inventoryNumber || oldTool.inventory_number
            db.prepare(`
              INSERT INTO tool_operations (id, tool_id, tool_name, inventory_number, employee_id, action, date, performed_by, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(opId1, toolId, toolName, invNumber, wasIssued, 'returned', now, 'System', now)
            // Затем выдача новому сотруднику
            const opId2 = Math.random().toString(36).substr(2, 9)
            db.prepare(`
              INSERT INTO tool_operations (id, tool_id, tool_name, inventory_number, employee_id, action, date, performed_by, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(opId2, toolId, toolName, invNumber, nowIssued, 'issued', now, data.issuedToName || 'System', now)
            toolAction = null // уже записали
          }

          if (toolAction && employeeId) {
            const opId = Math.random().toString(36).substr(2, 9)
            const toolName = data.name || oldTool.name
            const invNumber = data.inventoryNumber || oldTool.inventory_number
            db.prepare(`
              INSERT INTO tool_operations (id, tool_id, tool_name, inventory_number, employee_id, action, date, performed_by, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(opId, toolId, toolName, invNumber, employeeId, toolAction, now, data.issuedToName || 'System', now)
          }
        }

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
      logOperation('tool_deleted', { tool_id: toolId })
      sendJSON(res, 200, { success: true })
    } catch (err) {
      console.error('Error deleting tool:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Tool breakdowns - GET
  if (pathname.match(/^\/sklad\/api\/tools\/[^\/]+\/breakdowns$/) && req.method === 'GET') {
    try {
      const toolId = pathname.split('/')[4]
      const breakdowns = db.prepare('SELECT * FROM tool_breakdowns WHERE tool_id = ? ORDER BY reported_at DESC').all(toolId)
      sendJSON(res, 200, {
        success: true,
        breakdowns: breakdowns.map(b => ({
          id: b.id, toolId: b.tool_id, status: b.status, description: b.description,
          reportedBy: b.reported_by, reportedAt: b.reported_at, repairStatus: b.repair_status,
          repairNotes: b.repair_notes, completedAt: b.completed_at, createdAt: b.created_at
        }))
      })
    } catch (err) {
      console.error('Error getting tool breakdowns:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Tool breakdowns - POST (report breakdown)
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
        const now = moscowNow()

        db.prepare(`
          INSERT INTO tool_breakdowns (id, tool_id, status, description, reported_by, reported_at, created_at)
          VALUES (?, ?, 'reported', ?, ?, ?, ?)
        `).run(breakdownId, toolId, description, reportedBy || 'System', now, now)

        db.prepare(`UPDATE tools SET status = 'repair', issued_to = NULL, issued_to_name = NULL, issued_at = NULL WHERE id = ?`).run(toolId)

        logOperation('tool_breakdown_reported', { tool_id: toolId, breakdown_id: breakdownId, description, reported_by: reportedBy || 'System' })

        sendJSON(res, 201, {
          success: true,
          breakdown: { id: breakdownId, toolId, status: 'reported', description, reportedBy: reportedBy || 'System', reportedAt: now, createdAt: now }
        })
      } catch (err) {
        console.error('Error reporting tool breakdown:', err)
        sendJSON(res, 500, { error: err.message })
      }
    })
    return
  }

  // Get tool operations for the movement page
  if (pathname === '/sklad/api/tool-operations' && req.method === 'GET') {
    try {
      const toolOps = db.prepare(`
        SELECT to2.id, to2.tool_id, to2.tool_name, to2.inventory_number, to2.employee_id,
               to2.action, to2.date, to2.created_at, e.name as employee_name,
               COALESCE(t.price, 0) as price
        FROM tool_operations to2
        LEFT JOIN employees e ON to2.employee_id = e.id
        LEFT JOIN tools t ON to2.tool_id = t.id
        ORDER BY to2.date DESC
      `).all()

      const materialIssues = db.prepare(`
        SELECT mc.id, mc.material_ref_key as tool_id, mc.material_name as tool_name, mc.sku as inventory_number,
               mc.employee_id, 'issued' as action, mc.date, mc.created_at, mc.employee_name,
               COALESCE(os.purchasePrice, 0) as price
        FROM material_checkouts mc
        LEFT JOIN onec_stocks os ON mc.material_ref_key = os.ref_key
        ORDER BY mc.date DESC
      `).all()

      const materialReturns = db.prepare(`
        SELECT ol.id, COALESCE(ol.product_id, '') as tool_id, COALESCE(ol.product_name, '') as tool_name,
               COALESCE(ol.order_number, '') as inventory_number, ol.employee_id,
               'returned' as action, ol.created_at as date, ol.created_at,
               COALESCE(ol.employee_name, '') as employee_name, 0 as price
        FROM operation_logs ol
        WHERE ol.operation_type = 'material_returned'
        ORDER BY ol.created_at DESC
      `).all()

      const creationOps = db.prepare(`
        SELECT ol.id, COALESCE(ol.product_id, '') as tool_id, COALESCE(ol.product_name, '') as tool_name,
               COALESCE(ol.order_number, '') as inventory_number, ol.employee_id,
               'created' as action, ol.created_at as date, ol.created_at,
               COALESCE(ol.employee_name, '') as employee_name, 0 as price
        FROM operation_logs ol
        WHERE ol.operation_type IN ('tool_created', 'material_created', 'qr_codes_generated')
        ORDER BY ol.created_at DESC
      `).all()

      const operations = [...toolOps, ...materialIssues, ...materialReturns, ...creationOps]
        .sort((a, b) => new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime())

      sendJSON(res, 200, { success: true, operations })
    } catch (err) {
      console.error('Error getting operations:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // -------------------------------------------------------
  // MATERIAL INVOICES ROUTES
  // -------------------------------------------------------

  // Get all material invoices
  if (pathname === '/sklad/api/material-invoices' && req.method === 'GET') {
    try {
      const invoices = db.prepare('SELECT * FROM material_invoices ORDER BY date DESC').all()
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
        const { employeeId, date, orderNumber, destination, totalAmount = 0, items = [], createdBy } = data

        if (!employeeId || !date || !orderNumber) {
          sendJSON(res, 400, { error: 'Missing required fields' })
          return
        }

        const invoiceId = Math.random().toString(36).substr(2, 9)
        const now = moscowNow()

        db.prepare(`
          INSERT INTO material_invoices (id, employee_id, date, order_number, destination, total_amount, created_at, updated_at, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(invoiceId, employeeId, date, orderNumber, destination || null, totalAmount, now, now, createdBy || 'System')

        items.forEach(item => {
          const itemId = Math.random().toString(36).substr(2, 9)
          db.prepare(`
            INSERT INTO material_invoice_items (id, invoice_id, product_name, quantity, unit, article, price, scanned_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(itemId, invoiceId, item.productName, item.quantity, item.unit, item.article || null, item.price || 0, item.scannedAt || now)
        })

        logOperation('invoice_created', { invoice_id: invoiceId, employee_id: employeeId, order_number: orderNumber, items_count: items.length, created_by: createdBy || 'System' })

        sendJSON(res, 201, {
          success: true,
          invoice: { id: invoiceId, employeeId, date, orderNumber, destination, totalAmount, items, createdAt: now, updatedAt: now, createdBy: createdBy || 'System' }
        })
      } catch (err) {
        console.error('Error creating material invoice:', err)
        sendJSON(res, 500, { error: err.message })
      }
    })
    return
  }

  // -------------------------------------------------------
  // SHIPMENTS HISTORY
  // -------------------------------------------------------

  if (pathname === '/sklad/api/shipments/history' && req.method === 'GET') {
    try {
      const shipments = db.prepare(`
        SELECT id, employee_name, created_at, order_number, product_name, details
        FROM operation_logs WHERE operation_type = 'qr_code_shipped'
        ORDER BY created_at DESC
      `).all()

      const groupedShipments = new Map()

      shipments.forEach(shipment => {
        const timestamp = new Date(shipment.created_at)
        timestamp.setSeconds(0, 0)
        const key = `${timestamp.toISOString()}-${shipment.employee_name}`

        if (!groupedShipments.has(key)) {
          groupedShipments.set(key, { id: key, date: shipment.created_at, userName: shipment.employee_name, orders: new Set(), count: 0 })
        }

        const group = groupedShipments.get(key)
        group.count++
        if (shipment.order_number) {
          group.orders.add(shipment.order_number)
        }
      })

      const result = Array.from(groupedShipments.values())
        .map(item => ({ id: item.id, date: item.date, userName: item.userName, count: item.count, orders: Array.from(item.orders) }))
        .slice(0, 100)

      sendJSON(res, 200, { shipments: result, total: shipments.length })
    } catch (err) {
      console.error('Error fetching shipment history:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // -------------------------------------------------------
  // REPORTS ROUTES
  // -------------------------------------------------------

  // Orders summary report
  if (pathname === '/sklad/api/reports/orders-summary' && req.method === 'GET') {
    try {
      const reportMap = {}

      const invoices = db.prepare(`
        SELECT mi.*, e.name as employee_name,
          GROUP_CONCAT(json_object('id', mii.id, 'productName', mii.product_name, 'quantity', mii.quantity, 'unit', mii.unit, 'article', mii.article, 'price', mii.price), ',') as items_json
        FROM material_invoices mi
        LEFT JOIN employees e ON mi.employee_id = e.id
        LEFT JOIN material_invoice_items mii ON mi.id = mii.invoice_id
        WHERE mi.order_number IS NOT NULL AND mi.order_number NOT IN ('ПРИХОД', 'ПРИХОД (СКЛАД)', 'НОВАЯ КАРТОЧКА', 'ИЗМЕНЕНИЕ ЦЕНЫ')
        GROUP BY mi.id ORDER BY mi.date DESC
      `).all()

      invoices.forEach(inv => {
        let items = []
        if (inv.items_json) {
          try {
            const objectMatches = inv.items_json.match(/{[^{}]*}/g) || []
            items = objectMatches.map(itemStr => {
              try { const parsed = JSON.parse(itemStr); return parsed.id ? parsed : null } catch (e) { return null }
            }).filter(item => item !== null)
          } catch (e) { items = [] }
        }

        if (!reportMap[inv.order_number]) {
          reportMap[inv.order_number] = { orderNumber: inv.order_number, items: [], employees: new Set(), source: 'material_invoice' }
        }

        if (inv.employee_name) {
          reportMap[inv.order_number].employees.add(inv.employee_name)
        }

        items.forEach(item => {
          const existing = reportMap[inv.order_number].items.find(i => i.article === item.article)
          if (existing) { existing.quantity += item.quantity } else { reportMap[inv.order_number].items.push(item) }
        })
      })

      const onecOrders = db.prepare(`
        SELECT id, order_number, date, customer, status, amount, items
        FROM onec_orders ORDER BY date DESC
      `).all()

      onecOrders.forEach(order => {
        if (reportMap[order.order_number]) return

        let orderItems = []
        if (order.items) {
          try {
            const parsed = JSON.parse(order.items)
            if (Array.isArray(parsed)) {
              orderItems = parsed.map(item => ({
                id: item.id, productName: item.productName || item.itemName || '',
                quantity: item.quantity || 0, unit: item.unit || 'шт',
                article: item.productId || '', price: item.unitPrice || 0
              }))
            }
          } catch (e) { /* skip */ }
        }

        reportMap[order.order_number] = {
          orderNumber: order.order_number, items: orderItems,
          employees: new Set(order.customer ? [order.customer] : []),
          source: 'onec_order', date: order.date, status: order.status
        }
      })

      // Build reserve lookup: total + per-order from onec_stocks
      const stockRows = db.prepare('SELECT ref_key, name, reserved, reservesByOrder FROM onec_stocks').all()
      const reserveByName = new Map()
      const orderReserveByName = new Map() // Map<orderGuid, Map<name, quantity>>
      for (const s of stockRows) {
        const name = (s.name || '').toLowerCase().trim()
        if (name) {
          const total = Number(s.reserved || 0)
          if (!reserveByName.has(name) || total > reserveByName.get(name)) {
            reserveByName.set(name, total)
          }
        }
        // Per-order reserves
        let byOrder = {}
        try { byOrder = JSON.parse(s.reservesByOrder || '{}') } catch {}
        for (const [orderGuid, qty] of Object.entries(byOrder)) {
          if (!orderReserveByName.has(orderGuid)) {
            orderReserveByName.set(orderGuid, new Map())
          }
          const orderMap = orderReserveByName.get(orderGuid)
          const existing = orderMap.get(name) || 0
          orderMap.set(name, existing + Number(qty || 0))
        }
      }

      // Map order number -> onec_orders ref_key (GUID)
      const orderNumberToGuid = new Map()
      const guids = db.prepare('SELECT ref_key, order_number FROM onec_orders WHERE ref_key IS NOT NULL').all()
      for (const g of guids) {
        if (g.order_number) orderNumberToGuid.set(g.order_number, g.ref_key)
      }

      const result = Object.values(reportMap).map(entry => {
        const orderGuid = orderNumberToGuid.get(entry.orderNumber) || ''
        const orderReserves = orderReserveByName.get(orderGuid) || new Map()

        const items = entry.items.map(item => {
          const name = (item.productName || '').toLowerCase().trim()
          const reserve = orderReserves.get(name) || 0
          return { ...item, reserve }
        })
        return {
          ...entry, items,
          employees: Array.from(entry.employees),
          totalAmount: items.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0)
        }
      })

      sendJSON(res, 200, { success: true, reports: result })
    } catch (err) {
      console.error('Error getting orders report:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Movement history report
  if (pathname === '/sklad/api/reports/movement-history' && req.method === 'GET') {
    try {
      const invoices = db.prepare(`
        SELECT mi.*, e.name as employee_name
        FROM material_invoices mi LEFT JOIN employees e ON mi.employee_id = e.id
        ORDER BY mi.date DESC
      `).all()

      const result = invoices.map(inv => {
        const items = db.prepare(`
          SELECT product_name, quantity, unit, article, price
          FROM material_invoice_items WHERE invoice_id = ?
          ORDER BY scanned_at ASC, id ASC
        `).all(inv.id).map(item => ({
          productName: item.product_name, quantity: item.quantity, unit: item.unit,
          article: item.article, price: item.price
        }))

        const isIncoming = ['ПРИХОД', 'ПРИХОД (СКЛАД)', 'НОВАЯ КАРТОЧКА', 'ИЗМЕНЕНИЕ ЦЕНЫ'].includes(inv.order_number)

        return {
          id: inv.id, date: inv.date,
          type: isIncoming ? 'Приход ТМЦ' : (inv.destination === 'Брак' ? 'Списание брака' : 'Выдача ТМЦ'),
          tagType: isIncoming ? 'success' : (inv.destination === 'Брак' ? 'warning' : 'info'),
          employeeName: inv.employee_name || 'System', orderNumber: inv.order_number,
          itemCount: items.reduce((sum, i) => sum + i.quantity, 0), totalAmount: inv.total_amount
        }
      })

      sendJSON(res, 200, { success: true, movements: result })
    } catch (err) {
      console.error('Error getting movement history:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Operation logs by employee name (login)
  if (pathname === '/sklad/api/operation-logs/by-name' && req.method === 'GET') {
    try {
      const employeeName = url.searchParams.get('name') || ''
      const limit = parseInt(url.searchParams.get('limit') || '50', 10)

      if (!employeeName) {
        sendJSON(res, 200, { logs: [] })
        return
      }

      const logs = db.prepare(`
        SELECT id, operation_type, created_at, employee_id, employee_name,
               order_number, product_name, qr_code, details, status
        FROM operation_logs
        WHERE employee_name = ?
        ORDER BY created_at DESC
        LIMIT ?
      `).all(employeeName, limit)

      sendJSON(res, 200, { logs })
    } catch (err) {
      console.error('Error fetching operation logs by name:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Write-off report (списание на изделия)
  if (pathname === '/sklad/api/reports/write-off' && req.method === 'GET') {
    try {
      const reportMap = {}

      const orders = db.prepare(`
        SELECT id, order_number, items FROM onec_orders WHERE items IS NOT NULL ORDER BY date DESC
      `).all()

      orders.forEach(order => {
        try {
          const items = JSON.parse(order.items)
          if (!Array.isArray(items)) return

          items.forEach(item => {
            let materials = []
            if (item.materialUsed) {
              try { const parsed = JSON.parse(item.materialUsed); if (Array.isArray(parsed)) materials = parsed } catch (e) { /* skip */ }
            }

            const productName = item.productName || item.itemName || 'Unknown'
            if (!reportMap[productName]) {
              reportMap[productName] = { productName, items: [], employees: new Set() }
            }

            materials.forEach(mat => {
              const existing = reportMap[productName].items.find(i => i.article === (mat.article || mat.sku || ''))
              if (existing) { existing.quantity += (mat.quantity || 0) } else {
                reportMap[productName].items.push({
                  id: mat.id || '', productName: mat.name || mat.productName || '',
                  quantity: mat.quantity || 0, unit: mat.unit || 'шт',
                  article: mat.article || mat.sku || '', price: mat.price || 0
                })
              }
            })
          })
        } catch (e) { /* skip */ }
      })

      const result = Object.values(reportMap).map(entry => ({
        ...entry, employees: Array.from(entry.employees),
        totalAmount: entry.items.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0)
      }))

      sendJSON(res, 200, { success: true, writeoffs: result })
    } catch (err) {
      console.error('Error getting write-off report:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Top employees report
  if (pathname === '/sklad/api/reports/top-employees' && req.method === 'GET') {
    try {
      const employees = db.prepare(`
        SELECT e.*,
          (COUNT(DISTINCT mi.id) + COUNT(DISTINCT ol.id)) as operations_count
        FROM employees e
        LEFT JOIN material_invoices mi ON e.id = mi.employee_id
        LEFT JOIN users u ON e.user_id = u.id
        LEFT JOIN operation_logs ol ON LOWER(u.login) = LOWER(ol.employee_name) OR LOWER(u.full_name) = LOWER(ol.employee_name)
        GROUP BY e.id ORDER BY operations_count DESC LIMIT 5
      `).all()

      sendJSON(res, 200, {
        success: true,
        employees: employees.map(emp => ({ id: emp.id, name: emp.name, position: emp.position, avatar: emp.avatar, operations: emp.operations_count || 0 }))
      })
    } catch (err) {
      console.error('Error getting top employees:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // Critical items report
  if (pathname === '/sklad/api/reports/critical-items' && req.method === 'GET') {
    sendJSON(res, 200, { success: true, items: [] })
    return
  }

  // Production materials by order report
  if (pathname === '/sklad/api/reports/production-materials' && req.method === 'GET') {
    try {
      const dateFrom = url.searchParams.get('dateFrom')
      const dateTo = url.searchParams.get('dateTo')
      const search = (url.searchParams.get('search') || '').trim()

      let sql = `SELECT * FROM transfer_orders
        WHERE customer_order_key IS NOT NULL AND customer_order_key != '' AND customer_order_key != '00000000-0000-0000-0000-000000000000'`
      const params = []

      if (dateFrom) {
        sql += ` AND date >= ?`
        params.push(dateFrom)
      }
      if (dateTo) {
        sql += ` AND date <= ?`
        params.push(dateTo + 'T23:59:59.999Z')
      }
      if (search) {
        sql += ` AND (customer_order_number LIKE ? OR selected_product LIKE ?)`
        params.push(`%${search}%`, `%${search}%`)
      }
      sql += ` ORDER BY date DESC`

      let allOrders = db.prepare(sql).all(...params)

      // Если данных нет локально — пробуем забрать из 1С (новая БД без синка)
      if (allOrders.length === 0) {
        const totalCount = db.prepare('SELECT COUNT(*) as cnt FROM transfer_orders').get()
        if (totalCount.cnt === 0) {
          try {
            const transferOrders1C = await fetch1CTransferOrders()
            if (transferOrders1C && transferOrders1C.length > 0) {
              syncTransferOrdersIncremental(transferOrders1C)
              await syncTransferOrderItems()
              allOrders = db.prepare(sql).all(...params)
            }
          } catch (e) {
            console.error('Failed to fetch transfer orders from 1C:', e)
          }
        }
      }

      const orderMap = new Map()

      for (const order of allOrders) {
        const isRealGuid = order.customer_order_key && order.customer_order_key !== '00000000-0000-0000-0000-000000000000'
        const groupKey = isRealGuid ? order.customer_order_key : (order.customer_order_number || order.order_number)
        if (!groupKey) continue
        if (!orderMap.has(groupKey)) {
          orderMap.set(groupKey, {
            orderNumber: order.customer_order_number || order.order_number,
            date: order.date,
            customerOrderKey: isRealGuid ? order.customer_order_key : null,
            orderMaterials: [],
            products: []
          })
        }
        const entry = orderMap.get(groupKey)
        if (!entry.customerOrderKey && isRealGuid) {
          entry.customerOrderKey = order.customer_order_key
        }
        const displayNum = (order.customer_order_number || order.order_number || '').trim()
        if (displayNum && displayNum.length > (entry.orderNumber || '').trim().length) {
          entry.orderNumber = displayNum
        }

        let items = []
        try { items = JSON.parse(order.items || '[]') } catch { /* ignore */ }

        const mappedMaterials = items.map((item) => ({
          name: item.nomenclatureName || item.productName || item.Номенклатура____Presentation || item.Номенклатура_Presentation || 'Без названия',
          barcode: item.barcode || '',
          quantity: item.quantity || item.Количество || 1
        }))

        const productName = order.selected_product
        if (productName && productName !== '') {
          entry.products.push({
            name: productName,
            materials: mappedMaterials,
            totalSum: 0
          })
        } else {
          entry.orderMaterials.push(...mappedMaterials)
        }
      }

      // Build material price map from onec_stocks
      const allStocks = db.prepare('SELECT DISTINCT name, purchasePrice, averagePrice FROM onec_stocks').all()
      const priceMap = new Map()
      for (const s of allStocks) {
        const price = Number(s.purchasePrice || s.averagePrice || 0)
        if (price > 0 && s.name) {
          priceMap.set(s.name.toLowerCase(), price)
        }
      }

      for (const entry of orderMap.values()) {
        const pad = (n) => String(n).padStart(2, '0')
        const d = new Date(entry.date)
        entry.dateFormatted = !isNaN(d.getTime())
          ? `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`
          : entry.date

        const enrichMaterials = (materials) => {
          let total = 0
          for (const m of materials) {
            m.price = priceMap.get(m.name.toLowerCase()) || 0
            m.sum = m.price * m.quantity
            total += m.sum
          }
          return total
        }

        entry.orderTotal = enrichMaterials(entry.orderMaterials)
        for (const product of entry.products) {
          product.totalSum = enrichMaterials(product.materials)
          entry.orderTotal += product.totalSum
        }
      }

      const result = Array.from(orderMap.values())

      sendJSON(res, 200, { success: true, data: result })
    } catch (err) {
      console.error('Error fetching production materials report:', err)
      sendJSON(res, 500, { error: err.message })
    }
    return
  }

  // -------------------------------------------------------
  // INVENTORY ROUTES
  // -------------------------------------------------------

  // Receive finished product
  if (pathname === '/sklad/api/inventory/receive-finished-product' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => {
      try {
        const data = JSON.parse(body)
        console.log('📦 [RECEIVE-FP] Request body:', JSON.stringify(data, null, 2))
        const { qrId, productName, quantity, orderNumber, employeeId: requestEmployeeId, employeeName: requestEmployeeName } = data

        console.log('📦 [RECEIVE-FP] Extracted values:', { qrId, productName, quantity, orderNumber, requestEmployeeId, requestEmployeeName })

        if (!qrId || !productName) {
          console.log('📦 [RECEIVE-FP] 400: Missing required fields. qrId:', qrId, 'productName:', productName)
          sendJSON(res, 400, { error: 'Missing required fields' })
          return
        }

        if (!orderNumber) {
          console.log('⚠️ [RECEIVE-FP] WARNING: orderNumber is missing!')
        }

        const timestamp = moscowNow()
        const invoiceId = `RECV-FP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const itemId = `ITEM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        const resolvedEmployee = requestEmployeeId
          ? db.prepare('SELECT id, name, user_id FROM employees WHERE user_id = ? OR CAST(user_id AS TEXT) = ? LIMIT 1').get(requestEmployeeId, String(requestEmployeeId))
          : null
        const employeeByName = !resolvedEmployee && requestEmployeeName
          ? db.prepare('SELECT id, name FROM employees WHERE name = ? LIMIT 1').get(requestEmployeeName)
          : null

        console.log('📦 [RECEIVE-FP] requestEmployeeId:', requestEmployeeId, 'requestEmployeeName:', requestEmployeeName)
        console.log('📦 [RECEIVE-FP] resolvedEmployee:', resolvedEmployee, 'employeeByName:', employeeByName)

        let employeeId = resolvedEmployee?.id || employeeByName?.id || null
        let employeeName = resolvedEmployee?.name || employeeByName?.name || requestEmployeeName || 'QR Scan'

        // Авто-создание сотрудника, если не найден
        console.log('📦 [RECEIVE-FP] Checking auto-create: employeeId=', employeeId, 'requestEmployeeId=', requestEmployeeId)
        if (!employeeId && requestEmployeeId) {
          console.log('📦 [RECEIVE-FP] Looking for user with id:', requestEmployeeId)
          const user = db.prepare('SELECT id, full_name, role FROM users WHERE id = ?').get(requestEmployeeId)
          console.log('📦 [RECEIVE-FP] Found user:', user)
          if (user) {
            const now = moscowNow()
            const newEmpId = `emp-${requestEmployeeId}-${Date.now()}`
            console.log('📦 [RECEIVE-FP] Creating employee:', newEmpId, 'for user:', user)
            db.prepare(`
              INSERT INTO employees (id, user_id, name, email, phone, position, department, role, status, salary, hire_date, created_at, updated_at, created_by)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              newEmpId,
              String(requestEmployeeId),
              user.full_name || employeeName,
              `user${requestEmployeeId}@warehouse.local`,
              '+7-000-000-00-00',
              user.role || 'Сотрудник',
              'Основной',
              user.role || 'worker',
              'active',
              0,
              now,
              now,
              now,
              'System'
            )
            employeeId = newEmpId
            employeeName = user.full_name || employeeName
            console.log(`📦 [RECEIVE-FP] Auto-created employee ${newEmpId} for user ${requestEmployeeId}`)
          } else {
            console.log('📦 [RECEIVE-FP] User not found, cannot auto-create employee')
          }
        }

        if (!employeeId) {
          sendJSON(res, 400, { error: 'Требуется авторизация. Войдите в систему для выполнения операции.' })
          return
        }

        console.log('📦 [RECEIVE-FP] Saving invoice with orderNumber:', orderNumber || 'БЕЗ НОМЕРА')

        db.prepare(`
          INSERT INTO material_invoices (id, employee_id, date, order_number, destination, total_amount, created_at, updated_at, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(invoiceId, employeeId, timestamp, orderNumber || 'Без номера', 'Готовая продукция', 0, timestamp, timestamp, employeeName)

        db.prepare(`
          INSERT INTO material_invoice_items (id, invoice_id, product_name, quantity, unit, article, price, scanned_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(itemId, invoiceId, productName, quantity || 1, 'шт', qrId, 0, timestamp)

        const existingStock = db.prepare(`SELECT * FROM onec_stocks WHERE name = ? AND warehouse = 'Готовая продукция'`).get(productName)

        if (existingStock) {
          db.prepare(`
            UPDATE onec_stocks SET quantity = quantity + ?, current_stock = quantity + ?, local_only = 1, synced_at = ?
            WHERE name = ? AND warehouse = 'Готовая продукция'
          `).run(quantity || 1, quantity || 1, timestamp, productName)
        } else {
          db.prepare(`
            INSERT INTO onec_stocks (ref_key, name, product, warehouse, quantity, current_stock, unit, category, status, barcode, storageBin, image, local_only, synced_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(qrId, productName, productName, 'Готовая продукция', quantity || 1, quantity || 1, 'шт', 'Готовая продукция', 'in_stock', qrId, '', '', 1, timestamp)
        }

        console.log('✅ [RECEIVE-FP] Invoice created successfully:', invoiceId, 'orderNumber:', orderNumber || 'БЕЗ НОМЕРА')

        sendJSON(res, 200, { success: true, invoiceId, orderNumber: orderNumber || 'Без номера' })
      } catch (err) {
        console.error('❌ Error receiving product:', err)
        sendJSON(res, 500, { error: err.message })
      }
    })
    return
  }

  // -------------------------------------------------------
  // 404
  // -------------------------------------------------------

  res.writeHead(404)
  res.end(JSON.stringify({ error: 'Not found' }))
})

// ============================================================
// Запуск сервера
// ============================================================

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n✅ Backend server running on http://localhost:${PORT}/sklad/api`)
  console.log(`📝 Test users:`)
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
    console.log(`\n⚠️  SYNC ERROR: ${lastSyncTime.error}`)
    console.log('Check /sklad/api/sync/logs for details\n')
  } else {
    console.log('\n✅ Successfully synced with 1C')
    console.log('Results:', initialSync.results)
  }

  // Автоматическая синхронизация заказов на перемещение каждый час
  setInterval(async () => {
    try {
      const transferOrders1C = await fetch1CTransferOrders()
      if (transferOrders1C && transferOrders1C.length > 0) {
        const stats = syncTransferOrdersIncremental(transferOrders1C)
        await syncTransferOrderItems()
        await syncTransferOrderStatuses()
        loadCacheFromDB()
        updateLastSyncTime({ lastSyncByType: { ...lastSyncTime.lastSyncByType, transfer_orders: new Date().toISOString() } })
        console.log(`📡 [HOURLY SYNC] Transfer Orders: +${stats.added} ~${stats.updated} -${stats.deleted} at ${new Date().toLocaleTimeString()}`)
        writeSyncLog(`Auto-sync: Transfer Orders +${stats.added} ~${stats.updated} -${stats.deleted}`)
      }
    } catch (err) {
      console.error('[HOURLY SYNC ERROR] Transfer Orders:', err.message)
      writeSyncLog(`Auto-sync error: ${err.message}`)
    }
  }, 3600000)

  console.log('⏰ Automatic sync scheduled: Transfer Orders every 1 hour')
})
