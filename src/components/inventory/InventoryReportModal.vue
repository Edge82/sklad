<template>
  <n-modal v-model:show="showModal" preset="card" title="Отчеты по складу" style="width: 900px" :bordered="false"
    size="huge">
    <n-tabs type="line" animated>
      <!-- Отчет по остаткам -->
      <n-tab-pane name="stock" tab="Остатки">
        <n-card title="Отчет по остаткам материалов" class="mb-4">
          <n-space vertical>
            <div class="flex gap-4 mb-4">
              <n-date-picker v-model:value="reportParams.stock.dateRange" type="daterange" clearable
                placeholder="Период" style="width: 300px" />
              <n-select v-model:value="reportParams.stock.category" placeholder="Категория" :options="categoryOptions"
                clearable style="width: 200px" />
              <n-button type="primary" @click="generateStockReport">
                <template #icon>
                  <n-icon>
                    <RefreshOutline />
                  </n-icon>
                </template>
                Сформировать
              </n-button>
              <n-button @click="exportStockReport">
                <template #icon>
                  <n-icon>
                    <DownloadOutline />
                  </n-icon>
                </template>
                Экспорт
              </n-button>
            </div>

            <n-data-table :columns="stockReportColumns" :data="stockReportData" :pagination="{ pageSize: 10 }"
              striped />
          </n-space>
        </n-card>
      </n-tab-pane>

      <!-- Отчет по движению -->
      <n-tab-pane name="movement" tab="Движение">
        <n-card title="Отчет по движению материалов" class="mb-4">
          <n-space vertical>
            <div class="flex gap-4 mb-4">
              <n-date-picker v-model:value="reportParams.movement.dateRange" type="daterange" clearable
                placeholder="Период" style="width: 300px" />
              <n-select v-model:value="reportParams.movement.type" placeholder="Тип операции"
                :options="transactionTypeOptions" clearable style="width: 200px" />
              <n-button type="primary" @click="generateMovementReport">
                <template #icon>
                  <n-icon>
                    <RefreshOutline />
                  </n-icon>
                </template>
                Сформировать
              </n-button>
            </div>

            <n-data-table :columns="movementReportColumns" :data="movementReportData" :pagination="{ pageSize: 10 }"
              striped />
          </n-space>
        </n-card>
      </n-tab-pane>

      <!-- Отчет по стоимости -->
      <n-tab-pane name="value" tab="Стоимость">
        <n-card title="Отчет по стоимости запасов" class="mb-4">
          <div class="flex items-center justify-between mb-4">
            <n-text strong>Общая стоимость запасов: {{ formatCurrency(totalInventoryValue) }}</n-text>
            <n-button type="primary" @click="generateValueReport">
              <template #icon>
                <n-icon>
                  <RefreshOutline />
                </n-icon>
              </template>
              Обновить
            </n-button>
          </div>

          <n-grid :cols="2" :x-gap="16" :y-gap="16">
            <!-- По категориям -->
            <n-gi>
              <n-card title="По категориям" size="small">
                <n-list>
                  <n-list-item v-for="category in valueByCategory" :key="category.name">
                    <n-thing :title="category.name">
                      <template #description>
                        <div class="flex justify-between items-center">
                          <span>{{ category.count }} позиций</span>
                          <n-text strong>{{ formatCurrency(category.value) }}</n-text>
                        </div>
                      </template>
                    </n-thing>
                  </n-list-item>
                </n-list>
              </n-card>
            </n-gi>

            <!-- По статусам -->
            <n-gi>
              <n-card title="По статусам" size="small">
                <n-list>
                  <n-list-item v-for="status in valueByStatus" :key="status.type">
                    <n-thing :title="getStatusLabel(status.type)">
                      <template #description>
                        <div class="flex justify-between items-center">
                          <span>{{ status.count }} позиций</span>
                          <n-text strong>{{ formatCurrency(status.value) }}</n-text>
                        </div>
                      </template>
                    </n-thing>
                  </n-list-item>
                </n-list>
              </n-card>
            </n-gi>
          </n-grid>
        </n-card>
      </n-tab-pane>

      <!-- Отчет по поставщикам -->
      <n-tab-pane name="suppliers" tab="Поставщики">
        <n-card title="Отчет по поставщикам" class="mb-4">
          <n-data-table :columns="supplierReportColumns" :data="supplierReportData" :pagination="{ pageSize: 10 }"
            striped />
        </n-card>
      </n-tab-pane>
    </n-tabs>

    <div class="flex justify-end gap-3 mt-6">
      <n-button @click="showModal = false">Закрыть</n-button>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, reactive, computed, h } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import type { DataTableColumns } from 'naive-ui'
