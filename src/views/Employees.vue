<template>
  <div v-show="selectedInlineEmployee" class="employees-inline-details h-full flex flex-col p-4">
    <div class="mb-6 flex justify-between items-center">
      <div class="flex items-center gap-3">
        <n-button quaternary circle @click="handleInlineBack">
          <template #icon><n-icon size="24"><ArrowBackOutline /></n-icon></template>
        </n-button>
        <div>
          <n-h1 class="m-0 text-2xl">
            {{ detailsRef?.selectedInvoice ? 'Производственная накладная' : 'Производственная активность' }}
          </n-h1>
          <n-text depth="3">
            {{ detailsRef?.selectedInvoice ? `Документ № ${detailsRef.selectedInvoice.orderNumber}` : `Просмотр накладных и инструментов: ${selectedInlineEmployee?.name}` }}
          </n-text>
        </div>
      </div>
    </div>
    <div class="grow overflow-hidden bg-[#101014] rounded-xl border border-gray-800">
      <EmployeeDetails 
        v-if="selectedInlineEmployee"
        ref="detailsRef"
        :employee="selectedInlineEmployee" 
        mode="slim" 
      />
    </div>
  </div>

  <div v-show="!selectedInlineEmployee" class="employees-page">
    <!-- Заголовок и кнопки -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <n-h1>Сотрудники</n-h1>
        <n-text depth="3">Управление персоналом предприятия</n-text>
      </div>
      <div class="flex gap-3">
        <n-button @click="exportData">
          <template #icon>
            <n-icon>
              <DownloadOutline />
            </n-icon>
          </template>
          Экспорт
        </n-button>
        <n-button type="primary" @click="showCreateModal = true">
          <template #icon>
            <n-icon>
              <PersonAddOutline />
            </n-icon>
          </template>
          Добавить сотрудника
        </n-button>
      </div>
    </div>

    <!-- Статистика -->
    <n-grid :cols="5" :x-gap="16" :y-gap="16" class="mb-6 items-stretch">
      <n-gi>
        <n-card
          class="cursor-pointer transition-colors hover:shadow-md h-full flex flex-col justify-center"
          style="cursor: pointer;"
          :class="[!filters.status && !filters.role && !filters.department ? 'border-blue-500 shadow-sm' : 'hover:border-blue-500']"
          size="small"
          @click="resetFilters"
        >
          <div class="flex items-center gap-3">
            <n-icon size="24" color="#2080f0">
              <PeopleOutline />
            </n-icon>
            <div>
              <n-text depth="3">Всего сотр.</n-text>
              <n-h2 class="m-0 line-height-1">{{ employeesStore.totalEmployees }}</n-h2>
            </div>
          </div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card
          class="cursor-pointer transition-colors hover:shadow-md h-full flex flex-col justify-center"
          style="cursor: pointer;"
          :class="[filters.status === 'active' ? 'border-green-500 shadow-sm' : 'hover:border-green-500']"
          size="small"
          @click="() => { resetFilters(); filters.status = 'active'; }"
        >
          <div class="flex items-center gap-3">
            <n-icon size="24" color="#18a058">
              <CheckmarkCircleOutline />
            </n-icon>
            <div>
              <n-text depth="3">Активных</n-text>
              <n-h2 class="m-0 line-height-1">{{ employeesStore.activeEmployees }}</n-h2>
            </div>
          </div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card
          class="cursor-pointer transition-colors hover:shadow-md h-full flex flex-col justify-center"
          style="cursor: pointer;"
          :class="[filters.role === 'worker' ? 'border-blue-400 shadow-sm' : 'hover:border-blue-400']"
          size="small"
          @click="() => { resetFilters(); filters.role = 'worker'; }"
        >
          <div class="flex items-center gap-3">
            <n-icon size="24" color="#70c0e8">
              <BuildOutline />
            </n-icon>
            <div>
              <n-text depth="3">Рабочих</n-text>
              <n-h2 class="m-0 line-height-1">{{ employeesStore.employees.filter(e => e.role === 'worker').length }}</n-h2>
            </div>
          </div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card
          class="cursor-pointer transition-colors hover:shadow-md h-full flex flex-col justify-center"
          style="cursor: pointer;"
          :class="[filters.status === 'vacation' ? 'border-yellow-500 shadow-sm' : 'hover:border-yellow-500']"
          size="small"
          @click="() => { resetFilters(); filters.status = 'vacation'; }"
        >
          <div class="flex items-center gap-3">
            <n-icon size="24" color="#f0a020">
              <TimeOutline />
            </n-icon>
            <div>
              <n-text depth="3">В отпуске</n-text>
              <n-h2 class="m-0 line-height-1">{{ employeesStore.employees.filter(e => e.status === 'vacation').length }}</n-h2>
            </div>
          </div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card border-variant="dark" class="revenue-card h-full flex flex-col justify-center" size="small">
          <div class="flex items-center gap-3">
            <n-icon size="24" color="#18a058" :component="CashOutline" />
            <div>
              <n-text depth="3" class="revenue-label block mb-1">ФОТ в месяц</n-text>
              <n-h2 class="m-0 line-height-1 revenue-value" style="font-size: 22px;">{{ formatCurrency(filteredTotalSalary) }}</n-h2>
            </div>
          </div>
        </n-card>
      </n-gi>
    </n-grid>

    <!-- Фильтры -->
    <n-card class="mb-6">
      <div class="flex flex-wrap gap-4">
        <n-select v-model:value="filters.department" placeholder="Отдел" :options="departmentOptions" clearable
          style="width: 200px" />
        <n-select v-model:value="filters.status" placeholder="Статус" :options="statusOptions" clearable
          style="width: 200px" />
        <n-select v-model:value="filters.role" placeholder="Должность" :options="roleOptions" clearable
          style="width: 200px" />
        <n-input v-model:value="searchQuery" placeholder="Поиск по имени, email или телефону" clearable
          style="width: 300px">
          <template #prefix>
            <n-icon>
              <SearchOutline />
            </n-icon>
          </template>
        </n-input>
        <n-button @click="resetFilters">Сбросить</n-button>

        <div class="ml-auto flex gap-1">
          <n-button 
            :type="viewMode === 'list' ? 'primary' : 'default'" 
            circle
            quaternary
            @click="viewMode = 'list'"
          >
            <template #icon>
              <n-icon><ListOutline /></n-icon>
            </template>
          </n-button>
          <n-button 
            :type="viewMode === 'grid' ? 'primary' : 'default'" 
            circle
            quaternary
            @click="viewMode = 'grid'"
          >
            <template #icon>
              <n-icon><AppsOutline /></n-icon>
            </template>
          </n-button>
        </div>
      </div>
    </n-card>

    <!-- Таблицы сотрудников и отделов -->
    <n-grid :cols="3" :x-gap="16" :y-gap="16">
      <!-- Основное отображение сотрудников -->
      <n-gi :span="3">
        <n-card v-if="viewMode === 'list'" title="Список сотрудников">
          <n-data-table 
            :columns="employeeColumns" 
            :data="filteredEmployees" 
            :pagination="pagination"
            :row-key="(row: Employee) => row.id" 
            striped 
            :row-props="(row: Employee) => ({
              style: 'cursor: pointer',
              onClick: () => viewEmployee(row.id, 'slim')
            })"
          />
        </n-card>

        <div v-else class="employee-grid">
          <n-grid :cols="3" :x-gap="12" :y-gap="12">
            <n-gi v-for="emp in paginatedEmployees" :key="emp.id">
              <n-card hoverable class="employee-card" @click="viewEmployee(emp.id)">
                <n-flex align="center" :wrap="false" :size="24" class="p-1">
                  <div class="shrink-0">
                    <n-avatar 
                      v-if="emp.avatar || emp.photo"
                      round 
                      :size="100" 
                      :src="emp.avatar || emp.photo"
                      :key="`grid-avatar-${emp.id}-${(emp.avatar || emp.photo)?.length || 0}`"
                      class="shadow-xl border-2 border-gray-700"
                      object-fit="cover"
                    />
                    <n-avatar 
                      v-else
                      round 
                      :size="100" 
                      class="border-2 border-gray-800"
                    >
                      <span class="text-3xl text-gray-500">{{ emp.name.charAt(0) }}</span>
                    </n-avatar>
                  </div>
                  <div class="grow min-w-0 pr-2">
                    <div class="flex justify-between items-start mb-2 mt-1">
                      <div class="min-w-0">
                        <n-text 
                          strong 
                          class="text-lg truncate block leading-tight cursor-pointer hover:text-green-500 transition-colors"
                          @click.stop="viewEmployee(emp.id, 'slim')"
                        >
                          {{ emp.name }}
                        </n-text>
                        <n-text depth="3" class="text-xs uppercase font-medium">{{ emp.position }}</n-text>
                      </div>
                      <n-tag :type="employeesStore.getStatusColor(emp.status) as any" size="small" round>
                        {{ employeesStore.getStatusLabel(emp.status) }}
                      </n-tag>
                    </div>
                    
                    <div class="flex flex-col gap-2 mt-3 text-[14px] text-gray-400">
                      <div class="flex items-center gap-2">
                        <n-icon size="16"><MailOutline /></n-icon>
                        <span class="truncate">{{ emp.email }}</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <n-icon size="16"><CallOutline /></n-icon>
                        <span>{{ emp.phone }}</span>
                      </div>
                    </div>

                    <div class="flex justify-end gap-2 mt-4 pt-3">
                      <n-button size="small" tertiary round @click.stop="viewEmployee(emp.id, 'full')">
                        Профиль
                      </n-button>
                      <n-button size="small" tertiary round type="warning" @click.stop="editEmployee(emp.id)">
                        <template #icon><n-icon><PencilOutline /></n-icon></template>
                      </n-button>
                    </div>
                  </div>
                </n-flex>
              </n-card>
            </n-gi>
          </n-grid>
          <div class="mt-6 flex justify-center">
             <n-pagination 
              v-model:page="pagination.page"
              v-model:page-size="pagination.pageSize"
              :item-count="filteredEmployees.length"
              :page-sizes="[9, 18, 27]"
              show-size-picker
            />
          </div>
        </div>
      </n-gi>
    </n-grid>

    <!-- Модалка создания сотрудника -->
    <n-modal 
      v-model:show="showCreateModal" 
      preset="card"
      :auto-focus="false"
      :title="selectedEmployeeId ? 'Редактировать сотрудника' : 'Добавить сотрудника'" 
      style="width: 800px"
      @update:show="(val: boolean) => !val && (selectedEmployeeId = null)"
    >
      <EmployeeForm :employee-id="selectedEmployeeId" @submit="handleEmployeeSubmit" @cancel="showCreateModal = false" />
    </n-modal>

    <!-- Модалка просмотра сотрудника -->
    <n-modal 
      v-model:show="showViewModal" 
      preset="card"
      :auto-focus="false"
      :class="viewDetailMode === 'full' ? '' : 'fullscreen-modal'"
      :segmented="{
        content: true,
        footer: 'soft'
      }"
      :style="viewDetailMode === 'full' ? 'width: 900px' : 'width: 100vw; height: 100vh; position: fixed; left: 0; top: 0; margin: 0;'"
      :content-style="viewDetailMode === 'full' ? 'padding: 0' : 'padding: 0; height: 100%;'"
      :header-style="viewDetailMode === 'full' ? '' : 'padding: 12px 24px; background: #101014; border-bottom: 1px solid #333;'"
    >
      <template #header>
        <div class="flex items-center gap-4">
           <n-text strong class="text-xl">
             {{ selectedEmployeeForView?.name }}
             <span class="text-gray-500 font-normal ml-2">
               — {{ viewDetailMode === 'full' ? 'Персональные данные' : 'Производственная активность' }}
             </span>
           </n-text>
        </div>
      </template>
      <EmployeeDetails 
        v-if="selectedEmployeeForView" 
        :key="`view-${selectedEmployeeForView.id}-${selectedEmployeeForView.avatar?.length || 0}-${viewDetailMode}`"
        :employee="selectedEmployeeForView" 
        :mode="viewDetailMode"
      />
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, h } from 'vue'
import { useEmployeesStore } from '@/stores/employees'
import type { Employee } from '@/types'
import type { DataTableColumns, SelectOption } from 'naive-ui'
import {
  NH1,
  NText,
  NButton,
  NIcon,
  NGrid,
  NGi,
  NCard,
  NSelect,
  NInput,
  NDataTable,
  NModal,
  NTag,
  NTooltip,
  NAvatar,
  NBadge,
  NPagination,
  NFlex
} from 'naive-ui'
import {
  PeopleOutline,
  CheckmarkCircleOutline,
  CashOutline,
  PersonAddOutline,
  DownloadOutline,
  SearchOutline,
  EyeOutline,
  PencilOutline,
  TrashOutline,
  MailOutline,
  CallOutline,
  ListOutline,
  AppsOutline,
  ArrowBackOutline,
  BuildOutline,
  TimeOutline
} from '@vicons/ionicons5'
import EmployeeForm from '@/components/employees/EmployeeForm.vue'
import EmployeeDetails from '@/components/employees/EmployeeDetails.vue'
import { useDialog, useMessage } from 'naive-ui'

