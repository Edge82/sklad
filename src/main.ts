import { createApp, type Component } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// Naive UI глобальная регистрация
import * as Naive from 'naive-ui'

const app = createApp(App)
const pinia = createPinia()

// Fix for Tailwind CSS v4 + Naive UI conflict
const meta = document.createElement('meta')
meta.name = 'naive-ui-style'
document.head.prepend(meta) // Используем prepend вместо append

// Регистрируем все компоненты Naive UI глобально
for (const [key, component] of Object.entries(Naive)) {
  const comp = component as Component & { name?: string }
  if (comp && typeof comp === 'object' && comp.name && key.startsWith('N')) {
    app.component(key, comp)
  }
}

app.use(pinia)
app.use(router)


app.mount('#app')
