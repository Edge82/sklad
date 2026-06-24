<template>
  <div class="shipment-page p-6">
    <!-- Заголовок и пояснение -->
    <div class="flex justify-between items-center mb-6">
      <div class="flex items-center gap-4">
        <n-button v-if="selectedInvoice" quaternary circle @click="selectedInvoice = null">
          <template #icon>
            <n-icon size="24"><ArrowBackOutline /></n-icon>
          </template>
        </n-button>
        <div>
          <n-h1 class="m-0">{{ selectedInvoice ? 'Детали накладной' : 'Операции пользователей' }}</n-h1>
          <n-text depth="3">
            {{ selectedInvoice ? `Накладная #${selectedInvoice.id.slice(-6).toUpperCase()}` : 'История приёма на склад и последующей отгрузки готовой продукции' }}
          </n-text>
        </div>
      </div>
    </div>

    <!-- Резюме (Статистика в стиле Inventory.vue) -->
    <n-grid v-if="!selectedInvoice" :cols="5" :x-gap="12" :y-gap="12" class="mb-6 items-stretch py-2">
      <n-gi>
        <n-card
          size="small"
          hoverable
          class="metric-card h-full flex flex-col justify-center"
          :class="{ 'active': filterDestination === 'all' }"
          @click="filterDestination = 'all'"
        >
          <div class="flex items-center gap-3 py-1">
            <n-icon size="28" color="#2080f0">
              <DocumentTextOutline />
            </n-icon>
            <div>
              <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Всего операций</n-text>
              <n-h3 class="m-0 leading-none">{{ allInvoices.length }}</n-h3>
            </div>
          </div>
        </n-card>
      </n-gi>

      <n-gi>
        <n-card
          size="small"
          hoverable
          class="metric-card h-full flex flex-col justify-center"
          :class="{ 'active': filterDestination === 'Клиент' }"
          @click="filterDestination = 'Клиент'"
        >
          <div class="flex items-center gap-3 py-1">
            <n-icon size="28" color="#18a058">
              <CarOutline />
            </n-icon>
            <div>
              <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Отгружено клиентам</n-text>
              <n-h3 class="m-0 leading-none">{{ statsByType.client }}</n-h3>
            </div>
          </div>
        </n-card>
      </n-gi>

      <n-gi>
        <n-card
          size="small"
          hoverable
          class="metric-card h-full flex flex-col justify-center"
          :class="{ 'active': filterDestination === 'Готовая продукция' }"
          @click="filterDestination = 'Готовая продукция'"
        >
          <div class="flex items-center gap-3 py-1">
            <n-icon size="28" color="#2080f0">
              <BusinessOutline />
            </n-icon>
            <div>
              <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Товар на складе готовой продукции</n-text>
              <n-h3 class="m-0 leading-none">{{ statsByType.production }}</n-h3>
            </div>
          </div>
        </n-card>
      </n-gi>

      <n-gi>
        <n-card
          size="small"
          hoverable
          class="metric-card h-full flex flex-col justify-center"
          :class="{ 'active': filterDestination === 'Перемещение' }"
          @click="filterDestination = 'Перемещение'"
        >
          <div class="flex items-center gap-3 py-1">
            <n-icon size="28" color="#f0a020">
              <AnalyticsOutline />
            </n-icon>
            <div>
              <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Перемещение</n-text>
            <n-h3 class="m-0 leading-none">{{ statsByType.transfers }}</n-h3>
          </div>
        </div>
      </n-card>
    </n-gi>

    <n-gi>
      <n-card
        size="small"
        hoverable
        class="metric-card h-full flex flex-col justify-center"
        :class="{ 'active': filterDestination === 'Инструмент' }"
        @click="filterDestination = 'Инструмент'"
      >
        <div class="flex items-center gap-3 py-1">
          <n-icon size="28" color="#8a8a8a">
            <BusinessOutline />
          </n-icon>
          <div>
            <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Инструменты</n-text>
            <n-h3 class="m-0 leading-none">{{ statsByType.tools }}</n-h3>
          </div>
        </div>
      </n-card>
    </n-gi>
    </n-grid>

    <n-card v-if="!selectedInvoice" class="mb-4" size="small">
      <n-space align="center" :size="[16, 12]">
        <n-select
          v-model:value="filterDestination"
          :options="destinationOptions"
          class="w-56!"
          placeholder="Все направления"
          clearable
        />

        <n-input
          v-model:value="searchQuery"
          placeholder="Поиск по заказу, товару или сотруднику..."
          class="w-96!"
          clearable
        >
          <template #prefix>
            <n-icon><SearchOutline /></n-icon>
          </template>
        </n-input>

        <n-button @click="() => { filterDestination = 'all'; searchQuery = ''; }" quaternary type="warning">
          Сбросить
        </n-button>
      </n-space>
    </n-card>

    <n-card bordered class="table-card shadow-sm" style="margin-top: 24px;">
      <div v-if="!selectedInvoice">
        <div class="flex justify-between items-center mb-4">
          <n-text depth="3">Всего: {{ filteredInvoices.length }}</n-text>
          <div class="flex items-center gap-2">
            <n-text>Показывать:</n-text>
            <n-select v-model:value="itemsPerPage" :options="pageSizeOptions" class="w-24!" />
          </div>
        </div>
        <n-data-table
          :columns="columns"
          :data="filteredInvoices"
          :pagination="pagination"
          :row-key="(row: any) => row.id"
          v-model:expanded-row-keys="expandedKeys"
          :row-props="rowProps"
        />
      </div>

      <div v-else class="invoice-details-view">
        <n-descriptions bordered label-placement="left" :column="2" class="mb-8">
          <n-descriptions-item label="Номер заказа">
            <n-tag type="primary" strong>{{ selectedInvoice.orderNumber || 'Без привязки' }}</n-tag>
          </n-descriptions-item>
          <n-descriptions-item label="Дата и время">
            {{ new Date(selectedInvoice.date).toLocaleString() }}
          </n-descriptions-item>
          <n-descriptions-item label="Сотрудник">
            {{ selectedInvoice.workerName }}
          </n-descriptions-item>
          <n-descriptions-item label="ID Операции">
             <n-text depth="3">{{ selectedInvoice.id }}</n-text>
          </n-descriptions-item>
        </n-descriptions>

        <n-h3>Список позиций</n-h3>
        <n-table :single-line="false" size="medium">
          <thead>
            <tr>
              <th>Артикул</th>
              <th>Наименование</th>
              <th class="text-right">Цена</th>
              <th class="text-right">Количество</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in selectedInvoice.items" :key="idx">
              <td><n-text depth="3">{{ item.article ?? '—' }}</n-text></td>
              <td><n-text strong>{{ item.productName }}</n-text></td>
              <td class="text-right">{{ userStore.canSeePrices ? (item.price || 0).toLocaleString() + ' ₽' : '-' }}</td>
              <td class="text-right">
                <n-text depth="2" strong>{{ item.quantity }} {{ item.unit }}</n-text>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th colspan="4" class="text-right">Итого к списанию:</th>
              <th class="text-right">
                <n-text type="success" strong class="text-[1.1em]">
                  {{ userStore.canSeePrices ? (selectedInvoice.totalAmount || selectedInvoice.items.reduce((sum: number, i: any) => sum + (i.price || 0) * i.quantity, 0)).toLocaleString() + ' ₽' : '-' }}
                </n-text>
              </th>
            </tr>
          </tfoot>
        </n-table>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, onMounted, onActivated, watch } from 'vue'
