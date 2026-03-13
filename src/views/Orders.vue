<template>
  <div class="orders-page p-6">
    <div class="flex justify-between items-center mb-6">
      <div class="flex items-center gap-4">
        <n-button v-if="viewMode !== 'list'" circle @click="goBack" type="primary" secondary>
          <template #icon><n-icon><ArrowBackOutline /></n-icon></template>
        </n-button>
        <div>
          <n-h1 class="mb-0!">
             <span v-if="viewMode === 'list'">Заказы</span>
             <span v-else-if="viewMode === 'invoices'">Реестр накладных заказа {{ selectedOrderForInvoices?.orderNumber }}</span>
             <span v-else-if="viewMode === 'details'">Накладная {{ selectedInvoiceDetail?.id }}</span>
          </n-h1>
          <n-text depth="3">
             <span v-if="viewMode === 'list'">Управление заказами клиентов и WMS</span>
             <span v-else-if="viewMode === 'invoices'">Сводный список всех отпусков материалов по данному заказу</span>
             <span v-else-if="viewMode === 'details'">Детальный состав списания от сотрудника: {{ selectedInvoiceDetail?.employeeName }}</span>
          </n-text>
        </div>
      </div>
      <div v-if="viewMode === 'list'" class="flex gap-2 m-2">
        <n-button type="primary" @click="showCreateModal = true">
          <template #icon><n-icon><AddCircleOutline /></n-icon></template>
          Новый заказ
        </n-button>
      </div>
    </div>

    <!-- Режим списка заказов -->
    <div v-show="viewMode === 'list'">
      <!-- Статистика -->
      <n-grid :cols="5" :x-gap="12" :y-gap="12" class="mb-6 items-stretch py-2">
        <n-gi>
          <n-card 
            size="small" 
            hoverable
            class="metric-card h-full flex flex-col justify-center"
            :class="{ 'active': !filters.status }"
            @click="resetFilters"
          >
            <div class="flex items-center gap-3 py-1">
              <n-icon size="28" color="#2080f0">
                <CubeOutline />
              </n-icon>
              <div>
                <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Всего заказов</n-text>
                <n-h3 class="m-0 leading-none">{{ totalOrdersCount }}</n-h3>
              </div>
            </div>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card 
            size="small" 
            hoverable
            class="metric-card h-full flex flex-col justify-center"
            :class="{ 'active': filters.status === 'new' }"
            @click="filters.status = 'new'"
          >
            <div class="flex items-center gap-3 py-1">
              <n-icon size="28" color="#f0a020">
                <AppsOutline />
              </n-icon>
              <div>
                <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Новые</n-text>
                <n-h3 class="m-0 leading-none">{{ newOrdersCount }}</n-h3>
              </div>
            </div>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card 
            size="small" 
            hoverable
            class="metric-card h-full flex flex-col justify-center"
            :class="{ 'active': filters.status === 'in_progress' }"
            @click="filters.status = 'in_progress'"
          >
            <div class="flex items-center gap-3 py-1">
              <n-icon size="28" color="#f0a020">
                <TimeOutline />
              </n-icon>
              <div>
                <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">В производстве</n-text>
                <n-h3 class="m-0 leading-none">{{ inProgressOrdersCount }}</n-h3>
              </div>
            </div>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card 
            size="small" 
            hoverable
            class="metric-card h-full flex flex-col justify-center"
            :class="{ 'active': filters.status === 'ready' }"
            @click="filters.status = 'ready'"
          >
            <div class="flex items-center gap-3 py-1">
              <n-icon size="28" color="#18a058">
                <CheckmarkDoneOutline />
              </n-icon>
              <div>
                <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Готовы к выдаче</n-text>
                <n-h3 class="m-0 leading-none">{{ readyOrdersCount }}</n-h3>
              </div>
            </div>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card border-variant="dark" class="metric-card revenue-card h-full flex flex-col justify-center" size="small">
            <div class="flex items-center gap-3 py-1">
              <n-icon size="28" color="#18a058" :component="CashOutline" />
              <div>
                <n-text depth="3" class="revenue-label block mb-1">Выручка в работе</n-text>
                <n-h3 class="m-0 leading-none revenue-value text-[22px]">{{ formatCurrency(revenueInWork) }}</n-h3>
              </div>
            </div>
          </n-card>
        </n-gi>
      </n-grid>

      <!-- Фильтры -->
      <n-card class="mb-4" size="small">
        <n-space align="center" :size="[16, 12]">
          <n-input 
            v-model:value="searchQuery" 
            placeholder="Поиск по номеру или клиенту" 
            clearable
            class="w-96!"
          >
            <template #prefix>
              <n-icon><SearchOutline /></n-icon>
            </template>
          </n-input>
          
          <n-select 
            v-model:value="filters.status" 
            placeholder="Все статусы" 
            :options="[
              { label: 'Новый', value: 'new' },
              { label: 'В работе', value: 'in_progress' },
              { label: 'Готов', value: 'ready' },
              { label: 'Отгружен', value: 'shipped' }
            ]" 
            clearable 
            class="w-56!" 
          />
          
          <n-button @click="resetFilters" quaternary type="warning">
            Сбросить фильтры
          </n-button>
        </n-space>
      </n-card>

      <n-card border-variant="dark">
        <n-data-table 
          :columns="columns" 
          :data="filteredOrders" 
          :row-props="(row: Order) => ({
             class: 'cursor-pointer',
             onClick: () => handleRowClick(row)
          })"
        />
      </n-card>
    </div>

    <!-- Режим списка накладных конкретного заказа -->
    <div v-if="viewMode === 'invoices'">
       <n-card border-variant="dark">
          <n-data-table 
             :columns="invoiceRegistryColumns" 
             :data="orderInvoices" 
             :row-key="(row: InvoiceRow) => row.id"
             v-model:expanded-row-keys="expandedInvoiceKeys"
             :row-props="(row: InvoiceRow) => ({
                class: 'cursor-pointer',
                onClick: () => handleInvoiceRowClick(row)
             })"
          />
       </n-card>
    </div>

    <!-- Режим детального просмотра конкретной накладной -->
    <div v-if="viewMode === 'details'">
       <n-card border-variant="dark" class="p-0">
          <EmployeeProductionDocument 
            v-if="viewMode === 'details' && selectedInvoiceDetail"
            :tools="[]"
            :scannedItems="[]"
            :materials="[selectedInvoiceDetail]"
          />
       </n-card>
    </div>

    <OrderQRManagerModal
      v-if="selectedOrderForQR"
      :show="showQRModal"
      :order-id="selectedOrderForQR.id"
      :order-number="selectedOrderForQR.orderNumber"
      :items="selectedOrderForQR.items"
      @close="showQRModal = false"
    />

    <!-- Модальное окно создания/редактирования заказа -->
    <n-modal
      v-model:show="showCreateModal"
      preset="card"
      :auto-focus="false"
      :title="selectedOrderForEdit ? 'Редактировать заказ' : 'Новый заказ'"
      class="w-200!"
    >
      <OrderForm 
        :initial-data="selectedOrderForEdit || undefined" 
        @submit="handleOrderSubmit" 
        @cancel="showCreateModal = false" 
      />
    </n-modal>

    <!-- Просмотр деталей заказа -->
    <n-modal
      v-model:show="showDetailsModal"
      preset="card"
      :auto-focus="false"
      title="Детали заказа"
      class="w-225!"
    >
      <OrderDetails v-if="selectedOrderForDetails" :order="selectedOrderForDetails" />
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, h, watch, computed, reactive, nextTick } from 'vue'
import { useOrdersStore } from '@/stores/orders'
import { useEmployeesStore } from '@/stores/employees'
import { useQRCodesStore } from '@/stores/qrCodes'
import type { Order } from '@/types'
import { 
  NButton, 
  NIcon, 
  NTag, 
  NSpace, 
  NModal, 
  useMessage, 
  useDialog, 
  NH1, 
  NText, 
  NGrid, 
  NGi, 
  NCard, 
  NDataTable, 
  NProgress,
  NInput,
  NSelect,
  NTable
} from 'naive-ui'
import {
  AddCircleOutline,
  QrCodeOutline,
  EyeOutline,
  CreateOutline,
  TrashOutline,
  ArrowBackOutline,
  SearchOutline,
  CubeOutline,
  TimeOutline,
  CheckmarkDoneOutline,
  CashOutline,
  AppsOutline
} from '@vicons/ionicons5'
import OrderQRManagerModal from '@/components/orders/OrderQRManagerModal.vue'
import OrderForm from '@/components/orders/OrderForm.vue'
import OrderDetails from '@/components/orders/OrderDetails.vue'
import EmployeeProductionDocument from '@/components/employees/EmployeeProductionDocument.vue'

