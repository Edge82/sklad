<template>
  <div class="employees-page">
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
    <n-grid :cols="4" :x-gap="16" :y-gap="16" class="mb-6">
      <n-gi>
        <n-card>
          <div class="flex justify-between items-center">
            <div>
              <n-text depth="3">Всего сотрудников</n-text>
              <n-h3 class="m-0">{{ employeesStore.totalEmployees }}</n-h3>
            </div>
            <n-icon size="32" color="#2080f0">
              <PeopleOutline />
            </n-icon>
          </div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <div class="flex justify-between items-center">
            <div>
              <n-text depth="3">Активных</n-text>
              <n-h3 class="m-0">{{ employeesStore.activeEmployees }}</n-h3>
            </div>
            <n-icon size="32" color="#18a058">
              <CheckmarkCircleOutline />
            </n-icon>
          </div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <div class="flex justify-between items-center">
            <div>
              <n-text depth="3">ФОТ в месяц</n-text>
              <n-h3 class="m-0">{{ formatCurrency(employeesStore.totalSalary) }}</n-h3>
            </div>
            <n-icon size="32" color="#d03050">
              <CashOutline />
            </n-icon>
          </div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <div class="flex justify-between items-center">
            <div>
              <n-text depth="3">Отделов</n-text>
              <n-h3 class="m-0">{{ employeesStore.departments.length }}</n-h3>
            </div>
            <n-icon size="32" color="#f0a020">
              <BusinessOutline />
            </n-icon>
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
          <n-data-table :columns="employeeColumns" :data="filteredEmployees" :pagination="pagination"
            :row-key="(row: Employee) => row.id" striped @update:sorter="handleSorterChange" />
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
                        <n-text strong class="text-lg truncate block leading-tight">{{ emp.name }}</n-text>
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
                      <n-button size="small" tertiary round @click.stop="viewEmployee(emp.id)">
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
      :title="selectedEmployeeId ? 'Редактировать сотрудника' : 'Добавить сотрудника'" 
      style="width: 800px"
      @update:show="(val: boolean) => !val && (selectedEmployeeId = null)"
    >
      <EmployeeForm :employee-id="selectedEmployeeId" @submit="handleEmployeeSubmit" @cancel="showCreateModal = false" />
    </n-modal>

    <!-- Модалка просмотра сотрудника -->
    <n-modal v-model:show="showViewModal" preset="card" title="Карточка сотрудника" style="width: 800px">
      <EmployeeDetails 
        v-if="selectedEmployee" 
        :key="`view-${selectedEmployee.id}-${selectedEmployee.avatar?.length || 0}`"
        :employee="selectedEmployee" 
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
  NList,
  NListItem,
  NThing,
  NAvatar,
  NBadge,
  NPagination,
  NFlex
} from 'naive-ui'
import {
  PeopleOutline,
  CheckmarkCircleOutline,
  CashOutline,
  BusinessOutline,
  PersonAddOutline,
  DownloadOutline,
  SearchOutline,
  EyeOutline,
  PencilOutline,
  TrashOutline,
  ChevronForwardOutline,
  MailOutline,
  CallOutline,
  ListOutline,
  AppsOutline
} from '@vicons/ionicons5'
import EmployeeForm from '@/components/employees/EmployeeForm.vue'
import EmployeeDetails from '@/components/employees/EmployeeDetails.vue'
import { useDialog, useMessage } from 'naive-ui'

