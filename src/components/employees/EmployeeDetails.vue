<template>
  <div v-if="currentEmployee" class="employee-details-container h-full bg-[#18181c]">
    <!-- Режим просмотра профиля (Глаз) - только Личное дело -->
    <div v-if="mode === 'full'" class="p-6 h-full overflow-y-auto">
      <div class="mx-auto">
        <!-- Шапка профиля -->
        <div class="mb-6 p-6 bg-[#242428] rounded-xl border border-gray-800 shadow-2xl">
          <div class="flex items-center gap-6">
            <n-avatar 
              v-if="avatarSrc"
              round 
              :size="100" 
              :src="avatarSrc" 
              :key="avatarKey"
              class="shrink-0 border-4 border-gray-700 shadow-2xl"
              object-fit="cover"
            />
            <n-avatar 
              v-else
              round 
              :size="100" 
              class="shrink-0 border-4 border-gray-700 bg-gray-800"
            >
              <span class="text-4xl text-gray-500">{{ currentEmployee.name.charAt(0) }}</span>
            </n-avatar>
            <div class="grow">
              <div class="flex items-center gap-4 mb-1">
                <n-h2 class="m-0 text-2xl font-black text-white uppercase tracking-tight">{{ currentEmployee.name }}</n-h2>
                <n-tag :type="(getStatusColor(currentEmployee.status) as any)" size="small" round>
                  {{ getStatusLabel(currentEmployee.status) }}
                </n-tag>
              </div>
              <div class="flex items-center gap-3">
                <n-tag :type="(getRoleColor(currentEmployee.role) as any)" size="small" quaternary>
                  {{ getRoleLabel(currentEmployee.role) }}
                </n-tag>
                <n-text class="text-gray-400 font-medium uppercase text-xs tracking-widest">{{ currentEmployee.position }}</n-text>
              </div>
            </div>
          </div>
        </div>

        <!-- Информация сеткой -->
        <n-grid :cols="2" :x-gap="16" :y-gap="16">
          <n-gi>
            <n-card title="Контакты" size="small" class="h-full border-gray-800">
              <n-list slim :show-divider="false">
                <n-list-item>
                  <template #prefix><n-icon color="#2080f0"><MailOutline /></n-icon></template>
                  <n-text depth="3" class="text-[10px] uppercase block">Email</n-text>
                  <n-text strong>{{ currentEmployee.email }}</n-text>
                </n-list-item>
                <n-list-item>
                  <template #prefix><n-icon color="#18a058"><CallOutline /></n-icon></template>
                  <n-text depth="3" class="text-[10px] uppercase block">Телефон</n-text>
                  <n-text strong>{{ currentEmployee.phone }}</n-text>
                </n-list-item>
              </n-list>
            </n-card>
          </n-gi>
          <n-gi>
            <n-card title="Работа" size="small" class="h-full border-gray-800">
              <n-list slim :show-divider="false">
                <n-list-item>
                  <template #prefix><n-icon color="#f0a020"><BusinessOutline /></n-icon></template>
                  <n-text depth="3" class="text-[10px] uppercase block">Отдел</n-text>
                  <n-text strong>{{ currentEmployee.department }}</n-text>
                </n-list-item>
                <n-list-item>
                  <template #prefix><n-icon color="#18a058"><CashOutline /></n-icon></template>
                  <n-text depth="3" class="text-[10px] uppercase block">Оклад</n-text>
                  <n-text strong class="text-green-500">{{ formatCurrency(currentEmployee.salary) }}</n-text>
                </n-list-item>
              </n-list>
            </n-card>
          </n-gi>
          <n-gi :span="2">
            <n-card title="Навыки" size="small" class="border-gray-800">
              <div class="flex flex-wrap gap-2">
                <n-tag v-for="skill in currentEmployee.skills" :key="skill" size="small" round border-variant="dark">
                  {{ skill }}
                </n-tag>
              </div>
            </n-card>
          </n-gi>
          <n-gi :span="2" v-if="currentEmployee.notes">
            <n-card title="Заметки" size="small" class="border-gray-800">
              <n-text depth="3">{{ currentEmployee.notes }}</n-text>
            </n-card>
          </n-gi>
        </n-grid>
      </div>
    </div>

    <!-- Режим активности (Клик по строке) - Накладные и Инструменты -->
    <n-tabs 
      v-else
      type="card" 
      default-value="document"
      class="h-full flex flex-col" 
      content-class="flex-1 overflow-y-auto p-6"
    >
      <n-tab-pane name="document" tab="Накладные и документы">
        <div class="py-4 h-full bg-[#101014] overflow-y-auto">
          <div v-if="!selectedInvoice" class="px-4">
            <n-card title="Реестр производственных накладных" border-variant="dark" class="shadow-2xl">
              <template #header-extra>
                <div class="flex items-center gap-2">
                   <n-text depth="3">Всего: {{ currentEmployee.materialHistory?.length || 0 }}</n-text>
                </div>
              </template>
              <n-data-table 
                :columns="invoiceColumns" 
                :data="currentEmployee.materialHistory || []" 
                :pagination="{ pageSize: 10 }"
                striped
                :row-props="(row: any) => ({
                  style: 'cursor: pointer',
                  onClick: () => { selectedInvoice = row },
                  class: 'group'
                })"
              />
            </n-card>
          </div>
          <div v-else class="px-4">
            <EmployeeProductionDocument 
              :employee="currentEmployee"
              :tools="[]"
              :scannedItems="[]"
              :materials="[selectedInvoice]"
            />
          </div>
        </div>
      </n-tab-pane>

      <n-tab-pane name="tools" tab="Инструменты">
        <div class="py-4">
          <n-card title="Выданный инструмент и оснастка" border-variant="dark" class="shadow-2xl">
            <template #header-extra>
              <n-text depth="3">Всего позиций: {{ employeeTools.length }}</n-text>
            </template>
            <n-data-table 
              :columns="toolColumns" 
              :data="employeeTools" 
              :pagination="{ pageSize: 15 }"
              striped
            />
          </n-card>
        </div>
      </n-tab-pane>
    </n-tabs>
  </div>
  <div v-else class="flex items-center justify-center min-h-100">
    <n-empty size="large" description="Сотрудник не найден в базе данных" />
  </div>

  <!-- Модалка возврата инструмента -->
  <n-modal 
    v-model:show="showReturnModal" 
    preset="card" 
    title="Сдача инструмента" 
    class="w-md!" 
    :auto-focus="false"
  >
    <n-form :model="returnForm" label-placement="top">
      <n-form-item label="Инструмент">
        <n-text strong class="text-blue-500 text-lg uppercase block mb-2 px-1">
          {{ toolsStore.getToolById(selectedToolId || '')?.name }}
        </n-text>
        <n-badge type="info" :value="toolsStore.getToolById(selectedToolId || '')?.inventoryNumber || 'ИНВ-???'" />
      </n-form-item>
      <n-form-item label="Причина сдачи">
        <n-select v-model:value="returnForm.reason" :options="returnReasonOptions" />
      </n-form-item>
      <n-form-item label="Заметки / Описание поломки">
        <n-input v-model:value="returnForm.notes" type="textarea" placeholder="Укажите подробности..." />
      </n-form-item>
    </n-form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <n-button @click="showReturnModal = false">Отмена</n-button>
        <n-button type="primary" @click="confirmReturn">Подтвердить</n-button>
      </div>
    </template>
  </n-modal>
