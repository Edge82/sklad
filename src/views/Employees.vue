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
      </div>
    </n-card>

    <!-- Таблицы сотрудников и отделов -->
    <n-grid :cols="3" :x-gap="16" :y-gap="16">
      <!-- Основная таблица сотрудников -->
      <n-gi :span="2">
        <n-card title="Список сотрудников">
          <n-data-table :columns="employeeColumns" :data="filteredEmployees" :pagination="pagination"
            :row-key="(row: Employee) => row.id" striped @update:sorter="handleSorterChange" />
        </n-card>
      </n-gi>

      <!-- Статистика по отделам -->
      <n-gi>
        <n-card title="Отделы">
          <n-list>
            <n-list-item v-for="dept in employeesStore.departments" :key="dept.id">
              <n-thing :title="dept.name">
                <template #description>
                  <div class="flex justify-between items-center">
                    <span>{{ dept.employeeCount }} сотрудников</span>
                    <n-tag size="small" type="info">
                      {{ formatCurrency(dept.budget) }}/год
                    </n-tag>
                  </div>
                </template>
                <template #header-extra>
                  <n-button size="tiny" quaternary @click="viewDepartment(dept.id)">
                    <n-icon>
                      <ChevronForwardOutline />
                    </n-icon>
                  </n-button>
                </template>
              </n-thing>
            </n-list-item>
          </n-list>
        </n-card>

        <!-- График по статусам -->
        <n-card title="Статусы сотрудников" class="mt-4">
          <div class="h-40 flex items-center justify-center">
            <div class="text-center">
              <div v-for="status in statusStats" :key="status.type" class="flex items-center gap-2 mb-2">
                <div :class="`w-3 h-3 rounded-full bg-${getStatusColorClass(status.type)}`"></div>
                <span>{{ status.label }}: {{ status.count }}</span>
              </div>
            </div>
          </div>
        </n-card>
      </n-gi>
    </n-grid>

    <!-- Модалка создания сотрудника -->
    <n-modal v-model:show="showCreateModal" preset="card" title="Добавить сотрудника" style="width: 600px">
      <EmployeeForm @submit="handleEmployeeSubmit" @cancel="showCreateModal = false" />
    </n-modal>

    <!-- Модалка просмотра сотрудника -->
    <n-modal v-model:show="showViewModal" preset="card" title="Карточка сотрудника" style="width: 800px">
      <EmployeeDetails v-if="selectedEmployee" :employee="selectedEmployee" />
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
  NBadge
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
  CallOutline
} from '@vicons/ionicons5'
import EmployeeForm from '@/components/employees/EmployeeForm.vue'
import EmployeeDetails from '@/components/employees/EmployeeDetails.vue'

const employeesStore = useEmployeesStore()
const showCreateModal = ref(false)
const showViewModal = ref(false)
const selectedEmployee = ref<Employee | null>(null)

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

const pagination = {
  pageSize: 10
}

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
    render: (row) => h('div', { class: 'flex items-center gap-3' }, [
      h(NAvatar, {
        round: true,
        size: 'small',
        src: row.avatar
      }, () => row.name.charAt(0)),
      h('div', [
        h('div', { class: 'font-medium' }, row.name),
        h('div', { class: 'text-xs text-gray-500' }, row.position)
      ])
    ])
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
    title: 'Дата приема',
    key: 'hireDate',
    width: 120,
    render: (row) => formatDate(row.hireDate),
    sorter: (a, b) => a.hireDate.getTime() - b.hireDate.getTime()
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

const viewEmployee = (id: number) => {
  selectedEmployee.value = employeesStore.getEmployeeById(id)
  showViewModal.value = true
}

const editEmployee = (id: number) => {
  // Реализация редактирования
  window.$message?.info('Редактирование сотрудника')
}

const deleteEmployee = (id: number) => {
  if (window.$dialog) {
    window.$dialog.warning({
      title: 'Удаление сотрудника',
      content: 'Вы уверены, что хотите удалить этого сотрудника?',
      positiveText: 'Удалить',
      negativeText: 'Отмена',
      onPositiveClick: () => {
        employeesStore.deleteEmployee(id)
        window.$message?.success('Сотрудник удален')
      }
    })
  }
}

const viewDepartment = (id: number) => {
  const dept = employeesStore.departments.find(d => d.id === id)
  if (dept) {
    window.$message?.info(`Просмотр отдела: ${dept.name}`)
  }
}

const exportData = () => {
  window.$message?.success('Данные экспортированы')
}

const handleEmployeeSubmit = (employeeData: any) => {
  employeesStore.addEmployee(employeeData)
  showCreateModal.value = false
  window.$message?.success('Сотрудник успешно добавлен')
}

const handleSorterChange = (sorter: any) => {
  console.log('Сортировка:', sorter)
}
</script>

<style scoped>
.employees-page {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
