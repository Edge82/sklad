<template>
  <div class="inventory-page p-6">
    <!-- Режим массового расхода -->
    <div v-if="isBulkIssueView">
      <div class="flex items-center gap-4 mb-6">
        <n-button @click="isBulkIssueView = false" secondary circle>
          <template #icon><n-icon><ArrowBack /></n-icon></template>
        </n-button>
        <n-h1 class="mb-0!">Перемещение товара</n-h1>
      </div>

      <InventoryBulkIssueModal
        :is-embed="true"
        mode="product"
        @submit="handleTransactionSubmit"
        @close="isBulkIssueView = false"
      />
    </div>

    <!-- Основной контент страницы -->
    <div v-else>
      <!-- Заголовок и кнопки -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <n-h1>Готовая продукция</n-h1>
          <div class="flex items-center gap-2">
            <n-text depth="3">Управление готовой продукцией и отгрузками</n-text>
          </div>
        </div>
   <!-- <div class="flex gap-3">
          <n-button @click="showCreateModal = true" type="primary">
            <template #icon>
              <n-icon><AddOutline /></n-icon>
            </template>
            Новое изделие
          </n-button>
        </div>-->
      </div>

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
              <n-icon size="28" color="#626aef">
                <AnalyticsOutline />
              </n-icon>
              <div>
                <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Готовность склада</n-text>
                <n-h3 class="m-0 leading-none">{{ averageReadiness }}%</n-h3>
              </div>
            </div>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card
            size="small"
            hoverable
            class="metric-card h-full flex flex-col justify-center"
            :class="{ 'active': filters.status === 'ready_to_ship' }"
            @click="filters.status = 'ready_to_ship'"
          >
            <div class="flex items-center gap-3 py-1">
              <n-icon size="28" color="#18a058">
                <DownloadOutline />
              </n-icon>
              <div>
                <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Готовы к отгрузке</n-text>
                <n-h3 class="m-0 leading-none">{{ readyToShipToday }}</n-h3>
              </div>
            </div>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card
            size="small"
            hoverable
            class="metric-card h-full flex flex-col justify-center"
            :class="{ 'active': filters.status === 'partially_shipped' }"
            @click="filters.status = 'partially_shipped'"
          >
            <div class="flex items-center gap-3 py-1">
              <n-icon size="28" color="#f0a020">
                <LogOutOutline />
              </n-icon>
              <div>
                <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Отгружен частично</n-text>
                <n-h3 class="m-0 leading-none">{{ partiallyShippedCount }}</n-h3>
              </div>
            </div>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card
            size="small"
            hoverable
            class="metric-card h-full flex flex-col justify-center"
            :class="{ 'active': filters.status === 'shipped' }"
            @click="filters.status = 'shipped'"
          >
            <div class="flex items-center gap-3 py-1">
              <n-icon size="28" color="#18a058">
                <CheckmarkDoneOutline />
              </n-icon>
              <div>
                <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Отгружен</n-text>
                <n-h3 class="m-0 leading-none">{{ shippedCount }}</n-h3>
              </div>
            </div>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card border-variant="dark" class="metric-card revenue-card h-full flex flex-col justify-center" size="small">
            <div class="flex items-center gap-3 py-1">
              <n-icon size="28" color="#18a058" :component="CashOutline" />
              <div>
                <n-text depth="3" class="revenue-label block mb-1">Стоимость продукции</n-text>
                <n-h3 class="m-0 leading-none revenue-value text-[22px]">{{ userStore.canSeePrices ? formatCurrency(filteredTotalValue) : '-' }}</n-h3>
              </div>
            </div>
          </n-card>
        </n-gi>
      </n-grid>

      <!-- Фильтры и поиск -->
      <n-card class="mb-4" size="small">
        <n-space align="center" :size="[16, 12]">
          <n-input
            v-model:value="searchQuery"
            placeholder="Поиск по названию или клиенту..."
            clearable
            class="w-96!"
          >
            <template #prefix>
              <n-icon><SearchOutline /></n-icon>
            </template>
          </n-input>
          <n-button @click="exportToExcel" secondary type="success">
            <template #icon>
              <n-icon><DownloadOutline /></n-icon>
            </template>
            Excel
          </n-button>
          <n-button @click="exportToPDF" secondary type="error">
            <template #icon>
              <n-icon><DownloadOutline /></n-icon>
            </template>
            PDF
          </n-button>
          <n-button @click="resetFilters" quaternary type="warning">
            Сбросить
          </n-button>
        </n-space>
      </n-card>

      <!-- Таблица -->
      <n-card>
        <div class="flex justify-between items-center mb-4">
          <n-h3 class="m-0">Изделия и запасы</n-h3>
          <div class="flex items-center gap-2">
            <n-text>Показывать:</n-text>
            <n-select v-model:value="itemsPerPage" :options="pageSizeOptions" class="w-32!" />
          </div>
        </div>

        <n-data-table :columns="columns" :data="tableData" :pagination="pagination"
          :row-key="(row: any) => row.id" striped @update:sorter="handleSorterChange"
          :row-props="rowProps"
          v-model:expanded-row-keys="expandedRowKeys"
          :default-expand-all="true"
          max-height="calc(100vh - 280px)"
        />
      </n-card>

      <!-- Модалки -->
      <InventoryItemModal
        v-model:show="showCreateModal"
        :item-id="selectedItemId"
        mode="product"
        @submit="handleItemSubmit"
        @update:show="(val) => !val && (selectedItemId = null)"
      />

      <InventoryTransactionModal
        v-model:show="showIssueModal"
        type="outgoing"
        title="Перемещение товара"
        mode="product"
        @submit="handleTransactionSubmit"
      />

      <n-modal v-model:show="showDetailsModal" preset="card" title="Детали изделия" class="w-250!">
        <InventoryItemDetails
          v-if="selectedItemId"
          :item-id="selectedItemId"
          @close="showDetailsModal = false"
          @edit="handleEditFromDetails"
        />
      </n-modal>

      <QRPrintModal
        v-model:show="showPrintModal"
        :title="printData.title"
        :code="printData.code"
        :description="printData.description"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, h, watch, onMounted, onActivated } from 'vue'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { fontBase64 } from '@/assets/font-base64'
