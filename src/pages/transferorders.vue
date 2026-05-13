<template>
  <div class="transfer-orders-page p-6">
    <div class="flex justify-between items-center mb-6">
      <div class="flex items-center gap-4">
        <n-button v-if="selectedOrderId" circle @click="selectedOrderId = null" type="primary" secondary>
          <template #icon><n-icon><ArrowBackOutline /></n-icon></template>
        </n-button>
        <div>
          <n-h1 class="mb-0!">
            <span v-if="!selectedOrderId">Заказы на перемещение</span>
            <span v-else>{{ selectedOrder?.Number }}</span>
          </n-h1>
          <n-text depth="3">
            <span v-if="!selectedOrderId">Список заказов на перемещение товаров между складами</span>
            <span v-else>Детали заказа и товары для сканирования</span>
          </n-text>
        </div>
      </div>
    </div>

    <!-- Список заказов -->
    <div v-if="!selectedOrderId">
      <n-spin :show="loading">
        <n-empty v-if="orders.length === 0" description="Нет заказов на перемещение" />
        
        <n-data-table
          v-else
          :columns="columns"
          :data="orders"
          :pagination="pagination"
          :bordered="false"
          :single-line="false"
          size="small"
          striped
        />
      </n-spin>
    </div>

    <!-- Детали заказа -->
    <div v-else>
      <n-spin :show="loadingDetails">
        <div v-if="selectedOrder" class="space-y-6">
          <!-- Информация о заказе -->
          <n-card size="small" title="Информация о заказе">
            <n-grid :cols="2" :x-gap="12" :y-gap="12">
              <n-gi>
                <div class="flex justify-between">
                  <n-text depth="3">Статус:</n-text>
                  <n-tag :type="selectedOrder.Posted ? 'success' : 'warning'">
                    {{ selectedOrder.Posted ? 'Проведен' : 'Черновик' }}
                  </n-tag>
                </div>
              </n-gi>
              <n-gi>
                <div class="flex justify-between">
                  <n-text depth="3">Дата:</n-text>
                  <n-text strong>{{ formatDate(selectedOrder.Date) }}</n-text>
                </div>
              </n-gi>
              <n-gi>
                <div class="flex justify-between">
                  <n-text depth="3">От склада:</n-text>
                  <n-text strong>{{ selectedOrder.sourceWarehouseName }}</n-text>
                </div>
              </n-gi>
              <n-gi>
                <div class="flex justify-between">
                  <n-text depth="3">На склад:</n-text>
                  <n-text strong>{{ selectedOrder.destinationWarehouseName }}</n-text>
                </div>
              </n-gi>
            </n-grid>
          </n-card>

          <!-- Товары для сканирования -->
          <n-card size="small" title="Товары для сканирования">
            <n-empty v-if="!selectedOrder.items || selectedOrder.items.length === 0" description="Нет товаров в заказе" />
            
            <n-data-table
              v-else
              :columns="itemsColumns"
              :data="selectedOrder.items"
              :bordered="false"
              :single-line="false"
              size="small"
              striped
            />
          </n-card>

          <!-- Кнопка сканирования -->
          <div class="flex gap-2">
            <n-button type="primary" size="large">
              <template #icon><n-icon><CameraOutline /></n-icon></template>
              Начать сканирование
            </n-button>
          </div>
        </div>
      </n-spin>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, h } from 'vue'
import { useStockBalances } from '@/composables/useStockBalances'
import {
  NDataTable,
  NEmpty,
  NSpin,
  NCard,
  NGrid,
  NGi,
  NButton,
  NIcon,
  NText,
  NTag,
  NH1
} from 'naive-ui'
import { ArrowBackOutline, CameraOutline } from '@vicons/ionicons5'
import type { DataTableColumns } from 'naive-ui'

interface TransferOrder {
  Ref_Key: string
  Number: string
  Date: string
  Posted: boolean
  sourceWarehouseKey: string
  sourceWarehouseName?: string
  destinationWarehouseKey: string
  destinationWarehouseName?: string
  items?: Array<{
    LineNumber: number
    Номенклатура_Key: string
    nomenclatureName: string
    Количество: number
    scannedQty?: number
    barcode?: string
    location?: string
    storageBin?: string
  }>
}

const { fetchTransferOrders, fetchTransferOrderDetails } = useStockBalances()
const loading = ref(false)
const loadingDetails = ref(false)
const orders = ref<TransferOrder[]>([])
const selectedOrderId = ref<string | null>(null)
const selectedOrder = ref<TransferOrder | null>(null)

const pagination = ref({ pageSize: 10 })

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ru-RU')
  } catch {
    return dateStr
  }
}

const columns: DataTableColumns<TransferOrder> = [
  {
    title: '№ Заказа',
    key: 'Number',
    width: 150,
    render: (row) => row.Number
  },
  {
    title: 'Дата',
    key: 'Date',
    width: 120,
    render: (row) => formatDate(row.Date)
  },
  {
    title: 'От склада',
    key: 'sourceWarehouseName',
    width: 150,
    render: (row) => row.sourceWarehouseName || '-'
  },
  {
    title: 'На склад',
    key: 'destinationWarehouseName',
    width: 150,
    render: (row) => row.destinationWarehouseName || '-'
  },
  {
    title: 'Статус',
    key: 'Posted',
    width: 120,
    render: (row) =>
      h(NTag, { type: row.Posted ? 'success' : 'warning' }, {
        default: () => row.Posted ? 'Проведен' : 'Черновик'
      })
  },
  {
    title: 'Действие',
    key: 'actions',
    width: 100,
    align: 'center',
    render: (row) =>
      h(NButton, { text: true, type: 'primary', onClick: () => openOrder(row.Ref_Key) }, {
        default: () => 'Открыть'
      })
  }
]

const itemsColumns: DataTableColumns<any> = [
  {
    title: 'Товар',
    key: 'nomenclatureName',
    ellipsis: true
  },
  {
    title: 'Штрих код',
    key: 'barcode',
    width: 120,
    render: (row) => row.barcode || '-'
  },
  {
    title: 'Место хранения',
    key: 'storageBin',
    width: 150,
    render: (row) => row.storageBin || '-'
  },
  {
    title: 'Количество',
    key: 'Количество',
    width: 100,
    align: 'center'
  },
  {
    title: 'Отсканировано',
    key: 'scannedQty',
    width: 120,
    align: 'center'
  }
]

const openOrder = async (orderId: string) => {
  selectedOrderId.value = orderId
  loadingDetails.value = true
  try {
    const details = await fetchTransferOrderDetails(orderId)
    selectedOrder.value = details
  } catch (error) {
    console.error('Ошибка при загрузке деталей заказа:', error)
  } finally {
    loadingDetails.value = false
  }
}

onMounted(async () => {
  loading.value = true
  try {
    const data = await fetchTransferOrders()
    orders.value = data
  } catch (error) {
    console.error('Ошибка при загрузке заказов:', error)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.transfer-orders-page {
  min-height: 100vh;
}

.space-y-6 > * + * {
  margin-top: 1.5rem;
}
</style>
