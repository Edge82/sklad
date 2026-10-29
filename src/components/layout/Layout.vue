<template>
  <n-layout has-sider class="h-screen overflow-hidden">
    <Sidebar />
    <!-- flex-колонка ставится на scroll-контейнер (content-class): сам корень
         n-layout оборачивает слоты в div.n-layout-scroll-container, и классы
         на корне не превращают [Header, контент] в flex-колонку. Без этого
         контентная область имеет высоту контента, а не экрана — на 4K страница
         занимает «пол экрана» -->
    <n-layout class="h-full overflow-hidden" content-class="flex flex-col">
      <Header />
      <n-layout-content
        class="page-scroll flex-1 bg-[#101014]"
        :native-scrollbar="false"
        content-class="p-0"
      >
        <router-view v-slot="{ Component }">
          <KeepAlive :max="15">
            <component :is="Component" />
          </KeepAlive>
        </router-view>
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<script setup lang="ts">
import Sidebar from '../layout/Sidebar.vue'
import Header from '../layout/Header.vue'
</script>

<style scoped>
/* n-scrollbar — прямой дочерний div n-layout-content; растягиваем его на
   всю высоту контентной области, чтобы скролл-область равнялась экрану */
.page-scroll > :deep(.n-scrollbar) {
  height: 100%;
}
</style>
