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
        mode="material"
        @submit="handleTransactionSubmit"
        @close="isBulkIssueView = false"
      />
    </div>

    <!-- Основной контент страницы -->
    <div v-else>
      <!-- Заголовок и кнопки -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <n-h1>Склад ТМЦ</n-h1>
          <div class="flex items-center gap-2">
            <n-text depth="3">Управление материалами и запасами склада</n-text>
          </div>
        </div>
        <div class="flex gap-3">
          <n-button
            @click="handleSync1C"
            :loading="integrationStore.loading"
            secondary
          >
            <template #icon>
              <n-icon><SyncOutline /></n-icon>
            </template>
            Синхронизация с 1С
            <template v-if="integrationStore.syncProgress > 0">
              ({{ integrationStore.syncProgress }}%)
            </template>
          </n-button>
          <n-button @click="showCreateModal = true" type="primary">
            <template #icon>
              <n-icon><AddOutline /></n-icon>
            </template>
            Новый материал
          </n-button>
        </div>
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
              <n-icon size="28" color="#2080f0">
                <CubeOutline />
              </n-icon>
              <div>
                <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Всего позиций</n-text>
                <n-h3 class="m-0 leading-none">{{ baseItemsForStats.length }}</n-h3>
              </div>
            </div>
          </n-card>
        </n-gi>

        <n-gi>
          <n-card
            size="small"
            hoverable
            class="metric-card h-full flex flex-col justify-center"
            :class="{ 'active': filters.status === 'out_of_stock' }"
            @click="filters.status = 'out_of_stock'"
          >
            <div class="flex items-center gap-3 py-1">
              <n-icon size="28" color="#d03050">
                <CloseCircleOutline />
              </n-icon>
              <div>
                <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Отсутствует</n-text>
                <n-h3 class="m-0 leading-none">{{ filteredOutOfStockCount }}</n-h3>
              </div>
            </div>
          </n-card>
        </n-gi>

        <n-gi>
          <n-card
            size="small"
            hoverable
            class="metric-card h-full flex flex-col justify-center"
            :class="{ 'active': filters.status === 'reserved' }"
            @click="filters.status = 'reserved'"
          >
            <div class="flex items-center gap-3 py-1">
              <n-icon size="28" color="#626aef">
                <AppsOutline />
              </n-icon>
              <div>
                <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Зарезервировано</n-text>
                <n-h3 class="m-0 leading-none">{{ filteredReservedCount }}</n-h3>
              </div>
            </div>
          </n-card>
        </n-gi>

        <n-gi>
          <n-card
            size="small"
            hoverable
            class="metric-card h-full flex flex-col justify-center"
            :class="{ 'active': filters.status === 'in_stock' }"
            @click="filters.status = 'in_stock'"
          >
            <div class="flex items-center gap-3 py-1">
              <n-icon size="28" color="#18a058">
                <CheckmarkCircleOutline />
              </n-icon>
              <div>
                <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">В наличии (SKU)</n-text>
                <n-h3 class="m-0 leading-none">{{ filteredInStockCount }}</n-h3>
              </div>
            </div>
          </n-card>
        </n-gi>

        <n-gi>
          <n-card border-variant="dark" class="metric-card revenue-card h-full flex flex-col justify-center" size="small">
            <div class="flex items-center gap-3 py-1">
              <n-icon size="28" color="#18a058" :component="CashOutline" />
              <div>
                <n-text depth="3" class="revenue-label block mb-1">Стоимость запасов</n-text>
                <n-h3 class="m-0 leading-none revenue-value text-[22px]">{{ userStore.canSeePrices ? formatCurrency(filteredTotalValue) : '-' }}</n-h3>
              </div>
            </div>
          </n-card>
        </n-gi>
      </n-grid>

      <!-- Фильтры и поиск -->
      <n-card class="mb-4" size="small">
        <n-space align="center" :size="[16, 12]">
          <n-select
            v-model:value="filters.category"
            placeholder="Все категории"
            :options="categoryOptions"
            clearable
            class="w-48!"
            :consistent-menu-width="false"
          />
          <n-select
            v-model:value="filters.warehouse"
            placeholder="Все склады"
            :options="warehouseOptions"
            clearable
            class="w-48!"
            :consistent-menu-width="false"
          />
          <n-select
            v-model:value="filters.status"
            placeholder="Все статусы"
            :options="statusOptions"
            clearable
            class="w-44!"
            :consistent-menu-width="false"
          />
          <n-input
            v-model:value="searchQuery"
            placeholder="Поиск по названию или артикулу..."
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
          <n-h3 class="m-0">Материалы и запасы</n-h3>
          <div class="flex items-center gap-2">
            <n-text>Показывать:</n-text>
            <n-select v-model:value="itemsPerPage" :options="pageSizeOptions" class="w-32!" />
          </div>
        </div>

        <n-data-table :columns="columns" :data="filteredItems" :pagination="pagination"
          :row-key="(row: any) => row.id" striped @update:sorter="handleSorterChange"
          :row-props="rowProps"
        />
      </n-card>

      <!-- Модалки -->
      <InventoryItemModal
        v-model:show="showCreateModal"
        :item-id="selectedItemId"
        mode="material"
        @submit="handleItemSubmit"
        @update:show="(val) => !val && (selectedItemId = null)"
      />

      <InventoryReportModal v-model:show="showReportModal" />

      <InventoryTransactionModal
        v-model:show="showIssueModal"
        type="outgoing"
        title="Перемещение товара"
        mode="material"
        @submit="handleTransactionSubmit"
      />

      <n-modal v-model:show="showDetailsModal" preset="card" title="Детали материала" class="w-250!">
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
import { ref, reactive, computed, h, watch, onMounted } from 'vue'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { fontBase64 } from '@/assets/font-base64'
import { useInventoryStore } from '@/stores/inventory'
import { useOrdersStore } from '@/stores/orders'
import type { InventoryItem, InventoryTransaction, MaterialInvoice } from '@/types'
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
  NInput,
  NDataTable,
  NImage,
  NTag,
  NH3,
  NPopover
} from 'naive-ui'
import {
  DownloadOutline,
  AddOutline,
  CubeOutline,
  CashOutline,
  CloseCircleOutline,
  AppsOutline,
  SearchOutline,
  CheckmarkCircleOutline,
  LocationOutline,
  ArrowBack
} from '@vicons/ionicons5'
import InventoryItemModal from '@/components/inventory/InventoryItemModal.vue'
import InventoryReportModal from '@/components/inventory/InventoryReportModal.vue'
import InventoryTransactionModal from '@/components/inventory/InventoryTransactionModal.vue'
import InventoryBulkIssueModal from '@/components/inventory/InventoryBulkIssueModal.vue'
import InventoryItemDetails from '@/components/inventory/InventoryItemDetails.vue'
import QRPrintModal from '@/components/common/QRPrintModal.vue'
import { useDialog, useMessage } from 'naive-ui'
import { useUserStore } from '@/stores/user'
import { useEmployeesStore } from '@/stores/employees'
import { useIntegrationStore } from '@/stores/integration'
import { syncEvents } from '@/utils/syncEvents'
import { SyncOutline } from '@vicons/ionicons5'

