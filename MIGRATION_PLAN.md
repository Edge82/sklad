# 📋 План миграции на Nuxt 3 + Бэкенд API

## 🎯 Стратегия миграции

```
Текущее состояние:          Vue 3 + Vite (SPA)
                           ↓
                    Nuxt 3 + Nitro (fullstack)
```

### Фаза 1: Подготовка (2-3 часа)
- [x] Проанализирована текущая структура
- [ ] Установлены зависимости Nuxt
- [ ] Переведён router на file-based (pages/)
- [ ] Перенесены composables и components

### Фаза 2: Бэкенд (4-6 часов)
- [ ] Создана база данных SQLite (users, sessions)
- [ ] Реализована авторизация (JWT)
- [ ] Написан сервис для проксирования к 1С
- [ ] Созданы API маршруты

### Фаза 3: Интеграция фронта (2-3 часа)
- [ ] Адаптированы composables для новых API
- [ ] Добавлена передача JWT токенов
- [ ] Переделана страница login

---

## 📁 Новая структура проекта

```
nuxt-warehouse/
├── server/                          # ← НОВОЕ
│   ├── api/
│   │   ├── auth/
│   │   │   └── login.post.ts       # POST /api/auth/login
│   │   ├── onec/
│   │   │   ├── stocks.get.ts       # GET /api/onec/stocks
│   │   │   ├── goods.get.ts        # GET /api/onec/goods
│   │   │   ├── movement.post.ts    # POST /api/onec/movement
│   │   │   └── [endpoint].get.ts   # Универсальный прокси
│   │   ├── user.get.ts             # GET /api/user (текущий юзер)
│   │   └── logout.post.ts          # POST /api/logout
│   ├── middleware/
│   │   └── auth.ts                 # Проверка JWT
│   ├── services/
│   │   └── onec.service.ts         # Единая функция к 1С
│   ├── utils/
│   │   ├── jwt.ts                  # Работа с токенами
│   │   └── db.ts                   # SQLite wrapper
│   └── db.ts                        # Инициализация БД
│
├── pages/                           # ← НОВОЕ (вместо views/)
│   ├── login.vue
│   ├── index.vue                    # redirect → inventory
│   ├── inventory.vue                # (из views/Inventory.vue)
│   ├── inventory/
│   │   └── finished.vue
│   ├── orders.vue
│   ├── employees.vue
│   ├── profile.vue
│   ├── scan.vue
│   ├── tools.vue
│   ├── integration.vue
│   ├── shipment.vue
│   └── reports.vue
│
├── components/                      # ← Копируем как есть
│   ├── common/
│   ├── employees/
│   ├── inventory/
│   ├── layout/
│   ├── orders/
│   └── tools/
│
├── composables/                     # ← Копируем + адаптируем
│   ├── useAuth.ts                   # ← ПЕРЕДЕЛАТЬ
│   ├── useOnec.ts                   # ← НОВОЕ (вместо direct fetch)
│   └── useStockBalances.ts          # ← Копируем
│
├── stores/                          # ← Копируем как есть
│   ├── user.ts
│   ├── inventory.ts
│   ├── orders.ts
│   ├── employees.ts
│   ├── integration.ts
│   ├── qrCodes.ts
│   ├── tools.ts
│   └── shipments.ts
│
├── types/
│   └── index.ts                     # ← Копируем
│
├── utils/
│   └── *.ts                         # ← Копируем
│
├── middleware/
│   └── auth.global.ts               # ← НОВОЕ (route guard)
│
├── layouts/
│   └── default.vue                  # ← НОВОЕ (вместо App.vue)
│
├── app.vue                          # ← НОВОЕ (простой root layout)
├── nuxt.config.ts                   # ← НОВОЕ
├── tsconfig.json                    # ← ОБНОВИТЬ
├── .env                             # ← ОБНОВИТЬ
└── package.json                     # ← ОБНОВИТЬ
```

---

## 🔧 Перечень всех файлов, которые нужно создать/изменить

