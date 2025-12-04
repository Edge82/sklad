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
import Layout from '@/components/layout/Layout.vue'

const userStore = useUserStore()
const theme = darkTheme

// Инициализация демо-пользователя
userStore.initDemoUser()
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  min-height: 100vh;
}
</style>
