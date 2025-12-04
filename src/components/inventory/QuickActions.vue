<template>
  <n-card title="Быстрые действия" class="mb-6">
    <n-grid :cols="4" :x-gap="12" :y-gap="12">
      <n-gi>
        <n-button block @click="emit('scan')" type="primary">
          <template #icon>
            <n-icon>
              <BarcodeOutline />
            </n-icon>
          </template>
          Сканировать
        </n-button>
      </n-gi>
      <n-gi>
        <n-button block @click="emit('inventory')" type="info">
          <template #icon>
            <n-icon>
              <CheckmarkDoneOutline />
            </n-icon>
          </template>
          Инвентаризация
        </n-button>
      </n-gi>
      <n-gi>
        <n-button block @click="emit('print')" type="warning">
          <template #icon>
            <n-icon>
              <PrintOutline />
            </n-icon>
          </template>
          Печать этикеток
        </n-button>
      </n-gi>
      <n-gi>
        <n-button block @click="emit('report')" type="success">
          <template #icon>
            <n-icon>
              <AnalyticsOutline />
            </n-icon>
          </template>
          Быстрый отчет
        </n-button>
      </n-gi>
      <n-gi>
        <n-button block @click="emit('lowStock')" type="error">
          <template #icon>
            <n-icon>
              <WarningOutline />
            </n-icon>
          </template>
          Мало остатков ({{ lowStockCount }})
        </n-button>
      </n-gi>
      <n-gi>
        <n-button block @click="emit('outOfStock')" type="error" ghost>
          <template #icon>
            <n-icon>
              <CloseCircleOutline />
            </n-icon>
          </template>
          Отсутствует ({{ outOfStockCount }})
        </n-button>
      </n-gi>
      <n-gi>
        <n-button block @click="emit('transfer')" type="default">
          <template #icon>
            <n-icon>
              <SwapHorizontalOutline />
            </n-icon>
          </template>
          Перемещение
        </n-button>
      </n-gi>
      <n-gi>
        <n-button block @click="emit('adjustment')" type="default">
          <template #icon>
            <n-icon>
              <SyncOutline />
            </n-icon>
          </template>
          Корректировка
        </n-button>
      </n-gi>
    </n-grid>
  </n-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import {
  NCard,
  NGrid,
  NGi,
  NButton,
  NIcon
} from 'naive-ui'
import {
  BarcodeOutline,
  CheckmarkDoneOutline,
  PrintOutline,
  AnalyticsOutline,
  WarningOutline,
  CloseCircleOutline,
  SwapHorizontalOutline,
  SyncOutline
} from '@vicons/ionicons5'

const inventoryStore = useInventoryStore()

const props = defineProps<{
  showLowStock?: boolean
  showOutOfStock?: boolean
}>()

const emit = defineEmits<{
  scan: []
  inventory: []
  print: []
  report: []
  lowStock: []
  outOfStock: []
  transfer: []
  adjustment: []
}>()

const lowStockCount = computed(() => inventoryStore.lowStockItems)
const outOfStockCount = computed(() => inventoryStore.outOfStockItems)
</script>
