<template>
  <div v-if="order" class="order-details">
    <!-- Шапка заказа -->
    <div class="mb-6">
      <div class="flex justify-between items-start mb-4">
        <div>
          <n-h2 class="m-0">{{ order.orderNumber }}</n-h2>
          <n-text depth="3">Заказ от {{ formatDate(order.orderDate) }}</n-text>
        </div>
        <div class="text-right">
          <n-tag :type="getStatusColor(order.status)" size="large">
            {{ getStatusLabel(order.status) }}
          </n-tag>
          <div class="mt-2">
            <n-tag :type="getPriorityColor(order.priority)">
              {{ getPriorityLabel(order.priority) }}
            </n-tag>
          </div>
        </div>
      </div>
    </div>

    <!-- Информация о клиенте -->
    <n-card title="Информация о клиенте" class="mb-4">
      <n-grid :cols="3" :y-gap="12">
        <n-gi>
          <div>
            <n-text strong>ФИО:</n-text>
            <p>{{ order.customerName }}</p>
          </div>
        </n-gi>
        <n-gi>
          <div>
            <n-text strong>Телефон:</n-text>
            <p>{{ order.customerPhone }}</p>
          </div>
        </n-gi>
        <n-gi>
          <div>
            <n-text strong>Email:</n-text>
            <p>{{ order.customerEmail }}</p>
          </div>
        </n-gi>
        <n-gi>
          <div>
            <n-text strong>Создал:</n-text>
            <p>{{ order.createdBy }}</p>
          </div>
        </n-gi>
        <n-gi>
          <div>
            <n-text strong>Дата заказа:</n-text>
            <p>{{ formatDate(order.orderDate) }}</p>
          </div>
        </n-gi>
        <n-gi>
          <div>
            <n-text strong>Срок выполнения:</n-text>
            <p :class="isOverdue ? 'text-red-500 font-medium' : ''">
              {{ formatDate(order.deadline) }}
              <n-tag v-if="isOverdue" size="small" type="error">Просрочен</n-tag>
            </p>
          </div>
        </n-gi>
      </n-grid>
    </n-card>

    <!-- Позиции заказа -->
    <n-card title="Позиции заказа" class="mb-4">
      <n-table striped>
        <thead>
          <tr>
            <th>№</th>
            <th>Наименование</th>
            <th>Количество</th>
            <th>Цена за ед.</th>
            <th>Материалы</th>
            <th>Сумма</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in order.items" :key="item.id">
            <td>{{ index + 1 }}</td>
            <td>{{ item.itemName }}</td>
            <td>{{ item.quantity }}</td>
            <td>{{ formatCurrency(item.unitPrice) }}</td>
            <td>{{ item.materialUsed || '-' }}</td>
            <td>{{ formatCurrency(item.totalPrice) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="5" class="text-right font-bold">Итого:</td>
            <td class="font-bold text-lg">{{ formatCurrency(order.totalAmount) }}</td>
          </tr>
        </tfoot>
      </n-table>
    </n-card>

    <!-- Примечания и действия -->
    <n-grid :cols="2" :x-gap="16">
      <n-gi>
        <n-card title="Примечания">
          <n-text v-if="order.notes">{{ order.notes }}</n-text>
          <n-text v-else depth="3">Нет примечаний</n-text>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card title="Действия">
          <n-space vertical>
            <n-button block @click="printOrder" type="primary">
              <template #icon>
                <n-icon>
                  <PrintOutline />
                </n-icon>
              </template>
              Печать заказа
            </n-button>
            <n-button block @click="changeStatus" type="warning">
              <template #icon>
                <n-icon>
                  <SyncOutline />
                </n-icon>
              </template>
              Изменить статус
            </n-button>
            <n-button block @click="sendNotification" type="info">
              <template #icon>
                <n-icon>
                  <NotificationsOutline />
                </n-icon>
              </template>
              Уведомить клиента
            </n-button>
          </n-space>
        </n-card>
      </n-gi>
    </n-grid>

    <!-- История изменений -->
    <n-card title="История изменений" class="mt-4">
      <n-list>
        <n-list-item>
          <template #prefix>
            <n-icon>
              <CreateOutline />
            </n-icon>
          </template>
          <n-thing title="Заказ создан" :description="formatDateTime(order.orderDate)">
            <template #description>
              {{ order.createdBy }}
            </template>
          </n-thing>
        </n-list-item>
        <n-list-item>
          <template #prefix>
            <n-icon>
              <TimeOutline />
            </n-icon>
          </template>
          <n-thing title="Последнее обновление" :description="formatDateTime(order.lastUpdated)">
            <template #description>
              Статус: {{ getStatusLabel(order.status) }}
            </template>
          </n-thing>
        </n-list-item>
      </n-list>
    </n-card>
  </div>
  <div v-else class="text-center py-8">
    <n-text depth="3">Заказ не найден</n-text>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Order } from '@/types'
import {
  NCard,
  NH2,
  NText,
  NTag,
  NGrid,
  NGi,
  NTable,
  NButton,
  NIcon,
  NSpace,
  NList,
  NListItem,
  NThing
} from 'naive-ui'
import {
  PrintOutline,
  SyncOutline,
  NotificationsOutline,
  CreateOutline,
  TimeOutline
} from '@vicons/ionicons5'

const props = defineProps<{
  order: Order
}>()

const isOverdue = computed(() => {
  return new Date(props.order.deadline) < new Date() && props.order.status !== 'completed'
})

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date)
}

const formatDateTime = (date: Date) => {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0
  }).format(amount)
}

const getStatusLabel = (status: Order['status']) => {
  const statusMap: Record<Order['status'], string> = {
    'new': 'Новый',
    'processing': 'В обработке',
    'ready': 'Готов',
    'shipped': 'Отправлен',
    'completed': 'Завершен',
    'cancelled': 'Отменен'
  }
  return statusMap[status] || status
}

const getStatusColor = (status: Order['status']) => {
  const colorMap: Record<Order['status'], string> = {
    'new': 'default',
    'processing': 'warning',
    'ready': 'info',
    'shipped': 'primary',
    'completed': 'success',
    'cancelled': 'error'
  }
  return colorMap[status] || 'default'
}

const getPriorityLabel = (priority: Order['priority']) => {
  const priorityMap: Record<Order['priority'], string> = {
    'low': 'Низкий',
    'medium': 'Средний',
    'high': 'Высокий',
    'urgent': 'Срочный'
  }
  return priorityMap[priority] || priority
}

const getPriorityColor = (priority: Order['priority']) => {
  const colorMap: Record<Order['priority'], string> = {
    'low': 'success',
    'medium': 'warning',
    'high': 'error',
    'urgent': 'error'
  }
  return colorMap[priority] || 'default'
}

const printOrder = () => {
  window.$message?.info('Печать заказа')
}

const changeStatus = () => {
  window.$message?.info('Изменение статуса')
}

const sendNotification = () => {
  window.$message?.success('Уведомление отправлено клиенту')
}
</script>

<style scoped>
.order-details {
  max-width: 100%;
}
</style>
