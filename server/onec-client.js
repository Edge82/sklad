/**
 * Клиент для работы с 1C OData API
 * Функции для загрузки данных из 1C
 */
import { ONEC_CONFIG, getBasicAuthHeader } from './config.js'
import { cache, unitsCache, setUnitsCache } from './cache.js'
import db from './db.js'

/**
 * Функция для запроса к 1C OData
 */
export async function fetch1COData(endpoint, params = {}, options = {}) {
  const authHeader = getBasicAuthHeader()
  const { timeout = ONEC_CONFIG.timeout } = options

  const baseUrl = ONEC_CONFIG.baseUrl.replace(/\/$/, '')

  const queryParams = new URLSearchParams()
  queryParams.append('$format', 'json')
  if (params.$top) queryParams.append('$top', params.$top)
  if (params.$skip) queryParams.append('$skip', params.$skip)
  if (params.$select) queryParams.append('$select', params.$select)
  if (params.$filter) queryParams.append('$filter', params.$filter)
  if (params.$orderby) queryParams.append('$orderby', params.$orderby)

  const cleanEndpoint = endpoint.split('?')[0]
  const url = `${baseUrl}/${cleanEndpoint}?${queryParams.toString()}`

  console.log(`📡 [1C] GET ${cleanEndpoint}`)
  console.log(`   URL: ${url}`)
  console.log(`   Auth: ${authHeader.substring(0, 30)}...`)

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

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

/**
 * Загружает кэш единиц измерения из 1C
 */
export async function loadUnitsCache() {
  try {
    const authHeader = getBasicAuthHeader()

    console.log(`📡 Loading units cache from Catalog_КлассификаторЕдиницИзмерения...`)
    let url = `${ONEC_CONFIG.baseUrl.replace(/\/$/, '')}/Catalog_КлассификаторЕдиницИзмерения?$format=json&$select=Ref_Key,Description`

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
        const newCache = new Map()
        data.value.forEach(unit => {
          newCache.set(unit.Ref_Key, unit.Description)
        })
        setUnitsCache(newCache)
        console.log(`✅ Loaded ${unitsCache.size} units from Catalog_КлассификаторЕдиницИзмерения:`)
        data.value.forEach(unit => {
          console.log(`   ${unit.Ref_Key} = "${unit.Description}"`)
        })
        return
      }
    }

    // Fallback to Catalog_ЕдиницыИзмерения
    console.log(`📡 Catalog_КлассификаторЕдиницИзмерения empty, trying Catalog_ЕдиницыИзмерения...`)
    url = `${ONEC_CONFIG.baseUrl.replace(/\/$/, '')}/Catalog_ЕдиницыИзмерения?$format=json&$select=Ref_Key,Description`

    response = await fetch(url, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json'
      },
      timeout: ONEC_CONFIG.timeout
    })

    if (response.ok) {
      const data = await response.json()
      if (data.value && Array.isArray(data.value) && data.value.length > 0) {
        const newCache = new Map()
        data.value.forEach(unit => {
          newCache.set(unit.Ref_Key, unit.Description)
        })
        setUnitsCache(newCache)
        console.log(`✅ Loaded ${unitsCache.size} units from Catalog_ЕдиницыИзмерения`)
        return
      }
    }

    // Third try: extract from Nomenclature
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

        const newCache = new Map()
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
                newCache.set(unitKey, unitData.Description)
                console.log(`   ✓ ${unitKey} = "${unitData.Description}"`)
              }
            }
          } catch (_err) {
            // Пропускаем ошибки отдельных единиц
          }
        }

        if (newCache.size > 0) {
          setUnitsCache(newCache)
          console.log(`✅ Loaded ${newCache.size} units total`)
          return
        }
      }
    }

    throw new Error('Could not load units from any source')
  } catch (err) {
    console.error(`⚠️ Failed to load units cache: ${err.message}`)
    console.log(`✅ Using default units cache`)
    const defaultCache = new Map()
    defaultCache.set('4f2a121c-e233-11f0-862e-fa163e5c9fa8', 'кг')
    defaultCache.set('ead49f26-116c-11f1-9cfd-fa163e5c9fa8', 'шт')
    setUnitsCache(defaultCache)
    console.log(`   ${defaultCache.size} default units loaded`)
  }
}

