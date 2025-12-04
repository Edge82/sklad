<template>
  <n-modal v-model:show="showModal" preset="card" :title="title" style="width: 600px" :bordered="false" size="huge">
    <n-form ref="formRef" :model="formData" :rules="rules" label-placement="top">
      <n-grid :cols="1" :x-gap="24">
        <!-- Выбор материала -->
        <n-gi>
          <n-form-item label="Материал" path="itemId" required>
            <n-select v-model:value="formData.itemId" :options="itemOptions" placeholder="Выберите материал" filterable
              @update:value="handleItemSelect" />
          </n-form-item>
        </n-gi>

        <!-- Информация о выбранном материале -->
        <n-gi v-if="selectedItem">
          <n-card size="small" class="mb-4">
            <div class="flex justify-between items-center">
              <div>
                <n-text strong>{{ selectedItem.name }}</n-text>
                <div class="text-sm text-gray-500">
                  Остаток: {{ selectedItem.currentStock }} {{ selectedItem.unit }} |
                  Доступно: {{ selectedItem.available }} {{ selectedItem.unit }}
                </div>
              </div>
              <n-tag :type="inventoryStore.getStatusColor(selectedItem.status)" size="small">
                {{ inventoryStore.getStatusLabel(selectedItem.status) }}
              </n-tag>
            </div>
          </n-card>
        </n-gi>

        <!-- Количество -->
        <n-gi>
          <n-form-item :label="quantityLabel" path="quantity" required>
            <n-input-number v-model:value="formData.quantity" :min="minQuantity" :max="maxQuantity"
              :precision="getPrecision(selectedItem?.unit)" placeholder="Введите количество" style="width: 100%" />
            <template #feedback>
              <div class="text-xs text-gray-500">
                {{ quantityHint }}
              </div>
            </template>
          </n-form-item>
        </n-gi>

        <!-- Цена (для прихода) -->
        <n-gi v-if="props.type === 'incoming'">
          <n-form-item label="Цена за единицу" path="unitPrice" required>
            <n-input-number v-model:value="formData.unitPrice" :min="0" :precision="2" placeholder="Введите цену"
              style="width: 100%">
              <template #suffix>₽</template>
            </n-input-number>
          </n-form-item>
        </n-gi>

        <!-- Документ -->
        <n-gi>
          <n-form-item label="Номер документа" path="documentNumber">
            <n-input v-model:value="formData.documentNumber" placeholder="Номер накладной или акта" />
          </n-form-item>
        </n-gi>

        <!-- Тип документа -->
        <n-gi>
          <n-form-item label="Тип документа" path="documentType">
            <n-select v-model:value="formData.documentType" :options="documentTypeOptions"
              placeholder="Выберите тип документа" />
          </n-form-item>
        </n-gi>

        <!-- Причина/основание -->
        <n-gi>
          <n-form-item :label="reasonLabel" path="reason" required>
            <n-input v-model:value="formData.reason" type="textarea" :rows="3" :placeholder="reasonPlaceholder" />
          </n-form-item>
        </n-gi>

        <!-- Локация -->
        <n-gi v-if="props.type === 'transfer'">
          <n-grid :cols="2" :x-gap="12">
            <n-gi>
              <n-form-item label="Откуда" path="sourceLocation" required>
                <n-input v-model:value="formData.sourceLocation" placeholder="Источник" />
              </n-form-item>
            </n-gi>
            <n-gi>
              <n-form-item label="Куда" path="destinationLocation" required>
                <n-input v-model:value="formData.destinationLocation" placeholder="Назначение" />
              </n-form-item>
            </n-gi>
          </n-grid>
        </n-gi>

        <!-- Сумма (автоматическая) -->
        <n-gi v-if="showTotal">
          <n-card size="small">
            <div class="flex justify-between items-center">
              <n-text strong>Итоговая сумма:</n-text>
              <n-text strong type="primary" size="large">
                {{ formatCurrency(totalAmount) }}
              </n-text>
            </div>
          </n-card>
        </n-gi>
      </n-grid>

      <div class="flex justify-end gap-3 mt-6">
        <n-button @click="handleCancel">Отмена</n-button>
        <n-button type="primary" @click="handleSubmit" :loading="loading">
          {{ submitButtonText }}
        </n-button>
      </div>
    </n-form>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import type { FormInst, FormRules } from 'naive-ui'
