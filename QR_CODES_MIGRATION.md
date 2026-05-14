# Миграция QR Кодов на Бэкенд

## Обзор Архитектуры

### Проблема
- QR коды хранились только в памяти фронтенда (localStorage)
- Теряются при перезагрузке страницы
- Нет истории операций с QR кодами
- Нет логирования кто и когда создавал/скеровал QR коды

### Решение
- Перенесены QR коды на бэкенд (SQLite DB)
- Добавлено логирование всех операций с заказами
- Реализована система аудита для отслеживания изменений
- QR коды теперь **глобально уникальны** (не только в заказе)

## Новые Таблицы БД

### `local_qr_codes`
Хранит все QR коды для заказов:

```sql
CREATE TABLE local_qr_codes (
  id TEXT PRIMARY KEY,                    -- Уникальный ID QR кода
  code TEXT UNIQUE NOT NULL,              -- Сам QR код
  order_id TEXT NOT NULL,                 -- Ссылка на заказ
  order_number TEXT,                      -- Номер заказа для быстрого поиска
  product_id TEXT NOT NULL,               -- ID товара
  product_name TEXT,                      -- Название товара
  status TEXT DEFAULT 'generated',        -- generated, scanned, shipped, deleted
  label_order TEXT,                       -- Метка на ярлыке (номер заказа)
  label_info TEXT,                        -- Информация для печати
  scanned_at DATETIME,                    -- Когда отсканирован
  scanned_by TEXT,                        -- Кто отсканировал
  generated_at DATETIME NOT NULL,         -- Когда создан
  generated_by TEXT NOT NULL,             -- Кто создал
  version INTEGER DEFAULT 1,              -- Версия для отката
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)

CREATE INDEX idx_qr_order ON local_qr_codes(order_id)
CREATE INDEX idx_qr_code ON local_qr_codes(code)
CREATE INDEX idx_qr_status ON local_qr_codes(status)
```

### `operation_logs`
Логирует все операции в системе:

```sql
CREATE TABLE operation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation_type TEXT NOT NULL,           -- qr_code_generated, qr_code_scanned, order_painting_updated, etc
  employee_id TEXT,                       -- ID сотрудника
  employee_name TEXT,                     -- Имя сотрудника
  order_id TEXT,                          -- ID заказа (если применимо)
  order_number TEXT,                      -- Номер заказа
  product_id TEXT,                        -- ID товара (если применимо)
  product_name TEXT,                      -- Название товара
  qr_code_id TEXT,                        -- ID QR кода (если применимо)
  qr_code TEXT,                           -- Сам QR код
  details TEXT,                           -- JSON с дополнительными данными
  status TEXT DEFAULT 'success',          -- success, error, warning
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(order_id) REFERENCES onec_orders(ref_key),
  FOREIGN KEY(qr_code_id) REFERENCES local_qr_codes(id)
)

CREATE INDEX idx_log_employee ON operation_logs(employee_id)
CREATE INDEX idx_log_order ON operation_logs(order_id)
CREATE INDEX idx_log_operation ON operation_logs(operation_type)
CREATE INDEX idx_log_created ON operation_logs(created_at DESC)
```

## API Endpoints

### QR Code Operations

#### 1. Генерирование QR кодов
```
POST /sklad/api/orders/{orderId}/qr-codes/generate

Params:
  quantity: number        -- Количество кодов для генерирования
  productId: string       -- ID товара
  productName: string     -- Название товара
  generatedBy: string     -- Кто генерирует (пользователь)
  employeeId?: string     -- ID сотрудника
  employeeName?: string   -- Имя сотрудника

Response:
{
  "success": true,
  "orderId": "xxx-xxx",
  "productId": "yyy-yyy",
  "quantity": 5,
  "codes": [
    { "id": "qr-123", "code": "QR-xxx-yyy-1", "status": "generated" },
    ...
  ],
  "createdAt": "2025-01-15T10:30:00Z"
}
```

Логирует: `qr_code_generated` операцию

#### 2. Получить QR коды заказа
```
GET /sklad/api/orders/{orderId}/qr-codes

Response:
{
  "orderId": "xxx-xxx",
  "count": 15,
  "codes": [
    {
      "id": "qr-123",
      "code": "QR-xxx-yyy-1",
      "order_number": "ORD-2025-001",
      "product_id": "prod-123",
      "product_name": "Товар A",
      "status": "generated",
      "generated_at": "2025-01-15T10:00:00Z",
      "generated_by": "admin",
      "scanned_at": null,
      "scanned_by": null
    },
    ...
  ]
}
```