import { useInventoryStore } from '@/stores/inventory'
import { useOrdersStore } from '@/stores/orders'
import { useQRCodesStore } from '@/stores/qrCodes'
import type { InventoryItem, InventoryTransaction, MaterialInvoice } from '@/types'
import type { DataTableColumns } from 'naive-ui'
import {
  NH1,
  NText,
  NButton,
  NIcon,
  NGrid,
  NGi,
  NCard,
  NSelect,
  NInput,
  NDataTable,
  NImage,
  NTag,
  NProgress,
  NH3
} from 'naive-ui'
import {
  DownloadOutline,
  AnalyticsOutline,

  CashOutline,
  BusinessOutline,
  SearchOutline,
  ArrowBack,
  CheckmarkDoneOutline,
  LogOutOutline
} from '@vicons/ionicons5'
import InventoryItemModal from '@/components/inventory/InventoryItemModal.vue'
import InventoryTransactionModal from '@/components/inventory/InventoryTransactionModal.vue'
import InventoryBulkIssueModal from '@/components/inventory/InventoryBulkIssueModal.vue'
import InventoryItemDetails from '@/components/inventory/InventoryItemDetails.vue'
import QRPrintModal from '@/components/common/QRPrintModal.vue'
import { useDialog, useMessage } from 'naive-ui'
import { useUserStore } from '@/stores/user'
import { useEmployeesStore } from '@/stores/employees'
import { useIntegrationStore } from '@/stores/integration'
import { API_BASE_URL } from '@/config/api'

const inventoryStore = useInventoryStore()
const ordersStore = useOrdersStore()
const qrCodesStore = useQRCodesStore()
const userStore = useUserStore()
const employeesStore = useEmployeesStore()
const integrationStore = useIntegrationStore()
const dialog = useDialog()
const message = useMessage()

onMounted(async () => {
  if (inventoryStore.items.length === 0 || !integrationStore.lastSyncTime) {
    await integrationStore.syncStocks()
  }

  if (ordersStore.orders.length === 0) {
    try {
      await integrationStore.syncOrders()
    } catch (err) {
      console.error('Ошибка загрузки заказов:', err)
    }
  }

  // Загружаем детали заказов для цен (только для активных заказов)
  try {
    const activeOrders = ordersStore.orders.filter(o =>
      ['in_progress', 'ready', 'shipped'].includes(o.status)
    )
    for (const order of activeOrders) {
      if (order.items && order.items.length === 0) {
        await integrationStore.syncOrderDetails(order.id)
      }
    }
  } catch (err) {
    console.error('Ошибка загрузки деталей заказов:', err)
  }
})

onActivated(async () => {
  if (inventoryStore.items.length === 0 || !integrationStore.lastSyncTime) {
    await integrationStore.syncStocks()
  }

  if (ordersStore.orders.length === 0) {
    try {
      await integrationStore.syncOrders()
    } catch (err) {
      console.error('Ошибка загрузки заказов:', err)
    }
  }

  // Загружаем детали заказов для цен (только для активных заказов)
  try {
    const activeOrders = ordersStore.orders.filter(o =>
      ['in_progress', 'ready', 'shipped'].includes(o.status)
    )
    for (const order of activeOrders) {
      if (order.items && order.items.length === 0) {
        await integrationStore.syncOrderDetails(order.id)
      }
    }
  } catch (err) {
    console.error('Ошибка загрузки деталей заказов:', err)
  }
})

