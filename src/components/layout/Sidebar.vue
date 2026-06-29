<template>
  <n-layout-sider bordered collapse-mode="width" :collapsed-width="64" :width="240" :collapsed="collapsed" show-trigger
    class="relative z-20 shrink-0" @collapse="collapsed = true" @expand="collapsed = false">
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
import { ref, computed, h, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import {
  NLayoutSider,
  NIcon,
  NText,
  NMenu
} from 'naive-ui'
import {
  CubeOutline,
  PeopleOutline,
  AnalyticsOutline,
  DocumentTextOutline,
  QrCodeOutline,
  HammerOutline,
  BuildOutline,
  SyncOutline
} from '@vicons/ionicons5'
import type { MenuOption } from 'naive-ui'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const collapsed = ref(false)

const currentRoute = computed(() => {
  try {
    return route?.path || '/'
  } catch {
    return '/'
  }
})

const menuOptions = computed<MenuOption[]>(() => {
  const options: MenuOption[] = [
    {
      label: 'Склад',
      key: 'inventory-group',
      icon: renderIcon(CubeOutline),
      children: [
        {
          label: 'Склад ТМЦ',
          key: '/inventory',
        },
        {
          label: 'Готовая продукция',
          key: '/finished-products',
        }
      ]
    },
    {
      label: 'Заказы',
      key: '/orders',
      icon: renderIcon(DocumentTextOutline)
    },
    {
      label: 'Заказы на перемещение',
      key: '/transfer-orders',
      icon: renderIcon(SyncOutline)
    },
    {
      label: 'Приём и отгрузка ',
      key: '/scan',
      icon: renderIcon(QrCodeOutline)
    }
  ]

  // Инструменты — только кладовщик, менеджер, администратор
  if (['admin', 'manager', 'storekeeper'].includes(userStore.user?.role || '')) {
    options.push({
      label: 'Инструменты',
      key: '/tools',
      icon: renderIcon(HammerOutline)
    })
  }

  // Фурнитура — только кладовщик, менеджер, администратор
  if (['admin', 'manager', 'storekeeper'].includes(userStore.user?.role || '')) {
    options.push({
      label: 'Фурнитура',
      key: '/hardware',
      icon: renderIcon(BuildOutline)
    })
  }

  // Сотрудники доступны только директору и менеджеру
  if (userStore.canManageEmployees) {
    options.push({
      label: 'Сотрудники',
      key: '/employees',
      icon: renderIcon(PeopleOutline)
    })
  }

  // Личный кабинет доступен всем
  options.push({
    label: 'Личный кабинет',
    key: '/profile',
    icon: renderIcon(PeopleOutline)
  })

  // Операции пользователей — только менеджеру и директору
  if (userStore.isAdminOrManager) {
    options.push({
      label: 'Операции пользователей',
      key: '/shipment',
      icon: renderIcon(SyncOutline)
    })
  }

  // Отчеты видны только Менеджеру и Директору
  if (userStore.isAdminOrManager) {
    options.push({
      label: 'Отчеты',
      key: '/reports',
      icon: renderIcon(AnalyticsOutline)
    })
  }

  return options
})

function renderIcon(icon: Component) {
  return () => h(NIcon, null, { default: () => h(icon) })
}

// Обработка выбора пункта меню
const handleMenuSelect = (key: string) => {
  try {
    router?.push(key).catch(() => {})
  } catch (err) {
    console.error('Navigation error:', err)
  }
}
</script>
