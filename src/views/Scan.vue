<template>
  <div class="scan-page p-6">
    <div class="flex justify-between items-center mb-6">
      <n-h1 class="m-0">Сканирование и Накладные</n-h1>
      <n-space>
        <n-button v-if="scannedItems.length > 0" type="error" ghost @click="() => clearSession()">
          Очистить сессию
        </n-button>
        <n-button 
          v-if="scannedItems.length > 0" 
          :type="submitButtonType" 
          size="large" 
          @click="showConfirmModal = true"
        >
          {{ submitButtonText }} ({{ scannedItems.length }})
        </n-button>
      </n-space>
    </div>
    
    <n-card class="mb-6">
      <n-grid :cols="24" :x-gap="16">
        <n-gi :span="6">
          <n-form-item label="Сканирование" :show-feedback="false">
             <n-input
                v-model:value="lastScannedCode"
                placeholder="Код товара или QR-код"
                size="large"
                @keyup.enter="handleScan"
                ref="scanInputRef"
              />
          </n-form-item>
        </n-gi>
        <n-gi :span="6">
          <n-form-item label="Поиск и добавление вручную" :show-feedback="false">
            <n-select
              v-model:value="manualItemToAdd"
              placeholder="Введите название или артикул..."
              :options="allInventoryOptions"
              filterable
              clearable
              size="large"
              @update:value="handleManualAdd"
            />
          </n-form-item>
        </n-gi>
        <n-gi :span="4">
          <n-form-item label="Заказ (необязательно)" :show-feedback="false">
            <n-select
              v-model:value="selectedOrderNumber"
              placeholder="№ заказа"
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
              <n-tab-pane name="receive" tab="Приход" />
              <n-tab-pane name="defect" tab="Брак" />
              <n-tab-pane name="write_off" tab="Списание" />
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

      <n-grid v-if="scanMode === 'receive'" :cols="24" :x-gap="16" class="mt-4">
        <n-gi :span="12">
          <n-alert type="info">В режиме <b>Приход</b> товары будут добавлены на основной склад. Проверьте цены закупки в таблице ниже.</n-alert>
        </n-gi>
      </n-grid>

      <n-grid v-if="scanMode === 'defect'" :cols="24" :x-gap="16" class="mt-4">
        <n-gi :span="12">
          <n-form-item label="Причина списания" :show-feedback="false">
            <n-input v-model:value="defectReason" placeholder="Укажите причину (например: скол, ошибка раскроя...)" size="large" />
          </n-form-item>
        </n-gi>
      </n-grid>

      <n-grid v-if="scanMode === 'write_off'" :cols="24" :x-gap="16" class="mt-4">
        <n-gi :span="12">
          <n-form-item label="Изделие для списания (необязательно)" :show-feedback="false">
            <n-select
              v-model:value="writeOffProduct"
              placeholder="Выберите изделие, на которое списывается материал..."
              :options="allInventoryOptions"
              filterable
              clearable
              size="large"
            />
          </n-form-item>
        </n-gi>
        <n-gi :span="12">
          <n-alert type="warning">В режиме <b>Списание</b> материалы будут безвозвратно списаны со склада.</n-alert>
        </n-gi>
      </n-grid>
    </n-card>

    <n-alert v-if="scanMode === 'defect'" type="warning" class="mb-6" title="Режим фиксации брака">
      Все отсканированные товары будут списаны со склада с пометкой о дефекте.
    </n-alert>

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
        <n-empty description="Отсканируйте товары или выберите их вручную из поиска" />
      </div>
    </n-card>

    <n-collapse default-expanded-names="history">
      <n-collapse-item title="История действий" name="history">
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
    <n-modal v-model:show="showConfirmModal" preset="dialog" 
      :type="scanMode === 'defect' || shipmentWarning ? 'warning' : 'info'"
      :title="confirmModalTitle"
      :content="confirmModalContent"
      positive-text="Подтвердить"
      negative-text="Отмена"
      @positive-click="processAction"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, onMounted, nextTick } from 'vue'
import { 
  TrashOutline
} from '@vicons/ionicons5'
import { 
  NInput, NButton, NIcon, NCard, NTabs, NTabPane, NAlert, 
  NDataTable, NInputNumber, NSpace, NTag, NEmpty, NList, NListItem, 
  NText, NH1, NSelect, NFormItem, NGrid, NGi, NModal, NCollapse, NCollapseItem,
  NRadioGroup, NRadioButton,
  useMessage,
  type InputInst,
  type DataTableColumns
} from 'naive-ui'
import { useUserStore } from '@/stores/user'
import { useInventoryStore } from '@/stores/inventory'
import { useOrdersStore } from '@/stores/orders'
import { useEmployeesStore } from '@/stores/employees'
import { useQRCodesStore } from '@/stores/qrCodes'
import type { InventoryItem, MaterialInvoice, MaterialInvoiceItem } from '@/types'

