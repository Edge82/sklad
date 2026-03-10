<template>
  <div class="scan-page">
    <div class="flex justify-between items-center mb-6">
      <n-h1 class="m-0">Сканирование и Накладные</n-h1>
      <n-space>
        <n-button v-if="scannedItems.length > 0" type="error" ghost @click="clearSession">
          Очистить сессию
        </n-button>
        <n-button 
          v-if="scannedItems.length > 0" 
          type="primary" 
          size="large" 
          @click="showConfirmModal = true"
        >
          Оформить {{ scanMode === 'ship' ? 'выдачу' : 'приход' }} ({{ scannedItems.length }})
        </n-button>
      </n-space>
    </div>
    
    <n-card class="mb-6">
      <n-grid :cols="24" :x-gap="16">
        <n-gi :span="8">
          <n-form-item label="Сканирование" :show-feedback="false">
             <n-input
                v-model:value="lastScannedCode"
                placeholder="Код товара или QR-код"
                size="large"
                @keyup.enter="handleScan"
                ref="scanInputRef"
                autofocus
              >
                <template #prefix>
                  <n-icon><QrCodeOutline /></n-icon>
                </template>
              </n-input>
          </n-form-item>
        </n-gi>
        <n-gi :span="8">
          <n-form-item label="Привязать к заказу (необязательно)" :show-feedback="false">
            <n-select
              v-model:value="selectedOrderNumber"
              placeholder="Выберите заказ"
              :options="orderOptions"
              filterable
              clearable
              size="large"
            />
          </n-form-item>
        </n-gi>
        <n-gi :span="8">
          <n-form-item label="Режим работы" :show-feedback="false">
            <n-tabs type="segment" v-model:value="scanMode" size="large">
              <n-tab-pane name="ship" tab="Выдача / Отгрузка" />
              <n-tab-pane name="receive" tab="Приёмка / Приход" />
            </n-tabs>
          </n-form-item>
        </n-gi>
      </n-grid>

      <n-grid v-if="scanMode === 'ship'" :cols="24" :x-gap="16" class="mt-4">
        <n-gi :span="8">
          <n-form-item label="Пункт назначения" :show-feedback="false">
            <n-radio-group v-model:value="destinationType" name="destination" size="large">
              <n-radio-button value="production">В производство</n-radio-button>
              <n-radio-button value="client">Клиенту (Отгрузка)</n-radio-button>
            </n-radio-group>
          </n-form-item>
        </n-gi>
      </n-grid>
    </n-card>

    <n-card title="Список товаров в текущей накладной" class="mb-6">
      <template #header-extra>
         <n-text depth="3">Позиций: {{ scannedItems.length }}</n-text>
      </template>
      
      <n-data-table
        :columns="columns"
        :data="scannedItems"
        :max-height="500"
      />

      <div v-if="scannedItems.length === 0" class="py-12 text-center text-gray-400">
        <n-empty description="Отсканируйте товары, чтобы они появились здесь" />
      </div>
    </n-card>

    <n-collapse default-expanded-names="history">
      <n-collapse-item title="История последних сканирований" name="history">
        <n-card size="small">
          <n-list>
            <n-list-item v-for="(scan, index) in scanHistory" :key="index">
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-4">
                  <n-text depth="3" class="w-20">{{ scan.time.toLocaleTimeString() }}</n-text>
                  <n-text strong>{{ scan.code }}</n-text>
                </div>
                <n-tag :type="scan.resultType" size="small">{{ scan.resultMessage }}</n-tag>
              </div>
            </n-list-item>
          </n-list>
        </n-card>
      </n-collapse-item>
    </n-collapse>

    <!-- Модалка подтверждения -->
    <n-modal v-model:show="showConfirmModal" preset="dialog" type="info"
      title="Подтверждение выдачи"
      content="Вы уверены, что хотите оформить накладную? Это спишет указанные товары со склада."
      positive-text="Подтвердить и списать"
      negative-text="Отмена"
      @positive-click="processShipment"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, onMounted, nextTick } from 'vue'
