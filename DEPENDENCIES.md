# 📦 package.json - Зависимости для Nuxt 3 миграции

## Что добавить в package.json

Скопируйте эти зависимости в ваш `package.json`:

### devDependencies
```json
{
  "devDependencies": {
    "nuxt": "^3.12.0",
    "@nuxt/devtools": "^1.6.0",
    "typescript": "^5.6.0",
    "vue": "^3.5.22",
    "@vue/test-utils": "^2.4.6",
    "vitest": "^2.1.8",
    "@tailwindcss/forms": "^0.5.9",
    "tailwindcss": "^3.4.14",
    "postcss": "^8.4.47"
  }
}
```

### dependencies
```json
{
  "dependencies": {
    "pinia": "^3.0.3",
    "pinia-plugin-persistedstate": "^2.6.0",
    "vue-router": "^4.6.3",
    "jsonwebtoken": "^9.1.2",
    "bcrypt": "^5.1.1",
    "better-sqlite3": "^11.5.0",
    "h3": "^1.13.0",
    "nitropack": "^2.13.4",
    "@vicons/ionicons5": "^0.13.0",
    "naive-ui": "^2.43.2",
    "qrcode": "^1.5.4",
    "jspdf": "^4.2.1",
    "jspdf-autotable": "^5.0.7"
  }
}
```

### scripts
```json
{
  "scripts": {
    "dev": "nuxt dev",
    "build": "nuxt build",
    "preview": "nuxt preview",
    "generate": "nuxt generate",
    "prepare": "nuxt prepare",
    "postinstall": "nuxt prepare",
    "type-check": "vue-tsc --build",
    "lint": "eslint . --fix --cache",
    "format": "prettier --write src/",
    "test": "vitest"
  }
}
```

---

## Полный package.json для Nuxt 3

```json
{
  "name": "furniture-warehouse-system",
  "version": "1.0.0",
  "description": "Warehouse management system with Nuxt 3 and 1C integration",
  "type": "module",
  "engines": {
    "node": "^20.0.0 || >=22.0.0"
  },
  "scripts": {
    "dev": "nuxt dev",
    "build": "nuxt build",
    "preview": "nuxt preview",
    "generate": "nuxt generate",
    "prepare": "nuxt prepare",
    "postinstall": "nuxt prepare",
    "type-check": "vue-tsc --build",
    "lint": "eslint . --fix --cache",
    "format": "prettier --write src/",
    "test": "vitest",
    "db:init": "node --loader tsx scripts/init-db.ts"
  },
  "dependencies": {
    "pinia": "^3.0.3",
    "pinia-plugin-persistedstate": "^2.6.0",
    "vue": "^3.5.22",
    "vue-router": "^4.6.3",
    "jsonwebtoken": "^9.1.2",
    "bcrypt": "^5.1.1",
    "better-sqlite3": "^11.5.0",
    "h3": "^1.13.0",
    "nitropack": "^2.13.4",
    "@vicons/ionicons5": "^0.13.0",
    "naive-ui": "^2.43.2",
    "qrcode": "^1.5.4",
    "jspdf": "^4.2.1",
    "jspdf-autotable": "^5.0.7",
    "@fontsource/inter": "^5.2.8",
    "@fontsource/roboto-mono": "^5.2.8"
  },
  "devDependencies": {
    "nuxt": "^3.12.0",
    "@nuxt/devtools": "^1.6.0",
    "@nuxtjs/tailwindcss": "^6.10.0",
    "typescript": "^5.6.0",
    "vue-tsc": "^2.1.8",
    "@vue/test-utils": "^2.4.6",
    "vitest": "^2.1.8",
    "@vitest/ui": "^2.1.8",
    "@types/node": "^22.5.4",
    "@types/better-sqlite3": "^7.6.11",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/bcrypt": "^5.0.2",
    "@types/qrcode": "^1.5.6",
    "eslint": "^9.11.1",
    "eslint-config-prettier": "^9.1.0",
    "prettier": "^3.3.3",
    "tailwindcss": "^3.4.14",
    "@tailwindcss/forms": "^0.5.9",
    "postcss": "^8.4.47",
    "tsx": "^4.17.0"
  }
}
```

---

## Установка

### Опция 1: Обновить существующий package.json

```bash
npm install --save-dev nuxt @nuxt/devtools @nuxtjs/tailwindcss
npm install pinia pinia-plugin-persistedstate jsonwebtoken bcrypt better-sqlite3
npm install --save-dev @types/better-sqlite3 @types/jsonwebtoken @types/bcrypt tsx
```

### Опция 2: Переписать с нуля

```bash
# Удалите старые зависимости
rm -rf node_modules package-lock.json

# Переписать package.json на новый вариант (см. выше)

# Переустановить
npm install
```

---

## Проверка после установки

```bash
# Проверить что всё установилось
npm list | head -20

# Убедиться что Nuxt готов
npx nuxi --version

# Попробовать запустить
npm run dev
```

---

## Какие пакеты за что?

| Пакет | Назначение |
|-------|-----------|
| `nuxt` | Основной фреймворк |
| `pinia` | State management |
| `jsonwebtoken` | JWT токены |
| `bcrypt` | Хеширование паролей |
| `better-sqlite3` | Локальная БД |
| `h3` | HTTP утилиты (в составе Nuxt) |
| `@vicons/ionicons5` | Иконки |
| `naive-ui` | UI компоненты |
| `tailwindcss` | CSS утилиты |

---

✅ **Готово! После установки можно запустить `npm run dev`**
