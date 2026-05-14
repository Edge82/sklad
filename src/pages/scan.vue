<template>
  <div class="scan-page p-6">
    <div class="flex justify-between items-center mb-6">
      <n-h1 class="m-0">Отгрузка</n-h1>
      <n-space v-if="scannedCodes.length > 0">
        <n-button type="error" ghost @click="clearSession">
          Очистить
        </n-button>
        <n-button type="primary" size="large" @click="completeShipment">
          Завершить отгрузку ({{ scannedCodes.length }})
        </n-button>
      </n-space>
    </div>

    <!-- Поле сканирования -->
    <n-card class="mb-6">
      <n-form-item label="Сканирование QR кодов" :show-feedback="false">
        <n-input
          v-model:value="lastScannedCode"
          placeholder="Сканируйте QR коды..."
          size="large"
          @keyup.enter="handleScan"
          ref="scanInputRef"
        />
      </n-form-item>
    </n-card>

    <!-- Статус-сообщение -->
    <div v-if="statusMessage" class="mb-6">
      <n-alert :type="statusMessage.type" closable @close="statusMessage = null">
        {{ statusMessage.text }}
      </n-alert>
    </div>

    <!-- Таблица состава отгрузки -->
    <n-card title="Состав отгрузки" class="mb-6">
      <template #header-extra>
        <n-text depth="3">Отсканировано: {{ scannedCodes.length }}</n-text>
      </template>

      <n-data-table
        :columns="columns"
        :data="tableData"
        :max-height="500"
      />

      <div v-if="scannedCodes.length === 0" class="py-12 text-center text-gray-400">
        <n-empty description="Сканируйте QR коды для начала отгрузки" />
      </div>
    </n-card>

    <!-- История отгрузки -->
    <n-collapse default-expanded-names="shipment-history">
      <n-collapse-item title="История отгрузки" name="shipment-history">
        <n-card size="small">
          <n-list v-if="recentShipments.length > 0">
            <n-list-item v-for="(shipment, index) in recentShipments" :key="index">
              <div class="flex justify-between items-center w-full">
                <div class="flex items-center gap-6">
                  <div class="flex flex-col gap-2">
                    <n-text strong>{{ shipment.date.toLocaleString('ru-RU') }}</n-text>
                    <n-text depth="3" size="small">{{ shipment.userName }}</n-text>
                  </div>
                  <div class="flex flex-col gap-2">
                    <n-text strong>Кол-во: {{ shipment.count }} шт</n-text>
                    <n-text depth="3" size="small">Заказы: {{ shipment.orders.join(', ') }}</n-text>
                  </div>
                </div>
              </div>
            </n-list-item>
          </n-list>
          <div v-else class="text-center text-gray-400 py-6">
            <n-empty description="Нет завершённых отгрузок" />
          </div>
        </n-card>
      </n-collapse-item>
    </n-collapse>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, nextTick, onMounted } from 'vue'
import { TrashOutline } from '@vicons/ionicons5'
import {
  NInput,
  NButton,
  NIcon,
  NCard,
  NDataTable,
  NSpace,
  NTag,
  NEmpty,
  NList,
  NListItem,
  NText,
  NH1,
  NFormItem,
  NCollapse,
  NCollapseItem,
  NAlert,
  useMessage,
  type InputInst,
  type DataTableColumns
} from 'naive-ui'
import { useUserStore } from '@/stores/user'
import { useQRCodesStore } from '@/stores/qrCodes'

interface ScannedQRCode {
  code: string // QR код
  qrId: string // ID в базе QR кодов
  orderNumber: string // Номер заказа покупателя
  productName: string // Название продукта
}

interface ShipmentHistory {
  id: string
  date: Date
  count: number // Количество отсканированных кодов
  orders: string[] // Номера заказов
  userName: string
}

const lastScannedCode = ref('')
const scanInputRef = ref<InputInst | null>(null)
const scannedCodes = ref<ScannedQRCode[]>([])
const scanHistory = ref<{ time: Date; code: string; resultMessage: string; resultType: 'success' | 'error' | 'warning' }[]>([])
const shipmentHistory = ref<ShipmentHistory[]>([])
const statusMessage = ref<{ type: 'success' | 'error' | 'warning' | 'info'; text: string } | null>(null)

const message = useMessage()
const qrStore = useQRCodesStore()
const userStore = useUserStore()

// Группируем отсканированные коды по заказам
const groupedByOrder = computed(() => {
  const groups = new Map<string, ScannedQRCode[]>()
  scannedCodes.value.forEach(item => {
    if (!groups.has(item.orderNumber)) {
      groups.set(item.orderNumber, [])
    }
    groups.get(item.orderNumber)!.push(item)
  })
  return groups
})

// Данные для таблицы
const tableData = computed(() => {
  return Array.from(groupedByOrder.value.entries()).map(([orderNum, codes]) => ({
    orderNumber: orderNum,
    qrCode: codes.map(c => c.code).join(', '),
    quantity: codes.length,
    items: codes
  }))
})