import type { InventoryItem } from '@/types'
import {
  NModal,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NSelect,
  NButton,
  NCard,
  NText,
  NTag,
  NGrid,
  NGi
} from 'naive-ui'

const props = defineProps<{
  show: boolean
  type: 'incoming' | 'outgoing' | 'transfer' | 'adjustment' | 'reservation' | 'write_off'
  title: string
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  submit: [data: any]
}>()

const inventoryStore = useInventoryStore()
const formRef = ref<FormInst | null>(null)
const loading = ref(false)
const selectedItem = ref<InventoryItem | null>(null)

const formData = reactive({
  itemId: null as number | null,
  quantity: 1,
  unitPrice: 0,
  documentNumber: '',
  documentType: '',
  reason: '',
  sourceLocation: '',
  destinationLocation: ''
})

// Опции для селектов
const itemOptions = computed(() => {
  return inventoryStore.items.map(item => ({
    label: `${item.name} (${item.sku}) - ${item.currentStock} ${item.unit}`,
    value: item.id,
    disabled: props.type === 'outgoing' && item.available <= 0
  }))
})

const documentTypeOptions = computed(() => {
  const baseOptions = [
    { label: 'Накладная', value: 'invoice' },
    { label: 'Акт', value: 'receipt' },
    { label: 'Требование', value: 'requisition' }
  ]

  if (props.type === 'incoming') {
    return [...baseOptions, { label: 'Счет-фактура', value: 'bill' }]
  } else if (props.type === 'outgoing') {
    return [...baseOptions, { label: 'Заказ на производство', value: 'production_order' }]
  }

  return baseOptions
})

// Вычисляемые свойства
const title = computed(() => props.title)

const quantityLabel = computed(() => {
  switch (props.type) {
    case 'incoming': return 'Количество поступления'
    case 'outgoing': return 'Количество расхода'
    case 'transfer': return 'Количество перемещения'
    case 'adjustment': return 'Количество корректировки'
    case 'reservation': return 'Количество для резерва'
    case 'write_off': return 'Количество списания'
    default: return 'Количество'
  }
})

const quantityHint = computed(() => {
  if (!selectedItem.value) return ''

  const item = selectedItem.value
  switch (props.type) {
    case 'incoming':
      return `Максимальный запас: ${item.maxStock} ${item.unit}`
    case 'outgoing':
      return `Доступно для расхода: ${item.available} ${item.unit}`
    case 'reservation':
      return `Доступно для резерва: ${item.available} ${item.unit}`
    default:
      return `Текущий остаток: ${item.currentStock} ${item.unit}`
  }
})

const minQuantity = computed(() => {
  if (props.type === 'adjustment') return -Infinity
  return 0.01
})

const maxQuantity = computed(() => {
  if (!selectedItem.value) return Infinity

  switch (props.type) {
    case 'incoming':
      return selectedItem.value.maxStock - selectedItem.value.currentStock
    case 'outgoing':
    case 'reservation':
      return selectedItem.value.available
    default:
      return Infinity
  }
})

const reasonLabel = computed(() => {
  switch (props.type) {
    case 'incoming': return 'Основание поступления'
    case 'outgoing': return 'Причина расхода'
    case 'transfer': return 'Причина перемещения'
    case 'adjustment': return 'Причина корректировки'
    case 'reservation': return 'Основание резерва'
    case 'write_off': return 'Причина списания'
    default: return 'Причина'
  }
})

