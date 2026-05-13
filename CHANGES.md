# Изменения синхронизации и мониторинга (7 мая 2026)

## Резюме

Реализованы улучшения для логирования, обработки ошибок и мониторинга синхронизации 1C на фронте и бэке.

## Изменения на бэке (server.js)

### 1. **Удаление mockData** ✓
- Удалены все mock данные (units, warehouses, stocks, orders)
- Удалён fallback на mock при недоступности 1C
- Если 1C недоступна - синхронизация просто прекращается с выводом ошибки
- **Функция**: `initializeOnecData()` теперь только инициализирует таблицы

### 2. **Добавлено логирование синхронизации** ✓
```javascript
function writeSyncLog(message) {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] ${message}\n`
  fs.appendFileSync('.data/sync.log', logMessage)
}
```
- Все операции синхронизации записываются в `.data/sync.log`
- Логируются:
  - Добавление, обновление, удаление для каждой таблицы
  - Ошибки синхронизации с полными сообщениями
  - Информация о недоступности 1C

### 3. **Улучшена обработка ошибок** ✓
- При недоступности 1C - выводится чёткое сообщение об этом
- Статус синхронизации отслеживается в `lastSyncTime`:
  - `connectionStatus`: 'connected', 'unavailable', 'failed', 'unknown'
  - `status`: 'pending', 'success', 'error'
  - `error`: текст ошибки

### 4. **Новый endpoint `/sklad/api/1c/status`** ✓
Возвращает детальный статус:
```json
{
  "baseUrl": "https://msk1.1cfresh.com/...",
  "username": "odata.user",
  "configured": true,
  "connectionStatus": "connected",
  "lastSync": "2026-05-07T18:26:41.019Z",
  "syncStatus": "success",
  "error": null,
  "cacheStatus": {
    "units": 0,
    "warehouses": 9,
    "stocks": 640,
    "orders": 55
  }
}
```
- HTTP статус: 200 при успехе, 503 при ошибке

### 5. **Новый endpoint `/sklad/api/sync/logs`** ✓
Возвращает последние 100 строк из файла логов:
```json
{
  "logs": [
    "[2026-05-07T18:26:40.022Z] Units synced: +0 ~0 -0",
    "[2026-05-07T18:26:40.026Z] Warehouses synced: +0 ~9 -0",
    "[2026-05-07T18:26:40.817Z] Stocks synced: +0 ~640 -0"
  ]
}
```

### 6. **Улучшено сообщение при запуске сервера** ✓
При запуске выводится красивое сообщение о статусе 1C:
```
✅ Backend server running on http://localhost:8000/sklad/api

✅ Successfully synced with 1C
Results: {
  units: { status: 'success', ... },
  warehouses: { status: 'success', ... },
  ...
}
```

Или при ошибке:
```
❌ 1C IS UNAVAILABLE
⚠️  Data synchronization failed - 1C server is not responding

To restore connection, configure these environment variables:
   VITE_1C_BASE_URL      - URL to 1C OData service
   VITE_1C_USERNAME      - Username for 1C authentication
   VITE_1C_PASSWORD      - Password for 1C authentication
