<template>
  <n-layout has-sider class="h-screen overflow-hidden">
    <Sidebar />
    <n-layout class="flex flex-col h-full overflow-hidden">
      <Header />
      <n-layout-content
        class="flex-1 bg-[#101014]"
        :native-scrollbar="false"
        content-class="p-0"
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
