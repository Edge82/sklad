/**
 * Функции синхронизации данных с 1C
 * Инкрементальная синхронизация каждой сущности
 */
import { cache, lastSyncTime, updateLastSyncTime } from './cache.js'
import db from './db.js'
import { writeSyncLog } from './helpers.js'
import {
  fetch1CUnits, fetch1CCategories, fetch1CWarehouses,
  fetch1CStocks, fetch1COrders, fetch1CTransferOrders,
  calculateReserves, loadCacheFromDB
} from './onec-client.js'
import { transformOrderStatus } from './helpers.js'

/**
 * Инкрементальная синхронизация единиц измерения
 */
function syncUnitsIncremental(units1C) {
  const stats = { added: 0, updated: 0, deleted: 0 }
  if (!units1C || units1C.length === 0) return stats

  const ref_keysIn1C = new Set(units1C.map(u => u.ref_key))
  const existing = db.prepare('SELECT ref_key FROM onec_units').all()
  const existingMap = new Map(existing.map(u => [u.ref_key, u]))

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

  for (const [ref_key] of existingMap) {
    if (!ref_keysIn1C.has(ref_key)) {
      db.prepare('DELETE FROM onec_units WHERE ref_key = ?').run(ref_key)
      stats.deleted++
    }
  }

  return stats
}

/**
 * Инкрементальная синхронизация категорий
 */
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

/**
 * Инкрементальная синхронизация складов
 */
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

/**
 * Инкрементальная синхронизация остатков
 */