const employeesStore = useEmployeesStore()
const dialog = useDialog()
const message = useMessage()

const selectedInlineEmployee = ref<Employee | null>(null)
const detailsRef = ref<InstanceType<typeof EmployeeDetails> | null>(null)
const showCreateModal = ref(false)
const showViewModal = ref(false)
const selectedEmployeeIdForView = ref<string | null>(null)
const viewDetailMode = ref<'full' | 'slim'>('full')

const selectedEmployeeForView = computed(() => {
  if (!selectedEmployeeIdForView.value) return null
  return (employeesStore.employees.find(emp => emp.id === selectedEmployeeIdForView.value)) || null
})

const selectedEmployeeId = ref<string | null>(null)
const viewMode = ref<'list' | 'grid'>('list')

const searchQuery = ref('')
const filters = reactive({
  department: null as string | null,
  status: null as string | null,
  role: null as string | null
})

const departmentOptions = computed<SelectOption[]>(() => {
  return employeesStore.departments.map(dept => ({
    label: dept.name,
    value: dept.name
  }))
})

const statusOptions: SelectOption[] = [
  { label: 'Активен', value: 'active' },
  { label: 'Неактивен', value: 'inactive' },
  { label: 'Отпуск', value: 'vacation' },
  { label: 'Больничный', value: 'sick' }
]

