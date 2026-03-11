<template>
  <div class="inventory-page">
    <!-- Заголовок и кнопки -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <n-h1>{{ pageTitle }}</n-h1>
        <n-text depth="3">Управление материалами и запасами склада</n-text>
      </div>
      <div class="flex gap-3">
        <n-button v-if="mode !== 'product'" @click="showReceiptModal = true" type="warning">
          <template #icon>
            <n-icon>
              <AddCircleOutline />
            </n-icon>
          </template>
          Приход
        </n-button>
        <n-button v-if="mode !== 'product'" @click="showIssueModal = true" type="error">
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

    <!-- Статистика -->
    <n-grid :cols="6" :x-gap="16" :y-gap="16" class="mb-6">
      <n-gi v-if="props.mode === 'product'">
        <n-card class="cursor-pointer hover:border-blue-500 transition-colors" @click="resetFilters">
          <div class="flex justify-between items-center">
            <div>
              <n-text depth="3">Готовность склада</n-text>
              <n-h3 class="m-0">{{ averageReadiness }}%</n-h3>
            </div>
            <n-icon size="32" color="#626aef">
              <AnalyticsOutline />
            </n-icon>
          </div>
        </n-card>
      </n-gi>
      <n-gi v-else>
        <n-card class="cursor-pointer hover:border-blue-500 transition-colors" @click="resetFilters">
          <div class="flex justify-between items-center">
            <div>
              <n-text depth="3">Всего позиций</n-text>
              <n-h3 class="m-0">{{ baseItemsForStats.length }}</n-h3>
            </div>
            <n-icon size="32" color="#2080f0">
              <CubeOutline />
            </n-icon>
          </div>
        </n-card>
      </n-gi>

      <n-gi v-if="props.mode === 'product'">
        <n-card class="cursor-pointer hover:border-orange-500 transition-colors" @click="filters.status = 'in_work'">
          <div class="flex justify-between items-center">
            <div>
              <n-text depth="3">В работе</n-text>
              <n-h3 class="m-0">{{ ordersStore.pendingOrders }}</n-h3>
            </div>
            <n-icon size="32" color="#f0a020">
              <TimeOutline />
            </n-icon>
          </div>
        </n-card>
      </n-gi>
      <n-gi v-else>
        <n-card class="cursor-pointer hover:border-orange-500 transition-colors" @click="filters.status = 'low_stock'">
          <div class="flex justify-between items-center">
            <div>
              <n-text depth="3">Мало осталось</n-text>
              <n-h3 class="m-0">{{ filteredLowStockCount }}</n-h3>
            </div>
            <n-icon size="32" color="#f0a020">
              <WarningOutline />
            </n-icon>
          </div>
        </n-card>
      </n-gi>

      <n-gi v-if="props.mode === 'product'">
        <n-card class="cursor-pointer hover:border-green-500 transition-colors" @click="filters.status = 'ready_to_ship'">
          <div class="flex justify-between items-center">
            <div>
              <n-text depth="3">Готовы к отгрузке</n-text>
              <n-h3 class="m-0">{{ readyToShipToday }}</n-h3>
            </div>
            <n-icon size="32" color="#18a058">
              <DownloadOutline />
            </n-icon>
          </div>
        </n-card>
      </n-gi>
      <n-gi v-if="props.mode !== 'product'">
        <n-card class="cursor-pointer hover:border-red-500 transition-colors" @click="filters.status = 'out_of_stock'">
          <div class="flex justify-between items-center">
            <div>
              <n-text depth="3">Отсутствует</n-text>
              <n-h3 class="m-0">{{ filteredOutOfStockCount }}</n-h3>
            </div>
            <n-icon size="32" color="#d03050">
              <CloseCircleOutline />
            </n-icon>
          </div>
        </n-card>
      </n-gi>

      <n-gi v-if="props.mode === 'product'">
        <n-card class="cursor-pointer hover:border-blue-500 transition-colors" @click="filters.status = 'awaiting_shipment'">
          <div class="flex justify-between items-center">
            <div>
              <n-text depth="3">Ожидают выдачи</n-text>
              <n-h3 class="m-0">{{ awaitingShipment }}</n-h3>
            </div>
            <n-icon size="32" color="#2080f0" class="opacity-80">
              <CubeOutline />
            </n-icon>
          </div>
        </n-card>
      </n-gi>
      <n-gi v-if="props.mode !== 'product'">
        <n-card class="cursor-pointer hover:border-purple-500 transition-colors" @click="filters.status = 'reserved'">
          <div class="flex justify-between items-center">
            <div>
              <n-text depth="3">Зарезервировано</n-text>
              <n-h3 class="m-0">{{ filteredReservedCount }}</n-h3>
            </div>
            <n-icon size="32" color="#626aef" class="opacity-80">
              <AppsOutline />
            </n-icon>
          </div>
        </n-card>
      </n-gi>
      <n-gi v-if="props.mode === 'product'">
        <n-card class="cursor-pointer hover:border-orange-500 transition-colors" @click="resetFilters">
          <div class="flex justify-between items-center">
            <div>
              <n-text depth="3">Всего изделий</n-text>
              <n-h3 class="m-0">{{ baseItemsForStats.length }}</n-h3>
            </div>
            <n-icon size="32" color="#f0a020" class="opacity-80">
              <BusinessOutline />
            </n-icon>
          </div>
        </n-card>
      </n-gi>
      <n-gi v-if="props.mode === 'product'">
        <n-card border-variant="dark" class="revenue-card">
          <div class="flex justify-between items-center">
            <div>
              <n-text depth="3" class="revenue-label text-[10px]">Стоимость продукции</n-text>
              <n-h3 class="m-0 revenue-value">{{ formatCurrency(filteredTotalValue) }}</n-h3>
            </div>
            <n-icon size="32" color="#18a058">
              <CashOutline />
            </n-icon>
          </div>
        </n-card>
      </n-gi>
      <n-gi v-if="props.mode !== 'product'">
        <n-card class="cursor-pointer hover:border-green-500 transition-colors" @click="filters.status = 'on_order'">
          <div class="flex justify-between items-center">
            <div>
              <n-text depth="3">В пути (SKU)</n-text>
              <n-h3 class="m-0">{{ filteredOnOrderCount }}</n-h3>
            </div>
            <n-icon size="32" color="#18a058" class="opacity-80">
              <SwapHorizontalOutline />
            </n-icon>
          </div>
        </n-card>
      </n-gi>
      <n-gi v-if="props.mode !== 'product'">
        <n-card border-variant="dark" class="revenue-card">
          <div class="flex justify-between items-center">
            <div>
              <n-text depth="3" class="revenue-label text-[10px]">Стоимость запасов</n-text>
              <n-h3 class="m-0 revenue-value">{{ formatCurrency(filteredTotalValue) }}</n-h3>
            </div>
            <n-icon size="32" color="#18a058">
              <CashOutline />
            </n-icon>
          </div>
        </n-card>
      </n-gi>
    </n-grid>

    <!-- Фильтры и поиск -->
    <n-card class="mb-6">
      <div class="flex flex-wrap gap-4">
        <n-select v-if="props.mode !== 'product'" v-model:value="filters.category" placeholder="Категория" :options="categoryOptions" clearable
          style="width: 200px" />
        <n-select v-if="props.mode !== 'product'" v-model:value="filters.status" placeholder="Статус" :options="statusOptions" clearable
          style="width: 200px" />
        <n-input v-model:value="searchQuery" placeholder="Поиск по названию, артикулу или SKU" clearable
          style="width: 300px">
          <template #prefix>
            <n-icon>
              <SearchOutline />
            </n-icon>
          </template>
        </n-input>
        <n-button @click="resetFilters">Сбросить</n-button>
        <n-button v-if="props.mode === 'product'" type="primary" secondary @click="isGrouped = !isGrouped">
          {{ isGrouped ? 'Разгруппировать' : 'Группировать по заказу' }}
        </n-button>
        <n-button v-if="props.mode !== 'product'" type="primary" @click="showAdvancedFilters = !showAdvancedFilters">
          Расширенные фильтры
        </n-button>
      </div>

      <!-- Расширенные фильтры -->
      <n-collapse-transition v-if="props.mode !== 'product'" :show="showAdvancedFilters">
        <div class="mt-4 pt-4 border-t border-gray-800">
          <n-grid :cols="4" :x-gap="12">
            <n-gi>
              <n-form-item label="Минимальный остаток">
                <n-input-number v-model:value="advancedFilters.minStock" :min="0" placeholder="От"
                  style="width: 100%" />
              </n-form-item>
            </n-gi>
            <n-gi>
              <n-form-item label="Максимальный остаток">
                <n-input-number v-model:value="advancedFilters.maxStock" :min="0" placeholder="До"
                  style="width: 100%" />
              </n-form-item>
            </n-gi>
            <n-gi>
              <n-form-item label="Цена от">
                <n-input-number v-model:value="advancedFilters.minPrice" :min="0" placeholder="Мин цена"
                  style="width: 100%">
                  <template #suffix>₽</template>
                </n-input-number>
              </n-form-item>
            </n-gi>
            <n-gi>
              <n-form-item label="Цена до">
                <n-input-number v-model:value="advancedFilters.maxPrice" :min="0" placeholder="Макс цена"
                  style="width: 100%">
                  <template #suffix>₽</template>
                </n-input-number>
              </n-form-item>
            </n-gi>
          </n-grid>
        </div>
      </n-collapse-transition>
    </n-card>

    <!-- Таблица -->
    <n-card>
      <div class="flex justify-between items-center mb-4">
        <n-h3 class="m-0">{{ props.mode === 'product' ? 'Изделия и запасы' : 'Материалы и запасы' }}</n-h3>
        <div class="flex items-center gap-2">
          <n-text>Показывать:</n-text>
          <n-select v-model:value="itemsPerPage" :options="pageSizeOptions" style="width: 100px" />
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
      v-model:show="showReceiptModal" 
      type="incoming" 
      :title="props.mode === 'product' ? 'Приход изделий' : 'Приход материалов'"
      :mode="props.mode"
      @submit="handleTransactionSubmit" 
    />

    <InventoryTransactionModal 
      v-model:show="showIssueModal" 
      type="outgoing" 
      :title="props.mode === 'product' ? 'Расход изделий' : 'Расход материалов'"
      :mode="props.mode"
      @submit="handleTransactionSubmit" 
    />

    <n-modal v-model:show="showDetailsModal" preset="card" title="Детали материала" style="width: 1000px">
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
</template>