const scanMode = ref<'ship' | 'receive' | 'defect' | 'write_off'>('ship')
const destinationType = ref<'production' | 'client'>('production')
const defectReason = ref('')
const writeOffProduct = ref<string | null>(null)
const lastScannedCode = ref('')
const scanInputRef = ref<InputInst | null>(null)
const selectedOrderNumber = ref<string | null>(null)
const manualItemToAdd = ref<string | null>(null)
const showConfirmModal = ref(false)

const message = useMessage()
const inventoryStore = useInventoryStore()
const ordersStore = useOrdersStore()
const employeesStore = useEmployeesStore()
const userStore = useUserStore()
const qrStore = useQRCodesStore()

interface ScannedItem {
  scanId: string // Уникальный ID для строки в таблице
  id: string
  sku: string
  name: string
  quantity: number
  price: number
  unit: string
  originalItem?: InventoryItem
  qrCodeId?: string // Добавляем ID QR-кода
  isVirtual?: boolean // Флаг виртуального товара (например, из QR)
}

const scannedItems = ref<ScannedItem[]>([])
const scanHistory = ref<{ time: Date, code: string, resultMessage: string, resultType: 'success' | 'error' | 'warning' }[]>([])

const orderOptions = computed(() => ordersStore.orders.map(o => ({
  label: `Заказ ${o.orderNumber}`,
  value: o.orderNumber
})))

// Список всех товаров для ручного поиска
const allInventoryOptions = computed(() => inventoryStore.items.map(item => ({
  label: `${item.name} (${item.sku})`,
  value: item.id
})))

const submitButtonText = computed(() => {
  if (scanMode.value === 'receive') return 'Оформить приход'
  if (scanMode.value === 'defect') return 'Списать брак'
  if (scanMode.value === 'write_off') return 'Списать со склада'
  return 'Оформить выдачу'
})

const submitButtonType = computed(() => {
  if (scanMode.value === 'receive') return 'primary'
  if (scanMode.value === 'defect') return 'warning'
  if (scanMode.value === 'write_off') return 'error'
  return 'primary'
})

const confirmModalTitle = computed(() => {
  if (scanMode.value === 'receive') return 'Подтверждение прихода'
  if (scanMode.value === 'defect') return 'Подтверждение записи брака'
  if (scanMode.value === 'write_off') return 'Подтверждение списания материалов'
  if (shipmentWarning.value) return 'Предупреждение по заказу'
  return 'Подтверждение выдачи'
})

const shipmentWarning = computed(() => {
  const isClientShipment = scanMode.value === 'ship' && destinationType.value === 'client'
  if (!isClientShipment || !selectedOrderNumber.value) return null

  const order = ordersStore.orders.find(o => o.orderNumber === selectedOrderNumber.value)
  if (!order) return null

  // Находим все готовые изделия этого заказа на складе
  const orderItems = inventoryStore.items.filter(i => i.orderNumber === order.orderNumber && i.type === 'product')
  
  // Проверка по статусу или количеству
  const isOrderFullyReady = order.status === 'ready' || 
                           order.status === 'completed' || 
                           order.actualQuantity >= order.plannedQuantity;
                           
  const readyItemsInStock = orderItems.reduce((sum, item) => sum + (item.currentStock || 0), 0)
  const shippingItemsCount = scannedItems.value.reduce((sum, item) => sum + (item.quantity || 0), 0)

  if (shippingItemsCount < readyItemsInStock) {
     if (!isOrderFullyReady) {
       return `Не вся готовая продукция по заказу ${order.orderNumber} отгружена`
     } else {
       return `Вы забрали не все изделия к заказу ${order.orderNumber}`
     }
  } 
  else if (!isOrderFullyReady && shippingItemsCount === readyItemsInStock) {
    return `Заказ ${order.orderNumber} выполнен не полностью, все готовые изделия отгружены`
  }
  return null
})

