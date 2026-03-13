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
              <n-tab-pane name="receive" tab="Приёмка / Приход" />
              <n-tab-pane name="defect" tab="Брак / Списание" />
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
          <n-alert type="info">В режиме <b>Приёмка</b> товары будут добавлены на основной склад. Проверьте цены закупки в таблице ниже.</n-alert>
        </n-gi>
      </n-grid>

      <n-grid v-if="scanMode === 'defect'" :cols="24" :x-gap="16" class="mt-4">
        <n-gi :span="12">
          <n-form-item label="Причина списания" :show-feedback="false">
            <n-input v-model:value="defectReason" placeholder="Укажите причину (например: скол, ошибка раскроя...)" size="large" />
          </n-form-item>
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
      :type="scanMode === 'defect' ? 'warning' : 'info'"
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
  useMessage
} from 'naive-ui'
import { useUserStore } from '@/stores/user'
import { useInventoryStore } from '@/stores/inventory'
import { useOrdersStore } from '@/stores/orders'
import { useEmployeesStore } from '@/stores/employees'
import type { InventoryItem, MaterialInvoice, MaterialInvoiceItem } from '@/types'

const scanMode = ref<'ship' | 'receive' | 'defect'>('ship')
const destinationType = ref<'production' | 'client'>('production')
const defectReason = ref('')
const lastScannedCode = ref('')
const scanInputRef = ref<HTMLInputElement | null>(null)
const selectedOrderNumber = ref<string | null>(null)
const manualItemToAdd = ref<string | null>(null)
const showConfirmModal = ref(false)

const message = useMessage()
const inventoryStore = useInventoryStore()
const ordersStore = useOrdersStore()
const employeesStore = useEmployeesStore()
const userStore = useUserStore()

interface ScannedItem {
  id: string
  sku: string
  name: string
  quantity: number
  price: number
  unit: string
  originalItem?: InventoryItem
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
  return 'Оформить выдачу'
})

const submitButtonType = computed(() => {
  if (scanMode.value === 'receive') return 'primary'
  if (scanMode.value === 'defect') return 'warning'
  return 'primary'
})

const confirmModalTitle = computed(() => {
  if (scanMode.value === 'receive') return 'Подтверждение приемки'
  if (scanMode.value === 'defect') return 'Списание бракованного товара'
  return 'Подтверждение выдачи'
})

const confirmModalContent = computed(() => {
  if (scanMode.value === 'receive') return 'Добавить указанные товары на склад?'
  if (scanMode.value === 'defect') return 'Вы уверены, что хотите списать эти товары как брак? Это действие уменьшит остатки безвозвратно.'
  return 'Вы уверены, что хотите оформить накладную? Это спишет указанные товары со склада.'
})

const addItemToScanned = (foundItem: InventoryItem, method: 'scan' | 'manual') => {
  const existing = scannedItems.value.find(si => si.id === foundItem.id)
  if (existing) {
    existing.quantity++
  } else {
    scannedItems.value.push({
      id: foundItem.id,
      sku: foundItem.sku,
      name: foundItem.name,
      quantity: 1,
      price: (foundItem as any).purchasePrice || (foundItem as any).price || 0,
      unit: foundItem.unit,
      originalItem: foundItem
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

  const foundItem = inventoryStore.items.find(item => item.sku === code || item.id === code)
  
  if (foundItem) {
    addItemToScanned(foundItem, 'scan')
  } else {
    scanHistory.value.unshift({
      time: new Date(),
      code: code,
      resultMessage: 'Товар не найден',
      resultType: 'error'
    })
    message.error('Товар не найден в базе данных')
  }

  lastScannedCode.value = ''
  nextTick(() => scanInputRef.value?.focus())
}

const handleManualAdd = (itemId: string | null) => {
  if (!itemId) return
  const foundItem = inventoryStore.items.find(item => item.id === itemId)
  if (foundItem) {
    addItemToScanned(foundItem, 'manual')
    manualItemToAdd.value = null // Сброс селекта
  }
}

const removeItem = (id: string) => {
  scannedItems.value = scannedItems.value.filter(item => item.id !== id)
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
      inventoryStore.updateStock(item.id, item.quantity, 'incoming', {
        unitPrice: item.price,
        createdAt: new Date()
      } as any)
    })

    const historyItem: Omit<MaterialInvoice, 'id'> = {
      date: new Date(),
      orderNumber: 'ПРИХОД',
      destination: 'Склад',
      totalAmount: scannedItems.value.reduce((total, item) => total + (item.quantity * item.price), 0),
      items: scannedItems.value.map(item => ({
        productName: item.name,
        quantity: item.quantity,
        unit: item.unit,
        article: item.sku,
        price: item.price,
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
    const isDefect = scanMode.value === 'defect'
    
    scannedItems.value.forEach(item => {
      inventoryStore.updateStock(item.id, item.quantity, isDefect ? 'write_off' : 'outgoing', {
        createdAt: new Date()
      } as any)
    })
    
    if (selectedOrderNumber.value || isDefect || !isDefect) {
      const historyItem: Omit<MaterialInvoice, 'id'> = {
        date: new Date(),
        orderNumber: selectedOrderNumber.value || (isDefect ? 'БРАК' : 'БЕЗ НОМЕРА'),
        destination: isDefect ? 'Брак' : (destinationType.value === 'production' ? 'Производство' : 'Клиент'),
        totalAmount: scannedItems.value.reduce((total, item) => total + (item.quantity * ((item.originalItem as any)?.purchasePrice || (item.originalItem as any)?.price || 0)), 0),
        items: scannedItems.value.map(item => ({
          productName: item.name,
          quantity: item.quantity,
          unit: item.unit,
          article: item.sku,
          price: (item.originalItem as any)?.purchasePrice || (item.originalItem as any)?.price || 0,
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
    } else {
      message.success('Выдача успешно оформлена')
    }
  }
  
  clearSession(true)
  showConfirmModal.value = false
}

const columns = computed(() => {
  const baseColumns: any[] = [
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
          onClick: () => removeItem(row.id)
        }, { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) })
      }
    }
  )

  return baseColumns
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
