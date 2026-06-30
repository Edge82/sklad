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
                <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">На складе</n-text>
                <n-h3 class="m-0 leading-none">{{ readyOrdersCount }}</n-h3>
              </div>
            </div>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card
            size="small"
            hoverable
            class="metric-card h-full flex flex-col justify-center"
            :class="{ 'active': filters.status === 'completed' }"
            @click="filters.status = 'completed'"
          >
            <div class="flex items-center gap-3 py-1">
              <n-icon size="28" color="#2080f0">
                <CheckmarkDoneOutline />
              </n-icon>
              <div>
                <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Завершён</n-text>
                <n-h3 class="m-0 leading-none">{{ completedOrdersCount }}</n-h3>
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
                <n-h3 class="m-0 leading-none revenue-value text-[22px]">{{ userStore.canSeePrices ? formatCurrency(revenueInWork) : '-' }}</n-h3>
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
            placeholder="Поиск по номеру, клиенту или комментарию"
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

      <div class="mb-4 flex justify-between items-center px-4">
        <div class="flex items-center gap-2">
          <n-text>Показывать:</n-text>
          <n-select v-model:value="itemsPerPage" :options="pageSizeOptions" class="w-32!" />
        </div>
      </div>

      <n-card border-variant="dark" class="orders-table-wrapper">
        <n-data-table
          :key="tableKey"
          class="orders-table"
          :columns="columns"
          :data="filteredOrders"
          :pagination="pagination"
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
              <th class="w-40 text-center!">Укомплектовано</th>
              <th class="w-32 text-right!">Кол-во</th>
              <th class="w-24 text-center!">Резерв</th>
              <th class="w-32 text-center!">Место хранения</th>
              <th class="w-40 text-center!">Склад</th>
              <th v-if="userStore.canSeePrices" class="w-40 text-right!">Сумма</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in selectedOrderForInvoices.items" :key="item.id">
              <td class="text-left!">{{ idx + 1 }}</td>
              <td class="font-bold text-green-500 text-left!">{{ item.productName }}</td>
              <td class="text-center!">
                <template v-if="orderItemProgress.get(item.productId)?.total">
                  <div class="flex justify-end text-xs mb-0.5 px-0.5" :class="(orderItemProgress.get(item.productId)?.percent || 0) >= 100 ? 'text-green-500' : 'text-amber-500'">
                    {{ orderItemProgress.get(item.productId)?.scanned }}/{{ orderItemProgress.get(item.productId)?.total }}
                  </div>
                  <n-tooltip trigger="hover" placement="top">
                    <template #trigger>
                      <n-progress
                        type="line"
                        :percentage="orderItemProgress.get(item.productId)?.percent || 0"
                        :indicator-placement="'inside'"
                        :status="(orderItemProgress.get(item.productId)?.percent || 0) >= 100 ? 'success' : 'warning'"
                        :processing="(orderItemProgress.get(item.productId)?.percent || 0) > 0 && (orderItemProgress.get(item.productId)?.percent || 0) < 100"
                        :height="18"
                      />
                    </template>
                    сгенерировано {{ orderItemProgress.get(item.productId)?.total || 0 }} QR кодов для деталей, на складе {{ orderItemProgress.get(item.productId)?.scannedWarehouse || 0 }} деталей с QR кодами
                  </n-tooltip>
                </template>
                <span v-else class="text-gray-400">—</span>
              </td>
              <td class="text-right! px-4">{{ item.quantity }} {{ item.unit }}</td>
              <td class="text-center!">
                <n-tag v-if="getOrderItemReserve(item)" size="small" type="info">
                  {{ getOrderItemReserve(item) }}
                </n-tag>
                <span v-else class="text-gray-500">0</span>
              </td>
              <td class="text-center!">{{ getStorageBin(item) }}</td>
              <td class="text-center!">{{ getWarehouse(item) }}</td>
              <td v-if="userStore.canSeePrices" class="text-right! font-mono px-4">{{ formatCurrency(item.totalPrice || 0) }}</td>
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

    <!-- Просмотр деталей заказа -->
    <n-modal
       v-model:show="showDetailsModal"
       preset="card"
       :auto-focus="false"
       title="Детали заказа"
       class="w-full! max-w-[900px]! min-w-[600px]!"
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
import { ref, h, computed, reactive, onMounted, onActivated, watch, onUnmounted } from 'vue'
import { useOrdersStore } from '@/stores/orders'
import { useQRCodesStore } from '@/stores/qrCodes'
import { useUserStore } from '@/stores/user'
import type { Order } from '@/types'
import { useInventoryStore } from '@/stores/inventory'
import { syncEvents } from '@/utils/syncEvents'
import {
  NButton,
  NIcon,
  NTag,
  NSpace,
  NModal,
  useMessage,
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
} from 'naive-ui'
import {
  QrCodeOutline,
  CreateOutline,
  ArrowBackOutline,
  SearchOutline,
  CubeOutline,
  TimeOutline,
  CheckmarkDoneOutline,
  CashOutline,
  SyncOutline
} from '@vicons/ionicons5'
import { useIntegrationStore } from '@/stores/integration'
import OrderQRManagerModal from '@/components/orders/OrderQRManagerModal.vue'
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
const userStore = useUserStore()
const inventoryStore = useInventoryStore()
const message = useMessage()
// Состояние синхронизации
const isSyncingOrders = ref(false)

