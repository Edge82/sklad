<template>
  <div class="integration-page">
    <n-h1>Интеграция с 1С</n-h1>
    
    <n-grid :cols="2" :x-gap="16">
      <n-gi>
        <n-card title="Статус подключения">
          <n-space vertical>
            <div class="flex items-center">
              <div :class="['status-dot', integrationStore.status === 'connected' ? 'online' : 'offline']"></div>
              <n-text strong>{{ integrationStore.status === 'connected' ? 'Подключено к 1С' : 'Нет соединения' }}</n-text>
            </div>
            <n-text depth="3">Последняя синхронизация: {{ integrationStore.lastSync.toLocaleString() }}</n-text>
            <n-button type="primary" @click="integrationStore.syncNow" :loading="syncing">
              Синхронизировать сейчас
            </n-button>
          </n-space>
        </n-card>

        <n-card title="Настройки обмена" class="mt-4">
          <n-space vertical>
            <n-checkbox v-model:checked="integrationStore.settings.importOrders">Импортировать заказы</n-checkbox>
            <n-checkbox v-model:checked="integrationStore.settings.importNomenclature">Импортировать номенклатуру</n-checkbox>
            <n-checkbox v-model:checked="integrationStore.settings.importEmployees">Импортировать сотрудников</n-checkbox>
            <n-checkbox v-model:checked="integrationStore.settings.exportShipments">Экспортировать отгрузки</n-checkbox>
            <n-checkbox v-model:checked="integrationStore.settings.exportProduction">Экспортировать выпуск продукции</n-checkbox>
          </n-space>
        </n-card>
      </n-gi>

      <n-gi>
        <n-card title="Журнал обменов">
          <n-data-table :columns="logColumns" :data="integrationStore.syncLogs" />
        </n-card>
      </n-gi>
    </n-grid>
  </div>
</template>

<script setup lang="ts">
import { ref, h } from 'vue'
import { NTag, type DataTableColumns } from 'naive-ui'
import { useIntegrationStore } from '@/stores/integration'

const integrationStore = useIntegrationStore()
const syncing = ref(false)

interface SyncLog {
  id: number
  date: Date
  type: string
  status: string
  details: string
}

const logColumns: DataTableColumns<SyncLog> = [
  { title: 'Дата', key: 'date', render(row) { return row.date.toLocaleString() } },
  { title: 'Тип', key: 'type' },
  { 
    title: 'Статус', 
    key: 'status',
    render(row) {
      return h(NTag, { type: row.status === 'success' ? 'success' : 'error' }, { default: () => row.status })
    }
  },
  { title: 'Детали', key: 'details' }
]
</script>

<style scoped>
.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  margin-right: 8px;
}
.online { background: #18a058; }
.offline { background: #d03050; }
.mt-4 { margin-top: 16px; }
</style>