import { 
  QrCodeOutline, 
  TrashOutline 
} from '@vicons/ionicons5'
import { 
  NInput, NButton, NIcon, NCard, NTabs, NTabPane, NAlert, 
  NDataTable, NInputNumber, NSpace, NTag, NEmpty, NList, NListItem, 
  NText, NH1, NSelect, NFormItem, NGrid, NGi, NModal, NCollapse, NCollapseItem,
  NRadioGroup, NRadioButton,
  useMessage, useDialog 
} from 'naive-ui'
import { useQRCodesStore } from '@/stores/qrCodes'
import { useUserStore } from '@/stores/user'
import { useInventoryStore } from '@/stores/inventory'
import { useOrdersStore } from '@/stores/orders'
import { useEmployeesStore } from '@/stores/employees'
import type { InventoryItem } from '@/types'

const scanMode = ref('ship') // По умолчанию выдача (списание)
const destinationType = ref<'production' | 'client'>('production')
const lastScannedCode = ref('')
const scanResult = ref<{ title: string, message: string, type: 'success' | 'error' | 'warning' } | null>(null)
const scanInputRef = ref<any>(null)
const selectedOrderNumber = ref<string | null>(null)
const showConfirmModal = ref(false)

interface ScannedItem {
  id: string
  sku: string
  name: string
  quantity: number
  unit: string
  stock: number
  price: number
  isProduct: boolean
}

const scannedItems = ref<ScannedItem[]>([])

interface ScanLog {
  id: number
  code: string
  time: Date
  resultType: 'success' | 'error' | 'warning' | 'info' | 'primary' | 'default'
  resultMessage: string
}
const scanHistory = ref<ScanLog[]>([])

const qrStore = useQRCodesStore()
const userStore = useUserStore()
const inventoryStore = useInventoryStore()
const ordersStore = useOrdersStore()
const employeesStore = useEmployeesStore()
const message = useMessage()
const dialog = useDialog()

const orderOptions = computed(() => {
  return ordersStore.orders.map(o => ({
    label: `${o.orderNumber} (${o.customerName})`,
    value: o.orderNumber
  }))
})

// Колонки таблицы
const columns = [
  {
    title: 'Наименование',
    key: 'name',
    render: (row: ScannedItem) => h('div', [
      h('div', { class: 'font-bold' }, row.name),
      h('div', { class: 'text-xs text-gray-500' }, row.sku)
    ])
  },
  {
    title: 'Кол-во',
    key: 'quantity',
    width: 120,
    render: (row: ScannedItem) => h(NInputNumber, {
      value: row.quantity,
      min: 1,
      max: row.stock,
      size: 'small',
      'onUpdate:value': (v) => { if (v) row.quantity = v }
    })
  },
  {
    title: 'Ост.',
    key: 'stock',
    width: 70,
    render: (row: ScannedItem) => h(NText, { depth: 3 }, { default: () => `${row.stock}` })
  },
  {
    title: '',
    key: 'actions',
    width: 60,
    render: (row: ScannedItem) => h(NButton, {
      size: 'small',
      quaternary: true,
      circle: true,
      type: 'error',
      onClick: () => {
        scannedItems.value = scannedItems.value.filter(i => i.id !== row.id)
      }
    }, { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) })
  }
]

function handleScan() {
  const code = lastScannedCode.value.trim()
  if (!code) return

  // Сброс фокуса перед повторным фокусом (решает проблему блокировки автофокуса)
  scanInputRef.value?.blur()

  // 1. Пытаемся найти как QR-код изделия (Готовая продукция)
  const qr = qrStore.getQRCodeByCode(code)
  if (qr) {
    if (scannedItems.value.length > 0 && !scannedItems.value[0].isProduct) {
      message.error('Нельзя смешивать товары основного склада и готовую продукцию в одной накладной')
      return
    }
    destinationType.value = 'client'
    handleQRScan(qr)
  } else {
    // 2. Пытаемся найти как обычный товар по SKU или штрихкоду (Материалы/Склад)
    const item = inventoryStore.items.find(i => i.sku === code || i.barcode === code)
    if (item) {
      if (scannedItems.value.length > 0 && scannedItems.value[0].isProduct) {
        message.error('Нельзя смешивать готовую продукцию и товары основного склада в одной накладной')
        return
      }
      destinationType.value = 'production'
      handleItemScan(item)
    } else {
      setResult('Ошибка', 'Код не принадлежит нашим складам!', 'error')
      addToHistory(code, 'Неизвестный код', 'error')
      message.error('Критическая ошибка: Код не принадлежит нашим складам!')
    }
  }

  lastScannedCode.value = ''
  nextTick(() => scanInputRef.value?.focus())
}

