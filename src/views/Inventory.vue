<template>
  <div class="inventory-page p-6">
    <!-- Режим массового прихода (полноэкранный вид внутри страницы) -->
    <div v-if="isBulkReceiptView">
      <div class="flex items-center gap-4 mb-6">
        <n-button @click="isBulkReceiptView = false" secondary circle>
          <template #icon><n-icon><ArrowBack /></n-icon></template>
        </n-button>
        <n-h1 class="!mb-0">{{ props.mode === 'product' ? 'Приход изделий' : 'Приход материалов' }}</n-h1>
      </div>
      
      <InventoryBulkReceiptModal 
        :is-embed="true"
        :mode="props.mode"
        @submit="handleTransactionSubmit" 
        @close="isBulkReceiptView = false"
      />
    </div>

    <!-- Режим массового расхода -->
    <div v-else-if="isBulkIssueView">
      <div class="flex items-center gap-4 mb-6">
        <n-button @click="isBulkIssueView = false" secondary circle>
          <template #icon><n-icon><ArrowBack /></n-icon></template>
        </n-button>
        <n-h1 class="!mb-0">{{ props.mode === 'product' ? 'Расход изделий' : 'Расход материалов' }}</n-h1>
      </div>
      
      <InventoryBulkIssueModal 
        :is-embed="true"
        :mode="props.mode"
        @submit="handleTransactionSubmit" 
        @close="isBulkIssueView = false"
      />
    </div>

    <!-- Основной контент страницы -->
    <div v-else>
      <!-- Заголовок и кнопки -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <n-h1>{{ pageTitle }}</n-h1>
          <div class="flex items-center gap-2">
            <n-text depth="3">Управление материалами и запасами склада</n-text>
            <n-divider vertical />
            <n-text depth="3" class="text-xs">Последняя синхронизация с 1С: {{ formatLastSync(integrationStore.lastSyncTime) }}</n-text>
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
          <n-button v-if="props.mode !== 'product'" @click="isBulkReceiptView = true" type="warning">
            <template #icon>
              <n-icon>
                <AddCircleOutline />
              </n-icon>
            </template>
            Приход
          </n-button>
          <n-button v-if="props.mode !== 'product'" @click="isBulkIssueView = true" type="error">
            <template #icon>
              <n-icon>
                <RemoveCircleOutline />
              </n-icon>
            </template>
            Расход
          </n-button>
          <n-button @click="showCreateModal = true" type="primary">
          <template #icon>
            <n-icon>
              <AddOutline />
            </n-icon>
          </template>
          {{ mode === 'product' ? 'Новое изделие' : 'Новый материал' }}
        </n-button>
      </div>
    </div>

    <!-- Режим Продукции (WMS) - Скрываем старую статистику, если нужно, или оставляем -->
    <!-- Статистика -->
    <n-grid :cols="6" :x-gap="12" :y-gap="12" class="mb-6 items-stretch py-2">
      <n-gi v-if="props.mode === 'product'">
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
      <n-gi v-else>
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

      <n-gi v-if="props.mode === 'product'">
        <n-card 
          size="small" 
          hoverable
          class="metric-card h-full flex flex-col justify-center"
          :class="{ 'active': filters.status === 'in_work' }"
          @click="filters.status = 'in_work'"
        >
          <div class="flex items-center gap-3 py-1">
            <n-icon size="28" color="#f0a020">
              <TimeOutline />
            </n-icon>
            <div>
              <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">В работе</n-text>
              <n-h3 class="m-0 leading-none">{{ ordersStore.pendingOrders }}</n-h3>
            </div>
          </div>
        </n-card>
      </n-gi>
      <n-gi v-else>
        <n-card 
          size="small" 
          hoverable
          class="metric-card h-full flex flex-col justify-center"
          :class="{ 'active': filters.status === 'low_stock' }"
          @click="filters.status = 'low_stock'"
        >
          <div class="flex items-center gap-3 py-1">
            <n-icon size="28" color="#f0a020">
              <WarningOutline />
            </n-icon>
            <div>
              <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Мало осталось</n-text>
              <n-h3 class="m-0 leading-none">{{ filteredLowStockCount }}</n-h3>
            </div>
          </div>
        </n-card>
      </n-gi>

      <n-gi v-if="props.mode === 'product'">
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
      <n-gi v-if="props.mode !== 'product'">
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

      <n-gi v-if="props.mode === 'product'">
        <n-card 
          size="small" 
          hoverable
          class="metric-card h-full flex flex-col justify-center"
          :class="{ 'active': filters.status === 'awaiting_shipment' }"
          @click="filters.status = 'awaiting_shipment'"
        >
          <div class="flex items-center gap-3 py-1">
            <n-icon size="28" color="#2080f0">
              <CubeOutline />
            </n-icon>
            <div>
              <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Ожидают выдачи</n-text>
              <n-h3 class="m-0 leading-none">{{ awaitingShipment }}</n-h3>
            </div>
          </div>
        </n-card>
      </n-gi>
      <n-gi v-if="props.mode !== 'product'">
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
      <n-gi v-if="props.mode === 'product'">
        <n-card 
          size="small" 
          hoverable
          class="metric-card h-full flex flex-col justify-center"
          :class="{ 'active': filters.status === 'all_products' }"
          @click="filters.status = 'all_products'"
        >
          <div class="flex items-center gap-3 py-1">
            <n-icon size="28" color="#f0a020">
              <BusinessOutline />
            </n-icon>
            <div>
              <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Всего изделий</n-text>
              <n-h3 class="m-0 leading-none">{{ baseItemsForStats.length }}</n-h3>
            </div>
          </div>
        </n-card>
      </n-gi>
      <n-gi v-if="props.mode === 'product'">
        <n-card border-variant="dark" class="metric-card revenue-card h-full flex flex-col justify-center" size="small">
          <div class="flex items-center gap-3 py-1">
            <n-icon size="28" color="#18a058" :component="CashOutline" />
            <div>
              <n-text depth="3" class="revenue-label block mb-1">Стоимость продукции</n-text>
              <n-h3 class="m-0 leading-none revenue-value text-[22px]">{{ formatCurrency(filteredTotalValue) }}</n-h3>
            </div>
          </div>
        </n-card>
      </n-gi>
      <n-gi v-if="props.mode !== 'product'">
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
      <n-gi v-if="props.mode !== 'product'">
        <n-card border-variant="dark" class="metric-card revenue-card h-full flex flex-col justify-center" size="small">
          <div class="flex items-center gap-3 py-1">
            <n-icon size="28" color="#18a058" :component="CashOutline" />
            <div>
              <n-text depth="3" class="revenue-label block mb-1">Стоимость запасов</n-text>
              <n-h3 class="m-0 leading-none revenue-value text-[22px]">{{ formatCurrency(filteredTotalValue) }}</n-h3>
            </div>
          </div>
        </n-card>
      </n-gi>
    </n-grid>

    <!-- Фильтры и поиск -->
    <n-card class="mb-4" size="small">
      <n-space align="center" :size="[16, 12]">
        <n-select 
          v-if="props.mode !== 'product'" 
          v-model:value="filters.category" 
          placeholder="Все категории" 
          :options="categoryOptions" 
          clearable
          class="w-48!" 
          :consistent-menu-width="false"
        />
        <n-select 
          v-if="props.mode !== 'product'" 
          v-model:value="filters.warehouse" 
          placeholder="Все склады" 
          :options="warehouseOptions" 
          clearable
          class="w-48!" 
          :consistent-menu-width="false"
        />
        <n-select 
          v-if="props.mode !== 'product'" 
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
        <n-button 
          v-if="props.mode === 'product'" 
          type="primary" 
          secondary 
          @click="isGrouped = !isGrouped"
        >
          {{ isGrouped ? 'Разгруппировать' : 'Группировать по заказу' }}
        </n-button>
      </n-space>
    </n-card>

    <!-- Таблица -->
    <n-card>
      <div class="flex justify-between items-center mb-4">
        <n-h3 class="m-0">{{ props.mode === 'product' ? 'Изделия и запасы' : 'Материалы и запасы' }}</n-h3>
        <div class="flex items-center gap-2">
          <n-text>Показывать:</n-text>
          <n-select v-model:value="itemsPerPage" :options="pageSizeOptions" class="w-32!" />
        </div>
      </div>

      <n-data-table :columns="columns" :data="tableData" :pagination="pagination"
        :row-key="(row: any) => row.id" striped @update:sorter="handleSorterChange"
        :row-props="rowProps"
        :default-expand-all="isGrouped"
        :key="isGrouped ? 'grouped' : 'ungrouped'"
      />
    </n-card>

    <!-- Последние операции -->
    <n-card title="Последние операции" class="mt-6">
      <n-list>
        <n-list-item v-for="transaction in inventoryStore.inventoryStats.recentTransactions" :key="transaction.id">
          <n-thing :title="getTransactionTitle(transaction)" :description="transaction.reason">
            <template #avatar>
              <n-avatar :type="getTransactionColor(transaction.type)">
                <n-icon v-if="transaction.type === 'incoming'">
                  <ArrowDownOutline />
                </n-icon>
                <n-icon v-else-if="transaction.type === 'outgoing'">
                  <ArrowUpOutline />
                </n-icon>
                <n-icon v-else>
                  <SwapHorizontalOutline />
                </n-icon>
              </n-avatar>
            </template>
            <template #description>
              <div class="flex justify-between items-center">
                <div>
                  <n-text>{{ transaction.quantity }} {{ getItemUnit(transaction.itemId) }}</n-text>
                  <n-text depth="3" class="ml-2">
                    {{ formatCurrency(transaction.totalPrice || 0) }}
                  </n-text>
                </div>
                <n-text depth="3">
                  {{ formatDateTime(transaction.createdAt) }}
                </n-text>
              </div>
            </template>
          </n-thing>
        </n-list-item>
      </n-list>
    </n-card>

    <!-- Модалки -->
    <InventoryItemModal 
      v-model:show="showCreateModal" 
      :item-id="selectedItemId"
      :mode="props.mode"
      @submit="handleItemSubmit" 
      @update:show="(val) => !val && (selectedItemId = null)"
    />

    <InventoryReportModal v-model:show="showReportModal" />

    <InventoryTransactionModal 
      v-model:show="showIssueModal" 
      type="outgoing" 
      :title="props.mode === 'product' ? 'Расход изделий' : 'Расход материалов'"
      :mode="props.mode"
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
import { useQRCodesStore } from '@/stores/qrCodes'
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
  NInputNumber,
  NFormItem,
  NDataTable,
  NImage,
  NList,
  NListItem,
  NThing,
  NTag,
  NAvatar,
  NH3,
  NCollapseTransition,
  NPopover
} from 'naive-ui'
import {
  DownloadOutline,
  AnalyticsOutline,
  AddCircleOutline,
  RemoveCircleOutline,
  AddOutline,
  CubeOutline,
  CashOutline,
  WarningOutline,
  TimeOutline,
  CloseCircleOutline,
  AppsOutline,
  BusinessOutline,
  SearchOutline,
  ArrowDownOutline,
  ArrowUpOutline,
  SwapHorizontalOutline,
  CheckmarkCircleOutline,
  TrashOutline,
  LocationOutline,
  QrCodeOutline,
  ArrowBack
} from '@vicons/ionicons5'
import InventoryItemModal from '@/components/inventory/InventoryItemModal.vue'
import InventoryReportModal from '@/components/inventory/InventoryReportModal.vue'
import InventoryTransactionModal from '@/components/inventory/InventoryTransactionModal.vue'
import InventoryBulkReceiptModal from '@/components/inventory/InventoryBulkReceiptModal.vue'
import InventoryBulkIssueModal from '@/components/inventory/InventoryBulkIssueModal.vue'
import InventoryItemDetails from '@/components/inventory/InventoryItemDetails.vue'
import QRPrintModal from '@/components/common/QRPrintModal.vue'
import { useDialog, useMessage } from 'naive-ui'
import { useUserStore } from '@/stores/user'
import { useEmployeesStore } from '@/stores/employees'
import { useIntegrationStore } from '@/stores/integration'
import { SyncOutline } from '@vicons/ionicons5'

