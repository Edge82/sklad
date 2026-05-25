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
      <n-space>
        <n-button v-if="selectedOrderId" type="default" @click="printTransferOrder">
          <template #icon><n-icon><PrintOutline /></n-icon></template>
          Распечатать заказ
        </n-button>
        <n-button v-if="!selectedOrderId" type="primary" @click="handleSync" :loading="syncing">
          <template #icon><n-icon><ReloadOutline /></n-icon></template>
          Синхронизировать с 1С
        </n-button>
      </n-space>
    </div>

    <!-- Список заказов -->
    <div v-if="!selectedOrderId">
      <!-- Статистика -->
      <n-grid :cols="4" :x-gap="12" :y-gap="12" class="mb-6 items-stretch py-2">
        <n-gi>
          <n-card
            size="small"
            hoverable
            class="metric-card h-full flex flex-col justify-center"
            :class="{ 'active': !filterStatus }"
            @click="filterStatus = ''"
          >
            <div class="flex items-center gap-3 py-1">
              <n-icon size="28" color="#2080f0">
                <CubeOutline />
              </n-icon>
              <div>
                <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Всего заказов</n-text>
                <n-h3 class="m-0 leading-none">{{ orders.length }}</n-h3>
              </div>
            </div>
          </n-card>
        </n-gi>

        <n-gi>
          <n-card
            size="small"
            hoverable
            class="metric-card h-full flex flex-col justify-center"
            :class="{ 'active': filterStatus === 'draft' }"
            @click="filterStatus = 'draft'"
          >
            <div class="flex items-center gap-3 py-1">
              <n-icon size="28" color="#f0a020">
                <PencilOutline />
              </n-icon>
              <div>
                <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Черновики</n-text>
                <n-h3 class="m-0 leading-none">{{ draftOrdersCount }}</n-h3>
              </div>
            </div>
          </n-card>
        </n-gi>

        <n-gi>
          <n-card
            size="small"
            hoverable
            class="metric-card h-full flex flex-col justify-center"
            :class="{ 'active': filterStatus === 'completed' }"
            @click="filterStatus = 'completed'"
          >
            <div class="flex items-center gap-3 py-1">
              <n-icon size="28" color="#18a058">
                <CheckmarkCircleOutline />
              </n-icon>
              <div>
                <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Завершено</n-text>
                <n-h3 class="m-0 leading-none">{{ completedOrdersCount }}</n-h3>
              </div>
            </div>
          </n-card>
        </n-gi>

        <n-gi>
          <n-card
            size="small"
            hoverable
            class="metric-card h-full flex flex-col justify-center"
            :class="{ 'active': filterStatus === 'active' }"
            @click="filterStatus = 'active'"
          >
            <div class="flex items-center gap-3 py-1">
              <n-icon size="28" color="#f0a020">
                <TimeOutline />
              </n-icon>
              <div>
                <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">В работе</n-text>
                <n-h3 class="m-0 leading-none">{{ activeOrdersCount }}</n-h3>
              </div>
            </div>
          </n-card>
        </n-gi>
      </n-grid>

      <div style="margin-top: 24px;">
        <n-spin :show="loading">
          <n-empty v-if="orders.length === 0" description="Нет заказов на перемещение" />

          <n-data-table
          v-else
          :columns="columns"
          :data="filteredOrders"
          :pagination="pagination"
          :bordered="false"
          :single-line="false"
          size="small"
          striped
          @click="(e: any) => {
            const row = (e.target as HTMLElement).closest('tr')
            if (row && row.dataset.key) {
              openOrder(row.dataset.key)
            }
          }"
          :row-props="(row) => ({
            'data-key': row.Ref_Key,
            style: 'cursor: pointer; transition: background-color 0.2s;',
            onMouseEnter: (e: MouseEvent) => {
              (e.target as HTMLElement).closest('tr')?.style.setProperty('background-color', 'rgba(63, 131, 226, 0.08)')
            },
            onMouseLeave: (e: MouseEvent) => {
              (e.target as HTMLElement).closest('tr')?.style.removeProperty('background-color')
            }
          })"
        />
      </n-spin>
      </div>
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
                  <n-text depth="3">Состояние:</n-text>
                  <n-tag :type="selectedOrder.statusDescription === 'Завершен' ? 'error' : 'warning'">
                    {{ selectedOrder.statusDescription || 'Неизвестно' }}
                  </n-tag>
                </div>
              </n-gi>
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
              <n-gi v-if="selectedOrder.customerOrderNumber">
                <div class="flex justify-between">
                  <n-text depth="3">Заказ покупателя:</n-text>
                  <n-text strong>{{ selectedOrder.customerOrderNumber }}</n-text>
                </div>
              </n-gi>
            </n-grid>
          </n-card>

          <!-- Товары для сканирования -->
          <n-card v-if="!scanningMode" size="small" title="Товары для сканирования">
            <n-empty v-if="!selectedOrder.items || selectedOrder.items.length === 0" description="Нет товаров в заказе" />

            <div v-else class="space-y-3">
              <n-data-table
                :columns="itemsColumns"
                :data="selectedOrder.items"
                :bordered="false"
                :single-line="false"
                size="small"
                striped
              />
            </div>
          </n-card>

          <!-- Режим сканирования -->
          <n-card v-if="scanningMode && !scanningComplete" size="small" title="🔴 Режим сканирования активирован">
            <div class="space-y-4">
              <!-- Прогресс сканирования -->
              <div>
                <div class="flex justify-between mb-2">
                  <n-text strong>Прогресс по товарам</n-text>
                  <n-text>{{ selectedOrder.items?.filter(i => (i.scannedQty || 0) === i.Количество).length }} / {{ selectedOrder.items?.length || 0 }}</n-text>
                </div>
                <div class="bg-gray-200 rounded-full h-2">
                  <div
                    class="bg-green-500 h-2 rounded-full transition-all"
                    :style="{ width: `${selectedOrder.items?.length ? (selectedOrder.items.filter(i => (i.scannedQty || 0) === i.Количество).length / selectedOrder.items.length * 100) : 0}%` }"
                  />
                </div>
              </div>

              <!-- Поле ввода штрихкода (скрытое, но в фокусе) -->
              <div>
                <n-input
                  ref="barcodeInputRef"
                  v-model:value="barcodeBuffer"
                  placeholder="Сканируйте штрихкоды..."
                  size="large"
                  @keyup.enter="handleScan"
                  class="barcode-input"
                />
                <n-text depth="3" class="mt-2 block">
                  Последний отсканированный: <code>{{ lastBarcode || '—' }}</code>
                </n-text>
              </div>

              <!-- Список товаров для сканирования -->
              <n-data-table
                :columns="itemsScanColumns"
                :data="selectedOrder.items"
                :bordered="false"
                :single-line="false"
                size="small"
                striped
              />

              <!-- Подсказка -->
              <n-alert type="info" closable>
                <strong>💡 Подсказка:</strong>
                <ul class="mt-2 ml-4 list-disc">
                  <li>Сканируйте товары штрих-кодом</li>
                  <li>🟢 Зелёные - товары полностью отсканированы</li>
                  <li>🟡 Жёлтые - отсканировано не полностью</li>
                  <li>🔴 Красные - больше чем в заказе!</li>
                  <li>Нажмите <kbd style="color: black">ESC</kbd> чтобы завершить сканирование</li>
                </ul>
              </n-alert>
            </div>
          </n-card>

          <!-- Результаты сканирования -->
          <n-card v-else-if="scanningComplete" size="small" title="📋 Результаты сканирования">
            <div class="space-y-4">
              <n-data-table
                :columns="itemsScanColumns"
                :data="selectedOrder.items"
                :bordered="false"
                :single-line="false"
                size="small"
                striped
              />

              <n-alert
                :type="(selectedOrder.items?.reduce((s, i) => s + (i.scannedQty || 0), 0) || 0) === (selectedOrder.items?.reduce((s, i) => s + i.Количество, 0) || 0) ? 'success' : 'warning'"
              >
                <template v-if="(selectedOrder.items?.reduce((s, i) => s + (i.scannedQty || 0), 0) || 0) === (selectedOrder.items?.reduce((s, i) => s + i.Количество, 0) || 0)">
                  <strong>✓ Все товары отсканированы правильно!</strong> Можно отправить в 1C
                </template>
                <template v-else>
                  <strong>⚠ Количество не совпадает:</strong> Отсканировано {{ selectedOrder.items?.reduce((s, i) => s + (i.scannedQty || 0), 0) || 0 }} из {{ selectedOrder.items?.reduce((s, i) => s + i.Количество, 0) || 0 }} товаров
                </template>
              </n-alert>

              <div class="flex gap-2 flex-wrap">
                <n-button
                  type="primary"
                  size="large"
                  @click="saveScanningLocally"
                  v-if="(selectedOrder.items?.reduce((s, i) => s + (i.scannedQty || 0), 0) || 0) < (selectedOrder.items?.reduce((s, i) => s + i.Количество, 0) || 0)"
                  :disabled="selectedOrder.saved"
                >
                  💾 {{ selectedOrder.saved ? '✓ Сохранено локально' : 'Сохранить локально' }}
                </n-button>

                <n-button
                  type="success"
                  size="large"
                  @click="submitToOnec"
                  :loading="syncing"
                  v-if="(selectedOrder.items?.reduce((s, i) => s + (i.scannedQty || 0), 0) || 0) === (selectedOrder.items?.reduce((s, i) => s + i.Количество, 0) || 0)"
                >
                  🚀 Отправить в 1C
                </n-button>

                <n-button
                  @click="continueScanningAfterCompletion"
                  size="large"
                >
                  🔄 Продолжить сканирование
                </n-button>
              </div>
            </div>
          </n-card>

          <!-- Кнопки действий для нормального режима -->
          <div v-if="!scanningComplete" class="flex gap-2">
            <n-button
              v-if="!scanningMode && selectedOrder?.statusDescription !== 'Завершен'"
              type="primary"
              size="large"
              @click="startScanning"
            >
              <template #icon><n-icon><CameraOutline /></n-icon></template>
              Начать сканирование
            </n-button>
            <n-button
              v-if="selectedOrder?.statusDescription === 'Завершен' && !scanningMode"
              disabled
              type="default"
              size="large"
            >
              <template #icon><n-icon><CloseCircleOutline /></n-icon></template>
              Заказ завершён
            </n-button>
            <n-button
              v-else-if="scanningMode"
              type="error"
              size="large"
              @click="stopScanning"
              style="color: white; font-weight: bold; font-size: 16px;"
            >
              <template #icon><n-icon><CloseCircleOutline /></n-icon></template>
              Завершить сканирование (ESC)
            </n-button>
          </div>
        </div>
      </n-spin>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h, onBeforeUnmount, watch, nextTick } from 'vue'