import {
  NText, NCard, NDataTable, NButton, NIcon, NSpace, NInput,
  NDescriptions, NDescriptionsItem, NTag,
  NTable, NH3, NSelect, NGrid, NGi, NH1
} from 'naive-ui'
import {
  SearchOutline,
  DocumentTextOutline,
  ArrowBackOutline,
  CarOutline,
  BusinessOutline,
  AnalyticsOutline
} from '@vicons/ionicons5'
import { useEmployeesStore } from '@/stores/employees'
import { useShipmentsStore } from '@/stores/shipments'
import { useUserStore } from '@/stores/user'
import type { MaterialInvoice, MaterialInvoiceItem } from '@/types'
import type { DataTableColumns } from 'naive-ui'

const employeesStore = useEmployeesStore()
const shipmentsStore = useShipmentsStore()
const userStore = useUserStore()
const searchQuery = ref('')
const filterDestination = ref('all')

watch([searchQuery, filterDestination], () => {
  currentPage.value = 1
})

interface InvoiceWithWorker extends Omit<MaterialInvoice, 'date'> {
  date: string | Date
  workerName: string
  workerId: string
  operationLabel: string
  movementType: 'receipt' | 'shipment' | 'transfer' | 'tool'
  movementCount: number
  shipmentOrders?: string[]
  createdAt?: string
  updatedAt?: string
}

