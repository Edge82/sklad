<template>
  <div v-if="currentEmployee" class="employee-details">
    <!-- Шапка профиля -->
    <div class="mb-6">
      <div class="flex items-start gap-4">
        <!-- Фото сотрудника -->
        <div class="shrink-0 relative">
          <n-avatar 
            v-if="avatarSrc"
            round 
            :size="100" 
            :src="avatarSrc" 
            :key="avatarKey"
            class="shrink-0 border border-gray-700 shadow-xl"
            object-fit="cover"
          />
          <n-avatar 
            v-else
            round 
            :size="100" 
            class="shrink-0 border-2 border-gray-700"
          >
            {{ currentEmployee.name.charAt(0) }}
          </n-avatar>
        </div>
        <div class="grow">
          <n-h2 class="m-0 text-2xl font-bold">{{ currentEmployee.name }}</n-h2>
          <div class="flex items-center gap-3 mt-2">
            <n-tag :type="(getRoleColor(currentEmployee.role) as any)" size="small">
              {{ getRoleLabel(currentEmployee.role) }}
            </n-tag>
            <n-tag :type="(getStatusColor(currentEmployee.status) as any)" size="small">
              {{ getStatusLabel(currentEmployee.status) }}
            </n-tag>
            <span class="text-gray-400 font-medium">{{ currentEmployee.position }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Основная информация -->
    <n-grid :cols="2" :x-gap="16" :y-gap="16">
      <!-- Контактная информация -->
      <n-gi>
        <n-card title="Контактная информация">
          <n-list>
            <n-list-item>
              <template #prefix>
                <n-icon>
                  <MailOutline />
                </n-icon>
              </template>
              <n-text>{{ currentEmployee.email }}</n-text>
            </n-list-item>
            <n-list-item>
              <template #prefix>
                <n-icon>
                  <CallOutline />
                </n-icon>
              </template>
              <n-text>{{ currentEmployee.phone }}</n-text>
            </n-list-item>
            <n-list-item v-if="currentEmployee.address">
              <template #prefix>
                <n-icon>
                  <LocationOutline />
                </n-icon>
              </template>
              <n-text>{{ currentEmployee.address }}</n-text>
            </n-list-item>
            <n-list-item>
              <template #prefix>
                <n-icon>
                  <PersonCircleOutline />
                </n-icon>
              </template>
              <n-text>
                {{ currentEmployee.birthDate ? formatDate(currentEmployee.birthDate) : 'Не указано' }}
              </n-text>
            </n-list-item>
          </n-list>
        </n-card>
      </n-gi>

      <!-- Рабочая информация -->
      <n-gi>
        <n-card title="Рабочая информация">
          <n-list>
            <n-list-item>
              <template #prefix>
                <n-icon>
                  <BusinessOutline />
                </n-icon>
              </template>
              <n-text>{{ currentEmployee.department }}</n-text>
            </n-list-item>
            <n-list-item>
              <template #prefix>
                <n-icon>
                  <CalendarOutline />
                </n-icon>
              </template>
              <n-text>Принят: {{ formatDate(currentEmployee.hireDate) }}</n-text>
            </n-list-item>
            <n-list-item>
              <template #prefix>
                <n-icon>
                  <CashOutline />
                </n-icon>
              </template>
              <n-text>{{ formatCurrency(currentEmployee.salary) }} / мес</n-text>
            </n-list-item>
            <n-list-item v-if="currentEmployee.lastLogin">
              <template #prefix>
                <n-icon>
                  <TimeOutline />
                </n-icon>
              </template>
              <n-text>Последний вход: {{ formatDateTime(currentEmployee.lastLogin) }}</n-text>
            </n-list-item>
          </n-list>
        </n-card>
      </n-gi>

      <!-- Навыки -->
      <n-gi :span="2">
        <n-card title="Навыки">
          <div class="flex flex-wrap gap-2">
            <template v-if="currentEmployee.skills && currentEmployee.skills.length > 0">
              <n-tag v-for="skill in currentEmployee.skills" :key="skill" type="info" round>
                {{ skill }}
              </n-tag>
            </template>
            <n-tag v-else type="default">
              Навыки не указаны
            </n-tag>
          </div>
        </n-card>
      </n-gi>

      <!-- Примечания -->
      <n-gi :span="2" v-if="currentEmployee.notes">
        <n-card title="Примечания">
          <n-text>{{ currentEmployee.notes }}</n-text>
        </n-card>
      </n-gi>

      <!-- Действия -->
      <n-gi :span="2">
        <n-card title="Действия">
          <n-space>
            <n-button type="primary" @click="sendMessage">
              <template #icon>
                <n-icon>
                  <ChatbubbleOutline />
                </n-icon>
              </template>
              Написать сообщение
            </n-button>
            <n-button type="warning" @click="editEmployee">
              <template #icon>
                <n-icon>
                  <PencilOutline />
                </n-icon>
              </template>
              Редактировать
            </n-button>
            <n-button type="info" @click="viewDocuments">
              <template #icon>
                <n-icon>
                  <DocumentTextOutline />
                </n-icon>
              </template>
              Документы
            </n-button>
            <n-button type="error" @click="dismissEmployee">
              <template #icon>
                <n-icon>
                  <LogOutOutline />
                </n-icon>
              </template>
              Уволить
            </n-button>
          </n-space>
        </n-card>
      </n-gi>
    </n-grid>
  </div>
  <div v-else class="text-center py-8">
    <n-text depth="3">Сотрудник не найден</n-text>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useEmployeesStore } from '@/stores/employees'
import type { Employee } from '@/types'
import {
  NCard,
  NH2,
  NText,
  NTag,
  NGrid,
  NGi,
  NList,
  NListItem,
  NIcon,
  NButton,
  NSpace,
  NAvatar
} from 'naive-ui'
import {
  MailOutline,
  CallOutline,
  LocationOutline,
  PersonCircleOutline,
  BusinessOutline,
  CalendarOutline,
  CashOutline,
  TimeOutline,
  ChatbubbleOutline,
  PencilOutline,
  DocumentTextOutline,
  LogOutOutline
} from '@vicons/ionicons5'

const props = defineProps<{
  employee: Employee
}>()

// Используем стор для получения самой актуальной копии данных
const employeesStore = useEmployeesStore()
const currentEmployee = computed(() => {
  return employeesStore.employees.find(e => e.id === props.employee.id) || props.employee
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
  } catch (err) {
    return 'Некорректная дата'
  }
}

const formatDateTime = (date: Date) => {
  if (!date) return 'Не указано'
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date))
  } catch (err) {
    return 'Некорректная дата/время'
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

const sendMessage = () => {
}

const editEmployee = () => {
}

const viewDocuments = () => {
}

const dismissEmployee = () => {
}
</script>

<style scoped>
.employee-details {
  max-width: 100%;
}
</style>
