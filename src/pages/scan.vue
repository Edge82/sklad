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

    <!-- Реактивная валидация отгрузки -->
    <div v-if="shipmentValidation" class="mb-6">
      <n-alert :type="shipmentValidation.type">
        {{ shipmentValidation.text }}
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
  isPackage: boolean // Является ли QR код упаковкой
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
const actionButtonCount = computed(() => readyToShipItems.value.length || pendingTransferItems.value.length)

// Режим текущего документа: определяется по первому отсканированному коду
const documentMode = computed<'transfer' | 'shipment' | null>(() => {
  if (scannedCodes.value.length === 0) return null
  const first = scannedCodes.value[0]
  if (first.warehouseState === 'pending') return 'transfer'
  return 'shipment'
})

// Кэш статистики QR-кодов заказа (данные загружаются свежими при каждом новом сканировании)
interface PositionStats {
  productName: string
  productId: string
  totalCodes: number
  hasPackages: boolean
  packageCount: number
  detailCount: number
  shipped: number
  shippedPackages: number
  shippedDetails: number
  scanned: number
  notReceived: number
}

interface OrderStats {
  orderNumber: string
  totalCodes: number
  totalShipped: number
  totalScanned: number
  totalNotReceived: number
  hasPackages: boolean
  positions: PositionStats[]
}

const orderStatsCache = ref<Map<string, OrderStats>>(new Map())
const shipmentValidation = ref<{ type: 'error' | 'success' | 'info' | 'warning'; text: string } | null>(null)

async function loadOrderStats(orderNumber: string): Promise<OrderStats | null> {
  // Всегда запрашиваем свежие данные (статусы меняются после перемещения/отгрузки)
  try {
    const res = await fetch(`/sklad/api/qr-codes/stats?orderNumber=${encodeURIComponent(orderNumber)}`)
    if (res.ok) {
      const data = await res.json()
      const stats = data.stats as OrderStats
      if (stats) {
        const newCache = new Map(orderStatsCache.value)
        newCache.set(orderNumber, stats)
        orderStatsCache.value = newCache
        return stats
      }
    }
  } catch {
    // ignore
  }
  return null
}

