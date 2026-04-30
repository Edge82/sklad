<template>
  <component
    :is="isEmbed ? 'div' : NModal"
    v-bind="containerProps"
    @update:show="$emit('update:show', $event)"
  >
    <div :class="isEmbed ? '' : 'p-2'">
      <div class="flex flex-col gap-4">
      <!-- Связь с заказом -->
      <n-card size="small" title="Привязка к заказу (необязательно)" embedded>
        <n-grid :cols="2" :x-gap="12">
          <n-gi>
            <n-form-item label="Заказ">
              <n-select 
                v-model:value="documentData.orderId" 
                :options="orderOptions" 
                placeholder="Выберите заказ" 
                clearable 
                filterable
              />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="Изделие в заказе">
              <n-select 
                v-model:value="documentData.orderItemId" 
                :options="orderItemOptions" 
                placeholder="Выберите изделие" 
                :disabled="!documentData.orderId"
                clearable
                filterable
              />
            </n-form-item>
          </n-gi>
        </n-grid>
      </n-card>

      <n-card size="small" title="Данные документа" embedded>
        <n-grid :cols="3" :x-gap="12">
          <n-gi>
            <n-form-item label="Дата создания">
              <n-date-picker v-model:value="creationDate" type="date" placeholder="Дата создания" />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="Операция">
              <n-select
                v-model:value="documentData.operationKey"
                :options="operationOptions"
                placeholder="Выберите операцию"
                clearable
                filterable
              />
            </n-form-item>
          </n-gi>
          <n-gi v-if="isExpenseOperation">
            <n-form-item label="Счет затрат">
              <n-select
                v-model:value="documentData.expenseAccountKey"
                :options="expenseAccountOptions"
                placeholder="Выберите счет затрат"
                clearable
                filterable
                :disabled="expenseAccountOptions.length === 0"
              />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="Склад отправителя">
              <n-select
                v-model:value="documentData.sourceWarehouseKey"
                :options="sourceWarehouseOptions"
                placeholder="Выберите склад отправителя"
                clearable
                filterable
              />
            </n-form-item>
          </n-gi>
          <n-gi>
            <n-form-item label="Склад получателя">
              <n-select
                v-model:value="documentData.destinationWarehouseKey"
                :options="destinationWarehouseOptions"
                placeholder="Выберите склад получателя"
                clearable
                filterable
              />
            </n-form-item>
          </n-gi>
        </n-grid>
      </n-card>

      <!-- Таблица материалов -->
      <n-card size="small" title="Список материалов к перемещению" embedded>
        <n-table size="small" :bordered="false" :single-line="false">
          <thead>
            <tr>
              <th width="40%">Материал</th>
              <th width="20%">Количество</th>
              <th width="20%">Цена</th>
              <th width="10%"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, index) in rows" :key="index">
              <td>
                <n-select
                  v-model:value="row.itemId"
                  :options="itemOptions"
                  placeholder="Выберите материал"
                  filterable
                  @update:value="(val) => handleItemChange(index, val)"
                />
              </td>
              <td>
                <n-input-number
                  v-model:value="row.quantity"
                  :min="0.001"
                  :precision="3"
                  placeholder="0.000"
                  :show-button="false"
                />
              </td>
              <td>
                <n-input-number
                  v-model:value="row.price"
                  :precision="2"
                  :show-button="false"
                  :disabled="true"
                />
              </td>
              <td class="text-right">
                <n-button quaternary circle type="error" @click="removeRow(index)" :disabled="rows.length === 1">
                  <template #icon><n-icon><TrashOutline /></n-icon></template>
                </n-button>
              </td>
            </tr>
          </tbody>
        </n-table>
        <div class="mt-4">
          <n-button dashed block @click="addRow">
            <template #icon><n-icon><AddOutline /></n-icon></template>
            Добавить строку
          </n-button>
        </div>
      </n-card>

      <!-- Итоги -->
      <div class="flex justify-between items-center p-4 bg-gray-800/50 rounded-lg">
        <div class="flex gap-8">
          <div>
            <n-text depth="3" class="text-xs uppercase font-bold">Всего позиций</n-text>
            <div class="text-xl font-bold">{{ rows.length }}</div>
          </div>
          <div>
            <n-text depth="3" class="text-xs uppercase font-bold">Общее количество</n-text>
            <div class="text-xl font-bold">{{ totalQuantity.toFixed(2) }}</div>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-3 mt-4">
        <n-button v-if="!isEmbed" @click="$emit('update:show', false)">Отмена</n-button>
        <n-button type="error" size="large" @click="handleSubmit" :loading="loading" :disabled="!isFormValid">
          Переместить товар
        </n-button>
      </div>
    </div>
  </div>
  </component>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { useOrdersStore } from '@/stores/orders'
