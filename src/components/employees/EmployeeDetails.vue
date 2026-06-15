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

    <!-- Режим активности (Клик по строке) - Инструменты и История операций -->
    <n-tabs
      v-else
      type="card"
      default-value="tools"
      class="h-full flex flex-col"
      content-class="flex-1 overflow-y-auto p-6"
    >
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

      <n-tab-pane name="operations" tab="История операций">
        <div class="py-4">
          <EmployeeOperationHistory :employee-id="currentEmployee.id" :limit="10" />
        </div>
      </n-tab-pane>
    </n-tabs>
  </div>
  <div v-else class="flex items-center justify-center min-h-100">
    <n-empty size="large" description="Сотрудник не найден в базе данных" />
  </div>

  <!-- Модалка возврата материала -->
  <n-modal
    v-model:show="showReturnModal"
    preset="card"
    title="Сдача материала"
    class="w-md!"
    :auto-focus="false"
  >
    <n-form :model="returnForm" label-placement="top">
      <n-form-item label="Материал">
        <n-text strong class="text-blue-500 text-lg uppercase block mb-2 px-1">
          {{ selectedCheckout?.name }}
        </n-text>
        <n-badge type="info" :value="selectedCheckout?.inventoryNumber || '—'" />
      </n-form-item>
      <n-form-item label="Количество">
        <n-text>{{ selectedCheckout?.checkedOut }} {{ selectedCheckout?.unit || 'шт' }}</n-text>
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
import { ref, computed, h, reactive, watch, onMounted } from 'vue'
import { useEmployeesStore } from '@/stores/employees'
import { useToolsStore } from '@/stores/tools'
import EmployeeOperationHistory from './EmployeeOperationHistory.vue'
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

const selectedToolId = ref<string | null>(null)

// Используем сторы для получения самой актуальной копии данных
const employeesStore = useEmployeesStore()
const toolsStore = useToolsStore()
const message = useMessage()

const currentEmployee = computed(() => {
  return employeesStore.employees.find(e => e.id === props.employee.id) || props.employee
})

// Load tools when component mounts and when employee changes
onMounted(async () => {
  await toolsStore.loadToolsFromApi()
})

watch(() => props.employee.id, async () => {
  await toolsStore.loadToolsFromApi()
})

// Состояние для сдачи инструмента
const showReturnModal = ref(false)
const returnForm = reactive({
  reason: 'warehouse',
  notes: ''
})

const returnReasonOptions = [
  { label: 'Сдать на склад', value: 'warehouse' },
  { label: 'Требуется ремонт', value: 'repair' }
]

const selectedCheckout = computed(() => {
  if (!selectedToolId.value) return null
  return employeeTools.value.find((t: any) => t.id === selectedToolId.value) || null
})

const handleReturnTool = (toolId: string) => {
  selectedToolId.value = toolId
  returnForm.reason = 'warehouse'
  returnForm.notes = ''
  showReturnModal.value = true
}

const confirmReturn = async () => {
  if (!selectedToolId.value) return

  try {
    await toolsStore.returnTool(selectedToolId.value)
    message.success('Материал успешно сдан на склад')
    showReturnModal.value = false
    selectedToolId.value = null
  } catch (err) {
    message.error('Ошибка при сдаче материала')
    console.error('Error returning material:', err)
  }
}

const toolColumns: DataTableColumns<any> = [
  {
    title: 'Наименование',
    key: 'name',
    render: (row) => h('div', { class: 'flex items-center gap-3' }, [
      h(NIcon, { size: '20', color: '#f0a020' }, { default: () => h(BuildOutline) }),
      h('div', [
        h('div', { class: 'font-bold text-white' }, row.name),
        h('div', { class: 'text-[10px] text-gray-500 uppercase' }, 'Хоз. инвентарь')
      ])
    ])
  },
  {
    title: 'Артикул',
    key: 'inventoryNumber',
    render: (row) => h('div', { class: 'font-mono text-gray-400' }, row.inventoryNumber || '—')
  },
  {
    title: 'Кол-во',
    key: 'checkedOut',
    width: 80,
    render: (row) => h('div', { class: 'text-center' }, `${row.checkedOut} ${row.unit || 'шт'}`)
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
  return toolsStore.getToolsIssuedToEmployee(currentEmployee.value.id)
})

const avatarSrc = computed(() => {
  return currentEmployee.value?.avatar || currentEmployee.value?.photo || ''
})

const avatarKey = computed(() => {
  return `avatar-${currentEmployee.value?.id}-${avatarSrc.value?.length || 0}`
})

const formatDate = (date: Date | string) => {
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
    'storekeeper': 'Кладовщик',
    'worker': 'Рабочий'
  }
  return roleMap[role] || role
}

const getRoleColor = (role: Employee['role']) => {
  const colorMap: Record<Employee['role'], string> = {
    'admin': 'error',
    'manager': 'warning',
    'storekeeper': 'success',
    'worker': 'info'
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
</script>

<style scoped>
.employee-details {
  max-width: 100%;
}
</style>
