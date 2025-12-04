<template>
  <n-layout-header bordered class="px-6 py-4 flex justify-between items-center">
    <n-breadcrumb>
      <n-breadcrumb-item @click="$router.push('/dashboard')">
        <n-icon>
          <HomeOutline />
        </n-icon>
        Главная
      </n-breadcrumb-item>
      <n-breadcrumb-item v-for="item in breadcrumbs" :key="item.path">
        {{ item.label }}
      </n-breadcrumb-item>
    </n-breadcrumb>

    <div class="flex items-center gap-4">
      <n-badge :value="notificationsCount" :max="99" show-zero>
        <n-button circle quaternary @click="showNotifications = true">
          <template #icon>
            <n-icon>
              <NotificationsOutline />
            </n-icon>
          </template>
        </n-button>
      </n-badge>

      <n-dropdown :options="userOptions" @select="handleUserAction">
        <n-button quaternary>
          <div class="flex items-center gap-2">
            <n-avatar round size="small" :src="userStore.user?.avatar">
              {{ userStore.user?.name?.charAt(0) }}
            </n-avatar>
            <span>{{ userStore.user?.name }}</span>
            <n-icon>
              <ChevronDownOutline />
            </n-icon>
          </div>
        </n-button>
      </n-dropdown>
    </div>
  </n-layout-header>

  <!-- Уведомления -->
  <n-drawer v-model:show="showNotifications" :width="400">
    <n-drawer-content title="Уведомления">
      <n-list>
        <n-list-item v-for="notification in notifications" :key="notification.id">
          <n-thing :title="notification.title" :description="notification.message">
            <template #avatar>
              <n-avatar :type="notification.type === 'warning' ? 'warning' : 'info'">
                <n-icon v-if="notification.type === 'warning'">
                  <WarningOutline />
                </n-icon>
                <n-icon v-else>
                  <InformationCircleOutline />
                </n-icon>
              </n-avatar>
            </template>
            <template #description>
              <div class="flex justify-between items-center">
                <span>{{ notification.message }}</span>
                <n-text depth="3" class="text-xs">
                  {{ formatTime(notification.timestamp) }}
                </n-text>
              </div>
            </template>
          </n-thing>
        </n-list-item>
      </n-list>
    </n-drawer-content>
  </n-drawer>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import {
  NLayoutHeader,
  NBreadcrumb,
  NBreadcrumbItem,
  NIcon,
  NButton,
  NBadge,
  NDropdown,
  NAvatar,
  NDrawer,
  NDrawerContent,
  NList,
  NListItem,
  NThing,
  NText
} from 'naive-ui'
import {
  HomeOutline,
  NotificationsOutline,
  PersonCircleOutline,
  LogOutOutline,
  ChevronDownOutline,
  WarningOutline,
  InformationCircleOutline
} from '@vicons/ionicons5'
import type { DropdownOption } from 'naive-ui'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const showNotifications = ref(false)

const notificationsCount = ref(3)
const notifications = ref([
  {
    id: 1,
    title: 'Низкий запас',
    message: 'Фанера 18мм осталось меньше минимального запаса',
    type: 'warning',
    timestamp: new Date(Date.now() - 1000 * 60 * 30) // 30 минут назад
  },
  {
    id: 2,
    title: 'Новый заказ',
    message: 'Поступил новый заказ №2456',
    type: 'info',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) // 2 часа назад
  },
  {
    id: 3,
    title: 'Обновление системы',
    message: 'Запланировано обновление на 20:00',
    type: 'info',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5) // 5 часов назад
  }
])

const breadcrumbs = computed(() => {
  const pathArray = route.path.split('/').filter(path => path)
  return pathArray.map((path, index) => ({
    path: `/${pathArray.slice(0, index + 1).join('/')}`,
    label: path.charAt(0).toUpperCase() + path.slice(1)
  }))
})

function renderIcon(icon: any) {
  return () => h(NIcon, null, { default: () => h(icon) })
}

const userOptions: DropdownOption[] = [
  {
    label: 'Личный кабинет',
    key: 'profile',
    icon: renderIcon(PersonCircleOutline)
  },
  {
    label: 'Выйти',
    key: 'logout',
    icon: renderIcon(LogOutOutline)
  }
]

const handleUserAction = (key: string) => {
  if (key === 'logout') {
    userStore.logout()
    router.push('/login')
  } else if (key === 'profile') {
    router.push('/profile')
  }
}

const formatTime = (date: Date) => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)

  if (minutes < 60) {
    return `${minutes} мин. назад`
  } else if (hours < 24) {
    return `${hours} ч. назад`
  } else {
    return date.toLocaleDateString('ru-RU')
  }
}
</script>
