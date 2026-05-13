# Подключение к 1C OData

Приложение может синхронизироваться с реальной 1C через OData API вместо использования mock данных.

## Конфигурация

### 1. Файл `.env` уже существует

Файл `.env` расположен в корне проекта с предустановленными параметрами:

```bash
ls -la .env
```

### 2. Отредактируйте параметры 1C в файле `.env`

Откройте `.env` и установите реальные значения для подключения к вашей 1C:

```env
# Адрес OData API сервера 1C
# Пример для 1C Fresh Cloud:
ONEC_BASE_URL=https://msk1.1cfresh.com/api-1c/a/sbm/3784912

# Пример для локального сервера 1C:
# ONEC_BASE_URL=http://192.168.1.100:8080/ваше_приложение/odata/standard.odata

# Учетные данные пользователя с доступом к OData
ONEC_LOGIN=odata_user
ONEC_PASSWORD=ваш_пароль

# GUID основного склада (используется для фильтрации по умолчанию)
WAREHOUSE_GUID=344cfb30-e233-11f0-862e-fa163e5c9fa8

# Timeout для запросов к 1C (в миллисекундах, по умолчанию 30000)
API_TIMEOUT=30000

# Порт бэкенда (по умолчанию 8000)
BACKEND_PORT=8000

# Порт фронтенда (по умолчанию 3000)
VITE_PORT=3000

# Базовый URL для API запросов с фронта (по умолчанию http://localhost:8000)
API_BASE_URL=http://localhost:8000
```

### ⚠️ Важно!

- **Переменные окружения читаются автоматически из `.env` при старте приложения**
- Не забудьте перезагрузить бэк после изменения `.env`
- Убедитесь что сервер 1C доступен по указанному адресу
- Проверьте учетные данные пользователя 1C

## Архитектура

```
Фронтенд (порт 3000)
    ↓
Бэкенд (порт 8000)
    ├─ Память (кэш)
    └─ SQLite БД (.data/app.db)
    ↓
1C OData API
```

### Процесс синхронизации

1. **При старте приложения** (`node server.js`):
   - Загружаются переменные окружения из `.env`
   - Создаются таблицы в БД если их нет
   - Запускается `syncWith1C()` функция
   - Если 1C доступна - загружаются реальные данные
   - Если 1C недоступна - используются mock данные
   - Данные сохраняются в SQLite и загружаются в кэш памяти


2. **На требование синхронизации** (`POST /sklad/api/sync/1c`):
   - Выполняются OData запросы к 1C
   - Данные сохраняются в SQLite БД
   - Кэш в памяти обновляется из БД
   - Возвращается статус синхронизации

3. **При запросе данных** (`GET /sklad/api/onec/*`):
   - Возвращаются данные из кэша в памяти
   - Кэш был загружен из БД при старте

## API Эндпоинты

### Проверка статуса подключения

```bash
curl http://localhost:8000/sklad/api/1c/status
```

Ответ:
```json
{
  "baseUrl": "http://192.168.1.100:8080/...",
  "username": "admin",
  "configured": true,
  "cacheStatus": {
    "units": 3,
    "warehouses": 3,
    "stocks": 5,
    "orders": 3
  },
  "lastSync": "2026-05-06T21:05:15.918Z"
}
```

### Запустить синхронизацию

```bash
curl -X POST http://localhost:8000/sklad/api/sync/1c
```

Ответ:
```json
{
  "status": "synced",
  "timestamp": "2026-05-06T21:05:15.918Z",
  "usedFallback": false,
  "results": {
    "units": { "status": "success", "count": 10 },
    "warehouses": { "status": "success", "count": 5 },
    "stocks": { "status": "success", "count": 156 },
    "orders": { "status": "success", "count": 42 }
  },
  "data": { ... }
}
```

### Получить данные