import { useStockBalances } from '@/composables/useStockBalances'
import { useMessage } from 'naive-ui'
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
  NH1,
  NH3,
  NAlert,
  NInput,
  type InputInst
} from 'naive-ui'
import { ArrowBackOutline, CameraOutline, ReloadOutline, CloseCircleOutline, CubeOutline, PencilOutline, CheckmarkCircleOutline, TimeOutline, PrintOutline } from '@vicons/ionicons5'
import type { DataTableColumns } from 'naive-ui'

interface TransferOrder {
  Ref_Key: string
  Number: string
  Date: string
  Posted: boolean
  statusKey?: string
  statusDescription?: string
  sourceWarehouseKey: string
  sourceWarehouseName?: string
  destinationWarehouseKey: string
  destinationWarehouseName?: string
  customerOrderKey?: string
  customerOrderNumber?: string
  saved?: boolean
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

const { fetchTransferOrders, fetchTransferOrderDetails, syncTransferOrders, completeTransferOrderInOneC, loadTransferOrderScans, saveTransferOrderScans } = useStockBalances()
const message = useMessage()
const loading = ref(false)
const syncing = ref(false)
const loadingDetails = ref(false)
const scanningMode = ref(false)
const scanningComplete = ref(false)
const barcodeBuffer = ref('')
const lastBarcode = ref('')
const barcodeInputRef = ref<InputInst | null>(null)
const filterStatus = ref('')
const orders = ref<TransferOrder[]>([])
const selectedOrderId = ref<string | null>(null)
const selectedOrder = ref<TransferOrder | null>(null)
const scannedBarcodes = ref<Set<string>>(new Set())

const pagination = ref({ pageSize: 10 })

const handleSync = async () => {
  syncing.value = true
  try {
    await syncTransferOrders()
    // После синхронизации перезагружаем список заказов
    const data = await fetchTransferOrders()
    orders.value = data
    message.success('Заказы на перемещение синхронизированы с 1С')
  } catch (error) {
    console.error('Ошибка при синхронизации:', error)
    message.error('Ошибка при синхронизации с 1С')
  } finally {
    syncing.value = false
  }
}

const startScanning = () => {
  scanningMode.value = true
  barcodeBuffer.value = ''
  lastBarcode.value = ''
  scannedBarcodes.value.clear()
  message.info('🔴 Режим сканирования активирован. Сканируйте товары...')
  // Фокусируем поле ввода штрихкода
  nextTick(() => {
    barcodeInputRef.value?.focus()
  })
}

const stopScanning = () => {
  scanningMode.value = false
  barcodeBuffer.value = ''
  lastBarcode.value = ''
  scanningComplete.value = true

  const totalItems = selectedOrder.value?.items?.reduce((sum, item) => sum + item.Количество, 0) || 0
  const scannedCount = selectedOrder.value?.items?.reduce((sum, item) => sum + (item.scannedQty || 0), 0) || 0

  if (scannedCount === 0) {
    message.warning('Ничего не отсканировано')
    scanningComplete.value = false
    return
  }

  if (scannedCount === totalItems) {
    message.success(`✓ Все товары отсканированы! ${scannedCount}/${totalItems}`)
  } else if (scannedCount < totalItems) {
    message.warning(`⚠ Отсканировано ${scannedCount} из ${totalItems} товаров`)
  }
}

let scanTimeout: ReturnType<typeof setTimeout> | null = null

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
    '.': '/',
  }
  return text.split('').map(char => map[char] || char).join('')
}

