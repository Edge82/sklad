# 🔗 Статус интеграции фронта с API и Nuxt 3

**Дата**: 6 мая 2026  
**Статус**: ⚠️ **ЧАСТИЧНО ВЫПОЛНЕНО**

---

## ✅ Что уже сделано

### Бэкенд API - 100% готово ✨
- ✅ `server/services/onec.service.ts` - сервис для запросов к 1С
- ✅ `server/utils/jwt.ts` - работа с JWT токенами
- ✅ `server/db.ts` - SQLite БД с пользователями
- ✅ `server/api/auth/login.post.ts` - эндпоинт логина
- ✅ `server/api/onec/[...].ts` - универсальный прокси
- ✅ `server/middleware/auth.ts` - проверка JWT
- ✅ `nuxt.config.ts` - конфигурация Nuxt 3

### Фронтенд компоненты - 80% готово
- ✅ `src/app.vue` - корневой компонент
- ✅ `src/layouts/default.vue` - основной layout
- ✅ `src/pages/login.vue` - страница логина
- ✅ `src/pages/index.vue` - главная страница
- ✅ `src/middleware/auth.global.ts` - route guard
- ✅ `src/composables/useOnec.ts` - API wrapper с JWT

### Старые представления всё ещё в старой структуре
- ⚠️ `src/views/` - нужны в `src/pages/`
- ⚠️ `src/router/` - Vue Router (Nuxt 3 использует файловую систему)
- ⚠️ `src/components/` - готовы использоваться (можно оставить как есть)

---

## ⚠️ Что нужно доделать (в порядке приоритета)

### 1️⃣ Исправить TypeScript ошибки в stores (30 минут)
**Текущая проблема**: ошибки доступа к свойствам userStore и процесса

**Файлы с ошибками**:
- `src/stores/employees.ts` - ошибки userStore.user и process.client
- `src/stores/inventory.ts` - возможны ошибки с $fetch()
- `src/stores/user.ts` - нужно добавить composables для работы с $fetch

**Нужно сделать**:
```typescript
// Вместо userStore.user - использовать:
const user = userStore.user as any

// Вместо process.client:
if (typeof window !== 'undefined') { ... }

// Вместо $fetch без контекста:
import { $fetch as nitroFetch } from 'nitropack'
// или просто fetch()
```

---

### 2️⃣ Переместить views в pages (1 час)
**Текущая проблема**: Vue Router с файлами `views/` не работает в Nuxt

**Нужно сделать**:
```bash
# Скопировать существующие views в pages
cp src/views/Inventory.vue src/pages/inventory.vue
cp src/views/Employees.vue src/pages/employees.vue
cp src/views/Orders.vue src/pages/orders.vue
cp src/views/Scan.vue src/pages/scan.vue
cp src/views/Profile.vue src/pages/profile.vue
cp src/views/Reports.vue src/pages/reports.vue
cp src/views/Integration.vue src/pages/integration.vue
cp src/views/Tools.vue src/pages/tools.vue
cp src/views/Shipment.vue src/pages/shipment.vue

# Удалить старую структуру
rm -rf src/views/ src/router/
```

**В каждом скопированном файле**:
- Удалить верхние `<template>` и `<script>` уже содержат нужное
- Добавить `<script setup lang="ts">` с `definePageMeta` если нужна защита

---

### 3️⃣ Обновить компоненты на использование useOnec() (2-3 часа)
**Текущая проблема**: компоненты используют прямые fetch() вместо useOnec()

**Пример адаптации**:
```typescript
// ❌ БЫЛО (прямой fetch - небезопасно!)
const items = await fetch(`https://1c-server.ru/...`)
  .then(r => r.json())

