<template>
  <n-modal v-model:show="showModal" preset="card" title="Отчеты по складу" class="w-225!" :bordered="false"
    size="huge">
    <n-tabs type="line" animated>
      <!-- Отчет по остаткам -->
      <n-tab-pane name="stock" tab="Остатки">
        <n-card title="Отчет по остаткам материалов" class="mb-4">
          <n-space vertical>
            <div class="flex gap-4 mb-4">
              <n-date-picker v-model:value="reportParams.stock.dateRange" type="daterange" clearable
                placeholder="Период" class="w-75" />
              <n-select v-model:value="reportParams.stock.category" placeholder="Категория" :options="categoryOptions"
                clearable class="w-50" />
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
                placeholder="Период" class="w-75" />
              <n-select v-model:value="reportParams.movement.type" placeholder="Тип операции"
                :options="transactionTypeOptions" clearable class="w-50" />
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

      <!-- Накладные и документы -->
      <n-tab-pane name="shipments" tab="Накладные и документы">
        <n-card title="Производственная активность и отгрузки" class="mb-4">
          <n-space vertical>
            <div class="flex gap-4 mb-4">
              <n-date-picker v-model:value="reportParams.shipments.dateRange" type="daterange" clearable
                placeholder="Период" class="w-75" />
              <n-button type="primary" @click="generateShipmentReport">
                <template #icon>
                  <n-icon>
                    <RefreshOutline />
                  </n-icon>
                </template>
                Обновить
              </n-button>
            </div>

            <n-data-table 
              :columns="orderShipmentColumns" 
              :data="orderShipmentData" 
              :pagination="{ pageSize: 10 }"
              v-model:expanded-row-keys="expandedRowKeys"
              striped 
            />
          </n-space>
        </n-card>
      </n-tab-pane>
    </n-tabs>

    <div class="flex justify-end gap-3 mt-6">
      <n-button @click="showModal = false">Закрыть</n-button>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { reactive, computed, h, ref } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { useOrdersStore } from '@/stores/orders'
import { useShipmentsStore } from '@/stores/shipments'
import type { InventoryItem, Order, OrderShipment } from '@/types'
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
  NTag,
  NEmpty,
  useMessage
} from 'naive-ui'
import {
  RefreshOutline,
  DownloadOutline,
  ArrowDownOutline,
  ArrowUpOutline,
  SwapHorizontalOutline
} from '@vicons/ionicons5'

interface StockReportRow {
  name: string
  category: string
  stock: number
  unit: string
  minStock: number
  maxStock: number
  status: InventoryItem['status']
  value: number
}

interface MovementReportRow {
  type: string
  itemName: string
  quantity: number
  price: number
  total: number
  document: string
  date: Date
  createdBy: string
}

interface SupplierReportRow {
  name: string
  contacts: string
  materials: string
  rating: number
  deliveryTime: string
  isActive: boolean
}

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

const inventoryStore = useInventoryStore()
const ordersStore = useOrdersStore()
const shipmentsStore = useShipmentsStore()
const message = useMessage()

const showModal = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})

// Состояние развернутых строк
const expandedRowKeys = ref<string[]>([])