const selectedInvoice = ref<InvoiceWithWorker | null>(null)
const expandedKeys = ref<string[]>([])
const shipmentHistory = ref<Array<{
  id: string
  date: string
  userName: string
  count: number
  orders: string[]
}>>([])

const transferOrders = ref<Array<{
  ref_key: string
  order_number: string
  date: string
  source_warehouse_name: string
  destination_warehouse_name: string
  customer_order_number: string
  posted: number
  items: string
  selected_product: string
  created_by: string
}>>([])

const toolOperations = ref<Array<{
  id: string
  tool_id: string
  tool_name: string
  inventory_number: string
  employee_id: string
  action: string
  date: string
  employee_name: string
  created_at: string
}>>([])

const resolveWorkerName = (createdBy: string) => {
  if (!createdBy || createdBy === '—') return '—'
  if (createdBy === 'Неизвестно' || createdBy === 'System') return '—'
  const emp = employeesStore.employees.find(e => e.id === createdBy || e.name === createdBy || String(e.user_id) === createdBy)
  if (emp) return emp.name
  return createdBy
}

const destinationOptions = [
  { label: 'Все направления', value: 'all' },
  { label: 'Готовая продукция', value: 'Готовая продукция' },
  { label: 'Клиент', value: 'Клиент' },
  { label: 'Перемещение', value: 'Перемещение' },
  { label: 'Инструмент', value: 'Инструмент' }
]

const currentPage = ref(1)
const itemsPerPage = ref(15)

const pageSizeOptions = [
  { label: '10', value: 10 },
  { label: '25', value: 25 },
  { label: '50', value: 50 },
  { label: '100', value: 100 }
]