import { useIntegrationStore } from '@/stores/integration'
import { useStockBalances } from '@/composables/useStockBalances'
import { useMessage } from 'naive-ui'
import {
  NModal, NCard, NTable, 
  NInputNumber, NButton, NIcon, NText, NSelect,
  NGrid, NGi, NFormItem, NDatePicker
} from 'naive-ui'
import { AddOutline, TrashOutline } from '@vicons/ionicons5'

const props = withDefaults(defineProps<{
  show?: boolean
  title?: string
  mode?: 'material' | 'product'
  isEmbed?: boolean
}>(), {
  show: false,
  title: '',
  isEmbed: false
})

const emit = defineEmits<{
  'update:show': [value: boolean]
  submit: [data: any]
  close: []
}>()

const containerProps = computed(() => {
  if (props.isEmbed) return {}
  return {
    show: props.show,
    preset: 'card' as const,
    title: props.title,
    class: 'w-240!',
    bordered: false,
    size: 'huge' as const
  }
})

const inventoryStore = useInventoryStore()
const ordersStore = useOrdersStore()
const integrationStore = useIntegrationStore()
const stockBalances = useStockBalances()
const message = useMessage()
const loading = ref(false)
const sourceWarehouseOptions = ref<{ label: string; value: string }[]>([])
const destinationWarehouseOptions = ref<{ label: string; value: string }[]>([])
const operationOptions = ref<{ label: string; value: string }[]>([])
const organizationOptions = ref<{ label: string; value: string }[]>([])
const expenseAccountOptions = ref<{ label: string; value: string }[]>([])
const creationDate = ref<number>(Date.now())

const documentData = reactive({
  documentNumber: '',
  documentType: 'invoice' as any,
  orderId: null as string | null,
  orderItemId: null as string | null,
  sourceWarehouseKey: '' as string,
  destinationWarehouseKey: '' as string,
  operationKey: '' as string,
  organizationKey: '' as string,
  expenseAccountKey: '' as string,
  currencyKey: '' as string,
  includeVAT: null as boolean | null
})

const orderOptions = computed(() => {
  return ordersStore.orders.map(order => ({
    label: `${order.orderNumber} - ${order.customerName || 'Клиент'}`,
    value: order.id
  }))
})

const orderItemOptions = ref<{label: string, value: string}[]>([])

const isExpenseOperation = computed(() => {
  const selectedOperation = operationOptions.value.find(o => o.value === documentData.operationKey)
  const operationText = String(selectedOperation?.label || documentData.operationKey || '')
  return operationText.toLowerCase().includes('списание')
})

