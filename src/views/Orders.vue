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
             <span v-else-if="viewMode === 'invoices'">Заказ {{ selectedOrderForInvoices?.orderNumber }}</span>
             <span v-else-if="viewMode === 'details'">Накладная {{ selectedInvoiceDetail?.id }}</span>
          </n-h1>
          <n-text depth="3">
             <span v-if="viewMode === 'list'">Управление заказами клиентов и WMS</span>
             <span v-else-if="viewMode === 'invoices'">Просмотр состава заказа из 1С</span>
             <span v-else-if="viewMode === 'details'">Детальный состав списания от сотрудника: {{ selectedInvoiceDetail?.employeeName }}</span>
          </n-text>
        </div>
      </div>
      <div v-if="viewMode === 'list'" class="flex gap-2 m-2">
        <n-button 
          secondary 
          type="info" 
          :loading="isSyncingOrders" 
          @click="handleSyncOrders"
        >
          <template #icon><n-icon><SyncOutline /></n-icon></template>
          Синхронизация с 1С
        </n-button>
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
                <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Не обработанные</n-text>
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
                <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">В работе</n-text>
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
                <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Завершен</n-text>
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
                <n-text depth="3" class="revenue-label block mb-1">Стоимость заказов</n-text>
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
            :options="orderStatusOptions" 
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
      <n-card border-variant="dark" :title="`Заказ ${selectedOrderForInvoices?.orderNumber || ''}`" class="mb-4">
        <div v-if="loadingDetails" class="flex flex-col items-center justify-center py-8 gap-3">
          <n-spin size="large" />
          <n-text depth="3">Загрузка состава заказа...</n-text>
        </div>
        <n-table v-else-if="selectedOrderForInvoices?.items?.length" striped size="small">
          <thead>
            <tr>
              <th class="w-16 text-left!">№</th>
              <th class="text-left!">Наименование</th>
              <th class="w-32 text-right!">Кол-во</th>
              <th class="w-40 text-right!">Сумма</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in selectedOrderForInvoices.items" :key="item.id">
              <td class="text-left!">{{ idx + 1 }}</td>
              <td class="font-bold text-green-500 text-left!">{{ item.productName }}</td>
              <td class="text-right! px-4">{{ item.quantity }} {{ item.unit }}</td>
              <td class="text-right! font-mono px-4">{{ formatCurrency(item.totalPrice || 0) }}</td>
            </tr>
          </tbody>
        </n-table>
        <n-empty v-else description="Позиции не найдены" />
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
      <OrderDetails 
        v-if="selectedOrderForDetails" 
        :order="selectedOrderForDetails" 
        :loading="loadingDetails"
      />
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, h, watch, computed, reactive, onMounted } from 'vue'
import { useOrdersStore } from '@/stores/orders'
import { useEmployeesStore } from '@/stores/employees'
import { useQRCodesStore } from '@/stores/qrCodes'
import type { Order, MaterialInvoiceItem } from '@/types'
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
  NTable,
  type DataTableColumns
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
  AppsOutline,
  SyncOutline
} from '@vicons/ionicons5'
import { useIntegrationStore } from '@/stores/integration'
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
const integrationStore = useIntegrationStore()
const qrCodesStore = useQRCodesStore()
const message = useMessage()
const dialog = useDialog()

// Состояние синхронизации
const isSyncingOrders = ref(false)

const handleSyncOrders = async () => {
  isSyncingOrders.value = true
  try {
    await integrationStore.syncOrders()
    message.success('Заказы успешно загружены из 1С')
  } catch (err: any) {
    message.error(`Ошибка синхронизации: ${err.message}`)
  } finally {
    isSyncingOrders.value = false
  }
}

// Автоматическая загрузка данных при инициализации (один раз)
onMounted(async () => {
  if (ordersStore.orders.length === 0) {
    handleSyncOrders()
  }
})

const showCreateModal = ref(false)
const showQRModal = ref(false)
const showDetailsModal = ref(false)

const selectedOrderForQR = ref<Order | null>(null)
const selectedOrderForDetails = ref<Order | null>(null)
const selectedOrderForEdit = ref<Order | null>(null)
const selectedOrderForInvoices = ref<Order | null>(null)
const selectedInvoiceDetail = ref<InvoiceRow | null>(null)
const loadingDetails = ref(false)

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
const readyOrdersCount = computed(() => ordersStore.orders.filter(o => o.status === 'ready' || o.status === 'shipped' || o.status === 'completed').length)

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
      o.customerName.toLowerCase().includes(query) ||
      (o.notes && o.notes.toLowerCase().includes(query))
    )
  }

  return result
})