// Модальные окна
const showCreateModal = ref(false)
const showIssueModal = ref(false)
const showDetailsModal = ref(false)
const showPrintModal = ref(false)
const selectedItemId = ref<string | null>(null)
const isBulkIssueView = ref(false)

const expandedRowKeys = ref<string[]>([])

const printData = reactive({
  title: '',
  code: '',
  description: ''
})

// Фильтры
const searchQuery = ref('')
const filters = reactive({
  category: undefined as string | undefined,
  status: undefined as string | undefined,
  supplier: undefined as string | undefined,
  warehouse: undefined as string | undefined
})

const advancedFilters = reactive({
  minStock: null as number | null,
  maxStock: null as number | null,
  minPrice: null as number | null,
  maxPrice: null as number | null
})

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
  pageCount: Math.ceil(filteredItems.value.length / itemsPerPage.value),
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

watch([searchQuery, filters, advancedFilters], () => {
  currentPage.value = 1
}, { deep: true })

// Базовые элементы (только продукция)
const baseItemsForStats = computed(() => {
  return inventoryStore.items.filter(item => item.type === 'product' || item.categoryId === '99')
})

const getProductShipmentMeta = (item: InventoryItem) => {
  const itemQrs = qrCodesStore.qrCodes.filter(q =>
    q.productId === item.id ||
    q.productId === item.sku ||
    q.productName === item.name
  )

  // Если есть хотя бы один отсканированный упаковочный код — считаем только упаковки
  const packageCodes = itemQrs.filter(q => q.isPackage)
  const scannedPackageCodes = packageCodes.filter(q => q.status === 'scanned' || q.status === 'shipped')

  const effectiveCodes = scannedPackageCodes.length > 0 ? packageCodes : itemQrs

  const orderNumbers = Array.from(new Set([
    ...effectiveCodes.map(q => q.orderNumber).filter(Boolean),
    item.orderNumber
  ].filter(Boolean)))
  const totalCount = effectiveCodes.length
  const scannedCount = effectiveCodes.filter(q => q.status === 'scanned' || q.status === 'shipped').length
  const shippedCount = effectiveCodes.filter(q => q.status === 'shipped').length
  const progress = totalCount > 0 ? Math.min(Math.round((shippedCount / totalCount) * 100), 100) : 0

  // Получаем цену и сумму из позиции заказа
  let unitPrice = 0
  let totalValue = 0

  if (orderNumbers.length > 0) {
    // Найти заказ по orderNumber
    const order = ordersStore.orders.find(o => orderNumbers.includes(o.orderNumber))
    if (order && order.items && order.items.length > 0) {
      // Найти позицию заказа по productName или productId или itemName
      const orderItem = order.items.find(i =>
        i.productName === item.name ||
        i.productName === item.sku ||
        i.itemName === item.name ||
        i.productId === item.id ||
        i.productId === item.sku
      )
      if (orderItem) {
        unitPrice = Number(orderItem.unitPrice || 0)
        // totalValue = сумма позиции из заказа (из 1С)
        totalValue = Number(orderItem.totalPrice || 0)
      }
    }
  }

  return {
    itemQrs: effectiveCodes,
    orderNumbers,
    totalCount,
    scannedCount,
    shippedCount,
    progress,
    unitPrice,  // цена за 1 шт из заказа
    totalValue, // сумма позиции из заказа (из 1С)
    packageCount: packageCodes.length,
    shipmentStatusLabel: totalCount > 0 && shippedCount >= totalCount
      ? 'Отгружен'
      : (shippedCount > 0 ? 'Отгружен частично' : 'На складе'),
    shipmentStatusType: totalCount > 0 && shippedCount >= totalCount
      ? 'success'
      : (shippedCount > 0 ? 'warning' : 'info') as 'success' | 'warning' | 'info'
  }
}

