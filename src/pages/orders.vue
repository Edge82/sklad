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
          max-height="calc(100vh - 350px)"
          :row-props="(row: Order) => ({
             class: 'cursor-pointer',
             onClick: () => handleRowClick(row)
          })"
        />
      </n-card>
    </div>

    <!-- Режим списка накладных конкретного заказа -->
    <div v-if="viewMode === 'invoices'">
      <n-card border-variant="dark" :title="`Заказ ${selectedOrderForInvoices?.orderNumber || ''}`" class="mb-4 invoices-card">
        <div class="mb-3">
          <n-input
            v-model:value="orderDetailSearch"
            placeholder="Поиск по позиции..."
            clearable
            style="width: 400px"
          />
        </div>
        <div v-if="loadingDetails" class="flex flex-col items-center justify-center py-8 gap-3">
          <n-spin size="large" />
          <n-text depth="3">Загрузка состава заказа...</n-text>
        </div>
       <div v-else-if="selectedOrderForInvoices.items.length" class="invoices-table-scroll">
        <table class="invoices-table">
          <thead>
            <tr>
              <th class="w-16 text-left!">№</th>
              <th class="text-left!">Наименование</th>
              <th class="w-40 text-center!">Укомплектовано</th>
              <th class="w-32 text-right!">Кол-во</th>
              <th class="w-24 text-center!">Резерв</th>
              <th class="w-24 text-center!">Выдано<br />сотруднику</th>
              <th class="w-24 text-center!">Место хранения<br />(фурнитура заказа)</th>
              <th class="w-32 text-center!">Склад</th>
              <th v-if="userStore.canSeePrices" class="w-40 text-right!">Сумма</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="(group, groupIdx) in filteredGroupedItems" :key="group.productId">
             <tr v-for="(item, idx) in group.items" :key="item.id"
                   class="cursor-pointer hover:bg-white/5 transition-colors">
                <td class="text-left!"
                    :style="group.items.length > 1 ? 'border-left: 3px solid #3b82f6; padding-left: 8px;' : ''">
                  {{ group.globalStartIdx + idx }}
                </td>
              <td class="font-bold text-left! text-white">
                   <span
                     style="cursor: pointer;"
  
                     @click.stop="handleItemClick(item)"
                   >{{ item.productName }}</span>
                 </td>
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
                  <n-tag v-if="group.items.length === 1 && getOrderItemReserve(item)" size="small" type="info">
                    {{ getOrderItemReserve(item) }}
                  </n-tag>
                </td>
                <td class="text-center!">
                  <span v-if="group.items.length > 1 && idx < group.items.length - 1"></span>
                  <span v-else-if="group.items.length === 1 && getFittingsIssued(item) !== null">{{ getFittingsIssued(item) }}</span>
                  <span v-else></span>
                </td>
                <td class="text-center!">
                  <template v-if="isFittingsItem(item) && group.items.length === 1">
                    <textarea
                      class="storage-input"
                      ref="(el: HTMLElement) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' } }"
                      :style="'width: 100%; background: transparent; border: 1px solid transparent; border-radius: 4px; padding: 2px 6px; color: #aaa; font-size: 13px; outline: none; transition: all 0.2s; resize: none; overflow: hidden; word-break: break-word; white-space: pre-wrap; font-family: inherit; line-height: 1.4;'"
                      :value="fittingsBinsCache[item.productId] || ''"
                      placeholder="Введите место..."
                      rows="1"
                      @focus="(e: FocusEvent) => { const el = e.target as HTMLElement; el.style.borderColor = '#18a058'; el.style.color = '#fff'; el.style.background = 'rgba(24,160,88,0.08)' }"
                      @blur="(e: FocusEvent) => { const el = e.target as HTMLElement; el.style.borderColor = 'transparent'; el.style.color = '#aaa'; el.style.background = 'transparent'; saveFittingsBin(item) }"
                      @input="(e: Event) => { const el = e.target as HTMLTextAreaElement; el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; fittingsBinsCache[item.productId] = el.value }"
                    />
                  </template>
                </td>
                <td class="text-center!">{{ getWarehouse(item) }}</td>
                <td v-if="userStore.canSeePrices" class="text-right! font-mono px-4">{{ formatCurrency(item.totalPrice || 0) }}</td>
              </tr>
              <tr v-if="group.items.length > 1" class="font-bold" style="border-top: 2px solid #3b82f6;">
                <td style="padding-left: 11px;"></td>
                <td class="text-left! pl-4">Итого:</td>
                <td class="text-center!"></td>
                <td class="text-right! px-4">{{ group.totalQuantity }} {{ group.unit }}</td>
                <td class="text-center!">
                  <n-tag size="small" type="info">
                    {{ group.totalReserve }}
                  </n-tag>
                </td>
                <td class="text-center!">
                  <span v-if="group.totalIssued !== null">{{ group.totalIssued }}</span>
                </td>
                <td class="text-center!">
                  <template v-if="isFittingsItem(group.items[0])">
                    <textarea
                      class="storage-input"
                      ref="(el: HTMLElement) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' } }"
                      :style="'width: 100%; background: transparent; border: 1px solid transparent; border-radius: 4px; padding: 2px 6px; color: #aaa; font-size: 13px; outline: none; transition: all 0.2s; resize: none; overflow: hidden; word-break: break-word; white-space: pre-wrap; font-family: inherit; line-height: 1.4;'"
                      :value="fittingsBinsCache[group.productId] || ''"
                      placeholder="Введите место..."
                      rows="1"
                      @focus="(e: FocusEvent) => { const el = e.target as HTMLElement; el.style.borderColor = '#18a058'; el.style.color = '#fff'; el.style.background = 'rgba(24,160,88,0.08)' }"
                      @blur="(e: FocusEvent) => { const el = e.target as HTMLElement; el.style.borderColor = 'transparent'; el.style.color = '#aaa'; el.style.background = 'transparent'; saveFittingsBinByGroup(group) }"
                      @input="(e: Event) => { const el = e.target as HTMLTextAreaElement; el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; fittingsBinsCache[group.productId] = el.value }"
                    />
                  </template>
                </td>
                <td></td>
                <td v-if="userStore.canSeePrices" class="text-right! font-mono px-4">{{ formatCurrency(group.totalPrice) }}</td>
              </tr>
            </template>
          </tbody>
        </table>
        </div>
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

    <InventoryItemModal
      v-model:show="showItemModal"
      :item-id="selectedItemForEdit"
      mode="material"
    :multi-warehouse-items="multiWarehouseItems"
       :show-multi-warehouse="true"
       :has-fg-record="hasFgRecord"
  
      @update:show="handleItemModalClose"
    />
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
import { API_BASE_URL } from '@/config/api'
import OrderQRManagerModal from '@/components/orders/OrderQRManagerModal.vue'
import OrderDetails from '@/components/orders/OrderDetails.vue' // legacy — модалка удалена
import EmployeeProductionDocument from '@/components/employees/EmployeeProductionDocument.vue'
import InventoryItemModal from '@/components/inventory/InventoryItemModal.vue'

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

