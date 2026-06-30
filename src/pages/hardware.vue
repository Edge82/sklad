<template>
  <div class="hardware-page p-6">
    <div class="flex justify-between items-center mb-6">
      <div>
        <n-h1>Фурнитура</n-h1>
        <n-text depth="3">Склад фурнитуры — выдача и возврат</n-text>
      </div>
      <n-button v-if="!userStore.isWorker" type="primary" @click="handleSync">
        <template #icon><n-icon><SyncOutline /></n-icon></template>
        Синхронизировать
      </n-button>
    </div>

    <n-grid :cols="6" :x-gap="12" :y-gap="12" class="mb-6 items-stretch py-2">
      <n-gi>
        <n-card size="small" hoverable class="metric-card h-full flex flex-col justify-center" :class="{ 'active': filters.status === 'all' }" @click="filters.status = 'all'">
          <div class="flex items-center gap-3 py-1">
            <n-icon size="28" color="#18a058"><HammerOutline /></n-icon>
            <div>
              <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Всего позиций</n-text>
              <n-h3 class="m-0 leading-none">{{ items.length }}</n-h3>
            </div>
          </div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card size="small" hoverable class="metric-card h-full flex flex-col justify-center" :class="{ 'active': filters.status === 'in_stock' }" @click="filters.status = 'in_stock'">
          <div class="flex items-center gap-3 py-1">
            <n-icon size="28" color="#18a058"><CheckmarkCircleOutline /></n-icon>
            <div>
              <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">В наличии</n-text>
              <n-h3 class="m-0 leading-none">{{ inStockItems.length }}</n-h3>
            </div>
          </div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card size="small" hoverable class="metric-card h-full flex flex-col justify-center" :class="{ 'active': filters.status === 'issued' }" @click="filters.status = 'issued'">
          <div class="flex items-center gap-3 py-1">
            <n-icon size="28" color="#2080f0"><ConstructOutline /></n-icon>
            <div>
              <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Выдано</n-text>
              <n-h3 class="m-0 leading-none">{{ issuedItems.length }}</n-h3>
            </div>
          </div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card size="small" hoverable class="metric-card h-full flex flex-col justify-center" :class="{ 'active': filters.status === 'out_of_stock' }" @click="filters.status = 'out_of_stock'">
          <div class="flex items-center gap-3 py-1">
            <n-icon size="28" color="#d03050"><CloseCircleOutline /></n-icon>
            <div>
              <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Нет в наличии</n-text>
              <n-h3 class="m-0 leading-none">{{ outOfStockItems.length }}</n-h3>
            </div>
          </div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card size="small" hoverable class="metric-card h-full flex flex-col justify-center" :class="{ 'active': filters.status === 'discrepancy' }" @click="filters.status = 'discrepancy'">
          <div class="flex items-center gap-3 py-1">
            <n-icon size="28" color="#d03050"><AlertCircleOutline /></n-icon>
            <div>
              <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Инвентаризация</n-text>
              <n-h3 class="m-0 leading-none">{{ discrepancyItems.length }}</n-h3>
            </div>
          </div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card border-variant="dark" class="metric-card revenue-card h-full flex flex-col justify-center" size="small">
          <div class="flex items-center gap-3 py-1">
            <n-icon size="28" color="#18a058" :component="CashOutline" />
            <div>
              <n-text depth="3" class="revenue-label block mb-1">Общая стоимость</n-text>
              <n-h3 class="m-0 leading-none revenue-value text-[22px]">{{ userStore.canSeePrices ? formatCurrency(totalStockValue) : '-' }}</n-h3>
            </div>
          </div>
        </n-card>
      </n-gi>
    </n-grid>

    <n-card class="mb-4" size="small">
      <n-space align="center" :size="[16, 12]">
        <n-input v-model:value="filters.search" placeholder="Поиск фурнитуры..." clearable class="w-96!">
          <template #prefix><n-icon><SearchOutline /></n-icon></template>
        </n-input>
        <n-select v-model:value="filters.status" placeholder="Все статусы" :options="[
          { label: 'Все позиции', value: 'all' },
          { label: 'В наличии', value: 'in_stock' },
          { label: 'Выдано', value: 'issued' },
          { label: 'Нет в наличии', value: 'out_of_stock' },
          { label: '🔧 Инвентаризация', value: 'discrepancy' }
        ]" clearable class="w-64!" />
        <n-button @click="resetFilters" quaternary type="warning">Сбросить фильтры</n-button>
        <n-tag v-if="filters.status !== 'all'" closable @close="filters.status = 'all'">{{ statusLabel(filters.status) }}</n-tag>
      </n-space>
    </n-card>

    <n-card size="small">
      <div class="flex justify-between items-center mb-4">
        <n-text depth="3">Всего: {{ filteredItems.length }}</n-text>
        <div class="flex items-center gap-2">
          <n-text>Показывать:</n-text>
          <n-select v-model:value="itemsPerPage" :options="pageSizeOptions" class="w-24!" />
        </div>
      </div>
      <n-data-table :columns="columns" :data="filteredItems" :pagination="pagination" :row-props="(row: any) => ({
        class: row.hasDiscrepancy ? 'discrepancy-row' : '',
        style: 'cursor: pointer',
        onClick: () => { if (row.refKey) router.push(`/hardware/${encodeURIComponent(row.refKey)}`) }
      })" />
    </n-card>
  </div>

  <n-modal v-model:show="showIssueModal" preset="card" title="Выдача фурнитуры" class="w-md!">
    <n-form v-if="selectedItem" :model="issueForm" label-placement="top">
      <n-form-item label="Фурнитура">
        <n-text strong>{{ selectedItem.name }}</n-text>
        <n-text depth="3" class="block text-sm">{{ selectedItem.sku }}</n-text>
      </n-form-item>
      <n-form-item label="Доступно на складе">
        <n-text type="success">{{ selectedItem.availableStock }} {{ selectedItem.unit || 'шт' }}</n-text>
      </n-form-item>
      <n-form-item label="Кол-во" path="quantity" required>
        <n-input-number v-model:value="issueForm.quantity" :min="1" :max="selectedItem.availableStock" placeholder="Введите количество" />
      </n-form-item>
      <n-form-item label="Кому выдать" path="employeeId" required>
        <n-select v-model:value="issueForm.employeeId" :options="employeeOptions" placeholder="Выберите сотрудника" filterable />
      </n-form-item>
      <n-form-item label="Заказ покупателя">
        <n-select v-model:value="issueForm.orderId" :options="orderOptions" placeholder="Выберите заказ (необязательно)" filterable clearable />
      </n-form-item>
    </n-form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <n-button @click="showIssueModal = false">Отмена</n-button>
        <n-button type="primary" @click="confirmIssue" :loading="issuing">Выдать</n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, h, reactive, computed, onMounted, onActivated, watch } from 'vue'