### НОВЫЕ файлы (создать):
1. **server/services/onec.service.ts** - 30 строк
2. **server/api/auth/login.post.ts** - 40 строк
3. **server/api/onec/stocks.get.ts** - 15 строк
4. **server/api/onec/[endpoint].get.ts** - 10 строк
5. **server/api/user.get.ts** - 10 строк
6. **server/middleware/auth.ts** - 20 строк
7. **server/utils/jwt.ts** - 30 строк
8. **server/db.ts** - 50 строк
9. **composables/useOnec.ts** - 40 строк (новая)
10. **middleware/auth.global.ts** - 20 строк
11. **pages/login.vue** - 100 строк
12. **pages/index.vue** - 10 строк
13. **app.vue** - 20 строк
14. **nuxt.config.ts** - 50 строк

### ИЗМЕНЯЕМЫЕ файлы:
- package.json - добавить Nuxt зависимости
- composables/* - адаптировать для `$fetch` вместо `fetch`
- stores/* - может потребоваться небольшая адаптация

### УДАЛЯЕМЫЕ файлы:
- vite.config.ts
- vitest.config.ts
- router/ (вся папка)
- views/ (вся папка, заменится на pages/)
- main.ts
- index.html
- App.vue (заменится на app.vue + layouts/)
- postcss.config.js
- tsconfig.node.json
- tsconfig.app.json
- eslint.config.ts

---

## 📊 Ориентировочные затраты времени

| Компонент | Время | Сложность |
|-----------|-------|-----------|
| Установка Nuxt + deps | 30 мин | ⭐ |
| Адаптация структуры фронта | 1 ч | ⭐⭐ |
| Написание сервиса 1С | 1 ч | ⭐⭐ |
| API маршруты | 1.5 ч | ⭐⭐ |
| Авторизация (JWT + SQLite) | 1.5 ч | ⭐⭐⭐ |
| Адаптация composables | 1 ч | ⭐⭐ |
| Тестирование | 1 ч | ⭐⭐ |
| **ИТОГО** | **~7 часов** | |

---

## 🚀 Начало работы

### Шаг 1: Инициализация Nuxt
```bash
npm install nuxt @nuxt/devtools
npm install pinia pinia-plugin-persistedstate
npm install jsonwebtoken
npm install better-sqlite3
npm install h3 @h3/
```

### Шаг 2: Удалить старые файлы
```bash
rm -rf src/router src/views src/main.ts
rm -f vite.config.ts vitest.config.ts index.html app.vue
```

### Шаг 3: Создать новую структуру
```bash
mkdir -p server/api/auth server/api/onec server/middleware server/services server/utils
mkdir -p pages middleware layouts
```

### Шаг 4: Копировать компоненты
```bash
# components/, composables/, stores/, types/, utils/ → остаются как есть
# (но адаптируются некоторые)
```

---

## ✅ Чек-лист выполнения

### Подготовка
- [ ] Сделан бэкап текущего проекта (`git commit`)
- [ ] Установлены зависимости Nuxt
- [ ] Созданы директории server/

### Бэкенд
- [ ] Работает SQLite БД с таблицей users
- [ ] JWT токены генерируются и проверяются
- [ ] POST /api/auth/login возвращает токен
- [ ] GET /api/onec/stocks → успешный прокси к 1С

### Фронт
- [ ] Переведены все pages с routing
- [ ] Middleware проверяет авторизацию
- [ ] Login форма работает и сохраняет токен
- [ ] useOnec composable отправляет запросы с токеном

### Интеграция
- [ ] Все компоненты работают без ошибок
- [ ] 1С запросы идут через API
- [ ] Логин/логаут работает
- [ ] Пользователи из разных браузеров изолированы

---

## 📌 Важные моменты

1. **Миграция views → pages**: Просто переименовать файлы, Nuxt автоматически создаст routes
2. **API для 1С**: Все запросы идут через `/api/onec/[resource]`, не напрямую к 1С серверу
3. **JWT в локальной сети**: Достаточно простой HS256 подписи с SECRET из .env
4. **SQLite**: Хранится в `.data/app.db`, не нужна отдельная база данных
5. **CORS**: На локальной сети обычно отключен, но middleware его не требует

---

Далее будут созданы все файлы с полным кодом.
