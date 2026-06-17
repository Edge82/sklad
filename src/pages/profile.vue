<template>
  <div class="profile-page">
    <n-h1>Личный кабинет</n-h1>

    <n-grid :cols="24" :x-gap="16" :y-gap="16">
      <n-gi :span="17">
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
          <div v-if="operationsLoading" class="flex items-center justify-center py-8">
            <n-spin size="small" />
          </div>
          <n-empty v-else-if="allOperations.length === 0" description="Операции не найдены" />
          <n-data-table
            v-else
            :columns="operationsColumns"
            :data="allOperations.slice(0, 5)"
            :bordered="false"
            :bottom-bordered="true"
            size="small"
          />
        </n-card>
      </n-gi>

      <!-- Боковая панель -->
      <n-gi :span="7">
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
import { ref, reactive, onMounted, computed, onUnmounted, onActivated } from 'vue'
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
  NEmpty,
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

// Операции пользователя (накладные, инструмент, перемещения)
const allOperations = ref<any[]>([])
const operationsLoading = ref(false)

async function loadAllOperations() {
  if (!userStore.user?.id) return
  operationsLoading.value = true
  try {
    const currentUserId = parseFloat(String(userStore.user.id))
    const employee = employeesStore.employees.find(e => {
      if (!e.userId) return false
      const empUserId = parseFloat(String(e.userId))
      return !isNaN(empUserId) && empUserId === currentUserId
    })
    if (!employee) {
      return
    }

    const res = await fetch(`/sklad/api/employees/${employee.id}/operations?limit=50`)
    if (!res.ok) return
    const data = await res.json()

    // Also fetch operation_logs directly by employee name (login)
    const logsByLoginRes = await fetch(`/sklad/api/operation-logs/by-name?name=${encodeURIComponent(userStore.user?.login || '')}&limit=50`)
    const logsByLogin = logsByLoginRes.ok ? await logsByLoginRes.json() : { logs: [] }

    // Merge both sources, deduplicate by id
    const seenIds = new Set()
    const allRawLogs = [...(data.logs || []), ...(logsByLogin.logs || [])].filter((log: any) => {
      const key = `${log.operation_type}-${log.id}`
      if (seenIds.has(key)) return false
      seenIds.add(key)
      return true
    })

    const operations: any[] = []
    const labelMap: Record<string, string> = {
      transfer_order_completed: 'Заказ перемещения выполнен',
      transfer_order_created: 'Создан заказ перемещения',
      transfer_order_sent: 'Заказ перемещения отправлен в 1С',
      transfer_order_deleted: 'Заказ перемещения удалён',
      transfer_order_updated: 'Заказ перемещения изменён',
      transfer_scans_saved: 'Сканирование сохранено',
      qr_code_shipped: 'Материал отгружен',
      qr_code_scanned: 'QR-код отсканирован',
      qr_codes_generated: 'Сгенерированы QR-коды',
      tool_issued: 'Выдача инструмента',
      tool_returned: 'Возврат инструмента',
      tool_created: 'Создан инструмент',
      tool_updated: 'Инструмент обновлён',
      tool_deleted: 'Инструмент удалён',
      tool_operation: 'Операция с инструментом',
      tool_breakdown_reported: 'Поломка инструмента',
      material_issued: 'Выдача материала',
      material_returned: 'Возврат материала',
      invoice_created: 'Создана накладная'
    }

    allRawLogs.forEach((log: any) => {
      const opType = log.operation_type
      const resolvedName = log.resolved_name || log.employee_name || ''
      if (opType.startsWith('invoice_')) {
        const dest = opType.replace('invoice_', '')
        const destLabel = dest === 'workshop' ? 'Цех'
          : dest === 'warehouse' ? 'Склад'
          : dest === 'production' ? 'Производство'
          : dest
        operations.push({
          type: 'invoice',
          id: `inv-${log.id}`,
          title: log.order_number ? `${log.order_number}${destLabel ? ` | ${destLabel}` : ''}` : destLabel || 'Готовая продукция',
          date: new Date(log.created_at),
          items: [],
          employeeName: resolvedName
        })
      } else if (opType.startsWith('tool_')) {
        const toolTitles: Record<string, string> = {
          tool_issued: `Получен инструмент: ${log.product_name || ''}`,
          tool_returned: `Сдан инструмент: ${log.product_name || ''}`,
          tool_created: `Создан инструмент: ${log.product_name || ''}`
        }
        const toolActions: Record<string, string> = {
          tool_issued: 'issued',
          tool_returned: 'returned',
          tool_created: 'created'
        }
        operations.push({
          type: 'tool',
          id: `tool-${log.id}`,
          title: toolTitles[opType] || `Операция: ${log.product_name || ''}`,
          date: new Date(log.created_at),
          items: [],
          action: toolActions[opType] || 'unknown',
          subtitle: log.qr_code || '',
          employeeName: resolvedName
        })
      } else if (opType.startsWith('material_')) {
        const matTitles: Record<string, string> = {
          material_issued: `Получен материал: ${log.product_name || ''}`,
          material_returned: `Сдан материал: ${log.product_name || ''}`,
          material_created: `Создан материал: ${log.product_name || ''}`
        }
        const matActions: Record<string, string> = {
          material_issued: 'issued',
          material_returned: 'returned',
          material_created: 'created'
        }
        operations.push({
          type: 'tool',
          id: `mat-${log.id}`,
          title: matTitles[opType] || `Операция: ${log.product_name || ''}`,
          date: new Date(log.created_at),
          items: [],
          action: matActions[opType] || 'unknown',
          subtitle: log.qr_code || '',
          employeeName: resolvedName
        })
      } else if (opType === 'transfer_order') {
        operations.push({
          type: 'movement',
          id: `to-${log.id}`,
          title: `Перемещение${log.order_number ? ` | ${log.order_number}` : ''}`,
          date: new Date(log.created_at),
          items: [],
          subtitle: typeof log.details === 'string' ? log.details : (log.details?.description || ''),
          employeeName: resolvedName
        })
      } else {
        const label = labelMap[opType] || opType
        operations.push({
          type: 'movement',
          id: `log-${log.id}`,
          title: log.order_number ? `${label} | ${log.order_number}` : label,
          date: new Date(log.created_at),
          items: [],
          subtitle: log.product_name || log.details || '',
          employeeName: resolvedName
        })
      }
    })

    operations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    allOperations.value = operations
  } catch (err) {
    console.error('Failed to load operations:', err)
    allOperations.value = []
  } finally {
    operationsLoading.value = false
  }
}

