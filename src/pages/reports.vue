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
          <n-grid :cols="2" :x-gap="12" class="mb-6">
            <n-gi>
              <n-card title="Топ сотрудников (активность)">
                <n-list hoverable clickable>
                  <n-list-item v-for="emp in topEmployees" :key="emp.id">
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
            <div class="flex gap-3">
              <n-input
                v-model:value="productionSearchQuery"
                type="text"
                placeholder="Поиск по заказу или изделию..."
                clearable
                style="width: 500px"
              />
            </div>
          </div>
          <n-card border-variant="dark">
    <n-data-table
      :columns="productionColumns"
      :data="productionReport"
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
</template>

<script setup lang="ts">
import { ref, computed, h, onMounted, watch, markRaw } from 'vue'
import { storeToRefs } from 'pinia'
import { useInventoryStore } from '@/stores/inventory'
import { useToolsStore } from '@/stores/tools'
import { useReportsStore } from '@/stores/reports'
import { useOrdersStore } from '@/stores/orders'
import {
  type MaterialInvoiceItem
} from '@/types'
import {
  StatsChartOutline, CubeOutline
} from '@vicons/ionicons5'
import {
  NSelect, NIcon, NH1, NText, NGrid, NGi, NCard, NH3,
  NDatePicker, NDataTable, NList, NListItem,
  NThing, NAvatar, NTag, NH2, NTable, NEmpty,
  NInput, type DataTableColumns
} from 'naive-ui'

const inventoryStore = useInventoryStore()
const toolsStore = useToolsStore()
const reportsStore = useReportsStore()
const ordersStore = useOrdersStore()
const { ordersReport, topEmployees } = storeToRefs(reportsStore)

const activeTab = ref('main')
const productionReport = ref<any[]>([])
const productionSearchQuery = ref('')
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

const loadProductionReport = async () => {
  try {
    const params = new URLSearchParams()
    if (productionSearchQuery.value) {
      params.set('search', productionSearchQuery.value)
    }
    const qs = params.toString()
    const res = await fetch(`/sklad/api/reports/production-materials${qs ? '?' + qs : ''}`)
    if (res.ok) {
      const data = await res.json()
      productionReport.value = data.data || []
    }
  } catch { /* ignore */ }
}

const productionColumns: DataTableColumns<any> = [
  {
    type: 'expand',
    expandable: () => true,
    renderExpand: (row: any) => {
      const children: any[] = []

      const materialColumns = [
        h('th', { style: 'width:30%' }, 'Материал'),
        h('th', { style: 'width:15%' }, 'Кол-во'),
        h('th', { style: 'width:25%' }, 'Цена, ₽'),
        h('th', { style: 'width:30%' }, 'Сумма, ₽')
      ]
      const materialRow = (m: any) => [
        h('td', m.name),
        h('td', h(NText, { strong: true }, { default: () => m.quantity })),
        h('td', h(NText, { depth: 3 }, { default: () => m.price ? Number(m.price).toLocaleString('ru-RU') : '—' })),
        h('td', h(NText, { strong: true }, { default: () => m.sum ? Number(m.sum).toLocaleString('ru-RU') : '—' }))
      ]

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
                  h('tbody', p.materials.map((m: any) => h('tr', materialRow(m))))
                ]
              }),
              h('div', { style: 'text-align:right; font-size:13px; font-weight:700; margin-top:6px; padding-top:4px; border-top:1px solid rgba(255,255,255,0.08)' }, `Итого: ${total.toLocaleString('ru-RU')} ₽`)
            ])
          }},
          { title: 'Изделие', key: 'name', ellipsis: true, render: (p: any) => h(NText, { strong: true, style: 'padding-left:4px' }, { default: () => p.name }) },
          { title: 'Материалов', key: 'materialCount', width: 110, render: (p: any) => h(NTag, { type: 'info', quaternary: true, size: 'small' }, { default: () => `${p.materials?.length || 0} наим.` }) },
          { title: 'Сумма, ₽', key: 'totalSum', width: 110, render: (p: any) => h(NText, { strong: true, type: 'success' }, { default: () => (p.totalSum || 0).toLocaleString('ru-RU') }) }
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
          h('div', { style: 'font-size:12px; font-weight:700; color:#f0a020; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px' }, `Прочие материалы по заказу — ${total.toLocaleString('ru-RU')} ₽`),
          h(NTable, { size: 'small', singleLine: false, striped: true, style: 'background:transparent' }, {
            default: () => [
              h('thead', [h('tr', materialColumns)]),
              h('tbody', row.orderMaterials.map((m: any) => h('tr', materialRow(m))))
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
    render: (row: any) => h(NText, { strong: true }, { default: () => row.orderTotal ? Number(row.orderTotal).toLocaleString('ru-RU') : '—' })
  },
]

// Load reports on mount
onMounted(async () => {
  await Promise.all([
    reportsStore.loadAllReports(),
    loadProductionReport(),
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
              h('td', `${(item.price || 0).toLocaleString('ru-RU')} ₽`),
              h('td', h(NText, { strong: true }, { default: () => item.quantity })),
              h('td', item.unit),
              h('td', h(NText, { strong: true }, { default: () => (item as any).reserve ? Number((item as any).reserve).toLocaleString('ru-RU') : '0' })),
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
</style>