#### 3. Отсканировать QR код
```
POST /sklad/api/qr-codes/{qrCodeId}/scan

Params:
  newStatus: string       -- Новый статус: scanned, shipped, etc
  employeeId?: string     -- ID сотрудника
  employeeName?: string   -- Имя сотрудника
  details?: object        -- Дополнительные данные

Response:
{
  "success": true,
  "qrCodeId": "qr-123",
  "code": "QR-xxx-yyy-1",
  "status": "scanned",
  "scannedAt": "2025-01-15T11:00:00Z",
  "scannedBy": "John Doe"
}
```

Логирует: `qr_code_scanned` операцию

#### 4. Удалить QR код
```
DELETE /sklad/api/qr-codes/{qrCodeId}

Response:
{
  "success": true,
  "qrCodeId": "qr-123",
  "code": "QR-xxx-yyy-1",
  "deletedAt": "2025-01-15T12:00:00Z"
}
```

Логирует: `qr_code_deleted` операцию

### Order Operations

#### 5. Обновить окраску заказа
```
POST /sklad/api/onec/orders/painting

Params:
  orderId: string         -- ID заказа
  painting: string        -- Информация об окраске

Response:
{
  "success": true,
  "painting": "Red gloss finish"
}
```

Логирует: `order_painting_updated` операцию

### Operation Logging

#### 6. Получить логи операций
```
GET /sklad/api/operation-logs?type=&employee=&order=&limit=100&offset=0

Query Params:
  type: string            -- Тип операции (qr_code_generated, etc)
  employee: string        -- ID сотрудника
  order: string           -- ID заказа
  limit: number           -- Количество записей (default 100)
  offset: number          -- Смещение (default 0)

Response:
{
  "logs": [
    {
      "id": 1,
      "operation_type": "qr_code_generated",
      "employee_id": "emp-123",
      "employee_name": "John Doe",
      "order_id": "order-123",
      "order_number": "ORD-2025-001",
      "product_id": "prod-123",
      "product_name": "Товар A",
      "qr_code_id": "qr-123",
      "qr_code": "QR-xxx-yyy-1",
      "details": { "quantity": 5, "index": 1 },
      "status": "success",
      "created_at": "2025-01-15T10:30:00Z"
    },
    ...
  ],
  "count": 25,
  "limit": 100,
  "offset": 0
}
```

#### 7. Получить последние операции сотрудника
```
GET /sklad/api/employees/{employeeId}/operations?limit=10

Query Params:
  limit: number           -- Количество последних операций (default 10)

Response:
{
  "employeeId": "emp-123",
  "logs": [
    {
      "id": 1,
      "operation_type": "qr_code_generated",
      "employee_name": "John Doe",
      "order_number": "ORD-2025-001",
      "product_name": "Товар A",
      "qr_code": "QR-xxx-yyy-1",
      "details": { "quantity": 5 },
      "status": "success",
      "created_at": "2025-01-15T10:30:00Z"
    },
    ...
  ],
  "count": 10,
  "limit": 10
}
```

#### 8. Получить статистику операций
```
GET /sklad/api/operation-logs/stats

Response:
{
  "stats": [
    {
      "operation_type": "qr_code_generated",
      "count": 150,
      "unique_employees": 3,
      "first_at": "2025-01-01T00:00:00Z",
      "last_at": "2025-01-15T12:00:00Z"
    },
    {
      "operation_type": "qr_code_scanned",
      "count": 100,
      "unique_employees": 5,
      "first_at": "2025-01-02T00:00:00Z",
      "last_at": "2025-01-15T11:00:00Z"
    },
    ...
  ]
}
```

## Frontend Changes

### Stores

#### `useQRCodesStore`
- `generateQRCodes(params)` - теперь асинхронный, отправляет на бэкенд
- `loadQRCodesForOrder(orderId)` - загружает коды с бэкенда
- `updateQRCodeStatus(id, status, scannedBy)` - обновляет статус на бэкенде
- `removeQRCode(id)` - удаляет код с бэкенда
- `clearCodesForOrder(orderId)` - очищает коды заказа из локального стора
- Добавлены: `loading`, `error` для отслеживания состояния

#### `useOrdersStore`
- `updateOrderPainting(orderId, painting)` - обновляет окраску заказа
- `logOperation(type, data)` - логирует операцию на бэкенде

### Components

