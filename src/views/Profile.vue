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
          <n-grid :cols="3" :y-gap="8">
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
        </n-card>

        <!-- История накладных -->
        <n-card title="Мои последние накладные" class="mt-4">
          <n-empty v-if="myInvoices.length === 0" description="Вы еще не создавали накладных" />
          <n-collapse v-else>
            <n-collapse-item 
              v-for="invoice in myInvoices" 
              :key="invoice.id" 
              :title="`Накладная от ${new Date(invoice.date).toLocaleDateString()} — Заказ: ${invoice.orderNumber}`"
              :name="invoice.id"
            >
              <n-table size="small" :single-line="false">
                <thead>
                  <tr>
                    <th>Наименование</th>
                    <th>Артикул</th>
                    <th>Кол-во</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, idx) in invoice.items" :key="idx">
                    <td>{{ item.productName }}</td>
                    <td><n-text depth="3">{{ item.article }}</n-text></td>
                    <td>{{ item.quantity }} {{ item.unit }}</td>
                  </tr>
                </tbody>
              </n-table>
            </n-collapse-item>
          </n-collapse>
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

        <!-- Быстрые действия -->
        <n-card title="Быстрые действия" class="mt-4">
          <n-space vertical>
            <n-button block @click="$router.push('/inventory')">
              <template #icon>
                <n-icon>
                  <CubeOutline />
                </n-icon>
              </template>
              Управление складом
            </n-button>
            <n-button block @click="$router.push('/orders')">
              <template #icon>
                <n-icon>
                  <DocumentTextOutline />
                </n-icon>
              </template>
              Просмотр заказов
            </n-button>
            <n-button v-if="userStore.isAdminOrManager" block @click="$router.push('/reports')">
              <template #icon>
                <n-icon>
                  <AnalyticsOutline />
                </n-icon>
              </template>
              Создать отчет
            </n-button>
          </n-space>
        </n-card>
      </n-gi>
    </n-grid>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { useEmployeesStore } from '@/stores/employees'
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
  useMessage
} from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'
import {
  MailOutline,
  CallOutline,
  BusinessOutline,
  CalendarOutline,
  TimeOutline,
  CubeOutline,
  DocumentTextOutline,
  AnalyticsOutline
} from '@vicons/ionicons5'

const userStore = useUserStore()
const employeesStore = useEmployeesStore()
const formRef = ref<FormInst | null>(null)
const message = useMessage()

// Получаем историю накладных текущего пользователя
const myInvoices = computed(() => {
  const employee = employeesStore.employees.find(e => e.userId === userStore.user?.id)
  console.log('Current User ID:', userStore.user?.id)
  console.log('Found Employee:', employee?.name)
  console.log('History length:', employee?.materialHistory?.length)
  return employee?.materialHistory || []
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

onMounted(() => {
  resetForm()
})
</script>

<style scoped>
.profile-page {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
