<template>
  <div class="tool-detail-page p-6">
    <n-space vertical :size="16">
      <n-alert v-if="hasDiscrepancy" type="error" title="Требуется инвентаризация" class="w-full">
        Количество в 1С ({{ onecQuantity }}) меньше выданного сотрудникам ({{ issuedTotal }}). Необходимо вернуть инструмент, чтобы восстановить баланс.
      </n-alert>
      <div class="flex items-center gap-4">
        <n-button quaternary @click="router.push('/tools')">
          <template #icon><n-icon><ArrowBackOutline /></n-icon></template>
          Назад к инструментам
        </n-button>
        <n-divider vertical />
        <n-h1 class="m-0">{{ stock ? stock.name : '...' }}</n-h1>
      </div>

      <n-grid :cols="5" :x-gap="12" :y-gap="12">
        <n-gi>
          <n-card size="small" class="metric-card">
            <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">На складе</n-text>
            <n-h3 class="m-0 leading-none">{{ totalQuantity }}</n-h3>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card size="small" class="metric-card">
            <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Выдано</n-text>
            <n-h3 class="m-0 leading-none" style="color: #2080f0">{{ issuedTotal }}</n-h3>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card size="small" class="metric-card">
            <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Доступно</n-text>
            <n-h3 class="m-0 leading-none" :style="{ color: availableStock > 0 ? '#18a058' : '#d03050' }">{{ availableStock }}</n-h3>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card size="small" class="metric-card">
            <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Сотрудников</n-text>
            <n-h3 class="m-0 leading-none">{{ activeEmployees.length }}</n-h3>
          </n-card>
        </n-gi>
        <n-gi v-if="hasDiscrepancy">
          <n-card size="small" class="metric-card" style="border: 2px solid #d03050">
            <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">В 1С</n-text>
            <n-h3 class="m-0 leading-none" style="color: #d03050">{{ totalQuantity }}</n-h3>
          </n-card>
        </n-gi>
        <n-gi v-else>
          <n-card size="small" class="metric-card">
            <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">В 1С</n-text>
            <n-h3 class="m-0 leading-none">{{ totalQuantity }}</n-h3>
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

        <n-data-table
          :columns="columns"
          :data="activeEmployees"
          :pagination="false"
          :scroll-x="600"
        />

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
        <n-input-number
          v-model:value="returnForm.quantity"
          :min="1"
          :max="selectedEmployee.quantity"
          placeholder="Введите количество"
        />
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
import { useRouter } from 'vue-router'
import {
  NAlert,
  NButton,
  NH1,
  NH3,
  NCard,
  NDataTable,
  NDivider,
  NEmpty,
  NGrid,
  NGi,
  NIcon,
  NInputNumber,
  NModal,
  NSpace,
  NText,
  NTag,
  NForm,
  NFormItem,
  useMessage,
  type DataTableColumns
} from 'naive-ui'
import { ArrowBackOutline, RefreshOutline } from '@vicons/ionicons5'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const message = useMessage()
const loading = ref(false)

const stock = ref<any>(null)
const allCheckouts = ref<any[]>([])

const issuedTotal = computed(() => {
  return allCheckouts.value.reduce((sum, c) => sum + Number(c.quantity || 0), 0)
})

const totalQuantity = computed(() => Number(stock.value?.quantity || stock.value?.current_stock || 0))
const availableStock = computed(() => totalQuantity.value - issuedTotal.value)
const hasDiscrepancy = computed(() => totalQuantity.value < issuedTotal.value)

const activeEmployees = computed(() => {
  const map = new Map<string, { employeeId: string; employeeName: string; quantity: number; lastDate: string }>()
  for (const c of allCheckouts.value) {
    const key = c.employee_id
    const existing = map.get(key)
    if (existing) {
      existing.quantity += Number(c.quantity || 0)
      if (c.created_at > existing.lastDate) existing.lastDate = c.created_at
    } else {
      map.set(key, {
        employeeId: c.employee_id,
        employeeName: c.resolved_employee_name || c.employee_name || 'Неизвестно',
        quantity: Number(c.quantity || 0),
        lastDate: c.created_at
      })
    }
  }
  return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity)
})

const formatDateTime = (iso: string) => {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

// Return modal state
const showReturnModal = ref(false)
const selectedEmployee = ref<any>(null)
const returning = ref(false)
const returnForm = reactive({
  quantity: 1
})

const openReturnModal = (emp: any) => {
  selectedEmployee.value = emp
  returnForm.quantity = 1
  showReturnModal.value = true
}

const confirmReturn = async () => {
  if (!selectedEmployee.value || !returnForm.quantity || returnForm.quantity < 1) {
    message.warning('Укажите количество')
    return
  }

  const refKey = router.currentRoute.value.params.refKey as string
  if (!refKey) return

  returning.value = true
  try {
    const res = await fetch(`/sklad/api/onec/stocks/${encodeURIComponent(refKey)}/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId: selectedEmployee.value.employeeId,
        quantity: returnForm.quantity
      })
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      throw new Error(errData.error || 'Ошибка при возврате')
    }

    message.success(`Возвращено ${returnForm.quantity} шт от ${selectedEmployee.value.employeeName}`)
    showReturnModal.value = false
    await loadData()
  } catch (err: any) {
    message.error(err.message || 'Ошибка при возврате')
  } finally {
    returning.value = false
  }
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
    title: 'Статус',
    key: 'status',
    width: 100,
    render() {
      return h(NTag, { type: 'warning', size: 'small' }, { default: () => 'Выдан' })
    }
  },
  {
    title: 'Действия',
    key: 'actions',
    width: 100,
    render(row) {
      return h(NButton, {
        size: 'tiny',
        type: 'warning',
        ghost: true,
        onClick: () => openReturnModal(row)
      }, { default: () => 'Сдать' })
    }
  }
]

const loadData = async () => {
  const refKey = router.currentRoute.value.params.refKey as string
  if (!refKey) return

  loading.value = true
  try {
    const res = await fetch(`/sklad/api/onec/stocks/${encodeURIComponent(refKey)}/checkouts`)
    if (!res.ok) throw new Error('Ошибка загрузки')
    const data = await res.json()
    stock.value = data.stock
    allCheckouts.value = data.checkouts || []
  } catch (err) {
    console.error('Error loading tool detail:', err)
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
onActivated(loadData)
watch(() => router.currentRoute.value.params.refKey, loadData)
</script>

<style scoped>
.tool-detail-page {
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 24px;
}
@media (max-width: 768px) {
  .tool-detail-page {
    padding: 0 12px;
  }
}
.metric-card {
  background-color: #2a2a2a;
  border-bottom: 4px solid transparent;
}
</style>