// Computed для статистики
const stats = computed(() => {
  const history = allOperations.value
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
  { label: 'Администратор', value: 'admin' },
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
    case 'admin': return 'error'
    case 'manager': return 'warning'
    case 'storekeeper': return 'info'
    case 'worker': return 'success'
    default: return 'default'
  }
}

const getRoleLabel = (role?: string) => {
  switch (role) {
    case 'admin': return 'Администратор'
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

// История операций (объединяем накладные, операции с инструментами и перемещения)
const operationsColumns: any[] = [
  {
    title: 'Дата',
    key: 'date',
    render: (row: any) => formatDateTime(row.date)
  },
  {
    title: 'Тип',
    key: 'type',
    ellipsis: { tooltip: true },
    render: (row: any) => {
      if (row.type === 'invoice') return 'Накладная'
      if (row.type === 'tool') {
        if (row.action === 'issued') return 'Выдача инструмента'
        if (row.action === 'returned') return 'Возврат инструмента'
        if (row.action === 'created') return 'Создание инструмента'
        return 'Операция с инструментом'
      }
      return 'Перемещение'
    }
  },
  {
    title: 'Ответственный',
    key: 'employeeName',
    ellipsis: { tooltip: true },
    render: (row: any) => row.employeeName || row.subtitle || '—'
  },
  {
    title: 'Описание',
    key: 'title',
    ellipsis: { tooltip: true }
  }
]

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

  // Слушаем события обновления операций
  const refreshHandler = () => {
    loadAllOperations()
  }
  window.addEventListener('refreshToolOperations', refreshHandler)
  window.addEventListener('refreshUserOperations', refreshHandler)

  // onUnmounted должен быть до await
  onUnmounted(() => {
    window.removeEventListener('refreshToolOperations', refreshHandler)
    window.removeEventListener('refreshUserOperations', refreshHandler)
  })

  await employeesStore.loadEmployeesFromApi()

  await loadAllOperations()

  if (toolsStore.tools.length === 0) {
    toolsStore.loadToolsFromApi()
  }

  })

onActivated(async () => {
  resetForm()

  await employeesStore.loadEmployeesFromApi()

  await loadAllOperations()

  if (toolsStore.tools.length === 0) {
    toolsStore.loadToolsFromApi()
  }

  })
</script>

<style scoped>
.profile-page {
  max-width: 1600px;
  margin: 0 auto;
}
</style>
