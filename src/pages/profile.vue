<template>
  <div class="profile-page">
    <n-h1>Личный кабинет</n-h1>

    <n-grid :cols="12" :x-gap="16" :y-gap="16">
      <!-- Информация о пользователе -->
      <n-gi :span="8">
        <n-card title="Основная информация">
          <n-form :model="userForm" :rules="rules" ref="formRef">
            <n-grid :cols="2" :x-gap="12">
              <n-gi>
                <n-form-item label="ФИО" path="name">
                  <n-input v-model:value="userForm.name" placeholder="Введите ваше имя" />
                </n-form-item>
              </n-gi>
              <n-gi>
                <n-form-item label="Email" path="email">
                  <n-input v-model:value="userForm.email" placeholder="Введите email" />
                </n-form-item>
              </n-gi>
              <n-gi>
                <n-form-item label="Телефон" path="phone">
                  <n-input v-model:value="userForm.phone" placeholder="+7 (999) 999-99-99" />
                </n-form-item>
              </n-gi>
              <n-gi>
                <n-form-item label="Отдел" path="department">
                  <n-input v-model:value="userForm.department" placeholder="Отдел" :disabled="userStore.isWorker" />
                </n-form-item>
              </n-gi>
            <n-gi>
                <n-form-item label="Должность" path="role">
                  <n-select v-model:value="userForm.role" :options="roleOptions" placeholder="Выберите должность" disabled />
                </n-form-item>
              </n-gi>
            </n-grid>

            <div class="flex gap-3 mt-6">
              <n-button type="primary" @click="handleSave">Сохранить изменения</n-button>
              <n-button @click="resetForm">Отмена</n-button>
            </div>
          </n-form>
        </n-card>

        <!-- Статистика -->
        <n-card title="Статистика активности" class="mt-4">
          <n-grid v-if="userStore.user && employeesStore.employees.length > 0" :cols="3" :y-gap="8">
            <n-gi>
              <n-statistic label="За сегодня" :value="stats.todayActions" />
            </n-gi>
            <n-gi>
              <n-statistic label="За неделю" :value="stats.weekActions" />
            </n-gi>
            <n-gi>
              <n-statistic label="Всего действий" :value="stats.totalActions" />
            </n-gi>
          </n-grid>
          <n-empty v-else-if="employeesStore.employees.length === 0"
                   description="Данные о сотрудниках не загружены"
                   class="py-4" />
          <n-empty v-else
                   description="Нет данных о деятельности"
                   class="py-4" />
        </n-card>

        <! -- История операций -->
        <n-card title="Мои последние операции" class="mt-4">
          <div v-if="invoicesLoading || toolOperationsLoading" class="flex items-center justify-center py-8">
            <n-spin size="small" />
          </div>
          <n-empty v-else-if="allOperations.length === 0" description="Вы еще не создавали накладных" />
          <n-timeline v-else :collapse="true">
            <n-timeline-item
              v-for="op in allOperations.slice(0, 10)"
              :key="op.id"
              :type="getOperationType(op)"
              :title="op.title"
              :time="formatDateTime(op.date)"
            >
              <div class="text-sm space-y-2">
                <!-- Показываем направление только если оно отличается от заголовка -->
                <div v-if="op.destination && !op.title.includes(op.destination)" class="flex items-center gap-2">
                  <n-text depth="3">Направление:</n-text>
                  <n-text strong>{{ op.destination }}</n-text>
                </div>

                <n-card v-if="op.items && op.items.length > 0" size="small" class="mt-2">
                  <n-table size="small" :single-line="false">
                    <thead>
                      <tr>
                        <th>Наименование</th>
                        <th>Артикул</th>
                        <th>Кол-во</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(item, idx) in op.items.slice(0, 5)" :key="idx">
                        <td>{{ item.productName }}</td>
                        <td><n-text depth="3">{{ item.article || '-' }}</n-text></td>
                        <td>{{ item.quantity }} {{ item.unit }}</td>
                      </tr>
                    </tbody>
                  </n-table>
                  <n-text v-if="op.items.length > 5" depth="3" class="text-xs mt-2">
                    + еще {{ op.items.length - 5 }} позиций...
                  </n-text>
                </n-card>

                <n-text v-if="op.subtitle && op.items?.length === 0" depth="3" class="text-xs">
                  {{ op.subtitle }}
                </n-text>
              </div>
            </n-timeline-item>
          </n-timeline>
        </n-card>
      </n-gi>

      <!-- Боковая панель -->
      <n-gi :span="4">
        <!-- Аватар и основная информация -->
        <n-card>
          <div class="flex flex-col items-center text-center">
            <n-avatar round :size="80" :src="userStore.user?.avatar" class="mb-4">
              {{ userStore.user?.name?.charAt(0) }}
            </n-avatar>
            <n-h3 class="m-0">{{ userStore.user?.name }}</n-h3>
            <n-text depth="3" class="mb-2">{{ userStore.user?.role }}</n-text>
            <n-tag :type="getRoleTagType(userStore.user?.role)" size="small">
              {{ getRoleLabel(userStore.user?.role) }}
            </n-tag>
          </div>

          <n-divider />

          <n-list>
            <n-list-item>
              <template #prefix>
                <n-icon>
                  <MailOutline />
                </n-icon>
              </template>
              <n-text>{{ userStore.user?.email }}</n-text>
            </n-list-item>
            <n-list-item>
              <template #prefix>
                <n-icon>
                  <CallOutline />
                </n-icon>
              </template>
              <n-text>{{ userStore.user?.phone }}</n-text>
            </n-list-item>
            <n-list-item>
              <template #prefix>
                <n-icon>
                  <BusinessOutline />
                </n-icon>
              </template>
              <n-text>{{ userStore.user?.department }}</n-text>
            </n-list-item>
            <n-list-item>
              <template #prefix>
                <n-icon>
                  <CalendarOutline />
                </n-icon>
              </template>
              <n-text>В системе с {{ formatDate(userStore.user?.createdAt) }}</n-text>
            </n-list-item>
            <n-list-item>
              <template #prefix>
                <n-icon>
                  <TimeOutline />
                </n-icon>
              </template>
              <n-text>Последний вход: {{ formatDate(userStore.user?.lastLogin) }}</n-text>
            </n-list-item>
          </n-list>
        </n-card>

        <!-- Инструменты в работе -->
        <n-card
          v-if="userStore.user"
          title="Инструменты в работе"
          class="mt-4 cursor-pointer hover:border-[#18a058] transition-colors"
          @click="$router.push('/profile/tools')"
        >
          <div class="flex items-center gap-3">
            <n-icon size="32" color="#2080f0">
              <ConstructOutline />
            </n-icon>
            <div>
              <n-h3 class="m-0 leading-none">{{ issuedTools.length }}</n-h3>
              <n-text depth="3" class="text-xs">{{ issuedTools.length === 1 ? 'инструмент' : issuedTools.length >= 2 && issuedTools.length <= 4 ? 'инструмента' : 'инструментов' }}</n-text>
            </div>
          </div>
          <n-divider class="my-3" />
          <n-text depth="3" class="text-xs">
            Нажмите, чтобы посмотреть подробности
          </n-text>
        </n-card>
      </n-gi>
    </n-grid>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, onUnmounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { useEmployeesStore } from '@/stores/employees'
