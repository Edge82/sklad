<template>
  <div class="reports-page">
    <div class="flex justify-between items-center mb-6">
      <div>
        <n-h1 class="mb-0">Отчеты и аналитика</n-h1>
        <n-text depth="3">Контроль ключевых показателей и история движений</n-text>
      </div>
      <n-space>
        <n-date-picker v-model:value="dateRange" type="daterange" clearable placeholder="Выберите период" />
        <n-button type="primary" @click="exportReport">
          <template #icon>
            <n-icon><DownloadOutline /></n-icon>
          </template>
          Экспорт PDF
        </n-button>
      </n-space>
    </div>

    <!-- Краткая сводка -->
    <n-grid :cols="4" :x-gap="12" class="mb-6">
      <n-gi v-for="metric in summaryMetrics" :key="metric.id">
        <n-card 
          size="small" 
          :hoverable="metric.id !== 'revenue'"
          :style="{ cursor: metric.id !== 'revenue' ? 'pointer' : 'default' }"
          class="transition-shadow" 
          @click="metric.id !== 'revenue' ? openMetricDetails(metric.id) : null"
        >
          <div class="flex items-center gap-3 py-2">
            <n-icon size="32" :color="metric.color">
              <component :is="metric.icon" />
            </n-icon>
            <div>
              <n-text depth="3" class="text-xs uppercase font-bold">{{ metric.label }}</n-text>
              <n-h2 class="m-0 leading-none">{{ metric.value }}</n-h2>
            </div>
          </div>
        </n-card>
      </n-gi>
    </n-grid>

    <n-grid :cols="2" :x-gap="12" class="mb-6">
      <!-- Активность сотрудников -->
      <n-gi>
        <n-card title="Топ сотрудников (активность)">
          <n-list hoverable clickable>
            <n-list-item v-for="emp in topEmployees" :key="emp.id" @click="openEmployeeDetails(emp)">
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

      <!-- Оборачиваемость -->
      <n-gi>
        <n-card title="Оборачиваемость по категориям">
          <div class="flex flex-col gap-6 py-2">
            <div v-for="item in turnoverStats" :key="item.category">
              <div class="flex justify-between mb-2">
                <n-text strong>{{ item.category }}</n-text>
                <n-text type="info" strong>{{ item.value }}%</n-text>
              </div>
              <n-progress 
                type="line" 
                :percentage="item.value" 
                :color="item.color" 
                :show-indicator="false" 
                :height="12"
              />
            </div>
          </div>
        </n-card>
      </n-gi>
    </n-grid>

    <!-- История движений -->
    <n-card title="История последних движений ТМЦ" border-variant="dark">
      <n-data-table 
        :columns="movementColumns" 
        :data="movementHistory" 
        :pagination="{ pageSize: 10 }" 
      />
    </n-card>

    <!-- Модальные окна -->
    <n-modal 
      v-model:show="showDetailsModal" 
      preset="card" 
      :auto-focus="false"
      :title="modalTitle" 
      style="width: 900px"
    >
      <!-- ДЕТАЛИ СОТРУДНИКА (Расширенные) -->
      <div v-if="activeTab === 'employee' && selectedEmployee">
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

        <!-- Ключевые показатели -->
        <n-grid :cols="4" :x-gap="12" class="mb-6">
          <n-gi>
            <n-card size="small">
              <n-statistic label="Заказов" :value="selectedEmployeeUniqueOrders">
                <template #prefix><n-icon><CubeOutline /></n-icon></template>
              </n-statistic>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card size="small">
              <n-statistic label="Операций" :value="selectedEmployeeOperations">
                <template #prefix><n-icon><StatsChartOutline /></n-icon></template>
              </n-statistic>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card size="small">
              <n-statistic label="Эффективность" :value="89">
                <template #suffix>%</template>
                <template #prefix><n-icon><TrendingUpOutline /></n-icon></template>
              </n-statistic>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card size="small">
              <n-statistic label="Ошибок" :value="0">
                <template #prefix><n-icon><WarningOutline /></n-icon></template>
              </n-statistic>
            </n-card>
          </n-gi>
        </n-grid>

        <n-grid :cols="2" :x-gap="12" class="mb-6">
          <n-gi>
            <n-card title="Активность по дням">
              <div class="flex items-end justify-between h-[120px] px-2 pt-4">
                <div v-for="(val, i) in [4, 7, 5, 8, 12, 3, 0]" :key="i" class="flex flex-col items-center gap-2">
                  <n-tooltip trigger="hover">
                    <template #trigger>
                      <div 
                        class="w-8 bg-blue-500 rounded-t opacity-80 hover:opacity-100 transition-all cursor-pointer" 
                        :style="{ height: (val * 8) + 'px' }"
                      ></div>
                    </template>
                    Выполнено: {{ val }} операций
                  </n-tooltip>
                  <span class="text-[10px] text-gray-400 font-bold">{{ ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][i] }}</span>
                </div>
              </div>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card title="Распределение нагрузки">
              <div class="flex flex-col gap-4">
                <div>
                  <div class="flex justify-between text-xs mb-1">
                    <span>Сборка</span>
                    <span>45%</span>
                  </div>
                  <n-progress type="line" :percentage="45" color="#18a058" :show-indicator="false" />
                </div>
                <div>
                  <div class="flex justify-between text-xs mb-1">
                    <span>Раскрой</span>
                    <span>30%</span>
                  </div>
                  <n-progress type="line" :percentage="30" color="#2080f0" :show-indicator="false" />
                </div>
                <div>
                  <div class="flex justify-between text-xs mb-1">
                    <span>Упаковка</span>
                    <span>25%</span>
                  </div>
                  <n-progress type="line" :percentage="25" color="#f0a020" :show-indicator="false" />
                </div>
              </div>
            </n-card>
          </n-gi>
        </n-grid>

        <n-h3>История операций</n-h3>
        <n-data-table :columns="employeeHistoryColumns" :data="selectedEmployeeHistory" size="small" />
      </div>

      <div v-else-if="activeTab === 'turnover'">
        <n-data-table :columns="turnoverDetailedColumns" :data="turnoverItems" />
      </div>
      <div v-else-if="activeTab === 'critical'">
        <n-data-table :columns="criticalDetailedColumns" :data="criticalItems" />
      </div>
      <div v-else-if="activeTab === 'tools'">
        <n-data-table :columns="toolsDetailedColumns" :data="forgottenTools" />
      </div>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { useEmployeesStore } from '@/stores/employees'