// Фильтрованные элементы
const filteredItems = computed(() => {
  let result = [...baseItemsForStats.value]

  if (filters.status === 'ready_to_ship') {
    result = result.filter(item =>
      (() => {
        const meta = getProductShipmentMeta(item)
        return meta.totalCount > 0 && meta.scannedCount > 0 && meta.shippedCount < meta.totalCount
      })()
    )
  }

  if (filters.status === 'partially_shipped') {
    result = result.filter(item => {
      const meta = getProductShipmentMeta(item)
      return meta.shippedCount > 0 && meta.shippedCount < meta.totalCount
    })
  }

  if (filters.status === 'shipped') {
    result = result.filter(item => {
      const meta = getProductShipmentMeta(item)
      return meta.totalCount > 0 && meta.shippedCount >= meta.totalCount
    })
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()

    // Получаем номера заказов для позиции через QR-коды
    const getOrderNumbers = (item: InventoryItem): string[] => {
      const itemQrs = qrCodesStore.qrCodes.filter(q =>
        q.productId === item.id ||
        q.productId === item.sku ||
        q.productName === item.name
      )
      return Array.from(new Set([
        ...itemQrs.map(q => q.orderNumber).filter(Boolean),
        item.orderNumber
      ].filter(Boolean)))
    }

    const matchesQuery = (item: InventoryItem) => {
      const orderNumbers = getOrderNumbers(item)
      const customerName = orderNumbers.length > 0
        ? ordersStore.orders.find(o => orderNumbers.includes(o.orderNumber))?.customerName?.toLowerCase()
        : ''
      return item.name.toLowerCase().includes(query) ||
        (customerName && customerName.includes(query)) ||
        item.description?.toLowerCase().includes(query) ||
        orderNumbers.some(on => on.toLowerCase().includes(query))
    }

    // Находим все номера заказов, где есть хотя бы одна подходящая позиция
    const matchingOrderNumbers = new Set<string>()
    result.forEach(item => {
      if (matchesQuery(item)) {
        getOrderNumbers(item).forEach(on => matchingOrderNumbers.add(on))
      }
    })

    // Показываем все позиции из заказов с совпадениями + отдельные совпавшие без заказа
    result = result.filter(item => {
      const itemOrders = getOrderNumbers(item)
      if (itemOrders.length > 0) {
        return itemOrders.some(on => matchingOrderNumbers.has(on))
      }
      return matchesQuery(item)
    })
  }

  if (filters.category) {
    result = result.filter(item => item.category === filters.category)
  }

  if (filters.status && filters.status !== 'ready_to_ship' && filters.status !== 'all_products' && filters.status !== 'partially_shipped' && filters.status !== 'shipped') {
    result = result.filter(item => item.status === filters.status)
  }

  if (advancedFilters.minStock !== null) {
    result = result.filter(item => item.currentStock >= advancedFilters.minStock!)
  }

  if (advancedFilters.maxStock !== null) {
    result = result.filter(item => item.currentStock <= advancedFilters.maxStock!)
  }

  if (advancedFilters.minPrice !== null) {
    result = result.filter(item => item.averagePrice >= advancedFilters.minPrice!)
  }

  if (advancedFilters.maxPrice !== null) {
    result = result.filter(item => item.averagePrice <= advancedFilters.maxPrice!)
  }

  return result.map(item => {
    const meta = getProductShipmentMeta(item)
    const available = meta.totalCount - meta.shippedCount

    return {
      ...item,
      currentStock: meta.totalCount,
      reserved: meta.shippedCount,
      available: available,
      unitPrice: meta.unitPrice,
      averagePrice: meta.unitPrice,
      purchasePrice: meta.unitPrice,
      lastPurchasePrice: meta.unitPrice,
      totalValue: meta.totalValue,
      orderNumber: meta.orderNumbers.join(', ') || item.orderNumber,
      shipmentProgress: meta.progress,
      shippedCount: meta.shippedCount,
      scannedCount: meta.scannedCount,
      barcodeCount: meta.totalCount,
      packageCount: meta.packageCount,
      shipmentStatusLabel: meta.shipmentStatusLabel,
      shipmentStatusType: meta.shipmentStatusType,
      status: (meta.shippedCount >= meta.totalCount && meta.totalCount > 0 ? 'in_stock' : 'reserved') as InventoryItem['status']
    }
  })
})

const filteredTotalValue = computed(() => {
  const sum = filteredItems.value.reduce((s, item) => {
    const meta = getProductShipmentMeta(item)
    return s + meta.totalValue
  }, 0)
  return Number(sum.toFixed(2))
})

const averageReadiness = computed(() => {
  const items = baseItemsForStats.value.filter(item => item.type === 'product')
  if (items.length === 0) return 0
  const totalProgress = items.reduce((sum, item) => {
    const meta = getProductShipmentMeta(item)
    return sum + meta.progress
  }, 0)
  return Math.round(totalProgress / items.length)
})

const readyToShipToday = computed(() => {
  return baseItemsForStats.value.filter(item => {
    if (item.type !== 'product') return false
    const meta = getProductShipmentMeta(item)
    return meta.totalCount > 0 && meta.scannedCount > 0 && meta.shippedCount < meta.totalCount
  }).length
})

