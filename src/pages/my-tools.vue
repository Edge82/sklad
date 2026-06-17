<template>
  <div class="my-tools-page">
    <div class="header-actions p-4 bg-[#101014] border-b border-gray-800 flex items-center gap-4">
      <n-button quaternary circle @click="$router.back()">
        <template #icon>
          <n-icon size="24"><ArrowBackOutline /></n-icon>
        </template>
      </n-button>
      <div>
        <n-text strong class="text-xl">Материалы в работе</n-text>
        <div class="text-xs text-gray-500 mt-1">
          Выдано: {{ issuedTools.length }} позиций
        </div>
      </div>
    </div>

    <div class="p-6">
      <n-empty v-if="issuedTools.length === 0" size="large" description="Вам не выданы материалы" />

      <n-grid v-else :cols="1" :x-gap="16" :y-gap="16">
        <n-gi v-for="item in issuedTools" :key="item.id">
          <n-card class="w-full">
            <div class="flex items-start justify-between mb-4">
              <div>
                <n-h3 class="m-0 mb-1">{{ item.name }}</n-h3>
                <n-tag type="success" size="small">
                  {{ item.sku || 'Хоз. инвентарь' }}
                </n-tag>
              </div>
              <n-popconfirm
                positive-text="Сдать"
                negative-text="Отмена"
                @positive-click="handleReturnItem(item.id)"
              >
                <template #trigger>
                  <n-button type="warning" size="small">Сдать</n-button>
                </template>
                Вернуть {{ item.checkedOut }} {{ item.unit || 'шт' }} на склад?
              </n-popconfirm>
            </div>

            <n-descriptions :columns="2" size="small" bordered label-placement="left" class="w-full">
              <n-descriptions-item label="Количество">
                {{ item.checkedOut }} {{ item.unit || 'шт' }}
              </n-descriptions-item>
              <n-descriptions-item label="Артикул">
                {{ item.inventoryNumber || '—' }}
              </n-descriptions-item>
              <n-descriptions-item label="Дата получения">
                <n-text type="info">
                  {{ formatDateTime(item.issuedAt) }}
                </n-text>
              </n-descriptions-item>
              <n-descriptions-item label="QR-код / Штрихкод">
                {{ item.qrCode || '—' }}
              </n-descriptions-item>
            </n-descriptions>
          </n-card>
        </n-gi>
      </n-grid>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onActivated } from 'vue'
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

const formatDateTime = (date?: string | null) => {
  if (!date) return '—'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d)
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

const handleReturnItem = async (itemId: string) => {
  try {
    await toolsStore.returnTool(itemId)
    message.success('Материал успешно сдан на склад')
    if (window.location.pathname === '/profile') {
      window.dispatchEvent(new CustomEvent('refreshToolOperations'))
    }
  } catch (err) {
    message.error('Ошибка при сдаче материала')
    console.error(err)
  }
}

onMounted(async () => {
  await toolsStore.loadToolsFromApi()
  await employeesStore.loadEmployeesFromApi()
})

onActivated(async () => {
  await toolsStore.loadToolsFromApi()
  await employeesStore.loadEmployeesFromApi()
})
</script>

<style scoped>
.my-tools-page {
  max-width: 1600px;
  margin: 0 auto;
}
</style>