const roleOptions: SelectOption[] = [
  { label: 'Администратор', value: 'admin' },
  { label: 'Менеджер', value: 'manager' },
  { label: 'Рабочий', value: 'worker' },
  { label: 'Кладовщик', value: 'warehouse' },
  { label: 'Производство', value: 'production' }
]

const pagination = reactive({
  page: 1,
  pageSize: 10,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
  onChange: (page: number) => {
    pagination.page = page
  },
  onUpdatePageSize: (pageSize: number) => {
    pagination.pageSize = pageSize
    pagination.page = 1
  }
})

const filteredEmployees = computed(() => {
  let result = employeesStore.employees

  // Поиск
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(emp =>
      emp.name.toLowerCase().includes(query) ||
      emp.email.toLowerCase().includes(query) ||
      emp.phone.includes(query) ||
      emp.position.toLowerCase().includes(query)
    )
  }

  // Фильтр по отделу
  if (filters.department) {
    result = result.filter(emp => emp.department === filters.department)
  }

  // Фильтр по статусу
  if (filters.status) {
    result = result.filter(emp => emp.status === filters.status)
  }

  // Фильтр по должности
  if (filters.role) {
    result = result.filter(emp => emp.role === filters.role)
  }

  return result
})

// Новое вычисляемое свойство для ФОТ отфильтрованных сотрудников
const filteredTotalSalary = computed(() => {
  return filteredEmployees.value.reduce((sum, emp) => sum + (Number(emp.salary) || 0), 0)
})

