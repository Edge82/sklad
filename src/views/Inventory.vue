<template>
  <div class="inventory-page">
    <!-- Заголовок и кнопки -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <n-h1>Склад</n-h1>
        <n-text depth="3">Управление материалами и запасами склада</n-text>
      </div>
      <div class="flex gap-3">
        <n-button @click="exportData">
          <template #icon>
            <n-icon>
              <DownloadOutline />
            </n-icon>
          </template>
          Экспорт
        </n-button>
        <n-button @click="showReportModal = true" type="info">
          <template #icon>
            <n-icon>
              <AnalyticsOutline />
            </n-icon>
          </template>
          Отчеты
        </n-button>
        <n-button @click="showReceiptModal = true" type="warning">
          <template #icon>
            <n-icon>
              <AddCircleOutline />
            </n-icon>
          </template>
          Приход
        </n-button>
        <n-button @click="showIssueModal = true" type="error">
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
          Новый материал
        </n-button>
      </div>
    </div>

    <!-- Статистика -->
    <n-grid :cols="6" :x-gap="16" :y-gap="16" class="mb-6">
      <n-gi>
        <n-card>
          <div class="flex justify-between items-center">
            <div>
              <n-text depth="3">Всего позиций</n-text>
              <n-h3 class="m-0">{{ inventoryStore.totalItems }}</n-h3>
            </div>
            <n-icon size="32" color="#2080f0">
              <CubeOutline />
            </n-icon>
          </div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <div class="flex justify-between items-center">
            <div>
              <n-text depth="3">Стоимость запасов</n-text>
              <n-h3 class="m-0">{{ formatCurrency(inventoryStore.totalValue) }}</n-h3>
            </div>
            <n-icon size="32" color="#18a058">
              <CashOutline />
            </n-icon>
          </div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <div class="flex justify-between items-center">
            <div>
              <n-text depth="3">Мало осталось</n-text>
              <n-h3 class="m-0">{{ inventoryStore.lowStockItems }}</n-h3>
            </div>
            <n-icon size="32" color="#f0a020">
              <WarningOutline />
            </n-icon>
          </div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <div class="flex justify-between items-center">
            <div>
              <n-text depth="3">Отсутствует</n-text>
              <n-h3 class="m-0">{{ inventoryStore.outOfStockItems }}</n-h3>
            </div>
            <n-icon size="32" color="#d03050">
              <CloseCircleOutline />
            </n-icon>
          </div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <div class="flex justify-between items-center">
            <div>
              <n-text depth="3">Категории</n-text>
              <n-h3 class="m-0">{{ inventoryStore.categories.length }}</n-h3>
            </div>
            <n-icon size="32" color="#626aef">
              <AppsOutline />
            </n-icon>
          </div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <div class="flex justify-between items-center">
            <div>
              <n-text depth="3">Поставщики</n-text>
              <n-h3 class="m-0">{{ inventoryStore.suppliers.length }}</n-h3>
            </div>
            <n-icon size="32" color="#f0a020">
              <BusinessOutline />
            </n-icon>
          </div>
        </n-card>
      </n-gi>
    </n-grid>

    <!-- Фильтры и поиск -->
    <n-card class="mb-6">
      <div class="flex flex-wrap gap-4">
        <n-select v-model:value="filters.category" placeholder="Категория" :options="categoryOptions" clearable
          style="width: 200px" />
        <n-select v-model:value="filters.status" placeholder="Статус" :options="statusOptions" clearable
          style="width: 200px" />
        <n-select v-model:value="filters.supplier" placeholder="Поставщик" :options="supplierOptions" clearable
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
        <n-button type="primary" @click="showAdvancedFilters = !showAdvancedFilters">
          Расширенные фильтры
        </n-button>
      </div>

      <!-- Расширенные фильтры -->
      <n-collapse-transition :show="showAdvancedFilters">
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

    <!-- Быстрые действия -->
    <n-card title="Быстрые действия" class="mb-6">
      <n-space>
        <n-button @click="viewLowStock" type="warning">
          <template #icon>
            <n-icon>
              <WarningOutline />
            </n-icon>
          </template>
          Показать мало остатков ({{ inventoryStore.lowStockItems }})
        </n-button>
        <n-button @click="viewOutOfStock" type="error">
          <template #icon>
            <n-icon>
              <CloseCircleOutline />
            </n-icon>
          </template>
          Показать отсутствующие ({{ inventoryStore.outOfStockItems }})
        </n-button>
        <n-button @click="scanBarcode" type="primary">
          <template #icon>
            <n-icon>
              <BarcodeOutline />
            </n-icon>
          </template>
          Сканировать штрих-код
        </n-button>
        <n-button @click="startInventory" type="info">
          <template #icon>
            <n-icon>
              <CheckmarkDoneOutline />
            </n-icon>
          </template>
          Начать инвентаризацию
        </n-button>
      </n-space>
    </n-card>

    <!-- Таблица материалов -->
    <n-card>
      <div class="flex justify-between items-center mb-4">
        <n-h3 class="m-0">Материалы и запасы</n-h3>
        <div class="flex items-center gap-2">
          <n-text>Показывать:</n-text>
          <n-select v-model:value="itemsPerPage" :options="pageSizeOptions" style="width: 100px" />
        </div>
      </div>

      <n-data-table :columns="columns" :data="filteredItems" :pagination="pagination"
        :row-key="(row: InventoryItem) => row.id" striped @update:sorter="handleSorterChange" />
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
    <InventoryItemModal v-model:show="showCreateModal" @submit="handleItemSubmit" />

    <InventoryReportModal v-model:show="showReportModal" />

    <InventoryTransactionModal v-model:show="showReceiptModal" type="incoming" title="Приход материалов"
      @submit="handleTransactionSubmit" />

    <InventoryTransactionModal v-model:show="showIssueModal" type="outgoing" title="Расход материалов"
      @submit="handleTransactionSubmit" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, h } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
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
  NSpace,
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
  CloseCircleOutline,
  AppsOutline,
  BusinessOutline,
  SearchOutline,
  BarcodeOutline,
  CheckmarkDoneOutline,
  ArrowDownOutline,
  ArrowUpOutline,
  SwapHorizontalOutline,
  EyeOutline,
  PencilOutline,
  TrashOutline,
  LocationOutline
} from '@vicons/ionicons5'
// import InventoryItemModal from '@/components/inventory/InventoryItemModal.vue'
// import InventoryReportModal from '@/components/inventory/InventoryReportModal.vue'
// import InventoryTransactionModal from '@/components/inventory/InventoryTransactionModal.vue'

