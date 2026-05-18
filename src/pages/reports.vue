<template>
  <div class="reports-page p-6">
    <!-- Шапка страницы -->
    <div class="flex justify-between items-center mb-6">
      <div class="flex items-center gap-4">
        <div>
          <n-h1 class="mb-0">{{ pageHeader }}</n-h1>
          <n-text depth="3">{{ pageSubHeader }}</n-text>
        </div>
      </div>
    </div>
    <!-- Основной контент (переключаемый) -->
    <div class="reports-content">
        <!-- Сводка (закреплена сверху) -->
        <div class="sticky-summary">
          <n-grid :cols="5" :x-gap="12" class="mb-4 py-2">
            <!-- Метрики -->
            <n-gi v-for="metric in summaryMetrics" :key="metric.id">
              <n-card 
                size="small" 
                hoverable
                :class="['metric-card', { 'active': activeTab === metric.id }]"
                @click="activeTab = metric.id"
              >
                <div class="flex items-center gap-3 py-1">
                  <n-icon size="28" :color="metric.color">
                    <component :is="metric.icon" />
                  </n-icon>
                  <div>
                    <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">{{ metric.label }}</n-text>
                    <n-h3 class="m-0 leading-none">{{ metric.value }}</n-h3>
                  </div>
                </div>
              </n-card>
            </n-gi>
          </n-grid>
        </div>

        <!-- Контент в зависимости от вкладки -->
        <div v-if="activeTab === 'main'">
          <n-grid :cols="2" :x-gap="12" class="mb-6">
            <n-gi>
              <n-card title="Топ сотрудников (активность)">
                <n-list hoverable clickable>
                  <n-list-item v-for="emp in topEmployees" :key="emp.id" @click="openEmployeeProfile(emp)">
                    <template #prefix>
                      <n-avatar round :size="48" :src="emp.avatar" class="mr-2" />
                    </template>
                    <n-thing :title="emp.name" :description="emp.position" />
                    <template #suffix>
                      <div class="flex flex-col items-end min-w-25">
                        <span class="text-2xl font-bold leading-none text-[#2080f0]">{{ emp.operations }}</span>
                        <span class="text-[10px] text-gray-500 uppercase font-bold mt-1">операций</span>
                      </div>
                    </template>
                  </n-list-item>
                </n-list>
              </n-card>
            </n-gi>


          </n-grid>
        </div>

        <!-- Детальный отчет по заказам -->
        <div v-else-if="activeTab === 'orders'">
          <div class="mb-4 flex justify-between items-center">
            <n-h2 class="m-0">Расход материалов по заказам</n-h2>
            <n-date-picker 
              v-model:value="dateRange" 
              type="daterange" 
              clearable 
              placeholder="Период"
              class="w-65"
            />
          </div>

          <n-card border-variant="dark" class="table-card shadow-sm">
            <n-data-table 
              :columns="ordersReportColumns" 
              :data="ordersReport" 
              :row-key="(row: OrderReportEntry) => row.orderNumber"
              v-model:expanded-row-keys="expandedOrderKeys"
              :pagination="{ pageSize: 15 }"
              :row-props="(row: OrderReportEntry) => ({
                 class: 'cursor-pointer',
                 onClick: () => handleOrderReportRowClick(row)
              })"
            />
          </n-card>
          <n-empty v-if="ordersReport.length === 0" description="За выбранный период данных не найдено" class="mt-20" />
        </div>

        <!-- Детальный отчет по критическим остаткам -->
        <div v-else-if="activeTab === 'critical'">
          <n-card border-variant="dark">
            <n-data-table :columns="criticalDetailedColumns" :data="criticalItems" :pagination="{ pageSize: 20 }" />
          </n-card>
        </div>

        <!-- Детальный отчет по инструменту -->
        <div v-else-if="activeTab === 'tools'">
          <div class="mb-4 flex justify-between items-center">
            <n-h2 class="m-0">Инструмент на руках</n-h2>
            <n-input 
              v-model:value="searchToolsQuery" 
              type="text" 
              placeholder="Поиск по названию или сотруднику..."
              clearable
              class="w-65"
            />
          </div>

          <n-card border-variant="dark" class="table-card shadow-sm">
            <n-data-table :columns="toolsDetailedColumns" :data="filteredForgottenTools" :pagination="{ pageSize: 20 }" />
          </n-card>
          <n-empty v-if="filteredForgottenTools.length === 0" description="Инструменты не найдены" class="mt-20" />
        </div>

      </div>

      <!-- Модалка только для профиля сотрудника -->
      <n-modal v-model:show="showEmployeeModal" preset="card" :auto-focus="false" title="Портрет производительности мастера" class="w-225!">
        <div v-if="selectedEmployee">
          <div class="flex justify-between items-center mb-6">
            <div class="flex gap-4 items-center">
              <n-avatar :size="80" round :src="selectedEmployee.avatar" />
              <div>
                <n-h2 class="m-0">{{ selectedEmployee.name }}</n-h2>
                <n-text depth="3" class="text-lg">{{ selectedEmployee.position }}</n-text>
              </div>
            </div>
            <n-tag type="success" size="large" round>
              В штате
            </n-tag>
          </div>

          <n-grid :cols="4" :x-gap="12" class="mb-6">
            <n-gi><n-card size="small"><n-statistic label="Заказов" :value="selectedEmployeeUniqueOrders"><template #prefix><n-icon><CubeOutline /></n-icon></template></n-statistic></n-card></n-gi>
            <n-gi><n-card size="small"><n-statistic label="Операций" :value="selectedEmployeeOperations"><template #prefix><n-icon><StatsChartOutline /></n-icon></template></n-statistic></n-card></n-gi>
            <n-gi><n-card size="small"><n-statistic label="Эффективность" :value="89"><template #suffix>%</template></n-statistic></n-card></n-gi>
            <n-gi><n-card size="small"><n-statistic label="Ошибок" :value="0"><template #prefix><n-icon><WarningOutline /></n-icon></template></n-statistic></n-card></n-gi>
          </n-grid>

          <n-h3>История операций</n-h3>
          <n-data-table :columns="employeeHistoryColumns" :data="selectedEmployeeHistory" size="small" />
        </div>
      </n-modal>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, h, onMounted } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { useEmployeesStore } from '@/stores/employees'
