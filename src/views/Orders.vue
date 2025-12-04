<template>
  <div class="orders-page">
    <div class="flex justify-between items-center mb-6">
      <div>
        <n-h1>Заказы</n-h1>
        <n-text depth="3">Управление заказами клиентов</n-text>
      </div>
      <div style="gap: 8px; display: flex; margin: 8px; "> <!-- Обертка для кнопок -->
        <n-button type="primary" @click="showCreateModal = true" class="mr-4">
          <template #icon>
            <n-icon>
              <AddCircleOutline />
            </n-icon>
          </template>
          Новый заказ
        </n-button>
        <n-button type="primary" @click="showCreateModal = true">
          <template #icon>
            <n-icon>
              <AddCircleOutline />
            </n-icon>
          </template>
          Сдать инструмент
        </n-button>
      </div>
    </div>

    <!-- Статистика заказов -->
    <n-grid :cols="4" :x-gap="16" :y-gap="16" class="mb-6">
      <n-gi>
        <n-card>
          <div class="flex justify-between items-center">
            <div>
              <n-text depth="3">Всего заказов</n-text>
              <n-h3 class="m-0">{{ ordersStore.totalOrders }}</n-h3>
            </div>
            <n-icon size="32" color="#2080f0">
              <DocumentTextOutline />
            </n-icon>
          </div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <div class="flex justify-between items-center">
            <div>
              <n-text depth="3">В обработке</n-text>
              <n-h3 class="m-0">{{ ordersStore.pendingOrders }}</n-h3>
            </div>
            <n-icon size="32" color="#f0a020">
              <TimeOutline />
            </n-icon>
          </div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <div class="flex justify-between items-center">
            <div>
              <n-text depth="3">Завершено</n-text>
              <n-h3 class="m-0">{{ ordersStore.completedOrders }}</n-h3>
            </div>
            <n-icon size="32" color="#18a058">
              <CheckmarkCircleOutline />
            </n-icon>
          </div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <div class="flex justify-between items-center">
            <div>
              <n-text depth="3">Выручка</n-text>
              <n-h3 class="m-0">{{ formatCurrency(ordersStore.totalRevenue) }}</n-h3>
            </div>
            <n-icon size="32" color="#d03050">
              <CashOutline />
            </n-icon>
          </div>
        </n-card>
      </n-gi>
    </n-grid>

    <!-- Фильтры и поиск -->
    <n-card class="mb-6">
      <div class="flex flex-wrap gap-4">
        <n-select v-model:value="filters.status" placeholder="Статус" :options="statusFilterOptions" clearable
          style="width: 200px" />
        <n-select v-model:value="filters.priority" placeholder="Приоритет" :options="priorityFilterOptions" clearable
          style="width: 200px" />
        <n-date-picker v-model:value="filters.dateRange" type="daterange" clearable placeholder="Период"
          style="width: 250px" />
        <n-input v-model:value="searchQuery" placeholder="Поиск по клиенту или номеру" clearable style="width: 300px">
          <template #prefix>
            <n-icon>
              <SearchOutline />
            </n-icon>
          </template>
        </n-input>
        <n-button @click="resetFilters">Сбросить</n-button>
      </div>
    </n-card>

    <!-- Таблица заказов -->
    <n-card>
      <n-data-table :columns="columns" :data="filteredOrders" :pagination="pagination" :row-key="(row: Order) => row.id"
        striped />
    </n-card>

    <!-- Модалка создания заказа -->
    <n-modal v-model:show="showCreateModal" preset="card" title="Новый заказ" style="width: 600px">
      <OrderForm @submit="handleOrderSubmit" @cancel="showCreateModal = false" />
    </n-modal>

    <!-- Модалка просмотра заказа -->
    <n-modal v-model:show="showViewModal" preset="card" title="Детали заказа" style="width: 800px">
      <OrderDetails v-if="selectedOrder" :order="selectedOrder" />
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, h } from 'vue'
import { useOrdersStore } from '@/stores/orders'
import type { Order } from '@/types'
import type { DataTableColumns, SelectOption } from 'naive-ui'
import {
  NH1,
  NText,
  NButton,
  NIcon,
  NGrid,
  NGi,
  NCard,
  NSelect,
  NDatePicker,
  NInput,
  NDataTable,
  NModal,
  NTag,
  NTooltip,
  NBadge
} from 'naive-ui'
import {
  DocumentTextOutline,
  TimeOutline,
  CheckmarkCircleOutline,
  CashOutline,
  AddCircleOutline,
  SearchOutline,
  EyeOutline,
  PencilOutline,
  TrashOutline,
  AlertCircleOutline
} from '@vicons/ionicons5'
import OrderForm from '@/components/orders/OrderForm.vue'
import OrderDetails from '@/components/orders/OrderDetails.vue'

const ordersStore = useOrdersStore()
const showCreateModal = ref(false)
const showViewModal = ref(false)
const selectedOrder = ref<Order | null>(null)

const searchQuery = ref('')
const filters = reactive({
  status: null as string | null,
  priority: null as string | null,
  dateRange: null as [number, number] | null
})

const statusFilterOptions: SelectOption[] = [
  { label: 'Новый', value: 'new' },
  { label: 'В обработке', value: 'processing' },
  { label: 'Готов', value: 'ready' },
  { label: 'Отправлен', value: 'shipped' },
  { label: 'Завершен', value: 'completed' },
  { label: 'Отменен', value: 'cancelled' }
]