const showItemModal = ref(false)
const selectedItemForEdit = ref<string | null>(null)
const multiWarehouseItems = ref<{ refKey: string; warehouse: string; storageBin: string; barcode: string; lowStockThreshold: number | null; image: string }[]>([])
const hasFgRecord = ref(false)

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

const tableKey = ref(0)

function handleSyncCompleted() {
  tableKey.value++
  ordersStore.loadOrdersFromApi()
  if (viewMode.value === 'invoices' && selectedOrderForInvoices.value) {
    loadOrderItemData(selectedOrderForInvoices.value).catch(() => {})
  }
  message.success('Данные обновлены')
}

const handleItemClick = (item: any) => {
  const allMatches = inventoryStore.items.filter(
    (s: any) => s.name === item.productName || s.ref_key === item.productId || s.id === item.productId
  )
  if (allMatches.length === 0) {
    message.warning(`Материал «${item.productName}» не найден на складе`)
    return
  }
  // Находим основную запись 1C для "Готовая продукция" (не local_only)
  const fgItem = allMatches.find((s: any) => s.warehouse === 'Готовая продукция' && !s.id.startsWith('qr-')) ||
                 allMatches.find((s: any) => s.warehouse === 'Готовая продукция') ||
                 allMatches[0]
  hasFgRecord.value = fgItem.warehouse === 'Готовая продукция'
  selectedItemForEdit.value = fgItem.id
 // ТМЦ — любая запись не на складе ГП и не QR-запись
  const tmcItem = allMatches.find((s: any) => s.warehouse !== 'Готовая продукция' && !s.id.startsWith('QR-') && !s.id.startsWith('qr-'))
  multiWarehouseItems.value = tmcItem ? [{
    refKey: tmcItem.id,
    warehouse: tmcItem.warehouse || '',
    storageBin: tmcItem.storageBin || '',
    barcode: tmcItem.barcode || '',
    lowStockThreshold: tmcItem.lowStockThreshold || null,
    image: tmcItem.image || ''
  }] : []

  showItemModal.value = true
}