<script setup lang="ts">
import { ref, reactive, computed, h } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { useOrdersStore } from '@/stores/orders'
import type { InventoryItem, InventoryTransaction } from '@/types'
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
  NList,
  NListItem,
  NThing,
  NTag,
  NAvatar,
  NH3,
  NCollapseTransition
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
  TrashOutline,
  LocationOutline,
  QrCodeOutline
} from '@vicons/ionicons5'
import InventoryItemModal from '@/components/inventory/InventoryItemModal.vue'
import InventoryReportModal from '@/components/inventory/InventoryReportModal.vue'
import InventoryTransactionModal from '@/components/inventory/InventoryTransactionModal.vue'
import InventoryItemDetails from '@/components/inventory/InventoryItemDetails.vue'
import QRPrintModal from '@/components/common/QRPrintModal.vue'
import { useDialog, useMessage } from 'naive-ui'
import { useUserStore } from '@/stores/user'
import { useEmployeesStore } from '@/stores/employees'

const props = defineProps<{
  mode?: 'material' | 'product'
}>()

const inventoryStore = useInventoryStore()
const ordersStore = useOrdersStore()
const userStore = useUserStore()
const employeesStore = useEmployeesStore()
const dialog = useDialog()
const message = useMessage()

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
const isGrouped = ref(false)