const handleSyncOrders = async () => {
  isSyncingOrders.value = true
  try {
    await integrationStore.syncOrders()
    // Синк запущен в фоне, ждём SSE и перезагружаем
    message.success('Синхронизация заказов запущена')
  } catch (err: any) {
    message.error(`Ошибка синхронизации: ${err.message}`)
  } finally {
    isSyncingOrders.value = false
  }
}

// Автоматическая загрузка данных при инициализации
onMounted(async () => {
  await ordersStore.loadOrdersFromApi()
})

onActivated(async () => {
  await ordersStore.loadOrdersFromApi()
})

const tableKey = ref(0)

function handleSyncCompleted() {
  tableKey.value++
  ordersStore.loadOrdersFromApi()
  message.success('Заказы обновлены')
}

onMounted(() => {
  syncEvents.on('sync-completed', handleSyncCompleted)
})

onUnmounted(() => {
  syncEvents.off('sync-completed', handleSyncCompleted)
})

const showQRModal = ref(false)
const showDetailsModal = ref(false)

const selectedOrderForQR = ref<Order | null>(null)
const selectedOrderForDetails = ref<Order | null>(null)
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

// Пагинация
const currentPage = ref(1)
const itemsPerPage = ref(10)
const pageSizeOptions = [
  { label: '10', value: 10 },
  { label: '25', value: 25 },
  { label: '50', value: 50 },
  { label: 'Все', value: 1000 }
]

const pagination = computed(() => ({
  pageSize: itemsPerPage.value,
  page: currentPage.value,
  pageCount: Math.ceil(filteredOrders.value.length / itemsPerPage.value),
  showSizePicker: true,
  pageSizes: [10, 25, 50, 100],
  onChange: (page: number) => {
    currentPage.value = page
  },
  onUpdatePageSize: (pageSize: number) => {
    itemsPerPage.value = pageSize
    currentPage.value = 1
  }
}))

watch([searchQuery, filters], () => {
  currentPage.value = 1
}, { deep: true })

// Статистика
const totalOrdersCount = computed(() => visibleOrders.value.length)
const inProgressOrdersCount = computed(() => visibleOrders.value.filter(o => o.status === 'in_progress').length)
const readyOrdersCount = computed(() => visibleOrders.value.filter(o => o.status === 'ready').length)
const completedOrdersCount = computed(() => visibleOrders.value.filter(o => o.status === 'completed').length)

// Показываем только заказы со статусами: в работе, на складе, завершён
const visibleOrders = computed(() => {
  return ordersStore.orders.filter(o =>
    o.status === 'in_progress' || o.status === 'ready' || o.status === 'completed'
  )
})

const filteredOrders = computed(() => {
  let result = [...visibleOrders.value]

  if (filters.status) {
    result = result.filter(o => o.status === filters.status)
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(o =>
      o.orderNumber.toLowerCase().includes(query) ||
      o.customerName.toLowerCase().includes(query) ||
      (o.comment && o.comment.toLowerCase().includes(query))
    )
  }

  return result
})

const revenueInWork = computed(() => {
  return filteredOrders.value.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0)
})

