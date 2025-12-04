<template>
  <n-layout has-sider class="h-screen">
    <Sidebar />
    <n-layout>
      <Header />
      <n-layout-content content-style="padding: 24px; background: #1a1a1a;">
        <router-view />
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<script setup lang="ts">
import Sidebar from '../layout/Sidebar.vue'
import Header from '../layout/Header.vue'
</script>