const partiallyShippedCount = computed(() => {
  return baseItemsForStats.value.filter(item => {
    if (item.type !== 'product') return false
    const meta = getProductShipmentMeta(item)
    return meta.shippedCount > 0 && meta.shippedCount < meta.totalCount
  }).length
})

const shippedCount = computed(() => {
  return baseItemsForStats.value.filter(item => {
    if (item.type !== 'product') return false
    const meta = getProductShipmentMeta(item)
    return meta.totalCount > 0 && meta.shippedCount >= meta.totalCount
  }).length
})

type InventoryTableRow = (InventoryItem & { isGroup?: boolean; available?: number; isLowStock?: boolean }) | {
  id: string
  name: string
  sku: string
  currentStock: number
  totalValue: number
  isGroup: true
  customerName?: string
  children: InventoryItem[]
}

const tableData = computed<InventoryTableRow[]>(() => {
  const groups: Record<string, InventoryItem[]> = {}
  const itemsWithoutOrder: InventoryItem[] = []

  filteredItems.value.forEach(item => {
    if (item.orderNumber) {
      if (!groups[item.orderNumber]) {
        groups[item.orderNumber] = []
      }
      groups[item.orderNumber]!.push(item)
    } else {
      itemsWithoutOrder.push(item)
    }
  })

  const result: InventoryTableRow[] = []

  Object.keys(groups).forEach(orderNo => {
    const groupItems = groups[orderNo]
    if (!groupItems) return

    const totalQty = groupItems.reduce((s, i) => s + i.currentStock, 0)
    const totalVal = groupItems.reduce((s, i) => s + i.totalValue, 0)

    const order = ordersStore.orders.find(o => o.orderNumber === orderNo)

    result.push({
      id: `group-${orderNo}`,
      name: `ЗАКАЗ: ${orderNo}`,
      sku: `Позиций: ${groupItems.length}`,
      currentStock: totalQty,
      totalValue: totalVal,
      isGroup: true,
      customerName: order?.customerName || undefined,
      children: groupItems
    })
  })

  if (itemsWithoutOrder.length > 0) {
    const totalQty = itemsWithoutOrder.reduce((s, i) => s + i.currentStock, 0)
    const totalVal = itemsWithoutOrder.reduce((s, i) => s + i.totalValue, 0)

    result.push({
      id: 'group-none',
      name: 'БЕЗ ЗАКАЗА',
      sku: `Позиций: ${itemsWithoutOrder.length}`,
      currentStock: totalQty,
      totalValue: totalVal,
      isGroup: true,
      children: itemsWithoutOrder
    })
  }

  return result
})

watch(tableData, (val) => {
  const groupIds = val.filter(r => 'isGroup' in r && r.isGroup).map(r => r.id)
  expandedRowKeys.value = groupIds
}, { immediate: true })

const exportToExcel = () => {
  const dataToExport = filteredItems.value.map(item => ({
    'Название': item.name,
    'Артикул': item.sku,
    'Категория': item.category,
    'Детали': item.currentStock,
    'Ед. изм.': item.unit,
    'Статус': inventoryStore.getStatusLabel(item.status),
    'Цена (за ед.)': item.averagePrice || 0,
    'Общая стоимость': (item.currentStock * (item.averagePrice || 0))
  }))

  const ws = XLSX.utils.json_to_sheet(dataToExport)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Готовая продукция')

  XLSX.writeFile(wb, 'Sklad_Produkcia.xlsx')
  message.success('Данные успешно экспортированы в Excel')
}

const exportToPDF = () => {
  const doc = new jsPDF()

  doc.addFileToVFS('customFont.ttf', fontBase64)
  doc.addFont('customFont.ttf', 'customFont', 'normal')
  doc.addFont('customFont.ttf', 'customFont', 'bold')
  doc.setFont('customFont')

  doc.text('Отчет по готовой продукции', 14, 15)

  const tableRows = filteredItems.value.map(item => [
    item.name,
    item.sku,
    item.currentStock,
    item.unit,
    inventoryStore.getStatusLabel(item.status),
  ])

  autoTable(doc, {
    head: [['Наименование', 'Артикул', 'Детали', 'Ед.', 'Статус']],
    body: tableRows,
    startY: 25,
    styles: {
      font: 'customFont',
      fontStyle: 'normal',
      fontSize: 8
    },
    headStyles: {
      font: 'customFont',
      fontStyle: 'bold',
      fillColor: [66, 133, 244]
    },
    didDrawPage: () => {
      doc.setFont('customFont')
    }
  })

  doc.save('Sklad_Produkcia.pdf')
  message.success('Данные успешно экспортированы в PDF')
}