const confirmModalContent = computed(() => {
  if (scanMode.value === 'receive') return 'Добавить указанные товары на склад?'
  if (scanMode.value === 'defect') return 'Вы уверены, что хотите списать эти товары как брак? Это действие уменьшит остатки безвозвратно.'
  if (scanMode.value === 'write_off') {
    const productName = writeOffProduct.value 
      ? inventoryStore.items.find(i => i.id === writeOffProduct.value)?.name 
      : null
    return `Списать выбранные материалы${productName ? ' для изделия "' + productName + '"' : ''}?`
  }
  
  if (shipmentWarning.value) {
    return `${shipmentWarning.value}. Вы уверены, что хотите продолжить отгрузку?`
  }
  
  return 'Вы уверены, что хотите оформить накладную? Это спишет указанные товары со склада.'
})

const addItemToScanned = (foundItem: InventoryItem, method: 'scan' | 'manual', qrId?: string) => {
  const existing = scannedItems.value.find(si => si.id === foundItem.id && (!qrId || si.qrCodeId === qrId))
  if (existing) {
    existing.quantity++
  } else {
    scannedItems.value.push({
      scanId: Math.random().toString(36).substring(2, 9), // Генерируем уникальный ID для строки
      id: foundItem.id,
      sku: foundItem.sku,
      name: foundItem.name,
      quantity: 1,
      price: foundItem.purchasePrice || 0,
      unit: foundItem.unit,
      originalItem: foundItem,
      qrCodeId: qrId
    })
  }
  
  scanHistory.value.unshift({
    time: new Date(),
    code: foundItem.sku,
    resultMessage: `${method === 'manual' ? 'Добавлено вручную:' : 'Отсканировано:'} ${foundItem.name}`,
    resultType: 'success'
  })
  message.success(`Добавлено: ${foundItem.name}`)
}

const handleScan = () => {
  const code = lastScannedCode.value.trim()
  if (!code) return

  // 1. Быстрый поиск через индексы Map O(1)
  let foundItem = inventoryStore.itemsMap.get(code)
  
  // 2. Если не нашли в основном справочнике, ищем в базе QR-кодов
  if (!foundItem) {
    const qrCode = qrStore.qrCodesMap.get(code)
    
    if (qrCode) {
      // Пытаемся найти товар, к которому привязан QR
      foundItem = inventoryStore.itemsMap.get(qrCode.productId)
      
      // Если это изделие, которого еще нет в справочнике (виртуальный товар)
      if (!foundItem) {
        foundItem = {
          id: qrCode.productId,
          sku: qrCode.label?.info || qrCode.productName,
          name: qrCode.productName,
          unit: 'шт',
          purchasePrice: 0,
          averagePrice: 0,
          lastPurchasePrice: 0,
          totalValue: 0,
          currentStock: 0,
          isVirtual: true,
          category: 'Готовая продукция',
          categoryId: '99',
          minStock: 0,
          maxStock: 0,
          reserved: 0,
          available: 0,
          location: 'Virtual',
          mainSupplier: 'Внутреннее производство',
          alternativeSuppliers: [],
          deliveryTime: 0,
          minOrderQuantity: 0,
          totalConsumed: 0,
          popularity: 0,
          status: 'in_stock'
        }
      }

      // Авто-выбор заказа
      if (qrCode.orderNumber) {
        selectedOrderNumber.value = qrCode.orderNumber
      }
    }
  }
  
  if (foundItem) {
    // Определяем, был ли это QR-код из заказа
    const qrCode = qrStore.qrCodesMap.get(code)
    addItemToScanned(foundItem, 'scan', qrCode?.id)
  } else {
    // ... существующая логика ошибки ...
    scanHistory.value.unshift({
      time: new Date(),
      code: code,
      resultMessage: 'Товар не найден',
      resultType: 'error'
    })
    message.error(`Код "${code}" не найден в базе данных`)
  }

  lastScannedCode.value = ''
  nextTick(() => {
    // Пытаемся сфокусироваться через ref
    if (scanInputRef.value) {
      scanInputRef.value.focus()
    } else {
      const inputEl = document.querySelector('.scan-page .n-input__input-el') as HTMLInputElement
      if (inputEl) inputEl.focus()
    }
  })
}

const handleManualAdd = (itemId: string | null) => {
  if (!itemId) return
  const foundItem = inventoryStore.itemsMap.get(itemId) // Используем Map
  if (foundItem) {
    addItemToScanned(foundItem, 'manual')
    manualItemToAdd.value = null // Сброс селекта
  }
}

const removeItem = (scanId: string) => {
  scannedItems.value = scannedItems.value.filter(item => item.scanId !== scanId)
}

