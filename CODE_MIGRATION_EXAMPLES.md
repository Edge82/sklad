# 🔄 Примеры адаптации кода для Nuxt 3

## Перед и После

### ❌ БЫЛО (Vue 3 + Vite + прямые запросы к 1С)

```typescript
// services/onec.ts
const ONEC_URL = 'http://1c-server/odata/standard.odata'
const ONEC_AUTH = btoa('login:password')

export const getStocks = async () => {
  const response = await fetch(`${ONEC_URL}/Catalog_Materials?$format=json`, {
    headers: {
      'Authorization': `Basic ${ONEC_AUTH}`,
      'Content-Type': 'application/json'
    }
  })
  return response.json()
}

// usage в компоненте
export default {
  methods: {
    async loadStocks() {
      this.stocks = await getStocks()
    }
  }
}
```

---

### ✅ ТЕПЕРЬ (Nuxt 3 + API прокси)

```typescript
// composables/useOnec.ts (уже готов!)
export function useOnec() {
  async function getStocks(filter?: string) {
    const onec = useOnec()
    return onec.get('stocks', filter ? { $filter: filter } : {})
  }
}

// usage в компоненте Vue 3 + Nuxt
export default defineComponent({
  setup() {
    const { getStocks } = useOnec()
    
    const loadStocks = async () => {
      const stocks = await getStocks()
      return stocks.data
    }

    return { loadStocks }
  }
})

// или в Composition API
<script setup lang="ts">
import { useOnec } from '@/composables/useOnec'

const { getStocks } = useOnec()

const stocks = ref([])
const isLoading = ref(false)

const loadStocks = async () => {
  isLoading.value = true
  try {
    const response = await getStocks()
    stocks.value = response.data
  } finally {
    isLoading.value = false
  }
}

onMounted(() => loadStocks())
</script>
```

---

## 📝 Практические примеры

### Пример 1: Загрузка списка материалов

**БЫЛО:**
```typescript
// views/Inventory.vue
import { getStocks } from '@/services/onec'

export default {
  data() {
    return { stocks: [] }
  },
  async mounted() {
    this.stocks = await getStocks()
  }
}
```

**СТАЛО:**
```typescript
// pages/inventory.vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useOnec } from '@/composables/useOnec'

const { getStocks } = useOnec()
const stocks = ref([])

onMounted(async () => {
  stocks.value = await getStocks()
})
</script>

<template>
  <div>
    <h1>Материалы</h1>
    <ul>
      <li v-for="stock in stocks" :key="stock.id">
        {{ stock.name }} - {{ stock.quantity }}
      </li>
    </ul>
  </div>
</template>
```

---

### Пример 2: Фильтрация данных

**БЫЛО:**
```typescript
const filtered = await getStocks()
  .then(r => r.json())
  .then(data => data.value.filter(item => item.name.includes('фанера')))
```

**СТАЛО:**
```typescript
const { get } = useOnec()

// Способ 1: Фильтр на клиенте
const stocks = await get('stocks')
const filtered = stocks.value.filter(item => item.name.includes('фанера'))

// Способ 2: Фильтр на 1С (более эффективно)
const filtered = await get('stocks', {
  $filter: "name~contains~'фанера'"
})
```

---

### Пример 3: Отправка данных (POST)

**БЫЛО:**
```typescript
const createMovement = async (data) => {
  const response = await fetch(
    `${ONEC_URL}/Document_MovementOfMaterials`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${ONEC_AUTH}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }
  )
  return response.json()
}
```

**СТАЛО:**
```typescript
const { post } = useOnec()

const createMovement = async (data) => {
  return post('Document_MovementOfMaterials', data)
  // Токен автоматически добавляется!
}
```

---

### Пример 4: Обработка ошибок

**БЫЛО:**
```typescript
try {
  const stocks = await getStocks()
  this.stocks = stocks
} catch (error) {
  this.error = error.message
  console.error('Failed to load stocks:', error)
}
```

**СТАЛО:**
```typescript
<script setup lang="ts">
const { getStocks, error, isLoading } = useOnec()

const loadStocks = async () => {
  try {
    const response = await getStocks()
    stocks.value = response.data
  } catch (err) {
    // error ref автоматически устанавливается
    console.error(error.value)
  }
}
</script>

<template>
  <div v-if="isLoading">Loading...</div>
  <div v-else-if="error" class="error">
    ❌ {{ error }}
  </div>
  <div v-else>
    ✅ Данные загружены
  </div>
</template>
```

