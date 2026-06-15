<template>
  <div class="tools-page p-6">
    <div class="flex justify-between items-center mb-6">
      <div>
        <n-h1>Учёт инструментов</n-h1>
        <n-text depth="3">Инвентарь, МБП, хоз.принадлежности</n-text>
      </div>
      <n-button v-if="!userStore.isWorker" type="primary" @click="handleSync">
        <template #icon><n-icon><SyncOutline /></n-icon></template>
        Синхронизировать
      </n-button>
    </div>

    <n-grid :cols="5" :x-gap="12" :y-gap="12" class="mb-6 items-stretch py-2">
      <n-gi>
        <n-card
          size="small"
          hoverable
          class="metric-card h-full flex flex-col justify-center"
          :class="{ 'active': filters.status === 'all' }"
          @click="filters.status = 'all'"
        >
          <div class="flex items-center gap-3 py-1">
            <n-icon size="28" color="#18a058">
              <HammerOutline />
            </n-icon>
            <div>
              <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Всего позиций</n-text>
              <n-h3 class="m-0 leading-none">{{ items.length }}</n-h3>
            </div>
          </div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card
          size="small"
          hoverable
          class="metric-card h-full flex flex-col justify-center"
          :class="{ 'active': filters.status === 'in_stock' }"
          @click="filters.status = 'in_stock'"
        >
          <div class="flex items-center gap-3 py-1">
            <n-icon size="28" color="#18a058">
              <CheckmarkCircleOutline />
            </n-icon>
            <div>
              <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">В наличии</n-text>
              <n-h3 class="m-0 leading-none">{{ inStockItems.length }}</n-h3>
            </div>
          </div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card
          size="small"
          hoverable
          class="metric-card h-full flex flex-col justify-center"
          :class="{ 'active': filters.status === 'issued' }"
          @click="filters.status = 'issued'"
        >
          <div class="flex items-center gap-3 py-1">
            <n-icon size="28" color="#2080f0">
              <ConstructOutline />
            </n-icon>
            <div>
              <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Выдано</n-text>
              <n-h3 class="m-0 leading-none">{{ issuedItems.length }}</n-h3>
            </div>
          </div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card
          size="small"
          hoverable
          class="metric-card h-full flex flex-col justify-center"
          :class="{ 'active': filters.status === 'out_of_stock' }"
          @click="filters.status = 'out_of_stock'"
        >
          <div class="flex items-center gap-3 py-1">
            <n-icon size="28" color="#d03050">
              <CloseCircleOutline />
            </n-icon>
            <div>
              <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Нет в наличии</n-text>
              <n-h3 class="m-0 leading-none">{{ outOfStockItems.length }}</n-h3>
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
        <n-input
          v-model:value="filters.search"
          placeholder="Поиск материала..."
          clearable
          class="w-96!"
        >
          <template #prefix>
            <n-icon><SearchOutline /></n-icon>
          </template>
        </n-input>

        <n-select
          v-model:value="filters.status"
          placeholder="Все статусы"
          :options="[
            { label: 'Все позиции', value: 'all' },
            { label: 'В наличии', value: 'in_stock' },
            { label: 'Выдано', value: 'issued' },
            { label: 'Нет в наличии', value: 'out_of_stock' }
          ]"
          clearable
          class="w-56!"
        />

        <n-button @click="resetFilters" quaternary type="warning">
          Сбросить фильтры
        </n-button>

        <n-tag v-if="filters.status !== 'all'" closable @close="filters.status = 'all'">
          {{ statusLabel(filters.status) }}
        </n-tag>
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
      <n-data-table
        :columns="columns"
        :data="filteredItems"
        :pagination="pagination"
        :row-props="() => ({})"
      />
    </n-card>
  </div>

  <n-modal v-model:show="showIssueModal" preset="card" title="Выдача материала" class="w-md!">
    <n-form v-if="selectedItem" :model="issueForm" label-placement="top">
      <n-form-item label="Материал">
        <n-text strong>{{ selectedItem.name }}</n-text>
        <n-text depth="3" class="block text-sm">{{ selectedItem.sku }}</n-text>
      </n-form-item>
      <n-form-item label="Доступно на складе">
        <n-text type="success">{{ selectedItem.availableStock }} {{ selectedItem.unit || 'шт' }}</n-text>
      </n-form-item>
      <n-form-item label="Кому выдать" path="employeeId" required>
        <n-select
          v-model:value="issueForm.employeeId"
          :options="employeeOptions"
          placeholder="Выберите сотрудника"
          filterable
        />
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
import { ref, h, reactive, computed, onMounted, watch } from 'vue'
import {
  NTag,
  NButton,
  NSpace,
  NIcon,
  NText,
  NGrid,
  NGi,
  NCard,
  NDataTable,
  NInput,
  NSelect,
  NModal,
  NForm,
  NFormItem,
  useDialog,
  useMessage,
  type DataTableColumns
} from 'naive-ui'
import { useToolsStore } from '@/stores/tools'
import { useEmployeesStore } from '@/stores/employees'
import { useUserStore } from '@/stores/user'
import {
  TrashOutline,
  QrCodeOutline,
  CashOutline,
  BuildOutline,
  HammerOutline,
  ConstructOutline,
  CheckmarkCircleOutline,
  CloseCircleOutline,
  SearchOutline,
  SyncOutline,
  LogInOutline,
  LogOutOutline
} from '@vicons/ionicons5'