const orderStatusOptions = computed(() => {
  const statuses = ['in_progress', 'ready', 'completed']

  return statuses.map(status => {
    let label = status as string

    if (status === 'in_progress') label = 'В работе'
    else if (status === 'ready') label = 'На складе'
    else if (status === 'completed') label = 'Завершён'

    return { label, value: status }
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
  await inventoryStore.loadStocksFromApi()
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

const getOrderItemReserve = (item: any): number => {
  const matched = inventoryStore.items.find(
    (s: any) => s.name === item.productName
  )
  if (matched && selectedOrderForInvoices.value) {
    return matched.reserveDetails?.get(selectedOrderForInvoices.value.id) || 0
  }
  return 0
}

const getStorageBin = (item: any): string => {
  const allMatches = inventoryStore.items.filter(
    (s: any) => s.name === item.productName || s.ref_key === item.productId || s.id === item.productId
  )
  if (allMatches.length === 0) return '-'
  const matched = allMatches.find((s: any) => s.warehouse === 'Готовая продукция') || allMatches[0]
  const bin = matched.storageBin
  if (bin && bin !== 'None') return bin
  return '-'
}

const getWarehouse = (item: any): string => {
  const allMatches = inventoryStore.items.filter(
    (s: any) => s.name === item.productName || s.ref_key === item.productId || s.id === item.productId
  )
  if (allMatches.length === 0) return '-'
  const mainMatch = allMatches.find((s: any) => s.warehouse === 'Основной склад') || allMatches[0]
  const wh = mainMatch.warehouse
  if (wh && wh !== 'None') return wh
  return '-'
}

const getItemQRProgress = (orderId: string, productId: string): { scanned: number, total: number, percent: number, scannedWarehouse: number } => {
  const codes = qrCodesStore.qrCodes.filter(q => q.orderId === orderId && q.productId === productId)
  const total = codes.length
  const scannedWarehouse = codes.filter(q => q.status === 'scanned').length
  const scanned = codes.filter(q => q.status === 'scanned' || q.status === 'shipped').length
  const percent = total > 0 ? Math.round((scanned / total) * 100) : 0
  return { scanned, total, percent, scannedWarehouse }
}

const orderItemProgress = computed(() => {
  if (!selectedOrderForInvoices.value) return new Map()
  const map = new Map<string, { scanned: number, total: number, percent: number, scannedWarehouse: number }>()
  selectedOrderForInvoices.value.items.forEach(item => {
    map.set(item.productId, getItemQRProgress(selectedOrderForInvoices.value!.id, item.productId))
  })
  return map
})

const goBack = () => {
  if (viewMode.value === 'details') {
    viewMode.value = 'invoices'
    selectedInvoiceDetail.value = null
  } else if (viewMode.value === 'invoices') {
    viewMode.value = 'list'
    selectedOrderForInvoices.value = null
  }
}


const columnsBase = [
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
  {
    title: 'Клиент',
    key: 'customerName',
    minWidth: 200,
    render(row: Order) {
      return h('div', {
        style: 'white-space: normal; overflow-wrap: break-word; word-break: break-word; line-height: 1.4;'
      }, row.customerName)
    }
  },
  {
    title: 'Дата',
    key: 'date',
    width: 140,
    render(row: Order) {
      if (!row.orderDate && !row.date) return '-'
      const dateStr = row.orderDate || row.date
      if (!dateStr) return '-'
      try {
        const date = new Date(dateStr)
        return date.toLocaleDateString('ru-RU')
      } catch {
        return dateStr
      }
    }
  },
  {
    title: 'Статус',
    key: 'status',
    width: 140,
    render(row: Order) {
      let type: 'info' | 'success' | 'warning' | 'error' = 'info'
      let label = row.status as string

      if (row.status === 'in_progress') {
        type = 'warning'
        label = 'В работе'
      } else if (row.status === 'ready') {
        type = 'success'
        label = 'На складе'
      } else if (row.status === 'completed') {
        type = 'info'
        label = 'Завершён'
      }

      // Если в notes пришел текст из 1С ("1С: В работе"), показываем его вместо стандартного label
      const statusFrom1C = row.notes?.startsWith('1С: ') ? row.notes.replace('1С: ', '') : null;
      const displayLabel = statusFrom1C || label;

      return h(NTag, { type, round: true, bordered: false }, { default: () => displayLabel })
    }
  },
  {
    title: 'Комментарий',
    key: 'comment',
    width: 200,
    ellipsis: true,
    render(row: Order) {
      return row.comment || '-'
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
    title: 'QR Коды',
    key: 'qr',
    width: 80,
    render(row: Order) {
      return h(NButton, {
        size: 'small',
        onClick: (e) => {
          e.stopPropagation()
          handleShowQR(row)
        }
      }, { icon: () => h(NIcon, null, { default: () => h(QrCodeOutline) }), default: () => 'QR' })
    }
  },
  {
    title: 'Действия',
    key: 'actions',
    width: 60,
    render(row: Order) {
      return h(NButton, {
        size: 'small',
        quaternary: true,
        onClick: (e) => {
          e.stopPropagation()
          handleShowDetails(row)
        }
      }, { icon: () => h(NIcon, null, { default: () => h(CreateOutline) }) })
    }
  }
]

// Фильтруем колонки по правам доступа
const columns = computed(() => {
  return columnsBase.filter(col => {
    // Скрываем колонку "Сумма" для пользователей без доступа к ценам
    if (col.key === 'totalAmount' && !userStore.canSeePrices) {
      return false
    }
    return true
  })
})
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

.orders-table-wrapper {
  width: 100%;
  overflow-x: auto;
}

.orders-table {
  width: 100%;
}

.orders-table ::v-deep(table) {
  width: 100%;
}

.orders-table ::v-deep(th),
.orders-table ::v-deep(td) {
  white-space: normal;
  word-break: break-word;
  overflow-wrap: break-word;
}

.orders-table ::v-deep(th:nth-child(2)),
.orders-table ::v-deep(td:nth-child(2)) {
  min-width: 200px;
  max-width: 400px;
}
</style>