---

### Пример 5: Интеграция с Pinia store

**БЫЛО:**
```typescript
// store/inventory.ts (Vuex)
export const inventoryModule = {
  state: () => ({ stocks: [] }),
  actions: {
    async loadStocks({ commit }) {
      const stocks = await getStocks()
      commit('setStocks', stocks)
    }
  }
}
```

**СТАЛО:**
```typescript
// stores/inventory.ts (Pinia)
import { defineStore } from 'pinia'

export const useInventoryStore = defineStore('inventory', () => {
  const stocks = ref([])
  const { getStocks } = useOnec()

  const loadStocks = async () => {
    const response = await getStocks()
    stocks.value = response.data
  }

  return { stocks, loadStocks }
})

// usage в компоненте
<script setup lang="ts">
const store = useInventoryStore()

onMounted(() => store.loadStocks())
</script>
```

---

### Пример 6: Компонент с формой

**БЫЛО:**
```vue
<template>
  <form @submit.prevent="submitForm">
    <input v-model="form.name" />
    <button :disabled="isLoading">Сохранить</button>
  </form>
</template>

<script>
import { createStock } from '@/services/onec'

export default {
  data() {
    return { form: {}, isLoading: false }
  },
  methods: {
    async submitForm() {
      this.isLoading = true
      try {
        await createStock(this.form)
        this.$router.push('/inventory')
      } finally {
        this.isLoading = false
      }
    }
  }
}
</script>
```

**СТАЛО:**
```vue
<template>
  <form @submit.prevent="submitForm">
    <input v-model="form.name" />
    <button :disabled="isLoading">Сохранить</button>
    <span v-if="error" class="error">{{ error }}</span>
  </form>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useOnec } from '@/composables/useOnec'

const router = useRouter()
const { post, isLoading, error } = useOnec()

const form = reactive({ name: '' })

const submitForm = async () => {
  try {
    await post('Catalog_Materials', form)
    await router.push('/inventory')
  } catch (err) {
    // error автоматически обновляется
  }
}
</script>
```

---

### Пример 7: Параметризированные маршруты

**БЫЛО (Router конфиг):**
```typescript
// router/index.ts
{
  path: '/orders/:id',
  component: OrderDetails,
  props: true
}

// views/OrderDetails.vue
export default {
  props: ['id'],
  methods: {
    async loadOrder() {
      const order = await fetch(`${ONEC_URL}/Document_Orders('${this.id}')?$format=json`)
    }
  }
}
```

**СТАЛО (Nuxt file-based):**
```typescript
// pages/orders/[id].vue - маршрут создаётся автоматически!

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useOnec } from '@/composables/useOnec'

const route = useRoute()
const { get } = useOnec()

const order = ref(null)

onMounted(async () => {
  const orderId = route.params.id
  order.value = await get(`orders/${orderId}`)
})
</script>
```

---

### Пример 8: API с полной обработкой ошибок

**БЫЛО:**
```typescript
const handleLogin = async (login, password) => {
  const response = await fetch('http://api.example.com/login', {
    method: 'POST',
    body: JSON.stringify({ login, password })
  })
  if (!response.ok) throw new Error('Login failed')
  const data = await response.json()
  localStorage.setItem('token', data.token)
  return data
}
```

**СТАЛО:**
```typescript
// pages/login.vue
<script setup lang="ts">
const handleLogin = async (login: string, password: string) => {
  try {
    const response = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { login, password }
    })
    
    // Nuxt автоматически парсит JSON и обрабатывает ошибки!
    localStorage.setItem('auth_token', response.token)
    userStore.setUser(response.user)
    await navigateTo('/inventory')
    
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message)
    }
  }
}
</script>
```

---

## 🔑 Основные изменения в синтаксисе

| Функция | Было | Стало |
|---------|------|-------|
| Маршрутизация | `Vue Router` конфиг | `pages/` структура |
| Навигация | `this.$router.push()` | `navigateTo()` |
| Route параметры | `this.$route.params` | `useRoute().params` |
| Состояние | `Vuex` | `Pinia` с `defineStore` |
| Вызов API | `fetch()` | `$fetch()` (Nuxt h3) |
| Композабли | `use*/index.ts` | `useXxx.ts` в `composables/` |
| Компоненты | импорт + регистрация | авто-регистрация из `components/` |

---

✅ **Все примеры готовы к использованию!**

Скопируйте нужные части в ваш проект.