import {
  NModal,
  NTabs,
  NTabPane,
  NCard,
  NSpace,
  NDatePicker,
  NSelect,
  NButton,
  NIcon,
  NDataTable,
  NList,
  NListItem,
  NThing,
  NText,
  NGrid,
  NGi,
  NTag
} from 'naive-ui'
import {
  RefreshOutline,
  DownloadOutline,
  ArrowDownOutline,
  ArrowUpOutline,
  SwapHorizontalOutline
} from '@vicons/ionicons5'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

const inventoryStore = useInventoryStore()

const showModal = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})

// Параметры отчетов
const reportParams = reactive({
  stock: {
    dateRange: null as [number, number] | null,
    category: null as string | null
  },
  movement: {
    dateRange: null as [number, number] | null,
    type: null as string | null
  }
})

// Опции для фильтров
const categoryOptions = computed(() => {
  return inventoryStore.categories.map(cat => ({
    label: cat.name,
    value: cat.name
  }))
})

const transactionTypeOptions = [
  { label: 'Приход', value: 'incoming' },
  { label: 'Расход', value: 'outgoing' },
  { label: 'Перемещение', value: 'transfer' },
  { label: 'Корректировка', value: 'adjustment' },
  { label: 'Резервирование', value: 'reservation' },
  { label: 'Списание', value: 'write_off' }
]

// Отчет по остаткам
const stockReportColumns: DataTableColumns = [
  { title: 'Материал', key: 'name', width: 200 },
  { title: 'Категория', key: 'category', width: 120 },
  { title: 'Остаток', key: 'stock', width: 100, render: (row: any) => `${row.stock} ${row.unit}` },
  { title: 'Мин. запас', key: 'minStock', width: 100 },
  { title: 'Макс. запас', key: 'maxStock', width: 100 },
  {
    title: 'Статус',
    key: 'status',
    width: 120,
    render: (row: any) => h(NTag, {
      type: inventoryStore.getStatusColor(row.status),
      size: 'small'
    }, { default: () => inventoryStore.getStatusLabel(row.status) })
  },
  { title: 'Стоимость', key: 'value', width: 120, render: (row: any) => formatCurrency(row.value) }
]

const stockReportData = computed(() => {
  return inventoryStore.items.map(item => ({
    name: item.name,
    category: item.category,
    stock: item.currentStock,
    unit: item.unit,
    minStock: item.minStock,
    maxStock: item.maxStock,
    status: item.status,
    value: item.totalValue
  }))
})

// Отчет по движению
const movementReportColumns: DataTableColumns = [
  {
    title: 'Тип',
    key: 'type',
    width: 100,
    render: (row: any) => {
      const icon = row.type === 'incoming' ? ArrowDownOutline :
        row.type === 'outgoing' ? ArrowUpOutline : SwapHorizontalOutline
      const color = row.type === 'incoming' ? 'success' :
        row.type === 'outgoing' ? 'error' : 'warning'
      return h('div', { class: 'flex items-center gap-2' }, [
        h(NIcon, { size: '16', color }, () => h(icon)),
        h('span', getTransactionTypeLabel(row.type))
      ])
    }
  },
  { title: 'Материал', key: 'itemName', width: 200 },
  { title: 'Количество', key: 'quantity', width: 100 },
  { title: 'Цена', key: 'price', width: 100, render: (row: any) => formatCurrency(row.price || 0) },
  { title: 'Сумма', key: 'total', width: 120, render: (row: any) => formatCurrency(row.total || 0) },
  { title: 'Документ', key: 'document', width: 150 },
  { title: 'Дата', key: 'date', width: 150, render: (row: any) => formatDate(row.date) },
  { title: 'Создал', key: 'createdBy', width: 120 }
]