import { useToolsStore } from '@/stores/tools'
import type { User } from '@/types'
import {
  NGrid,
  NGi,
  NH1,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NButton,
  NAvatar,
  NTag,
  NDivider,
  NList,
  NListItem,
  NIcon,
  NText,
  NStatistic,
  NSpace,
  NEmpty,
  NCollapse,
  NCollapseItem,
  NTable,
  NTimeline,
  NTimelineItem,
  useMessage
} from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'
import {
  MailOutline,
  CallOutline,
  BusinessOutline,
  CalendarOutline,
  TimeOutline,
  ConstructOutline
} from '@vicons/ionicons5'

const userStore = useUserStore()
const employeesStore = useEmployeesStore()
const toolsStore = useToolsStore()
const formRef = ref<FormInst | null>(null)
const message = useMessage()

// Получаем историю накладных текущего пользователя
const myInvoices = ref<any[]>([])
const invoicesLoading = ref(false)

// История операций с инструментами
const toolOperations = ref<any[]>([])
const toolOperationsLoading = ref(false)

// Загружаем историю операций с инструментами
async function loadToolOperations() {
  if (!userStore.user?.id) {
    toolOperationsLoading.value = false
    return
  }

  toolOperationsLoading.value = true

  const currentUserId = parseFloat(String(userStore.user.id))
  const employee = employeesStore.employees.find(e => {
    if (!e.userId) return false
    const empUserId = parseFloat(String(e.userId))
    return !isNaN(empUserId) && empUserId === currentUserId
  })

  if (!employee) {
    toolOperationsLoading.value = false
    return
  }

  // Загружаем операции с инструментами
  try {
    const response = await fetch(`/sklad/api/employees/${employee.id}/tool-operations`)

    if (response.ok) {
      const data = await response.json()
      if (data.success && data.operations) {
        toolOperations.value = data.operations.map((op: any) => ({
          id: op.id,
          toolId: op.tool_id,
          toolName: op.tool_name,
          inventoryNumber: op.inventory_number,
          action: op.action,
          date: new Date(op.date),
          performedBy: op.performed_by
        }))
      } else {
        toolOperations.value = []
      }
    } else {
      toolOperations.value = []
    }
  } catch {
    toolOperations.value = []
  } finally {
    toolOperationsLoading.value = false
  }
}