const toolsStore = useToolsStore()
const userStore = useUserStore()
const employeesStore = useEmployeesStore()
const message = useMessage()

const items = computed(() => toolsStore.tools)

const inStockItems = computed(() =>
  items.value.filter(i => i.availableStock > 0)
)

const issuedItems = computed(() =>
  items.value.filter(i => i.checkedOut > 0)
)

const outOfStockItems = computed(() =>
  items.value.filter(i => i.currentStock <= 0 && i.checkedOut <= 0)
)

const filters = reactive({
  search: '',
  status: 'all' as string
})

watch(filters, () => { currentPage.value = 1 })

const filteredItems = computed(() => {
  return items.value.filter(item => {
    const q = filters.search.toLowerCase()
    const matchesSearch = !q ||
      item.name.toLowerCase().includes(q) ||
      item.inventoryNumber.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q)

    if (filters.status === 'all') return matchesSearch
    if (filters.status === 'in_stock') return matchesSearch && item.availableStock > 0
    if (filters.status === 'issued') return matchesSearch && item.checkedOut > 0
    if (filters.status === 'out_of_stock') return matchesSearch && item.currentStock <= 0 && item.checkedOut <= 0
    return matchesSearch
  })
})

const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    'in_stock': 'В наличии',
    'issued': 'Выдано',
    'out_of_stock': 'Нет в наличии'
  }
  return map[s] || s
}

const resetFilters = () => {
  filters.search = ''
  filters.status = 'all'
}

const currentPage = ref(1)
const itemsPerPage = ref(10)

const pageSizeOptions = [
  { label: '10', value: 10 },
  { label: '25', value: 25 },
  { label: '50', value: 50 },
  { label: '100', value: 100 }
]

const pagination = computed(() => ({
  pageSize: itemsPerPage.value,
  page: currentPage.value,
  pageCount: Math.ceil(filteredItems.value.length / itemsPerPage.value),
  showSizePicker: true,
  pageSizes: [10, 25, 50, 100],
  onChange: (page: number) => { currentPage.value = page },
  onUpdatePageSize: (pageSize: number) => {
    itemsPerPage.value = pageSize
    currentPage.value = 1
  }
}))

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(amount)
}

const totalStockValue = computed(() => {
  return filteredItems.value.reduce((sum, i) => sum + (Number(i.price) || 0) * (i.currentStock || 0), 0)
})

// Issue/Return state
const showIssueModal = ref(false)
const selectedItem = ref<any>(null)
const issuing = ref(false)

const issueForm = reactive({
  employeeId: null as string | null
})

const employeeOptions = computed(() =>
  employeesStore.employees.map(e => ({ label: e.name, value: e.id }))
)

const handleIssue = (item: any) => {
  selectedItem.value = item
  issueForm.employeeId = null
  showIssueModal.value = true
}

const confirmIssue = async () => {
  if (!selectedItem.value || !issueForm.employeeId) {
    message.warning('Выберите сотрудника')
    return
  }
  const employee = employeesStore.employees.find(e => e.id === issueForm.employeeId)
  if (!employee) return

  issuing.value = true
  try {
    await toolsStore.issueTool(selectedItem.value.refKey, employee.id, employee.name)
    message.success(`Выдано: ${employee.name}`)
    showIssueModal.value = false
  } catch (err: any) {
    message.error(err.message || 'Ошибка при выдаче')
  } finally {
    issuing.value = false
  }
}