const printData = reactive({
  title: '',
  code: '',
  description: ''
})

// Фильтры
const searchQuery = ref('')
const showAdvancedFilters = ref(false)
const filters = reactive({
  category: null as string | null,
  status: null as string | null,
  supplier: null as string | null
})

const advancedFilters = reactive({
  minStock: null as number | null,
  maxStock: null as number | null,
  minPrice: null as number | null,
  maxPrice: null as number | null
})

// Пагинация
const itemsPerPage = ref(10)
const pageSizeOptions = [
  { label: '10', value: 10 },
  { label: '25', value: 25 },
  { label: '50', value: 50 },
  { label: 'Все', value: 1000 }
]

const pagination = computed(() => ({
  pageSize: itemsPerPage.value,
  page: 1,
  pageCount: Math.ceil(filteredItems.value.length / itemsPerPage.value),
  showSizePicker: true,
  pageSizes: [10, 25, 50, 100],
  onChange: () => {
    // Handle page change if needed
  },
  onUpdatePageSize: (pageSize: number) => {
    itemsPerPage.value = pageSize
  }
}))

// Опции фильтров
const categoryOptions = computed<SelectOption[]>(() => {
  const categories = props.mode === 'product' 
    ? inventoryStore.categories.filter(c => c.id === '99') 
    : inventoryStore.categories.filter(c => c.id !== '99')
    
  return categories.map(cat => ({
    label: cat.name,
    value: cat.name
  }))
})