const paginatedEmployees = computed(() => {
  if (viewMode.value === 'list') return filteredEmployees.value
  const start = (pagination.page - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  return filteredEmployees.value.slice(start, end)
})

// const statusStats = computed(() => {
//   const stats = [
//     { type: 'active' as const, label: 'Активен', count: 0 },
//     { type: 'inactive' as const, label: 'Неактивен', count: 0 },
//     { type: 'vacation' as const, label: 'Отпуск', count: 0 },
//     { type: 'sick' as const, label: 'Больничный', count: 0 }
//   ]

//   employeesStore.employees.forEach(emp => {
//     const stat = stats.find(s => s.type === emp.status)
//     if (stat) stat.count++
//   })

//   return stats
// })

const employeeColumns: DataTableColumns<Employee> = [
  {
    title: 'Сотрудник',
    key: 'name',
    width: 250,
    render: (row: Employee) => h(NFlex, { 
      align: 'center', 
      wrap: false, 
      size: 12,
      class: 'cursor-pointer hover:bg-white/5 p-1 -m-1 rounded transition-all duration-200 group',
      onClick: () => viewEmployee(row.id)
    }, {
      default: () => [
        // Используем ту же логику что и в плитках, которая работает
        (row.avatar || row.photo) ? h(NAvatar, {
          round: true,
          size: 40,
          src: row.avatar || row.photo,
          key: `list-photo-${row.id}-${(row.avatar || row.photo)?.length || 0}`,
          class: 'shadow-sm border border-gray-700 group-hover:border-green-500 transition-colors'
        }) : h(NAvatar, {
          round: true,
          size: 40,
          key: `list-text-${row.id}`,
          class: 'group-hover:bg-green-600 transition-colors'
        }, { default: () => row.name.charAt(0) }),
        h('div', { class: 'min-w-0 grow' }, [
          h('div', { 
            class: 'font-bold truncate group-hover:text-green-500 transition-colors'
          }, row.name),
          h('div', { class: 'text-[11px] text-gray-500 uppercase leading-tight group-hover:text-gray-300' }, row.position)
        ])
      ]
    })
  },
  {
    title: 'Отдел',
    key: 'department',
    width: 120,
    sorter: (a, b) => a.department.localeCompare(b.department)
  },
  {
    title: 'Контакт',
    key: 'contact',
    width: 180,
    render: (row) => h('div', [
      h('div', { class: 'flex items-center gap-1 text-sm' }, [
        h(NIcon, { size: '14' }, () => h(MailOutline)),
        h('span', row.email)
      ]),
      h('div', { class: 'flex items-center gap-1 text-sm' }, [
        h(NIcon, { size: '14' }, () => h(CallOutline)),
        h('span', row.phone)
      ])
    ])
  },
  {
    title: 'Статус',
    key: 'status',
    width: 120,
    render: (row) => {
      const isOnline = row.lastLogin && (Date.now() - new Date(row.lastLogin).getTime()) < 5 * 60 * 1000 // 5 минут
      return h('div', { class: 'flex items-center gap-2' }, [
        h(NTag, {
          type: employeesStore.getStatusColor(row.status),
          size: 'small'
        }, { default: () => employeesStore.getStatusLabel(row.status) }),
        isOnline && h(NBadge, { dot: true, type: 'success' })
      ])
    }
  },
  {
    title: 'Зарплата',
    key: 'salary',
    width: 120,
    render: (row) => formatCurrency(row.salary),
    sorter: (a, b) => a.salary - b.salary
  },
  {
    title: 'Действия',
    key: 'actions',
    width: 150,
    render: (row) => h('div', { class: 'flex gap-2' }, [
      h(NTooltip, null, {
        trigger: () => h(NButton, {
          size: 'small',
          type: 'info',
          quaternary: true,
          onClick: (e) => {
            e.stopPropagation()
            viewEmployee(row.id, 'full')
          }
        }, { icon: () => h(NIcon, null, { default: () => h(EyeOutline) }) }),
        default: () => 'Просмотр полной анкеты'
      }),
      h(NTooltip, null, {
        trigger: () => h(NButton, {
          size: 'small',
          type: 'warning',
          quaternary: true,
          onClick: (e) => {
            e.stopPropagation()
            editEmployee(row.id)
          }
        }, { icon: () => h(NIcon, null, { default: () => h(PencilOutline) }) }),
        default: () => 'Редактировать'
      }),
      h(NTooltip, null, {
        trigger: () => h(NButton, {
          size: 'small',
          type: 'error',
          quaternary: true,
          onClick: (e) => {
            e.stopPropagation()
            deleteEmployee(row.id)
          }
        }, { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) }),
        default: () => 'Удалить'
      })
    ])
  }
]

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0
  }).format(amount)
}