import { useToolsStore } from '@/stores/tools'
import { useReportsStore } from '@/stores/reports'
import { 
  type InventoryItem, 
  type MaterialInvoice, 
  type MaterialInvoiceItem, 
  type Employee,
  type Tool
} from '@/types'
import {
  WarningOutline, 
  TimeOutline, StatsChartOutline, CubeOutline
} from '@vicons/ionicons5'
import {
  NIcon, NH1, NText, NGrid, NGi, NCard, NH3, 
  NDatePicker, NDataTable, NProgress, NList, NListItem,
  NThing, NAvatar, NTag, NH2, NStatistic, NTable, NEmpty, NModal,
  NSpace, NInput, type DataTableColumns
} from 'naive-ui'

const inventoryStore = useInventoryStore()
const employeesStore = useEmployeesStore()
const toolsStore = useToolsStore()
const reportsStore = useReportsStore()

const dateRange = ref<[number, number] | null>(null)
const activeTab = ref('main')
const selectedEmployee = ref<Employee | null>(null)
const showEmployeeModal = ref(false)
const expandedOrderKeys = ref<string[]>([])
const searchToolsQuery = ref('')

// Load reports on mount
onMounted(async () => {
  await Promise.all([
    reportsStore.loadAllReports(),
    toolsStore.loadToolsFromApi()
  ])
})

interface OrderReportEntry {
  orderNumber: string
  items: MaterialInvoiceItem[]
  employees: Set<string>
}

// Колонки основной таблицы отчета по заказам
const ordersReportColumns: DataTableColumns<OrderReportEntry> = [
  {
    type: 'expand',
    expandable: () => true,
    renderExpand: (row) => {
      return h('div', { class: 'p-4 bg-[rgba(255,255,255,0.02)] border-t border-gray-800' }, [
        h(NTable, { size: 'small', singleLine: false, striped: true }, {
          default: () => [
            h('thead', [
              h('tr', [
                h('th', 'Наименование'),
                h('th', 'Артикул'),
                h('th', 'Цена'),
                h('th', 'Кол-во'),
                h('th', 'Ед.'),
                h('th', 'Сумма')
              ])
            ]),
            h('tbody', row.items.map(item => h('tr', [
              h('td', item.productName),
              h('td', h(NText, { depth: 3, code: true }, { default: () => item.article || '—' })),
              h('td', `${(item.price || 0).toLocaleString('ru-RU')} ₽`),
              h('td', h(NText, { strong: true }, { default: () => item.quantity })),
              h('td', item.unit),
              h('td', h(NText, { strong: true }, { default: () => `${((item.price || 0) * item.quantity).toLocaleString('ru-RU')} ₽` }))
            ])))
          ]
        })
      ])
    }
  },
  {
    title: 'Заказ',
    key: 'orderNumber',
    render: (row: OrderReportEntry) => h(NText, { strong: true, class: 'text-lg font-mono' }, { default: () => row.orderNumber })
  },
  {
    title: 'Заказчик',
    key: 'employees',
    render: (row: OrderReportEntry) => h(NSpace, { size: 'small' }, {
      default: () => Array.from(row.employees).map(name => h(NTag, { size: 'small', round: true, quaternary: true, type: 'info' }, { default: () => name }))
    })
  },
  {
    title: 'Позиций ТМЦ',
    key: 'itemsCount',
    render: (row: OrderReportEntry) => h(NTag, { type: 'success', quaternary: true }, { default: () => `${row.items.length} наим.` })
  },
  {
    title: 'Итоговая стоимость',
    key: 'totalAmount',
    render: (row: OrderReportEntry) => {
      const total = row.items.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0)
      return h(NText, { strong: true, type: 'success', class: 'text-lg' }, { default: () => `${total.toLocaleString('ru-RU')} ₽` })
    }
  }
]

