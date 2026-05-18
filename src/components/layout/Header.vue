<template>
  <n-layout-header bordered class="px-6 flex justify-between items-center h-16 shrink-0 relative bg-[#101014] z-10">
    <n-breadcrumb class="overflow-hidden whitespace-nowrap">
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
      <OneCStatusBanner />

      <n-dropdown :options="userOptions" @select="handleUserAction" trigger="click">
        <n-button quaternary class="px-2! h-10 border-0">
          <div class="flex items-center gap-2">
            <n-avatar round size="small" :src="userStore.user?.avatar" v-if="userStore.user?.avatar">
              {{ userStore.user?.name?.charAt(0) }}
            </n-avatar>
            <n-avatar round size="small" v-else class="bg-teal-600!">
              {{ userStore.user?.name?.charAt(0) || 'А' }}
            </n-avatar>
            <span class="font-medium text-white">{{ userStore.user?.name || 'Загрузка...' }}</span>
            <n-icon size="16" class="text-gray-400">
              <ChevronDownOutline />
            </n-icon>
          </div>
        </n-button>
      </n-dropdown>
    </div>
  </n-layout-header>
</template>

<script setup lang="ts">
import { ref, computed, h, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import {
  NLayoutHeader,
  NBreadcrumb,
  NBreadcrumbItem,
  NIcon,
  NButton,
  NDropdown,
  NAvatar
} from 'naive-ui'
import {
  HomeOutline,
  PersonCircleOutline,
  LogOutOutline,
  ChevronDownOutline
} from '@vicons/ionicons5'
import type { DropdownOption } from 'naive-ui'
import OneCStatusBanner from './OneCStatusBanner.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const breadcrumbs = computed(() => {
  const pathArray = route.path.split('/').filter(path => path)
  return pathArray.map((path, index) => ({
    path: `/${pathArray.slice(0, index + 1).join('/')}`,
    label: path.charAt(0).toUpperCase() + path.slice(1)
  }))
})

function renderIcon(icon: Component) {
  return () => h(NIcon, null, { default: () => h(icon) })
}

const userOptions = computed<DropdownOption[]>(() => [
  {
    label: userStore.user?.name || 'Пользователь',
    key: 'user-info',
    disabled: true
  },
  {
    type: 'divider',
    key: 'd1'
  },
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
])

const handleUserAction = (key: string) => {
  if (key === 'logout') {
    userStore.logout()
    router.push('/login')
  } else if (key === 'profile') {
    router.push('/profile')
  }
}
</script>
