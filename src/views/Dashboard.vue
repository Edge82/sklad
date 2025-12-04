<template>
  <div class="p-6">
    <n-h1>Дашборд системы учета склада</n-h1>
    <n-text depth="3">Панель управления мебельным производством</n-text>

    <n-grid :cols="4" :x-gap="16" :y-gap="16" class="mt-6">
      <n-gi>
        <n-card>
          <div class="flex justify-between items-center">
            <div>
              <n-text depth="3">Всего материалов</n-text>
              <n-h3 class="m-0">156</n-h3>
            </div>
            <n-icon size="32" color="#18a058">
              <CubeOutline />
            </n-icon>
          </div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <div class="flex justify-between items-center">
            <div>
              <n-text depth="3">Низкий запас</n-text>
              <n-h3 class="m-0">12</n-h3>
            </div>
            <n-icon size="32" color="#d03050">
              <WarningOutline />
            </n-icon>
          </div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <div class="flex justify-between items-center">
            <div>
              <n-text depth="3">Категории</n-text>
              <n-h3 class="m-0">8</n-h3>
            </div>
            <n-icon size="32" color="#2080f0">
              <AppsOutline />
            </n-icon>
          </div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card>
          <div class="flex justify-between items-center">
            <div>
              <n-text depth="3">Поставщики</n-text>
              <n-h3 class="m-0">15</n-h3>
            </div>
            <n-icon size="32" color="#f0a020">
              <BusinessOutline />
            </n-icon>
          </div>
        </n-card>
      </n-gi>
    </n-grid>
  </div>
</template>

<script setup lang="ts">
import { CubeOutline, WarningOutline, AppsOutline, BusinessOutline } from '@vicons/ionicons5'
</script>