interface InvoiceRow {
  id: string
  date: Date
  orderNumber: string
  items: Array<{
    productName: string
    article?: string
    unit: string
    quantity: number
    scannedAt?: Date
  }>
  employeeName: string
  employeeId: string
  employeePosition: string
}

const ordersStore = useOrdersStore()
const employeesStore = useEmployeesStore()
const qrCodesStore = useQRCodesStore()
const message = useMessage()
const dialog = useDialog()
const showCreateModal = ref(false)
const showQRModal = ref(false)
const showDetailsModal = ref(false)

const selectedOrderForQR = ref<Order | null>(null)
const selectedOrderForDetails = ref<Order | null>(null)
const selectedOrderForEdit = ref<Order | null>(null)
const selectedOrderForInvoices = ref<Order | null>(null)
const selectedInvoiceDetail = ref<InvoiceRow | null>(null)

// Для управления раскрытыми строками в реестре накладных
const expandedInvoiceKeys = ref<string[]>([])

// Навигация: 'list' (список заказов), 'invoices' (список накладных заказа), 'details' (просмотр накладной)
const viewMode = ref<'list' | 'invoices' | 'details'>('list')

// Фильтры
const searchQuery = ref('')
const filters = reactive({
  status: null as string | null
})

const resetFilters = () => {
  searchQuery.value = ''
  filters.status = null
}