function handleQRScan(qr: any) {
  // Находим соответствующий товар в инвентаре
  const item = inventoryStore.items.find(i => i.sku === qr.productId || i.id === qr.productId)
  if (!item) {
    setResult('Ошибка', 'Изделие из QR-кода не найдено в базе товаров', 'error')
    return
  }

  addOrUpdateScannedItem(item, true)
  setResult('Добавлено', `Изделие "${qr.productName}" добавлено в список`, 'success')
  addToHistory(qr.code, 'Изделие добавлено', 'success')
}

function handleItemScan(item: InventoryItem) {
  addOrUpdateScannedItem(item, item.categoryId === '99')
  setResult('Добавлено', `Товар "${item.name}" добавлен в список`, 'success')
  addToHistory(item.sku, 'Товар добавлен', 'success')
}

function addOrUpdateScannedItem(item: InventoryItem, isProduct: boolean) {
  const existing = scannedItems.value.find(i => i.id === item.id)
  if (existing) {
    if (existing.quantity < item.currentStock) {
      existing.quantity++
    } else {
      message.warning('Превышен доступный остаток на складе')
    }
  } else {
    scannedItems.value.push({
      id: item.id,
      sku: item.sku,
      name: item.name,
      quantity: 1,
      unit: item.unit,
      stock: item.currentStock,
      price: item.purchasePrice || 0,
      isProduct
    })
  }
}

async function processShipment() {
  if (scannedItems.value.length === 0) return

  const workerName = userStore.user?.name || 'Кладовщик'
  const employeeId = userStore.user?.id || '1'
  const currentMode = scanMode.value === 'ship' ? 'outgoing' : 'incoming'
  const orderLabel = selectedOrderNumber.value || 'Без привязки'
  const destination = scanMode.value === 'ship' 
    ? (destinationType.value === 'production' ? 'Производство' : 'Клиент')
    : 'Основной склад'

  try {
    // 1. Обновляем остатки
    for (const item of scannedItems.value) {
      inventoryStore.updateStock(item.id, item.quantity, currentMode, {
        documentNumber: `Накладная-${Date.now().toString().slice(-6)}`,
        reason: `${currentMode === 'outgoing' ? (destinationType.value === 'production' ? 'Выдача в пр-во' : 'Отгрузка') : 'Приход'} (${orderLabel})`,
        createdBy: workerName,
        destinationLocation: destination
      })
    }

    // 2. Логируем в историю (если это выдача)
    if (currentMode === 'outgoing') {
      const historyItem = {
        orderNumber: orderLabel,
        destination: destination,
        totalAmount: scannedItems.value.reduce((sum, i) => sum + (i.price * i.quantity), 0),
        items: scannedItems.value.map(i => ({
          productName: i.name,
          quantity: i.quantity,
          unit: i.unit,
          article: i.sku,
          price: i.price,
          scannedAt: new Date()
        }))
      }
      employeesStore.addMaterialHistory(employeeId, historyItem)
    }

    message.success(currentMode === 'outgoing' ? (destinationType.value === 'production' ? 'Выдача оформлена' : 'Отгрузка оформлена') : 'Приход оформлен')
    clearSession()
  } catch (e) {
    message.error('Ошибка при проведении операции')
    console.error(e)
  }
}

function clearSession() {
  scannedItems.value = []
  selectedOrderNumber.value = null
  scanResult.value = null
}

function setResult(title: string, message: string, type: 'success' | 'error' | 'warning') {
  scanResult.value = { title, message, type }
}

function addToHistory(code: string, message: string, type: 'success' | 'error' | 'warning') {
  console.log('Adding to history:', code, message, type)
  scanHistory.value.unshift({
    id: Date.now(),
    time: new Date(),
    code,
    resultMessage: message,
    resultType: type
  })
}

onMounted(() => {
  nextTick(() => scanInputRef.value?.focus())
})
</script>

<style scoped>
.scan-page {
  width: 100%;
}
</style>