const priorityFilterOptions: SelectOption[] = [
  { label: 'Низкий', value: 'low' },
  { label: 'Средний', value: 'medium' },
  { label: 'Высокий', value: 'high' },
  { label: 'Срочный', value: 'urgent' }
]

const pagination = {
  pageSize: 10
}

const filteredOrders = computed(() => {
  let result = ordersStore.orders

  // Поиск
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(order =>
      order.customerName.toLowerCase().includes(query) ||
      order.orderNumber.toLowerCase().includes(query) ||
      order.customerPhone.includes(query) ||
      order.customerEmail.toLowerCase().includes(query)
    )
  }

  // Фильтр по статусу
  if (filters.status) {
    result = result.filter(order => order.status === filters.status)
  }

  // Фильтр по приоритету
  if (filters.priority) {
    result = result.filter(order => order.priority === filters.priority)
  }

  // Фильтр по дате
  if (filters.dateRange) {
    const [start, end] = filters.dateRange
    result = result.filter(order => {
      const orderDate = order.orderDate.getTime()
      return orderDate >= start && orderDate <= end
    })
  }

  return result
})

const columns: DataTableColumns<Order> = [
  {
    title: 'Номер',
    key: 'orderNumber',
    width: 150,
    render: (row) => h('span', { class: 'font-mono' }, row.orderNumber)
  },
  {
    title: 'Клиент',
    key: 'customerName',
    render: (row) => h('div', [
      h('div', { class: 'font-medium' }, row.customerName),
      h('div', { class: 'text-xs text-gray-500' }, row.customerPhone)
    ])
  },
  {
    title: 'Дата заказа',
    key: 'orderDate',
    width: 150,
    render: (row) => formatDate(row.orderDate)
  },
  {
    title: 'Срок',
    key: 'deadline',
    width: 150,
    render: (row) => {
      const isOverdue = new Date(row.deadline) < new Date() && row.status !== 'completed'
      return h('div', { class: isOverdue ? 'text-red-500 font-medium' : '' }, [
        formatDate(row.deadline),
        isOverdue ? h(NBadge, { dot: true, type: 'error', class: 'ml-2' }) : null
      ])
    }
  },
  {
    title: 'Статус',
    key: 'status',
    width: 150,
    render: (row) => {
      const statusOption = ordersStore.statusOptions.find(opt => opt.value === row.status)
      return h(NTag, {
        type: statusOption?.color as any,
        size: 'small'
      }, { default: () => ordersStore.getStatusLabel(row.status) })
    }
  },
  {
    title: 'Приоритет',
    key: 'priority',
    width: 120,
    render: (row) => {
      const priorityOption = ordersStore.priorityOptions.find(opt => opt.value === row.priority)
      return h(NTag, {
        type: priorityOption?.color as any,
        size: 'small'
      }, { default: () => ordersStore.getPriorityLabel(row.priority) })
    }
  },
  {
    title: 'Сумма',
    key: 'totalAmount',
    width: 120,
    render: (row) => formatCurrency(row.totalAmount)
  },
  {
    title: 'Действия',
    key: 'actions',
    width: 150,
    render: (row) => h('div', { class: 'flex gap-2' }, [
      h(NTooltip, null, {
        trigger: () => h(NButton, {
          size: 'small',
          type: 'info',
          quaternary: true,
          onClick: () => viewOrder(row.id)
        }, { icon: () => h(NIcon, null, { default: () => h(EyeOutline) }) }),
        default: () => 'Просмотр'
      }),
      h(NTooltip, null, {
        trigger: () => h(NButton, {
          size: 'small',
          type: 'warning',
          quaternary: true,
          onClick: () => editOrder(row.id)
        }, { icon: () => h(NIcon, null, { default: () => h(PencilOutline) }) }),
        default: () => 'Редактировать'
      }),
      h(NTooltip, null, {
        trigger: () => h(NButton, {
          size: 'small',
          type: 'error',
          quaternary: true,
          onClick: () => deleteOrder(row.id)
        }, { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) }),
        default: () => 'Удалить'
      })
    ])
  }
]

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('ru-RU').format(date)
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0
  }).format(amount)
}

const resetFilters = () => {
  searchQuery.value = ''
  filters.status = null
  filters.priority = null
  filters.dateRange = null
}

const viewOrder = (id: number) => {
  selectedOrder.value = ordersStore.getOrderById(id)
  showViewModal.value = true
}

const editOrder = (id: number) => {
  // Реализация редактирования
  window.$message?.info('Редактирование заказа')
}

const deleteOrder = (id: number) => {
  if (window.$dialog) {
    window.$dialog.warning({
      title: 'Удаление заказа',
      content: 'Вы уверены, что хотите удалить этот заказ?',
      positiveText: 'Удалить',
      negativeText: 'Отмена',
      onPositiveClick: () => {
        ordersStore.deleteOrder(id)
        window.$message?.success('Заказ удален')
      }
    })
  }
}

const handleOrderSubmit = (orderData: any) => {
  ordersStore.addOrder(orderData)
  showCreateModal.value = false
  window.$message?.success('Заказ успешно создан')
}
</script>

<style scoped>
.orders-page {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
