<template>
  <div v-if="employee" class="employee-details">
    <!-- Шапка профиля -->
    <div class="mb-6">
      <div class="flex items-start gap-4">
        <n-avatar round :size="80" :src="employee.avatar" class="flex-shrink-0">
          {{ employee.name.charAt(0) }}
        </n-avatar>
        <div class="flex-grow">
          <n-h2 class="m-0">{{ employee.name }}</n-h2>
          <div class="flex items-center gap-3 mt-2">
            <n-tag :type="getRoleColor(employee.role)" size="small">
              {{ getRoleLabel(employee.role) }}
            </n-tag>
            <n-tag :type="getStatusColor(employee.status)" size="small">
              {{ getStatusLabel(employee.status) }}
            </n-tag>
            <span class="text-gray-500">{{ employee.position }}</span>
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
              <n-text>{{ employee.email }}</n-text>
            </n-list-item>
            <n-list-item>
              <template #prefix>
                <n-icon>
                  <CallOutline />
                </n-icon>
              </template>
              <n-text>{{ employee.phone }}</n-text>
            </n-list-item>
            <n-list-item v-if="employee.address">
              <template #prefix>
                <n-icon>
                  <LocationOutline />
                </n-icon>
              </template>
              <n-text>{{ employee.address }}</n-text>
            </n-list-item>
            <n-list-item>
              <template #prefix>
                <n-icon>
                  <PersonCircleOutline />
                </n-icon>
              </template>
              <n-text>
                {{ employee.birthDate ? formatDate(employee.birthDate) : 'Не указано' }}
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
              <n-text>{{ employee.department }}</n-text>
            </n-list-item>
            <n-list-item>
              <template #prefix>
                <n-icon>
                  <CalendarOutline />
                </n-icon>
              </template>
              <n-text>Принят: {{ formatDate(employee.hireDate) }}</n-text>
            </n-list-item>
            <n-list-item>
              <template #prefix>
                <n-icon>
                  <CashOutline />
                </n-icon>
              </template>
              <n-text>{{ formatCurrency(employee.salary) }} / мес</n-text>
            </n-list-item>
            <n-list-item v-if="employee.lastLogin">
              <template #prefix>
                <n-icon>
                  <TimeOutline />
                </n-icon>
              </template>
              <n-text>Последний вход: {{ formatDateTime(employee.lastLogin) }}</n-text>
            </n-list-item>
          </n-list>
        </n-card>
      </n-gi>

      <!-- Навыки -->
      <n-gi :span="2">
        <n-card title="Навыки">
          <div class="flex flex-wrap gap-2">
            <n-tag v-for="skill in employee.skills" :key="skill" type="info" round>
              {{ skill }}
            </n-tag>
            <n-tag v-if="employee.skills.length === 0" type="default">
              Навыки не указаны
            </n-tag>
          </div>
        </n-card>
      </n-gi>

      <!-- Примечания -->
      <n-gi :span="2" v-if="employee.notes">
        <n-card title="Примечания">
          <n-text>{{ employee.notes }}</n-text>
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
import { computed } from 'vue'
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

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('ru-RU').format(date)
}

const formatDateTime = (date: Date) => {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0
  }).format(amount)
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
  window.$message?.info('Отправка сообщения сотруднику')
}

const editEmployee = () => {
  window.$message?.info('Редактирование сотрудника')
}

const viewDocuments = () => {
  window.$message?.info('Просмотр документов сотрудника')
}

const dismissEmployee = () => {
  if (window.$dialog) {
    window.$dialog.warning({
      title: 'Увольнение сотрудника',
      content: 'Вы уверены, что хотите уволить этого сотрудника?',
      positiveText: 'Уволить',
      negativeText: 'Отмена',
      onPositiveClick: () => {
        window.$message?.success('Сотрудник уволен')
      }
    })
  }
}
</script>

<style scoped>
.employee-details {
  max-width: 100%;
}
</style>