const inventoryStore = useInventoryStore()
const ordersStore = useOrdersStore()
const userStore = useUserStore()
const employeesStore = useEmployeesStore()
const integrationStore = useIntegrationStore()
const dialog = useDialog()
const message = useMessage()

onMounted(async () => {
  if (inventoryStore.items.length === 0 || !integrationStore.lastSyncTime) {
    await handleSync1C()
  }

  if (ordersStore.orders.length === 0) {
    try {
      await integrationStore.syncOrders()
    } catch (err) {
      console.error('Ошибка загрузки заказов:', err)
    }
  }
})

// Функции интеграции
const handleSync1C = async () => {
  await integrationStore.syncStocks()
  if (integrationStore.error) {
    message.error(integrationStore.error)
  } else {
    message.success('Синхронизация с 1С завершена успешно')
    syncEvents.emit('sync-completed', { type: 'inventory', timestamp: new Date().toISOString() })
  }
}

// Модальные окна
const showCreateModal = ref(false)
const showReportModal = ref(false)
const showIssueModal = ref(false)
const showDetailsModal = ref(false)
const showPrintModal = ref(false)
const selectedItemId = ref<string | null>(null)
const isBulkIssueView = ref(false)

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

// Опции фильтров
const categoryOptions = computed<SelectOption[]>(() => {
  const categories = inventoryStore.categories.filter(c => c.id !== '99')
  const options = categories.map(cat => ({
    label: cat.name,
    value: cat.name
  }))
  return [
    { label: 'Все категории', value: undefined },
    ...options
  ]
})