const columns = computed<DataTableColumns>(() => [
  {
    title: 'QR код',
    key: 'qrCode',
    ellipsis: true,
    tooltip: true
  },
  {
    title: 'Название детали',
    key: 'productName',
    minWidth: 250,
    ellipsis: true,
    tooltip: true,
    render: (row: any) => {
      const codes = row.items as ScannedQRCode[]
      const productName = codes[0]?.productName || 'Неизвестно'
      return productName
    }
  },
  {
    title: 'Заказ покупателя',
    key: 'orderNumber',
    width: 200
  },
  {
    title: 'Количество',
    key: 'quantity',
    width: 120,
    align: 'center'
  },
  {
    title: 'Действие',
    key: 'actions',
    width: 80,
    align: 'center',
    render: (row: any) => {
      return h(NButton, {
        quaternary: true,
        circle: true,
        size: 'small',
        type: 'error',
        onClick: () => removeOrder(row.orderNumber)
      }, {
        icon: () => h(NIcon, null, { default: () => h(TrashOutline) })
      })
    }
  }
])

const handleScan = () => {
  const code = lastScannedCode.value.trim()
  if (!code) return

  // Ищем QR код в базе
  const qrCode = qrStore.qrCodesMap.get(code)

  if (!qrCode) {
    scanHistory.value.unshift({
      time: new Date(),
      code: code,
      resultMessage: 'QR код не найден',
      resultType: 'error'
    })
    message.error(`QR код "${code}" не найден`)
    lastScannedCode.value = ''
    nextTick(() => {
      scanInputRef.value?.focus()
    })
    return
  }

  // Проверяем, не добавлен ли уже этот код
  const alreadyScanned = scannedCodes.value.some(item => item.code === code)
  if (alreadyScanned) {
    scanHistory.value.unshift({
      time: new Date(),
      code: code,
      resultMessage: 'QR код уже отсканирован',
      resultType: 'warning'
    })
    message.warning('Этот QR код уже отсканирован')
    lastScannedCode.value = ''
    nextTick(() => {
      scanInputRef.value?.focus()
    })
    return
  }

  scannedCodes.value.push({
    code: code,
    qrId: qrCode.id,
    orderNumber: qrCode.orderNumber || 'Без номера',
    productName: qrCode.productName
  })

  scanHistory.value.unshift({
    time: new Date(),
    code: code,
    resultMessage: `Добавлено: ${qrCode.productName}`,
    resultType: 'success'
  })

  message.success(`Добавлено: ${qrCode.productName}`)

  // Проверяем статус заказа
  checkOrderStatus(qrCode.orderNumber)

  lastScannedCode.value = ''
  nextTick(() => {
    scanInputRef.value?.focus()
  })
}

const checkOrderStatus = (orderNumber: string | undefined) => {
  if (!orderNumber) return

  const scannedForOrder = scannedCodes.value.filter(item => item.orderNumber === orderNumber)
  // Только коды со статусом 'generated' нужно отгружать
  const pendingOrderQRs = qrStore.qrCodes.filter(q => 
    q.orderNumber === orderNumber && q.status === 'generated'
  )

  if (pendingOrderQRs.length === 0) return

  if (scannedForOrder.length === pendingOrderQRs.length) {
    statusMessage.value = {
      type: 'success',
      text: `✓ Заказ ${orderNumber} готов к отгрузке полностью (отсканировано ${scannedForOrder.length}/${pendingOrderQRs.length})`
    }
  } else if (scannedForOrder.length < pendingOrderQRs.length) {
    statusMessage.value = {
      type: 'warning',
      text: `⚠ Заказ ${orderNumber} отгружен не полностью (отсканировано ${scannedForOrder.length}/${pendingOrderQRs.length}). Проверьте заказ.`
    }
  }
}

const removeOrder = (orderNumber: string) => {
  scannedCodes.value = scannedCodes.value.filter(item => item.orderNumber !== orderNumber)
  statusMessage.value = null
}

const clearSession = () => {
  scannedCodes.value = []
  scanHistory.value = []
  statusMessage.value = null
  lastScannedCode.value = ''
}

const completeShipment = async () => {
  // Получаем уникальные номера заказов
  const uniqueOrders = Array.from(new Set(scannedCodes.value.map(item => item.orderNumber)))

  // Обновляем статусы QR кодов на "отгружены"
  scannedCodes.value.forEach(item => {
    qrStore.updateQRCodeStatus(item.qrId, 'shipped', userStore.user?.name || 'System')
  })

  const count = scannedCodes.value.length
  message.success(`Отгрузка завершена! Отправлено ${count} QR кодов`)
  clearSession()

  // Перезагружаем историю с бэка
  await loadShipmentHistory()
}

// Показываем только последние 5 отгрузок
const recentShipments = computed(() => shipmentHistory.value.slice(0, 5))

onMounted(() => {
  nextTick(() => {
    scanInputRef.value?.focus()
  })
  
  // Load shipment history from backend
  loadShipmentHistory()
})

const loadShipmentHistory = async () => {
  try {
    const response = await fetch('/sklad/api/shipments/history')
    if (response.ok) {
      const data = await response.json()
      shipmentHistory.value = data.shipments || []
    }
  } catch (err) {
    console.error('Error loading shipment history:', err)
  }
}
</script>

<style scoped>
.scan-page {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