const clearSession = (isSuccess = false) => {
  scannedItems.value = []
  // Не очищаем историю сканирований сразу после успеха, чтобы пользователь видел результат
  if (!isSuccess) {
    scanHistory.value = []
  }
  selectedOrderNumber.value = null
  defectReason.value = ''
  manualItemToAdd.value = null
}

const processAction = () => {
  if (scanMode.value === 'receive') {
    scannedItems.value.forEach(item => {
      // 1. Проверяем, существует ли товар в инвентаре через индекс Map
      const existingItem = inventoryStore.itemsMap.get(item.id)
      
      if (!existingItem) {
        const catObj = inventoryStore.categories.find(c => String(c.id) === '99')
        
        const newItem: InventoryItem = {
          ...item,
          id: item.id, // Используем UUID продукта
          categoryId: '99',
          category: catObj ? catObj.name : 'Готовая продукция',
          type: 'product', // Явно указываем, что это готовый продукт
          description: 'Автоматически создано при сканировании QR-кода готовой продукции',
          currentStock: 0,
          reserved: 0,
          minStock: 0,
          maxStock: 0,
          averagePrice: 0,
          purchasePrice: 0,
          lastPurchasePrice: 0,
          deliveryTime: 0,
          minOrderQuantity: 1,
          location: 'A1-READY',
          mainSupplier: 'Производство',
          barcode: item.sku,
          orderNumber: selectedOrderNumber.value || undefined, // Привязываем к заказу
          available: 0,
          totalValue: 0,
          status: 'in_stock',
          alternativeSuppliers: [],
          totalConsumed: 0,
          popularity: 5,
          createdAt: new Date(),
          updatedAt: new Date()
        }
        
        // Напрямую пушим в стор
        inventoryStore.items.push(newItem)
      }

      // 2. Обновляем остатки в инвентаре
      inventoryStore.updateStock(item.id, item.quantity || 0, 'incoming', {
        id: Math.random().toString(36).substring(2, 9),
        itemId: item.id,
        type: 'incoming',
        quantity: item.quantity || 0,
        unitPrice: item.price || 0,
        totalPrice: (item.quantity || 0) * (item.price || 0),
        createdBy: userStore.user?.name || 'System',
        createdAt: new Date()
      })

      // 3. Если это было сканирование QR-кода заказа, обновляем его статус
      if (item.qrCodeId) {
        qrStore.updateQRCodeStatus(item.qrCodeId, 'scanned', userStore.user?.name)
        
        // Автоматически подставляем номер заказа из QR-кода, если он не выбран
        const qrCode = qrStore.qrCodesMap.get(item.qrCodeId)
        if (qrCode?.orderNumber && !selectedOrderNumber.value) {
          selectedOrderNumber.value = qrCode.orderNumber
        }

        // Обновляем ссылку на заказ в инвентаре, если она не установлена
        if (existingItem && !existingItem.orderNumber && qrCode?.orderNumber) {
          existingItem.orderNumber = qrCode.orderNumber
        }
      }
    })

    const historyItem: Omit<MaterialInvoice, 'id'> = {
      date: new Date(),
      orderNumber: selectedOrderNumber.value || ((scannedItems.value.length > 0 && scannedItems.value.some(i => i.qrCodeId)) ? 'ГОТОВАЯ ПРОДУКЦИЯ' : 'ПРИХОД'),
      destination: 'Склад готовой продукции',
      totalAmount: scannedItems.value.reduce((total, item) => total + ((item.quantity || 0) * (item.price || 0)), 0),
      items: scannedItems.value.map(item => ({
        productName: item.name,
        quantity: item.quantity || 0,
        unit: item.unit,
        article: item.sku,
        price: item.price || 0,
        scannedAt: new Date()
      })) as MaterialInvoiceItem[]
    }

    if (userStore.user?.id) {
      employeesStore.addMaterialHistory(userStore.user.id, historyItem as MaterialInvoice)
    } else {
      const admin = employeesStore.employees.find(e => e.role === 'admin')
      if (admin) {
        employeesStore.addMaterialHistory(admin.userId, historyItem as MaterialInvoice)
      }
    }

    message.success('Приход успешно оформлен')
  } else {
    // ВЫДАЧА / ОТГРУЗКА / СПИСАНИЕ / БРАК
    const isDefect = scanMode.value === 'defect'
    const isWriteOff = scanMode.value === 'write_off'
    
    scannedItems.value.forEach(item => {
      let type: 'outgoing' | 'write_off' = 'outgoing'
      if (isDefect || isWriteOff) {
        type = 'write_off'
      }

      inventoryStore.updateStock(item.id, item.quantity || 0, type, {
        id: Math.random().toString(36).substring(2, 9),
        itemId: item.id,
        type: type,
        quantity: item.quantity || 0,
        unitPrice: item.price || 0,
        totalPrice: (item.quantity || 0) * (item.price || 0),
        createdBy: userStore.user?.name || 'System',
        createdAt: new Date(),
        reason: isDefect ? defectReason.value : (isWriteOff ? 'Списание на изделие' : undefined)
      })

      // Если это было сканирование QR-кода заказа, обновляем его статус
      if (item.qrCodeId) {
        qrStore.updateQRCodeStatus(item.qrCodeId, (isDefect || isWriteOff) ? 'generated' : 'shipped', userStore.user?.name)
      }
    })
    
    if (selectedOrderNumber.value || isDefect || isWriteOff || !isDefect) {
      let destination = destinationType.value === 'production' ? 'Производство' : 'Клиент'
      if (isDefect) destination = 'Брак'
      if (isWriteOff) {
        const product = inventoryStore.items.find(i => i.id === writeOffProduct.value)
        destination = product ? `Списание: ${product.name}` : 'Списание (Общее)'
      }

      const historyItem: Omit<MaterialInvoice, 'id'> = {
        date: new Date(),
        orderNumber: selectedOrderNumber.value || (isDefect ? 'БРАК' : (isWriteOff ? 'СПИСАНИЕ' : 'БЕЗ НОМЕРА')),
        destination: destination,
        totalAmount: scannedItems.value.reduce((total, item) => total + ((item.quantity || 0) * (item.price || 0)), 0),
        items: scannedItems.value.map(item => ({
          productName: item.name,
          quantity: item.quantity || 0,
          unit: item.unit,
          article: item.sku,
          price: item.price || 0,
          scannedAt: new Date()
        })) as MaterialInvoiceItem[]
      }

      if (userStore.user?.id) {
        employeesStore.addMaterialHistory(userStore.user.id, historyItem as MaterialInvoice)
      } else {
        const admin = employeesStore.employees.find(e => e.role === 'admin')
        if (admin) {
          employeesStore.addMaterialHistory(admin.userId, historyItem as MaterialInvoice)
        }
      }
    }

    if (isDefect) {
      message.warning(`Списано ${scannedItems.value.length} позиций брака.`)
    } else if (isWriteOff) {
      message.success(`Материалы успешно списаны.`)
    } else {
      message.success('Выдача успешно оформлена')
    }
  }
  
  clearSession(true)
  showConfirmModal.value = false
}

