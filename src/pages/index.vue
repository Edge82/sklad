<template>
  <div class="dashboard">
    <h2>Добро пожаловать, {{ userStore.user?.name }}!</h2>
    <p>Используйте меню для навигации по приложению.</p>

    <div class="cards-grid">
      <NuxtLink to="/inventory" class="card">
        <div class="card-icon">📊</div>
        <h3>Управление складом</h3>
        <p>Просмотр и управление материалами и товарами</p>
      </NuxtLink>

      <NuxtLink to="/orders" class="card">
        <div class="card-icon">📋</div>
        <h3>Заказы</h3>
        <p>Создание и отслеживание заказов</p>
      </NuxtLink>

      <NuxtLink to="/employees" class="card">
        <div class="card-icon">👥</div>
        <h3>Сотрудники</h3>
        <p>Управление персоналом</p>
      </NuxtLink>

      <NuxtLink to="/integration" class="card">
        <div class="card-icon">🔗</div>
        <h3>Интеграция 1С</h3>
        <p>Синхронизация с 1С Бухгалтерией</p>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/user'
import { useInventoryStore } from '@/stores/inventory'
import { useOrdersStore } from '@/stores/orders'
import { onMounted, onActivated } from 'vue'

const userStore = useUserStore()
const inventoryStore = useInventoryStore()
const ordersStore = useOrdersStore()

onMounted(() => {
  // Восстанавливаем данные из localStorage
  inventoryStore.restoreFromLocalStorage()
  ordersStore.restoreFromLocalStorage()
})

onActivated(() => {
  inventoryStore.restoreFromLocalStorage()
  ordersStore.restoreFromLocalStorage()
})
</script>

<style scoped>
.dashboard {
  background: white;
  border-radius: 8px;
  padding: 30px;
}

.dashboard h2 {
  color: #2c3e50;
  margin-top: 0;
}

.dashboard p {
  color: #7f8c8d;
  font-size: 16px;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 30px;
}

.card {
  display: block;
  background: white;
  border: 1px solid #ecf0f1;
  border-radius: 8px;
  padding: 20px;
  text-decoration: none;
  transition: all 0.3s;
  cursor: pointer;
  text-align: center;
}

.card:hover {
  border-color: #3498db;
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.15);
  transform: translateY(-2px);
}

.card-icon {
  font-size: 40px;
  margin-bottom: 10px;
}

.card h3 {
  margin: 10px 0;
  color: #2c3e50;
  font-size: 18px;
}

.card p {
  font-size: 14px;
  color: #95a5a6;
  margin: 0;
}
</style>
