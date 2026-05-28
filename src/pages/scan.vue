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

// Данные для таблицы — каждый QR-код отдельной строкой
const tableData = computed(() => {
  return scannedCodes.value.map((item, index) => ({
    key: index,
    ...item
  }))
})

const columns = computed<DataTableColumns<ScannedQRCode>>(() => [
  {
    title: 'QR код',
    key: 'code',
    ellipsis: true,
    tooltip: true
  },
  {
    title: 'Название детали',
    key: 'productName',
    minWidth: 250,
    ellipsis: true,
    tooltip: true
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
    align: 'center',
    render: (row: any) => '1 шт'
  },
  {
    title: 'Статус',
    key: 'status',
    width: 200,
    align: 'center',
    render: (row: ScannedQRCode) => {
      return h(NTag, {
        type: row.warehouseState === 'pending'
          ? 'warning'
          : row.scanCount === 1
            ? 'info'
            : 'success',
        quaternary: false,
        size: 'small'
      }, {
        default: () => {
          if (row.warehouseState === 'pending') return '↻ Ожидает перемещения'
          if (row.scanCount === 1) return '✓ На складе'
          return '✓✓ К отгрузке'
        }
      })
    }
  },
  {
    title: 'Действие',
    key: 'actions',
    width: 80,
    align: 'center',
    render: (row: ScannedQRCode) => {
      return h(NButton, {
        quaternary: true,
        circle: true,
        size: 'small',
        type: 'error',
        onClick: () => removeCode(row.code)
      }, {
        icon: () => h(NIcon, null, { default: () => h(TrashOutline) })
      })
    }
  }
])

// Конвертация символов русской раскладки клавиатуры в латинские
// (сканер работает как клавиатура и вводит русские буквы при русской раскладке)
const convertRussianKeyboardToLatin = (text: string): string => {
  const map: Record<string, string> = {
    'й': 'q', 'ц': 'w', 'у': 'e', 'к': 'r', 'е': 't', 'н': 'y', 'г': 'u', 'ш': 'i', 'щ': 'o', 'з': 'p',
    'х': '[', 'ъ': ']',
    'ф': 'a', 'ы': 's', 'в': 'd', 'а': 'f', 'п': 'g', 'р': 'h', 'о': 'j', 'л': 'k', 'д': 'l',
    'ж': ';', 'э': "'",
    'я': 'z', 'ч': 'x', 'с': 'c', 'м': 'v', 'и': 'b', 'т': 'n', 'ь': 'm',
    'б': ',', 'ю': '.',
    'Й': 'Q', 'Ц': 'W', 'У': 'E', 'К': 'R', 'Е': 'T', 'Н': 'Y', 'Г': 'U', 'Ш': 'I', 'Щ': 'O', 'З': 'P',
    'Х': '[', 'Ъ': ']',
    'Ф': 'A', 'Ы': 'S', 'В': 'D', 'А': 'F', 'П': 'G', 'Р': 'H', 'О': 'J', 'Л': 'K', 'Д': 'L',
    'Ж': ';', 'Э': "'",
    'Я': 'Z', 'Ч': 'X', 'С': 'C', 'М': 'V', 'И': 'B', 'Т': 'N', 'Ь': 'M',
    'Б': ',', 'Ю': '.',
    '.': '/',  // клавиша "/" на русской раскладке даёт "."
  }
  return text.split('').map(char => map[char] || char).join('')
}

