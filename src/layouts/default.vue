<template>
  <div class="layout">
    <!-- Боковая панель -->
    <aside class="sidebar">
      <nav class="nav">
        <NuxtLink to="/" class="logo">
          <span>📦 Warehouse</span>
        </NuxtLink>

        <ul class="nav-menu">
          <li><NuxtLink to="/inventory" active-class="active">📊 Склад</NuxtLink></li>
          <li><NuxtLink to="/orders" active-class="active">📋 Заказы</NuxtLink></li>
          <li><NuxtLink to="/employees" active-class="active">👥 Сотрудники</NuxtLink></li>
          <li><NuxtLink to="/integration" active-class="active">🔗 Интеграция 1С</NuxtLink></li>
          <li><NuxtLink to="/tools" active-class="active">🛠️ Инструменты</NuxtLink></li>
        </ul>

        <div class="nav-footer">
          <button @click="handleLogout" class="btn-logout">
            🚪 Выйти
          </button>
        </div>
      </nav>
    </aside>

    <!-- Основной контент -->
    <main class="main-content">
      <!-- Шапка -->
      <header class="header">
        <div class="header-content">
          <h1>{{ pageTitle }}</h1>
          <div class="user-info">
            <span>{{ userStore.user?.name }}</span>
            <span class="role">{{ userStore.user?.role }}</span>
          </div>
        </div>
      </header>

      <!-- Контент страницы -->
      <section class="page-content">
        <slot />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// Получаем заголовок страницы из имени маршрута
const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    'inventory': 'Управление складом',
    'orders': 'Заказы',
    'employees': 'Сотрудники',
    'integration': 'Интеграция 1С',
    'tools': 'Инструменты'
  }

  const routeName = route.name as string || route.path.slice(1).split('/')[0]
  return titles[routeName] || 'Warehouse System'
})

// Обработчик логаута
async function handleLogout() {
  try {
    // Запрос на логаут
    await fetch('/sklad/api/logout', { method: 'POST' })
  } catch {
    // Даже если запрос ошибок - чистим локально
  }

  // Чистим токен и редирект на login
  localStorage.removeItem('auth_token')
  userStore.logout()
  await router.push('/login')
}
</script>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
  background: #f5f5f5;
}

.sidebar {
  width: 250px;
  background: #2c3e50;
  color: white;
  overflow-y: auto;
  border-right: 1px solid #34495e;
}

.nav {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px 0;
}

.logo {
  padding: 20px;
  font-size: 18px;
  font-weight: bold;
  border-bottom: 1px solid #34495e;
  text-decoration: none;
  color: white;
}

.nav-menu {
  list-style: none;
  flex: 1;
  padding: 10px 0;
  margin: 0;
}

.nav-menu li {
  margin: 0;
}

.nav-menu a {
  display: block;
  padding: 12px 20px;
  color: #bdc3c7;
  text-decoration: none;
  transition: all 0.3s;
  border-left: 3px solid transparent;
}

.nav-menu a:hover,
.nav-menu a.active {
  background: #34495e;
  color: white;
  border-left-color: #3498db;
}

.nav-footer {
  padding: 20px;
  border-top: 1px solid #34495e;
}

.btn-logout {
  width: 100%;
  padding: 10px;
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s;
}

.btn-logout:hover {
  background: #c0392b;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  background: white;
  border-bottom: 1px solid #ddd;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
}

.header h1 {
  margin: 0;
  font-size: 24px;
  color: #2c3e50;
}

.user-info {
  display: flex;
  gap: 15px;
  align-items: center;
  font-size: 14px;
  color: #7f8c8d;
}

.role {
  background: #ecf0f1;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  text-transform: uppercase;
  font-weight: bold;
  color: #2c3e50;
}

.page-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}
</style>