// Статистика
const totalOrdersCount = computed(() => ordersStore.orders.length)
const newOrdersCount = computed(() => ordersStore.orders.filter(o => o.status === 'new').length)
const inProgressOrdersCount = computed(() => ordersStore.orders.filter(o => o.status === 'in_progress').length)
const readyOrdersCount = computed(() => ordersStore.orders.filter(o => o.status === 'ready').length)
const revenueInWork = computed(() => {
  return filteredOrders.value
    .filter(o => o.status !== 'shipped' && o.status !== 'completed')
    .reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0)
})

const filteredOrders = computed(() => {
  let result = [...ordersStore.orders]

  if (filters.status) {
    result = result.filter(o => o.status === filters.status)
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(o => 
      o.orderNumber.toLowerCase().includes(query) ||
      o.customerName.toLowerCase().includes(query)
    )
  }

  return result
})

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0
  }).format(amount)
}

const handleRowClick = (row: Order) => {
  handleViewInvoices(row)
}

const handleViewInvoices = (row: Order) => {
  selectedOrderForInvoices.value = row
  viewMode.value = 'invoices'
  // Свернуто по умолчанию
  expandedInvoiceKeys.value = []
}

const handleInvoiceRowClick = (row: InvoiceRow) => {
  const index = expandedInvoiceKeys.value.indexOf(row.id)
  if (index > -1) {
    expandedInvoiceKeys.value.splice(index, 1)
  } else {
    expandedInvoiceKeys.value.push(row.id)
  }
}

