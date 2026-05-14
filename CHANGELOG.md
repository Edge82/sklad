# CHANGELOG - Миграция QR Кодов на Бэкенд

## [1.0.0] - 2025-01-15

### Добавлено (Backend)

#### Новые таблицы БД
- `local_qr_codes` - Персистентное хранилище QR кодов
  - Глобально уникальные коды
  - Отслеживание статуса (generated, scanned, shipped, deleted)
  - Информация о создании и сканировании
  - Индексы для быстрого поиска

- `operation_logs` - Логирование всех операций
  - operation_type - Тип операции
  - employee_id, employee_name - Сотрудник
  - order_id, order_number - Заказ
  - product_id, product_name - Товар
  - qr_code_id, qr_code - QR код
  - details (JSON) - Дополнительные данные
  - status - Статус операции (success, error, warning)
  - created_at - Временная метка

#### Новая функция
- `logOperation(operationType, data)` - Централизованное логирование операций

#### Новые API Endpoints

**QR Code Operations:**
- `POST /sklad/api/orders/{orderId}/qr-codes/generate` - Генерирование QR кодов
- `GET /sklad/api/orders/{orderId}/qr-codes` - Получить коды заказа
- `POST /sklad/api/qr-codes/{qrCodeId}/scan` - Отсканировать код
- `DELETE /sklad/api/qr-codes/{qrCodeId}` - Удалить код

**Order Operations:**
- `POST /sklad/api/onec/orders/painting` - Обновить окраску (добавлено логирование)

**Operation Logging:**
- `GET /sklad/api/operation-logs` - Получить логи с фильтрацией
- `GET /sklad/api/employees/{employeeId}/operations` - Последние операции сотрудника
- `GET /sklad/api/operation-logs/stats` - Статистика операций

### Добавлено (Frontend)

#### Новый компонент
- `src/components/employees/EmployeeOperationHistory.vue` - Отображение истории операций
  - Timeline визуализация
  - Динамическая загрузка большего количества
  - Иконки для разных операций
  - Парсинг JSON деталей

#### Обновленные компоненты
- `src/components/orders/OrderDetails.vue`
  - Загрузка QR кодов с бэкенда при монтировании
  - Логирование обновления окраски
  - Состояние загрузки при сохранении

- `src/components/employees/EmployeeDetails.vue`
  - Новая вкладка "История операций"
  - Импорт EmployeeOperationHistory компонента

#### Переписанные Stores

**src/stores/qrCodes.ts**
- Все методы теперь асинхронные
- Вызывают бэкенд API вместо локального хранилища
- `generateQRCodes()` - Отправка на бэкенд
- `loadQRCodesForOrder()` - Загрузка с бэкенда
- `updateQRCodeStatus()` - Обновление статуса с логированием
- `removeQRCode()` - Удаление с логированием
- `clearCodesForOrder()` - Очистка локального стора
- Добавлены: `loading`, `error` состояния

**src/stores/orders.ts**
- `updateOrderPainting()` - Обновление окраски
- `logOperation()` - Отправка логов на бэкенд

### Изменено

#### Архитектура
- **Было:** QR коды только в памяти/localStorage, потеря при перезагрузке
- **Стало:** QR коды на бэкенде, персистентны, с полной историей

#### Фронтенд логика
- Все операции с заказами теперь асинхронные
- Добавлена обработка состояния загрузки
- Логирование операций интегрировано в UI

#### БД структура
- Добавлены индексы на часто используемые поля
- Оптимизация для быстрого поиска и фильтрации

### Документация

- `QR_CODES_MIGRATION.md` - Полная техническая документация
- `MIGRATION_SUMMARY.md` - Резюме выполненных работ
- `USER_GUIDE_QR_CODES.md` - Инструкция для конечных пользователей
- `CHANGELOG.md` - Этот файл

### Примеры Использования

#### Генерирование QR кодов
```javascript
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
```

#### Загрузка QR кодов
```javascript
const codes = await qrStore.loadQRCodesForOrder('order-123')
```

#### Отсканирование
```javascript
await qrStore.updateQRCodeStatus(
  'qr-123',
  'scanned',
  'John Doe',
  'emp-123'
)
```

#### Логирование операции
```javascript
const ordersStore = useOrdersStore()
await ordersStore.logOperation('order_painting_updated', {
  orderId: 'order-123',
  orderNumber: 'ORD-2025-001',
  newValue: 'Красная матовая'
})
```

### Тестирование

Все endpoints протестированы:
- curl команды в USER_GUIDE_QR_CODES.md
- Интеграция с Vue компонентами
- Работа с Pinia stores

### Известные Ограничения

- Старые QR коды из localStorage (если были) не мигрируют автоматически
- Логирование требует заполнения employee_id (может быть null)
- История операций хранится только локально (опционально можно добавить экспорт)

### Требования

- Node.js 18+ (для сервера)
- Vue 3 + TypeScript (для фронтенда)
- SQLite3 (входит в better-sqlite3)
- Naive UI компоненты

### Обратная Совместимость

✅ Полная обратная совместимость с существующей системой:
- Заказы продолжают загружаться из 1С
- Окраска продолжает работать
- Все существующие компоненты продолжают работать
- Новые функции добавлены поверх существующей системы

### Планы на Будущее

- [ ] Экспорт логов в CSV/Excel
- [ ] Аналитика по операциям (графики, тренды)
- [ ] Нотификации при критических событиях
- [ ] Ролевой доступ к логам
- [ ] Автоматический бэкап БД
- [ ] Синхронизация логов в 1С
- [ ] Полнотекстовый поиск по деталям операций
- [ ] REST API документация (Swagger)

## Контакты и Поддержка

По вопросам и проблемам, пожалуйста, обратитесь к разработчику системы.

---

**Дата обновления:** 2025-01-15  
**Версия:** 1.0.0  
**Статус:** Готово к производству
