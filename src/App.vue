<template>
  <n-config-provider :theme="theme" :locale="ruRU" :date-locale="dateRuRU">
    <n-loading-bar-provider>
      <n-notification-provider>
        <n-dialog-provider>
          <n-message-provider>
            <Layout v-if="userStore.isAuthenticated" />
            <router-view v-else />
          </n-message-provider>
        </n-dialog-provider>
      </n-notification-provider>
    </n-loading-bar-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { darkTheme, ruRU, dateRuRU } from 'naive-ui'
import { useUserStore } from '@/stores/user'
import { useIntegrationStore } from '@/stores/integration'
import { onMounted } from 'vue'
import Layout from '@/components/layout/Layout.vue'

const userStore = useUserStore()
const integrationStore = useIntegrationStore()
const theme = darkTheme

import '@/assets/main.css'

// Проверка сохраненной сессии
userStore.checkAuth()

// Автоматическая синхронизация при запуске
onMounted(() => {
  if (userStore.isAuthenticated) {
    integrationStore.syncWith1C()
  }
  
  // Интервал синхронизации (раз в час)
  setInterval(() => {
    if (userStore.isAuthenticated) {
      integrationStore.syncWith1C()
    }
  }, 3600000)
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  height: 100vh;
  overflow: hidden;
}
</style>