</template>


<script setup lang="ts">
import { ref, computed, h, reactive } from 'vue'
import { useEmployeesStore } from '@/stores/employees'
import { useToolsStore } from '@/stores/tools'
import EmployeeProductionDocument from './EmployeeProductionDocument.vue'
import type { Employee } from '@/types'
import type { DataTableColumns } from 'naive-ui'
import {
  NCard,
  NText,
  NTag,
  NGrid,
  NGi,
  NList,
  NListItem,
  NIcon,
  NButton,
  NAvatar,
  NTabs,
  NTabPane,
  NEmpty,
  NDataTable,
  NModal,
  NForm,
  NFormItem,
  NSelect,
  NInput,
  useMessage,
  NBadge
} from 'naive-ui'
import {
  MailOutline,
  CallOutline,
  BusinessOutline,
  CashOutline,
  BuildOutline,
  TimeOutline,
  LogInOutline
} from '@vicons/ionicons5'

const props = withDefaults(defineProps<{
  employee: Employee
  mode?: 'full' | 'slim'
}>(), {
  mode: 'full'
})

import type { MaterialInvoice, Tool } from '@/types'
const selectedInvoice = ref<MaterialInvoice | null>(null)

// Используем сторы для получения самой актуальной копии данных
const employeesStore = useEmployeesStore()
const toolsStore = useToolsStore()
const message = useMessage()