// Колонки таблицы
const columnsBase: DataTableColumns<InventoryTableRow> = [
  {
    title: 'Изделие',
    key: 'name',
    width: 250,
    render: (row) => {
      if ('isGroup' in row && row.isGroup) {
        return h('div', { class: 'flex items-center gap-2 font-bold text-blue-400 uppercase tracking-wider h-full' }, [
          h(NIcon, { size: '20' }, () => h(BusinessOutline)),
          h('span', row.name)
        ])
      }

      const item = row as InventoryItem
      return h('div', {
        class: [
          'flex items-center gap-3',
          'pl-8 border-l-2 border-blue-400/30 -ml-3'
        ]
      }, [
        item.image
          ? h(NImage, {
              src: item.image,
              width: 32,
              height: 32,
              class: 'rounded object-cover shrink-0 border cursor-pointer',
              onClick: (e: MouseEvent) => {
                e.stopPropagation()
              }
            })
          : h('div', { class: 'w-8 h-8 bg-gray-800 rounded flex items-center justify-center shrink-0' },
              h(NIcon, { size: '16' }, () => getCategoryIcon(item.categoryId))
            ),
        h('div', [
          h('div', { class: 'font-medium' }, item.name)
        ])
      ])
    }
  },
  {
    title: 'Клиент',
    key: 'customerName',
    width: 160,
    render: (row: InventoryTableRow) => {
      if ('isGroup' in row && row.isGroup) {
        return h('div', { class: 'text-gray-400' }, row.customerName || '—')
      }
      return null
    }
  },
  {
    title: 'Прогресс отгрузки',
    key: 'shipmentProgress',
    width: 210,
    render: (row: InventoryTableRow) => {
      if ('isGroup' in row && row.isGroup) return null
      const item = row as any
      const progress = item.shipmentProgress || 0
      const shippedCount = item.shippedCount || 0
      const barcodeCount = item.barcodeCount || 0
      const statusType = item.shipmentStatusType || (progress >= 100 ? 'success' : progress > 0 ? 'warning' : 'info')

      return h('div', { class: 'w-full', title: `Отгружено деталей: ${shippedCount}\nВсего деталей: ${barcodeCount}` }, [
        h('div', { class: 'flex justify-between items-center mb-1 gap-2' }, [
          h(NText, { strong: true, style: 'font-size: 10px' }, { default: () => `Отгружено: ${shippedCount}/${barcodeCount}` }),
        ]),
        h(NProgress, {
          type: 'line',
          percentage: progress,
          indicatorPlacement: 'inside',
          status: statusType,
          processing: progress > 0 && progress < 100,
          railColor: barcodeCount > shippedCount ? 'rgba(240, 160, 32, 0.2)' : undefined
        })
      ])
    }
  },
  {
    title: 'Детали',
    key: 'barcodeCount',
    width: 120,
    render: (row) => {
      if ('isGroup' in row && row.isGroup) {
        return h('div', { class: 'font-bold' }, `Всего: ${row.currentStock} шт.`)
      }

      const item = row as any
      return h('div', { class: 'font-medium text-center' }, item.barcodeCount || 0)
    }
  },
  {
    title: 'В наличии',
    key: 'available',
    width: 100,
    render: (row) => {
      if ('isGroup' in row && row.isGroup) return null
      const item = row as any
      const available = (item.scannedCount || 0) - (item.shippedCount || 0)
      return h('div', { class: 'font-bold text-green-500' }, available)
    }
  },
  {
    title: 'Отгружено',
    key: 'shippedCount',
    width: 100,
    render: (row) => {
      if ('isGroup' in row && row.isGroup) return null
      const item = row as any
      return h('div', { class: 'font-medium text-blue-400' }, item.shippedCount || 0)
    }
  },
  {
    title: 'Упаковок',
    key: 'packCount',
    width: 100,
    render: (row) => {
      if ('isGroup' in row && row.isGroup) return null
      const item = row as any
      return h('div', { class: 'font-medium' }, item.packageCount || 0)
    }
  },
  {
    title: 'Место хранения',
    key: 'storageBin',
    width: 220,
    render: (row) => {
      if ('isGroup' in row && row.isGroup) return null
      const item = row as any
      const value = item.storageBin || ''
      return h('div', { class: 'editable-storage-cell', style: 'display: flex; align-items: center;' }, [
        h('input', {
          class: 'storage-input',
          style: 'width: 100%; background: transparent; border: 1px solid transparent; border-radius: 4px; padding: 2px 6px; color: #aaa; font-size: 13px; outline: none; transition: all 0.2s;',
          value: value,
          placeholder: 'Введите место...',
          onFocus: (e: FocusEvent) => {
            const el = e.target as HTMLElement
            el.style.borderColor = '#18a058'
            el.style.color = '#fff'
            el.style.background = 'rgba(24,160,88,0.08)'
          },
          onBlur: (e: FocusEvent) => {
            const el = e.target as HTMLElement
            el.style.borderColor = 'transparent'
            el.style.color = '#aaa'
            el.style.background = 'transparent'
          },
          onChange: (e: Event) => {
            const target = e.target as HTMLInputElement
            const newValue = target.value
            const itemId = item.id || item.ref_key
            if (itemId) {
              saveStorageBin(itemId, newValue, item)
            }
          }
        })
      ])
    }
  },
  {
    title: 'Статус',
    key: 'status',
    width: 120,
    render: (row) => {
      if ('isGroup' in row && row.isGroup && !('status' in row)) return null
      const item = row as any
      return h(NTag, {
        type: item.shipmentStatusType || 'info',
        size: 'small',
        bordered: false
      }, { default: () => item.shipmentStatusLabel || 'На складе' })
    }
  },
  {
    title: 'Стоимость',
    key: 'totalValue',
    width: 140,
    render: (row) => {
      if ('isGroup' in row && row.isGroup) {
        return h('div', { class: 'font-bold text-green-500' }, formatCurrency(row.totalValue))
      }
      const item = row as any
      const totalValue = item.totalValue || 0
      return h('div', { class: 'font-medium text-green-600' }, formatCurrency(totalValue))
    },
    sorter: (a, b) => (a.totalValue || 0) - (b.totalValue || 0)
  }
]