import { useToolsStore } from '@/stores/tools'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { robotoFont } from '@/assets/font-base64'
import type { Employee, MaterialInvoice } from '@/types'
import {
  NButton, NIcon, NH1, NText, NGrid, NGi, NCard, NH3, 
  NSpace, NDatePicker, NDataTable, NProgress, NList, NListItem,
  NThing, NAvatar, NTag, useMessage, NModal, NH2, NStatistic, NTooltip
} from 'naive-ui'
import {
  DownloadOutline, TrendingUpOutline, WarningOutline, 
  TimeOutline, CashOutline, StatsChartOutline, CubeOutline,
  CheckmarkCircleOutline
} from '@vicons/ionicons5'

const inventoryStore = useInventoryStore()
const employeesStore = useEmployeesStore()
const toolsStore = useToolsStore()
const message = useMessage()

const dateRange = ref<[number, number] | null>(null)
const showDetailsModal = ref(false)
const modalTitle = ref('')
const activeTab = ref('')
const selectedEmployee = ref<Employee | null>(null)

const criticalItems = computed(() => {
  return inventoryStore.items.filter(item => item.currentStock <= (item.minStock || 5))
})

const forgottenTools = computed(() => {
  return toolsStore.tools.filter(t => t.status === 'issued')
})

const topEmployees = computed(() => {
  return employeesStore.employees
    .map(emp => ({
      ...emp,
      operations: (emp.materialHistory?.length || 0)
    }))
    .sort((a, b) => b.operations - a.operations)
    .slice(0, 5)
})

const summaryMetrics = computed(() => [
  { id: 'turnover', label: 'Оборачиваемость', value: '3.2x', icon: TrendingUpOutline, color: '#2080f0' },
  { id: 'critical', label: 'Крит. остатки', value: criticalItems.value.length.toString(), icon: WarningOutline, color: '#d03050' },
  { id: 'tools', label: 'Инструмент', value: forgottenTools.value.length.toString(), icon: TimeOutline, color: '#f0a020' },
  { id: 'revenue', label: 'Выручка (мес)', value: '1.25М', icon: CashOutline, color: '#18a058' }
])

const turnoverStats = [
  { category: 'Плита (ЛДСП/МДФ)', value: 85, color: '#18a058' },
  { category: 'Кромка ПВХ', value: 62, color: '#2080f0' },
  { category: 'Фурнитура', value: 45, color: '#f0a020' }
]

const movementHistory = computed(() => {
  const history: (MaterialInvoice & { employeeName: string, type: string })[] = []
  employeesStore.employees.forEach(emp => {
    if (emp.materialHistory) {
      emp.materialHistory.forEach(h_item => {
        history.push({ ...h_item, employeeName: emp.name, type: 'Расход ТМЦ' })
      })
    }
  })
  return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})

