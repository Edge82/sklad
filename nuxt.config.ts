// https://nuxt.com/docs/api/configuration/nuxt-config

export default {
  // Режим SSR (можно отключить если нужна SPA)
  ssr: false,

  // Директория приложения
  srcDir: 'src',

  // Модули
  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss'
  ],

  // Pinia конфигурация
  pinia: {
    storesDirs: ['./src/stores/**']
  },

  // Tailwind CSS (если используется)
  tailwindcss: {
    exposeConfig: true
  },

  // Рабочий каталог для артифактов
  buildDir: '.nuxt',

  // DevTools
  devtools: {
    enabled: true
  },

  // Nitro (бэкенд) конфигурация
  nitro: {
    // Директория сервера
    srcDir: 'server',
    
    // Предварительная загрузка
    prerender: {
      crawlLinks: false,
      routes: ['/']
    },

    // Хранилище для кэшей, сессий и т.д.
    storage: {
      db: {
        driver: 'fs',
        base: './.data'
      }
    }
  },

  // Runtime config для переменных окружения
  runtimeConfig: {
    // Приватные переменные (доступны только на сервере)
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
    onecBaseUrl: process.env.ONEC_BASE_URL || 'http://192.168.1.100:8080/odata/standard.odata',
    onecLogin: process.env.ONEC_LOGIN || 'admin',
    onecPassword: process.env.ONEC_PASSWORD || 'admin',

    // Публичные переменные (доступны и на клиенте и на сервере)
    public: {
      apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
      appName: 'Furniture Warehouse System'
    }
  },

  // Типизация TypeScript
  typescript: {
    typeCheck: true,
    strict: true
  },

  // Компоненты авто-регистрация
  components: {
    dirs: [
      {
        path: '~/components',
        pathPrefix: false
      }
    ]
  }
}