const pagination = computed(() => ({
  pageSize: itemsPerPage.value,
  page: currentPage.value,
  pageCount: Math.ceil(filteredInvoices.value.length / itemsPerPage.value),
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

// Собираем все накладные
const allInvoices = computed(() => {
  const invoices: InvoiceWithWorker[] = []

  shipmentsStore.materialInvoices.forEach((history: MaterialInvoice) => {
    const employee = employeesStore.employees.find(emp => emp.id === history.employeeId)
    const operationLabel = history.destination === 'Готовая продукция'
      ? 'Поступил на склад'
      : (history.destination === 'Клиент' ? 'Отгружен клиенту' : (history.destination || 'Операция'))
    invoices.push({
      ...history,
      workerName: (history as any).employeeName || employee?.name || history.createdBy || 'Неизвестно',
      workerId: employee?.id || history.employeeId || 'unknown',
      operationLabel,
      movementType: 'receipt',
      movementCount: history.items?.length || 0
    })
  })

  shipmentHistory.value.forEach(shipment => {
    invoices.push({
      id: shipment.id,
      employeeId: '',
      date: shipment.date,
      orderNumber: shipment.orders.join(', ') || 'Без номера',
      destination: 'Клиент',
      totalAmount: 0,
      items: [],
      createdAt: shipment.date,
      updatedAt: shipment.date,
      createdBy: shipment.userName,
      workerName: shipment.userName || 'Неизвестно',
      workerId: 'unknown',
      operationLabel: 'Отгружен клиенту',
      movementType: 'shipment',
      movementCount: shipment.count,
      shipmentOrders: shipment.orders
    })
  })

  transferOrders.value.forEach(order => {
    let items: MaterialInvoiceItem[] = []
    try {
      const parsed = JSON.parse(order.items)
      if (Array.isArray(parsed)) {
        items = parsed.map((i: any) => ({
          productName: i.productName || '',
          quantity: Number(i.quantity) || 0,
          unit: i.unit || 'шт',
          article: i.barcode || '',
          price: Number(i.price) || 0,
        }))
      }
    } catch { /* ignore */ }
    if (items.length === 0) return
    const totalAmount = items.reduce((sum, i) => sum + (i.price || 0) * (i.quantity || 0), 0)
    invoices.push({
      id: order.ref_key,
      employeeId: '',
      date: order.date,
      orderNumber: order.order_number,
      destination: 'Перемещение',
      totalAmount,
      items,
      createdAt: order.date,
      updatedAt: order.date,
      createdBy: order.created_by || '—',
      workerName: resolveWorkerName(order.created_by),
      workerId: 'system',
      operationLabel: 'Перемещение между складами',
      movementType: 'transfer',
      movementCount: items.length
    })
  })

  toolOperations.value.forEach(op => {
    const actionLabels: Record<string, string> = {
      issued: 'Выдан инструмент',
      returned: 'Возврат инструмента',
      created: 'Создание инструмента',
      material_created: 'Вывод материала',
      qr_codes_generated: 'Генерация QR-кодов'
    }
    const label = actionLabels[op.action] || op.action || 'Операция'
    const destination = op.action === 'qr_codes_generated' ? 'QR-коды' : (op.action === 'material_created' ? 'Материал' : 'Инструмент')
    invoices.push({
      id: op.id,
      employeeId: op.employee_id,
      date: op.date,
      orderNumber: op.action === 'qr_codes_generated' ? (op.inventory_number || 'Без номера') : `${op.tool_name} (${op.inventory_number})`,
      destination,
      totalAmount: 0,
      items: [{
        productName: op.tool_name,
        quantity: 1,
        unit: 'шт',
        article: op.inventory_number,
        price: Number(op.price) || 0,
      }],
      createdAt: op.created_at,
      updatedAt: op.created_at,
      createdBy: op.employee_name,
      workerName: resolveWorkerName(op.employee_name),
      workerId: op.employee_id,
      operationLabel: label,
      movementType: 'tool',
      movementCount: 1
    })
  })

  // Сортируем по дате (сначала новые)
  return invoices.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0
    const dateB = b.date ? new Date(b.date).getTime() : 0
    return dateB - dateA
  })
})

// Обработка клика по строке - теперь только сворачивание/разворачивание
const rowProps = (row: InvoiceWithWorker) => {
  return {
    style: 'cursor: pointer',
    onClick: () => {
      const index = expandedKeys.value.indexOf(row.id)
      if (index > -1) {
        expandedKeys.value.splice(index, 1)
      } else {
        expandedKeys.value.push(row.id)
      }
    }
  }
}

// Статистика по типам
const statsByType = computed(() => {
  const warehouseReceipts = allInvoices.value.filter(inv =>
    inv.movementType === 'receipt' && inv.destination === 'Готовая продукция'
  )
  const transfers = allInvoices.value.filter(inv => inv.movementType === 'transfer')
  const tools = allInvoices.value.filter(inv => inv.movementType === 'tool')

  return {
    production: warehouseReceipts.length,
    client: allInvoices.value.filter(inv => inv.movementType === 'shipment').length,
    transfers: transfers.length,
    tools: tools.length
  }
})

const filteredInvoices = computed(() => {
  let list = allInvoices.value

  if (filterDestination.value !== 'all') {
    list = list.filter(inv => inv.destination === filterDestination.value)
  }

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(inv =>
      inv.orderNumber.toLowerCase().includes(q) ||
      inv.workerName.toLowerCase().includes(q) ||
      inv.items.some((i: MaterialInvoiceItem) => i.productName.toLowerCase().includes(q) || (i.article && i.article.toLowerCase().includes(q)))
    )
  }
  return list
})

