import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

// Naive UI глобальная регистрация
import * as Naive from 'naive-ui'

const app = createApp(App)
const pinia = createPinia()

// Регистрируем все компоненты Naive UI глобально
for (const [key, component] of Object.entries(Naive)) {
  if (component.name && key.startsWith('N')) {
    app.component(key, component)
  }
}

app.use(pinia)
app.use(router)


app.mount('#app')