function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} ${few}`
  return `${n} ${many}`
}

function recalcShipmentValidation() {
  const shipItems = readyToShipItems.value
  const pendingItems = pendingTransferItems.value

  if (shipItems.length === 0 && pendingItems.length === 0) {
    shipmentValidation.value = null
    return
  }

  const allOrderNums = [...new Set([
    ...shipItems.map(i => i.orderNumber),
    ...pendingItems.map(i => i.orderNumber)
  ].filter(n => n && n !== 'Без номера'))]

  if (allOrderNums.length === 0) {
    shipmentValidation.value = null
    return
  }

  // Только приёмка
  if (shipItems.length === 0) {
    const parts = allOrderNums.map(orderNum => {
      const n = pendingItems.filter(i => i.orderNumber === orderNum).length
      const s = orderStatsCache.value.get(orderNum)
      const total = s?.totalCodes
      return `заказ ${orderNum}: ${n}${total ? ' из ' + total : ''} шт.`
    })
    shipmentValidation.value = { type: 'info', text: `К приёмке: ${parts.join(', ')}` }
    return
  }

  // Отгрузка
  const orderMessages: string[] = []
  let anyWarning = false

  allOrderNums.forEach(orderNum => {
    const stats = orderStatsCache.value.get(orderNum)
    const orderItems = shipItems.filter(i => i.orderNumber === orderNum)

    if (stats && stats.totalCodes > 0) {
      const positionParts: string[] = []
      let orderComplete = true

      // Группируем по позициям с учётом типа (деталь/упаковка)
      const sessionByProduct = new Map<string, { count: number; allPackages: boolean; allDetails: boolean }>()
      orderItems.forEach(item => {
        const info = sessionByProduct.get(item.productName) || { count: 0, allPackages: true, allDetails: true }
        info.count++
        if (!item.isPackage) info.allPackages = false
        if (item.isPackage) info.allDetails = false
        sessionByProduct.set(item.productName, info)
      })

      stats.positions.forEach(pos => {
        const isPkgPos = pos.hasPackages
        const effTotal = isPkgPos ? pos.packageCount : pos.totalCodes
        const effShipped = isPkgPos ? pos.shippedPackages : pos.shipped
        const remaining = effTotal - effShipped

        if (remaining <= 0) return

        const info = sessionByProduct.get(pos.productName)
        const inSession = info?.count || 0

        if (inSession === 0) {
          orderComplete = false
          return
        }

        const posCovered = effShipped + inSession
        if (posCovered >= effTotal) {
          positionParts.push(`${pos.productName}: ${inSession}/${effTotal} будет отгружена полностью`)
        } else {
          const unit = isPkgPos
            ? { one: 'упаковка', few: 'упаковки', many: 'упаковок' }
            : { one: 'деталь', few: 'детали', many: 'деталей' }
          positionParts.push(`${pos.productName}: ${pluralRu(inSession, unit.one, unit.few, unit.many)} из ${effTotal}`)
          orderComplete = false
          anyWarning = true
        }
      })

      // Товары в сессии, не найденные в статистике (несоответствие названий)
      const unmatched = new Map(sessionByProduct)
      stats.positions.forEach(p => unmatched.delete(p.productName))
      unmatched.forEach((info, name) => {
        let unitOne: string, unitFew: string, unitMany: string
        if (info.allPackages) {
          unitOne = 'упаковка'; unitFew = 'упаковки'; unitMany = 'упаковок'
        } else if (info.allDetails) {
          unitOne = 'деталь'; unitFew = 'детали'; unitMany = 'деталей'
        } else {
          unitOne = 'позиция'; unitFew = 'позиции'; unitMany = 'позиций'
        }
        positionParts.push(`${name}: ${pluralRu(info.count, unitOne, unitFew, unitMany)}`)
        orderComplete = false
      })

      const effOrderTotal = stats.positions.reduce((sum, p) =>
        sum + (p.hasPackages ? p.packageCount : p.totalCodes), 0)
      const effOrderShipped = stats.positions.reduce((sum, p) =>
        sum + (p.hasPackages ? p.shippedPackages : p.shipped), 0)
      const remaining = effOrderTotal - effOrderShipped // осталось отгрузить всего
      const totalCovered = effOrderShipped + orderItems.length

      // Строка с количеством для текущей сессии
      let orderAllPkg = true, orderAllDet = true
      orderItems.forEach(item => {
        if (!item.isPackage) orderAllPkg = false
        if (item.isPackage) orderAllDet = false
      })
      let countStr: string
      if (orderAllPkg) {
        countStr = pluralRu(orderItems.length, 'упаковка', 'упаковки', 'упаковок')
      } else if (orderAllDet) {
        countStr = pluralRu(orderItems.length, 'деталь', 'детали', 'деталей')
      } else {
        countStr = `${orderItems.length} позиций`
      }

      if (orderComplete && totalCovered >= effOrderTotal) {
        orderMessages.push(`заказ ${orderNum}: отгружается ${countStr}, заказ будет отгружен полностью${positionParts.length > 0 ? ': ' + positionParts.join(', ') : ''}`)
      } else {
        orderMessages.push(`заказ ${orderNum}: отгружается ${countStr} из ${remaining}, заказ будет отгружен не полностью${positionParts.length > 0 ? ': ' + positionParts.join(', ') : ''}`)
        anyWarning = true
      }
    } else {
      // Fallback — нет статистики с бэкенда
      const posMap = new Map<string, { count: number; allPackages: boolean; allDetails: boolean }>()
      orderItems.forEach(item => {
        const info = posMap.get(item.productName) || { count: 0, allPackages: true, allDetails: true }
        info.count++
        if (!item.isPackage) info.allPackages = false
        if (item.isPackage) info.allDetails = false
        posMap.set(item.productName, info)
      })
      const posMsgs = [...posMap.entries()].map(([name, info]) => {
        let unitOne: string, unitFew: string, unitMany: string
        if (info.allPackages) {
          unitOne = 'упаковка'; unitFew = 'упаковки'; unitMany = 'упаковок'
        } else if (info.allDetails) {
          unitOne = 'деталь'; unitFew = 'детали'; unitMany = 'деталей'
        } else {
          return `${name}: ${info.count} шт.`
        }
        return `${name}: ${pluralRu(info.count, unitOne, unitFew, unitMany)}`
      })
      orderMessages.push(`заказ ${orderNum}: отгружается ${orderItems.length} шт.${posMsgs.length > 0 ? ' | ' + posMsgs.join(', ') : ''}`)
      anyWarning = true
    }
  })

  if (orderMessages.length === 0) {
    shipmentValidation.value = null
    return
  }

  shipmentValidation.value = {
    type: anyWarning ? 'warning' : 'success',
    text: orderMessages.join('; ')
  }
}

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

  // Загружаем свежую статистику по QR-кодам заказа
  if (qrCode.orderNumber) {
    await loadOrderStats(qrCode.orderNumber)
  }

  // Проверка совместимости с режимом документа
  if (!existingItem && documentMode.value) {
    if (documentMode.value === 'transfer' && isAlreadyInWarehouse) {
      statusMessage.value = {
        type: 'error',
        text: '⚠ Эти детали готовятся к отгрузке. Для перемещения на склад создайте другой документ.'
      }
      lastScannedCode.value = ''
      nextTick(() => { scanInputRef.value?.focus() })
      return
    }
    if (documentMode.value === 'shipment' && !isAlreadyInWarehouse && !isAlreadyShipped) {
      statusMessage.value = {
        type: 'error',
        text: '⚠ Эти детали готовятся к перемещению на склад готовой продукции. Для отгрузки создайте другой документ.'
      }
      lastScannedCode.value = ''
      nextTick(() => { scanInputRef.value?.focus() })
      return
    }
  }

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
      message.success(`✓ Товар добавлен к отгрузке: ${qrCode.productName}`, { duration: 5000 })
    } else {
      // Уже находится в текущей отгрузке или не требует повторного сканирования
      scanHistory.value.unshift({
        time: new Date(),
        code: code,
        resultMessage: 'Товар уже добавлен к текущей отгрузке',
        resultType: 'warning'
      })
      message.warning('Этот товар уже добавлен к текущей отгрузке', { duration: 5000 })
    }
  } else {
    if (isAlreadyShipped) {
      scanHistory.value.unshift({
        time: new Date(),
        code: code,
        resultMessage: 'Товар уже отгружен',
        resultType: 'warning'
      })
      message.warning(`Товар уже отгружен: ${qrCode.productName}`, { duration: 5000 })
      checkOrderStatus(qrCode.orderNumber)
    } else if (isAlreadyInWarehouse) {
      // Если у позиции есть упаковочные коды — отгружаем только упаковки
      if (!qrCode.isPackage) {
        const hasPackageForPosition = qrStore.qrCodes.some(q =>
          q.orderId === qrCode.orderId &&
          q.productId === qrCode.productId &&
          q.isPackage
        )
        if (hasPackageForPosition) {
          statusMessage.value = {
            type: 'error',
            text: '❌ Деталь нужно упаковать и переместить упаковку на склад, после чего её можно отгрузить.'
          }
          lastScannedCode.value = ''
          nextTick(() => { scanInputRef.value?.focus() })
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
        receivedAt: new Date(),
        isPackage: qrCode.isPackage || false
      })

      scanHistory.value.unshift({
        time: new Date(),
        code: code,
        resultMessage: `Добавлено к отгрузке: ${qrCode.productName}`,
        resultType: 'success'
      })

      message.success(`✓ Товар добавлен к отгрузке: ${qrCode.productName}`, { duration: 5000 })
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
        receivedAt: new Date(),
        isPackage: qrCode.isPackage || false
      })

      scanHistory.value.unshift({
        time: new Date(),
        code: code,
        resultMessage: `Добавлено к перемещению: ${qrCode.productName}`,
        resultType: 'warning'
      })

      message.warning(`✓ Товар добавлен в список перемещения: ${qrCode.productName}`, { duration: 5000 })
      checkOrderStatus(qrCode.orderNumber)
    }
  }

  recalcShipmentValidation()
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

  if (shippedCount === totalCount) {
    const itemType = hasPackages ? 'упаковок' : 'позиций'
    statusMessage.value = {
      type: 'success',
      text: `✓ Заказ ${orderNumber} полностью отгружен (${shippedCount}/${totalCount} ${itemType})`
    }
  }
}

const removeCode = (code: string) => {
  scannedCodes.value = scannedCodes.value.filter(item => item.code !== code)
  statusMessage.value = null
  recalcShipmentValidation()
}

const clearSession = () => {
  scannedCodes.value = []
  scanHistory.value = []
  statusMessage.value = null
  shipmentValidation.value = null
  lastScannedCode.value = ''
}

const transferToWarehouse = async () => {
  const itemsToTransfer = scannedCodes.value.filter(item => item.warehouseState === 'pending')

  if (itemsToTransfer.length === 0) {
    message.warning('Нет товаров для перемещения на склад', { duration: 5000 })
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

    message.success(`Перемещено на склад: ${itemsToTransfer.length} шт.`, { duration: 5000 })
    clearSession()
  } catch (err) {
    scanHistory.value.unshift({
      time: new Date(),
      code: '',
      resultMessage: `Ошибка перемещения: ${err instanceof Error ? err.message : 'неизвестная ошибка'}`,
      resultType: 'error'
    })
    message.error(`Ошибка перемещения: ${err instanceof Error ? err.message : 'неизвестная ошибка'}`, { duration: 5000 })
  }
}

const completeShipment = async () => {
  // Фильтруем только товары, которые добавлены в текущую отгрузку
  const itemsToShip = scannedCodes.value.filter(item => item.scanCount === 2)

  if (itemsToShip.length === 0) {
    message.warning('Нет товаров, добавленных к отгрузке. Отсканируйте принятые товары повторно.', { duration: 5000 })
    return
  }

  // Обновляем статусы QR кодов на "отгружены"
  for (const item of itemsToShip) {
    await qrStore.updateQRCodeStatus(item.qrId, 'shipped', userStore.user?.name || 'System', userStore.user?.id)
  }

  const count = itemsToShip.length
  message.success(`Отгрузка завершена! Отправлено ${count} QR кодов`, { duration: 5000 })

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

watch(scannedCodes, () => {
  nextTick(() => recalcShipmentValidation())
}, { deep: true })

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