// Функция нормализации штрихкода (удаляем пробелы, управляющие символы)
const normalizeBarcode = (code: string): string => {
  return convertRussianKeyboardToLatin(
    code
      .trim()
      .replace(/[\r\n\t]+/g, '')
  )
}

const procesBarcode = (barcode: string) => {
  if (!selectedOrder.value?.items || !barcode.trim()) return

  // Нормализуем введённый штрихкод
  const normalizedBarcode = normalizeBarcode(barcode)

  // Ищем товар по штрихкоду (также нормализуем штрихкод из базы)
  const foundItem = selectedOrder.value.items.find(item => {
    const itemBarcode = normalizeBarcode(item.barcode || '')
    return itemBarcode === normalizedBarcode
  })

  if (!foundItem) {
    message.error(`✗ Штрихкод не найден: ${barcode}`)
    return
  }

  const currentQty = foundItem.scannedQty || 0
  const requiredQty = foundItem.Количество

  // Проверяем не превышено ли количество
  if (currentQty >= requiredQty) {
    message.error(`🚫 Товар "${foundItem.nomenclatureName}" уже полностью отсканирован! (${currentQty}/${requiredQty})`)
    return
  }

  // Увеличиваем счетчик
  foundItem.scannedQty = currentQty + 1
  scannedBarcodes.value.add(normalizedBarcode)

  // Сбрасываем флаг saved при сканировании
  if (selectedOrder.value) {
    selectedOrder.value.saved = false
  }

  const newQty = foundItem.scannedQty
  const totalScanned = selectedOrder.value.items.reduce((sum, item) => sum + (item.scannedQty || 0), 0)
  const totalRequired = selectedOrder.value.items.reduce((sum, item) => sum + item.Количество, 0)
  const percent = Math.round((totalScanned / totalRequired) * 100)

  if (newQty === requiredQty) {
    message.success(`✓ ${foundItem.nomenclatureName} завершено! (${newQty}/${requiredQty})`)
  } else {
    message.info(`✓ ${foundItem.nomenclatureName}: ${newQty}/${requiredQty} (Всего: ${totalScanned}/${totalRequired} - ${percent}%)`)
  }
}