const statusOptions: SelectOption[] = [
  { label: 'Все статусы', value: undefined },
  { label: 'В наличии', value: 'in_stock' },
  { label: 'Мало осталось', value: 'low_stock' },
  { label: 'Отсутствует', value: 'out_of_stock' },
  { label: 'Зарезервировано', value: 'reserved' },
  { label: 'В пути', value: 'on_order' },
  { label: 'Заблокировано', value: 'blocked' }
]

const warehouseOptions = computed<SelectOption[]>(() => {
  const warehouses = new Set<string>()
  inventoryStore.items.forEach(item => {
    if (item.warehouse && item.warehouse !== '—' && item.warehouse !== '') {
      warehouses.add(item.warehouse)
    }
  })
  const options = Array.from(warehouses).sort().map(w => ({
    label: w,
    value: w
  }))
  return [
    { label: 'Все склады', value: undefined },
    ...options
  ]
})

// Базовые элементы (только материалы)
const baseItemsForStats = computed(() => {
  return inventoryStore.items.filter(item => item.type !== 'product' && item.categoryId !== '99')
})

// Фильтрованные элементы
const filteredItems = computed(() => {
  let result = [...baseItemsForStats.value]

  // Поиск
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(item =>
      item.name.toLowerCase().includes(query) ||
      item.sku.toLowerCase().includes(query) ||
      (item.barcode && item.barcode.includes(query)) ||
      item.description?.toLowerCase().includes(query)
    )
  }

  // Фильтр по категории
  if (filters.category) {
    result = result.filter(item => item.category === filters.category)
  }

  // Фильтр по складу
  if (filters.warehouse) {
    result = result.filter(item => item.warehouse === filters.warehouse)
  }

  // Фильтр по статусу
  if (filters.status === 'reserved') {
    result = result.filter(item => item.reserved > 0)
  } else if (filters.status === 'on_order') {
    result = result.filter(item => item.status === 'on_order')
  } else if (filters.status) {
    result = result.filter(item => item.status === filters.status)
  }

  // Расширенные фильтры
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

  return result
})

const filteredTotalValue = computed(() => {
  const sum = filteredItems.value.reduce((s, item) => s + (Number(item.currentStock) * Number(item.averagePrice || 0)), 0)
  return Number(sum.toFixed(2))
})

const filteredOutOfStockCount = computed(() => {
  return baseItemsForStats.value.filter(item => item.status === 'out_of_stock').length
})

const filteredInStockCount = computed(() => {
  return baseItemsForStats.value.filter(item => item.status === 'in_stock').length
})

const filteredReservedCount = computed(() => {
  const sum = baseItemsForStats.value.reduce((s, item) => s + (item.reserved || 0), 0)
  return Number(sum.toFixed(3))
})

const exportToExcel = () => {
  const dataToExport = filteredItems.value.map(item => ({
    'Название': item.name,
    'Артикул': item.sku,
    'Категория': item.category,
    'Остаток': item.currentStock,
    'Ед. изм.': item.unit,
    'Резерв': item.reserved || 0,
    'Доступно': (item.currentStock - (item.reserved || 0)),
    'Статус': inventoryStore.getStatusLabel(item.status),
    'Место': item.location || '-',
    'Цена (за ед.)': item.averagePrice || 0,
    'Общая стоимость': (item.currentStock * (item.averagePrice || 0))
  }))

  const ws = XLSX.utils.json_to_sheet(dataToExport)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Склад')

  XLSX.writeFile(wb, 'Sklad_Materialy.xlsx')
  message.success('Данные успешно экспортированы в Excel')
}