// Параметры отчетов
const reportParams = reactive({
  stock: {
    dateRange: null as [number, number] | null,
    category: null as string | null
  },
  movement: {
    dateRange: null as [number, number] | null,
    type: null as string | null
  },
  shipments: {
    dateRange: null as [number, number] | null
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

// Отчет по поставкам и накладным
const orderShipmentColumns: DataTableColumns<Order> = [
  {
    type: 'expand',
    renderExpand: (row) => {
      const shipments = shipmentsStore.shipments.filter(s => s.orderId === row.id)
      if (shipments.length === 0) return h(NEmpty, { description: 'Накладные отсутствуют' })
      
      return h(NDataTable, {
        size: 'small',
        columns: [
          { title: '№ Накладной', key: 'shipmentNumber', width: 150 },
          { title: 'Дата', key: 'createdAt', width: 150, render: (s) => (s as OrderShipment).createdAt ? formatDate(new Date((s as OrderShipment).createdAt)) : '-' },
          { title: 'Статус', key: 'status', width: 120, render: (s) => h(NTag, { size: 'small', type: (s as OrderShipment).status === 'completed' ? 'success' : 'warning' }, { default: () => (s as OrderShipment).status === 'completed' ? 'Отгружена' : 'В процессе' }) },
          { title: 'Пункт назначения', key: 'destination', width: 200 },
          { title: 'Водитель', key: 'driverName', width: 150 }
        ],
        data: shipments
      })
    }
  },
  { title: '№ Заказа', key: 'orderNumber', width: 120 },
  { title: 'Клиент', key: 'customerName', width: 200 },
  { 
    title: 'Статус', 
    key: 'status', 
    width: 150,
    render: (row) => h(NTag, { 
      type: row.status === 'ready' ? 'success' : row.status === 'shipped' ? 'info' : 'warning',
      size: 'small' 
    }, { default: () => getOrderStatusLabel(row.status) })
  },
  { title: 'Срок', key: 'deadline', width: 120, render: (row) => row.deadline ? formatDate(new Date(row.deadline)) : '-' },
  {
    title: 'Прогресс',
    key: 'progress',
    render: (row) => {
      const items = row.items || []
      const total = items.length
      const ready = items.filter(i => (i.actualQuantity || 0) >= (i.plannedQuantity || 1)).length
      return h('div', { class: 'flex items-center gap-2' }, [
        h('span', `${ready}/${total}`),
        h(NTag, { size: 'tiny', disabled: total === 0 }, { default: () => `${total > 0 ? Math.round((ready/total)*100) : 0}%` })
      ])
    }
  }
]

const orderShipmentData = computed(() => {
  let filtered = ordersStore.orders
  if (reportParams.shipments.dateRange) {
    const [start, end] = reportParams.shipments.dateRange
    filtered = filtered.filter(o => {
      const date = new Date(o.createdAt).getTime()
      return date >= start && date <= end
    })
  }
  return filtered
})

const getOrderStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    'new': 'Новый',
    'in_progress': 'В работе',
    'ready': 'Готов',
    'shipped': 'Отгружен',
    'cancelled': 'Отменен'
  }
  return map[status] || status
}

const generateShipmentReport = () => {
  message.success('Данные по накладным обновлены')
}

// Отчет по остаткам
const stockReportColumns: DataTableColumns<StockReportRow> = [
  { title: 'Материал', key: 'name', width: 200 },
  { title: 'Категория', key: 'category', width: 120 },
  { title: 'Остаток', key: 'stock', width: 100, render: (row) => `${row.stock} ${row.unit}` },
  { title: 'Мин. запас', key: 'minStock', width: 100 },
  { title: 'Макс. запас', key: 'maxStock', width: 100 },
  {
    title: 'Статус',
    key: 'status',
    width: 120,
    render: (row) => h(NTag, {
      type: inventoryStore.getStatusColor(row.status),
      size: 'small'
    }, { default: () => inventoryStore.getStatusLabel(row.status) })
  },
  { title: 'Стоимость', key: 'value', width: 120, render: (row) => formatCurrency(row.value) }
]

const stockReportData = computed<StockReportRow[]>(() => {
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
const movementReportColumns: DataTableColumns<MovementReportRow> = [
  {
    title: 'Тип',
    key: 'type',
    width: 100,
    render: (row) => {
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
  { title: 'Цена', key: 'price', width: 100, render: (row) => formatCurrency(row.price || 0) },
  { title: 'Сумма', key: 'total', width: 120, render: (row) => formatCurrency(row.total || 0) },
  { title: 'Документ', key: 'document', width: 150 },
  { title: 'Дата', key: 'date', width: 150, render: (row) => formatDate(row.date) },
  { title: 'Создал', key: 'createdBy', width: 120 }
]

const movementReportData = computed<MovementReportRow[]>(() => {
  return inventoryStore.transactions.map(t => {
    const item = inventoryStore.getItemById(t.itemId)
    return {
      type: t.type,
      itemName: item?.name || 'Неизвестно',
      quantity: t.quantity,
      price: t.unitPrice || 0,
      total: t.totalPrice || 0,
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
      const cat = categories[item.category]!
      cat.count++
      cat.value += item.totalValue
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
    type: type as InventoryItem['status'],
    count: data.count,
    value: data.value
  }))
})

// Отчет по поставщикам
const supplierReportColumns: DataTableColumns<SupplierReportRow> = [
  { title: 'Поставщик', key: 'name', width: 200 },
  { title: 'Контакты', key: 'contacts', width: 200 },
  { title: 'Материалы', key: 'materials', width: 150 },
  { title: 'Рейтинг', key: 'rating', width: 100 },
  { title: 'Срок поставки', key: 'deliveryTime', width: 120 },
  {
    title: 'Статус',
    key: 'status',
    width: 100,
    render: (row) => h(NTag, {
      type: row.isActive ? 'success' : 'default',
      size: 'small'
    }, { default: () => row.isActive ? 'Активен' : 'Неактивен' })
  }
]

const supplierReportData = computed<SupplierReportRow[]>(() => {
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

const getStatusLabel = (status: InventoryItem['status']) => {
  return inventoryStore.getStatusLabel(status)
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
  message.success('Отчет по остаткам сформирован')
}

const exportStockReport = () => {
  message.success('Отчет экспортирован в Excel')
}

const generateMovementReport = () => {
  message.success('Отчет по движению сформирован')
}

const generateValueReport = () => {
  message.success('Отчет по стоимости обновлен')
}
</script>