const handleScan = () => {
  const barcode = barcodeBuffer.value.trim()
  if (!barcode) return

  const normalized = normalizeBarcode(barcode)
  lastBarcode.value = normalized
  procesBarcode(barcode)
  barcodeBuffer.value = ''

  // Возвращаем фокус на поле ввода
  nextTick(() => {
    barcodeInputRef.value?.focus()
  })
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (!scanningMode.value) {
    // Если нажата комбинация Ctrl+S, то включаем режим сканирования
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault()
      startScanning()
    }
    return
  }

  // Если Escape - выходим из режима сканирования
  if (event.key === 'Escape') {
    event.preventDefault()
    stopScanning()
    return
  }
}

// Автообработка штрихкода при вводе (watch с debounce как в scan.vue)
watch(barcodeBuffer, (val) => {
  if (scanTimeout) clearTimeout(scanTimeout)
  if (!val.trim()) return
  scanTimeout = setTimeout(() => {
    handleScan()
  }, 300)
})

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ru-RU')
  } catch {
    return dateStr
  }
}

// Вычисляемые свойства для статистики
const draftOrdersCount = computed(() =>
  orders.value.filter(o => !o.Posted).length
)

const completedOrdersCount = computed(() =>
  orders.value.filter(o => o.statusDescription === 'Завершен').length
)

