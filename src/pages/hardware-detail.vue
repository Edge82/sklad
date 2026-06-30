<template>
  <div class="hardware-detail-page p-6">
    <n-space vertical :size="16">
      <n-alert v-if="hasDiscrepancy" type="error" title="Требуется инвентаризация" class="w-full">
        Количество в 1С ({{ onecQuantity }}) меньше выданного сотрудникам ({{ issuedTotal }}). Необходимо вернуть фурнитуру, чтобы восстановить баланс.
      </n-alert>
      <div class="flex items-center gap-4">
        <n-button quaternary @click="router.push('/hardware')">
          <template #icon><n-icon><ArrowBackOutline /></n-icon></template>
          Назад к фурнитуре
        </n-button>
        <n-divider vertical />
        <n-h1 class="m-0">{{ stock ? stock.name : '...' }}</n-h1>
      </div>

      <n-grid :cols="5" :x-gap="12" :y-gap="12" class="items-stretch py-2">
        <n-gi>
          <n-card size="small" class="metric-card h-full flex flex-col justify-center">
            <div class="flex items-center gap-3 py-1">
              <n-icon size="28" color="#2080f0"><CubeOutline /></n-icon>
              <div>
                <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">На складе</n-text>
                <n-h3 class="m-0 leading-none">{{ totalQuantity }}</n-h3>
              </div>
            </div>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card size="small" class="metric-card h-full flex flex-col justify-center">
            <div class="flex items-center gap-3 py-1">
              <n-icon size="28" color="#2080f0"><ConstructOutline /></n-icon>
              <div>
                <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Выдано</n-text>
                <n-h3 class="m-0 leading-none" style="color: #2080f0">{{ issuedTotal }}</n-h3>
              </div>
            </div>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card size="small" class="metric-card h-full flex flex-col justify-center">
            <div class="flex items-center gap-3 py-1">
              <n-icon size="28" :color="availableStock > 0 ? '#18a058' : '#d03050'"><CheckmarkCircleOutline /></n-icon>
              <div>
                <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Доступно</n-text>
                <n-h3 class="m-0 leading-none" :style="{ color: availableStock > 0 ? '#18a058' : '#d03050' }">{{ availableStock }}</n-h3>
              </div>
            </div>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card size="small" class="metric-card h-full flex flex-col justify-center">
            <div class="flex items-center gap-3 py-1">
              <n-icon size="28" color="#18a058"><PeopleOutline /></n-icon>
              <div>
                <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Сотрудников</n-text>
                <n-h3 class="m-0 leading-none">{{ activeEmployees.length }}</n-h3>
              </div>
            </div>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card size="small" class="metric-card h-full flex flex-col justify-center">
            <div class="flex items-center gap-3 py-1">
              <n-icon size="28" color="#f0a020"><CubeOutline /></n-icon>
              <div>
                <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">В 1С</n-text>
                <n-h3 class="m-0 leading-none">{{ onecQuantity }}</n-h3>
              </div>
            </div>
          </n-card>
        </n-gi>
      </n-grid>

      <n-card size="small">
        <div class="flex justify-between items-center mb-4">
          <n-h3 class="m-0">Выдано сотрудникам</n-h3>
          <n-button size="small" @click="loadData" :loading="loading">
            <template #icon><n-icon><RefreshOutline /></n-icon></template>
            Обновить
          </n-button>
        </div>
        <n-data-table :columns="columns" :data="activeEmployees" :pagination="false" :scroll-x="600" />
        <n-empty v-if="activeEmployees.length === 0" description="Нет активных выдач" />
      </n-card>
    </n-space>
  </div>

  <n-modal v-model:show="showReturnModal" preset="card" title="Возврат на склад" class="w-md!">
    <n-form v-if="selectedEmployee" label-placement="top">
      <n-form-item label="Сотрудник">
        <n-text strong>{{ selectedEmployee.employeeName }}</n-text>
      </n-form-item>
      <n-form-item label="Выдано">
        <n-text type="warning">{{ selectedEmployee.quantity }} {{ stock?.unit || 'шт' }}</n-text>
      </n-form-item>
      <n-form-item label="Количество возврата" path="quantity" required>
        <n-input-number v-model:value="returnForm.quantity" :min="1" :max="selectedEmployee.quantity" placeholder="Введите количество" />
      </n-form-item>
    </n-form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <n-button @click="showReturnModal = false">Отмена</n-button>
        <n-button type="warning" @click="confirmReturn" :loading="returning">Сдать</n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onActivated, watch, h, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { NAlert, NButton, NH1, NH3, NCard, NDataTable, NDivider, NEmpty, NGrid, NGi, NIcon, NInputNumber, NModal, NSpace, NText, NTag, NForm, NFormItem, useMessage, type DataTableColumns } from 'naive-ui'