const movementColumns = [
  { title: 'Дата', key: 'date', render: (row: MaterialInvoice) => new Date(row.date).toLocaleString('ru-RU') },
  { title: 'Тип', key: 'type', render: (row: { type: string }) => h(NTag, { type: 'info', quaternary: true }, { default: () => row.type }) },
  { title: 'Сотрудник', key: 'employeeName' },
  { title: 'Заказ', key: 'orderNumber', render: (row: MaterialInvoice) => h('span', { class: 'font-mono font-bold' }, row.orderNumber) },
  { title: 'Позиций', key: 'items', render: (row: MaterialInvoice) => `${row.items?.length || 0} шт.` }
]

const employeeHistoryColumns = [
  { title: 'Дата', key: 'date', render: (row: MaterialInvoice) => new Date(row.date).toLocaleDateString() },
  { title: 'Заказ', key: 'orderNumber' },
  { title: 'Кол-во позиций', key: 'items', render: (row: MaterialInvoice) => row.items?.length }
]

const criticalDetailedColumns = [
  { title: 'Наименование', key: 'name' },
  { title: 'Артикул', key: 'sku' },
  { title: 'Остаток', key: 'currentStock', render: (row: { currentStock: number }) => h('b', { style: 'color: red' }, row.currentStock) },
  { title: 'Мин. запас', key: 'minStock' }
]

const toolsDetailedColumns = [
  { title: 'Инструмент', key: 'name' },
  { title: 'Сотрудник', key: 'issuedToName' },
  { 
    title: 'Срок (дней)', 
    key: 'issuedAt', 
    render: (row: any) => {
      if (!row.issuedAt) return '-'
      const diff = Date.now() - new Date(row.issuedAt).getTime()
      return Math.floor(diff / (1000 * 60 * 60 * 24))
    }
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

const exportReport = () => {
  const msg = message.loading('Создание PDF-отчета...')
  
  try {
    const doc = new jsPDF()
    
    // Добавление шрифта с поддержкой кириллицы
    doc.addFileToVFS('Roboto-Regular.ttf', robotoFont)
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')
    doc.setFont('Roboto')
    
    // Заголовок
    doc.setFontSize(20)
    doc.text('Отчет по движению ТМЦ', 14, 22)
    doc.setFontSize(11)
    doc.text(`Сформировано: ${new Date().toLocaleString('ru-RU')}`, 14, 30)
    
    // Подготовка данных для таблицы
    const tableData = movementHistory.value.map(row => [
      new Date(row.date).toLocaleString('ru-RU'),
      row.type,
      row.employeeName,
      row.orderNumber,
      `${row.items?.length || 0} шт.`
    ])
    
    // Генерация таблицы
    autoTable(doc, {
      startY: 40,
      head: [['Дата', 'Тип', 'Сотрудник', 'Заказ', 'Позиций']],
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: [32, 128, 240] as [number, number, number], 
        font: 'Roboto', 
        fontStyle: 'normal' 
      },
      styles: { 
        font: 'Roboto',
        fontStyle: 'normal'
      }
    })
    
    doc.save(`report_${new Date().toISOString().split('T')[0]}.pdf`)
    msg.destroy()
    message.success('Отчет успешно скачан')
  } catch (err) {
    msg.destroy()
    message.error('Ошибка при генерации PDF')
    console.error(err)
  }
}

const openMetricDetails = (id: string) => {
  activeTab.value = id
  if (id === 'critical') modalTitle.value = 'Критические остатки'
  else if (id === 'tools') modalTitle.value = 'Инструмент на руках'
  else if (id === 'turnover') modalTitle.value = 'Аналитика оборачиваемости'
  else return
  showDetailsModal.value = true
}

const openEmployeeDetails = (emp: Employee) => {
  selectedEmployee.value = emp
  activeTab.value = 'employee'
  modalTitle.value = 'Портрет производительности мастера'
  showDetailsModal.value = true
}

const selectedEmployeeHistory = computed(() => {
  if (!selectedEmployee.value) return []
  return selectedEmployee.value.materialHistory || []
})

const selectedEmployeeUniqueOrders = computed(() => {
  if (!selectedEmployee.value || !selectedEmployee.value.materialHistory) return 0
  const orders = new Set(selectedEmployee.value.materialHistory.map((h_item: MaterialInvoice) => h_item.orderNumber))
  return orders.size
})

const selectedEmployeeOperations = computed(() => {
  return selectedEmployee.value?.materialHistory?.length || 0
})

</script>

<style scoped>
.reports-page {
  max-width: 1400px;
  margin: 0 auto;
}
:deep(.n-list-item__suffix) {
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
}
</style>
