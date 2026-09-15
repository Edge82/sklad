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
          <n-grid :cols="4" :x-gap="12" class="mb-4 py-2">
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
          <div class="mb-4 flex justify-between items-center">
            <n-h2 class="m-0">Финансовая отчётность</n-h2>
          </div>
          <div class="mb-4 flex gap-3 flex-wrap">
            <n-input
              v-model:value="profitabilitySearchQuery"
              type="text"
              placeholder="Поиск по заказу или клиенту..."
              clearable
              style="width: 350px"
            />
            <n-date-picker
              v-model:value="profitabilityDateRange"
              type="daterange"
              placeholder="Период"
              clearable
              style="width: 280px"
            />
          </div>
          <div v-if="profitabilityLoading" class="flex items-center justify-center" style="min-height: 100px">
          <n-spin size="large" />
        </div>
        <div v-else>
            <n-card border-variant="dark" v-if="profitabilityLoaded">
              <div v-if="profitabilityReport.length === 0">
                <n-empty description="Нет данных по заказам" />
              </div>
              <div v-else>
                <div v-for="order in profitabilityReport" :key="order.orderKey" class="mb-4">
                  <div class="profitability-order-header flex justify-between items-center py-2 px-3 rounded" @click="toggleProfitabilityOrder(order.orderKey)">
                    <div class="flex items-center gap-3">
                      <n-icon :component="expandedProfitabilityOrders.has(order.orderKey) ? ChevronForward : ChevronForward" :style="{ transform: expandedProfitabilityOrders.has(order.orderKey) ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }" />
                      <n-text strong>{{ order.orderNumber }}</n-text>
                      <n-tag size="small" type="info">{{ order.customer || '-' }}</n-tag>
                    </div>
                    <div class="flex items-center gap-4 text-sm">
                      <span>Сумма: <b>{{ fmtNumber(order.totalSum) }}</b></span>
                      <span>Материалы: <b>{{ fmtNumber(order.totalMaterials) }}</b></span>
                      <span :style="{ color: orderNetProfit(order) >= 0 ? '#18a058' : '#f0a020' }">Прибыль: <b>{{ fmtNumber(orderNetProfit(order)) }}</b></span>
                    </div>
                  </div>
                  <div v-if="expandedProfitabilityOrders.has(order.orderKey)" class="ml-6 mt-2 overflow-x-auto">
                    <table class="profitability-table text-sm" v-if="order.products.length > 0">
                      <thead>
                        <tr>
                          <th style="white-space: normal">Изделие</th>
                          <th class="text-right">Кол-во</th>
                          <th class="text-right">Сумма</th>
                          <th class="text-right">Материалы</th>
                          <th class="text-right">%</th>
                          <th class="text-right">ФОТ</th>
                          <th class="text-right">%</th>
                          <th class="text-right">Доставка</th>
                          <th class="text-right">%</th>
                          <th class="text-right">Расходы</th>
                          <th class="text-right" style="white-space: normal">Валовая<br>прибыль</th>
                          <th class="text-right">Накладные<br>расходы</th>
                          <th class="text-right">%</th>
                          <th class="text-right">Прибыль</th>
                          <th class="text-right">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="p in order.products" :key="p.productName">
                          <td style="white-space: normal; word-break: break-word; text-align: left; min-width: 120px; max-width: 200px">{{ p.productName }}</td>
                          <td class="text-right">{{ p.quantity }} {{ p.unit }}</td>
                          <td class="text-right">{{ fmtNumber(p.productSum) }}</td>
                          <td class="text-right">{{ fmtNumber(p.materialsCost) }}</td>
                          <td class="text-right">{{ p.productSum ? (p.materialsCost / p.productSum * 100).toFixed(1) + '%' : '0%' }}</td>
                          <td class="text-right">
                            <span class="cursor-pointer text-[#2080f0] hover:underline" @click="openFotModal(order, p)">{{ fmtNumber(p.fot || 0) }}</span>
                          </td>
                          <td class="text-right">{{ p.productSum ? ((p.fot || 0) / p.productSum * 100).toFixed(1) + '%' : '0%' }}</td>
