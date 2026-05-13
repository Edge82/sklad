# 🚀 Инструкция по завершению миграции на Nuxt 3

## ✅ Что уже создано

### 📂 Структура бэкенда
- [x] `server/services/onec.service.ts` - Сервис для запросов к 1С
- [x] `server/utils/jwt.ts` - Работа с JWT токенами
- [x] `server/db.ts` - SQLite БД и функции
- [x] `server/api/auth/login.post.ts` - Эндпоинт логина
- [x] `server/api/onec/stocks.get.ts` - Пример прокси-маршрута
- [x] `server/api/onec/[...].ts` - Универсальный прокси
- [x] `server/api/user.get.ts` - Информация о текущем юзере
- [x] `server/api/logout.post.ts` - Логаут
- [x] `server/middleware/auth.ts` - Проверка JWT

### 📂 Структура фронтенда
- [x] `nuxt.config.ts` - Конфигурация Nuxt
- [x] `src/app.vue` - Корневой компонент
- [x] `src/layouts/default.vue` - Основной layout
- [x] `src/pages/login.vue` - Страница логина
- [x] `src/pages/index.vue` - Главная страница
- [x] `src/middleware/auth.global.ts` - Route guard
- [x] `src/composables/useOnec.ts` - Работа с 1С API
- [x] `.env` - Переменные окружения

---

## 📋 TODO: Что нужно сделать вручную

### 1️⃣ **Установка зависимостей** (15 мин)

```bash
# Установите эти пакеты
npm install --save-dev nuxt @nuxt/devtools
npm install pinia pinia-plugin-persistedstate
npm install jsonwebtoken bcrypt
npm install better-sqlite3
npm install --save-dev @types/better-sqlite3 @types/jsonwebtoken

# Обновите package.json скрипты:
# "dev": "nuxt dev"
# "build": "nuxt build"
# "preview": "nuxt preview"
```

### 2️⃣ **Удалить старые файлы** (5 мин)

```bash
# Старые файлы Vite/Vue Router
rm -rf src/router src/views src/main.ts
rm -f vite.config.ts vitest.config.ts index.html
rm -f src/App.vue  # Заменён на app.vue в src/

# Файлы которые больше не нужны в root
rm -f postcss.config.js tsconfig.node.json tsconfig.app.json eslint.config.ts
```

### 3️⃣ **Переместить views → pages** (10 мин)

Так как в текущем проекте используется `src/views/`, нужно переместить в `src/pages/`:

```bash
# Примеры файлов которые нужно создать:
src/pages/
├── inventory.vue         # ← из views/Inventory.vue
├── inventory/
│   └── finished.vue      # ← из views/Inventory.vue (mode='product')
├── orders.vue            # ← из views/Orders.vue
├── employees.vue         # ← из views/Employees.vue
├── profile.vue           # ← из views/Profile.vue
├── scan.vue              # ← из views/Scan.vue
├── tools.vue             # ← из views/Tools.vue
├── integration.vue       # ← из views/Integration.vue
├── shipment.vue          # ← из views/Shipment.vue
└── reports.vue           # ← из views/Reports.vue

# Для каждого файла добавить в начало:
# <script setup lang="ts">
# definePageMeta({
#   layout: 'default'
# })
# </script>
```

### 4️⃣ **Адаптировать composables** (20 мин)

Если в текущем коде есть composables которые используют прямые запросы к 1С, нужно их изменить:

**Было:**
```typescript
// services/onec.ts
const ONEC_URL = 'http://1c-server/odata/...'
const ONEC_AUTH = btoa('login:password')

export const getStocks = () => {
  return fetch(`${ONEC_URL}/Stocks`, {
    headers: { Authorization: `Basic ${ONEC_AUTH}` }
  })
}
```

**Теперь:**
```typescript
// composables/useOnec.ts (уже создан!)
export function useOnec() {
  async function getStocks() {
    return useOnec().get('stocks')  // GET /api/onec/stocks
  }
}
```

### 5️⃣ **Обновить stores (Pinia)** (15 мин)

Добавить в `src/stores/user.ts`:

```typescript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  const user = ref<any>(null)
  const token = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  function setUser(userData: any) {
    user.value = userData
    token.value = userData.token
  }

  function logout() {
    user.value = null
    token.value = null
    localStorage.removeItem('auth_token')
  }

  async function restoreSessionFromToken(savedToken: string) {
    try {
      const userData = await $fetch('/api/user', {
        headers: { Authorization: `Bearer ${savedToken}` }
      })
      token.value = savedToken
      user.value = { ...userData, token: savedToken }
    } catch {
      throw new Error('Failed to restore session')
    }
  }

  return {
    user: computed(() => user.value),
    token: computed(() => token.value),
    isAuthenticated,
    setUser,
    logout,
    restoreSessionFromToken
  }
})
```

### 6️⃣ **Инициализировать БД с тестовыми пользователями** (10 мин)

Создайте файл `scripts/init-db.ts`:

```typescript
import { createUser } from '../server/db'
import { hash } from 'bcrypt'

async function initDB() {
  try {
    const hashedPassword = await hash('admin', 10)
    
    createUser('admin', hashedPassword, 'Administrator', 'director')
    createUser('manager', hashedPassword, 'Manager', 'manager')
    createUser('storekeeper', hashedPassword, 'Storekeeper', 'storekeeper')
    
    console.log('✅ БД инициализирована с тестовыми пользователями')
  } catch (error) {
    console.error('❌ Ошибка инициализации:', error)
  }
}

initDB()
```

Запустить:
```bash
node --loader tsx scripts/init-db.ts
```

### 7️⃣ **Проверить компоненты** (30 мин)

Компоненты в `src/components/` скорее всего работают как есть, но нужно проверить:

- [ ] Компоненты импортируют composables правильно
- [ ] Нет прямых `fetch` запросов (заменить на `useOnec().get()`)
- [ ] Нет использования старого роутера (`$router.push()` → `navigateTo()`)

### 8️⃣ **Проверить переменные окружения** (5 мин)

В `.env` уже заполнены значения, но проверьте:

```bash
# .env должен содержать:
JWT_SECRET=your-secret-key
ONEC_BASE_URL=https://msk1.1cfresh.com/api-1c/a/sbm/3784912
ONEC_LOGIN=odata.user
ONEC_PASSWORD=HoroshkoUserSklad
NODE_ENV=development
PORT=3000
```

---

## 🧪 Тестирование

### Запустить разработку
```bash
npm run dev
# Приложение будет доступно на http://localhost:3000
```

### Последовательность проверок

1. **Загрузка приложения**
   - [ ] Попадаем на страницу `/login` (если не авторизованы)
   - [ ] Нет ошибок в консоли браузера

2. **Логин**
   - [ ] Форма загружается
   - [ ] Кнопка отправляет POST `/api/auth/login`
   - [ ] Получен токен
   - [ ] Редирект на `/inventory`

3. **Авторизация**
   - [ ] Токен сохранён в localStorage
   - [ ] Проверка доступна через DevTools → Application → LocalStorage

4. **API запросы**
   - [ ] GET `/api/onec/stocks` возвращает данные от 1С
   - [ ] В консоли видны заголовки: `Authorization: Bearer <token>`

5. **Логаут**
   - [ ] Кнопка логаута чистит токен
   - [ ] Редирект на `/login`

---

## 🔍 Отладка

### Если GET /api/onec/stocks вернул 401

```
Причина: Токен не валиден или не отправлен
Решение: 
1. Проверить что токен в localStorage
2. Проверить что заголовок Authorization: Bearer <token> отправляется
3. Проверить что server/middleware/auth.ts подключен
```

### Если 1С возвращает 401

```
Причина: Неверные логин/пароль в .env
Решение:
1. Проверить ONEC_LOGIN и ONEC_PASSWORD в .env
2. Проверить что ONEC_BASE_URL доступен: curl https://...
```

### Если БД не инициализирована

```
Причина: Пакет better-sqlite3 не установлен или не скомпилирован
Решение:
1. npm install better-sqlite3
2. npm rebuild  # пересобрать native модули
```

---

## 📊 Ориентировочное время выполнения

| Шаг | Время |
|-----|-------|
| Установка deps | 5 мин |
| Удаление старых файлов | 5 мин |
| Перемещение views → pages | 10 мин |
| Адаптация composables | 20 мин |
| Обновление stores | 15 мин |
| Инициализация БД | 10 мин |
| Проверка компонентов | 30 мин |
| Проверка переменных | 5 мин |
| **ВСЕГО** | **~100 мин (1.5-2 часа)** |

---

## 🎯 Финальная проверка

```bash
# Убедитесь что всё работает:
npm run dev

# В браузере откройте http://localhost:3000
# Логин: admin
# Пароль: admin

# Проверьте Network в DevTools:
# - POST /api/auth/login (200)
# - GET /api/onec/stocks (200, с заголовком Authorization)
# - Перезагрузка страницы → восстановление сессии из localStorage
```

---

## ❓ Часто задаваемые вопросы

**Q: Куда делась папка router/?**
A: В Nuxt маршруты создаются автоматически по структуре `pages/`. Файл `src/pages/inventory.vue` → маршрут `/inventory`.

**Q: Как переделать сложный page с параметрами?**
A: Используйте `[id].vue` для динамических маршрутов. Пример: `pages/orders/[id].vue` → `/orders/123`.

**Q: Зачем нужен middleware/auth.global.ts?**
A: Это route guard который запускается перед каждым переходом. Проверяет есть ли токен для protected routes.

**Q: Можно ли не использовать SQLite?**
A: Да, но тогда авторизация не будет работать локально. Для простой интеграции используйте хранилище 1С.

---

✅ **Готово к миграции!**

После выполнения всех пунктов приложение должно полностью работать на Nuxt 3 с бэкенд API.