// Фильтруем колонки по правам доступа
const columns = computed(() => {
  return columnsBase.filter(col => {
    if (col.key === 'totalValue' && !userStore.canSeePrices) {
      return false
    }
    return true
  })
})

// Вспомогательные функции
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0
  }).format(amount)
}

const getCategoryIcon = (categoryId: string | number) => {
  const category = inventoryStore.categories.find(c => String(c.id) === String(categoryId))
  switch (category?.name) {
    case 'Древесина': return h('span', '🌲')
    case 'Фурнитура': return h('span', '🔧')
    case 'Отделочные материалы': return h('span', '🎨')
    case 'Стекло и зеркала': return h('span', '🔍')
    case 'Ткани и наполнители': return h('span', '🛏️')
    case 'Крепеж': return h('span', '⚙️')
    case 'Упаковочные материалы': return h('span', '📦')
    case 'Электроника': return h('span', '💡')
    default: return h('span', '📌')
  }
}

// Обработчики
const resetFilters = () => {
  searchQuery.value = ''
  filters.category = undefined
  filters.status = undefined
  filters.supplier = undefined
  filters.warehouse = undefined
  advancedFilters.minStock = null
  advancedFilters.maxStock = null
  advancedFilters.minPrice = null
  advancedFilters.maxPrice = null
}

const handleEditFromDetails = (id: string) => {
  selectedItemId.value = id
  showDetailsModal.value = false
  editItem(id)
}

const editItem = (id: string) => {
  selectedItemId.value = id
  showCreateModal.value = true
}

const handleItemSubmit = (itemData: Partial<InventoryItem>) => {
  if (selectedItemId.value) {
    const oldItem = inventoryStore.items.find(i => i.id === selectedItemId.value)
    inventoryStore.updateItem(selectedItemId.value, itemData)

    if (oldItem && itemData.purchasePrice !== undefined && oldItem.purchasePrice !== itemData.purchasePrice) {
      const historyItem: MaterialInvoice = {
        id: `PRICE-${Date.now()}`,
        date: new Date(),
        orderNumber: 'ИЗМЕНЕНИЕ ЦЕНЫ',
        destination: 'Корректировка ТМЦ',
        totalAmount: (oldItem.currentStock || 0) * (itemData.purchasePrice || 0),
        items: [{
          productName: oldItem.name,
          quantity: oldItem.currentStock || 0,
          unit: oldItem.unit,
          article: oldItem.sku,
          price: itemData.purchasePrice || 0,
          scannedAt: new Date()
        }],
      }

      if (userStore.user?.id) {
        employeesStore.addMaterialHistory(userStore.user.id, historyItem)
      } else {
        const admin = employeesStore.employees.find(e => e.role === 'admin')
        if (admin) {
          employeesStore.addMaterialHistory(admin.userId, historyItem)
        }
      }
    }

    message.success('Изделие успешно обновлено')
  } else {
    const newItem = inventoryStore.addItem(itemData as Parameters<typeof inventoryStore.addItem>[0])

    if (newItem) {
      const historyItem: MaterialInvoice = {
        id: `NEW-${Date.now()}`,
        date: new Date(),
        orderNumber: 'НОВАЯ КАРТОЧКА',
        destination: 'Регистрация ТМЦ',
        totalAmount: (newItem.currentStock || 0) * (newItem.purchasePrice || 0),
        items: [{
          productName: newItem.name,
          quantity: newItem.currentStock || 0,
          unit: newItem.unit,
          article: newItem.sku,
          price: newItem.purchasePrice || 0,
          scannedAt: new Date()
        }]
      }

      if (userStore.user?.id) {
        employeesStore.addMaterialHistory(userStore.user.id, historyItem)
      } else {
        const admin = employeesStore.employees.find(e => e.role === 'admin')
        if (admin) {
          employeesStore.addMaterialHistory(admin.userId, historyItem)
        }
      }
    }

    message.success('Изделие успешно добавлено')
  }
  selectedItemId.value = null
}