const currentEmployee = computed(() => {
  return employeesStore.employees.find(e => e.id === props.employee.id) || props.employee
})

// Состояние для сдачи инструмента
const showReturnModal = ref(false)
const selectedToolId = ref<string | null>(null)
const returnForm = reactive({
  reason: 'warehouse',
  notes: ''
})

const returnReasonOptions = [
  { label: 'Сдать на склад', value: 'warehouse' },
  { label: 'Требуется ремонт', value: 'repair' }
]

const handleReturnTool = (toolId: string) => {
  selectedToolId.value = toolId
  returnForm.reason = 'warehouse'
  returnForm.notes = ''
  showReturnModal.value = true
}

const confirmReturn = () => {
  if (!selectedToolId.value) return

  if (returnForm.reason === 'repair') {
    const tool = toolsStore.getToolById(selectedToolId.value)
    if (tool) {
      toolsStore.reportBreakdown({
        toolId: tool.id,
        toolName: tool.name,
        inventoryNumber: tool.inventoryNumber,
        reportedBy: currentEmployee.value.id,
        reportedByName: currentEmployee.value.name,
        reportedAt: new Date(),
        description: returnForm.notes || 'Возврат с дефектом',
        severity: 'minor',
        workerId: currentEmployee.value.id,
        workerName: currentEmployee.value.name
      })
    }
  } else {
    // Обычная сдача на склад
    toolsStore.returnTool(selectedToolId.value)
    // У инструмента меняется статус в сторе внутри returnTool
  }

  message.success('Инструмент успешно сдан')
  showReturnModal.value = false
  selectedToolId.value = null
}

const invoiceColumns: DataTableColumns<MaterialInvoice> = [
  {
    title: 'Заказ №',
    key: 'orderNumber',
    width: 150,
    render: (row) => h('div', { class: 'flex items-center gap-2' }, [
      h(NIcon, { color: '#18a058' }, { default: () => h(BusinessOutline) }),
      h('div', { class: 'font-bold text-white uppercase group-hover:text-green-500 transition-colors' }, row.orderNumber)
    ])
  },
  {
    title: 'Дата комплектации',
    key: 'date',
    width: 150,
    render: (row) => h('div', { class: 'text-gray-300' }, formatDate(row.date))
  },
  {
    title: 'Позиций ТМЦ',
    key: 'items',
    width: 120,
    render: (row) => h(NTag, { type: 'success', quaternary: true, size: 'small' }, { default: () => `${row.items?.length || 0} шт.` })
  },
  {
    title: 'Статус',
    key: 'status',
    width: 150,
    render: () => h('div', { class: 'flex items-center gap-2 text-green-500 font-bold text-[10px] uppercase' }, [
      h('div', { class: 'w-2 h-2 rounded-full bg-green-500 animate-pulse' }),
      'Подтверждено'
    ])
  }
]