const handleItemModalClose = async (val: boolean) => {
  if (!val) {
    selectedItemForEdit.value = null
    multiWarehouseItems.value = []
    hasFgRecord.value = false
 
    await inventoryStore.loadStocksFromApi()
  }
}

onMounted(() => {
  ordersStore.loadOrdersFromApi()
})

onActivated(async () => {
  await ordersStore.loadOrdersFromApi()
  // Обновляем данные деталей заказа, если заказ открыт
  if (viewMode.value === 'invoices' && selectedOrderForInvoices.value) {
    await loadOrderItemData(selectedOrderForInvoices.value)
  }
})

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
const orderDetailSearch = ref('')
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
  expandedInvoiceKeys.value = []
  inventoryStore.loadStocksFromApi().catch(() => {})
  loadOrderItemData(row).catch(() => {})

  // Если у заказа нет позиций, подгружаем их из 1С
  if (!row.items || row.items.length === 0) {
    loadingDetails.value = true
    try {
      await integrationStore.syncOrderDetails(row.id)
      const updated = ordersStore.orders.find(o => o.id === row.id)
      if (updated) {
        selectedOrderForInvoices.value = { ...updated }
        await loadOrderItemData(updated)
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

const fittingsIssuedCache = ref(new Map<string, number>())

const loadOrderItemData = async (order: Order) => {
  if (!order.items || !order.orderNumber) return
  try {
    const res = await fetch(`/sklad/api/order-items/bulk-data?orderNumber=${encodeURIComponent(order.orderNumber)}`)
    if (res.ok) {
      const data = await res.json()
      if (data.success) {
        const newIssued = new Map<string, number>()
        for (const item of order.items) {
          const trimmedName = item.productName.trim()
          const issued = data.issued[trimmedName]
          if (issued !== undefined) {
            newIssued.set(item.productId, issued)
          }
        }
        fittingsIssuedCache.value = newIssued
        fittingsBinsCache.value = data.bins || {}
      }
    }
  } catch (err) {
    console.error('Error fetching order item data:', err)
  }
}

const getFittingsIssued = (item: any): number | null => {
  if (!selectedOrderForInvoices.value) return null
  const qty = fittingsIssuedCache.value.get(item.productId)
  if (qty === undefined) return null
  return qty > 0 ? qty : null
}

const isFittingsItem = (item: any): boolean => {
  const allMatches = inventoryStore.items.filter(
    (s: any) => s.name === item.productName || s.ref_key === item.productId || s.id === item.productId
  )
  return allMatches.some((s: any) =>
    s.warehouse === 'Склад Фурнитуры (резерв цех)' ||
    s.category === 'Фурнитура (торг)' ||
    s.categoryId === '2'
  )
}

const fittingsBinsCache = ref<Record<string, string>>({})


const saveFittingsBin = (item: any) => {
  if (!selectedOrderForInvoices.value) return
  const order = selectedOrderForInvoices.value
  const value = fittingsBinsCache.value[item.productId] || ''
  fetch(`/sklad/api/order-items/fittings-bin`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderNumber: order.orderNumber, productId: item.productId, storageBin: value }),
  }).catch(err => console.error('Error saving fittings bin:', err))
}