import { useRouter } from 'vue-router'
import { NTag, NButton, NSpace, NIcon, NText, NGrid, NGi, NCard, NDataTable, NInput, NSelect, NModal, NForm, NFormItem, useMessage, type DataTableColumns } from 'naive-ui'
import { useHardwareStore } from '@/stores/hardware'
import { useEmployeesStore } from '@/stores/employees'
import { useOrdersStore } from '@/stores/orders'
import { useUserStore } from '@/stores/user'
import { AlertCircleOutline, CashOutline, HammerOutline, ConstructOutline, CheckmarkCircleOutline, CloseCircleOutline, SearchOutline, SyncOutline, LogInOutline } from '@vicons/ionicons5'

const router = useRouter()
const hardwareStore = useHardwareStore()
const userStore = useUserStore()
const employeesStore = useEmployeesStore()
const ordersStore = useOrdersStore()
const message = useMessage()

const items = computed(() => hardwareStore.hardware)
const inStockItems = computed(() => items.value.filter(i => i.availableStock > 0))
const issuedItems = computed(() => items.value.filter(i => i.checkedOut > 0))
const outOfStockItems = computed(() => items.value.filter(i => i.currentStock <= 0 && i.checkedOut <= 0))
const discrepancyItems = computed(() => items.value.filter(i => i.hasDiscrepancy))