const handleTransactionSubmit = (transactionData: Partial<InventoryTransaction> & { newStatus?: InventoryItem['status'] }) => {
  const { itemId, quantity, type, newStatus, ...rest } = transactionData
  if (itemId && (quantity !== undefined) && type) {
    if (newStatus && type === 'incoming') {
      const updates: Partial<InventoryItem> = { status: newStatus }

      if (newStatus === 'on_order') {
        updates.onOrderQuantity = (inventoryStore.items.find(i => i.id === itemId)?.onOrderQuantity || 0) + quantity
      }

      inventoryStore.updateItem(itemId, updates)
    }

    if (quantity > 0 && newStatus !== 'on_order') {
      inventoryStore.updateStock(itemId, quantity, type, rest)

      const item = inventoryStore.items.find(i => i.id === itemId)
      if (item && item.onOrderQuantity) {
        inventoryStore.updateItem(itemId, {
          onOrderQuantity: Math.max(0, item.onOrderQuantity - quantity)
        })
      }
    }

    const item = inventoryStore.items.find(i => i.id === itemId)
    if (item) {
      const historyItem: MaterialInvoice = {
        id: `TR-${Date.now()}`,
        date: new Date(),
        orderNumber: type === 'incoming' ? 'ПРИХОД (СКЛАД)' : (type === 'outgoing' ? 'РАСХОД (СКЛАД)' : 'КОРРЕКТИРОВКА'),
        destination: type === 'incoming' ? 'Основной склад' : 'Выдача/Списание',
        totalAmount: (quantity || 0) * (rest.unitPrice || item.purchasePrice || 0),
        items: [{
          productName: item.name,
          quantity: quantity || 0,
          unit: item.unit,
          article: item.sku,
          price: rest.unitPrice || item.purchasePrice || 0,
          scannedAt: new Date()
        }]
      }

      if (userStore.user?.id) {
        employeesStore.addMaterialHistory(userStore.user.id, historyItem)
      } else {
        const admin = employeesStore.employees.find(e => e.role === 'admin')
        if (admin) {
          employeesStore.addMaterialHistory(admin.userId, historyItem)
        }
      }
    }

    message.success('Операция успешно выполнена')
  }
}

const handleSorterChange = () => {
}

// Сохранение места хранения в БД
const saveStorageBin = async (itemId: string, value: string, item: any) => {
  try {
    const refKey = item.ref_key || itemId
    const response = await fetch(`${API_BASE_URL}/onec/stocks/${refKey}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storageBin: value })
    })
    if (!response.ok) throw new Error('Failed to save')
    // Обновляем локально
    item.storageBin = value
  } catch (err) {
    console.error('Error saving storage location:', err)
    message.error('Не удалось сохранить место хранения')
  }
}

const rowProps = (row: InventoryTableRow) => {
  const isGroup = 'isGroup' in row && row.isGroup
  if (isGroup) {
    return {
      class: 'group-header-row bg-blue-400/10 font-bold cursor-pointer',
      onClick: () => {
        const idx = expandedRowKeys.value.indexOf(row.id)
        if (idx >= 0) {
          expandedRowKeys.value.splice(idx, 1)
        } else {
          expandedRowKeys.value.push(row.id)
        }
      }
    }
  }
  return {
    class: 'cursor-default'
  }
}
</script>

<style scoped>
.inventory-page {
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 24px;
}
@media (max-width: 768px) {
  .inventory-page {
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
}

.revenue-value {
  color: #18a058 !important;
  font-weight: 900 !important;
}

.storage-input:focus {
  border-color: #18a058 !important;
  color: #fff !important;
  background: rgba(24, 160, 88, 0.08) !important;
}

.storage-input::placeholder {
  color: #555;
  font-size: 12px;
}
</style>