const handleOrderReportRowClick = (row: OrderReportEntry) => {
  const index = expandedOrderKeys.value.indexOf(row.orderNumber)
  if (index > -1) {
    expandedOrderKeys.value.splice(index, 1)
  } else {
    expandedOrderKeys.value.push(row.orderNumber)
  }
}

const pageHeader = computed(() => {
  switch (activeTab.value) {
    case 'orders': return 'Расход материала по заказам'
    case 'critical': return 'Критические остатки ТМЦ'
    case 'tools': return 'Инструмент на руках'
    default: return 'Отчеты и аналитика'
  }
})

const pageSubHeader = computed(() => {
  switch (activeTab.value) {
    case 'orders': return 'Детальный перечень затрат ТМЦ'
    case 'critical': return 'Список позиций, требующих пополнения'
    case 'tools': return 'Контроль выданного оборудования'
    default: return 'Контроль ключевых показателей и история движений'
  }
})

const criticalItems = computed(() => inventoryStore.items.filter((item: InventoryItem) => item.currentStock <= (item.minStock || 5)))
const forgottenTools = computed(() => toolsStore.tools.filter(t => t.status === 'issued'))

const filteredForgottenTools = computed(() => {
  const query = searchToolsQuery.value.toLowerCase()
  if (!query) return forgottenTools.value
  return forgottenTools.value.filter(tool => 
    tool.name.toLowerCase().includes(query) || 
    (tool.issuedToName || '').toLowerCase().includes(query)
  )
})

interface OrderReportEntry {
  orderNumber: string
  items: MaterialInvoiceItem[]
  employees: Set<string>
}

const ordersReport = computed(() => reportsStore.ordersReport)

const topEmployees = computed(() => reportsStore.topEmployees)

const summaryMetrics = computed(() => [
  { id: 'main', label: 'Общая сводка', value: '📊', icon: StatsChartOutline, color: '#666' },
  { id: 'orders', label: 'Расход по заказам', value: ordersReport.value.length.toString(), icon: CubeOutline, color: '#9c27b0' },
  { id: 'critical', label: 'Крит. остатки', value: criticalItems.value.length.toString(), icon: WarningOutline, color: '#d03050' },
  { id: 'tools', label: 'Инструмент', value: forgottenTools.value.length.toString(), icon: WarningOutline, color: '#2080f0' }
])



const employeeHistoryColumns = [
  { title: 'Дата', key: 'date', render: (row: MaterialInvoice) => new Date(row.date).toLocaleDateString() },
  { title: 'Заказ', key: 'orderNumber' },
  { title: 'Кол-во позиций', key: 'items', render: (row: MaterialInvoice) => row.items?.length }
]

const criticalDetailedColumns = [
  { title: 'Наименование', key: 'name' },
  { title: 'Артикул', key: 'sku' },
  { title: 'Остаток', key: 'currentStock', render: (row: InventoryItem) => h('b', { style: 'color: red' }, row.currentStock) },
  { title: 'Мин. запас', key: 'minStock' }
]

const toolsDetailedColumns = [
  { title: 'Инструмент', key: 'name' },
  { title: 'Сотрудник', key: 'issuedToName' },
  { 
    title: 'Срок (дней)', key: 'issuedAt', 
    render: (row: Tool) => row.issuedAt ? Math.floor((Date.now() - new Date(row.issuedAt).getTime()) / (1000 * 60 * 60 * 24)) : '-'
  }
]

const openEmployeeProfile = (emp: Employee) => {
  selectedEmployee.value = emp
  showEmployeeModal.value = true
}

const selectedEmployeeHistory = computed(() => selectedEmployee.value?.materialHistory || [])
const selectedEmployeeUniqueOrders = computed(() => new Set(selectedEmployee.value?.materialHistory?.map((h: MaterialInvoice) => h.orderNumber)).size)
const selectedEmployeeOperations = computed(() => selectedEmployee.value?.materialHistory?.length || 0)
</script>

<style scoped>
.sticky-summary {
  position: sticky;
  top: 0px;
  z-index: 100;
  background: #101014;
  margin-bottom: 12px;
}
.metric-card {
  transition: all 0.3s ease;
  cursor: pointer;
  border-bottom: 4px solid transparent;
  background-color: #2a2a2a;
}
.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
.metric-card.active {
  border-bottom-color: v-bind('summaryMetrics.find(m => m.id === activeTab)?.color || "transparent"' );
  background-color: #333;
}
.top-employees-mini {
  height: 100%;
}
.reports-page {
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 24px;
}
@media (max-width: 768px) {
  .reports-page {
    padding: 0 12px;
  }
}
</style>