onMounted(async () => {
  try {
    const [transferWarehouses, operations, organizations, expenseAccounts, defaults] = await Promise.all([
      stockBalances.fetchTransferWarehouses(),
      stockBalances.fetchOperationTypes(),
      stockBalances.fetchOrganizations(),
      stockBalances.fetchExpenseAccounts(),
      stockBalances.fetchTransferDocumentDefaults()
    ])

    sourceWarehouseOptions.value = transferWarehouses.sourceWarehouses.map(w => ({ label: w.name, value: w.id }))
    destinationWarehouseOptions.value = transferWarehouses.destinationWarehouses.map(w => ({ label: w.name, value: w.id }))

    console.log('DEBUG: transferWarehouses:', transferWarehouses)
    console.log('DEBUG: sourceWarehouseOptions:', sourceWarehouseOptions.value)
    console.log('DEBUG: destinationWarehouseOptions:', destinationWarehouseOptions.value)

    operationOptions.value = operations.map(o => ({ label: o.name, value: o.id }))
    organizationOptions.value = organizations.map(o => ({ label: o.name, value: o.id }))
    expenseAccountOptions.value = expenseAccounts.map(e => ({ label: e.name, value: e.id }))

    documentData.expenseAccountKey = defaults.expenseAccountKey || expenseAccountOptions.value[0]?.value || ''
    documentData.currencyKey = defaults.currencyKey || ''
    documentData.includeVAT = defaults.includeVAT ?? null

    const defaultSourceWarehouseKey = defaults.sourceWarehouseKey || ''
    const defaultDestinationWarehouseKey = defaults.destinationWarehouseKey || ''

    documentData.sourceWarehouseKey = defaultSourceWarehouseKey || sourceWarehouseOptions.value[0]?.value || ''
    documentData.destinationWarehouseKey = defaultDestinationWarehouseKey || destinationWarehouseOptions.value[0]?.value || documentData.sourceWarehouseKey

    if (operationOptions.value.length > 0) {
      const moveOperation = operationOptions.value.find(o => o.label === 'Перемещение' || o.value === 'Перемещение')
      documentData.operationKey = moveOperation?.value || operationOptions.value[0].value
    }
    if (organizationOptions.value.length > 0) {
      documentData.organizationKey = organizationOptions.value[0].value
    }
    creationDate.value = Date.now()
  } catch (err) {
    console.error('Ошибка загрузки данных из 1С:', err)
  }
})

// Загрузка изделий при выборе заказа
watch(() => documentData.orderId, async (newOrderId) => {
  documentData.orderItemId = null
  orderItemOptions.value = []
  
  if (newOrderId) {
    const order = ordersStore.orders.find(o => o.id === newOrderId)
    // Если в заказе нет позиций (могли не загрузиться при общей синхронизации), догружаем их
    if (order && (!order.items || order.items.length === 0)) {
      try {
        await integrationStore.syncOrderDetails(newOrderId)
      } catch (err) {
        console.error('Ошибка загрузки деталей заказа:', err)
      }
    }
    
    // После (возможной) дозагрузки обновляем список опций
    const updatedOrder = ordersStore.orders.find(o => o.id === newOrderId)
    if (updatedOrder && updatedOrder.items) {
      orderItemOptions.value = updatedOrder.items.map(item => ({
        label: item.productName,
        value: item.id
      }))
    }
  }
})

interface IssueRow {
  itemId: string | null
  quantity: number
  price: number
  unitId?: string | null
}

const rows = ref<IssueRow[]>([
  { itemId: null, quantity: 1, price: 0, unitId: null }
])

const itemOptions = computed(() => {
  let items = inventoryStore.items
  if (props.mode === 'product') {
    items = items.filter(i => i.type === 'product')
  } else {
    items = items.filter(i => i.type !== 'product')
  }
  return items.map(item => {
    const labelBase = item.sku ? `${item.name} (${item.sku})` : item.name;
    return {
      label: `${labelBase} [Остаток: ${item.currentStock}]`,
      value: item.id,
      disabled: item.currentStock <= 0
    }
  })
})

// При расходе цена обычно не вводится вручную (списывается по средней или FIFO в 1С)
const handleItemChange = async (index: number, itemId: string) => {
  const item = inventoryStore.items.find(i => i.id === itemId)
  if (item) {
    let price = Number(item.averagePrice || item.purchasePrice || item.lastPurchasePrice || 0)
    if (price === 0) {
      price = await stockBalances.fetchLatestItemPrice(item.id)
    }
    rows.value[index].price = price
    rows.value[index].unitId = item.unitId || null
    if ((item.currentStock || 0) < rows.value[index].quantity) {
      message.warning(`Внимание: остаток ${item.name} составляет ${item.currentStock}`)
    }
  } else {
    rows.value[index].price = 0
    rows.value[index].unitId = null
  }
}