const handleScan = async () => {
  // Очищаем код от спецсимволов сканера, конвертируем раскладку и убираем не-ASCII
  const code = convertRussianKeyboardToLatin(
    lastScannedCode.value
      .trim()
      .replace(/[\|\r\n\t]+/g, '')
  ).replace(/[^\x20-\x7E]/g, '')

  if (!code) return

  // Очищаем предыдущее сообщение об ошибке при новом сканировании
  if (statusMessage.value?.type === 'error') {
    statusMessage.value = null
  }

  // Ищем QR код в локальном кэше
  let qrCode = qrStore.qrCodesMap.get(code)

  // Если не нашли — пробуем загрузить с бэкенда
  if (!qrCode) {
    try {
      const res = await fetch(`/sklad/api/qr-codes?code=${encodeURIComponent(code)}`)
      if (res.ok) {
        const data = await res.json()
        const raw = data.qrCodes?.[0]
        if (raw) {
          qrCode = {
            id: raw.id,
            code: raw.code,
            orderId: raw.order_id,
            orderNumber: raw.order_number,
            productId: raw.product_id,
            productName: raw.product_name,
            label: {
              order: raw.label_order || raw.order_number,
              info: raw.label_info || ''
            },
            status: raw.status,
            isActive: raw.status !== 'deleted',
            version: 1,
            generatedAt: new Date(raw.generated_at),
            generatedBy: raw.generated_by,
            isPackage: raw.is_package || false,
            scannedAt: raw.scanned_at ? new Date(raw.scanned_at) : undefined,
            scannedBy: raw.scanned_by
          }
          if (!qrStore.qrCodes.find(q => q.code === raw.code)) {
            qrStore.qrCodes.push(qrCode)
          }
        }
      }
    } catch {
      // ignore network errors
    }
  }

  if (!qrCode) {
    scanHistory.value.unshift({
      time: new Date(),
      code: code,
      resultMessage: 'QR код не найден',
      resultType: 'error'
    })
    statusMessage.value = { type: 'error', text: `QR код "${code}" не найден` }
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
      checkOrderStatus(qrCode.orderNumber)
    } else if (isAlreadyInWarehouse) {
      // Проверка: если у изделия уже есть упаковка на складе — отгружаем только упаковку
      if (!qrCode.isPackage) {
        const packageOnWarehouse = qrStore.qrCodes.find(q =>
          q.orderId === qrCode.orderId &&
          q.productId === qrCode.productId &&
          q.isPackage &&
          q.status === 'scanned'
        )
        if (packageOnWarehouse) {
          statusMessage.value = {
            type: 'error',
            text: '❌ Деталь упакована, для отгрузки отсканируйте упаковку.'
          }
          lastScannedCode.value = ''
          nextTick(() => {
            scanInputRef.value?.focus()
          })
          return
        }
      }

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
      checkOrderStatus(qrCode.orderNumber)
    } else {
      // Проверка: если упаковочный код — все ли детали отсканированы?
      if (qrCode.isPackage) {
        const siblingCodes = qrStore.qrCodes.filter(q =>
          q.orderId === qrCode.orderId &&
          q.productId === qrCode.productId &&
          !q.isPackage &&
          q.status !== 'shipped'
        )
        const scannedQrIds = new Set(scannedCodes.value.map(s => s.qrId))
        const unscannedCount = siblingCodes.filter(q =>
          q.status === 'generated' || q.status === 'printed'
        ).length
        const inTableCount = siblingCodes.filter(q =>
          scannedQrIds.has(q.id)
        ).length
        const totalUnaccounted = Math.max(0, unscannedCount - inTableCount)

        if (totalUnaccounted > 0) {
          scanHistory.value.unshift({
            time: new Date(),
            code: code,
            resultMessage: `Упаковка заблокирована: не все детали отсканированы (${siblingCodes.length - unscannedCount + inTableCount}/${siblingCodes.length})`,
            resultType: 'error'
          })
          statusMessage.value = {
            type: 'error',
            text: `❌ Упаковка «${qrCode.productName}» не может быть перемещена. Отсканируйте все детали (${totalUnaccounted} шт. осталось).`
          }
          lastScannedCode.value = ''
          nextTick(() => {
            scanInputRef.value?.focus()
          })
          return
        }
      }

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
  if (!orderNumber || orderNumber === 'Без номера') return

  // Все QR-коды для этого заказа
  const allOrderQRs = qrStore.qrCodes.filter(q => q.orderNumber === orderNumber)

  // Проверяем, есть ли упаковочные коды у этого заказа
  const packageCodes = allOrderQRs.filter(q => q.isPackage)
  const hasPackages = packageCodes.length > 0

  // Если есть упаковки — считаем только по упаковкам, иначе по деталям
  const codesToCount = hasPackages ? packageCodes : allOrderQRs.filter(q => !q.isPackage)

  const shippedCount = codesToCount.filter(q => q.status === 'shipped').length
  const totalCount = codesToCount.length

  if (totalCount === 0) return

  const itemType = hasPackages ? 'упаковок' : 'позиций'

  if (shippedCount === totalCount) {
    statusMessage.value = {
      type: 'success',
      text: `✓ Заказ ${orderNumber} полностью отгружен (${shippedCount}/${totalCount} ${itemType})`
    }
  } else if (shippedCount > 0) {
    statusMessage.value = {
      type: 'warning',
      text: `⚠ Заказ ${orderNumber} отгружен частично (${shippedCount}/${totalCount} ${itemType}). Осталось: ${totalCount - shippedCount} шт.`
    }
  } else {
    statusMessage.value = {
      type: 'info',
      text: `📦 Заказ ${orderNumber}: не отгружено ни одной позиции из ${totalCount}`
    }
  }
}

const removeCode = (code: string) => {
  scannedCodes.value = scannedCodes.value.filter(item => item.code !== code)
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
      const payload = {
        qrId: item.qrId,
        productName: item.productName,
        quantity: 1,
        orderNumber: item.orderNumber,
        employeeId: userStore.user?.id,
        employeeName: userStore.user?.name
      }
      console.log('📦 [SCAN] Sending payload:', JSON.stringify(payload))

      const response = await fetch('/sklad/api/inventory/receive-finished-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown server error' }))
        console.error('📦 [SCAN] Server error:', response.status, errorData)
        throw new Error(errorData.error || `HTTP ${response.status}`)
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

  // Обновляем прогресс отгрузки по заказам
  const shippedOrderNumbers = new Set(itemsToShip.map(item => item.orderNumber))
  shippedOrderNumbers.forEach(orderNum => checkOrderStatus(orderNum))

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
