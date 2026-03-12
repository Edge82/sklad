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
      <!-- Основной контент (переключаемый) -->
      <div class="reports-content">
        <!-- Сводка (закреплена сверху) -->
        <div class="sticky-summary">
          <n-grid :cols="5" :x-gap="12" class="mb-4" style="padding: 8px 0">
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
                      <div style="display: flex; flex-direction: column; align-items: flex-end; min-width: 100px;">
                        <span style="font-size: 24px; font-weight: bold; line-height: 1; color: #2080f0;">{{ emp.operations }}</span>
                        <span style="font-size: 10px; color: #888; text-transform: uppercase; font-weight: bold; margin-top: 4px;">операций</span>
                      </div>
                    </template>
                  </n-list-item>
                </n-list>
              </n-card>
            </n-gi>

            <n-gi>
              <n-card title="Оборачиваемость по категориям">
                <div class="flex flex-col gap-6 py-2">
                  <div v-for="item in turnoverStats" :key="item.category">
                    <div class="flex justify-between mb-2">
                      <n-text strong>{{ item.category }}</n-text>
                      <n-text type="info" strong>{{ item.value }}%</n-text>
                    </div>
                    <n-progress type="line" :percentage="item.value" :color="item.color" :show-indicator="false" :height="12" />
                  </div>
                </div>
              </n-card>
            </n-gi>
          </n-grid>

          <n-card title="История последних движений ТМЦ" border-variant="dark">
            <n-data-table :columns="movementColumns" :data="movementHistory" :pagination="{ pageSize: 12 }" />
          </n-card>
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
              style="width: 260px"
            />
          </div>

          <div class="flex flex-col gap-6">
            <n-card 
              v-for="order in ordersReport" 
              :key="order.orderNumber" 
              :title="`Заказ: ${order.orderNumber}`" 
              size="small" 
              border-variant="dark" 
              hoverable
            >
              <template #header-extra>
                <n-tooltip trigger="hover">
                  <template #trigger>
                    <n-tag type="info" size="small" round>
                      {{ Array.from(order.employees).length }} мастера
                    </n-tag>
                  </template>
                  Работали: {{ Array.from(order.employees).join(', ') }}
                </n-tooltip>
              </template>
              
              <n-table size="small" :single-line="false" striped>
                <thead>
                  <tr>
                    <th>Наименование материала</th>
                    <th style="width: 140px">Артикул</th>
                    <th style="width: 100px">Цена (ед.)</th>
                    <th style="width: 100px">Кол-во</th>
                    <th style="width: 60px">Ед.</th>
                    <th style="width: 120px">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in order.items" :key="item.article">
                    <td>{{ item.productName }}</td>
                    <td><n-text code depth="3">{{ item.article }}</n-text></td>
                    <td>{{ (item.price || 0).toLocaleString('ru-RU') }} ₽</td>
                    <td><n-text strong type="primary">{{ item.quantity }}</n-text></td>
                    <td>{{ item.unit }}</td>
                    <td><n-text strong>{{ ((item.price || 0) * item.quantity).toLocaleString('ru-RU') }} ₽</n-text></td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="5" style="text-align: right"><strong>ИТОГО ПО ЗАКАЗУ:</strong></td>
                    <td><strong>{{ order.items.reduce((sum, i) => sum + (i.price || 0) * i.quantity, 0).toLocaleString('ru-RU') }} ₽</strong></td>
                  </tr>
                </tfoot>
              </n-table>
            </n-card>
          </div>
          <n-empty v-if="ordersReport.length === 0" description="За выбранный период данных не найдено" class="mt-20" />
        </div>

        <!-- Детальный отчет по оборачиваемости -->
        <div v-else-if="activeTab === 'turnover'">
          <n-card border-variant="dark">
            <n-data-table :columns="turnoverDetailedColumns" :data="turnoverItems" :pagination="{ pageSize: 20 }" />
          </n-card>
        </div>

        <!-- Детальный отчет по критическим остаткам -->
        <div v-else-if="activeTab === 'critical'">
          <n-card border-variant="dark">
            <n-data-table :columns="criticalDetailedColumns" :data="criticalItems" :pagination="{ pageSize: 20 }" />
          </n-card>
        </div>

        <!-- Детальный отчет по инструменту -->
        <div v-else-if="activeTab === 'tools'">
          <n-card border-variant="dark">
            <n-data-table :columns="toolsDetailedColumns" :data="forgottenTools" :pagination="{ pageSize: 20 }" />
          </n-card>
        </div>
      </div>

      <!-- Модалка только для профиля сотрудника -->
      <n-modal v-model:show="showEmployeeModal" preset="card" :auto-focus="false" title="Портрет производительности мастера" style="width: 900px">
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
              <template #icon><n-icon><CheckmarkCircleOutline /></n-icon></template>
              В штате
            </n-tag>
          </div>

          <n-grid :cols="4" :x-gap="12" class="mb-6">
            <n-gi><n-card size="small"><n-statistic label="Заказов" :value="selectedEmployeeUniqueOrders"><template #prefix><n-icon><CubeOutline /></n-icon></template></n-statistic></n-card></n-gi>
            <n-gi><n-card size="small"><n-statistic label="Операций" :value="selectedEmployeeOperations"><template #prefix><n-icon><StatsChartOutline /></n-icon></template></n-statistic></n-card></n-gi>
            <n-gi><n-card size="small"><n-statistic label="Эффективность" :value="89"><template #suffix>%</template><template #prefix><n-icon><TrendingUpOutline /></n-icon></template></n-statistic></n-card></n-gi>
            <n-gi><n-card size="small"><n-statistic label="Ошибок" :value="0"><template #prefix><n-icon><WarningOutline /></n-icon></template></n-statistic></n-card></n-gi>
          </n-grid>

          <n-h3>История операций</n-h3>
          <n-data-table :columns="employeeHistoryColumns" :data="selectedEmployeeHistory" size="small" />
        </div>
      </n-modal>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { useThemeVars } from 'naive-ui'
