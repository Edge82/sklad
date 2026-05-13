# 📦 Миграция на Nuxt 3 + Бэкенд API - Полное решение

## 🎯 Обзор проекта

Это **полный рабочий пример** миграции Vue 3 + Vite приложения на **Nuxt 3 fullstack** с:
- ✅ Бэкенд API на Nitro (H3)
- ✅ JWT авторизацией и SQLite БД
- ✅ Проксированием запросов к 1С OData
- ✅ Примерами адаптации существующего кода

---

## 📁 Структура файлов

### Новые файлы бэкенда (server/)

```
server/
├── api/
│   ├── auth/
│   │   └── login.post.ts         # Логин пользователя → JWT токен
│   ├── onec/
│   │   ├── stocks.get.ts         # Пример: GET /api/onec/stocks
│   │   ├── [...].ts              # Универсальный прокси для всех запросов
│   │   └── ...
│   ├── user.get.ts               # Информация о текущем юзере
│   └── logout.post.ts            # Логаут
├── middleware/
│   └── auth.ts                   # Проверка JWT на /api/onec/*
├── services/
│   └── onec.service.ts           # Сервис запросов к 1С OData
├── utils/
│   └── jwt.ts                    # Генерация и проверка токенов
└── db.ts                         # SQLite инициализация и функции
```

### Новые файлы фронтенда (src/)

```
src/
├── pages/                        # File-based routing (вместо router/)
│   ├── index.vue                 # Главная
│   ├── login.vue                 # Логин
│   ├── inventory.vue             # Склад (из views/Inventory.vue)
│   └── ...
├── layouts/
│   └── default.vue               # Основной layout с меню
├── middleware/
│   └── auth.global.ts            # Route guard для авторизации
├── composables/
│   └── useOnec.ts                # Новый composable для API запросов
└── stores/                       # Pinia (копируем как есть)
```

### Конфигурационные файлы

```
├── nuxt.config.ts                # Конфигурация Nuxt 3
├── .env                          # Переменные окружения
└── MIGRATION_PLAN.md             # План миграции
```

---

## 🚀 Быстрый старт

### 1️⃣ Установка зависимостей

```bash
npm install --save-dev nuxt @nuxt/devtools
npm install pinia pinia-plugin-persistedstate
npm install jsonwebtoken bcrypt better-sqlite3
npm install --save-dev @types/better-sqlite3 @types/jsonwebtoken
```

### 2️⃣ Запуск разработки

```bash
npm run dev
# Приложение на http://localhost:3000
```

### 3️⃣ Логин

- Логин: `admin`
- Пароль: `admin`

(Пользователи инициализируются при первом запуске)

---

## 📖 Документация

### Для понимания архитектуры
👉 **[MIGRATION_PLAN.md](./MIGRATION_PLAN.md)** - полный план и новая структура

### Для адаптации существующего кода
👉 **[CODE_MIGRATION_EXAMPLES.md](./CODE_MIGRATION_EXAMPLES.md)** - примеры "было → стало"

### Для выполнения всех шагов
👉 **[MIGRATION_CHECKLIST.md](./MIGRATION_CHECKLIST.md)** - пошаговый чеклист

---

## 🔑 Ключевые компоненты

### server/services/onec.service.ts

Единая функция для всех запросов к 1С OData:

```typescript
import { onecRequest, getStocks, createMovement } from '~/server/services/onec.service'

// Универсальный запрос
const data = await onecRequest('/Catalog_Materials?$format=json')

// Удобные функции-обёртки
const stocks = await getStocks()
const goods = await getGoods()
const result = await createMovement(data)
```

### server/utils/jwt.ts

Генерация и проверка JWT токенов:

```typescript
import { generateToken, verifyToken } from '~/server/utils/jwt'

// Генерируем при логине
const token = generateToken({ userId: 1, login: 'admin', role: 'director' })

// Проверяем в middleware
const payload = verifyToken(token) // → { userId, login, role }
```

### server/db.ts

Работа с SQLite БД:

```typescript
import { findUserByLogin, createUser, createSession } from '~/server/db'

// Ищем пользователя
const user = findUserByLogin('admin')

// Создаём нового (например, в админке)
createUser('manager', hashedPassword, 'John Manager', 'manager')

// Логируем сессии
createSession(userId, token, ipAddress, userAgent)
```

### composables/useOnec.ts

Фронтенд-composable для работы с API:

```typescript
import { useOnec } from '~/composables/useOnec'

const { get, post, getStocks, isLoading, error } = useOnec()

// GET запрос к 1С (с автоматическим JWT)
const stocks = await getStocks()

// С фильтром
const filtered = await getStocks("name~contains~'фанера'")

// POST запрос
await post('Document_Movement', data)
```