const statusOptions: SelectOption[] = [
  { label: 'В наличии', value: 'in_stock' },
  { label: 'Мало осталось', value: 'low_stock' },
  { label: 'Отсутствует', value: 'out_of_stock' },
  { label: 'Зарезервировано', value: 'reserved' },
  { label: 'В пути', value: 'on_order' },
  { label: 'Заблокировано', value: 'blocked' }
]

// Базовые элементы для расчета статистики (фильтруются только по модулю: Материалы или Продукция)
const baseItemsForStats = computed(() => {
  const result = inventoryStore.items
  if (props.mode === 'product') {
    return result.filter(item => item.type === 'product')
  }
  return result.filter(item => item.type !== 'product')
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

  // Фильтр по статусу (если это не наш специальный статус)
  if (filters.status && !['ready_to_ship', 'awaiting_shipment', 'in_work', 'reserved'].includes(filters.status)) {
    result = result.filter(item => item.status === filters.status)
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

  return result
})

const filteredTotalValue = computed(() => {
  return filteredItems.value.reduce((sum, item) => sum + (Number(item.currentStock) * Number(item.averagePrice || 0)), 0)
})

const filteredLowStockCount = computed(() => {
  return baseItemsForStats.value.filter(item => item.status === 'low_stock').length
})

const filteredOutOfStockCount = computed(() => {
  return baseItemsForStats.value.filter(item => item.status === 'out_of_stock').length
})

const filteredReservedCount = computed(() => {
  return baseItemsForStats.value.reduce((sum, item) => sum + (item.reserved || 0), 0)
})

const filteredOnOrderCount = computed(() => {
  return baseItemsForStats.value.filter(item => item.status === 'on_order').length
})

const averageReadiness = computed(() => {
  const items = baseItemsForStats.value.filter(item => item.type === 'product')
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
  return baseItemsForStats.value.filter(item => 
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
  return baseItemsForStats.value.filter(item => 
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
        class: 'flex items-center gap-3',
        style: isGrouped.value ? 'padding-left: 32px; border-left: 2px solid rgba(32, 128, 240, 0.3); margin-left: -12px;' : ''
      }, [
        h('div', { class: 'w-8 h-8 bg-gray-800 rounded flex items-center justify-center shrink-0' },
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
          h('span', { class: item.currentStock <= item.minStock ? 'text-yellow-500' : '' },
            `${item.currentStock} ${item.unit}`
          ),
          item.reserved > 0 && h('span', { class: 'text-gray-500 ml-2' }, `(${item.reserved} резерв)`)
        ]),
        h('div', { class: 'text-xs text-gray-500' },
          `Доступно: ${item.available} ${item.unit}`
        )
      ])
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
    title: 'Цена',
    key: 'price',
    width: 100,
    render: (row) => {
      if ('isGroup' in row && row.isGroup && !('averagePrice' in row)) return null
      const item = row as InventoryItem
      return formatCurrency(item.averagePrice)
    },
    sorter: (a, b) => {
      const aPrice = 'averagePrice' in a ? a.averagePrice : 0
      const bPrice = 'averagePrice' in b ? b.averagePrice : 0
      return aPrice - bPrice
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
  filters.category = null
  filters.status = null
  filters.supplier = null
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
      const historyItem = {
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
        remarks: `Цена изменена с ${oldItem.purchasePrice} на ${itemData.purchasePrice} ₽`
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
      const historyItem = {
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

const handleTransactionSubmit = (transactionData: Partial<InventoryTransaction>) => {
  const { itemId, quantity, type, ...rest } = transactionData
  if (itemId && quantity && type) {
    // Обновляем остатки на складе
    inventoryStore.updateStock(itemId, quantity, type, rest)
    
    // Добавляем запись в общую историю движений для "Движения материалов"
    const item = inventoryStore.items.find(i => i.id === itemId)
    if (item) {
      const historyItem = {
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
      style: 'background: rgba(32, 128, 240, 0.08); font-weight: bold; cursor: default;',
      class: 'group-header-row'
    }
  }
  return {
    style: 'cursor: pointer;',
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
}

.cursor-pointer {
  cursor: pointer;
}

.revenue-card {
  background: rgba(24, 160, 88, 0.1) !important;
  border: 1px solid rgba(24, 160, 88, 0.3) !important;
}

.revenue-label {
  color: #18a058 !important;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.05em;
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