const filters = reactive({ search: '', status: 'all' as string })
watch(filters, () => { currentPage.value = 1 })

const filteredItems = computed(() => {
  return items.value.filter(item => {
    const q = filters.search.toLowerCase()
    const matchesSearch = !q || item.name.toLowerCase().includes(q) || item.inventoryNumber.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q)
    if (filters.status === 'all') return matchesSearch
    if (filters.status === 'in_stock') return matchesSearch && item.availableStock > 0
    if (filters.status === 'issued') return matchesSearch && item.checkedOut > 0
    if (filters.status === 'out_of_stock') return matchesSearch && item.currentStock <= 0 && item.checkedOut <= 0
    if (filters.status === 'discrepancy') return matchesSearch && item.hasDiscrepancy
    return matchesSearch
  })
})

const statusLabel = (s: string) => {
  const map: Record<string, string> = { 'in_stock': 'В наличии', 'issued': 'Выдано', 'out_of_stock': 'Нет в наличии', 'discrepancy': 'Инвентаризация' }
  return map[s] || s
}

const resetFilters = () => { filters.search = ''; filters.status = 'all' }

const currentPage = ref(1)
const itemsPerPage = ref(10)
const pageSizeOptions = [{ label: '10', value: 10 }, { label: '25', value: 25 }, { label: '50', value: 50 }, { label: '100', value: 100 }]

const pagination = computed(() => ({
  pageSize: itemsPerPage.value,
  page: currentPage.value,
  pageCount: Math.ceil(filteredItems.value.length / itemsPerPage.value),
  showSizePicker: true,
  pageSizes: [10, 25, 50, 100],
  onChange: (page: number) => { currentPage.value = page },
  onUpdatePageSize: (pageSize: number) => { itemsPerPage.value = pageSize; currentPage.value = 1 }
}))

const formatCurrency = (amount: number) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(amount)
const totalStockValue = computed(() => filteredItems.value.reduce((sum, i) => sum + (Number(i.price) || 0) * (i.currentStock || 0), 0))

const showIssueModal = ref(false)
const selectedItem = ref<any>(null)
const issuing = ref(false)
const issueForm = reactive({ employeeId: null as string | null, quantity: 1, orderId: null as string | null })
const employeeOptions = computed(() => employeesStore.employees.map(e => ({ label: e.name, value: e.id })))
const orderOptions = computed(() => ordersStore.orders.map(o => ({ label: `${o.orderNumber} — ${o.customerName}`, value: o.id })))

const handleIssue = async (item: any) => {
  selectedItem.value = item
  issueForm.employeeId = null
  issueForm.quantity = 1
  issueForm.orderId = null
  await ordersStore.loadOrdersFromApi()
  showIssueModal.value = true
}

const confirmIssue = async () => {
  if (!selectedItem.value || !issueForm.employeeId) { message.warning('Выберите сотрудника'); return }
  if (selectedItem.value.hasDiscrepancy) { message.error('Невозможно выдать — количество в 1С меньше выданного. Проведите инвентаризацию.'); return }
  if (!issueForm.quantity || issueForm.quantity < 1) { message.warning('Укажите количество'); return }
  const employee = employeesStore.employees.find(e => e.id === issueForm.employeeId)
  if (!employee) return
  const selectedOrder = ordersStore.orders.find(o => o.id === issueForm.orderId)
  const orderNumber = selectedOrder ? selectedOrder.orderNumber : ''
  issuing.value = true
  try {
    await hardwareStore.issueHardware(selectedItem.value.refKey, employee.id, employee.name, issueForm.quantity, orderNumber)
    message.success(`Выдано ${issueForm.quantity} шт: ${employee.name}`)
    showIssueModal.value = false
  } catch (err: any) { message.error(err.message || 'Ошибка при выдаче') }
  finally { issuing.value = false }
}

