 /**
 * Общие вспомогательные функции
 */
import fs from 'fs'
import jwt from 'jsonwebtoken'
import db from './db.js'

/**
 * Отправляет JSON-ответ
 */
export function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

/**
 * Читает тело запроса как JSON
 */
export function _readBody(req) {
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

/**
 * Пишет сообщение в лог синхронизации
 */
export function writeSyncLog(message) {
  const logsDir = '.data'
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true })
  }
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] ${message}\n`
  const logFile = `${logsDir}/sync.log`
  fs.appendFileSync(logFile, logMessage)
}

/**
 * Трансформирует статус из 1C в наш формат
 */
export function transformOrderStatus(status1C) {
  // Каждый статус из 1С маппится в уникальный статус фронта (без объединения)
  const statusMap = {
    'Завершен': 'completed',            // полностью завершён
    'На складе': 'ready',               // готов к отгрузке
    'В работе': 'in_progress',          // в производстве
    'На выполнении': 'partially_ready', // частично готов
    'Проектные работы': 'processing',   // в обработке/проектировании
    'Прочее': 'new',                    // неопределённый → как новый
    'КП': 'printing',                   // коммерческое предложение → оформляется
    // Редкие, но на всякий случай
    'Выполнен': 'completed',
    'В обработке': 'processing',
    'Печать QR': 'printing',
    'Готов': 'ready',
    'Отгружен': 'shipped',
    'Отменен': 'cancelled'
  }

  if (statusMap[status1C]) {
    return statusMap[status1C]
  }

  // Если статус уже в английском формате — пропускаем как есть
  if (['new', 'processing', 'printing', 'in_progress', 'partially_ready', 'ready', 'partially_shipped', 'shipped', 'completed', 'cancelled'].includes(status1C)) {
    return status1C
  }

  return 'new'
}

/**
 * Возвращает текущее время в формате ISO с часовым поясом Europe/Moscow
 */
export function moscowNow() {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Moscow' }).replace(' ', 'T')
}

/**
 * Извлекает информацию о сотруднике из JWT токена в запросе.
 * Возвращает { employeeId, employeeName } — UUID сотрудника и его ФИО.
 * employeeId — UUID из таблицы employees (emp-xxx), employeeName — ФИО (name из employees).
 */
export function getEmployeeFromRequest(req, JWT_SECRET) {
  try {
    const authHeader = req.headers.authorization || ''
    let token = null
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    } else {
      const cookies = req.headers.cookie || ''
      const m = cookies.match(/auth_token=([^;]+)/)
      if (m) token = decodeURIComponent(m[1])
    }
    if (token) {
      const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })
      const userId = payload?.userId || payload?.id
      const login = payload?.login || ''
      if (userId) {
        const employee = db.prepare(`
          SELECT e.id, e.name, u.full_name
          FROM employees e
          LEFT JOIN users u ON e.user_id = u.id
          WHERE e.user_id = ? OR CAST(e.user_id AS TEXT) = ? OR e.id = ?
          LIMIT 1
        `).get(userId, String(userId), String(userId))
        if (employee) {
          return {
            employeeId: employee.id,
            employeeName: employee.name || employee.full_name || login
          }
        }
      }
      return { employeeId: login || null, employeeName: login || null }
    }
  } catch (err) {
    console.log('⚠️ JWT verification failed in getEmployeeFromRequest:', err.message)
  }
  return { employeeId: null, employeeName: null }
}

/**
 * Логирование операций
 */
export function logOperation(operationType, data) {
  try {
    const {
      employeeId = null,
      employee_id = null,
      employeeName = null,
      employee_name = null,
      orderId = null,
      orderNumber = null,
      productId = null,
      productName = null,
      qrCodeId = null,
      qrCode = null,
      details = null,
      status = 'success'
    } = data || {}
    const resolvedEmployeeId = employeeId || employee_id
    const resolvedEmployeeName = employeeName || employee_name

    const moscowTime = new Date().toLocaleString('sv-SE', { timeZone: 'Europe/Moscow' }).replace(' ', 'T')

    const stmt = db.prepare(`
      INSERT INTO operation_logs (
        operation_type, employee_id, employee_name, order_id, order_number,
        product_id, product_name, qr_code_id, qr_code, details, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      operationType,
      resolvedEmployeeId,
      resolvedEmployeeName,
      orderId,
      orderNumber,
      productId,
      productName,
      qrCodeId,
      qrCode,
      details ? JSON.stringify(details) : null,
      status,
      moscowTime
    )

    console.log(`📝 [LOG] ${operationType} - ${employeeName || 'unknown'} - ${orderNumber || ''}`)
  } catch (err) {
    console.error('❌ Error logging operation:', err.message)
  }
}

/**
 * Преобразует строки material_invoices в API-формат с вложенными items
 */
export function mapMaterialInvoiceRows(invoicesRows) {
  return invoicesRows.map(inv => ({
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
}