const props = defineProps<{
  mode?: 'material' | 'product'
}>()

const inventoryStore = useInventoryStore()
const ordersStore = useOrdersStore()
const qrCodesStore = useQRCodesStore()
const userStore = useUserStore()
const employeesStore = useEmployeesStore()
const integrationStore = useIntegrationStore()
const dialog = useDialog()
const message = useMessage()

onMounted(async () => {
  // Автоматически синхронизируем данные при входе на страницу
  if (inventoryStore.items.length === 0 || !integrationStore.lastSyncTime) {
    await handleSync1C()
  }
  
  // Загружаем заказы для возможности привязки в приходе/расходе
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
  await integrationStore.syncWith1C()
  if (integrationStore.error) {
    message.error(integrationStore.error)
  } else {
    message.success('Синхронизация с 1С завершена успешно')
  }
}

const formatLastSync = (dateString: string | null) => {
  if (!dateString) return 'Никогда'
  return new Date(dateString).toLocaleString('ru-RU')
}

// Заголовок страницы
const pageTitle = computed(() => {
  return props.mode === 'product' ? 'Готовая продукция' : 'Основная продукция (Склад материалов)'
})

// Модальные окна
const showCreateModal = ref(false)
const showReportModal = ref(false)
const showReceiptModal = ref(false)
const showIssueModal = ref(false)
const showDetailsModal = ref(false)
const showPrintModal = ref(false)
const selectedItemId = ref<string | null>(null)
const isBulkReceiptView = ref(false)
const isBulkIssueView = ref(false)
const isGrouped = ref(false)
const showTransactionModal = ref(false)

const printData = reactive({
  title: '',
  code: '',
  description: ''
})

// Фильтры
const searchQuery = ref('')
const showAdvancedFilters = ref(false)
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
  const categories = props.mode === 'product' 
    ? inventoryStore.categories.filter(c => c.id === '99') 
    : inventoryStore.categories.filter(c => c.id !== '99')
    
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
  baseItemsForStats.value.forEach(item => {
    if (item.location && item.location !== '—') {
      // Разделяем, если в location несколько складов через запятую
      item.location.split(',').forEach(loc => {
        const trimmed = loc.trim()
        if (trimmed) warehouses.add(trimmed)
      })
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

// Базовые элементы для расчета статистики (фильтруются только по модулю: Материалы или Продукция)
const baseItemsForStats = computed(() => {
  const result = inventoryStore.items
  
  console.log('DEBUG: Inventory Mode:', props.mode);
  console.log('DEBUG: Total items in store:', result.length);
  
  if (props.mode === 'product') {
    const products = result.filter(item => item.type === 'product' || item.categoryId === '99')
    console.log('DEBUG: Found products:', products.length);
    if (products.length > 0) {
      console.log('DEBUG: First product sample:', {
        name: products[0].name,
        stock: products[0].currentStock,
        price: products[0].averagePrice,
        type: products[0].type
      });
    }
    return products
  }
  
  const materials = result.filter(item => item.type !== 'product' && item.categoryId !== '99')
  console.log('DEBUG: Found materials:', materials.length);
  return materials
})

// Фильтрованные элементы для таблицы
const filteredItems = computed(() => {
  let result = [...baseItemsForStats.value]

  // Специфический фильтр для карточки "Готовы к отгрузке"
  if (props.mode === 'product' && filters.status === 'ready_to_ship') {
    const readyOrderNumbers = ordersStore.orders
      .filter(o => o.status === 'ready')
      .map(o => o.orderNumber)
    
    result = result.filter(item => 
      item.orderNumber && 
      readyOrderNumbers.includes(item.orderNumber) &&
      item.currentStock > 0
    )
  }

  // Специфический фильтр для карточки "Ожидают выдачи"
  if (props.mode === 'product' && filters.status === 'awaiting_shipment') {
    const readyOrderNumbers = ordersStore.orders
      .filter(o => o.status === 'ready')
      .map(o => o.orderNumber)
    
    result = result.filter(item => 
      item.currentStock > 0 && 
      (!item.orderNumber || !readyOrderNumbers.includes(item.orderNumber))
    )
  }

  // Специфический фильтр для карточки "В работе"
  if (props.mode === 'product' && filters.status === 'in_work') {
    const pendingOrderNumbers = ordersStore.orders
      .filter(o => o.status === 'new' || o.status === 'in_progress')
      .map(o => o.orderNumber)
    
    result = result.filter(item => 
      item.orderNumber && pendingOrderNumbers.includes(item.orderNumber)
    )
  }

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
    result = result.filter(item => {
      if (!item.location || item.location === '—') return false
      return item.location.includes(filters.warehouse!)
    })
  }

  // Фильтр по статусу (если это не наш специальный статус)
  if (filters.status && !['ready_to_ship', 'awaiting_shipment', 'in_work', 'reserved', 'all_products', 'on_order'].includes(filters.status)) {
    result = result.filter(item => item.status === filters.status)
  }

  // Фильтр по статусу "В пути"
  if (filters.status === 'on_order') {
    result = result.filter(item => item.status === 'on_order')
  }

  // Фильтр по резерву
  if (filters.status === 'reserved') {
    result = result.filter(item => item.reserved > 0)
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

  // Расчет дополнительных полей для отображения в таблице (остаток, доступно, стоимость, статус)
  if (props.mode === 'product') {
    return result.map(item => {
      // Для режима продукции (WMS) считаем остаток на основе QR-кодов
      const itemQrs = qrCodesStore.qrCodes.filter(q => q.productId === item.id)
      const stock = itemQrs.length
      const reserved = itemQrs.filter(q => q.status === 'shipped').length
      const available = stock - reserved
      const price = item.averagePrice || 0
      
      return {
        ...item,
        currentStock: stock,
        reserved: reserved,
        available: available,
        totalValue: Number((stock * price).toFixed(2)),
        status: (available > 0 ? 'in_stock' : (stock > 0 ? 'reserved' : 'out_of_stock')) as InventoryItem['status']
      }
    })
  }

  return result
})

const filteredTotalValue = computed(() => {
  const sum = filteredItems.value.reduce((s, item) => s + (Number(item.currentStock) * Number(item.averagePrice || 0)), 0)
  return Number(sum.toFixed(2))
})

const filteredLowStockCount = computed(() => {
  return baseItemsForStats.value.filter(item => item.status === 'low_stock').length
})

const filteredOutOfStockCount = computed(() => {
  return baseItemsForStats.value.filter(item => item.status === 'out_of_stock').length
})

const filteredInStockCount = computed(() => {
  return baseItemsForStats.value.filter(item => item.status === 'in_stock').length
})

const filteredOnOrderCount = computed(() => {
  return baseItemsForStats.value.filter(item => item.status === 'on_order').length
})

const filteredReservedCount = computed(() => {
  const sum = baseItemsForStats.value.reduce((s, item) => s + (item.reserved || 0), 0)
  return Number(sum.toFixed(3))
})

const averageReadiness = computed(() => {
  const items = filteredItems.value.filter(item => item.type === 'product')
  if (items.length === 0) return 0
  const ready = items.filter(item => item.status === 'in_stock').length
  return Math.round((ready / items.length) * 100)
})

const readyToShipToday = computed(() => {
  // Находим все номера заказов со статусом "Готов"
  const readyOrderNumbers = ordersStore.orders
    .filter(o => o.status === 'ready')
    .map(o => o.orderNumber)

  // Считаем количество уникальных изделий на складе, которые относятся к этим заказам
  return filteredItems.value.filter(item => 
    item.type === 'product' && 
    item.orderNumber && 
    readyOrderNumbers.includes(item.orderNumber) &&
    item.currentStock > 0
  ).length
})

const awaitingShipment = computed(() => {
  // Номера готовых заказов
  const readyOrderNumbers = ordersStore.orders
    .filter(o => o.status === 'ready')
    .map(o => o.orderNumber)

  // Изделия, которые готовы (в наличии), но их заказ еще НЕ в статусе "Готов" 
  // (то есть они ждут, пока остальные позиции заказа доделаются)
  return filteredItems.value.filter(item => 
    item.type === 'product' && 
    item.currentStock > 0 && 
    (!item.orderNumber || !readyOrderNumbers.includes(item.orderNumber))
  ).length
})

type InventoryTableRow = (InventoryItem & { isGroup?: boolean; available?: number; isLowStock?: boolean }) | {
  id: string
  name: string
  sku: string
  currentStock: number
  totalValue: number
  isGroup: true
  children: InventoryItem[]
}

const tableData = computed<InventoryTableRow[]>(() => {
  if (!isGrouped.value || props.mode !== 'product') return filteredItems.value as InventoryTableRow[]
  
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
  
  // Группы с заказами
  Object.keys(groups).forEach(orderNo => {
    const groupItems = groups[orderNo]
    if (!groupItems) return

    const totalQty = groupItems.reduce((s, i) => s + i.currentStock, 0)
    const totalVal = groupItems.reduce((s, i) => s + i.totalValue, 0)

    result.push({
      id: `group-${orderNo}`,
      name: `ЗАКАЗ: ${orderNo}`,
      sku: `Позиций: ${groupItems.length}`,
      currentStock: totalQty,
      totalValue: totalVal,
      isGroup: true,
      children: groupItems
    })
  })
  
  // Группа без заказов (если есть)
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
  
  const fileName = props.mode === 'product' ? 'Sklad_Produkcia.xlsx' : 'Sklad_Materialy.xlsx'
  XLSX.writeFile(wb, fileName)
  message.success('Данные успешно экспортированы в Excel')
}

const exportToPDF = () => {
  const doc = new jsPDF()
  
  // Добавляем шрифт с поддержкой кириллицы
  // Регистрируем его и как normal, и как bold, чтобы избежать ошибок jspdf-autotable
  doc.addFileToVFS('customFont.ttf', fontBase64)
  doc.addFont('customFont.ttf', 'customFont', 'normal')
  doc.addFont('customFont.ttf', 'customFont', 'bold')
  doc.setFont('customFont')
  
  const title = props.mode === 'product' ? 'Отчет по готовой продукции' : 'Отчет по складским остаткам'
  doc.text(title, 14, 15)
  
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
    didDrawPage: (data) => {
      doc.setFont('customFont')
    }
  })

  const fileName = props.mode === 'product' ? 'Sklad_Produkcia.pdf' : 'Sklad_Materialy.pdf'
  doc.save(fileName)
  message.success('Данные успешно экспортированы в PDF')
}

// Колонки таблицы
const columns: DataTableColumns<InventoryTableRow> = [
  {
    title: props.mode === 'product' ? 'Изделие' : 'Материал',
    key: 'name',
    width: 250,
    render: (row) => {
      if ('isGroup' in row && row.isGroup) {
        return h('div', { class: 'flex items-center gap-2 font-bold text-blue-400 uppercase tracking-wider' }, [
          h(NIcon, { size: '20' }, () => h(BusinessOutline)),
          h('span', row.name)
        ])
      }
      const item = row as InventoryItem
      return h('div', { 
        class: [
          'flex items-center gap-3',
          isGrouped.value ? 'pl-8 border-l-2 border-blue-400/30 -ml-3' : ''
        ]
      }, [
        item.image 
          ? h(NImage, {
              src: item.image,
              width: 32,
              height: 32,
              class: 'rounded object-cover shrink-0 border'
            })
          : h('div', { class: 'w-8 h-8 bg-gray-800 rounded flex items-center justify-center shrink-0' },
              h(NIcon, { size: '16' }, () => getCategoryIcon(item.categoryId))
            ),
        h('div', [
          h('div', { class: 'font-medium' }, item.name),
          h('div', { class: 'text-xs text-gray-400' }, item.sku)
        ])
      ])
    }
  },
  ...(props.mode === 'product' ? [{
    title: 'Заказ',
    key: 'orderNumber',
    width: 130,
    render: (row: InventoryTableRow) => {
      if ('isGroup' in row && row.isGroup && !('orderNumber' in row)) return null
      const item = row as InventoryItem
      return h('div', { class: 'flex items-center gap-1 font-bold' }, [
        h(NIcon, { color: '#18a058' }, () => h(BusinessOutline)),
        h('span', { class: 'text-green-500' }, item.orderNumber || '-')
      ])
    }
  }] : []),
  {
    title: 'Остаток',
    key: 'stock',
    width: 150,
    render: (row) => {
      if ('isGroup' in row && row.isGroup && !('unit' in row)) {
        return h('div', { class: 'font-bold' }, `Итог: ${row.currentStock} шт.`)
      }
      const item = row as InventoryItem & { available: number; isLowStock: boolean }
      return h('div', [
        h('div', { class: 'font-medium' }, [
          h('span', { class: item.currentStock <= item.minStock ? 'text-yellow-500 font-bold' : 'font-bold' },
            `${item.available} ${item.unit} `
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
        h('div', { class: 'text-xs mt-1.5' },
          [
            h('span', { class: 'text-gray-400' }, `Всего на складе: `),
            h('span', { class: 'font-bold text-blue-600' }, `${item.currentStock} ${item.unit}`)
          ]
        )
      ])
    }
  },
  {
    title: 'Цена за ед.',
    key: 'averagePrice',
    width: 130,
    render: (row) => {
      if ('isGroup' in row && row.isGroup && !('averagePrice' in row)) return null
      const item = row as InventoryItem
      return h('div', { class: 'font-medium' }, formatCurrency(item.averagePrice || 0))
    },
    sorter: (a, b) => {
      const aPrice = 'averagePrice' in a ? (a.averagePrice || 0) : 0
      const bPrice = 'averagePrice' in b ? (b.averagePrice || 0) : 0
      return aPrice - bPrice
    }
  },
  {
    title: 'Статус',
    key: 'status',
    width: 120,
    render: (row) => {
      if ('isGroup' in row && row.isGroup && !('status' in row)) return null
      const item = row as InventoryItem
      return h(NTag, {
        type: inventoryStore.getStatusColor(item.status),
        size: 'small',
        bordered: false
      }, { default: () => inventoryStore.getStatusLabel(item.status) })
    }
  },
  {
    title: 'Место хранения',
    key: 'location',
    width: 120,
    render: (row) => {
      if ('isGroup' in row && row.isGroup && !('location' in row)) return null
      const item = row as InventoryItem
      return h('div', { class: 'flex items-center gap-1' }, [
        h(NIcon, { size: '14' }, () => h(LocationOutline)),
        h('span', item.location)
      ])
    }
  },
  {
    title: 'Стоимость',
    key: 'totalValue',
    width: 120,
    render: (row) => {
      if (row.isGroup) {
        return h('div', { class: 'font-bold text-green-500' }, formatCurrency(row.totalValue))
      }
      return formatCurrency(row.totalValue)
    },
    sorter: (a, b) => a.totalValue - b.totalValue
  },
  {
    title: 'Действия',
    key: 'actions',
    width: 100,
    fixed: 'right',
    render: (row) => {
      if (row.isGroup) return null
      return h('div', { class: 'flex gap-2' }, [
        h(NButton, {
          size: 'small',
          type: 'info',
          quaternary: true,
          onClick: (e) => {
            e.stopPropagation()
            handlePrintQR(row)
          }
        }, { icon: () => h(NIcon, null, { default: () => h(QrCodeOutline) }) }),
        h(NButton, {
          size: 'small',
          type: 'error',
          quaternary: true,
          onClick: (e) => {
            e.stopPropagation()
            deleteItem(row.id)
          }
        }, { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) })
      ])
    }
  }
]

// Вспомогательные функции
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0
  }).format(amount)
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

const getItemUnit = (itemId: string) => {
  const item = inventoryStore.getItemById(itemId)
  return item?.unit || 'шт'
}

const getTransactionTitle = (transaction: InventoryTransaction) => {
  const item = inventoryStore.getItemById(transaction.itemId)
  const typeMap = {
    'incoming': 'Приход',
    'outgoing': 'Расход',
    'transfer': 'Перемещение',
    'adjustment': 'Корректировка',
    'reservation': 'Резервирование',
    'write_off': 'Списание'
  }
  return `${typeMap[transaction.type]}: ${item?.name || 'Неизвестный материал'}`
}

const getTransactionColor = (type: InventoryTransaction['type']) => {
  const colorMap = {
    'incoming': 'success',
    'outgoing': 'error',
    'transfer': 'warning',
    'adjustment': 'info',
    'reservation': 'primary',
    'write_off': 'default'
  }
  return colorMap[type] || 'default'
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
  const itemLabel = props.mode === 'product' ? 'изделие' : 'материал'
  dialog.warning({
    title: props.mode === 'product' ? 'Удаление изделия' : 'Удаление материала',
    content: `Вы уверены, что хотите удалить это ${itemLabel}? Это действие нельзя будет отменить.`,
    positiveText: 'Удалить',
    negativeText: 'Отмена',
    onPositiveClick: () => {
      inventoryStore.deleteItem(id)
      message.success(`${props.mode === 'product' ? 'Изделие' : 'Материал'} удален`)
    }
  })
}

const handleItemSubmit = (itemData: Partial<InventoryItem>) => {
  if (selectedItemId.value) {
    const oldItem = inventoryStore.items.find(i => i.id === selectedItemId.value)
    inventoryStore.updateItem(selectedItemId.value, itemData)
    
    // Если изменилась цена закупки, создаем запись о корректировке в истории
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
    
    message.success(`${props.mode === 'product' ? 'Изделие' : 'Материал'} успешно обновлено`)
  } else {
    const newItem = inventoryStore.addItem(itemData as Parameters<typeof inventoryStore.addItem>[0])
    
    // Добавляем запись в "Движение материалов" о создании новой карточки
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
    
    message.success(`${props.mode === 'product' ? 'Изделие' : 'Материал'} успешно добавлено`)
  }
  selectedItemId.value = null
}

const handleTransactionSubmit = (transactionData: Partial<InventoryTransaction> & { newStatus?: InventoryItem['status'] }) => {
  const { itemId, quantity, type, newStatus, ...rest } = transactionData
  if (itemId && (quantity !== undefined) && type) {
    // Если передан новый статус (например, при приходе), обновляем его у товара до проведения транзакции
    if (newStatus && type === 'incoming') {
      const updates: Partial<InventoryItem> = { status: newStatus }
      
      // Если статус "В пути", записываем количество в специальное поле, не меняя остаток
      if (newStatus === 'on_order') {
        updates.onOrderQuantity = (inventoryStore.items.find(i => i.id === itemId)?.onOrderQuantity || 0) + quantity
      }
      
      inventoryStore.updateItem(itemId, updates)
    }

    // Обновляем остатки на складе только если количество больше 0 и это не статус "В пути"
    if (quantity > 0 && newStatus !== 'on_order') {
      inventoryStore.updateStock(itemId, quantity, type, rest)
      
      // Если пришел товар, который был "в пути", очищаем это поле или уменьшаем его
      const item = inventoryStore.items.find(i => i.id === itemId)
      if (item && item.onOrderQuantity) {
        inventoryStore.updateItem(itemId, { 
          onOrderQuantity: Math.max(0, item.onOrderQuantity - quantity) 
        })
      }
    }
    
    // Добавляем запись в общую историю движений для "Движения материалов"
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

const rowProps = (row: InventoryTableRow) => {
  const isGroup = 'isGroup' in row && row.isGroup
  if (isGroup) {
    return {
      class: 'group-header-row bg-blue-400/10 font-bold cursor-default'
    }
  }
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

:deep(.group-header-row) td {
  border-bottom: 2px solid rgba(32, 128, 240, 0.2);
}

:deep(.n-data-table-tr--striped) {
  background-color: rgba(255, 255, 255, 0.02);
}
</style>
