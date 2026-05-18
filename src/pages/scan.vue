<template>
  <div class="scan-page p-6">
    <div class="flex justify-between items-center mb-6">
      <n-h1 class="m-0">Отгрузка</n-h1>
      <n-space v-if="scannedCodes.length > 0">
        <n-button type="error" ghost @click="clearSession">
          Очистить
        </n-button>
        <n-button :type="actionButtonType" size="large" @click="handlePrimaryAction">
          {{ actionButtonLabel }} ({{ actionButtonCount }})
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
      <n-alert v-if="workflowHint" type="info" class="mt-4">
        {{ workflowHint }}
      </n-alert>
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
    <n-collapse default-expanded-names="shipment-history" style="margin-top: 24px;">
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
import { ref, computed, h, nextTick, onMounted, watch } from 'vue'
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
import { useInventoryStore } from '@/stores/inventory'

interface ScannedQRCode {
  code: string // QR код
  qrId: string // ID в базе QR кодов
  orderNumber: string // Номер заказа покупателя
  productName: string // Название продукта
  scanCount: number // Количество сканирований (1 = принят на склад, 2 = готов к отгрузке)
  warehouseState: 'pending' | 'received' | 'shipped'
  receivedAt?: Date // Время приёмки на склад (первое сканирование)
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
let scanTimeout: ReturnType<typeof setTimeout> | null = null
const scannedCodes = ref<ScannedQRCode[]>([])
const scanHistory = ref<{ time: Date; code: string; resultMessage: string; resultType: 'success' | 'error' | 'warning' }[]>([])
const shipmentHistory = ref<ShipmentHistory[]>([])
const statusMessage = ref<{ type: 'success' | 'error' | 'warning' | 'info'; text: string } | null>(null)

const message = useMessage()
const qrStore = useQRCodesStore()
const userStore = useUserStore()
const inventoryStore = useInventoryStore()

const pendingTransferItems = computed(() => scannedCodes.value.filter(item => item.warehouseState === 'pending'))
const readyToShipItems = computed(() => scannedCodes.value.filter(item => item.scanCount === 2))
const hasReadyToShipItems = computed(() => readyToShipItems.value.length > 0)
const actionButtonLabel = computed(() => hasReadyToShipItems.value ? 'Отгрузить' : 'Переместить на склад')
const actionButtonType = computed(() => hasReadyToShipItems.value ? 'primary' : 'success')
const actionButtonCount = computed(() => hasReadyToShipItems.value ? readyToShipItems.value.length : pendingTransferItems.value.length)
const workflowHint = computed(() => {
  if (pendingTransferItems.value.length > 0) {
    return 'Сканируйте товар для приёмки на склад готовой продукции. После этого нажмите «Переместить на склад».'
  }

  if (readyToShipItems.value.length > 0) {
    return 'Товар уже принят на склад. Сканируйте его повторно, чтобы добавить в текущую отгрузку.'
  }

  return 'Отсканируйте товар для приёмки на склад готовой продукции, повторное сканирование добавит его в для отгрузки.'
})

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
    title: 'Статус',
    key: 'status',
    width: 200,
    align: 'center',
    render: (row: any) => {
      const codes = row.items as ScannedQRCode[]
      const statuses = codes.map(c => ({
        code: c.code,
        scanCount: c.scanCount
      }))

      return h('div', { class: 'flex flex-col gap-2' },
        statuses.map(s =>
          h(NTag, {
            type: s.scanCount === 1
              ? (s.code ? 'warning' : 'default')
              : 'success',
            quaternary: false,
            size: 'small'
          }, {
            default: () => {
              const currentItem = codes.find(c => c.code === s.code)
              if (currentItem?.warehouseState === 'pending') return '↻ Ожидает перемещения'
              if (s.scanCount === 1) return '✓ На складе'
              return '✓✓ К отгрузке'
            }
          })
        )
      )
    }
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

const handleScan = async () => {
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

  // Проверяем, был ли этот код уже отсканирован
  const existingItem = scannedCodes.value.find(item => item.code === code)
  const isAlreadyInWarehouse = qrCode.status === 'scanned'
  const isAlreadyShipped = qrCode.status === 'shipped'

  if (existingItem) {
    // Повторный скан в рамках текущей сессии добавляет товар в отгрузку
    if (existingItem.scanCount === 1 && existingItem.warehouseState === 'received') {
      existingItem.scanCount = 2
      existingItem.warehouseState = 'received'
      scanHistory.value.unshift({
        time: new Date(),
        code: code,
        resultMessage: `Добавлено к отгрузке: ${qrCode.productName}`,
        resultType: 'success'
      })
      message.success(`✓ Товар добавлен к отгрузке: ${qrCode.productName}`)
    } else {
      // Уже находится в текущей отгрузке или не требует повторного сканирования
      scanHistory.value.unshift({
        time: new Date(),
        code: code,
        resultMessage: 'Товар уже добавлен к текущей отгрузке',
        resultType: 'warning'
      })
      message.warning('Этот товар уже добавлен к текущей отгрузке')
    }
  } else {
    if (isAlreadyShipped) {
      scanHistory.value.unshift({
        time: new Date(),
        code: code,
        resultMessage: 'Товар уже отгружен',
        resultType: 'warning'
      })
      message.warning(`Товар уже отгружен: ${qrCode.productName}`)
    } else if (isAlreadyInWarehouse) {
      scannedCodes.value.push({
        code: code,
        qrId: qrCode.id,
        orderNumber: qrCode.orderNumber || 'Без номера',
        productName: qrCode.productName,
        scanCount: 2,
        warehouseState: 'received',
        receivedAt: new Date()
      })

      scanHistory.value.unshift({
        time: new Date(),
        code: code,
        resultMessage: `Добавлено к отгрузке: ${qrCode.productName}`,
        resultType: 'success'
      })

      message.success(`✓ Товар добавлен к отгрузке: ${qrCode.productName}`)
    } else {
      // ПЕРВОЕ СКАНИРОВАНИЕ - товар ждет перемещения на склад готовой продукции
      scannedCodes.value.push({
        code: code,
        qrId: qrCode.id,
        orderNumber: qrCode.orderNumber || 'Без номера',
        productName: qrCode.productName,
        scanCount: 1,
        warehouseState: 'pending',
        receivedAt: new Date()
      })

      scanHistory.value.unshift({
        time: new Date(),
        code: code,
        resultMessage: `Добавлено к перемещению: ${qrCode.productName}`,
        resultType: 'warning'
      })

      message.warning(`✓ Товар добавлен в список перемещения: ${qrCode.productName}`)
      checkOrderStatus(qrCode.orderNumber)
    }
  }

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

const transferToWarehouse = async () => {
  const itemsToTransfer = scannedCodes.value.filter(item => item.warehouseState === 'pending')

  if (itemsToTransfer.length === 0) {
    message.warning('Нет товаров для перемещения на склад')
    return
  }

  try {
    for (const item of itemsToTransfer) {
      const response = await fetch('/sklad/api/inventory/receive-finished-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrId: item.qrId,
          productName: item.productName,
          quantity: 1,
          orderNumber: item.orderNumber,
          employeeId: userStore.user?.id,
          employeeName: userStore.user?.name
        })
      })

      if (!response.ok) {
        throw new Error(`Не удалось переместить товар ${item.productName}`)
      }

      item.warehouseState = 'received'
      await qrStore.updateQRCodeStatus(item.qrId, 'scanned', userStore.user?.name || 'System', userStore.user?.id)
      scanHistory.value.unshift({
        time: new Date(),
        code: item.code,
        resultMessage: `Перемещено на склад готовой продукции: ${item.productName}`,
        resultType: 'success'
      })
    }