#### `OrderDetails.vue`
- Загружает QR коды с бэкенда при монтировании
- Использует асинхронные методы для работы с QR кодами
- Логирует обновления окраски
- Добавлена кнопка загрузки с индикатором загрузки

#### `EmployeeDetails.vue`
- Добавлена новая вкладка "История операций"
- Импортирован компонент `EmployeeOperationHistory`

#### `EmployeeOperationHistory.vue` (новый)
- Отображает последние 10 операций сотрудника
- Timeline визуализация
- Поддержка загрузки большего количества операций
- Иконки для разных типов операций

## Типы Операций

```typescript
type OperationType = 
  | 'qr_code_generated'        // QR код сгенерирован
  | 'qr_code_scanned'          // QR код отсканирован
  | 'qr_code_deleted'          // QR код удален
  | 'order_painting_updated'   // Окраска заказа обновлена
  | 'order_status_changed'     // Статус заказа изменился
  | 'material_issued'          // Материал выдан
  | 'shipment_created'         // Отгрузка создана
```

## Примеры Использования

### Генерирование QR кодов
```typescript
const qrStore = useQRCodesStore()
const codes = await qrStore.generateQRCodes({
  orderId: 'order-123',
  orderNumber: 'ORD-2025-001',
  productId: 'prod-456',
  productName: 'Красная мебель',
  count: 5,
  generatedBy: 'admin',
  employeeId: 'emp-123',
  employeeName: 'John Doe'
})
// Результат: 5 новых QR кодов созданы на бэкенде и логированы
```

### Загрузка QR кодов заказа
```typescript
const qrStore = useQRCodesStore()
const codes = await qrStore.loadQRCodesForOrder('order-123')
// Загружаются все QR коды заказа с их статусами
```

### Отсканирование QR кода
```typescript
const qrStore = useQRCodesStore()
await qrStore.updateQRCodeStatus(
  'qr-123',
  'scanned',
  'John Doe',
  'emp-123'
)
// QR код отмечен как отсканированный и логирован
```

### Просмотр истории сотрудника
- Перейти на страницу сотрудника
- Нажать на сотрудника для открытия деталей
- Перейти на вкладку "История операций"
- Видеть все операции сотрудника в обратном хронологическом порядке

## Миграция Данных

### Что происходит при старте сервера
1. Проверяются новые таблицы (`local_qr_codes`, `operation_logs`)
2. Если их нет - создаются автоматически
3. Создаются индексы для быстрого поиска
4. При добавлении первого QR кода - запись попадает в БД

### Обратная совместимость
- Старые QR коды из localStorage **не** мигрируют автоматически
- Рекомендуется очистить localStorage перед использованием
- Можно вручную создать QR коды через новый API если нужно

## Безопасность

### Аутентификация
- Требуется token в Authorization header для большинства операций
- Login через `/sklad/api/auth/login`

### Валидация
- Проверяются orderId и productId
- Логируются все операции с указанием сотрудника
- Есть отслеживание ошибок (status: 'error')

### Логирование
- Все операции логируются с timestamp
- Хранится информация о сотруднике
- Есть дополнительные детали в JSON формате

## Тестирование

### Через curl
```bash
# Генерирование QR кодов
curl -X POST http://localhost:8000/sklad/api/orders/order-123/qr-codes/generate \
  -H "Content-Type: application/json" \
  -d '{
    "quantity": 3,
    "productId": "prod-456",
    "productName": "Красная мебель",
    "generatedBy": "admin",
    "employeeId": "emp-123",
    "employeeName": "John Doe"
  }'

# Получить QR коды
curl http://localhost:8000/sklad/api/orders/order-123/qr-codes

# Отсканировать QR код
curl -X POST http://localhost:8000/sklad/api/qr-codes/qr-123/scan \
  -H "Content-Type: application/json" \
  -d '{
    "newStatus": "scanned",
    "employeeId": "emp-123",
    "employeeName": "John Doe"
  }'

# Получить логи операций
curl "http://localhost:8000/sklad/api/operation-logs?type=qr_code_generated&limit=20"

# Получить историю сотрудника
curl "http://localhost:8000/sklad/api/employees/emp-123/operations?limit=10"
```

## Заключение

Новая архитектура обеспечивает:
✅ Персистентное хранилище QR кодов
✅ Полная история операций с аудитом
✅ Отслеживание кто что и когда сделал
✅ Быстрый поиск по индексам
✅ Легкая интеграция с фронтенд-компонентами
✅ Готовность к расширению функционала