const toolColumns: DataTableColumns<Tool> = [
  {
    title: 'Инструмент',
    key: 'name',
    render: (row) => h('div', { class: 'flex items-center gap-3' }, [
      h(NIcon, { size: '20', color: '#f0a020' }, { default: () => h(BuildOutline) }),
      h('div', [
        h('div', { class: 'font-bold text-white' }, row.name),
        h('div', { class: 'text-[10px] text-gray-500 uppercase' }, row.type)
      ])
    ])
  },
  {
    title: 'Инв. номер',
    key: 'inventoryNumber',
    render: (row) => h('div', { class: 'font-mono text-gray-400' }, row.inventoryNumber)
  },
  {
    title: 'Дата выдачи',
    key: 'issuedAt',
    render: (row) => h('div', { class: 'flex items-center gap-1 text-gray-300' }, [
      h(NIcon, { size: '14' }, { default: () => h(TimeOutline) }),
      h('span', row.issuedAt ? formatDate(row.issuedAt) : '-')
    ])
  },
  {
    title: 'Статус',
    key: 'status',
    render: (row) => {
      const statusMap: Record<string, { label: string, type: 'success' | 'info' | 'warning' | 'error' | 'default' }> = {
        'in_stock': { label: 'На складе', type: 'success' },
        'issued': { label: 'Выдано', type: 'info' },
        'repair': { label: 'В ремонте', type: 'warning' },
        'written_off': { label: 'Списано', type: 'error' }
      }
      const s = statusMap[row.status] || { label: row.status, type: 'default' }
      return h(NTag, { size: 'small', type: s.type, quaternary: true }, { default: () => s.label })
    }
  },
  {
    title: 'Действия',
    key: 'actions',
    render: (row) => h(NButton, {
      size: 'small',
      type: 'warning',
      ghost: true,
      onClick: () => handleReturnTool(row.id)
    }, {
      default: () => 'Сдать',
      icon: () => h(NIcon, null, { default: () => h(LogInOutline) })
    })
  }
]

const employeeTools = computed(() => {
  return toolsStore.tools.filter(t => t.issuedTo === currentEmployee.value.id)
})

const avatarSrc = computed(() => {
  return currentEmployee.value?.avatar || currentEmployee.value?.photo || ''
})

const avatarKey = computed(() => {
  return `avatar-${currentEmployee.value?.id}-${avatarSrc.value?.length || 0}`
})

const formatDate = (date: Date) => {
  if (!date) return 'Не указано'
  try {
    return new Intl.DateTimeFormat('ru-RU').format(new Date(date))
  } catch {
    return 'Некорректная дата'
  }
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0
  }).format(amount || 0)
}

const getRoleLabel = (role: Employee['role']) => {
  const roleMap: Record<Employee['role'], string> = {
    'admin': 'Администратор',
    'manager': 'Менеджер',
    'worker': 'Рабочий',
    'warehouse': 'Кладовщик',
    'production': 'Производство'
  }
  return roleMap[role] || role
}

const getRoleColor = (role: Employee['role']) => {
  const colorMap: Record<Employee['role'], string> = {
    'admin': 'error',
    'manager': 'warning',
    'worker': 'info',
    'warehouse': 'success',
    'production': 'default'
  }
  return colorMap[role] || 'default'
}

const getStatusLabel = (status: Employee['status']) => {
  const statusMap: Record<Employee['status'], string> = {
    'active': 'Активен',
    'inactive': 'Неактивен',
    'vacation': 'Отпуск',
    'sick': 'Больничный'
  }
  return statusMap[status] || status
}

const getStatusColor = (status: Employee['status']) => {
  const colorMap: Record<Employee['status'], string> = {
    'active': 'success',
    'inactive': 'default',
    'vacation': 'warning',
    'sick': 'error'
  }
  return colorMap[status] || 'default'
}

// Экспортируем состояние для управления из родительских компонентов
defineExpose({
  selectedInvoice
})
</script>

<style scoped>
.employee-details {
  max-width: 100%;
}
</style>