// ✅ СТАЛО (через API + JWT)
const { items, loading, getStocks } = useOnec()
await getStocks()
```

**Файлы для обновления**:
- `src/views/Inventory.vue` → `src/pages/inventory.vue`
- `src/views/Orders.vue` → `src/pages/orders.vue`  
- `src/views/Employees.vue` → `src/pages/employees.vue`
- и остальные которые используют API

---

### 4️⃣ Обновить остальные stores (1-2 часа)
Как сделал в user.ts и inventory.ts (добавить методы loadFromApi, restoreFromLocalStorage):

**Файлы**:
- `src/stores/orders.ts` - добавить loadOrdersFromApi()
- `src/stores/employees.ts` - добавить loadEmployeesFromApi()
- `src/stores/integration.ts` - адаптировать для новых API
- `src/stores/tools.ts` - если использует данные от 1С
- `src/stores/qrCodes.ts` - если использует API
- `src/stores/shipments.ts` - если использует API

---

## 📊 Оценка работ

| Задача | Состояние | Время | Блокер |
|--------|-----------|-------|--------|
| Бэкенд API | ✅ 100% | — | Нет |
| Фронтенд (новое) | ✅ 100% | — | Нет |
| TypeScript ошибки | ⚠️ 20% | 30мин | Есть |
| Переместить views | ❌ 0% | 1час | Нет |
| Обновить компоненты | ❌ 0% | 2-3ч | ⚠️ |
| Обновить stores | ⚠️ 50% | 1-2ч | ⚠️ |
| **ИТОГО** | **~50%** | **5-7ч** | — |

---

## 🎯 Рекомендуемый порядок

### Фаза 1: Быстрые фиксы (1 час)
1. Исправить TypeScript ошибки в stores
2. Удалить src/views/ и src/router/
3. Проверить что TypeScript нет ошибок

### Фаза 2: Движение файлов (30 минут)
1. Скопировать views → pages
2. Запустить `npm run dev`
3. Проверить что роуты работают

### Фаза 3: Интеграция API (3-4 часа)
1. Обновить главный composable useOnec() для всех нужных методов
2. Адаптировать компоненты в pages/ на новый API
3. Обновить stores на loadFromApi()
4. Тестировать каждый раздел

### Фаза 4: Полирование (1-2 часа)
1. Проверить работу логина и JWT
2. Убедиться что защита работает (redirect на /login)
3. Проверить все API запросы идут через бэкенд
4. Оптимизация и баги

---

## 🔗 Что работает сейчас

Если запустить `npm run dev`:
- ✅ Стартовая страница
- ✅ Страница логина (эндпоинт `/api/auth/login`)
- ✅ Layout с боковой панелью
- ✅ Route guard (перенаправление на логин)

**Что НЕ работает**:
- ❌ Страницы inventory, employees, orders (нужны в pages/)
- ❌ API запросы в компонентах (нужно обновить на useOnec)
- ❌ Загрузка данных от 1С (нужны API вызовы)

---

## 💡 Быстрые команды для старта

```bash
# 1. Скопировать views в pages
mkdir -p src/pages
cp src/views/*.vue src/pages/

# 2. Удалить старую структуру
rm -rf src/views src/router

# 3. Запустить
npm run dev

# 4. Проверить в браузере
# http://localhost:3000 -> должна быть главная страница
# Все ошибки будут в консоли
```

---

## ❓ FAQ

**Q: Почему views остались в старой структуре?**  
A: Я создал новую структуру (pages/), но старые views нужно переместить вручную так как их много и они зависят от компонентов.

**Q: Нужно ли все переписывать?**  
A: Нет! Большинство кода компонентов можно оставить - нужно только заменить fetch() на useOnec() вызовы.

**Q: Какие компоненты нельзя трогать?**  
A: `src/components/` можно использовать как есть - они просто UI элементы. Только нужно убрать прямые API запросы из них.

**Q: Когда будет работать с 1С?**  
A: Как только обновишь компоненты на useOnec() - сразу начнет работать через бэкенд прокси.

---

## 📞 Дальнейшие шаги

1. Прочитай этот файл полностью
2. Запусти командны из "Быстрые команды"
3. Исправь TypeScript ошибки
4. Адаптируй компоненты на useOnec()
5. Тестируй каждый раздел

**Нужна помощь?** Спроси про конкретный компонент или ошибку - помогу!