const exportToPDF = () => {
  const doc = new jsPDF()

  doc.addFileToVFS('customFont.ttf', fontBase64)
  doc.addFont('customFont.ttf', 'customFont', 'normal')
  doc.addFont('customFont.ttf', 'customFont', 'bold')
  doc.setFont('customFont')

  doc.text('Отчет по складским остаткам', 14, 15)

  const tableRows = filteredItems.value.map(item => [
    item.name,
    item.sku,
    item.currentStock,
    item.unit,
    inventoryStore.getStatusLabel(item.status),
    item.location || '-'
  ])

  autoTable(doc, {
    head: [['Наименование', 'Артикул', 'Остаток', 'Ед.', 'Статус', 'Место']],
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

  doc.save('Sklad_Materialy.pdf')
  message.success('Данные успешно экспортированы в PDF')
}

// Колонки таблицы
const columnsBase: DataTableColumns<InventoryItem> = [
  {
    title: 'Материал',
    key: 'name',
    width: 250,
    render: (row) => {
      const item = row as InventoryItem
      return h('div', {
        class: 'flex items-center gap-3'
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
    title: 'Резерв под заказы',
    key: 'reserveInfo',
    width: 220,
    render: (row) => {
      const item = row as InventoryItem

      const reserves = item.reserveDetails
      const isMap = reserves instanceof Map
      const isEmpty = isMap ? reserves.size === 0 : Object.keys(reserves || {}).length === 0

      if (!reserves || isEmpty) return h('div', { class: 'text-gray-400' }, 'Нет резервов')

      const ordersList: any[] = []

      if (isMap) {
        reserves.forEach((qty, orderId) => {
          if (qty === 0 || !orderId) return

          const order = ordersStore.orders.find(o => o.id === orderId)
          const orderLabel = order ? order.orderNumber : `Заказ ${orderId.substring(0, 6)}...`

          ordersList.push(h('div', { class: 'text-[11px] mb-0.5 whitespace-nowrap' }, [
            h('span', { class: 'font-bold text-blue-500' }, orderLabel),
            h('span', { class: 'text-gray-400 mx-1' }, '—'),
            h('span', { class: 'font-medium' }, `${qty} ${item.unit || '?'}`)
          ]))
        })
      } else {
        Object.entries(reserves).forEach(([orderId, qty]) => {
          if (!qty || qty === 0 || !orderId) return

          const order = ordersStore.orders.find(o => o.id === orderId)
          const orderLabel = order ? order.orderNumber : `Заказ ${orderId.substring(0, 6)}...`

          ordersList.push(h('div', { class: 'text-[11px] mb-0.5 whitespace-nowrap' }, [
            h('span', { class: 'font-bold text-blue-500' }, orderLabel),
            h('span', { class: 'text-gray-400 mx-1' }, '—'),
            h('span', { class: 'font-medium' }, `${qty} ${item.unit || '?'}`)
          ]))
        })
      }

      if (ordersList.length === 0) return h('div', { class: 'text-gray-400' }, 'Нет резервов')

      return h('div', { class: 'max-h-20 overflow-y-auto' }, ordersList)
    }
  },
  {
    title: 'Остаток',
    key: 'stock',
    width: 180,
    render: (row) => {
      const item = row as InventoryItem
      const available = item.currentStock - (item.reserved || 0)
      return h('div', [
        h('div', { class: 'font-medium' }, [
          h('span', { class: item.currentStock <= item.minStock ? 'text-yellow-500 font-bold' : 'font-bold' },
            `${available} ${item.unit} `
          ),
          item.reserved > 0 ? h('span', {
            class: 'text-gray-400 ml-6 font-medium',
          }, `(резерв ${item.reserved} ${item.unit})`) : null,
          item.onOrderQuantity && item.onOrderQuantity > 0 ?
            h(NPopover, { trigger: 'hover', placement: 'top' }, {
              trigger: () => h('span', { class: 'text-blue-500 ml-2 cursor-help text-[11px] font-bold' }, `(+${item.onOrderQuantity} в пути)`),
              default: () => h('div', { class: 'p-1' }, [
                h('div', { class: 'font-bold mb-1 border-b pb-1 text-blue-600' }, 'Ожидаемая поставка'),
                h('div', `Будет зачислено: ${item.onOrderQuantity} ${item.unit}`),
                h('div', { class: 'text-[10px] text-gray-500 mt-1 italic' }, 'Данные о поставке отображаются всегда до момента фактического прихода')
              ])
            })
            : null
        ]),
        h('div', { class: 'text-xs mt-1.5' }, [
          h('span', { class: 'text-gray-400' }, `Всего на складе: `),
          h('span', { class: 'font-bold text-blue-600' }, `${item.currentStock} ${item.unit}`)
        ])
      ])
    }
  },
  {
    title: 'Цена за ед.',
    key: 'averagePrice',
    width: 130,
    render: (row) => {
      const item = row as InventoryItem
      return h('div', { class: 'font-medium' }, formatCurrency(item.averagePrice || 0))
    },
    sorter: (a, b) => {
      return (a.averagePrice || 0) - (b.averagePrice || 0)
    }
  },
  {
    title: 'Статус',
    key: 'status',
    width: 120,
    render: (row) => {
      const item = row as InventoryItem
      return h(NTag, {
        type: inventoryStore.getStatusColor(item.status),
        size: 'small',
        bordered: false
      }, { default: () => inventoryStore.getStatusLabel(item.status) })
    }
  },
  {
    title: 'Склад',
    key: 'warehouse',
    width: 120,
    render: (row) => {
      const item = row as InventoryItem
      return h('div', { class: 'flex items-center gap-1' }, [
        h(NIcon, { size: '14' }, () => h(LocationOutline)),
        h('span', item.warehouse || 'Не указано')
      ])
    }
  },
  {
    title: 'Место хранения',
    key: 'storageBin',
    width: 150,
    render: (row) => {
      const item = row as InventoryItem
      return h('div', { class: 'text-gray-400 text-sm' }, item.storageBin || '-')
    }
  },
  {
    title: 'Стоимость',
    key: 'totalValue',
    width: 120,
    render: (row) => {
      const item = row as InventoryItem
      return formatCurrency(item.totalValue)
    },
    sorter: (a, b) => a.totalValue - b.totalValue
  }
]

// Фильтруем колонки по правам доступа
const columns = computed(() => {
  return columnsBase.filter(col => {
    if ((col.key === 'averagePrice' || col.key === 'totalValue') && !userStore.canSeePrices) {
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

const handlePrintQR = (item: InventoryItem) => {
  if (item && (item.barcode || item.sku)) {
    printData.title = item.name
    printData.code = item.barcode || item.sku
    printData.description = `Артикул: ${item.sku}`
    showPrintModal.value = true
  } else {
    message.warning('Для печати необходим штрих-код или артикул')
  }
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

const deleteItem = (id: string) => {
  dialog.warning({
    title: 'Удаление материала',
    content: 'Вы уверены, что хотите удалить этот материал? Это действие нельзя будет отменить.',
    positiveText: 'Удалить',
    negativeText: 'Отмена',
    onPositiveClick: () => {
      inventoryStore.deleteItem(id)
      message.success('Материал удален')
    }
  })
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

    message.success('Материал успешно обновлен')
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

    message.success('Материал успешно добавлен')
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

const rowProps = (row: any) => {
  return {
    class: 'cursor-pointer',
    onClick: () => {
      editItem((row as InventoryItem).id)
    }
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

:deep(.n-data-table-tr--striped) {
  background-color: rgba(255, 255, 255, 0.02);
}
</style>