```bash
# Единицы измерения
curl http://localhost:8000/sklad/api/onec/units

# Склады
curl http://localhost:8000/sklad/api/onec/warehouses

# Остатки товаров
curl http://localhost:8000/sklad/api/onec/stocks

# Заказы
curl http://localhost:8000/sklad/api/onec/orders
```

## Обработка ошибок

### Если 1C недоступна

Если сервер 1C недостижим, приложение:
1. Выводит предупреждение в лог
2. Использует mock данные для продолжения работы
3. Возвращает `usedFallback: true` в ответе синхронизации
4. Скажет, как настроить параметры 1C в переменных окружения

### Примеры ошибок

**Timeout (сервер 1C не отвечает)**
```
⚠️ 1C Timeout: request took longer than 10000ms
```
→ Увеличить `API_TIMEOUT` в `.env` или проверить доступность сервера

**Connection Error (сервер недостижим)**
```
⚠️ 1C Connection Error: fetch failed
```
→ Проверить VITE_1C_BASE_URL и доступность сервера

**Authentication Error (неправильные учетные данные)**
```
⚠️ 1C API Error [401]
```
→ Проверить VITE_1C_USERNAME и VITE_1C_PASSWORD

## Структура данных

### Units (Единицы измерения)
```json
{
  "ref_key": "unit-1",
  "description": "шт"
}
```

### Warehouses (Склады)
```json
{
  "ref_key": "wh-1",
  "description": "Основной склад"
}
```

### Stocks (Остатки)
```json
{
  "product": "Диван",
  "warehouse": "Основной склад",
  "quantity": 15,
  "unit": "шт"
}
```

### Orders (Заказы)
```json
{
  "order_number": "O-001",
  "date": "2024-05-01",
  "customer": "ООО Торговля",
  "status": "completed",
  "items_count": 3
}
```

## Развертывание

### Для разработки (с mock данными)

```bash
# Запустить без .env - используются значения по умолчанию (mock)
npm run dev
```

### Для продакшена (с реальной 1C)

```bash
# 1. Скопировать и отредактировать .env
cp .env.example .env
# Отредактировать .env с реальными параметрами 1C

# 2. Запустить приложение
npm run build
npm run start
```

## Технические детали

### Используемые OData каталоги из 1C

- `Catalog_КлассификаторЕдиницИзмерения` / `Catalog_ЕдиницыИзмерения` - единицы измерения
- `Catalog_СтруктурныеЕдиницы` - склады/структурные единицы
- `AccumulationRegister_ЗапасыНаСкладах` - остатки товаров
- `Document_ЗаказПокупателя` - заказы покупателей

### Таблицы БД

```sql
CREATE TABLE onec_units (
  id INTEGER PRIMARY KEY,
  ref_key TEXT UNIQUE,
  description TEXT,
  synced_at DATETIME
)

CREATE TABLE onec_warehouses (
  id INTEGER PRIMARY KEY,
  ref_key TEXT UNIQUE,
  description TEXT,
  synced_at DATETIME
)

CREATE TABLE onec_stocks (
  id INTEGER PRIMARY KEY,
  product TEXT,
  warehouse TEXT,
  quantity REAL,
  unit TEXT,
  synced_at DATETIME
)

CREATE TABLE onec_orders (
  id INTEGER PRIMARY KEY,
  order_number TEXT UNIQUE,
  date TEXT,
  customer TEXT,
  status TEXT,
  items_count INTEGER,
  synced_at DATETIME
)
```

## Troubleshooting

| Проблема | Решение |
|----------|---------|
| Приложение медленно стартует | Увеличить `API_TIMEOUT` в `.env` |
| Mock данные вместо реальных | Проверить VITE_1C_BASE_URL и доступность 1C |
| 401 при синхронизации | Проверить VITE_1C_USERNAME и VITE_1C_PASSWORD |
| Нет данных в кэше | Запустить POST /sklad/api/sync/1c |
| БД зависла | Удалить `.data/app.db` и перезагрузить приложение |