<td style="padding: 2px 4px; width: 70px">
                              <input type="number" :value="p.delivery || ''" placeholder="Ввести" @input="(e) => { p.delivery = parseFloat((e.target as HTMLInputElement).value) || 0; recalcProfitability(order) }" step="0.01" style="width: 100%; box-sizing: border-box; background: transparent; border: none; color: inherit; text-align: center; font-size: 12px; padding: 0; outline: none;" />
                            </td>
                          <td class="text-right">{{ p.productSum ? ((p.delivery || 0) / p.productSum * 100).toFixed(1) + '%' : '0%' }}</td>
                          <td class="text-right">{{ fmtNumber(productTotalExpense(p)) }}</td>
                          <td class="text-right" :style="{ color: productGrossProfit(p) >= 0 ? '#18a058' : '#f0a020' }">{{ fmtNumber(productGrossProfit(p)) }}</td>
                          <td class="text-right">{{ fmtNumber(productOverhead(p)) }}</td>
                          <td style="padding: 2px 4px">
                            <input type="number" :value="p._overheadPct ?? ''" placeholder="50" @input="(e) => { p._overheadPct = parseFloat((e.target as HTMLInputElement).value) ?? 50; p._overhead = productTotalExpense(p) * p._overheadPct / 100; p._net = productGrossProfit(p) - p._overhead; recalcProfitability(order) }" step="1" style="width: 50px; box-sizing: border-box; background: transparent; border: none; color: inherit; text-align: center; font-size: 12px; padding: 0; outline: none;" />
                          </td>
                          <td class="text-right" :style="{ color: (productGrossProfit(p) - productOverhead(p)) >= 0 ? '#18a058' : '#f0a020' }">{{ fmtNumber(productGrossProfit(p) - productOverhead(p)) }}</td>
                          <td class="text-right">{{ p.productSum ? ((productGrossProfit(p) - productOverhead(p)) / p.productSum * 100).toFixed(1) + '%' : '0%' }}</td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr class="profitability-total">
                          <td>Итого</td>
                          <td class="text-right">{{ order.products.reduce((s, p: any) => s + p.quantity, 0) }}</td>
                          <td class="text-right">{{ fmtNumber(order.totalSum) }}</td>
                          <td class="text-right">{{ fmtNumber(order.totalMaterials) }}</td>
                          <td class="text-right">{{ order.totalSum ? (order.totalMaterials / order.totalSum * 100).toFixed(1) + '%' : '0%' }}</td>
                          <td class="text-right">{{ fmtNumber(order.products.reduce((s, p: any) => s + (p.fot || 0), 0)) }}</td>
                          <td class="text-right">{{ order.totalSum ? (order.products.reduce((s, p: any) => s + (p.fot || 0), 0) / order.totalSum * 100).toFixed(1) + '%' : '0%' }}</td>
                          <td class="text-right">{{ fmtNumber(order.products.reduce((s, p: any) => s + (p.delivery || 0), 0)) }}</td>
                          <td class="text-right">{{ order.totalSum ? (order.products.reduce((s, p: any) => s + (p.delivery || 0), 0) / order.totalSum * 100).toFixed(1) + '%' : '0%' }}</td>
                          <td class="text-right">{{ fmtNumber(order.totalMaterials + order.products.reduce((s, p: any) => s + (p.fot || 0) + (p.delivery || 0), 0)) }}</td>
                          <td class="text-right" :style="{ color: orderGrossProfit(order) >= 0 ? '#18a058' : '#f0a020' }">{{ fmtNumber(orderGrossProfit(order)) }}</td>
                          <td class="text-right">{{ fmtNumber(orderOverhead(order)) }}</td>
                          <td style="padding: 2px 4px">
                            <input type="number" :value="order._overheadPct ?? ''" placeholder="50" @input="(e) => { order._overheadPct = parseFloat((e.target as HTMLInputElement).value) ?? 50; recalcProfitability(order) }" step="1" style="width: 50px; box-sizing: border-box; background: transparent; border: none; color: inherit; text-align: center; font-size: 12px; padding: 0; outline: none;" />
                          </td>
                          <td class="text-right" :style="{ color: (orderGrossProfit(order) - orderOverhead(order)) >= 0 ? '#18a058' : '#f0a020' }">{{ fmtNumber(orderGrossProfit(order) - orderOverhead(order)) }}</td>
                          <td class="text-right">{{ order.totalSum ? ((orderGrossProfit(order) - orderOverhead(order)) / order.totalSum * 100).toFixed(1) + '%' : '0%' }}</td>
                        </tr>
                      </tfoot>
                    </table>
                    <div v-if="order.orderMaterials && order.orderMaterials.length > 0" class="mt-2">
                      <n-tag size="small" type="warning">Прочие материалы: {{ fmtNumber(orderOtherMaterialsSum(order)) }}</n-tag>
                    </div>
                  </div>
                </div>
              </div>
            </n-card>
          </div>
        </div>

        <!-- Детальный отчет по заказам -->
        <div v-else-if="activeTab === 'orders'">
          <div class="mb-4 flex justify-between items-center">
            <n-h2 class="m-0">Резерв материалов по заказам</n-h2>
            <div class="flex gap-3 items-center">
              <n-input
                v-model:value="ordersSearchQuery"
                placeholder="Поиск по номеру заказа..."
                clearable
                style="width: 500px"
              />
              <n-select
                v-model:value="ordersStatusFilter"
                placeholder="Статус заказа"
                :options="ordersStatusOptions"
                clearable
                style="width: 250px"
              />
            </div>
          </div>

          <n-card border-variant="dark" class="table-card shadow-sm">
            <n-data-table
              :columns="ordersReportColumns"
              :data="filteredOrdersReport"
              :row-key="(row: OrderReportEntry) => row.orderNumber"
              v-model:expanded-row-keys="expandedOrderKeys"
              max-height="calc(100vh - 320px)"
              :pagination="ordersPagination"
              :row-props="(row: OrderReportEntry) => ({
                 style: 'cursor: pointer;',
                 onClick: () => handleOrderReportRowClick(row)
              })"
            />
          </n-card>
          <n-empty v-if="filteredOrdersReport.length === 0" description="За выбранный период данных не найдено" class="mt-20" />
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
            <n-data-table
              :columns="toolsDetailedColumns"
              :data="filteredForgottenTools"
              max-height="calc(100vh - 320px)"
              :pagination="toolsPagination"
            />
          </n-card>
          <n-empty v-if="filteredForgottenTools.length === 0" description="Инструменты не найдены" class="mt-20" />
        </div>

        <!-- Расход материалов по заказам (производство) -->
        <div v-else-if="activeTab === 'production'">
          <div class="mb-4 flex justify-between items-center">
            <n-h2 class="m-0">Расход материалов по заказам</n-h2>
          </div>
          <div class="mb-4 flex gap-3 flex-wrap">
            <n-input
              v-model:value="productionSearchQuery"
              type="text"
              placeholder="Поиск по заказу или изделию..."
              clearable
              style="width: 350px"
            />
            <n-input
              v-model:value="productionCustomerQuery"
              type="text"
              placeholder="Поиск по клиенту..."
              clearable
              style="width: 250px"
            />
            <n-date-picker
              v-model:value="productionDateRange"
              type="daterange"
              placeholder="Период"
              clearable
              style="width: 280px"
            />
          </div>
          <n-card border-variant="dark">
    <n-data-table
      :columns="productionColumns"
      :data="filteredProductionReport"
      :row-key="(row: any) => row.orderNumber"
      v-model:expanded-row-keys="productionExpandedKeys"
      max-height="calc(100vh - 320px)"
      :pagination="productionPagination"
      :row-props="(row: any) => ({
                style: 'cursor: pointer;',
                onClick: () => {
                  const key = row.orderNumber
                  const idx = productionExpandedKeys.indexOf(key)
                  if (idx > -1) {
                    productionExpandedKeys.splice(idx, 1)
                  } else {
                    productionExpandedKeys.push(key)
                  }
                }
              })"
            />
          </n-card>
          <n-empty v-if="productionReport.length === 0" description="Нет данных" class="mt-20" />
        </div>

    </div>
  </div>

  <n-modal v-model:show="showFotModal" preset="card" title="Зарплата по месяцам (ФОТ)" style="width: 520px">
    <div v-if="fotModalProduct">
      <n-text strong class="block mb-4">{{ fotModalProduct.productName }}</n-text>
      <div class="flex flex-col gap-3">
        <div v-for="(m, idx) in fotMonths" :key="idx" class="flex items-center gap-3">
          <span class="w-16 text-sm">{{ m.month }}</span>
          <input type="number" :value="m.value ?? ''" @input="(e) => { m.value = (e.target as HTMLInputElement).value === '' ? null : parseFloat((e.target as HTMLInputElement).value) }" step="0.01" style="width: 140px; box-sizing: border-box; padding: 4px 8px; border: 1px solid #d0d0d0; border-radius: 4px; font-size: 14px; outline: none;" />
        </div>
      </div>
      <div class="mt-4 pt-3 border-t flex justify-between items-center">
        <n-text strong>Итого ФОТ:</n-text>
        <n-text strong class="text-lg">{{ fmtNumber(fotMonths.reduce((s, m) => s + (m.value ?? 0), 0)) }}</n-text>
      </div>
    </div>
    <template #action>
      <n-space justify="end">
        <n-button @click="showFotModal = false">Отмена</n-button>
        <n-button type="primary" @click="saveFotModal">Сохранить</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, h, onMounted, onActivated, watch, markRaw } from 'vue'
