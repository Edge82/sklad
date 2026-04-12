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
      <n-card size="small" title="Список материалов к списанию" embedded>
        <n-table size="small" :bordered="false" :single-line="false">
          <thead>
            <tr>
              <th width="50%">Материал</th>
              <th width="30%">Количество</th>
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
          Списать материалы
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
  reason: 'Расход ТМЦ',
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

interface IssueRow {
  itemId: string | null
  quantity: number
}

const rows = ref<IssueRow[]>([
  { itemId: null, quantity: 1 }
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
const handleItemChange = (index: number, itemId: string) => {
  const item = inventoryStore.items.find(i => i.id === itemId)
  if (item && (item.currentStock || 0) < rows.value[index].quantity) {
    message.warning(`Внимание: остаток ${item.name} составляет ${item.currentStock}`)
  }
}

const addRow = () => {
  rows.value.push({ itemId: null, quantity: 1 })
}

const removeRow = (index: number) => {
  if (rows.value.length > 1) {
    rows.value.splice(index, 1)
  }
}

const totalQuantity = computed(() => rows.value.reduce((sum, row) => sum + (row.quantity || 0), 0))

const isFormValid = computed(() => {
  return rows.value.every(row => {
    if (!row.itemId || row.quantity <= 0) return false
    const item = inventoryStore.items.find(i => i.id === row.itemId)
    return item && (item.currentStock || 0) >= row.quantity
  })
})

const handleSubmit = async () => {
  loading.value = true
  try {
    for (const row of rows.value) {
      if (!row.itemId) continue
      
      emit('submit', {
        itemId: row.itemId,
        quantity: row.quantity,
        type: 'outgoing',
        reason: documentData.reason,
        orderId: documentData.orderId,
        orderItemId: documentData.orderItemId,
        newStatus: 'in_work'
      })
    }
    if (props.isEmbed) {
      emit('close')
    } else {
      emit('update:show', false)
    }
    // Сброс формы
    rows.value = [{ itemId: null, quantity: 1 }]
    documentData.orderId = null
    documentData.orderItemId = null
  } catch (err) {
    message.error('Ошибка при сохранении расхода')
  } finally {
    loading.value = false
  }
}

watch(() => props.show, (newVal) => {
  if (newVal && !props.isEmbed) {
    rows.value = [{ itemId: null, quantity: 1 }]
    documentData.orderId = null
    documentData.orderItemId = null
  }
})
</script>
