<template>
  <div class="my-tools-page">
    <div class="header-actions p-4 bg-[#101014] border-b border-gray-800 flex items-center gap-4">
      <n-button quaternary circle @click="$router.back()">
        <template #icon>
          <n-icon size="24"><ArrowBackOutline /></n-icon>
        </template>
      </n-button>
      <div>
        <n-text strong class="text-xl">Инструменты в работе</n-text>
        <div class="text-xs text-gray-500 mt-1">
          Выдано: {{ issuedTools.length }} шт.
        </div>
      </div>
    </div>

    <div class="p-6">
      <n-empty v-if="issuedTools.length === 0" size="large" description="Вам не выданы инструменты" />

      <n-grid v-else :cols="1" :x-gap="16" :y-gap="16">
        <n-gi v-for="tool in issuedTools" :key="tool.id">
          <n-card class="w-full">
            <div class="flex items-start justify-between mb-4">
              <div>
                <n-h3 class="m-0 mb-1">{{ tool.name }}</n-h3>
                <n-tag :type="getTypeColor(tool.type)" size="small">
                  {{ getTypeLabel(tool.type) }}
                </n-tag>
              </div>
              <n-popconfirm
                positive-text="Сдать"
                negative-text="Отмена"
                @positive-click="handleReturnTool(tool.id)"
              >
                <template #trigger>
                  <n-button type="warning" size="small">Сдать инструмент</n-button>
                </template>
                Вы уверены, что хотите сдать этот инструмент?
              </n-popconfirm>
            </div>

            <n-descriptions :columns="2" size="small" bordered label-placement="left" class="w-full">
              <n-descriptions-item label="Инвентарный №">
                {{ tool.inventoryNumber }}
              </n-descriptions-item>
              <n-descriptions-item label="Серийный №">
                {{ tool.serialNumber || '—' }}
              </n-descriptions-item>
              <n-descriptions-item label="Модель">
                {{ tool.model || '—' }}
              </n-descriptions-item>
              <n-descriptions-item label="Производитель">
                {{ tool.manufacturer || '—' }}
              </n-descriptions-item>
              <n-descriptions-item label="Место хранения">
                {{ tool.location || '—' }}
              </n-descriptions-item>
              <n-descriptions-item label="QR-код">
                {{ tool.qrCode || '—' }}
              </n-descriptions-item>
              <n-descriptions-item label="Выдан">
                <n-text type="info">
                  {{ formatDateTime(tool.issuedAt) }}
                </n-text>
              </n-descriptions-item>
              <n-descriptions-item label="Стоимость">
                {{ tool.price ? formatCurrency(tool.price) : '—' }}
              </n-descriptions-item>
            </n-descriptions>
          </n-card>
        </n-gi>
      </n-grid>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useEmployeesStore } from '@/stores/employees'
import { useToolsStore } from '@/stores/tools'
import {
  NButton,
  NIcon,
  NText,
  NEmpty,
  NGrid,
  NGi,
  NCard,
  NH3,
  NTag,
  NDescriptions,
  NDescriptionsItem,
  NPopconfirm,
  useMessage
} from 'naive-ui'
import { ArrowBackOutline } from '@vicons/ionicons5'

const userStore = useUserStore()
const employeesStore = useEmployeesStore()
const toolsStore = useToolsStore()
const message = useMessage()

const typeLabelMap: Record<string, string> = {
  power_tool: 'Электроинструмент',
  hand_tool: 'Ручной инструмент',
  measuring: 'Измерительный прибор',
  fixture: 'Оснастка/Шаблон',
  container: 'Контейнер/Тара'
}

const typeColorMap: Record<string, 'success' | 'warning' | 'info' | 'default'> = {
  power_tool: 'warning',
  hand_tool: 'success',
  measuring: 'info',
  fixture: 'default',
  container: 'default'
}

const getTypeLabel = (type: string) => typeLabelMap[type] || type
const getTypeColor = (type: string) => typeColorMap[type] || 'default'

const formatDateTime = (date?: Date | string | null) => {
  if (!date) return '—'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d)
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0
  }).format(amount)
}

const issuedTools = computed(() => {
  if (!userStore.user?.id) return []
  const currentUserId = parseFloat(String(userStore.user.id))
  const employee = employeesStore.employees.find(e => {
    if (!e.userId) return false
    const empUserId = parseFloat(String(e.userId))
    return !isNaN(empUserId) && empUserId === currentUserId
  })
  if (!employee) return []
  return toolsStore.getToolsIssuedToEmployee(employee.id)
})

const handleReturnTool = async (toolId: string) => {
  try {
    await toolsStore.returnTool(toolId)
    message.success('Инструмент успешно сдан')

    // Обновляем список операций на странице профиля
    if (window.location.pathname === '/profile') {
      window.dispatchEvent(new CustomEvent('refreshToolOperations'))
    }
  } catch (err) {
    message.error('Ошибка при сдаче инструмента')
    console.error(err)
  }
}

onMounted(() => {
  if (toolsStore.tools.length === 0) {
    toolsStore.loadToolsFromApi()
  }
  if (employeesStore.employees.length === 0) {
    employeesStore.loadEmployeesFromApi()
  }
})
</script>

<style scoped>
.my-tools-page {
  max-width: 1600px;
  margin: 0 auto;
}
</style>