const reasonPlaceholder = computed(() => {
  switch (props.type) {
    case 'incoming': return 'Например: Поставка от поставщика, возврат от клиента'
    case 'outgoing': return 'Например: Производство заказа №123, внутренние нужды'
    case 'transfer': return 'Например: Перемещение между складами, изменение зоны хранения'
    case 'adjustment': return 'Например: Инвентаризация, пересчет'
    case 'reservation': return 'Например: Резерв под заказ клиента, проектное резервирование'
    case 'write_off': return 'Например: Брак, порча, истечение срока годности'
    default: return 'Укажите причину операции'
  }
})

const showTotal = computed(() => {
  return props.type === 'incoming' || props.type === 'outgoing'
})

const totalAmount = computed(() => {
  if (!selectedItem.value || !formData.quantity) return 0

  const price = props.type === 'incoming'
    ? formData.unitPrice
    : selectedItem.value.averagePrice

  return formData.quantity * price
})

const submitButtonText = computed(() => {
  switch (props.type) {
    case 'incoming': return 'Принять'
    case 'outgoing': return 'Выдать'
    case 'transfer': return 'Переместить'
    case 'adjustment': return 'Скорректировать'
    case 'reservation': return 'Зарезервировать'
    case 'write_off': return 'Списать'
    default: return 'Сохранить'
  }
})

const showModal = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})

// Правила валидации
const rules: FormRules = {
  itemId: [
    { required: true, message: 'Выберите материал', trigger: 'change', type: 'number' }
  ],
  quantity: [
    { required: true, message: 'Введите количество', trigger: 'blur', type: 'number' },
    {
      validator: (_, value) => {
        if (value <= 0) return new Error('Количество должно быть больше 0')
        if (value > maxQuantity.value) {
          return new Error(`Максимально допустимое количество: ${maxQuantity.value}`)
        }
        return true
      },
      trigger: 'blur'
    }
  ],
  unitPrice: [
    {
      required: props.type === 'incoming',
      message: 'Введите цену',
      trigger: 'blur',
      type: 'number'
    },
    {
      validator: (_, value) => value >= 0,
      message: 'Цена не может быть отрицательной',
      trigger: 'blur'
    }
  ],
  reason: [
    { required: true, message: 'Укажите причину операции', trigger: 'blur' },
    { min: 3, message: 'Минимум 3 символа', trigger: 'blur' }
  ]
}

if (props.type === 'transfer') {
  rules.sourceLocation = [
    { required: true, message: 'Укажите источник', trigger: 'blur' }
  ]
  rules.destinationLocation = [
    { required: true, message: 'Укажите назначение', trigger: 'blur' }
  ]
}

// Методы
const handleItemSelect = (itemId: number) => {
  selectedItem.value = inventoryStore.getItemById(itemId) || null
  if (selectedItem.value && props.type !== 'incoming') {
    formData.unitPrice = selectedItem.value.averagePrice
  }
}

const getPrecision = (unit?: string) => {
  if (!unit) return 0
  return ['м', 'м²', 'кг', 'литр'].includes(unit) ? 2 : 0
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0
  }).format(amount)
}

const handleCancel = () => {
  // Сброс формы
  Object.assign(formData, {
    itemId: null,
    quantity: 1,
    unitPrice: 0,
    documentNumber: '',
    documentType: '',
    reason: '',
    sourceLocation: '',
    destinationLocation: ''
  })
  selectedItem.value = null
  showModal.value = false
}

const handleSubmit = () => {
  formRef.value?.validate((errors) => {
    if (!errors && formData.itemId) {
      loading.value = true

      const transactionData = {
        ...formData,
        type: props.type,
        totalPrice: totalAmount.value
      }

      // Имитация задержки API
      setTimeout(() => {
        emit('submit', transactionData)
        loading.value = false
        handleCancel()
      }, 1000)
    } else {
      window.$message?.error('Пожалуйста, заполните все обязательные поля')
    }
  })
}

// Сброс формы при закрытии
watch(() => props.show, (newVal) => {
  if (!newVal) {
    handleCancel()
  }
})
</script>