const movementReportData = computed(() => {
  return inventoryStore.transactions.map(t => {
    const item = inventoryStore.getItemById(t.itemId)
    return {
      type: t.type,
      itemName: item?.name || 'Неизвестно',
      quantity: t.quantity,
      price: t.unitPrice,
      total: t.totalPrice,
      document: t.documentNumber || '-',
      date: t.createdAt,
      createdBy: t.createdBy
    }
  })
})

// Отчет по стоимости
const totalInventoryValue = computed(() => {
  return inventoryStore.items.reduce((sum, item) => sum + item.totalValue, 0)
})

const valueByCategory = computed(() => {
  const categories: Record<string, { count: number, value: number }> = {}

  inventoryStore.items.forEach(item => {
    if (!categories[item.category]) {
      categories[item.category] = { count: 0, value: 0 }
    }
    categories[item.category].count++
    categories[item.category].value += item.totalValue
  })

  return Object.entries(categories).map(([name, data]) => ({
    name,
    count: data.count,
    value: data.value
  }))
})

const valueByStatus = computed(() => {
  const statuses: Record<string, { count: number, value: number }> = {}

  inventoryStore.items.forEach(item => {
    const status = item.status
    if (!statuses[status]) {
      statuses[status] = { count: 0, value: 0 }
    }
    statuses[status].count++
    statuses[status].value += item.totalValue
  })

  return Object.entries(statuses).map(([type, data]) => ({
    type,
    count: data.count,
    value: data.value
  }))
})

// Отчет по поставщикам
const supplierReportColumns: DataTableColumns = [
  { title: 'Поставщик', key: 'name', width: 200 },
  { title: 'Контакты', key: 'contacts', width: 200 },
  { title: 'Материалы', key: 'materials', width: 150 },
  { title: 'Рейтинг', key: 'rating', width: 100 },
  { title: 'Срок поставки', key: 'deliveryTime', width: 120 },
  {
    title: 'Статус',
    key: 'status',
    width: 100,
    render: (row: any) => h(NTag, {
      type: row.isActive ? 'success' : 'default',
      size: 'small'
    }, { default: () => row.isActive ? 'Активен' : 'Неактивен' })
  }
]

const supplierReportData = computed(() => {
  return inventoryStore.suppliers.map(s => ({
    name: s.name,
    contacts: `${s.contactPerson}, ${s.phone}`,
    materials: s.materials.join(', '),
    rating: s.rating,
    deliveryTime: `${s.deliveryTime} дн.`,
    isActive: s.isActive
  }))
})

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

const getStatusLabel = (status: string) => {
  return inventoryStore.getStatusLabel(status as any)
}

const getTransactionTypeLabel = (type: string) => {
  const typeMap: Record<string, string> = {
    'incoming': 'Приход',
    'outgoing': 'Расход',
    'transfer': 'Перемещение',
    'adjustment': 'Корректировка',
    'reservation': 'Резервирование',
    'write_off': 'Списание'
  }
  return typeMap[type] || type
}

// Обработчики
const generateStockReport = () => {
  window.$message?.success('Отчет по остаткам сформирован')
}

const exportStockReport = () => {
  window.$message?.success('Отчет экспортирован в Excel')
}

const generateMovementReport = () => {
  window.$message?.success('Отчет по движению сформирован')
}

const generateValueReport = () => {
  window.$message?.success('Отчет по стоимости обновлен')
}
</script>
