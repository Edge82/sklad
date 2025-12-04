<template>
  <n-layout-sider bordered collapse-mode="width" :collapsed-width="64" :width="240" :collapsed="collapsed" show-trigger
    @collapse="collapsed = true" @expand="collapsed = false">
    <div class="p-4 flex items-center gap-3 border-b">
      <n-icon size="24" class="text-[#18a058]">
        <CubeOutline />
      </n-icon>
      <n-text v-if="!collapsed" strong class="text-lg">
        Мебельный склад
      </n-text>
    </div>

    <n-menu :collapsed="collapsed" :collapsed-width="64" :collapsed-icon-size="22" :options="menuOptions"
      :value="currentRoute" @update:value="handleMenuSelect" />
  </n-layout-sider>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NLayoutSider,
  NIcon,
  NText,
  NMenu
} from 'naive-ui'
import {
  HomeOutline,
  CubeOutline,
  PeopleOutline,
  AnalyticsOutline,
  SettingsOutline,
  PersonCircleOutline,
  DocumentTextOutline
} from '@vicons/ionicons5'
import type { MenuOption } from 'naive-ui'

const route = useRoute()
const router = useRouter()
const collapsed = ref(false)

const currentRoute = computed(() => route.path)

function renderIcon(icon: any) {
  return () => h(NIcon, null, { default: () => h(icon) })
}

const menuOptions: MenuOption[] = [
  {
    label: 'Статистика',
    key: '/dashboard',
    icon: renderIcon(HomeOutline)
  },
  {
    label: 'Склад',
    key: '/inventory',
    icon: renderIcon(CubeOutline)
  },
  {
    label: 'Заказы',
    key: '/orders',
    icon: renderIcon(DocumentTextOutline)
  },
  {
    label: 'Сотрудники',
    key: '/employees',
    icon: renderIcon(PeopleOutline)
  },
  {
    label: 'Отчеты',
    key: '/reports',
    icon: renderIcon(AnalyticsOutline)
  },
  {
    type: 'divider'
  },
  {
    label: 'Личный кабинет',
    key: '/profile',
    icon: renderIcon(PersonCircleOutline)
  },
  {
    label: 'Настройки',
    key: '/settings',
    icon: renderIcon(SettingsOutline)
  }
]

// Обработка выбора пункта меню
const handleMenuSelect = (key: string) => {
  router.push(key)
}
</script>