// Собираем все накладные по всем сотрудникам для выбранного заказа
const orderInvoices = computed(() => {
  if (!selectedOrderForInvoices.value) return []
  
  const orderNumber = selectedOrderForInvoices.value.orderNumber
  const allInvoices: InvoiceRow[] = []
  
  employeesStore.employees.forEach(emp => {
    if (emp && emp.materialHistory) {
      emp.materialHistory.forEach(inv => {
        if (inv && inv.orderNumber === orderNumber) {
          allInvoices.push({
            ...inv,
            id: inv.id || `inv-${Math.random().toString(36).substr(2, 9)}`,
            employeeName: emp.name,
            employeeId: emp.id,
            employeePosition: emp.position
          })
        }
      })
    }
  })
  
  return allInvoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})

// Настройка колонок для реестра накладных внутри заказа
const invoiceRegistryColumns: any[] = [
  {
    type: 'expand',
    expandAble: () => true,
    renderExpand: (row: InvoiceRow) => {
      const items = row.items || []
      return h('div', { 
        class: 'p-4 bg-[rgba(255,255,255,0.02)] border-t border-gray-800',
        style: 'display: block !important; width: 100%' 
      }, [
        h(NTable, { 
          singleLine: false, 
          size: 'small', 
          striped: true,
          style: 'margin-bottom: 0'
        }, {
          default: () => [
            h('thead', [
              h('tr', [
                h('th', 'Артикул'),
                h('th', 'Наименование'),
                h('th', { class: 'text-right' }, { default: () => 'Количество' }),
                h('th', { class: 'text-right' }, { default: () => 'Ед. изм.' })
              ])
            ]),
            h('tbody', items.map((item: any) => h('tr', [
              h('td', item.article || '—'),
              h('td', item.productName),
              h('td', { class: 'text-right' }, item.quantity),
              h('td', { class: 'text-right' }, item.unit)
            ])))
          ]
        })
      ])
    }
  },
  {
    title: 'ID Накладной',
    key: 'id',
    render: (row: InvoiceRow) => h('div', { class: 'font-mono font-bold text-green-500' }, row.id)
  },
  {
    title: 'Дата и время',
    key: 'date',
    render: (row: InvoiceRow) => h('div', formatDate(row.date))
  },
  {
    title: 'Сотрудник',
    key: 'employeeName',
    render: (row: InvoiceRow) => h('div', [
      h('div', { class: 'font-bold' }, row.employeeName),
      h('div', { class: 'text-[10px] text-gray-500 uppercase' }, row.employeePosition)
    ])
  },
  {
    title: 'Позиций ТМЦ',
    key: 'itemsCount',
    render: (row: InvoiceRow) => h(NTag, { type: 'success', quaternary: true }, { default: () => `${row.items?.length || 0} шт.` })
  }
]

const formatDate = (date: Date | string) => {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}

const goBack = () => {
  if (viewMode.value === 'details') {
    viewMode.value = 'invoices'
    selectedInvoiceDetail.value = null
  } else if (viewMode.value === 'invoices') {
    viewMode.value = 'list'
    selectedOrderForInvoices.value = null
  }
}

watch(showCreateModal, (val) => {
  if (!val) selectedOrderForEdit.value = null
})

const handleOrderSubmit = (data: Partial<Order>) => {
  if (selectedOrderForEdit.value) {
    ordersStore.updateOrder(selectedOrderForEdit.value.id, data as Order)
    message.success('Заказ успешно обновлен')
  } else {
    ordersStore.addOrder(data as Order)
    message.success('Заказ успешно создан')
  }
  showCreateModal.value = false
}

const handleDeleteOrder = (order: Order) => {
  dialog.warning({
    title: 'Удаление заказа',
    content: `Вы уверены, что хотите удалить заказ ${order.orderNumber}?`,
    positiveText: 'Удалить',
    negativeText: 'Отмена',
    onPositiveClick: () => {
      ordersStore.deleteOrder(order.id)
      message.success('Заказ удален')
    }
  })
}