import { useInventoryStore } from '@/stores/inventory'
import { useEmployeesStore } from '@/stores/employees'
import { useToolsStore } from '@/stores/tools'
import { 
  type InventoryItem, 
  type MaterialInvoice, 
  type MaterialInvoiceItem, 
  type Employee,
  type Tool
} from '@/types'
import {
  TrendingUpOutline, WarningOutline, 
  TimeOutline, StatsChartOutline, CubeOutline,
  CheckmarkCircleOutline
} from '@vicons/ionicons5'
import {
  NIcon, NH1, NText, NGrid, NGi, NCard, NH3, 
  NDatePicker, NDataTable, NProgress, NList, NListItem,
  NThing, NAvatar, NTag, NH2, NStatistic, NTooltip, NTable, NEmpty, NModal
} from 'naive-ui'

const inventoryStore = useInventoryStore()
const employeesStore = useEmployeesStore()
const toolsStore = useToolsStore()
const themeVars = useThemeVars()

const dateRange = ref<[number, number] | null>(null)
const activeTab = ref('main')
const selectedEmployee = ref<Employee | null>(null)
const showEmployeeModal = ref(false)

const pageHeader = computed(() => {
  switch (activeTab.value) {
    case 'orders': return 'Расход материала по заказам'
    case 'turnover': return 'Аналитика оборачиваемости'
    case 'critical': return 'Критические остатки ТМЦ'
    case 'tools': return 'Инструмент на руках'
    default: return 'Отчеты и аналитика'
  }
})

const pageSubHeader = computed(() => {
  switch (activeTab.value) {
    case 'orders': return 'Детальный перечень затрат ТМЦ'
    case 'turnover': return 'Контроль интенсивности использования ресурсов'
    case 'critical': return 'Список позиций, требующих пополнения'
    case 'tools': return 'Контроль выданного оборудования'
    default: return 'Контроль ключевых показателей и история движений'
  }
})

const criticalItems = computed(() => inventoryStore.items.filter(item => item.currentStock <= (item.minStock || 5)))
const forgottenTools = computed(() => toolsStore.tools.filter(t => t.status === 'issued'))

interface OrderReportEntry {
  orderNumber: string
  items: MaterialInvoiceItem[]
  employees: Set<string>
}

const ordersReport = computed(() => {
  const reportMap: Record<string, OrderReportEntry> = {}
  
  interface FlattenedInvoice extends MaterialInvoice {
    employeeName: string
  }
  
  const allHistory: FlattenedInvoice[] = []
  employeesStore.employees.forEach((emp: Employee) => {
    if (emp.materialHistory) {
      emp.materialHistory.forEach((h_item: MaterialInvoice) => {
        allHistory.push({ ...h_item, employeeName: emp.name })
      })
    }
  })

  allHistory.forEach(h_item => {
    if (!h_item.orderNumber) return 

    if (!reportMap[h_item.orderNumber]) {
      reportMap[h_item.orderNumber] = { 
        orderNumber: h_item.orderNumber, 
        items: [], 
        employees: new Set() 
      }
    }
    
    const entry = reportMap[h_item.orderNumber]
    if (entry) {
      entry.employees.add(h_item.employeeName)
      
      h_item.items.forEach((item: MaterialInvoiceItem) => {
        const existing = entry.items.find(i => i.article === item.article)
        if (existing) {
          existing.quantity += item.quantity
        } else {
          entry.items.push({ ...item })
        }
      })
    }
  })

  return Object.values(reportMap)
})

