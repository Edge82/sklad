# furniture-warehouse-system

Полнофункциональная система управления складом мебели с интеграцией 1C OData.

## 🚀 Быстрый старт

```sh
# Установить зависимости
npm install

# Запустить с mock данными (разработка)
npm run dev

# С подключением к реальной 1C (продакшн)
cp .env.example .env
# Отредактируйте .env с вашими параметрами 1C
npm run dev
```

## 📚 Документация

- **[Интеграция с 1C](./docs/1C_SETUP.md)** - Полная инструкция по подключению 1C OData
- **[Развертывание](./DEPLOY.md)** - Инструкции по развертыванию в production

## 🏗️ Архитектура

```
Фронт (Vue 3 + Vite)
    ↓
Бэк (Node.js HTTP сервер)
    ├─ SQLite БД
    ├─ JWT Аутентификация
    └─ 1C OData Синхронизация
```

## 🎯 Основные возможности

- ✅ Управление остатками товаров
- ✅ Управление заказами
- ✅ Синхронизация с 1C OData
- ✅ JWT аутентификация
- ✅ SQLite кэширование
- ✅ Graceful fallback на mock данные
- ✅ Ролевая система доступа

## 🔧 Рекомендуемая IDE конфигурация

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar)

## 📖 Дополнительно

### Type Support for `.vue` Imports in TS

TypeScript не может обработать информацию о типах для импортов `.vue` по умолчанию, поэтому мы используем `vue-tsc` вместо `tsc` для проверки типов. В редакторах нужно расширение [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar).

### Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
npm run test:unit
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