const columns = [
  { 
    title: 'Номер', 
    key: 'orderNumber',
    width: 140,
    render(row: Order) {
      return h('span', {
        style: 'font-weight: 800; font-family: monospace; font-size: 14px; color: var(--n-primary-color);'
      }, row.orderNumber)
    }
  },
  { title: 'Клиент', key: 'customerName', width: 200 },
  {
    title: 'Готовность (склад)',
    key: 'qrProgress',
    width: 220,
    render(row: Order) {
      const percentage = ordersStore.getOrderProgress(row.id, qrCodesStore.qrCodes)
      const orderCodes = qrCodesStore.qrCodes.filter(q => q.orderId === row.id)
      const scannedCount = orderCodes.filter(q => q.status === 'scanned' || q.status === 'shipped').length
      const generatedCount = orderCodes.length
      
      let status: 'default' | 'info' | 'success' | 'warning' | 'error' = 'info'
      if (percentage >= 100) status = 'success'
      else if (percentage > 0) status = 'warning'

      return h('div', { style: 'width: 100%' }, [
        h('div', { class: 'flex justify-end items-center mb-1 px-1' }, [
          h(NText, { strong: true, style: 'font-size: 10px', type: status === 'success' ? 'success' : 'default' }, { default: () => `Готово: ${scannedCount}/${generatedCount}` })
        ]),
        h(NProgress, {
          type: 'line',
          percentage,
          indicatorPlacement: 'inside',
          status,
          processing: percentage > 0 && percentage < 100,
          railColor: generatedCount > scannedCount ? 'rgba(240, 160, 32, 0.2)' : undefined
        })
      ])
    }
  },
  { 
    title: 'Статус', 
    key: 'status',
    render(row: Order) {
      return h(NTag, { type: 'info' }, { default: () => row.status })
    }
  },
  {
    title: 'Действия',
    key: 'actions',
    render(row: Order) {
      return h(NSpace, null, {
        default: () => [
          h(NButton, {
            size: 'small',
            onClick: (e) => {
              e.stopPropagation()
              selectedOrderForQR.value = row
              showQRModal.value = true
            }
          }, { icon: () => h(NIcon, null, { default: () => h(QrCodeOutline) }), default: () => 'QR' }),
          h(NButton, { 
            size: 'small', 
            quaternary: true,
            onClick: (e) => {
              e.stopPropagation()
              selectedOrderForDetails.value = row
              showDetailsModal.value = true
            }
          }, { icon: () => h(NIcon, null, { default: () => h(EyeOutline) }) }),
          h(NButton, { 
            size: 'small', 
            quaternary: true,
            onClick: (e) => {
              e.stopPropagation()
              selectedOrderForEdit.value = row
              showCreateModal.value = true
            }
          }, { icon: () => h(NIcon, null, { default: () => h(CreateOutline) }) }),
          h(NButton, { 
            size: 'small', 
            quaternary: true,
            type: 'error',
            onClick: (e) => {
              e.stopPropagation()
              handleDeleteOrder(row)
            }
          }, { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) })
        ]
      })
    }
  }
]
</script>

<style scoped>
.orders-page {
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 24px;
}
@media (max-width: 768px) {
  .orders-page {
    padding: 0 12px;
  }
}

.metric-card {
  height: 100%;
  background-color: #2a2a2a;
  border-bottom: 4px solid transparent;
  transition: all 0.3s ease;
  cursor: pointer;
}

.metric-card:not(.revenue-card):hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  background-color: #333;
}

.metric-card.active {
  background-color: #333;
  border-bottom-color: #18a058;
}

.revenue-card {
  background: rgba(24, 160, 88, 0.1) !important;
  border: 1px solid rgba(24, 160, 88, 0.3) !important;
  cursor: default !important;
}

.revenue-label {
  color: #18a058 !important;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 10px;
  line-height: 1;
  margin-bottom: 4px;
}

.line-height-1 {
  line-height: 1;
}

.revenue-value {
  color: #18a058 !important;
  font-weight: 900 !important;
}
</style>