import { useRouter } from 'vue-router'
import * as XLSX from 'xlsx'
import { storeToRefs } from 'pinia'
import { useInventoryStore } from '@/stores/inventory'
import { useToolsStore } from '@/stores/tools'
import { useReportsStore } from '@/stores/reports'
import { useOrdersStore } from '@/stores/orders'
import {
  type MaterialInvoiceItem
} from '@/types'
import {
  StatsChartOutline, CubeOutline, ChevronForward
} from '@vicons/ionicons5'
import {
  NSelect, NIcon, NH1, NText, NGrid, NGi, NCard, NH3,
  NDatePicker, NDataTable, NList, NListItem,
  NThing, NAvatar, NTag, NH2, NTable, NEmpty,
  NInput, NButton, NModal, NForm, NFormItem, type DataTableColumns
} from 'naive-ui'

const router = useRouter()
const inventoryStore = useInventoryStore()
const toolsStore = useToolsStore()
const reportsStore = useReportsStore()
const ordersStore = useOrdersStore()
const { ordersReport, topEmployees } = storeToRefs(reportsStore)

const activeTab = ref('main')
const productionReport = ref<any[]>([])
const profitabilityReport = ref<any[]>([])
const profitabilityLoading = ref(false)
const expandedProfitabilityOrders = ref<Set<string>>(new Set())
const profitabilitySearchQuery = ref('')
const profitabilityDateRange = ref<number | null>(null)
const profitabilityLoaded = ref(false)
const showFotModal = ref(false)
const fotModalProduct = ref(null)
const fotModalOrder = ref(null)
const fotMonths = ref(
  Array.from({ length: 12 }, (_, i) => ({
    month: new Date(2026, i).toLocaleString('ru-RU', { month: 'short' }),
    value: null as number | null
  }))
)
const productionSearchQuery = ref('')
const productionCustomerQuery = ref('')
const productionDateRange = ref<number | null>(null)
const productionExpandedKeys = ref<string[]>([])
const productExpandedKeys = ref<Record<string, string[]>>({})
const expandedOrderKeys = ref<string[]>([])
const searchToolsQuery = ref('')
const ordersSearchQuery = ref('')
const ordersStatusFilter = ref<string | null>(null)
const ordersCurrentPage = ref(1)
const ordersItemsPerPage = ref(10)
const ordersPagination = computed(() => ({
  pageSize: ordersItemsPerPage.value,
  page: ordersCurrentPage.value,
  pageCount: Math.ceil(filteredOrdersReport.value.length / ordersItemsPerPage.value),
  showSizePicker: true,
  pageSizes: [10, 15, 25, 50, 100],
  onChange: (page: number) => {
    ordersCurrentPage.value = page
  },
  onUpdatePageSize: (pageSize: number) => {
    ordersItemsPerPage.value = pageSize
    ordersCurrentPage.value = 1
  }
}))
const productionPagination = computed(() => ({
  pageSize: productionPageSize.value,
  page: productionPage.value,
  pageCount: Math.ceil(productionReport.value.length / productionPageSize.value),
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  onChange: (page: number) => {
    productionPage.value = page
  },
  onUpdatePageSize: (pageSize: number) => {
    productionPageSize.value = pageSize
    productionPage.value = 1
  }
}))
const productionPage = ref(1)
const productionPageSize = ref(20)