const inventoryStore = useInventoryStore()

// Модальные окна
const showCreateModal = ref(false)
const showReportModal = ref(false)
const showReceiptModal = ref(false)
const showIssueModal = ref(false)

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
  onChange: (page: number) => {
    console.log('Page changed:', page)
  },
  onUpdatePageSize: (pageSize: number) => {
    itemsPerPage.value = pageSize
  }
}))

// Опции фильтров
const categoryOptions = computed<SelectOption[]>(() => {
  return inventoryStore.categories.map(cat => ({
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

const supplierOptions = computed<SelectOption[]>(() => {
  return inventoryStore.suppliers.map(sup => ({
    label: sup.name,
    value: sup.name
  }))
})

// Фильтрованные элементы
const filteredItems = computed(() => {
  let result = inventoryStore.items

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

  // Фильтр по статусу
  if (filters.status) {
    result = result.filter(item => item.status === filters.status)
  }

  // Фильтр по поставщику
  if (filters.supplier) {
    result = result.filter(item => item.mainSupplier === filters.supplier)
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

// Колонки таблицы
const columns: DataTableColumns<InventoryItem> = [
  {
    title: 'Материал',
    key: 'name',
    width: 250,
    render: (row) => h('div', { class: 'flex items-center gap-3' }, [
      h('div', { class: 'w-8 h-8 bg-gray-800 rounded flex items-center justify-center' },
        h(NIcon, { size: '16' }, () => getCategoryIcon(row.categoryId))
      ),
      h('div', [
        h('div', { class: 'font-medium' }, row.name),
        h('div', { class: 'text-xs text-gray-500' }, row.sku)
      ])
    ])
  },
  {
    title: 'Категория',
    key: 'category',
    width: 120,
    sorter: (a, b) => a.category.localeCompare(b.category)
  },
  {
    title: 'Остаток',
    key: 'stock',
    width: 150,
    render: (row) => h('div', [
      h('div', { class: 'font-medium' }, [
        h('span', { class: row.currentStock <= row.minStock ? 'text-yellow-500' : '' },
          `${row.currentStock} ${row.unit}`
        ),
        row.reserved > 0 && h('span', { class: 'text-gray-500 ml-2' }, `(${row.reserved} резерв)`)
      ]),
      h('div', { class: 'text-xs text-gray-500' },
        `Доступно: ${row.available} ${row.unit}`
      )
    ])
  },
  {
    title: 'Статус',
    key: 'status',
    width: 120,
    render: (row) => h(NTag, {
      type: inventoryStore.getStatusColor(row.status),
      size: 'small',
      bordered: false
    }, { default: () => inventoryStore.getStatusLabel(row.status) })
  },
  {
    title: 'Место хранения',
    key: 'location',
    width: 120,
    render: (row) => h('div', { class: 'flex items-center gap-1' }, [
      h(NIcon, { size: '14' }, () => h(LocationOutline)),
      h('span', row.location)
    ])
  },
  {
    title: 'Цена',
    key: 'price',
    width: 100,
    render: (row) => formatCurrency(row.averagePrice),
    sorter: (a, b) => a.averagePrice - b.averagePrice
  },
  {
    title: 'Стоимость',
    key: 'totalValue',
    width: 120,
    render: (row) => formatCurrency(row.totalValue),
    sorter: (a, b) => a.totalValue - b.totalValue
  },
  {
    title: 'Действия',
    key: 'actions',
    width: 150,
    fixed: 'right',
    render: (row) => h('div', { class: 'flex gap-2' }, [
      h(NButton, {
        size: 'small',
        type: 'info',
        quaternary: true,
        onClick: () => viewItem(row.id)
      }, { icon: () => h(NIcon, null, { default: () => h(EyeOutline) }) }),
      h(NButton, {
        size: 'small',
        type: 'warning',
        quaternary: true,
        onClick: () => editItem(row.id)
      }, { icon: () => h(NIcon, null, { default: () => h(PencilOutline) }) }),
      h(NButton, {
        size: 'small',
        type: 'error',
        quaternary: true,
        onClick: () => deleteItem(row.id)
      }, { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) })
    ])
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

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('ru-RU').format(date)
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

const getCategoryIcon = (categoryId: number) => {
  const category = inventoryStore.categories.find(c => c.id === categoryId)
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

const getItemUnit = (itemId: number) => {
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

const viewLowStock = () => {
  filters.status = 'low_stock'
  window.$message?.info(`Показано ${inventoryStore.lowStockItems} позиций с малым остатком`)
}

const viewOutOfStock = () => {
  filters.status = 'out_of_stock'
  window.$message?.info(`Показано ${inventoryStore.outOfStockItems} отсутствующих позиций`)
}

const scanBarcode = () => {
  window.$message?.info('Сканирование штрих-кода (в разработке)')
}

const startInventory = () => {
  window.$message?.info('Начало инвентаризации (в разработке)')
}

const exportData = () => {
  window.$message?.success('Данные экспортированы в Excel')
}

const viewItem = (id: number) => {
  window.$message?.info(`Просмотр материала #${id}`)
}

const editItem = (id: number) => {
  window.$message?.info(`Редактирование материала #${id}`)
}

const deleteItem = (id: number) => {
  if (window.$dialog) {
    window.$dialog.warning({
      title: 'Удаление материала',
      content: 'Вы уверены, что хотите удалить этот материал?',
      positiveText: 'Удалить',
      negativeText: 'Отмена',
      onPositiveClick: () => {
        inventoryStore.deleteItem(id)
        window.$message?.success('Материал удален')
      }
    })
  }
}

const handleItemSubmit = (itemData: any) => {
  inventoryStore.addItem(itemData)
  window.$message?.success('Материал успешно добавлен')
}

const handleTransactionSubmit = (transactionData: any) => {
  const { itemId, quantity, type, ...rest } = transactionData
  inventoryStore.updateStock(itemId, quantity, type, rest)
  window.$message?.success('Операция успешно выполнена')
}

const handleSorterChange = (sorter: any) => {
  console.log('Сортировка изменена:', sorter)
}
</script>

<style scoped>
.inventory-page {
  max-width: 1600px;
  margin: 0 auto;
}
</style>
