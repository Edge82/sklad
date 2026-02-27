<template>
  <n-layout has-sider position="absolute" style="height: 100vh; overflow: hidden">
    <Sidebar />
    <n-layout>
      <Header />
      <n-layout-content
        position="absolute"
        style="top: 64px; bottom: 0; left: 0; right: 0;"
        :native-scrollbar="false"
        content-style="padding: 12px; background: #1a1a1a;"
      >
        <router-view />
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<script setup lang="ts">
import Sidebar from '../layout/Sidebar.vue'
import Header from '../layout/Header.vue'
</script>