---

## 🔐 Поток авторизации

```
1. Пользователь на /login вводит логин/пароль
   ↓
2. POST /api/auth/login
   ↓
3. Сервер проверяет пароль в SQLite БД
   ↓
4. Генерирует JWT токен (exp: 7 дней)
   ↓
5. Возвращает { token, user }
   ↓
6. Фронт сохраняет token в localStorage
   ↓
7. Все запросы к /api/onec/* идут с заголовком:
   Authorization: Bearer <token>
   ↓
8. server/middleware/auth.ts проверяет токен
   ↓
9. Если валиден → запрос проходит
   ↓
10. server/services/onec.service.ts отправляет запрос к 1С
    с Basic Auth (login:password из .env)
```

---

## 📊 Сравнение: Было → Стало

| Аспект | Было | Стало |
|--------|------|-------|
| **Фреймворк** | Vue 3 + Vite | Nuxt 3 |
| **Бэкенд** | ❌ Нет | ✅ Nitro (H3) |
| **Маршрутизация** | Конфиг роутера | File-based (pages/) |
| **Логин/пароль 1С** | В браузере 🔓 | На сервере 🔒 |
| **Авторизация фронта** | ❌ Нет | ✅ JWT токены |
| **БД пользователей** | ❌ Нет | ✅ SQLite |
| **API к 1С** | Прямые запросы | Через бэкенд |
| **CORS проблемы** | Возможны | Решены (на сервере) |
| **Безопасность** | Низкая | Высокая |

---

## 🧪 Тестирование

### Проверка логина

```bash
# В консоли браузера
fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ login: 'admin', password: 'admin' })
})
.then(r => r.json())
.then(d => console.log(d))
```

### Проверка 1С запроса

```bash
# Получаем токен
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"login":"admin","password":"admin"}' | jq -r '.token')

# Запрашиваем материалы
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/onec/stocks
```

---

## ⚙️ Конфигурация 1С

В `.env` файле установите координаты вашей 1С:

```env
# Базовый URL к OData API 1С
ONEC_BASE_URL=https://msk1.1cfresh.com/api-1c/a/sbm/3784912

# Учетные данные пользователя OData в 1С
ONEC_LOGIN=odata.user
ONEC_PASSWORD=HoroshkoUserSklad
```

---

## 🔍 Отладка

### Логирование на сервере

В `server/services/onec.service.ts` раскомментируйте:

```typescript
console.log(`[1C] ${method} ${url}`) // Будет логирвать все запросы
```

### DevTools

Используйте встроенные DevTools Nuxt:
```
Нажмите Shift + Alt + D в браузере
```

### Базовая диагностика

```bash
# Проверить БД создана
ls -la .data/app.db

# Посмотреть логи сервера
npm run dev 2>&1 | grep -i error

# Проверить переменные окружения
cat .env | grep -v "^#"
```

---

## 📚 Структура документации

| Файл | Для кого | Содержит |
|------|----------|----------|
| [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) | Архитекторов | План, структура, время |
| [MIGRATION_CHECKLIST.md](./MIGRATION_CHECKLIST.md) | Разработчиков | Пошаговые инструкции |
| [CODE_MIGRATION_EXAMPLES.md](./CODE_MIGRATION_EXAMPLES.md) | Разработчиков | Примеры рефакторинга |
| [README.md](./README.md) | Всех | Обзор и быстрый старт |

---

## ✅ Готово к использованию!

Все файлы созданы и готовы к использованию. Следуйте пошаговому чеклисту в **[MIGRATION_CHECKLIST.md](./MIGRATION_CHECKLIST.md)** для полной миграции вашего проекта.

---

## 💡 Полезные советы

1. **Не переписывайте всё сразу** - мигрируйте по одной странице за раз
2. **Тестируйте 1С запросы** - убедитесь что сервис `onecRequest()` работает
3. **Проверяйте Network** - смотрите что точно отправляется/получается
4. **Используйте TypeScript** - типизация спасает при рефакторинге
5. **Кэшируйте данные** - используйте Pinia для часто запрашиваемых данных

---

## 📞 Поддержка

При возникновении вопросов:
1. Проверьте **[MIGRATION_CHECKLIST.md](./MIGRATION_CHECKLIST.md)** 
2. Посмотрите примеры в **[CODE_MIGRATION_EXAMPLES.md](./CODE_MIGRATION_EXAMPLES.md)**
3. Проверьте логи сервера (console)
4. Используйте DevTools браузера (Network, Application tabs)

---

**Happy coding! 🚀**
