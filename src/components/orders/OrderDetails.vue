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
            <th>QR Коды</th>
            <th>Цена за ед.</th>
            <th>Материалы</th>
            <th class="text-right">Сумма</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in order.items" :key="item.id">
            <td>{{ index + 1 }}</td>
            <td>{{ item.productName || item.itemName }}</td>
            <td>{{ item.quantity }}</td>
            <td>
              <div class="flex flex-col gap-1" style="min-width: 140px">
                <div class="flex justify-end items-center text-[10px] px-1">
                   <n-text strong :type="getScannedCount(item) === getQRCount(item) && getQRCount(item) > 0 ? 'success' : 'default'">
                     Готово: {{ getScannedCount(item) }} / {{ getQRCount(item) }}
                   </n-text>
                </div>
                <n-progress
                  type="line"
                  :percentage="getOrderItemProgress(item)"
                  :status="getQRStatusType(item) as any"
                  indicator-placement="inside"
                  :height="16"
                  :border-radius="8"
                />
              </div>
            </td>
            <td>{{ formatCurrency(item.unitPrice) }}</td>
            <td>{{ item.materialUsed || '-' }}</td>
            <td>{{ formatCurrency(item.totalPrice) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="6" class="text-right font-bold">Итого:</td>
            <td class="font-bold text-lg text-right">{{ formatCurrency(order.totalAmount) }}</td>
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
import type { Order, OrderItem } from '@/types'
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
  NThing,
  useMessage,
  NProgress
} from 'naive-ui'
import {
  PrintOutline,
  SyncOutline,
  NotificationsOutline,
  CreateOutline,
  TimeOutline
} from '@vicons/ionicons5'
import { useQRCodesStore } from '@/stores/qrCodes'
import { useOrdersStore } from '@/stores/orders'

const props = defineProps<{
  order: Order
}>()

const qrStore = useQRCodesStore()
const ordersStore = useOrdersStore()
const message = useMessage()

const getQRCount = (item: OrderItem) => {
  return qrStore.qrCodes.filter(q => q.orderId === props.order.id && q.productId === item.productId).length
}

const getScannedCount = (item: OrderItem) => {
  return qrStore.qrCodes.filter(q => 
    q.orderId === props.order.id && 
    q.productId === item.productId && 
    (q.status === 'scanned' || q.status === 'shipped')
  ).length
}

const getOrderItemProgress = (item: OrderItem) => {
  return ordersStore.getOrderItemProgress(props.order.id, item.productId, qrStore.qrCodes)
}

const getQRStatusType = (item: OrderItem) => {
  const percentage = getOrderItemProgress(item)
  if (percentage === 0) return 'default'
  if (percentage < 100) return 'warning'
  if (percentage === 100) return 'success'
  return 'error'
}

const isOverdue = computed(() => {
  if (!props.order.deadline) return false
  return new Date(props.order.deadline) < new Date() && (props.order.status as string) !== 'completed'
})

const formatDate = (date: Date | string | undefined) => {
  if (!date) return '-'
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(date))
}

const formatDateTime = (date: Date | string | undefined) => {
  if (!date) return '-'
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}

const formatCurrency = (amount: number | undefined) => {
  if (amount === undefined) return '-'
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0
  }).format(amount)
}

const getStatusLabel = (status: Order['status']) => {
  const statusMap: Record<string, string> = {
    'new': 'Новый',
    'processing': 'В обработке',
    'printing': 'Печать QR',
    'in_progress': 'В производстве',
    'partially_ready': 'Частично готов',
    'ready': 'Готов',
    'partially_shipped': 'Частично отгружен',
    'shipped': 'Отгружен',
    'completed': 'Завершен',
    'cancelled': 'Отменен'
  }
  return statusMap[status] || status
}

const getStatusColor = (status: Order['status']) => {
  const colorMap: Record<string, 'default' | 'error' | 'primary' | 'info' | 'success' | 'warning'> = {
    'new': 'default',
    'processing': 'warning',
    'printing': 'info',
    'in_progress': 'warning',
    'partially_ready': 'info',
    'ready': 'success',
    'partially_shipped': 'info',
    'shipped': 'primary',
    'completed': 'success',
    'cancelled': 'error'
  }
  return colorMap[status] || 'default'
}

const getPriorityLabel = (priority: Order['priority']) => {
  if (!priority) return 'Не указан'
  const priorityMap: Record<string, string> = {
    'low': 'Низкий',
    'medium': 'Средний',
    'high': 'Высокий',
    'urgent': 'Срочный'
  }
  return priorityMap[priority] || priority
}

const getPriorityColor = (priority: Order['priority']) => {
  if (!priority) return 'default'
  const colorMap: Record<string, 'default' | 'error' | 'primary' | 'info' | 'success' | 'warning'> = {
    'low': 'success',
    'medium': 'warning',
    'high': 'error',
    'urgent': 'error'
  }
  return colorMap[priority] || 'default'
}

const printOrder = () => {
  message.info('Печать заказа')
}

const changeStatus = () => {
  message.info('Изменение статуса')
}

const sendNotification = () => {
  message.success('Уведомление отправлено клиенту')
}
</script>

<style scoped>
.order-details {
  max-width: 100%;
}
</style>
