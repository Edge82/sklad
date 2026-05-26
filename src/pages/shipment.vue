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
          <n-h1 class="m-0">{{ selectedInvoice ? 'Детали накладной' : 'Движение материалов' }}</n-h1>
          <n-text depth="3">
            {{ selectedInvoice ? `Накладная #${selectedInvoice.id.slice(-6).toUpperCase()}` : 'История приёма на склад и последующей отгрузки готовой продукции' }}
          </n-text>
        </div>
      </div>
    </div>

    <!-- Резюме (Статистика в стиле Inventory.vue) -->
    <n-grid v-if="!selectedInvoice" :cols="4" :x-gap="12" :y-gap="12" class="mb-6 items-stretch py-2">
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
        <n-card border-variant="dark" class="metric-card revenue-card h-full flex flex-col justify-center" size="small">
          <div class="flex items-center gap-3 py-1">
            <n-icon size="28" color="#18a058" :component="AnalyticsOutline" />
            <div>
              <n-text depth="3" class="revenue-label block mb-1">Сумма накладных</n-text>
              <n-h3 class="m-0 leading-none revenue-value text-[22px]">{{ userStore.canSeePrices ? totalRevenue.toLocaleString() + ' ₽' : '-' }}</n-h3>
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
              <th class="text-right">Сумма</th>
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
              <td class="text-right">
                <n-text type="success" strong>{{ userStore.canSeePrices ? ((item.price || 0) * item.quantity).toLocaleString() + ' ₽' : '-' }}</n-text>
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
import { ref, computed, h, onMounted } from 'vue'
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

interface InvoiceWithWorker extends Omit<MaterialInvoice, 'date'> {
  date: string | Date
  workerName: string
  workerId: string
  operationLabel: string
  movementType: 'receipt' | 'shipment'
  movementCount: number
  shipmentOrders?: string[]
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

const destinationOptions = [
  { label: 'Все направления', value: 'all' },
  { label: 'Готовая продукция', value: 'Готовая продукция' },
  { label: 'Клиент', value: 'Клиент' }
]

const pagination = {
  pageSize: 15
}

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
      workerName: employee?.name || history.createdBy || 'Неизвестно',
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
      workerName: shipment.userName || 'System',
      workerId: 'unknown',
      operationLabel: 'Отгружен клиенту',
      movementType: 'shipment',
      movementCount: shipment.count,
      shipmentOrders: shipment.orders
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

  return {
    production: warehouseReceipts.length,
    client: allInvoices.value.filter(inv => inv.movementType === 'shipment').length
  }
})

// Расчет общей суммы отфильтрованных накладных (Итого по таблице)
const totalRevenue = computed(() => {
  return filteredInvoices.value
    .reduce((sum, inv) => {
      return sum + (Number(inv.totalAmount) || 0)
    }, 0)
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

// Load invoices from API on mount
onMounted(async () => {
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
          h('div', { class: 'space-y-2' }, [
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
                h('th', { class: 'text-right' }, { default: () => 'Количество' }),
                h('th', { class: 'text-right' }, { default: () => 'Сумма' })
              ])
            ]),
            h('tbody', items.map(item => h('tr', [
              h('td', item.article || '—'),
              h('td', item.productName),
              h('td', { class: 'text-right' }, userStore.canSeePrices ? (item.price || 0).toLocaleString() + ' ₽' : '-'),
              h('td', { class: 'text-right' }, `${item.quantity} ${item.unit}`),
              h('td', { class: 'text-right font-bold text-green-500' }, userStore.canSeePrices ? ((item.price || 0) * item.quantity).toLocaleString() + ' ₽' : '-')
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
  },
  {
    title: 'Сумма',
    key: 'totalAmount',
    render: (row) => {
      const amount = row.totalAmount || row.items.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0)
      return h(NText, { type: 'success', strong: true }, { default: () => userStore.canSeePrices ? amount.toLocaleString() + ' ₽' : '-' })
    }
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

.revenue-value {
  color: #18a058 !important;
  font-weight: 900 !important;
}
</style>