const handleReturn = async (item: any) => {
  if (item.checkedOut <= 0) {
    message.warning('Нет выданных единиц для возврата')
    return
  }
  try {
    // Find the first checkout for this material
    const checkout = toolsStore.checkouts.find((c: any) => c.material_ref_key === item.refKey)
    if (!checkout) {
      message.warning('Не найдена запись о выдаче')
      return
    }
    await toolsStore.returnTool(checkout.id)
    message.success('Возвращено на склад')
  } catch (err: any) {
    message.error(err.message || 'Ошибка при возврате')
  }
}

const columns: DataTableColumns<any> = [
  {
    title: 'Артикул',
    key: 'inventoryNumber',
    width: 140,
    render(row) {
      return h('span', { class: 'font-mono text-gray-400 text-xs' }, row.inventoryNumber || '—')
    }
  },
  { title: 'Наименование', key: 'name' },
  {
    title: 'Ед. изм.',
    key: 'unit',
    width: 80,
    render(row) { return row.unit || 'шт' }
  },
  {
    title: 'На складе',
    key: 'currentStock',
    width: 100,
    render(row) {
      const color = row.availableStock > 0 ? '#18a058' : row.currentStock > 0 ? '#f0a020' : '#d03050'
      return h('span', { style: { color, fontWeight: 'bold' } }, `${row.currentStock}`)
    }
  },
  {
    title: 'Выдано',
    key: 'checkedOut',
    width: 80,
    render(row) {
      return row.checkedOut > 0
        ? h('span', { style: { color: '#2080f0' } }, `${row.checkedOut}`)
        : h('span', { class: 'text-gray-600' }, '0')
    }
  },
  {
    title: 'Цена',
    key: 'price',
    width: 120,
    render(row) {
      return userStore.canSeePrices && row.price ? formatCurrency(row.price) : '-'
    }
  },
  {
    title: 'Статус',
    key: 'status',
    width: 120,
    render(row) {
      let label = 'На складе'
      let type: 'success' | 'warning' | 'info' | 'error' = 'success'
      if (row.currentStock <= 0 && row.checkedOut <= 0) {
        label = 'Нет в наличии'
        type = 'error'
      } else if (row.checkedOut > 0 && row.availableStock <= 0) {
        label = 'Всё выдано'
        type = 'info'
      } else if (row.checkedOut > 0) {
        label = 'Частично выдано'
        type = 'warning'
      }
      return h(NTag, { type, size: 'small' }, { default: () => label })
    }
  },
  {
    title: 'Место хранения',
    key: 'location',
    render(row) {
      if (row.checkedOut > 0) {
        const checkout = toolsStore.checkouts.find((c: any) => c.material_ref_key === row.refKey)
        if (checkout) {
          return h('span', { style: { color: '#2080f0' } }, `Выдан: ${checkout.employee_name}`)
        }
      }
      return row.location || '—'
    }
  },
  {
    title: 'Действия',
    key: 'actions',
    width: 120,
    render(row) {
      if (userStore.isWorker) return null
      const buttons: any[] = []
      if (row.availableStock > 0) {
        buttons.push(h(NButton, {
          size: 'tiny',
          type: 'primary',
          ghost: true,
          onClick: (e: MouseEvent) => { e.stopPropagation(); handleIssue(row) }
        }, { icon: () => h(NIcon, null, { default: () => h(LogInOutline) }), default: () => 'Выдать' }))
      }
      if (row.checkedOut > 0) {
        buttons.push(h(NButton, {
          size: 'tiny',
          type: 'warning',
          ghost: true,
          onClick: (e: MouseEvent) => { e.stopPropagation(); handleReturn(row) }
        }, { icon: () => h(NIcon, null, { default: () => h(LogOutOutline) }), default: () => 'Сдать' }))
      }
      return h(NSpace, { wrap: false, size: 4 }, { default: () => buttons })
    }
  }
]

const handleSync = async () => {
  try {
    await toolsStore.loadToolsFromApi()
    message.success('Данные синхронизированы')
  } catch {
    message.error('Ошибка синхронизации')
  }
}

onMounted(async () => {
  await Promise.all([
    toolsStore.loadToolsFromApi(),
    employeesStore.loadEmployeesFromApi()
  ])
})
</script>

<style scoped>
.tools-page {
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 24px;
}
@media (max-width: 768px) {
  .tools-page {
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