import { ArrowBackOutline, RefreshOutline, CubeOutline, ConstructOutline, CheckmarkCircleOutline, PeopleOutline, PricetagOutline, AlertCircleOutline } from '@vicons/ionicons5'
import { useUserStore } from '@/stores/user'
import { useHardwareStore } from '@/stores/hardware'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const hardwareStore = useHardwareStore()
const message = useMessage()
const loading = ref(false)

const stock = ref<any>(null)
const allCheckouts = ref<any[]>([])

const issuedTotal = computed(() => allCheckouts.value.reduce((sum, c) => sum + Number(c.quantity || 0), 0))
const totalQuantity = computed(() => Number(stock.value?.quantity || stock.value?.current_stock || 0))
const availableStock = computed(() => totalQuantity.value - issuedTotal.value)
const onecQuantity = computed(() => Number(stock.value?.quantity || 0))
const hasDiscrepancy = computed(() => onecQuantity.value < issuedTotal.value)

const activeEmployees = computed(() => {
  return allCheckouts.value
    .map(c => ({
      employeeId: c.employee_id,
      employeeName: c.resolved_employee_name || c.employee_name || 'Неизвестно',
      quantity: Number(c.quantity || 0),
      lastDate: c.created_at,
      checkoutIds: [c.id],
      orderNumber: c.order_number || ''
    }))
    .sort((a, b) => b.lastDate.localeCompare(a.lastDate))
})

const formatCurrency = (amount: number) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(amount)
const formatDateTime = (iso: string) => {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const showReturnModal = ref(false)
const selectedEmployee = ref<any>(null)
const returning = ref(false)
const returnForm = reactive({ quantity: 1 })

const handleReturn = (emp: any) => {
  selectedEmployee.value = emp
  returnForm.quantity = 1
  showReturnModal.value = true
}

const confirmReturn = async () => {
  if (!selectedEmployee.value || !returnForm.quantity || returnForm.quantity < 1) { message.warning('Укажите количество'); return }
  returning.value = true
  try {
    const checkoutId = selectedEmployee.value.checkoutIds[0]
    await hardwareStore.returnHardware(checkoutId, returnForm.quantity)
    message.success(`Возвращено ${returnForm.quantity} шт: ${selectedEmployee.value.employeeName}`)
    showReturnModal.value = false
    await loadData()
  } catch (err: any) { message.error(err.message || 'Ошибка при возврате') }
  finally { returning.value = false }
}

const columns: DataTableColumns<any> = [
  {
    title: 'Сотрудник',
    key: 'employeeName'
  },
  {
    title: 'Кол-во',
    key: 'quantity',
    width: 80,
    render(row) {
      return h('span', { style: { color: '#2080f0', fontWeight: 'bold' } }, String(row.quantity))
    }
  },
  {
    title: 'Последняя выдача',
    key: 'lastDate',
    width: 180,
    render(row) { return formatDateTime(row.lastDate) }
  },
  {
    title: 'Заказ',
    key: 'orderNumber',
    width: 140,
    render(row) { return row.orderNumber || '—' }
  },
  {
    title: 'Статус',
    key: 'status',
    width: 100,
    render() {
      return h(NTag, { type: 'warning', size: 'small' }, { default: () => 'Выдана' })
    }
  },
  {
    title: 'Действия',
    key: 'actions',
    width: 100,
    render(row) {
      if (userStore.isWorker) return null
      return h(NButton, {
        size: 'tiny',
        type: 'warning',
        ghost: true,
        onClick: () => handleReturn(row)
      }, { default: () => 'Сдать' })
    }
  }
]

const loadData = async () => {
  const refKey = decodeURIComponent(String(route.params.refKey))
  if (!refKey) return
  loading.value = true
  try {
    await hardwareStore.loadHardwareFromApi()
    const res = await fetch(`/sklad/api/onec/stocks/${refKey}/checkouts`)
    if (res.ok) {
      const data = await res.json()
      stock.value = data.stock
      allCheckouts.value = data.checkouts || []
    }
  } catch (err) { console.error('Error loading hardware detail:', err) }
  finally { loading.value = false }
}

onMounted(loadData)
onActivated(loadData)
watch(() => route.params.refKey, () => loadData())
</script>

<style scoped>
.hardware-detail-page { max-width: 1600px; margin: 0 auto; padding: 0 24px; }
@media (max-width: 768px) { .hardware-detail-page { padding: 0 12px; } }
.metric-card { height: 100%; background-color: #2a2a2a; border-bottom: 4px solid transparent; }
</style>