const loadAllData = async () => {
  if (employeesStore.employees.length === 0) {
    await employeesStore.loadEmployeesFromApi()
  }

  if (shipmentsStore.materialInvoices.length === 0) {
    await shipmentsStore.loadInvoicesFromApi()
  }

  try {
    const response = await fetch('/sklad/api/shipments/history')
    if (response.ok) {
      const data = await response.json()
      shipmentHistory.value = data.shipments || []
    }
  } catch (err) {
    console.error('Error loading shipment history:', err)
  }

  try {
    const response = await fetch('/sklad/api/transfer-orders')
    if (response.ok) {
      const data = await response.json()
      transferOrders.value = data.orders || []
    }
  } catch (err) {
    console.error('Error loading transfer orders:', err)
  }

  try {
    const response = await fetch('/sklad/api/tool-operations')
    if (response.ok) {
      const data = await response.json()
      toolOperations.value = data.operations || []
    }
  } catch (err) {
    console.error('Error loading tool operations:', err)
  }
}

onMounted(() => {
  loadAllData()
})

onActivated(() => {
  loadAllData()
})

const columns: DataTableColumns<InvoiceWithWorker> = [
  {
    type: 'expand',
    expandable: () => true,
    renderExpand: (row) => {
      const items = row.items || []
      if (row.movementType === 'shipment') {
        return h('div', { class: 'p-4 bg-[rgba(255,255,255,0.02)] border-t border-gray-800' }, [
          h(NH3, { class: 'mb-4' }, { default: () => 'Состав отгрузки' }),
          h('div', { class: 'flex flex-col gap-1' }, [
            h(NText, { depth: 3 }, { default: () => `Отгружено QR-кодов: ${row.movementCount}` }),
            h(NText, { depth: 3 }, { default: () => `Заказы: ${(row.shipmentOrders || []).join(', ') || '—'}` })
          ])
        ])
      }

      return h('div', { class: 'p-4 bg-[rgba(255,255,255,0.02)] border-t border-gray-800' }, [
        h(NH3, { class: 'mb-4' }, { default: () => 'Состав накладной' }),
        h(NTable, { singleLine: false, size: 'small', striped: true }, {
          default: () => [
            h('thead', [
              h('tr', [
                h('th', 'Артикул'),
                h('th', 'Наименование'),
                h('th', { class: 'text-right' }, { default: () => 'Цена' }),
                h('th', { class: 'text-right' }, { default: () => 'Количество' })
              ])
            ]),
            h('tbody', items.map(item => h('tr', [
              h('td', item.article || '—'),
              h('td', item.productName),
              h('td', { class: 'text-right' }, userStore.canSeePrices ? (item.price || 0).toLocaleString() + ' ₽' : '-'),
              h('td', { class: 'text-right' }, `${item.quantity} ${item.unit}`)
            ])))
          ]
        })
      ])
    }
  },
  {
    title: 'Дата и время',
    key: 'date',
    render: (row) => new Date(row.date).toLocaleString(),
    sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  },
  {
    title: 'Назначение',
    key: 'destination',
    render: (row) => {
      const isClient = row.destination === 'Клиент'
      return h(NTag, {
        type: isClient ? 'success' : 'info',
        bordered: false,
        round: true
      }, {
        default: () => row.destination || 'Производство',
        icon: () => h(NIcon, null, { default: () => isClient ? h(CarOutline) : h(BusinessOutline) })
      })
    }
  },
  {
    title: 'Операция',
    key: 'operationLabel',
    width: 180,
    render: (row) => {
      const isIncoming = row.operationLabel === 'Поступил на склад'
      const isShipment = row.operationLabel.startsWith('Отгружен')
      const type: 'success' | 'warning' | 'info' = isIncoming ? 'success' : (isShipment ? 'warning' : 'info')

      return h(NTag, {
        type,
        bordered: false,
        round: true
      }, {
        default: () => row.operationLabel,
        icon: () => h(NIcon, null, { default: () => isIncoming ? h(BusinessOutline) : h(CarOutline) })
      })
    }
  },
  {
    title: 'Заказ',
    key: 'orderNumber',
    render: (row) => h(NText, { depth: 2, strong: true }, { default: () => row.orderNumber || '—' })
  },
  {
    title: 'Ответственный',
    key: 'workerName'
  },
  {
    title: 'Позиций',
    key: 'itemsCount',
    render: (row) => row.movementCount
  }
]
</script>

<style scoped>
.shipment-page {
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 24px;
}
@media (max-width: 768px) {
  .shipment-page {
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

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  background-color: #333;
}

.metric-card.active {
  background-color: #333;
  border-bottom-color: #18a058;
}
</style>