const orderStatusOptions = computed(() => {
  const statuses = new Set<string>()
  ordersStore.orders.forEach(o => {
    if (o.status) statuses.add(o.status)
  })
  
  const options = Array.from(statuses).map(status => {
    // Получаем label для этого статуса точно так же, как в колонке таблицы
    let label = status as string
    
    // Сначала проверяем 1С-овское наименование из первого попавшегося заказа с таким статусом
    const sampleOrder = ordersStore.orders.find(o => o.status === status)
    if (sampleOrder?.notes?.startsWith('1С: ')) {
      label = sampleOrder.notes.replace('1С: ', '')
    } else {
      // Если нет заметки из 1С, используем стандартные переводы
      if (status === 'new') label = 'Не обработанные'
      else if (status === 'in_progress') label = 'В работе'
      else if (status === 'ready') label = 'Завершен'
      else if (status === 'shipped') label = 'Отгружен'
      else if (status === 'completed') label = 'Выполнен'
    }
    
    return { label, value: status }
  })

  // Сортируем для удобства (например, Новый всегда в начале)
  const order = ['new', 'in_progress', 'ready', 'shipped', 'completed']
  return options.sort((a, b) => {
    const idxA = order.indexOf(a.value)
    const idxB = order.indexOf(b.value)
    if (idxA !== -1 && idxB !== -1) return idxA - idxB
    if (idxA !== -1) return -1
    if (idxB !== -1) return 1
    return a.label.localeCompare(b.label)
  })
})

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0
  }).format(amount)
}

const handleShowDetails = async (order: Order) => {
  selectedOrderForDetails.value = order
  showDetailsModal.value = true
  
  // Если у заказа нет позиций, пробуем загрузить их из 1С
  if (!order.items || order.items.length === 0) {
    loadingDetails.value = true
    try {
      await integrationStore.syncOrderDetails(order.id)
      // Обновляем ссылку на заказ, чтобы UI увидел новые данные
      const updatedOrder = ordersStore.orders.find(o => o.id === order.id)
      if (updatedOrder) {
        selectedOrderForDetails.value = { ...updatedOrder }
      }
    } finally {
      loadingDetails.value = false
    }
  }
}

const handleShowQR = async (order: Order) => {
  selectedOrderForQR.value = order
  showQRModal.value = true
  
  // Если у заказа нет позиций, подгружаем их из 1С (аналогично глазу)
  if (!order.items || order.items.length === 0) {
    loadingDetails.value = true
    try {
      await integrationStore.syncOrderDetails(order.id)
      const updated = ordersStore.orders.find(o => o.id === order.id)
      if (updated) {
        selectedOrderForQR.value = { ...updated }
      }
    } finally {
      loadingDetails.value = false
    }
  }
}

const handleRowClick = async (row: Order) => {
  selectedOrderForInvoices.value = row
  viewMode.value = 'invoices'
  expandedInvoiceKeys.value = []

  // Если у заказа нет позиций, подгружаем их из 1С
  if (!row.items || row.items.length === 0) {
    loadingDetails.value = true
    try {
      await integrationStore.syncOrderDetails(row.id)
      const updated = ordersStore.orders.find(o => o.id === row.id)
      if (updated) {
        selectedOrderForInvoices.value = { ...updated }
      }
    } finally {
      loadingDetails.value = false
    }
  }
}

const handleViewInvoices = (row: Order) => {
  handleRowClick(row)
}

const handleInvoiceRowClick = (row: InvoiceRow) => {
  // Not used in simplified view
}

// Собираем все накладные по всем сотрудникам для выбранного заказа
const _unused_orderInvoices = computed(() => {
  return [] // Simplified view
})

// Настройка колонок для реестра накладных внутри заказа
const _unused_invoiceRegistryColumns: DataTableColumns<InvoiceRow> = [
  {
    type: 'expand',
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
            h('tbody', items.map((item: MaterialInvoiceItem) => h('tr', [
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
    title: 'Дата',
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
      let type: 'info' | 'success' | 'warning' | 'error' = 'info'
      let label = row.status as string
      
      if (row.status === 'new') {
        type = 'info'
        label = 'Не обработанные'
      } else if (row.status === 'in_progress') {
        type = 'warning'
        label = 'В работе'
      } else if (row.status === 'ready') {
        type = 'success'
        label = 'Завершен'
      } else if (row.status === 'shipped') {
        type = 'success'
        label = 'Отгружен'
      } else if (row.status === 'completed') {
        type = 'success'
        label = 'Выполнен'
      }

      // Если в notes пришел текст из 1С ("1С: В работе"), показываем его вместо стандартного label
      const statusFrom1C = row.notes?.startsWith('1С: ') ? row.notes.replace('1С: ', '') : null;
      const displayLabel = statusFrom1C || label;

      return h(NSpace, { vertical: true, size: 'small', align: 'center' }, {
        default: () => [
          h(NTag, { type, round: true, bordered: false }, { default: () => displayLabel })
        ]
      })
    }
  },
  {
    title: 'Сумма',
    key: 'totalAmount',
    width: 120,
    render(row: Order) {
      return formatCurrency(row.totalAmount || 0)
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
              handleShowQR(row)
            }
          }, { icon: () => h(NIcon, null, { default: () => h(QrCodeOutline) }), default: () => 'QR' }),
          h(NButton, { 
            size: 'small', 
            quaternary: true,
            onClick: (e) => {
              e.stopPropagation()
              handleShowDetails(row)
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