const columns = computed(() => {
  const baseColumns: DataTableColumns<ScannedItem> = [
    { title: 'Артикул', key: 'sku', width: 120, fixed: 'left' },
    { title: 'Наименование', key: 'name', minWidth: 200 },
    { 
      title: 'Кол-во', 
      key: 'quantity', 
      width: 130,
      render(row: ScannedItem) {
        return h(NInputNumber, {
          value: row.quantity,
          min: 1,
          size: 'small',
          'onUpdate:value': (v: number | null) => {
            if (v !== null) row.quantity = v
          }
        })
      }
    }
  ]

  // Добавляем колонку цены только для режима прихода
  if (scanMode.value === 'receive') {
    baseColumns.push({
      title: 'Цена закупки (₽)',
      key: 'price',
      width: 150,
      render(row: ScannedItem) {
        return h(NInputNumber, {
          value: row.price,
          min: 0,
          size: 'small',
          precision: 2,
          'onUpdate:value': (v: number | null) => {
            if (v !== null) row.price = v
          }
        })
      }
    })
  }

  baseColumns.push(
    { 
      title: 'Ед.', 
      key: 'unit', 
      width: 60,
      render: (row: ScannedItem) => row.unit
    },
    {
      title: 'Действие',
      key: 'actions',
      width: 60,
      render(row: ScannedItem) {
        return h(NButton, {
          quaternary: true,
          circle: true,
          size: 'small',
          type: 'error',
          onClick: () => removeItem(row.scanId) // Используем scanId для удаления
        }, { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) })
      }
    }
  )

  return baseColumns as DataTableColumns<ScannedItem>
})

onMounted(() => {
  nextTick(() => scanInputRef.value?.focus())
})
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