const addRow = () => {
  rows.value.push({ itemId: null, quantity: 1, price: 0, unitId: null })
}

const removeRow = (index: number) => {
  if (rows.value.length > 1) {
    rows.value.splice(index, 1)
  }
}

const totalQuantity = computed(() => rows.value.reduce((sum, row) => sum + (row.quantity || 0), 0))

const isFormValid = computed(() => {
  const rowsValid = rows.value.every(row => {
    if (!row.itemId || row.quantity <= 0) return false
    const item = inventoryStore.items.find(i => i.id === row.itemId)
    return item && (item.currentStock || 0) >= row.quantity
  })

  return rowsValid
    && Boolean(documentData.organizationKey)
    && Boolean(documentData.sourceWarehouseKey)
    && Boolean(documentData.destinationWarehouseKey)
    && (!isExpenseOperation.value || Boolean(documentData.expenseAccountKey))
})

const handleSubmit = async () => {
  loading.value = true
  try {
    const rowsToSend = rows.value.filter(row => row.itemId && row.quantity > 0)
    if (rowsToSend.length === 0) {
      message.warning('Добавьте хотя бы одну строку материала')
      return
    }

    const transferItems = await Promise.all(rowsToSend.map(async row => {
      const item = inventoryStore.items.find(i => i.id === row.itemId)
      let price = Number(row.price || item?.averagePrice || item?.purchasePrice || item?.lastPurchasePrice || 0)
      if (price === 0 && row.itemId) {
        const fetchedPrice = await stockBalances.fetchLatestItemPrice(row.itemId)
        if (fetchedPrice > 0) {
          price = fetchedPrice
          row.price = fetchedPrice
        }
      }
      const quantity = Number(row.quantity)
      return {
        Номенклатура_Key: row.itemId as string,
        Количество: quantity,
        Цена: price,
        Сумма: Number((price * quantity).toFixed(2)),
        ЕдиницаИзмерения: row.unitId || item?.unitId || null
      }
    }))

    const creationDateValue = creationDate.value ? new Date(creationDate.value) : new Date()
    const selectedOperation = operationOptions.value.find(o => o.value === documentData.operationKey)
    const operationType = selectedOperation?.label

    await integrationStore.createMaterialTransferDocument({
      creationDate: creationDateValue,
      organizationKey: documentData.organizationKey || undefined,
      sourceWarehouseKey: documentData.sourceWarehouseKey || undefined,
      destinationWarehouseKey: documentData.destinationWarehouseKey || undefined,
      operationKey: documentData.operationKey || undefined,
      operationType: operationType || undefined,
      currencyKey: documentData.currencyKey || undefined,
      expenseAccountKey: isExpenseOperation.value ? documentData.expenseAccountKey || undefined : undefined,
      includeVAT: documentData.includeVAT === null ? undefined : documentData.includeVAT,
      items: transferItems
    })

    message.success('Документ перемещения отправлен в 1С')
    if (props.isEmbed) {
      emit('close')
    } else {
      emit('update:show', false)
    }
    // Сброс формы
    rows.value = [{ itemId: null, quantity: 1, price: 0 }]
    documentData.documentNumber = ''
    documentData.documentType = ''
    documentData.orderId = null
    documentData.orderItemId = null
    creationDate.value = Date.now()
  } catch (err: any) {
    message.error(err?.message || 'Ошибка при отправке документа в 1С')
  } finally {
    loading.value = false
  }
}

watch(() => props.show, (newVal) => {
  if (newVal && !props.isEmbed) {
    rows.value = [{ itemId: null, quantity: 1, price: 0 }]
    documentData.orderId = null
    documentData.orderItemId = null
    creationDate.value = Date.now()
    if (operationOptions.value.length > 0) {
      const moveOperation = operationOptions.value.find(o => o.label === 'Перемещение' || o.value === 'Перемещение')
      documentData.operationKey = moveOperation?.value || operationOptions.value[0].value
    }
    if (organizationOptions.value.length > 0) {
      documentData.organizationKey = organizationOptions.value[0].value
    }
  }
})
</script>
