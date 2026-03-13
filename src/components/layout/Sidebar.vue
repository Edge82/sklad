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
  SyncOutline
} from '@vicons/ionicons5'
import type { MenuOption } from 'naive-ui'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const collapsed = ref(false)

const currentRoute = computed(() => route.path)

const menuOptions = computed<MenuOption[]>(() => {
  const options: MenuOption[] = [
    {
      label: 'Склад',
      key: 'inventory-group',
      icon: renderIcon(CubeOutline),
      children: [
        {
          label: 'Основная продукция',
          key: '/inventory',
        },
        {
          label: 'Готовая продукция',
          key: '/inventory/finished',
        }
      ]
    },
    {
      label: 'Заказы',
      key: '/orders',
      icon: renderIcon(DocumentTextOutline)
    },
    {
      label: 'Сканирование (QR)',
      key: '/scan',
      icon: renderIcon(QrCodeOutline)
    }
  ]

  // Инструменты доступны всем кроме Рабочего (Рабочий не видит, Кладовщик видит)
  if (!userStore.isWorker) {
    options.push({
      label: 'Инструменты',
      key: '/tools',
      icon: renderIcon(HammerOutline)
    })
  }

  // Сотрудники для Рабочего превращаются в Личный кабинет
  if (userStore.isWorker) {
    options.push({
      label: 'Личный кабинет',
      key: '/profile',
      icon: renderIcon(PeopleOutline)
    })
  } else {
    options.push({
      label: 'Сотрудники',
      key: '/employees',
      icon: renderIcon(PeopleOutline)
    })
  }

  options.push({
    label: 'Движение материалов',
    key: '/shipment',
    icon: renderIcon(SyncOutline)
  })

  // Интеграция видна всем кроме Рабочего
  if (!userStore.isWorker) {
    options.push({
      label: 'Интеграция 1С',
      key: '/integration',
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
  router.push(key)
}
</script>
