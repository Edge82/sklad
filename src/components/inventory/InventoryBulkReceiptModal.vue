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

      <!-- Таблица материалов -->
      <n-card size="small" title="Список материалов" embedded>
        <n-table size="small" :bordered="false" :single-line="false">
          <thead>
            <tr>
              <th width="40%">Материал</th>
              <th width="15%">Кол-во</th>
              <th width="15%">Цена</th>
              <th width="20%">Сумма</th>
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
                  v-model:value="row.unitPrice"
                  :min="0"
                  :precision="2"
                  placeholder="0.00"
                  :show-button="false"
                >
                  <template #suffix>₽</template>
                </n-input-number>
              </td>
              <td class="align-middle">
                <n-text strong>{{ formatCurrency((row.quantity || 0) * (row.unitPrice || 0)) }}</n-text>
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
        <div class="text-right">
          <n-text depth="3" class="text-xs uppercase font-bold text-green-500">Итоговая сумма</n-text>
          <div class="text-3xl font-bold text-green-500">{{ formatCurrency(totalAmountSum) }}</div>
        </div>
      </div>

      <div class="flex justify-end gap-3 mt-4">
        <n-button v-if="!isEmbed" @click="$emit('update:show', false)">Отмена</n-button>
        <n-button type="primary" size="large" @click="handleSubmit" :loading="loading" :disabled="!isFormValid">
          Провести
        </n-button>
      </div>
    </div>
  </div>
  </component>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { useOrdersStore } from '@/stores/orders'
import { useIntegrationStore } from '@/stores/integration'
import { useMessage } from 'naive-ui'
import {
  NModal, NCard, NTable, 
  NInputNumber, NButton, NIcon, NText, NSelect,
  NGrid, NGi, NFormItem
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
const message = useMessage()
const loading = ref(false)

const documentData = reactive({
  documentNumber: '',
  documentType: 'invoice' as any,
  reason: 'Приход ТМЦ',
  orderId: null as string | null,
  orderItemId: null as string | null
})

const orderOptions = computed(() => {
  return ordersStore.orders.map(order => ({
    label: `${order.orderNumber} - ${order.customerName || 'Клиент'}`,
    value: order.id
  }))
})

const orderItemOptions = ref<{label: string, value: string}[]>([])

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

interface ReceiptRow {
  itemId: string | null
  quantity: number
  unitPrice: number
}

const rows = ref<ReceiptRow[]>([
  { itemId: null, quantity: 1, unitPrice: 0 }
])

const itemOptions = computed(() => {
  let items = inventoryStore.items
  if (props.mode === 'product') {
    items = items.filter(i => i.type === 'product')
  } else {
    items = items.filter(i => i.type !== 'product')
  }
  return items.map(item => ({
    label: item.sku ? `${item.name} (${item.sku})` : item.name,
    value: item.id
  }))
})

const handleItemChange = (index: number, itemId: string) => {
  const item = inventoryStore.items.find(i => i.id === itemId)
  if (item) {
    rows.value[index].unitPrice = item.purchasePrice || 0
  }
}

const addRow = () => {
  rows.value.push({ itemId: null, quantity: 1, unitPrice: 0 })
}

const removeRow = (index: number) => {
  if (rows.value.length > 1) {
    rows.value.splice(index, 1)
  }
}

const totalQuantity = computed(() => rows.value.reduce((sum, row) => sum + (row.quantity || 0), 0))
const totalAmountSum = computed(() => rows.value.reduce((sum, row) => sum + (row.quantity || 0) * (row.unitPrice || 0), 0))

const isFormValid = computed(() => {
  return rows.value.every(row => row.itemId && row.quantity > 0)
})

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0
  }).format(amount)
}

const handleSubmit = async () => {
  loading.value = true
  try {
    for (const row of rows.value) {
      if (!row.itemId) continue
      
      emit('submit', {
        itemId: row.itemId,
        quantity: row.quantity,
        type: 'incoming',
        unitPrice: row.unitPrice,
        documentNumber: documentData.documentNumber,
        documentType: documentData.documentType,
        reason: documentData.reason,
        orderId: documentData.orderId,
        orderItemId: documentData.orderItemId,
        newStatus: 'in_stock'
      })
    }
    if (props.isEmbed) {
      emit('close')
    } else {
      emit('update:show', false)
    }
    // Сброс формы
    rows.value = [{ itemId: null, quantity: 1, unitPrice: 0 }]
    documentData.documentNumber = ''
    documentData.orderId = null
    documentData.orderItemId = null
  } catch (err) {
    message.error('Ошибка при сохранении прихода')
  } finally {
    loading.value = false
  }
}

watch(() => props.show, (newVal) => {
  if (newVal && !props.isEmbed) {
    rows.value = [{ itemId: null, quantity: 1, unitPrice: 0 }]
    documentData.documentNumber = ''
    documentData.orderId = null
    documentData.orderItemId = null
  }
})
</script>