const activeOrdersCount = computed(() =>
  orders.value.filter(o => o.Posted && o.statusDescription !== 'Завершен').length
)

// Отфильтрованные заказы для таблицы
const filteredOrders = computed(() => {
  if (!filterStatus.value) return orders.value

  switch (filterStatus.value) {
    case 'draft':
      return orders.value.filter(o => !o.Posted)
    case 'completed':
      return orders.value.filter(o => o.statusDescription === 'Завершен')
    case 'active':
      return orders.value.filter(o => o.Posted && o.statusDescription !== 'Завершен')
    default:
      return orders.value
  }
})

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
    title: 'Заказ покупателя',
    key: 'customerOrderNumber',
    width: 150,
    render: (row) => row.customerOrderNumber || '-'
  },
  {
    title: 'Состояние',
    key: 'statusDescription',
    width: 140,
    render: (row) => {
      const status = row.statusDescription || 'Неизвестно'
      const type = status === 'Завершен' ? 'error' : 'warning'
      return h(NTag, { type }, {
        default: () => status
      })
    }
  },
  {
    title: 'Статус',
    key: 'Posted',
    width: 120,
    render: (row) =>
      h(NTag, { type: row.Posted ? 'success' : 'warning' }, {
        default: () => row.Posted ? 'Проведен' : 'Черновик'
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
    width: 180,
    align: 'center',
    render: (row) => {
      const scanned = row.scannedQty || 0
      const required = row.Количество || 0

      return h('div', { class: 'flex items-center gap-2 justify-center' }, [
        h(NButton, {
          text: true,
          type: 'primary',
          size: 'small',
          onClick: () => {
            if (scanned > 0) {
              row.scannedQty = scanned - 1
            }
          }
        }, { default: () => '−' }),
        h(NInput, {
          value: String(scanned),
          type: 'text',
          inputMode: 'numeric',
          min: 0,
          max: required,
          size: 'small',
          style: { width: '60px', textAlign: 'center' },
          onInput: (val: string) => {
            const num = parseInt(val) || 0
            row.scannedQty = Math.max(0, Math.min(num, required + 5))
          }
        }),
        h(NButton, {
          text: true,
          type: 'primary',
          size: 'small',
          onClick: () => {
            row.scannedQty = scanned + 1
          }
        }, { default: () => '+' })
      ])
    }
  }
]

const itemsScanColumns: DataTableColumns<any> = [
  {
    title: 'Статус',
    key: 'barcode',
    width: 100,
    align: 'center',
    render: (row) => {
      const scanned = row.scannedQty || 0
      const required = row.Количество || 0

      if (scanned === required) {
        return h(NTag, { type: 'success', round: true }, {
          default: () => '✓ OK'
        })
      } else if (scanned > required) {
        return h(NTag, { type: 'error', round: true }, {
          default: () => `✗ ${scanned}>${required}`
        })
      } else {
        return h(NTag, { type: 'warning', round: true }, {
          default: () => `⚠ ${scanned}/${required}`
        })
      }
    }
  },
  {
    title: 'Товар',
    key: 'nomenclatureName',
    ellipsis: true
  },
  {
    title: 'Штрих код',
    key: 'barcode',
    width: 150,
    render: (row) => h('code', {}, row.barcode || '-')
  },
  {
    title: 'Место хранения',
    key: 'storageBin',
    width: 150,
    render: (row) => row.storageBin || '-'
  },
  {
    title: 'Требуется',
    key: 'Количество',
    width: 100,
    align: 'center'
  },
  {
    title: 'Отсканировано',
    key: 'scannedQty',
    width: 180,
    align: 'center',
    render: (row) => {
      const scanned = row.scannedQty || 0
      const required = row.Количество || 0
      const typeTag = scanned === required ? 'success' : scanned > required ? 'error' : 'warning'

      return h('div', { class: 'flex items-center gap-2 justify-center' }, [
        h(NButton, {
          text: true,
          type: 'primary',
          size: 'small',
          onClick: () => {
            if (scanned > 0) {
              row.scannedQty = scanned - 1
            }
          }
        }, { default: () => '−' }),
        h(NInput, {
          value: String(scanned),
          type: 'text',
          inputMode: 'numeric',
          min: 0,
          max: required,
          size: 'small',
          style: { width: '60px', textAlign: 'center' },
          onInput: (val: string) => {
            const num = parseInt(val) || 0
            row.scannedQty = Math.max(0, Math.min(num, required + 5))
          }
        }),
        h(NButton, {
          text: true,
          type: 'primary',
          size: 'small',
          onClick: () => {
            row.scannedQty = scanned + 1
          }
        }, { default: () => '+' })
      ])
    }
  }
]

const saveScannedDataToStorage = () => {
  if (!selectedOrder.value?.items) return

  const scannedData = selectedOrder.value.items.map(item => ({
    barcode: item.barcode,
    scannedQty: item.scannedQty || 0
  }))

  localStorage.setItem(`scan_${selectedOrder.value.Ref_Key}`, JSON.stringify(scannedData))
}

const loadScannedDataFromStorage = (orderId: string) => {
  const stored = localStorage.getItem(`scan_${orderId}`)
  if (!stored) return

  try {
    const scannedData = JSON.parse(stored)
    if (selectedOrder.value?.items) {
      selectedOrder.value.items.forEach(item => {
        const found = scannedData.find((s: any) => s.barcode === item.barcode)
        if (found) {
          item.scannedQty = found.scannedQty
        }
      })
    }
  } catch (e) {
    console.error('Ошибка загрузки данных сканирования:', e)
  }
}

const openOrder = async (orderId: string) => {
  selectedOrderId.value = orderId
  loadingDetails.value = true
  scanningMode.value = false
  scanningComplete.value = false
  barcodeBuffer.value = ''
  lastBarcode.value = ''
  scannedBarcodes.value.clear()

  try {
    const details = await fetchTransferOrderDetails(orderId)
    // Инициализируем scannedQty для всех товаров
    if (details.items) {
      details.items.forEach((item: any) => {
        item.scannedQty = 0
      })
    }
    details.saved = false
    selectedOrder.value = details

    // Загружаем сохранённые данные сканирования из БД
    try {
      const scans = await loadTransferOrderScans(orderId)
      if (selectedOrder.value?.items && scans) {
        selectedOrder.value.items.forEach(item => {
          if (scans[item.barcode || '']) {
            item.scannedQty = scans[item.barcode || '']
          }
        })
      }
    } catch (e) {
      console.log('Нет сохранённых данных сканирования')
    }
  } catch (error) {
    console.error('Ошибка при загрузке деталей заказа:', error)
  } finally {
    loadingDetails.value = false
  }
}

const saveScanningLocally = () => {
  if (!selectedOrder.value) return

  const result = {
    orderId: selectedOrder.value.Ref_Key,
    orderNumber: selectedOrder.value.Number,
    timestamp: new Date().toISOString(),
    items: selectedOrder.value.items?.map(item => ({
      barcode: item.barcode,
      nomenclatureName: item.nomenclatureName,
      required: item.Количество,
      scanned: item.scannedQty || 0
    }))
  }

  // Сохраняем в localStorage
  const existing = JSON.parse(localStorage.getItem('transfer_order_scans') || '[]')
  existing.push(result)
  localStorage.setItem('transfer_order_scans', JSON.stringify(existing))

  // Добавляем флаг что сохранено
  if (selectedOrder.value) {
    selectedOrder.value.saved = true
  }

  message.success(`✓ Результат сохранён локально. Отсканировано товаров: ${result.items?.reduce((s, i) => s + i.scanned, 0)}`)
  // Экран результатов остаётся видимым!
}

const submitToOnec = async () => {
  if (!selectedOrder.value) return

  syncing.value = true
  try {
    // Проверяем что всё совпало
    const totalScanned = selectedOrder.value.items?.reduce((sum, item) => sum + (item.scannedQty || 0), 0) || 0
    const totalRequired = selectedOrder.value.items?.reduce((sum, item) => sum + item.Количество, 0) || 0

    if (totalScanned !== totalRequired) {
      message.error(`Количество не совпадает: ${totalScanned}/${totalRequired}`)
      return
    }

    const orderId = selectedOrder.value.Ref_Key
    await completeTransferOrderInOneC(orderId)

    message.success(`✓ Заказ "${selectedOrder.value.Number}" завершён в 1C, локальные данные удалены`)

    const data = await fetchTransferOrders()
    orders.value = data

    scanningComplete.value = false
    barcodeBuffer.value = ''
    lastBarcode.value = ''
    selectedOrder.value = null
    selectedOrderId.value = null
  } catch (error) {
    console.error('Ошибка при отправке в 1C:', error)
    message.error('Ошибка при отправке в 1C')
  } finally {
    syncing.value = false
  }
}

const continueScanningAfterCompletion = () => {
  scanningComplete.value = false
  scanningMode.value = true
  barcodeBuffer.value = ''
  lastBarcode.value = ''
  message.info('Режим сканирования продолжен...')
  nextTick(() => {
    barcodeInputRef.value?.focus()
  })
}

const printTransferOrder = () => {
  if (!selectedOrder.value) return

  const order = selectedOrder.value

  // Создаём скрытый iframe для печати
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const itemsHtml = (order.items || []).map((item) => `
    <tr>
      <td style="border:1px solid #333;padding:8px;">${item.nomenclatureName || '-'}</td>
      <td style="border:1px solid #333;padding:8px;text-align:center;">${item.Количество || 0}</td>
      <td style="border:1px solid #333;padding:8px;text-align:center;">${item.storageBin || '-'}</td>
    </tr>
  `).join('')

  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (!doc) {
    message.error('Ошибка при создании документа для печати')
    document.body.removeChild(iframe)
    return
  }

  doc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Заказ на перемещение ${order.Number}</title>
      <style>
        @page { margin: 10mm; size: auto; }
        body { font-family: Arial, sans-serif; font-size: 11pt; color: #000; margin: 0; padding: 0; }
        h1 { font-size: 16pt; margin-bottom: 6px; margin-top: 0; }
        .meta { margin-bottom: 12px; font-size: 10pt; }
        .meta-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .meta-label { color: #555; }
        .meta-value { font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; table-layout: fixed; }
        th { background: #f0f0f0; font-weight: bold; text-align: left; font-size: 10pt; }
        th, td { border: 1px solid #333; padding: 6px; word-wrap: break-word; }
        td:nth-child(1) { width: 50%; }
        td:nth-child(2) { width: 15%; text-align: center; }
        td:nth-child(3) { width: 35%; }
        .footer { margin-top: 20px; display: flex; justify-content: space-between; }
        .sign { width: 45%; }
        .sign-line { border-bottom: 1px solid #000; margin-top: 25px; margin-bottom: 3px; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <h1>Заказ на перемещение № ${order.Number}</h1>
      <div class="meta">
        <div class="meta-row">
          <span><span class="meta-label">Дата:</span> <span class="meta-value">${formatDate(order.Date)}</span></span>
          <span><span class="meta-label">Состояние:</span> <span class="meta-value">${order.statusDescription || '—'}</span></span>
        </div>
        <div class="meta-row">
          <span><span class="meta-label">От склада:</span> <span class="meta-value">${order.sourceWarehouseName || '—'}</span></span>
          <span><span class="meta-label">На склад:</span> <span class="meta-value">${order.destinationWarehouseName || '—'}</span></span>
        </div>
        ${order.customerOrderNumber ? `
        <div class="meta-row">
          <span><span class="meta-label">Заказ покупателя:</span> <span class="meta-value">${order.customerOrderNumber}</span></span>
        </div>` : ''}
      </div>

      <table>
        <thead>
          <tr>
            <th>Товар</th>
            <th style="text-align:center;">Кол-во</th>
            <th style="text-align:center;">Место хранения</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml || '<tr><td colspan="3" style="text-align:center;">Нет товаров</td></tr>'}
        </tbody>
      </table>

      <div class="footer">
        <div class="sign">
          <div>Отправил:</div>
          <div class="sign-line"></div>
          <div style="font-size:9pt;color:#555;">подпись / ФИО</div>
        </div>
        <div class="sign">
          <div>Принял:</div>
          <div class="sign-line"></div>
          <div style="font-size:9pt;color:#555;">подпись / ФИО</div>
        </div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
            setTimeout(function() {
              const iframe = document.querySelector('iframe');
              if (iframe && iframe.parentElement) {
                iframe.parentElement.removeChild(iframe);
              }
            }, 100);
          }, 200);
        };
      <\/script>
    </body>
    </html>
  `)
  doc.close()
}

// Автосохранение результатов сканирования при изменении
let saveTimeout: NodeJS.Timeout | null = null
watch(
  () => selectedOrder.value?.items,
  async (items) => {
    if (!selectedOrder.value || !items || scanningMode.value === false) return

    // Сбрасываем флаг saved при любых изменениях в сканировании
    selectedOrder.value.saved = false

    // Отменяем предыдущий таймер если есть
    if (saveTimeout) clearTimeout(saveTimeout)

    // Ставим новый с задержкой в 500ms чтобы не спамить запросы
    saveTimeout = setTimeout(async () => {
      try {
        await saveTransferOrderScans(selectedOrder.value!.Ref_Key, items.map(item => ({
          barcode: item.barcode || '',
          scannedQty: item.scannedQty || 0
        })))
      } catch {
        // Тихо игнорируем ошибки автосохранения — данные всё равно хранятся в памяти
      }
    }, 500)
  },
  { deep: true }
)

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

  // Добавляем обработчик клавиатуры для сканера
  window.addEventListener('keydown', handleKeyDown)
})

// Очищаем обработчик при размонтировании компонента
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown)
  if (saveTimeout) clearTimeout(saveTimeout)
  if (scanTimeout) clearTimeout(scanTimeout)
})
</script>

<style scoped>
.transfer-orders-page {
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 24px;
}
@media (max-width: 768px) {
  .transfer-orders-page {
    padding: 0 12px;
  }
}

.space-y-6 > * + * {
  margin-top: 1.5rem;
}

.space-y-4 > * + * {
  margin-top: 1rem;
}

.space-y-3 > * + * {
  margin-top: 0.75rem;
}

/* Стили для режима сканирования */
kbd {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: #f5f5f5;
  border: 1px solid #ccc;
  border-radius: 3px;
  font-family: monospace;
  font-size: 0.85em;
}

.barcode-input {
  font-family: monospace;
  font-size: 1.25rem;
}

.barcode-input :deep(input) {
  font-family: monospace;
  font-size: 1.25rem;
  text-align: center;
  letter-spacing: 2px;
}

/* Прогресс-бар */
.bg-gray-200 {
  background-color: #e5e7eb;
}

.bg-gray-100 {
  background-color: #f3f4f6;
}

.bg-green-500 {
  background-color: #10b981;
}

.border-blue-500 {
  border-color: #3b82f6;
}

.metric-card {
  height: 100%;
  background-color: #2a2a2a;
  border-bottom: 4px solid transparent;
  transition: all 0.3s ease;
  cursor: pointer;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  background-color: #333;
}

.metric-card.active {
  background-color: #333;
  border-bottom-color: #18a058;
}
</style>