```

## Изменения на фронте

### 1. **Создан компонент `OneCStatusBanner.vue`** ✓
Новый компонент в `src/components/layout/OneCStatusBanner.vue`:

**Функциональность:**
- Отображает баннер с статусом соединения 1C
- Только видимы при ошибках (скрыт при успешном соединении)
- Два состояния:
  - 🟢 Зелёный баннер: "✓ Соединение с 1C восстановлено"
  - 🔴 Красный баннер: "❌ 1C НЕДОСТУПНА" или "⚠️ ОШИБКА"

**Интерактивность:**
- Кнопка "Подробно →" открывает модальное окно
- Модальное окно показывает:
  - Статус соединения (connected/unavailable/failed)
  - Время последней синхронизации
  - Количество загруженных данных (stocks, orders, warehouses, units)
  - Ошибку (если есть)
  - Кнопку "Обновить статус" для ручной проверки
  - URL 1C сервера

**Обновление:**
- Проверяет статус каждые 30 секунд автоматически
- Баннер исчезает при успешном соединении
- Пульсирует при ошибке для привлечения внимания

### 2. **Обновлен Layout.vue** ✓
- Добавлен компонент `OneCStatusBanner` в самый верх
- Баннер видим на всех страницах приложения
- Расположен между сайдбаром и содержимым

## API endpoints

### Получить статус 1C
```bash
curl http://localhost:8000/sklad/api/1c/status
```
**Ответ**: 200 (успех) или 503 (ошибка соединения)

### Получить логи синхронизации
```bash
curl http://localhost:8000/sklad/api/sync/logs
```
**Ответ**: JSON массив последних 100 строк логов

## Файлы логов

### `.data/sync.log`
Основной файл логов синхронизации:
```
[2026-05-07T18:26:40.022Z] Units synced: +0 ~0 -0
[2026-05-07T18:26:40.026Z] Warehouses synced: +0 ~9 -0
[2026-05-07T18:26:40.817Z] Stocks synced: +0 ~640 -0
[2026-05-07T18:26:41.019Z] Orders synced: +0 ~55 -1
```

Формат логов:
- `[ISO timestamp]` - время события
- `Units synced: +added ~updated -deleted` - операции по таблице

## Инкрементальная синхронизация

Продолжает работать как реализовано ранее:
- `syncUnitsIncremental()` - синхронизирует unit'ы
- `syncWarehousesIncremental()` - синхронизирует склады
- `syncStocksIncremental()` - синхронизирует материалы
- `syncOrdersIncremental()` - синхронизирует заказы

Каждая функция возвращает статистику:
```javascript
{
  added: 0,      // новые записи
  updated: 640,  // обновлённые записи
  deleted: 0     // удалённые записи
}
```

## Тестирование

### Проверить статус 1C
```bash
curl -s http://localhost:8000/sklad/api/1c/status | jq .
```

### Просмотреть логи
```bash
curl -s http://localhost:8000/sklad/api/sync/logs | jq .
tail -f .data/sync.log
```

### Проверить фронт
1. Откройте приложение в браузере
2. Вверху должен быть баннер (если ошибка) или скрыт (если успех)
3. Нажмите "Подробно →" для просмотра деталей
4. Нажмите "Обновить статус" для ручной проверки

## Примеры вывода

### Успешная синхронизация (при запуске)
```
✅ Backend server running on http://localhost:8000/sklad/api

✓ Units: +0 ~0 -0
✓ Warehouses: +0 ~9 -0
✓ Stocks: +0 ~640 -0
✓ Orders: +0 ~55 -1
✓ Loaded cache from database

✅ Successfully synced with 1C
Results: {
  units: { status: 'success', count: 0, added: 0, updated: 0, deleted: 0 },
  warehouses: { status: 'success', count: 9, added: 0, updated: 9, deleted: 0 },
  stocks: { status: 'success', count: 640, added: 0, updated: 640, deleted: 0 },
  orders: { status: 'success', count: 55, added: 0, updated: 55, deleted: 1 }
}
```

### Ошибка синхронизации (при недоступности 1C)
```
❌ 1C IS UNAVAILABLE
⚠️  Data synchronization failed - 1C server is not responding

To restore connection, configure these environment variables:
   VITE_1C_BASE_URL      - URL to 1C OData service
   VITE_1C_USERNAME      - Username for 1C authentication
   VITE_1C_PASSWORD      - Password for 1C authentication

Check /sklad/api/1c/status for current connection status
Check /sklad/api/sync/logs for synchronization logs
```

## Файлы изменены

### Бэк
- `server.js` - основной файл с изменениями (удаление mockData, логирование, обработка ошибок)

### Фронт
- `src/components/layout/OneCStatusBanner.vue` - новый компонент баннера статуса 1C
- `src/components/layout/Layout.vue` - добавлен импорт и использование нового компонента

## Готово к использованию ✓

Все изменения протестированы и работают корректно:
- ✅ Сервер запускается без ошибок
- ✅ Синхронизация работает правильно
- ✅ Логирование работает
- ✅ Endpoints доступны
- ✅ Фронт компилируется
- ✅ Баннер отображается на фронте