/**
 * Загружает единицы измерения из 1C
 */
export async function fetch1CUnits() {
  let units = await fetch1COData('Catalog_КлассификаторЕдиницИзмерения', {
    '$select': 'Ref_Key,Description,Code'
  })

  if (!units || units.length === 0) {
    console.log('⚠️  No units from Catalog_КлассификаторЕдиницИзмерения, trying Catalog_ЕдиницыИзмерения...')
    units = await fetch1COData('Catalog_ЕдиницыИзмерения', {
      '$select': 'Ref_Key,Description'
    })
  }

  if (!units || units.length === 0) {
    const nomenclature = await fetch1COData('Catalog_Номенклатура', {
      '$select': 'Ref_Key,ЕдиницаИзмерения_Key',
      '$top': '10000'
    })

    if (nomenclature && nomenclature.length > 0) {
      const uniqueUoms = new Map()
      for (const nom of nomenclature) {
        const uomKey = nom.ЕдиницаИзмерения_Key
        if (uomKey && !uniqueUoms.has(uomKey)) {
          const realDesc = unitsCache.get(uomKey)
          uniqueUoms.set(uomKey, { Ref_Key: uomKey, Description: realDesc || 'шт' })
        }
      }

      if (uniqueUoms.size > 0) {
        units = Array.from(uniqueUoms.values())
        console.log(`  ⚠️  Found ${units.length} unique units in Nomenclature`)
      }
    }
  }

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

/**
 * Загружает категории из 1C
 */
export async function fetch1CCategories() {
  const categories = await fetch1COData('Catalog_КатегорииНоменклатуры', {
    '$select': 'Ref_Key,Description'
  })

  if (!categories || categories.length === 0) return null

  return categories.map((cat) => ({
    ref_key: cat.Ref_Key,
    description: cat.Description
  }))
}

/**
 * Загружает склады из 1C
 */
export async function fetch1CWarehouses() {
  let warehouses = await fetch1COData('Catalog_СтруктурныеЕдиницы', {
    '$select': 'Ref_Key,Code,Description,ТипСтруктурнойЕдиницы',
    '$filter': "DeletionMark eq false and (ТипСтруктурнойЕдиницы eq 'Склад' or ТипСтруктурнойЕдиницы eq 'Розница')",
    '$orderby': 'Description'
  })

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

/**
 * Загружает остатки (стэки) из 1C
 */
export async function fetch1CStocks() {
  console.log('📦 Загружаем материалы: номенклатура + единицы + остатки...')

  const nomenclature = await fetch1COData('Catalog_Номенклатура', {
    '$select': 'Ref_Key,Description,Артикул,ЕдиницаИзмерения_Key,КатегорияНоменклатуры_Key,DeletionMark,ФайлКартинки_Key',
    '$top': '10000'
  })

  if (!nomenclature || nomenclature.length === 0) {
    console.warn('⚠️ Номенклатура не получена')
    return null
  }
  console.log(`  ✓ Номенклатура: ${nomenclature.length} позиций`)

  let uomData = await fetch1COData('Catalog_КлассификаторЕдиницИзмерения', { '$select': 'Ref_Key,Description' })

  if (!uomData || uomData.length === 0) {
    uomData = await fetch1COData('Catalog_ЕдиницыИзмерения', { '$select': 'Ref_Key,Description' })
  }

  if (!uomData || uomData.length === 0) {
    console.log('⚠️  No units from Catalog_ЕдиницыИзмерения, extracting from Nomenclature...')

    const uniqueUoms = new Map()
    for (const nom of nomenclature) {
      const uomKey = nom.ЕдиницаИзмерения_Key
      if (uomKey && !uniqueUoms.has(uomKey)) {
        const realDesc = unitsCache.get(uomKey)
        uniqueUoms.set(uomKey, { Ref_Key: uomKey, Description: realDesc || '?' })
      }
    }

    if (uniqueUoms.size > 0) {
      console.log(`  ⚠️  Found ${uniqueUoms.size} unique units in Nomenclature`)
      uomData = Array.from(uniqueUoms.values())
    }
  }

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

  const nomMap = new Map()
  for (const n of nomenclature) {
    if (!n.DeletionMark) {
      nomMap.set(n.Ref_Key, n)
    }
  }

  let registerRaw = await fetch1COData('AccumulationRegister_ЗапасыНаСкладах', {
    '$top': '100000'
  })

  if (!registerRaw || registerRaw.length === 0) {
    registerRaw = await fetch1COData('AccumulationRegister_Запасы', { '$top': '100000' })
  }

  const movements = []
  if (registerRaw && Array.isArray(registerRaw)) {
    registerRaw.forEach((record) => {
      if (record.RecordSet && Array.isArray(record.RecordSet)) {
        record.RecordSet.forEach((item) => {
          const itemId = item.Номенклатура_Key
          if (!itemId) return

          const type = String(item.RecordType)
          const isReceipt = type === 'Receipt' || type === 'Приход' || type === '0' || type === 'true' || type === 'Active'
          movements.push({
            nomId: itemId,
            quantity: Number(item.Количество) || 0,
            isReceipt: isReceipt,
            date: item.Period || item.Период || item.DateTime || record.Period || record.Период || record.DateTime || null,
            warehouse: item.СтруктурнаяЕдиница_Key || item.Склад_Key
          })
        })
      } else {
        const itemId = record.Номенклатура_Key
        if (!itemId) return

        const type = String(record.RecordType)
        const isReceipt = type === 'Receipt' || type === 'Приход' || type === '0' || type === 'true' || type === 'Active'
        movements.push({
          nomId: itemId,
          quantity: Number(record.Количество) || 0,
          isReceipt: isReceipt,
          date: record.Period || record.Период || null,
          warehouse: record.СтруктурнаяЕдиница_Key || record.Склад_Key
        })
      }
    })
  }

  const warehouseData = await fetch1COData('Catalog_СтруктурныеЕдиницы', {
    '$select': 'Ref_Key,Description'
  })
  const warehouseMap = new Map()
  if (warehouseData) {
    for (const w of warehouseData) warehouseMap.set(w.Ref_Key, w.Description)
  }

  const categoryData = await fetch1COData('Catalog_КатегорииНоменклатуры', {
    '$select': 'Ref_Key,Description'
  })
  const categoryMap = new Map()
  if (categoryData) {
    for (const c of categoryData) categoryMap.set(c.Ref_Key, c.Description)
  }

  // Загружаем прикреплённые файлы номенклатуры (для картинок)
  let attachedFilesMap = new Map()
  try {
    const attachedFiles = await fetch1COData('Catalog_НоменклатураПрисоединенныеФайлы', {
      '$select': 'Ref_Key,ВладелецФайла_Key,ИндексКартинки,Расширение',
      '$top': '10000'
    })
    if (attachedFiles && attachedFiles.length > 0) {
      for (const f of attachedFiles) {
        // Пропускаем если индекс картинки не задан (отрицательный/не число) и расширение не похоже на картинку
        const idx = Number(f.ИндексКартинки)
        const ext = (f.Расширение || '').toLowerCase()
        const isImage = !isNaN(idx) && idx >= 0
          || ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.tiff'].includes(ext)
          || ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.tiff'].includes('.' + ext.replace(/^\./, ''))
        if (!isImage && (!f.ИндексКартинки || Number(f.ИндексКартинки) < 0)) continue

        const ownerKey = f.ВладелецФайла_Key
        // Сохраняем первую (основную) картинку
        if (!attachedFilesMap.has(ownerKey)) {
          attachedFilesMap.set(ownerKey, f.Ref_Key)
        }
      }
      console.log(`  ✓ Найдено ${attachedFilesMap.size} номенклатур с картинками из ${attachedFiles.length} файлов`)
    }
  } catch (e) {
    console.warn('⚠️ Не удалось загрузить прикреплённые файлы номенклатуры:', e.message)
  }

  const balanceMap = new Map()
  const warehouseByNom = new Map()
  const lastReceiptMap = new Map()
  if (movements && movements.length > 0) {
    console.log(`  ✓ Регистр остатков: ${movements.length} записей`)
    for (const m of movements) {
      const nomKey = m.nomId
      if (!nomKey) continue
      const qty = m.quantity
      const delta = m.isReceipt ? qty : -qty
      balanceMap.set(nomKey, (balanceMap.get(nomKey) || 0) + delta)
      if (!warehouseByNom.has(nomKey) && m.warehouse) {
        warehouseByNom.set(nomKey, m.warehouse)
      }
      if (m.isReceipt && m.date) {
        const prev = lastReceiptMap.get(nomKey)
        if (!prev || m.date > prev) {
          lastReceiptMap.set(nomKey, m.date)
        }
      }
    }
    const receiptsWithDate = [...lastReceiptMap].length
    console.log(`  ✓ Даты прихода: ${receiptsWithDate} позиций`)
  } else {
    console.warn('⚠️ Данные регистра остатков не получены, остатки будут 0')
  }

  const priceMap = await fetchPrices()

  const result = []
  for (const n of nomenclature) {
    if (n.DeletionMark) continue
    const qty = balanceMap.get(n.Ref_Key) || 0
    const unitName = uomMap.get(n.ЕдиницаИзмерения_Key) || 'шт'
    const whKey = warehouseByNom.get(n.Ref_Key) || ''
    const whName = warehouseMap.get(whKey) || 'Основной склад'
    const price = priceMap.get(n.Ref_Key)
    const latestPrice = price?.latest || 0
    const avgPrice = price?.average || 0

    let unitKey = n.ЕдиницаИзмерения_Key || ''
    if (unitKey && !uomMap.has(unitKey)) {
      for (const [key, name] of uomMap) {
        if (name === unitName) {
          unitKey = key
          break
        }
      }
    }

    const categoryName = categoryMap.get(n.КатегорияНоменклатуры_Key) || ''

    result.push({
      id: n.Ref_Key,
      ref_key: n.Ref_Key,
      name: n.Description || 'Без названия',
      sku: n.Артикул || '',
      onec_image_key: n.ФайлКартинки_Key || attachedFilesMap.get(n.Ref_Key) || '',
      product: n.Description || 'Без названия',
      warehouse: whName,
      location: '',
      quantity: Math.max(0, qty),
      current_stock: Math.max(0, qty),
      unit: unitName,
      unit_key: unitKey,
      category: categoryName,
      reserved: 0,
      available: Math.max(0, qty),
      minStock: 0,
      purchasePrice: latestPrice,
      averagePrice: avgPrice,
      lastReceipt: lastReceiptMap.get(n.Ref_Key) || null,
      status: qty > 0 ? 'in_stock' : 'out_of_stock'
    })
  }

  console.log(`  ✓ Итого материалов: ${result.length} позиций (${result.filter(r => r.quantity > 0).length} с остатком)`)
  return result
}

/**
 * Загружает заказы из 1C
 */
export async function fetch1COrders() {
  // Пробуем без фильтра по дате (некоторые 1C OData не поддерживают $filter с $orderby)
  const orders = await fetch1COData('Document_ЗаказПокупателя', {
    '$select': 'Ref_Key,Number,Date,Контрагент____Presentation,СостояниеЗаказа____Presentation,СуммаДокумента',
    '$top': '500'
  })

  // Если не сработало без фильтра — пробуем с фильтром, но без $orderby
  if (!orders) {
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    const dateFilter = `Date ge datetime'${ninetyDaysAgo.toISOString()}'`

    const orders2 = await fetch1COData('Document_ЗаказПокупателя', {
      '$select': 'Ref_Key,Number,Date,Контрагент____Presentation,СостояниеЗаказа____Presentation,СуммаДокумента',
      '$filter': dateFilter,
      '$top': '500'
    })
    if (!orders2) return null
    // Сортируем на стороне Node.js, т.к. 1C может не поддерживать $orderby с $filter
    orders2.sort((a, b) => new Date(b.Date) - new Date(a.Date))
    return await processOrders(orders2)
  }

  // Сортируем на стороне Node.js
  orders.sort((a, b) => new Date(b.Date) - new Date(a.Date))
  return await processOrders(orders)
}

/**
 * Обрабатывает массив заказов — загружает позиции
 */
async function processOrders(orders) {
  if (!orders || orders.length === 0) return null

  console.log(`📦 Загружено ${orders.length} заказов за последние 90 дней`)

  const nomMap = new Map()
  if (cache.stocks && cache.stocks.length > 0) {
    cache.stocks.forEach((stock) => {
      if (stock.ref_key) {
        nomMap.set(stock.ref_key, stock.name || stock.product)
      }
    })
  }

  async function loadOrderItems(o) {
    const orderId = o.Ref_Key
    let items = []

    try {
      const selectFields = 'LineNumber,Номенклатура_Key,Номенклатура____Presentation,Номенклатура_Presentation,Количество,Цена,Сумма,ЕдиницаИзмерения_Key'
      const orderItems = await fetch1COData(`Document_ЗаказПокупателя(guid'${orderId}')/Запасы`, {
        '$select': selectFields
      })

      if (orderItems && Array.isArray(orderItems)) {
        items = orderItems.map((item) => {
          const prodId = item.Номенклатура_Key || item.Номенклатура || ''
          let prodName = item.Номенклатура____Presentation || item.Номенклатура_Presentation || ''

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

    return {
      id: o.Ref_Key || o.Number,
      ref_key: o.Ref_Key,
      order_number: o.Number || o.Ref_Key,
      date: o.Date || new Date().toISOString().split('T')[0],
      customer: o.Контрагент____Presentation || 'Unknown Customer',
      status: o.СостояниеЗаказа____Presentation || 'pending',
      amount: Number(o.СуммаДокумента || 0),
      items_count: items.length,
      items: items
    }
  }

  const BATCH_SIZE = 10
  const result = []

  for (let i = 0; i < orders.length; i += BATCH_SIZE) {
    const batch = orders.slice(i, i + BATCH_SIZE)
    console.log(`  📦 Загрузка позиций заказов ${i + 1}-${Math.min(i + BATCH_SIZE, orders.length)} из ${orders.length}...`)

    const batchResults = await Promise.all(batch.map(o => loadOrderItems(o)))
    result.push(...batchResults)

    if (i + BATCH_SIZE < orders.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  console.log(`✓ Orders: ${result.length} заказов загружено`)
  return result
}

/**
 * Загружает заказы на перемещение из 1C
 */
export async function fetch1CTransferOrders() {
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

/**
 * Загружает заказы на производство из 1C
 */
export async function fetchProductionOrders() {
  console.log('📦 Загружаем заказы на производство из 1C...')
  try {
    const baseUrl = ONEC_CONFIG.baseUrl.replace(/\/$/, '')
    const url = `${baseUrl}/Document_ЗаказНаПроизводство?$format=json&$top=500&$select=Ref_Key,Number,Date,Posted,ЗаказПокупателя_Key,ЗаказПокупателя____Presentation,СостояниеЗаказа_Key,СостояниеЗаказа____Presentation,Организация_Key,Организация____Presentation,Ответственный_Key,Ответственный____Presentation,СтруктурнаяЕдиница_Key,СтруктурнаяЕдиница____Presentation,Старт,Финиш,Исполнитель&$orderby=Date desc`

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
      console.warn(`⚠️ 1C error fetching production orders: ${response.status}`)
      return []
    }

    const data = await response.json()
    const orders = (data.value || []).map(order => ({
      ref_key: order.Ref_Key,
      order_number: order.Number,
      date: order.Date,
      posted: order.Posted ? 1 : 0,
      customer_order_key: order.ЗаказПокупателя_Key || '',
      customer_order_number: order.ЗаказПокупателя____Presentation || '',
      status_key: order.СостояниеЗаказа_Key || '',
      status_description: order.СостояниеЗаказа____Presentation || 'В работе',
      organization_key: order.Организация_Key || '',
      organization_name: order.Организация____Presentation || '',
      responsible_key: order.Ответственный_Key || '',
      responsible_name: order.Ответственный____Presentation || '',
      warehouse_key: order.СтруктурнаяЕдиница_Key || '',
      warehouse_name: order.СтруктурнаяЕдиница____Presentation || '',
      start_date: order.Старт || '',
      finish_date: order.Финиш || '',
      executor: order.Исполнитель || ''
    }))

    console.log(`  ✓ Production orders: ${orders.length} загружено`)
    return orders
  } catch (err) {
    console.warn('⚠️ Error fetching production orders:', err.message)
    return []
  }
}

/**
 * Загружает материалы заказа на производство из 1C
 */
export async function fetchProductionOrderMaterials(orderRefKey) {
  try {
    const baseUrl = ONEC_CONFIG.baseUrl.replace(/\/$/, '')
    const url = `${baseUrl}/Document_ЗаказНаПроизводство(guid'${orderRefKey}')/Запасы?$format=json&$select=LineNumber,Номенклатура_Key,Количество,ЕдиницаИзмерения_Key`

    const response = await fetch(url, {
      headers: {
        'Authorization': getBasicAuthHeader(),
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) return []

    const data = await response.json()
    const items = (data.value || []).map(item => ({
      line: item.LineNumber,
      nomenclature_key: item.Номенклатура_Key,
      nomenclature_name: item.Номенклатура____Presentation || item.Номенклатура?.Description || '',
      quantity: Number(item.Количество) || 0,
      unit_key: item.ЕдиницаИзмерения_Key || ''
    }))

    // Дозагружаем названия если не получены из презентации
    const missingNames = items.filter(i => !i.nomenclature_name && i.nomenclature_key)
    if (missingNames.length > 0) {
      const nomIds = [...new Set(missingNames.map(i => i.nomenclature_key))]
      const nomMap = new Map()
      for (const id of nomIds) {
        try {
          const nomUrl = `${baseUrl}/Catalog_Номенклатура(guid'${id}')?$format=json&$select=Description`
          const nomRes = await fetch(nomUrl, {
            headers: { 'Authorization': getBasicAuthHeader(), 'Content-Type': 'application/json' }
          })
          if (nomRes.ok) {
            const nomData = await nomRes.json()
            nomMap.set(id, nomData.Description || 'Без названия')
          }
        } catch { /* skip */ }
      }
      for (const item of missingNames) {
        item.nomenclature_name = nomMap.get(item.nomenclature_key) || 'Без названия'
      }
    }

    return items
  } catch (err) {
    console.warn('⚠️ Error fetching production order materials:', err.message)
    return []
  }
}

/**
 * Загружает кэш из БД
 */
export function loadCacheFromDB() {
  try {
    cache.units = db.prepare('SELECT ref_key, description FROM onec_units').all()
    cache.warehouses = db.prepare('SELECT ref_key, description FROM onec_warehouses').all()
    cache.categories = db.prepare('SELECT ref_key, description FROM onec_categories').all()

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
  }
}

/**
 * Рассчитывает резервы из заказов
 */
export async function calculateReserves() {
  try {
    console.log('  📦 Calculating reserves from orders...')
    const reserveData = await fetch1COData('AccumulationRegister_Запасы', { '$top': '100000' })
    const reserveMap = new Map()

    if (reserveData && Array.isArray(reserveData)) {
      reserveData.forEach(record => {
        const items = (record.RecordSet && Array.isArray(record.RecordSet)) ? record.RecordSet : [record]

        items.forEach(item => {
          const nomId = item.Номенклатура_Key
          if (!nomId) return

          const orderId = item.ЗаказПокупателя_Key || item.Заказ_Key
          const hasOrder = orderId && orderId !== '00000000-0000-0000-0000-000000000000'

          if (!hasOrder) return

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

/**
 * Получает цены товаров из 1C
 */
export async function fetchPrices() {
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
          const priceSums = new Map()
          const priceCounts = new Map()
          const latestPrices = new Map()
          prices.forEach(p => {
            const nomId = p.Номенклатура_Key
            const price = Number(p.Цена) || 0
            if (nomId && price > 0) {
              priceSums.set(nomId, (priceSums.get(nomId) || 0) + price)
              priceCounts.set(nomId, (priceCounts.get(nomId) || 0) + 1)
              if (!latestPrices.has(nomId)) {
                latestPrices.set(nomId, price) // первая запись = самая свежая ($orderby: Period desc)
              }
            }
          })
          const priceMap = new Map()
          priceSums.forEach((sum, nomId) => {
            const count = priceCounts.get(nomId) || 1
            priceMap.set(nomId, {
              latest: latestPrices.get(nomId) || 0,
              average: Math.round((sum / count) * 100) / 100
            })
          })
          console.log(`  ✓ Цены для ${priceMap.size} материалов из ${register} (средние + последние)`)
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