const employeesStore = useEmployeesStore()
const dialog = useDialog()
const message = useMessage()
const showCreateModal = ref(false)
const showViewModal = ref(false)
const selectedEmployeeIdForView = ref<string | null>(null)
const selectedEmployee = computed(() => {
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

const paginatedEmployees = computed(() => {
  if (viewMode.value === 'list') return filteredEmployees.value
  const start = (pagination.page - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  return filteredEmployees.value.slice(start, end)
})

const statusStats = computed(() => {
  const stats = [
    { type: 'active' as const, label: 'Активен', count: 0 },
    { type: 'inactive' as const, label: 'Неактивен', count: 0 },
    { type: 'vacation' as const, label: 'Отпуск', count: 0 },
    { type: 'sick' as const, label: 'Больничный', count: 0 }
  ]

  employeesStore.employees.forEach(emp => {
    const stat = stats.find(s => s.type === emp.status)
    if (stat) stat.count++
  })

  return stats
})

const employeeColumns: DataTableColumns<Employee> = [
  {
    title: 'Сотрудник',
    key: 'name',
    width: 250,
    render: (row: Employee) => h(NFlex, { align: 'center', wrap: false, size: 12 }, {
      default: () => [
        // Используем ту же логику что и в плитках, которая работает
        (row.avatar || row.photo) ? h(NAvatar, {
          round: true,
          size: 40, // Чуть больше чем small для наглядности
          src: row.avatar || row.photo,
          key: `list-photo-${row.id}-${(row.avatar || row.photo)?.length || 0}`,
          class: 'shadow-sm border border-gray-700'
        }) : h(NAvatar, {
          round: true,
          size: 40,
          key: `list-text-${row.id}`
        }, { default: () => row.name.charAt(0) }),
        h('div', { class: 'min-w-0 flex-grow' }, [
          h('div', { class: 'font-medium truncate' }, row.name),
          h('div', { class: 'text-[11px] text-gray-500 uppercase leading-tight' }, row.position)
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
      const isOnline = row.lastLogin && (Date.now() - row.lastLogin.getTime()) < 5 * 60 * 1000 // 5 минут
      return h('div', { class: 'flex items-center gap-2' }, [
        h(NTag, {
          type: employeesStore.getStatusColor(row.status) as any,
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
          onClick: () => viewEmployee(row.id)
        }, { icon: () => h(NIcon, null, { default: () => h(EyeOutline) }) }),
        default: () => 'Просмотр'
      }),
      h(NTooltip, null, {
        trigger: () => h(NButton, {
          size: 'small',
          type: 'warning',
          quaternary: true,
          onClick: () => editEmployee(row.id)
        }, { icon: () => h(NIcon, null, { default: () => h(PencilOutline) }) }),
        default: () => 'Редактировать'
      }),
      h(NTooltip, null, {
        trigger: () => h(NButton, {
          size: 'small',
          type: 'error',
          quaternary: true,
          onClick: () => deleteEmployee(row.id)
        }, { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) }),
        default: () => 'Удалить'
      })
    ])
  }
]

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('ru-RU').format(date)
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0
  }).format(amount)
}

const getStatusColorClass = (status: Employee['status']) => {
  const colorMap: Record<Employee['status'], string> = {
    'active': 'green-500',
    'inactive': 'gray-500',
    'vacation': 'yellow-500',
    'sick': 'red-500'
  }
  return colorMap[status] || 'gray-500'
}

const resetFilters = () => {
  searchQuery.value = ''
  filters.department = null
  filters.status = null
  filters.role = null
}

const viewEmployee = (id: string) => {
  selectedEmployeeIdForView.value = id
  showViewModal.value = true
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

const viewDepartment = (id: string) => {
  const dept = employeesStore.departments.find(d => String(d.id) === String(id))
  if (dept) {
    message.info(`Просмотр отдела: ${dept.name}`)
  }
}

const exportData = () => {
  message.success('Данные экспортированы')
}

const handleEmployeeSubmit = (employeeData: any) => {
  if (selectedEmployeeId.value) {
    employeesStore.updateEmployee(selectedEmployeeId.value, employeeData)
    message.success('Данные сотрудника обновлены')
  } else {
    employeesStore.addEmployee(employeeData)
    message.success('Сотрудник успешно добавлен')
  }
  showCreateModal.value = false
  selectedEmployeeId.value = null
}

const handleSorterChange = (sorter: any) => {
  // Logic for server-side sorting can be added here
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
}
</style>