function syncStocksIncremental(stocks) {
  const stats = { added: 0, updated: 0, deleted: 0 }
  if (!stocks || stocks.length === 0) return stats

  const ref_keysIn1C = new Set(stocks.map(s => s.ref_key))
  const _existing = db.prepare('SELECT ref_key, COALESCE(local_only, 0) as local_only FROM onec_stocks').all()
  const existingMap = new Map(_existing.map(s => [s.ref_key, s]))

  for (const stock of stocks) {
    if (existingMap.has(stock.ref_key)) {
      const existing = existingMap.get(stock.ref_key)

      const existingRecord = db.prepare('SELECT image FROM onec_stocks WHERE ref_key = ?').get(stock.ref_key)
      const imageToSave = existingRecord?.image || stock.image || null

      db.prepare(`UPDATE onec_stocks SET
        name = ?, product = ?, warehouse = ?,
        quantity = ?, current_stock = ?, unit = ?, unit_key = ?, category = ?,
      status = ?, reserved = ?, purchasePrice = ?, averagePrice = ?, reservesByOrder = ?, image = ?,
      last_receipt = ?, local_only = COALESCE(local_only, 0)
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
          stock.lastReceipt || null,
          stock.ref_key
        )
      stats.updated++
    } else {
      try {
        let unitValue = 'шт'
        if (stock.unit_key) {
          const unitRecord = cache.units?.find(u => u.ref_key === stock.unit_key)
          if (unitRecord) {
            unitValue = unitRecord.description
          }
        } else if (stock.unit && stock.unit !== '?' && stock.unit.length > 0 && !stock.unit.match(/^[a-f0-9\-]{36}$/)) {
          unitValue = stock.unit
        }

        db.prepare(`INSERT INTO onec_stocks
          (ref_key, name, sku, product, warehouse, location, quantity, current_stock, unit, unit_key, category, status, reserved, purchasePrice, averagePrice, reservesByOrder, image, local_only, last_receipt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(
            stock.ref_key || null,
            stock.name || stock.product,
            '',
            stock.product || stock.name,
            stock.warehouse || '',
            '',
            stock.quantity || 0,
            stock.current_stock || stock.quantity || 0,
            unitValue,
            stock.unit_key || '',
            stock.category || '',
            stock.status || 'in_stock',
            stock.reserved || 0,
            stock.purchasePrice || 0,
            stock.averagePrice || stock.purchasePrice || 0,
            JSON.stringify(stock.reservesByOrder || {}),
            stock.image || null,
            stock.local_only || 0,
            stock.lastReceipt || null
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

/**
 * Инкрементальная синхронизация заказов на перемещение
 */
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
        customer_order_number = ?, posted = ?, selected_product = COALESCE(selected_product, '')
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
          customer_order_number, posted, selected_product, created_by)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '')`)
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
            order.posted,
            order.selected_product || ''
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

/**
 * Инкрементальная синхронизация заказов
 */
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

/**
 * Полная синхронизация всех данных с 1C
 */
export async function syncWith1C() {
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
    const units1C = await fetch1CUnits()
    const categories1C = await fetch1CCategories()
    const warehouses1C = await fetch1CWarehouses()
    const stocks1C = await fetch1CStocks()

    if (stocks1C && stocks1C.length > 0) {
      cache.stocks = stocks1C
    }

    const orders1C = await fetch1COrders()
    const transferOrders1C = await fetch1CTransferOrders()

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
      updateLastSyncTime({ connectionStatus: 'unavailable' })
      return syncLog
    }

    updateLastSyncTime({ connectionStatus: 'connected' })

    if (categories1C && categories1C.length > 0) {
      cache.categories = categories1C
      console.log(`✓ Categories: ${categories1C.length} items cached`)
    }

    if (units1C && units1C.length > 0) {
      cache.units = units1C
      console.log(`✓ Units: ${units1C.length} items cached`)
    }

    if (units1C && units1C.length > 0) {
      const unitStats = syncUnitsIncremental(units1C)
      syncLog.results.units = { status: 'success', count: units1C.length, ...unitStats }
      console.log(`✓ Units: +${unitStats.added} ~${unitStats.updated} -${unitStats.deleted}`)
      writeSyncLog(`Units synced: +${unitStats.added} ~${unitStats.updated} -${unitStats.deleted}`)
      updateLastSyncTime({ lastSyncByType: { ...lastSyncTime.lastSyncByType, units: new Date().toISOString() } })
    }

    if (categories1C && categories1C.length > 0) {
      const catStats = syncCategoriesIncremental(categories1C)
      syncLog.results.categories = { status: 'success', count: categories1C.length, ...catStats }
      console.log(`✓ Categories: +${catStats.added} ~${catStats.updated} -${catStats.deleted}`)
      writeSyncLog(`Categories synced: +${catStats.added} ~${catStats.updated} -${catStats.deleted}`)
      updateLastSyncTime({ lastSyncByType: { ...lastSyncTime.lastSyncByType, categories: new Date().toISOString() } })
    }

    if (warehouses1C && warehouses1C.length > 0) {
      const whStats = syncWarehousesIncremental(warehouses1C)
      syncLog.results.warehouses = { status: 'success', count: warehouses1C.length, ...whStats }
      console.log(`✓ Warehouses: +${whStats.added} ~${whStats.updated} -${whStats.deleted}`)
      writeSyncLog(`Warehouses synced: +${whStats.added} ~${whStats.updated} -${whStats.deleted}`)
      updateLastSyncTime({ lastSyncByType: { ...lastSyncTime.lastSyncByType, warehouses: new Date().toISOString() } })
    }

    if (stocks1C && stocks1C.length > 0) {
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
      updateLastSyncTime({ lastSyncByType: { ...lastSyncTime.lastSyncByType, stocks: new Date().toISOString() } })
    }

    if (orders1C && orders1C.length > 0) {
      const orderStats = syncOrdersIncremental(orders1C)
      syncLog.results.orders = { status: 'success', count: orders1C.length, ...orderStats }
      console.log(`✓ Orders: +${orderStats.added} ~${orderStats.updated} -${orderStats.deleted}`)
      updateLastSyncTime({ lastSyncByType: { ...lastSyncTime.lastSyncByType, orders: new Date().toISOString() } })
    }

    if (transferOrders1C && transferOrders1C.length > 0) {
      const transferOrderStats = syncTransferOrdersIncremental(transferOrders1C)
      syncLog.results.transfer_orders = { status: 'success', count: transferOrders1C.length, ...transferOrderStats }
      console.log(`✓ Transfer Orders: +${transferOrderStats.added} ~${transferOrderStats.updated} -${transferOrderStats.deleted}`)
      updateLastSyncTime({ lastSyncByType: { ...lastSyncTime.lastSyncByType, transfer_orders: new Date().toISOString() } })
    }

    loadCacheFromDB()

    updateLastSyncTime({ value: new Date().toISOString(), status: syncLog.usedFallback ? 'fallback' : 'success' })

    console.log('✓ Sync completed:', syncLog.results)
    return syncLog
  } catch (err) {
    const errorMsg = `✗ Sync error: ${err.message}`
    console.error(errorMsg)
    writeSyncLog(errorMsg)

    updateLastSyncTime({
      value: new Date().toISOString(),
      status: 'error',
      error: err.message,
      connectionStatus: 'failed'
    })

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

export {
  syncUnitsIncremental, syncCategoriesIncremental, syncWarehousesIncremental,
  syncStocksIncremental, syncOrdersIncremental, syncTransferOrdersIncremental
}
