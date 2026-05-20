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

      <n-timeline v-else>
        <n-timeline-item
          v-for="operation in operations.slice(0, 5)"
          :key="operation.id"
          :type="getOperationType(operation.operation_type)"
          :title="getOperationLabel(operation.operation_type)"
          :time="formatDateTime(operation.created_at)"
        >
          <template #icon>
            <n-icon>
              <component :is="getOperationIcon(operation.operation_type)" />
            </n-icon>
          </template>

          <div class="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <!-- Заказ -->
            <div v-if="operation.order_number" class="flex items-center gap-2">
              <n-text depth="3">Заказ:</n-text>
              <n-text strong>{{ operation.order_number }}</n-text>
            </div>

            <!-- Товар -->
            <div v-if="operation.product_name" class="flex items-center gap-2">
              <n-text depth="3">Товар:</n-text>
              <n-text strong>{{ operation.product_name }}</n-text>
            </div>

            <!-- QR Код -->
            <div v-if="operation.qr_code" class="flex items-center gap-2">
              <n-text depth="3">QR код:</n-text>
              <n-tag size="small" type="info" round>{{ operation.qr_code }}</n-tag>
            </div>

            <!-- Дополнительные детали -->
            <div v-if="operation.details" class="text-xs text-gray-500 dark:text-gray-500 pl-4 border-l border-gray-300 dark:border-gray-700">
              <div v-for="(value, key) in parsedDetails(operation.details)" :key="key" class="py-0.5">
                <span class="font-medium">{{ key }}:</span> {{ value }}
              </div>
            </div>

            <!-- Статус операции -->
            <div v-if="operation.status !== 'success'" class="flex items-center gap-2">
              <n-tag :type="operation.status === 'success' ? 'success' : 'error'" size="small">
                {{ operation.status }}
              </n-tag>
            </div>
          </div>
        </n-timeline-item>
      </n-timeline>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  NCard,
  NButton,
  NIcon,
  NEmpty,
  NSpin,
  NTimeline,
  NTimelineItem,
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
  id: number
  operation_type: string
  employee_id: string
  employee_name: string
  order_id?: string
  order_number?: string
  product_id?: string
  product_name?: string
  qr_code_id?: string
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

const parsedDetails = (detailsStr?: string) => {
  if (!detailsStr) return {}
  try {
    const parsed = JSON.parse(detailsStr)
    return typeof parsed === 'object' ? parsed : { value: detailsStr }
  } catch {
    return { value: detailsStr }
  }
}

const getOperationType = (operationType: string): 'success' | 'error' | 'warning' | 'default' => {
  const typeMap: Record<string, 'success' | 'error' | 'warning' | 'default'> = {
    'qr_code_generated': 'success',
    'qr_code_scanned': 'default',
    'qr_code_deleted': 'error',
    'order_painting_updated': 'warning'
  }
  return typeMap[operationType] || 'default'
}

const getOperationLabel = (operationType: string) => {
  const labelMap: Record<string, string> = {
    'qr_code_generated': 'QR код сгенерирован',
    'qr_code_scanned': 'QR код отсканирован',
    'qr_code_deleted': 'QR код удален',
    'order_painting_updated': 'Окраска обновлена'
  }
  return labelMap[operationType] || operationType
}

const getOperationIcon = (operationType: string) => {
  const iconMap: Record<string, any> = {
    'qr_code_generated': CheckmarkCircleOutline,
    'qr_code_scanned': SwapHorizontalOutline,
    'qr_code_deleted': TrashOutline,
    'order_painting_updated': CreateOutline
  }
  return iconMap[operationType] || CheckmarkCircleOutline
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
