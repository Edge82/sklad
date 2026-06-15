<template>
  <div class="employee-operations">
    <n-card title="История последних операций" segmented>
      <template #header-extra>
        <n-button text @click="refreshOperations">
          <template #icon>
            <n-icon><ReloadOutline /></n-icon>
          </template>
        </n-button>
      </template>

      <div v-if="loading" class="flex items-center justify-center py-8">
        <n-spin size="large" />
      </div>

      <n-empty v-else-if="!operations || operations.length === 0" description="Нет операций" />

      <n-data-table
        v-else
        :columns="columns"
        :data="operations.slice(0, 10)"
        :bordered="false"
        :bottom-bordered="true"
        size="small"
      />

      <div v-if="canLoadMore" class="flex justify-center pt-4">
        <n-button text type="primary" @click="loadMoreOperations">
          Показать ещё
        </n-button>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, onMounted } from 'vue'
import {
  NCard,
  NButton,
  NIcon,
  NEmpty,
  NSpin,
  NText,
  NTag
} from 'naive-ui'
import {
  ReloadOutline,
  CheckmarkCircleOutline,
  TrashOutline,
  CreateOutline,
  SwapHorizontalOutline
} from '@vicons/ionicons5'

interface OperationLog {
  id: number | string
  operation_type: string
  employee_id: string
  employee_name: string
  order_number?: string
  product_name?: string
  qr_code?: string
  details?: string
  status: string
  created_at: string
}

const props = defineProps<{
  employeeId: string
  limit?: number
}>()

const API_BASE = '/sklad/api'
const operations = ref<OperationLog[]>([])
const loading = ref(false)
const totalOperations = ref(0)
const currentLimit = ref(props.limit || 5)

const canLoadMore = computed(() => operations.value.length < totalOperations.value)

const getOperationLabel = (operationType: string) => {
  const labelMap: Record<string, string> = {
    'qr_code_generated': 'QR код сгенерирован',
    'qr_code_scanned': 'QR код отсканирован',
    'qr_code_deleted': 'QR код удален',
    'order_painting_updated': 'Окраска обновлена',
    'transfer_order_created': 'Заказ на перемещение создан',
    'transfer_order_completed': 'Заказ на перемещение завершен',
    'tool_issued': 'Выдача инструмента',
    'tool_returned': 'Возврат инструмента',
    'material_issued': 'Выдача инструмента',
    'material_returned': 'Возврат инструмента',
    'material_created': 'Создание инструмента',
    'invoice_Производство': 'Поступление материалов',
    'invoice_Клиент': 'Отгрузка клиенту',
    'invoice_Перемещение': 'Перемещение',
    'invoice_Инструмент': 'Операция с инструментом',
    'transfer_order': 'Перемещение между складами'
  }
  return labelMap[operationType] || operationType
}

const formatDateTime = (dateStr: string) => {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const columns: any[] = [
  {
    title: 'Дата',
    key: 'created_at',
    render: (row: OperationLog) => formatDateTime(row.created_at)
  },
  {
    title: 'Тип',
    key: 'operation_type',
    ellipsis: { tooltip: true },
    render: (row: OperationLog) => getOperationLabel(row.operation_type)
  },
  {
    title: 'Описание',
    key: 'description',
    ellipsis: { tooltip: true },
    render: (row: OperationLog) => {
      const parts: string[] = []
      if (row.order_number) parts.push(`Заказ: ${row.order_number}`)
      if (row.product_name) parts.push(`Товар: ${row.product_name}`)
      if (row.qr_code) parts.push(`QR: ${row.qr_code}`)
      return parts.join(', ') || '-'
    }
  }
]

const loadOperations = async (limit: number) => {
  loading.value = true
  try {
    const response = await fetch(
      `${API_BASE}/employees/${props.employeeId}/operations?limit=${limit}`
    )
    if (!response.ok) throw new Error('Failed to load operations')

    const data = await response.json()
    operations.value = data.logs || []
    totalOperations.value = data.count || 0
  } catch (err) {
    console.error('Error loading operations:', err)
    operations.value = []
  } finally {
    loading.value = false
  }
}

const loadMoreOperations = () => {
  currentLimit.value += 5
  loadOperations(currentLimit.value)
}

const refreshOperations = () => {
  currentLimit.value = props.limit || 5
  loadOperations(currentLimit.value)
}

onMounted(() => {
  loadOperations(currentLimit.value)
})
</script>

<style scoped>
.employee-operations {
  width: 100%;
}
</style>