const saveFittingsBinByGroup = (group: any) => {
  if (!selectedOrderForInvoices.value) return
  const order = selectedOrderForInvoices.value
  const value = fittingsBinsCache.value[group.productId] || ''
  fetch(`/sklad/api/order-items/fittings-bin`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderNumber: order.orderNumber, productId: group.productId, storageBin: value }),
  }).catch(err => console.error('Error saving fittings bin:', err))
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
  if (!selectedOrderForInvoices.value?.items) return new Map()
  const map = new Map<string, { scanned: number, total: number, percent: number, scannedWarehouse: number }>()
  const seen = new Set<string>()
  for (const item of selectedOrderForInvoices.value.items) {
    if (!seen.has(item.productId)) {
      seen.add(item.productId)
      map.set(item.productId, getItemQRProgress(selectedOrderForInvoices.value.id, item.productId))
    }
  }
  return map
})

const groupedItemsWithSummary = computed(() => {
  if (!selectedOrderForInvoices.value?.items) return []
  const groups = new Map<string, { productId: string, items: any[], totalQuantity: number, unit: string, totalIssued: number | null, totalPrice: number, globalStartIdx: number, totalReserve: number }>()
  let globalIdx = 1
  for (const item of selectedOrderForInvoices.value.items) {
    if (!groups.has(item.productId)) {
      groups.set(item.productId, {
        productId: item.productId,
        items: [],
        totalQuantity: 0,
        unit: item.unit,
        totalIssued: null,
        totalPrice: 0,
        globalStartIdx: globalIdx,
        totalReserve: 0,
      })
    }
    const g = groups.get(item.productId)!
    g.items.push(item)
    g.totalQuantity += item.quantity
    g.totalPrice += item.totalPrice || 0
    if (g.items.length === 1) {
      g.totalReserve = getOrderItemReserve(item) || 0
    }
    if (g.items.length === 1) {
      const issued = getFittingsIssued(item)
      g.totalIssued = issued !== null ? issued : null
    }
    globalIdx++
  }
  return Array.from(groups.values())
})

const filteredGroupedItems = computed(() => {
  const q = orderDetailSearch.value.trim().toLowerCase()
  if (!q) return groupedItemsWithSummary.value
  return groupedItemsWithSummary.value.filter(group => {
    return group.items.some(item =>
      (item.productName || '').toLowerCase().includes(q) ||
      (item.productId || '').toLowerCase().includes(q) ||
      String(item.quantity || '').includes(q)
    )
  })
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
    width: 250,
    render(row: Order) {
      return h('div', { style: 'white-space: normal; word-break: break-word; line-height: 1.4;' }, row.comment || '-')
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

/* Sticky header для таблицы состава заказа */
.invoices-table-scroll {
  max-height: calc(100vh - 350px);
  overflow: auto;
}

.invoices-card ::v-deep(.n-card__content) {
  overflow: visible;
}

.invoices-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.invoices-table thead th {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: #1a1a1e;
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
  padding: 8px 12px;
  border-bottom: 1px solid #333;
}


.invoices-table tbody td {
  padding: 8px 12px;
  border-bottom: 1px solid #333;
}

/* Тёмный скроллбар — как на странице заказов */
.invoices-table-scroll::-webkit-scrollbar {
  width: 8px;
}
.invoices-table-scroll::-webkit-scrollbar-track {
  background: #1a1a1e;
}
.invoices-table-scroll::-webkit-scrollbar-thumb {
  background: #555;
  border-radius: 4px;
}
.invoices-table-scroll::-webkit-scrollbar-thumb:hover {
  background: #777;
}
</style>