const toolsCurrentPage = ref(1)
const toolsItemsPerPage = ref(10)
const toolsPagination = computed(() => ({
  pageSize: toolsItemsPerPage.value,
  page: toolsCurrentPage.value,
  pageCount: Math.ceil(filteredForgottenTools.value.length / toolsItemsPerPage.value),
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  onChange: (page: number) => {
    toolsCurrentPage.value = page
  },
  onUpdatePageSize: (pageSize: number) => {
    toolsItemsPerPage.value = pageSize
    toolsCurrentPage.value = 1
  }
}))

const ordersStatusOptions = computed(() => [
  { label: 'В работе', value: 'in_progress' },
  { label: 'На складе', value: 'ready' },
  { label: 'Завершён', value: 'completed' }
])

const pageHeader = ref('Отчёты')
const pageSubHeader = ref('Аналитика и отчёты по складу')

interface MetricCard {
  id: string
  label: string
  value: string
  color: string
  icon: any
}
const summaryMetrics = ref<MetricCard[]>([
  { id: 'main', label: 'Главная', value: 'Обзор', color: '#2080f0', icon: markRaw(StatsChartOutline) },
  { id: 'orders', label: 'Резерв по заказам', value: '0', color: '#18a058', icon: markRaw(CubeOutline) },
  { id: 'production', label: 'Производство', value: '0', color: '#f0a020', icon: markRaw(CubeOutline) },
  { id: 'tools', label: 'Инструменты', value: '0', color: '#8a8a8a', icon: markRaw(CubeOutline) }
])

const filteredForgottenTools = computed(() => {
  const issued = toolsStore.issuedTools
  if (!searchToolsQuery.value) return issued
  const q = searchToolsQuery.value.toLowerCase()
  return issued.filter(t =>
    t.name.toLowerCase().includes(q) ||
    (t.issuedToName || '').toLowerCase().includes(q)
  )
})

const handleOrderReportRowClick = (row: OrderReportEntry) => {
  const idx = expandedOrderKeys.value.indexOf(row.orderNumber)
  if (idx > -1) {
    expandedOrderKeys.value.splice(idx, 1)
  } else {
    expandedOrderKeys.value.push(row.orderNumber)
  }
}

const allowedStatuses = ['in_progress', 'ready', 'completed']

const fmtCurrency = (value: number | null | undefined) => {
  if (value == null) return '—'
  return Math.round(value * 10) / 10
}