    await inventoryStore.loadStocksFromApi()

    message.success(`Перемещено на склад: ${itemsToTransfer.length} шт.`)
  } catch (err) {
    scanHistory.value.unshift({
      time: new Date(),
      code: '',
      resultMessage: `Ошибка перемещения: ${err instanceof Error ? err.message : 'неизвестная ошибка'}`,
      resultType: 'error'
    })
    message.error(`Ошибка перемещения: ${err instanceof Error ? err.message : 'неизвестная ошибка'}`)
  }
}

const completeShipment = async () => {
  // Фильтруем только товары, которые добавлены в текущую отгрузку
  const itemsToShip = scannedCodes.value.filter(item => item.scanCount === 2)

  if (itemsToShip.length === 0) {
    message.warning('Нет товаров, добавленных к отгрузке. Отсканируйте принятые товары повторно.')
    return
  }

  // Обновляем статусы QR кодов на "отгружены"
  for (const item of itemsToShip) {
    await qrStore.updateQRCodeStatus(item.qrId, 'shipped', userStore.user?.name || 'System', userStore.user?.id)
  }

  const count = itemsToShip.length
  message.success(`Отгрузка завершена! Отправлено ${count} QR кодов`)
  clearSession()

  // Перезагружаем историю с бэка
  await loadShipmentHistory()
}

const handlePrimaryAction = async () => {
  if (hasReadyToShipItems.value) {
    await completeShipment()
    return
  }

  await transferToWarehouse()
}

// Показываем только последние 5 отгрузок
const recentShipments = computed(() => shipmentHistory.value.slice(0, 5))

watch(lastScannedCode, (val) => {
  if (scanTimeout) clearTimeout(scanTimeout)
  if (!val.trim()) return
  scanTimeout = setTimeout(() => {
    handleScan()
  }, 300)
})

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
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 24px;
}

@media (max-width: 768px) {
  .scan-page {
    padding: 0 12px;
  }
}
</style>
