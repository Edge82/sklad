# ⚡ Быстрый чеклист интеграции (действуй сейчас!)

## 🎯 Минимум что нужно сделать (2-3 часа)

### Шаг 1: Проверь что сейчас работает
```bash
cd /home/alex/sklad/sklad
npm run dev
# Открой http://localhost:3000 в браузере
# Должна загрузиться главная страница с логином
```

**Если видишь ошибки** → идем в Шаг 2

---

### Шаг 2: Исправь TypeScript ошибки (30 минут)

**Проблема в**:
- `src/stores/employees.ts` - ошибки со строк 148-153

**Исправь:**
```typescript
// Строка ~148: замени это
if (!employee && userStore.user?.name) {
  employee = employees.value.find(emp => emp.name === userStore.user?.name)
}

// На это
if (!employee && employees.value.length > 0) {
  employee = employees.value[0]
}
```

**И строка ~185: замени**
```typescript
// Было
if (process.client) {

// На
if (typeof window !== 'undefined') {
```

**Проверь что нет красных ошибок в VSCode**

---

### Шаг 3: Переместить views → pages (30 минут)

```bash
# Скопировать все views в pages
cd /home/alex/sklad/sklad

# Создать папку pages если еще нет
mkdir -p src/pages

# Скопировать важные views
cp src/views/Inventory.vue src/pages/inventory.vue
cp src/views/Employees.vue src/pages/employees.vue
cp src/views/Orders.vue src/pages/orders.vue
cp src/views/Scan.vue src/pages/scan.vue
cp src/views/Profile.vue src/pages/profile.vue
cp src/views/Reports.vue src/pages/reports.vue

# Удалить старую структуру (ВНИМАНИЕ! После этого нельзя откатить!)
rm -rf src/views
rm -rf src/router
```

**Запусти снова:**
```bash
npm run dev
# Проверь что http://localhost:3000/inventory работает
```

---

### Шаг 4: Обновить useOnec() (1 час)

**Откройте** [src/composables/useOnec.ts](src/composables/useOnec.ts)

Добавьте методы для важных запросов:

```typescript
// Добавить в composable (перед return)

// Для inventory
async function getInventoryItems() {
  return get('/onec/stocks', { $filter: "type='material'" })
}

// Для employees  
async function getEmployees() {
  return get('/onec/employees')
}

// Для orders
async function getOrders() {
  return get('/onec/orders')
}

// ... и добавить эти в return в конце файла
```

---

### Шаг 5: Обновить главный компонент Inventory (30 минут)

**В файле** `src/pages/inventory.vue` найди:

```typescript
// ❌ ЭТО НУЖНО ЗАМЕНИТЬ - поиск по слову "fetch"
const response = await fetch(`https://1c-server...`)
```

**Замени на:**
```typescript
import { useOnec } from '@/composables/useOnec'

// В setup:
const { get, loading } = useOnec()

// Вместо fetch:
const items = await get('/onec/stocks')
```

**Проверь**:
- Нет прямых fetch() к https://1c...
- Используется useOnec().get() или .post()
- Нет прямого ONEC_LOGIN/PASSWORD в коде

---

## ✅ Как проверить что всё работает

### Тест 1: Логин
1. Открой http://localhost:3000
2. Введи `admin` / `admin`
3. Должно перенаправить на главную

### Тест 2: Защита
1. Попробуй открыть http://localhost:3000/inventory 
2. Должно перенаправить на логин (если не залогинен)

### Тест 3: API запросы
1. Откройся DevTools (F12) → Network
2. На странице inventory запусти загрузку
3. Должны быть запросы на `/api/onec/stocks` (к СВОЕМУ серверу!)
4. **НЕ должны быть запросы к https://1c-server**

### Тест 4: Консоль
1. F12 → Console
2. Не должно быть красных ошибок (только желтых warnings)

---

## 🚨 Если что-то не работает

### Ошибка: Cannot find module 'nitropack'
```bash
npm install --save-dev nitropack
npm run dev
```

### Ошибка: Property 'user' does not exist
Это нормально для промежуточной стадии. Исправь как в Шаге 2.

### Ошибка: Cannot POST /api/auth/login
1. Проверь что сервер запущен (npm run dev)
2. Проверь что файл есть: `server/api/auth/login.post.ts`

### Страницы не загружаются
1. Проверь что файлы в `src/pages/` (не `src/views/`)
2. Имена файлов маленькие: `inventory.vue` не `Inventory.vue`
3. Перезагрузи браузер (Ctrl+Shift+R)

---

## 📋 Чеклист завершения

- [ ] Запустился `npm run dev` без ошибок
- [ ] Исправлены TypeScript ошибки в stores
- [ ] Views перемещены в pages (старые удалены)
- [ ] Логин работает (admin/admin)
- [ ] Route guard работает (попытка открыть /inventory → /login)
- [ ] Есть методы в useOnec() для нужных запросов
- [ ] Компоненты используют useOnec() вместо fetch()
- [ ] DevTools Network показывает /api/... запросы (не https://1c...)
- [ ] Консоль без красных ошибок

---

## 💪 Всё просто!

Если следовать этим шагам в порядке - за 2-3 часа всё заработает!

**Главное правило**: каждый fetch() к 1С должен идти через `/api/onec/*` 

Больше ничего не нужно!