// История операций (объединяем накладные и операции с инструментами)
const allOperations = computed(() => {
  const operations: any[] = []

  // Накладные
  myInvoices.value.forEach(inv => {
    operations.push({
      type: 'invoice',
      action: 'invoice',
      id: inv.id,
      title: inv.orderNumber || inv.destination ? `${inv.orderNumber || 'Без номера'}${inv.destination ? ` | ${inv.destination}` : ''}` : 'Готовая продукция',
      date: new Date(inv.date),
      subtitle: inv.items?.length ? `${inv.items.length} позиций` : '',
      items: inv.items || [],
      destination: inv.destination
    })
  })

  // Операции с инструментами
  toolOperations.value.forEach(op => {
    operations.push({
      type: 'tool',
      id: op.id,
      title: op.action === 'issued' ? `Получен инструмент: ${op.toolName}` : `Сдан инструмент: ${op.toolName}`,
      date: new Date(op.date),
      subtitle: op.inventoryNumber,
      items: [],
      action: op.action
    })
  })

  // Сортируем по дате (сначала самые свежие)
  return operations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})

// Загружаем накладные для текущего пользователя
async function loadMyInvoices() {
  if (!userStore.user?.id) return

  invoicesLoading.value = true
  try {
    const currentUserId = parseFloat(String(userStore.user.id))
    const employee = employeesStore.employees.find(e => {
      if (!e.userId) return false
      const empUserId = parseFloat(String(e.userId))
      return !isNaN(empUserId) && empUserId === currentUserId
    })

    if (employee) {
      const response = await fetch(`/sklad/api/employees/${employee.id}/material-invoices`)
      const data = await response.json()

      if (data.success && data.invoices) {
        myInvoices.value = data.invoices.map((inv: any) => ({
          id: inv.id,
          employeeId: inv.employeeId,
          date: new Date(inv.date),
          orderNumber: inv.orderNumber,
          destination: inv.destination,
          totalAmount: inv.totalAmount,
          items: inv.items || [],
          createdBy: inv.createdBy
        }))
      }
    }

    console.log('profile.vue: myInvoices loaded:', myInvoices.value.length, 'items')
  } catch (err) {
    console.error('Error loading invoices:', err)
    myInvoices.value = []
  } finally {
    invoicesLoading.value = false
  }
}