const resetFilters = () => {
  searchQuery.value = ''
  filters.department = null
  filters.status = null
  filters.role = null
}

const handleInlineBack = () => {
  if (detailsRef.value?.selectedInvoice) {
    detailsRef.value.selectedInvoice = null
  } else {
    selectedInlineEmployee.value = null
  }
}

const viewEmployee = (id: string, mode: 'full' | 'slim' = 'slim') => {
  const emp = employeesStore.employees.find(e => e.id === id)
  if (!emp) return

  if (mode === 'slim') {
    selectedInlineEmployee.value = emp
  } else {
    selectedEmployeeIdForView.value = id
    viewDetailMode.value = mode
    showViewModal.value = true
  }
}

const editEmployee = (id: string) => {
  selectedEmployeeId.value = id
  showCreateModal.value = true
}

const deleteEmployee = (id: string) => {
  dialog.warning({
    title: 'Удаление сотрудника',
    content: 'Вы уверены, что хотите удалить этого сотрудника? Это действие нельзя будет отменить.',
    positiveText: 'Удалить',
    negativeText: 'Отмена',
    onPositiveClick: () => {
      employeesStore.deleteEmployee(id)
      message.success('Сотрудник удален')
    }
  })
}

const exportData = () => {
  message.success('Данные экспортированы')
}

const handleEmployeeSubmit = (employeeData: Partial<Employee>) => {
  if (selectedEmployeeId.value) {
    employeesStore.updateEmployee(selectedEmployeeId.value, employeeData)
    message.success('Данные сотрудника обновлены')
  } else {
    employeesStore.addEmployee(employeeData as Omit<Employee, 'id'>)
    message.success('Сотрудник успешно добавлен')
  }
  showCreateModal.value = false
  selectedEmployeeId.value = null
}
</script>

<style scoped>
.employees-page {
  max-width: 1400px;
  margin: 0 auto;
}

.employee-card {
  transition: all 0.3s ease;
  cursor: pointer;
  border: 1px solid #333;
}

.employee-card:hover {
  transform: translateY(-2px);
  border-color: #18a058;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-clamp: 1;
}

.revenue-card {
  background: rgba(24, 160, 88, 0.1) !important;
  border: 1px solid rgba(24, 160, 88, 0.3) !important;
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