const topEmployees = computed(() => 
  employeesStore.employees
    .map((emp: Employee) => ({ ...emp, operations: (emp.materialHistory?.length || 0) }))
    .sort((a, b) => b.operations - a.operations)
    .slice(0, 5)
)

const summaryMetrics = computed(() => [
  { id: 'main', label: 'Общая сводка', value: '📊', icon: StatsChartOutline, color: '#666' },
  { id: 'orders', label: 'Расход по заказам', value: ordersReport.value.length.toString(), icon: CubeOutline, color: '#9c27b0' },
  { id: 'turnover', label: 'Оборачиваемость', value: '3.2x', icon: TrendingUpOutline, color: '#2080f0' },
  { id: 'critical', label: 'Крит. остатки', value: criticalItems.value.length.toString(), icon: WarningOutline, color: '#d03050' },
  { id: 'tools', label: 'Инструмент', value: forgottenTools.value.length.toString(), icon: TimeOutline, color: '#f0a020' }
])

const turnoverStats = [
  { category: 'Плита (ЛДСП/МДФ)', value: 85, color: '#18a058' },
  { category: 'Кромка ПВХ', value: 62, color: '#2080f0' },
  { category: 'Фурнитура', value: 45, color: '#f0a020' }
]

interface MovementHistoryItem {
  date: Date
  type: string
  tagType: 'success' | 'warning' | 'info' | 'error' | 'primary' | 'default'
  employeeName: string
  orderNumber: string
  itemCount: number
  totalAmount?: number
  productName?: string // Для расширенного отображения
}

const movementHistory = computed(() => {
  const history: MovementHistoryItem[] = []
  
  employeesStore.employees.forEach((emp: Employee) => {
    if (emp.materialHistory) {
      emp.materialHistory.forEach((h_item: MaterialInvoice) => {
        const isIncoming = ['ПРИХОД', 'ПРИХОД (СКЛАД)', 'НОВАЯ КАРТОЧКА', 'ИЗМЕНЕНИЕ ЦЕНЫ'].includes(h_item.orderNumber)
        
        history.push({ 
          date: h_item.date,
          type: isIncoming ? 'Приход ТМЦ' : (h_item.destination === 'Брак' ? 'Списание брака' : 'Выдача ТМЦ'),
          tagType: isIncoming ? 'success' : (h_item.destination === 'Брак' ? 'warning' : 'info'),
          employeeName: emp.name, 
          orderNumber: h_item.orderNumber,
          itemCount: h_item.items?.reduce((sum: number, i: MaterialInvoiceItem) => sum + i.quantity, 0) || 0,
          totalAmount: h_item.totalAmount
        })
      })
    }
  })

  return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})

const movementColumns = [
  { 
    title: 'Дата', 
    key: 'date', 
    width: 160,
    render: (row: MovementHistoryItem) => new Date(row.date).toLocaleString('ru-RU', { 
      day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' 
    }) 
  },
  { 
    title: 'Тип', 
    key: 'type', 
    width: 140,
    render: (row: MovementHistoryItem) => h(NTag, { type: row.tagType, quaternary: true }, { default: () => row.type }) 
  },
  { title: 'Источник/Сотрудник', key: 'employeeName' },
  { 
    title: 'Заказ / Артикул / Товар', 
    key: 'orderNumber', 
    render: (row: MovementHistoryItem) => h('div', [
      h('div', { class: 'font-mono font-bold' }, row.orderNumber),
      row.productName ? h('div', { style: 'font-size: 11px; opacity: 0.7; margin-top: 2px' }, row.productName) : null
    ])
  },
  { 
    title: 'Кол-во', 
    key: 'itemCount',
    width: 100,
    render: (row: MovementHistoryItem) => `${row.itemCount} шт.`
  },
  { 
    title: 'Сумма', 
    key: 'totalAmount', 
    width: 130,
    render: (row: MovementHistoryItem) => row.totalAmount ? `${row.totalAmount.toLocaleString('ru-RU')} ₽` : '-' 
  }
]

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

const turnoverDetailedColumns = [
  { title: 'Категория', key: 'category' },
  { title: 'Средний остаток', key: 'avg' },
  { title: 'Расход за период', key: 'usage' },
  { title: 'Коэф. оборачиваемости', key: 'ratio' }
]

const turnoverItems = [
  { category: 'Плита ЛДСП', avg: '450 л.', usage: '1200 л.', ratio: '2.6' },
  { category: 'Кромка ПВХ', avg: '2500 м.', usage: '8000 м.', ratio: '3.2' },
  { category: 'Метизы', avg: '15000 шт.', usage: '45000 шт.', ratio: '3.0' }
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