const columns: DataTableColumns<any> = [
  { title: 'Наименование', key: 'name' },
  { title: 'Ед. изм.', key: 'unit', width: 80, render(row) { return row.unit || 'шт' } },
  { title: 'На складе', key: 'currentStock', width: 100, render(row) {
    const color = row.availableStock > 0 ? '#18a058' : row.currentStock > 0 ? '#f0a020' : '#d03050'
    return h('span', { style: { color, fontWeight: 'bold' } }, `${row.currentStock}`)
  }},
  { title: 'Выдано', key: 'checkedOut', width: 80, render(row) {
    return row.checkedOut > 0 ? h('span', { style: { color: '#2080f0' } }, `${row.checkedOut}`) : h('span', { class: 'text-gray-600' }, '0')
  }},
  { title: 'Цена', key: 'price', width: 120, render(row) { return userStore.canSeePrices && row.price ? formatCurrency(row.price) : '-' } },
  { title: 'Статус', key: 'status', width: 140, render(row) {
    let label = 'На складе'
    let type: 'success' | 'warning' | 'info' | 'error' = 'success'
    if (row.hasDiscrepancy) { label = '🔧 Инвентаризация'; type = 'error' }
    else if (row.currentStock <= 0 && row.checkedOut <= 0) { label = 'Нет в наличии'; type = 'error' }
    else if (row.checkedOut > 0 && row.availableStock <= 0) { label = 'Всё выдано'; type = 'info' }
    else if (row.checkedOut > 0) { label = 'Частично выдано'; type = 'warning' }
    return h(NTag, { type, size: 'small' }, { default: () => label })
  }},
  { title: 'Место хранения', key: 'location', render(row) { return row.location || '—' } },
  { title: 'Склад', key: 'warehouse', width: 150, render(row) { return row.warehouse || '—' } },
  { title: 'Действия', key: 'actions', width: 140, render(row) {
    if (userStore.isWorker) return null
    if (row.hasDiscrepancy) {
      return h(NButton, { size: 'tiny', type: 'error', ghost: true, onClick: (e: MouseEvent) => { e.stopPropagation(); router.push(`/hardware/${encodeURIComponent(row.refKey)}`) } }, { default: () => '🔧 Инвентаризация' })
    }
    if (row.availableStock > 0) {
      return h(NButton, { size: 'tiny', type: 'primary', ghost: true, onClick: (e: MouseEvent) => { e.stopPropagation(); handleIssue(row) } }, { icon: () => h(NIcon, null, { default: () => h(LogInOutline) }), default: () => 'Выдать' })
    }
    return null
  }}
]

const handleSync = async () => {
  try { await hardwareStore.loadHardwareFromApi(); message.success('Данные синхронизированы') }
  catch { message.error('Ошибка синхронизации') }
}

onMounted(async () => { await Promise.all([hardwareStore.loadHardwareFromApi(), employeesStore.loadEmployeesFromApi()]) })
onActivated(async () => { await Promise.all([hardwareStore.loadHardwareFromApi(), employeesStore.loadEmployeesFromApi()]) })
</script>

<style scoped>
.hardware-page { max-width: 1600px; margin: 0 auto; padding: 0 24px; }
@media (max-width: 768px) { .hardware-page { padding: 0 12px; } }
.metric-card { height: 100%; background-color: #2a2a2a; border-bottom: 4px solid transparent; transition: all 0.3s ease; cursor: pointer; }
.metric-card:not(.revenue-card):hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); background-color: #333; }
.metric-card.active { background-color: #333; border-bottom-color: #18a058; }
.revenue-card { background: rgba(24, 160, 88, 0.1) !important; border: 1px solid rgba(24, 160, 88, 0.3) !important; cursor: default !important; }
.revenue-label { color: #18a058 !important; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; font-size: 10px; line-height: 1; margin-bottom: 4px; }
.revenue-value { color: #18a058 !important; font-weight: 900 !important; }
:deep(.discrepancy-row) { background-color: #3a1a1a !important; }
:deep(.discrepancy-row td) { color: #ff4444 !important; background-color: transparent !important; }
</style>