// Computed для статистики
const stats = computed(() => {
  const history = myInvoices.value
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const weekAgo = todayStart - 7 * 24 * 60 * 60 * 1000

  return {
    todayActions: history.filter(h => new Date(h.date).getTime() >= todayStart).length,
    weekActions: history.filter(h => new Date(h.date).getTime() >= weekAgo).length,
    totalActions: history.length
  }
})

// Инструменты в работе
const issuedTools = computed(() => {
  if (!userStore.user?.id) return []
  const currentUserId = parseFloat(String(userStore.user?.id))
  const employee = employeesStore.employees.find(e => {
    if (!e.userId) return false
    const empUserId = parseFloat(String(e.userId))
    return !isNaN(empUserId) && empUserId === currentUserId
  })
  if (!employee) return []
  return toolsStore.getToolsIssuedToEmployee(employee.id)
})

// Helper для определения типа операции timeline
const getOperationType = (op: any) => {
  if (op.type === 'tool' && op.action === 'returned') {
    return 'success'
  }
  return 'info'
}

// Тип для формы (без служебных полей)
type UserForm = Omit<User, 'id' | 'lastLogin' | 'createdAt' | 'avatar'>

const userForm = reactive<UserForm>({
  name: '',
  email: '',
  phone: '',
  department: '',
  role: 'worker',
  isActive: true,
  permissions: []
})

const roleOptions = [
  { label: 'Директор', value: 'director' },
  { label: 'Менеджер', value: 'manager' },
  { label: 'Кладовщик', value: 'storekeeper' },
  { label: 'Рабочий', value: 'worker' }
]

const rules: FormRules = {
  name: [
    { required: true, message: 'Введите ФИО', trigger: 'blur' },
    { min: 2, message: 'Имя должно быть не менее 2 символов', trigger: 'blur' }
  ],
  email: [
    { required: true, message: 'Введите email', trigger: 'blur' },
    { type: 'email', message: 'Некорректный email', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: 'Введите телефон', trigger: 'blur' }
  ]
}

const getRoleTagType = (role?: string) => {
  switch (role) {
    case 'director': return 'error'
    case 'manager': return 'warning'
    case 'storekeeper': return 'info'
    case 'worker': return 'success'
    default: return 'default'
  }
}

const getRoleLabel = (role?: string) => {
  switch (role) {
    case 'director': return 'Директор'
    case 'manager': return 'Менеджер'
    case 'storekeeper': return 'Кладовщик'
    case 'worker': return 'Рабочий'
    default: return 'Пользователь'
  }
}

const formatDate = (date?: Date | string) => {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('ru-RU').format(d)
}

const formatDateTime = (date?: Date | string) => {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d)
}

const handleSave = () => {
  formRef.value?.validate((errors) => {
    if (!errors) {
      userStore.updateProfile(userForm)
      message.success('Профиль успешно обновлен')
    } else {
      message.error('Пожалуйста, исправьте ошибки в форме')
    }
  })
}

const resetForm = () => {
  if (userStore.user) {
    Object.assign(userForm, {
      name: userStore.user.name,
      email: userStore.user.email,
      phone: userStore.user.phone,
      department: userStore.user.department,
      role: userStore.user.role
    })
  }
}

onMounted(async () => {
  resetForm()

  // Слушаем событие обновления операций с инструментами
  const refreshHandler = () => {
    loadToolOperations()
  }
  window.addEventListener('refreshToolOperations', refreshHandler)

  // onUnmounted должен быть до await
  onUnmounted(() => {
    window.removeEventListener('refreshToolOperations', refreshHandler)
  })

  await employeesStore.loadEmployeesFromApi()

  await loadMyInvoices()
  await loadToolOperations()

  if (toolsStore.tools.length === 0) {
    toolsStore.loadToolsFromApi()
  }

  console.log('profile.vue mounted, user:', userStore.user)
})
</script>

<style scoped>
.profile-page {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