const saveProductionOrderToFile = (row: any) => {
  const ws: any[][] = []
  ws.push(['Заказ:', row.orderNumber])
  ws.push(['Клиент:', row.customer || ''])
  ws.push([])

  if (row.products?.length) {
    for (const p of row.products) {
      ws.push(['Изделие:', p.name])
      ws.push(['Материал', 'Кол-во', 'Цена, ₽', 'Сумма, ₽', 'Заказ на перемещение'])
      let total = 0
      for (const m of p.materials) {
        const price = fmtCurrency(m.price || 0)
        const sum = fmtCurrency((m.price || 0) * m.quantity)
        ws.push([m.name, m.quantity, price, sum, (m.transferOrderNumbers || []).join(', ')])
        total += (m.price || 0) * m.quantity
      }
      ws.push(['', '', 'Итого:', fmtCurrency(total)])
      ws.push([])
    }
  }

  if (row.orderMaterials?.length) {
    ws.push(['Прочие материалы'])
    ws.push(['Материал', 'Кол-во', 'Цена, ₽', 'Сумма, ₽', 'Заказ на перемещение'])
    let total = 0
    for (const m of row.orderMaterials) {
      const price = fmtCurrency(m.price || 0)
      const sum = fmtCurrency((m.price || 0) * m.quantity)
      ws.push([m.name, m.quantity, price, sum, (m.transferOrderNumbers || []).join(', ')])
      total += (m.price || 0) * m.quantity
    }
    ws.push(['', '', 'Итого:', fmtCurrency(total)])
    ws.push([])
  }

  ws.push(['', '', 'Общая сумма:', fmtCurrency(row.orderTotal || 0)])

  const wb = XLSX.utils.book_new()
  const wsData = XLSX.utils.aoa_to_sheet(ws)
  wsData['!cols'] = [{ wch: 50 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(wb, wsData, 'Производство')
  XLSX.writeFile(wb, `Производство_${row.orderNumber}.xlsx`)
}

const filteredOrdersReport = computed(() => {
  return ordersReport.value.filter(r => {
    const order = ordersStore.orders.find((o: any) => o.orderNumber === r.orderNumber)
    if (!order) return false
    if (!allowedStatuses.includes(order.status)) return false
    if (ordersStatusFilter.value) return order.status === ordersStatusFilter.value
    if (ordersSearchQuery.value) {
      const q = ordersSearchQuery.value.toLowerCase()
      if (!r.orderNumber.toLowerCase().includes(q)) return false
    }
    return true
  })
})

watch([ordersSearchQuery, ordersStatusFilter], () => {
  ordersCurrentPage.value = 1
})

watch(searchToolsQuery, () => {
  toolsCurrentPage.value = 1
})

watch(productionSearchQuery, () => {
  productionPage.value = 1
  loadProductionReport()
})

watch(productionCustomerQuery, () => {
  productionPage.value = 1
})

watch(productionDateRange, () => {
  productionPage.value = 1
})

const loadProductionReport = async () => {
  try {
    const params = new URLSearchParams()
    if (productionSearchQuery.value) {
      params.set('search', productionSearchQuery.value)
    }
    if (productionDateRange.value && Array.isArray(productionDateRange.value)) {
      const [start, end] = productionDateRange.value
      params.set('dateFrom', new Date(start).toISOString().slice(0, 10))
      params.set('dateTo', new Date(end).toISOString().slice(0, 10))
    }
    const qs = params.toString()
    const res = await fetch(`/sklad/api/reports/production-materials${qs ? '?' + qs : ''}`)
    if (res.ok) {
      const data = await res.json()
      productionReport.value = data.data || []
    }
  } catch { /* ignore */ }
}

const loadProfitabilityReport = async () => {
  profitabilityLoading.value = true
  try {
    const params = new URLSearchParams()
    if (profitabilitySearchQuery.value) {
      params.set('search', profitabilitySearchQuery.value)
    }
    if (profitabilityDateRange.value && Array.isArray(profitabilityDateRange.value)) {
      const [start, end] = profitabilityDateRange.value
      params.set('dateFrom', new Date(start).toISOString().slice(0, 10))
      params.set('dateTo', new Date(end).toISOString().slice(0, 10))
    }
    const qs = params.toString()
    const res = await fetch(`/sklad/api/reports/profitability${qs ? '?' + qs : ''}`)
    if (res.ok) {
      const data = await res.json()
      // Pre-compute all values to avoid expensive template expressions
      profitabilityReport.value = (data.data || []).map((order: any) => {
        const orderFot = order.products.reduce((s: number, p: any) => s + (p.fot || 0), 0)
        const orderDelivery = order.products.reduce((s: number, p: any) => s + (p.delivery || 0), 0)
        const orderExpense = order.totalMaterials + orderFot + orderDelivery
        const orderGross = order.totalSum - orderExpense
        const orderOverhead = orderExpense * 0.5
        const orderNet = orderGross - orderOverhead

        return {
          ...order,
          _overheadPct: 50,
          products: order.products.map((p: any) => {
            const pExpense = (p.materialsCost || 0) + (p.fot || 0) + (p.delivery || 0)
            const pOverheadPct = p._overheadPct ?? 50
            const pOverhead = pExpense * pOverheadPct / 100
            const pGross = p.productSum - pExpense
            const pNet = pGross - pOverhead
            return {
              ...p,
              _expense: pExpense,
              _gross: pGross,
              _overhead: pOverhead,
              _net: pNet,
              _overheadPct: pOverheadPct
            }
          }),
          _fot: orderFot,
          _delivery: orderDelivery,
          _expense: orderExpense,
          _gross: orderGross,
          _overhead: orderOverhead,
          _net: orderNet
        }
      })
    }
    profitabilityLoaded.value = true
  } catch { /* ignore */ } finally {
    profitabilityLoading.value = false
  }
}

const fmtNumber = (val: number) => {
  if (val == null || isNaN(val)) return '0.00'
  return val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

const fmtPct = (part: number, total: number) => {
  if (!total) return '0.0%'
  return (part / total * 100).toFixed(1) + '%'
}

const productTotalExpense = (p: any) => (p.materialsCost || 0) + (p.fot || 0) + (p.delivery || 0)
const productGrossProfit = (p: any) => p.productSum - productTotalExpense(p)
const productOverhead = (p: any) => p._expense * (p._overheadPct ?? 50) / 100
const productNetProfit = (p: any) => productGrossProfit(p) - productOverhead(p)

const orderTotalFot = (o: any) => o.products.reduce((s: number, p: any) => s + (p.fot || 0), 0)
const orderTotalDelivery = (o: any) => o.products.reduce((s: number, p: any) => s + (p.delivery || 0), 0)
const orderTotalExpense = (o: any) => o.totalMaterials + orderTotalFot(o) + orderTotalDelivery(o)
const orderGrossProfit = (o: any) => o.totalSum - orderTotalExpense(o)
const orderOverhead = (o: any) => orderTotalExpense(o) * (o._overheadPct ?? 50) / 100
const orderNetProfit = (o: any) => orderGrossProfit(o) - orderOverhead(o)

const toggleProfitabilityOrder = (orderKey: string) => {
  if (expandedProfitabilityOrders.value.has(orderKey)) {
    expandedProfitabilityOrders.value.delete(orderKey)
  } else {
    expandedProfitabilityOrders.value.add(orderKey)
  }
}

const orderOtherMaterialsSum = (order: any) => {
  return (order.orderMaterials || []).reduce((s: number, m: any) => s + (m.sum || 0), 0)
}

const openFotModal = (order: any, product: any) => {
  fotModalOrder.value = order
  fotModalProduct.value = product
  fotMonths.value = Array.from({ length: 12 }, (_, i) => ({
    month: new Date(2026, i).toLocaleString('ru-RU', { month: 'short' }),
    value: (product._fotMonths?.[i] ?? null) as number | null
  }))
  showFotModal.value = true
}

const saveFotModal = () => {
  if (!fotModalProduct.value || !fotModalOrder.value) return
  const total = fotMonths.value.reduce((s, m) => s + (m.value ?? 0), 0)
  fotModalProduct.value._fotMonths = fotMonths.value.map(m => m.value ?? 0)
  fotModalProduct.value.fot = total
  recalcProfitability(fotModalOrder.value)
  showFotModal.value = false
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null
const recalcProfitability = (order: any) => {
  const orderFot = order.products.reduce((s: number, p: any) => s + (p.fot || 0), 0)
  const orderDelivery = order.products.reduce((s: number, p: any) => s + (p.delivery || 0), 0)
  const orderExpense = order.totalMaterials + orderFot + orderDelivery
  const orderGross = order.totalSum - orderExpense
  const orderOverhead = orderExpense * (order._overheadPct ?? 50) / 100
  const orderNet = orderGross - orderOverhead
  order._fot = orderFot
  order._delivery = orderDelivery
  order._expense = orderExpense
  order._gross = orderGross
  order._overhead = orderOverhead
  order._net = orderNet

  order.products.forEach((p: any) => {
    const pExpense = (p.materialsCost || 0) + (p.fot || 0) + (p.delivery || 0)
    p._expense = pExpense
    p._gross = p.productSum - pExpense
    p._overhead = pExpense * (p._overheadPct ?? 50) / 100
    p._net = p._gross - p._overhead
  })

  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(async () => {
    try {
      await fetch('/sklad/api/reports/profitability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderKey: order.orderKey,
          overheadPct: order._overheadPct ?? 50,
          products: order.products.map((p: any) => ({
            productName: p.productName,
            fot: p.fot || 0,
            _fotMonths: p._fotMonths || [],
            delivery: p.delivery || 0,
            overheadPct: p._overheadPct ?? 50
          }))
        })
      })
    } catch { /* ignore */ }
  }, 500)
}

const filteredProductionReport = computed(() => {
  let result = productionReport.value
  if (productionCustomerQuery.value) {
    const q = productionCustomerQuery.value.toLowerCase()
    result = result.filter(r =>
      (r.customer || '').toLowerCase().includes(q)
    )
  }
  // Date filtering is done on backend now
  return result
})

const productionColumns: DataTableColumns<any> = [
  {
    type: 'expand',
    expandable: () => true,
    renderExpand: (row: any) => {
      const children: any[] = []

      const materialColumns = [
        h('th', { style: 'width:25%' }, 'Материал'),
        h('th', { style: 'width:10%' }, 'Кол-во'),
        h('th', { style: 'width:15%' }, 'Цена, ₽'),
        h('th', { style: 'width:15%' }, 'Сумма, ₽'),
        h('th', { style: 'width:20%' }, 'Заказ на перемещение')
      ]
      const materialRow = (m: any) => {
        const tonContent = !m.transferOrderNumbers || m.transferOrderNumbers.length === 0
          ? '—'
          : m.transferOrderNumbers.map((ton: string, i: number) =>
              h('span', {
                key: i,
                style: 'cursor:pointer; color:#2080f0; text-decoration:underline;',
                onClick: () => router.push({ path: '/transfer-orders', query: { search: ton } })
              }, ton)
            )
        return [
          h('td', m.name),
          h('td', h(NText, { strong: true }, { default: () => m.quantity })),
          h('td', h(NText, { depth: 3 }, { default: () => m.price ? fmtCurrency(m.price).toLocaleString('ru-RU') : '—' })),
          h('td', h(NText, { strong: true }, { default: () => m.sum ? fmtCurrency(m.sum).toLocaleString('ru-RU') : '—' })),
          h('td', tonContent)
        ]
      }

      // Products section first
      if (row.products?.length) {
        const orderKey = row.orderNumber
        const productColumns = [
          { type: 'expand' as const, expandable: () => true, renderExpand: (p: any) => {
            const total = p.materials.reduce((s: number, m: any) => s + (m.sum || 0), 0)
            return h('div', { style: 'margin:4px 8px 4px 16px; border-left:2px solid #2080f0; background:rgba(32,128,240,0.04); border-radius:0 4px 4px 0; padding:6px 10px' }, [
              h('div', { style: 'font-size:11px; font-weight:600; color:#2080f0; margin-bottom:4px' }, 'Состав изделия'),
              h(NTable, { size: 'small', singleLine: false, striped: true, style: 'background:transparent' }, {
                default: () => [
                  h('thead', [h('tr', materialColumns)]),
                  h('tbody', p.materials.map((m: any) => h('tr', [...materialRow(m)])))
                ]
              }),
              h('div', { style: 'text-align:right; font-size:13px; font-weight:700; margin-top:6px; padding-top:4px; border-top:1px solid rgba(255,255,255,0.08)' }, `Итого: ${fmtCurrency(total).toLocaleString('ru-RU')} ₽`)
            ])
          }},
          { title: 'Изделие', key: 'name', ellipsis: true, render: (p: any) => h(NText, { strong: true, style: 'padding-left:4px' }, { default: () => p.name }) },
          { title: 'Материалов', key: 'materialCount', width: 110, render: (p: any) => h(NTag, { type: 'info', quaternary: true, size: 'small' }, { default: () => `${p.materials?.length || 0} наим.` }) },
          { title: 'Сумма, ₽', key: 'totalSum', width: 110, render: (p: any) => h(NText, { strong: true, type: 'success' }, { default: () => fmtCurrency(p.totalSum || 0).toLocaleString('ru-RU') }) }
        ]
        children.push(h('div', { style: 'margin:0 4px 8px 4px; border:1px solid rgba(255,255,255,0.08); border-radius:8px; background:rgba(255,255,255,0.03)' }, [
          h('div', { style: 'padding:10px 14px 4px; font-size:12px; font-weight:700; color:#aaa; text-transform:uppercase; letter-spacing:0.5px' }, 'Изделия'),
          h(NDataTable, {
            columns: productColumns,
            data: row.products,
            size: 'small',
            bordered: false,
            singleLine: false,
            striped: true,
            rowKey: (p: any) => p.name,
            expandedRowKeys: productExpandedKeys.value[orderKey] || [],
            'onUpdate:expanded-row-keys': (keys: string[]) => {
              productExpandedKeys.value = { ...productExpandedKeys.value, [orderKey]: keys }
            },
            rowProps: (p: any) => ({
              style: 'cursor: pointer;',
              onClick: () => {
                const key = p.name
                const current = productExpandedKeys.value[orderKey] || []
                const idx = current.indexOf(key)
                const next = idx > -1 ? current.filter((k: string) => k !== key) : [...current, key]
                productExpandedKeys.value = { ...productExpandedKeys.value, [orderKey]: next }
              }
            })
          })
        ]))
      }

      // Order-level materials section (after products)
      if (row.orderMaterials?.length) {
        const total = row.orderMaterials.reduce((s: number, m: any) => s + (m.sum || 0), 0)
        children.push(h('div', { style: 'margin:8px 12px; border-left:3px solid #f0a020; background:rgba(240,160,32,0.06); border-radius:0 6px 6px 0; padding:8px 12px' }, [
          h('div', { style: 'font-size:12px; font-weight:700; color:#f0a020; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px' }, `Прочие материалы по заказу — ${fmtCurrency(total).toLocaleString('ru-RU')} ₽`),
          h(NTable, { size: 'small', singleLine: false, striped: true, style: 'background:transparent' }, {
             default: () => [
               h('thead', [h('tr', materialColumns)]),
               h('tbody', row.orderMaterials.map((m: any) => h('tr', [...materialRow(m)])))
             ]
           })
        ]))
      }
      return h('div', { style: 'padding:4px 0; background:rgba(255,255,255,0.02); border-top:1px solid rgba(255,255,255,0.06)' }, children)
    }
  },
  {
    title: 'Заказ покупателя',
    key: 'orderNumber',
    width: 240,
    render: (row: any) => h('div', { style: 'display:flex; align-items:center; gap:8px' }, [
      h('div', { style: 'width:3px; height:20px; background:#f0a020; border-radius:2px; flex-shrink:0' }),
      h(NText, { strong: true }, { default: () => row.orderNumber })
    ])
  },
  {
    title: 'Клиент',
    key: 'customer',
    width: 200,
    ellipsis: true,
    render: (row: any) => h(NText, { depth: 3 }, { default: () => row.customer || '—' })
  },
  {
    title: 'Изделий',
    key: 'productCount',
    width: 100,
    render: (row: any) => h(NTag, { type: 'info', quaternary: true, size: 'small' }, { default: () => `${row.products?.length || 0} шт.` })
  },
  {
    title: 'Материалов',
    key: 'materialCount',
    width: 120,
    render: (row: any) => {
      const count = (row.orderMaterials?.length || 0) + (row.products || []).reduce((s: number, p: any) => s + (p.materials?.length || 0), 0)
      return h(NTag, { type: 'success', quaternary: true, size: 'small' }, { default: () => `${count} наим.` })
    }
  },
  {
    title: 'Сумма материалов, ₽',
    key: 'orderTotal',
    width: 150,
    render: (row: any) => h(NText, { strong: true }, { default: () => row.orderTotal ? fmtCurrency(row.orderTotal).toLocaleString('ru-RU') : '—' })
  },
  {
    title: '',
    key: 'actions',
    width: 80,
    render: (row: any) => h(NButton, {
      size: 'small',
      quaternary: true,
      type: 'primary',
      onClick: () => saveProductionOrderToFile(row)
    }, { default: () => 'Сохранить' })
  },
]

// Load reports on mount
onMounted(async () => {
  await Promise.all([
    reportsStore.loadAllReports(),
    loadProductionReport(),
    loadProfitabilityReport(),
    ordersStore.loadOrdersFromApi(),
    toolsStore.loadToolsFromApi()
  ])
  const totalOrders = ordersReport.value.reduce((s, r) => s + r.items.length, 0)
  if (summaryMetrics.value[1]) summaryMetrics.value[1].value = `${filteredOrdersReport.value.length} заказов`

  const prodOrders = productionReport.value.length
  if (summaryMetrics.value[2]) summaryMetrics.value[2].value = `${prodOrders} заказов`

  const issuedCount = toolsStore.issuedTools.length
  if (summaryMetrics.value[3]) summaryMetrics.value[3].value = `${issuedCount} шт.`
})

onActivated(async () => {
  await Promise.all([
    reportsStore.loadAllReports(),
    loadProductionReport(),
    loadProfitabilityReport(),
    ordersStore.loadOrdersFromApi(),
    toolsStore.loadToolsFromApi()
  ])
  const totalOrders = ordersReport.value.reduce((s, r) => s + r.items.length, 0)
  if (summaryMetrics.value[1]) summaryMetrics.value[1].value = `${filteredOrdersReport.value.length} заказов`
  const prodOrders = productionReport.value.length
  if (summaryMetrics.value[2]) summaryMetrics.value[2].value = `${prodOrders} заказов`
  const issuedCount = toolsStore.issuedTools.length
  if (summaryMetrics.value[3]) summaryMetrics.value[3].value = `${issuedCount} шт.`
})

watch(productionSearchQuery, () => {
  loadProductionReport()
})

// Lazy-load profitability only when "main" tab is active
watch(activeTab, (tab) => {
  if (tab === 'main' && !profitabilityLoaded.value) {
    loadProfitabilityReport()
  }
})

// Debounced search and date filters for profitability
let profitabilityDebounce: ReturnType<typeof setTimeout> | null = null
watch([profitabilitySearchQuery, profitabilityDateRange], () => {
  if (profitabilityDebounce) clearTimeout(profitabilityDebounce)
  profitabilityDebounce = setTimeout(() => {
    if (profitabilityLoaded.value) {
      loadProfitabilityReport()
    }
  }, 400)
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
                h('th', 'Цена'),
                h('th', 'Кол-во'),
                h('th', 'Ед.'),
                h('th', 'Резерв'),
                h('th', 'Сумма')
              ])
            ]),
            h('tbody', row.items.map(item => h('tr', [
              h('td', item.productName),
              h('td', `${fmtCurrency(item.price || 0).toLocaleString('ru-RU')} ₽`),
              h('td', h(NText, { strong: true }, { default: () => item.quantity })),
              h('td', item.unit),
              h('td', h(NText, { strong: true }, { default: () => (item as any).reserve ? Number((item as any).reserve).toLocaleString('ru-RU') : '0' })),
              h('td', h(NText, { strong: true }, { default: () => `${fmtCurrency((item.price || 0) * item.quantity).toLocaleString('ru-RU')} ₽` }))
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
    title: 'Позиций ТМЦ',
    key: 'itemsCount',
    render: (row: OrderReportEntry) => h(NTag, { type: 'success', quaternary: true }, { default: () => `${row.items.length} наим.` })
  },
  {
    title: 'Резерв',
    key: 'totalReserve',
    render: (row: OrderReportEntry) => {
      const total = row.items.reduce((sum, i) => sum + ((i as any).reserve || 0), 0)
      return h(NText, { strong: true }, { default: () => total ? total.toLocaleString('ru-RU') : '0' })
    }
  }
]

const toolsDetailedColumns = [
  { title: 'Инструмент', key: 'name' },
  { title: 'Сотрудник', key: 'issuedToName' },
  {
    title: 'Срок (дней)', key: 'issuedAt',
    render: (row: any) => row.issuedAt ? Math.floor((Date.now() - new Date(row.issuedAt).getTime()) / (1000 * 60 * 60 * 24)) : '-'
  }
]

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

.profitability-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  table-layout: auto;
}
.profitability-table thead th {
  font-weight: 700;
  text-align: center;
  padding: 8px 4px;
  border: 1px solid #333;
  background: #1a1a1a;
  white-space: nowrap;
}
.profitability-table tbody td {
  text-align: center;
  padding: 6px 4px;
  border: 1px solid #333;
}
.profitability-table input[type="number"]::-webkit-inner-spin-button,
.profitability-table input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.profitability-table input[type="number"] {
  -moz-appearance: textfield;
}
.profitability-total td {
  font-weight: 700;
  background: #1a1a1a;
  border: 1px solid #333;
  padding: 6px 4px;
  text-align: center;
}
.profitability-table .n-input-number {
  width: 96px !important;
}
.profitability-order-header {
  padding: 10px 12px;
  background: #1a1a1a;
  border-radius: 6px;
  margin-bottom: 2px;
  transition: background 0.15s;
}
.profitability-order-header:hover {
  background: #252525;
}
.profitability-other td {
  color: #f0a020;
  font-style: italic;
}
.n-modal-body input[type="number"]:focus {
  border-color: #2080f0;
  box-shadow: 0 0 0 2px rgba(32, 128, 240, 0.2);
}
.n-modal-body input[type="number"]::-webkit-inner-spin-button,
.n-modal-body input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.n-modal-body input[type="number"] {
  -moz-appearance: textfield;
}
</style>
