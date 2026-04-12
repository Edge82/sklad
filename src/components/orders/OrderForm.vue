<template>
  <n-form ref="formRef" :model="formData" :rules="rules" label-placement="top">
    <n-grid :cols="2" :x-gap="24">
      <!-- Информация о клиенте -->
      <n-gi>
        <n-h3>Информация о клиенте</n-h3>
        <n-form-item label="ФИО клиента" path="customerName" required>
          <n-input v-model:value="formData.customerName" placeholder="Введите ФИО клиента" />
        </n-form-item>

        <n-form-item label="Телефон" path="customerPhone">
          <n-input v-model:value="formData.customerPhone" placeholder="+7 (999) 999-99-99" />
        </n-form-item>

        <n-form-item label="Email" path="customerEmail">
          <n-input v-model:value="formData.customerEmail" placeholder="email@example.com" />
        </n-form-item>
      </n-gi>

      <!-- Детали заказа -->
      <n-gi>
        <n-h3>Детали заказа</n-h3>
        <n-form-item label="Приоритет" path="priority" required>
          <n-select v-model:value="formData.priority" :options="priorityOptions" placeholder="Выберите приоритет" />
        </n-form-item>

        <n-form-item label="Срок выполнения" path="deadline" required>
          <n-date-picker v-model:value="formData.deadline" type="date" :is-date-disabled="disablePastDate"
            placeholder="Выберите дату" style="width: 100%" />
        </n-form-item>

        <n-form-item label="Статус" path="status" required>
          <n-select v-model:value="formData.status" :options="statusOptions" placeholder="Выберите статус" />
        </n-form-item>
      </n-gi>

      <!-- Позиции заказа -->
      <n-gi :span="2">
        <n-h3>Позиции заказа</n-h3>
        <div v-for="(item, index) in formData.items" :key="index" class="order-item mb-4 p-4 border rounded">
          <div class="flex justify-between items-center mb-3">
            <n-text strong>Позиция {{ Number(index) + 1 }}</n-text>
            <n-button v-if="formData.items.length > 1" size="small" type="error" quaternary @click="removeItem(Number(index))">
              Удалить
            </n-button>
          </div>

          <n-grid :cols="3" :x-gap="12">
            <n-gi>
              <n-form-item label="Наименование" :path="`items[${index}].productName`" required>
                <n-input v-model:value="item.productName" placeholder="Наименование товара" />
              </n-form-item>
            </n-gi>

            <n-gi>
              <n-form-item label="Количество" :path="`items[${index}].quantity`" required>
                <n-input-number v-model:value="item.quantity" :min="1" :precision="0" placeholder="Количество"
                  style="width: 100%" />
              </n-form-item>
            </n-gi>

            <n-gi>
              <n-form-item label="Цена за единицу" :path="`items[${index}].unitPrice`" required>
                <n-input-number v-model:value="item.unitPrice" :min="0" :precision="2" placeholder="Цена"
                  style="width: 100%">
                  <template #suffix>₽</template>
                </n-input-number>
              </n-form-item>
            </n-gi>

            <n-gi :span="2">
              <n-form-item label="Материалы" :path="`items[${index}].materialUsed`">
                <n-input v-model:value="item.materialUsed" placeholder="Используемые материалы" />
              </n-form-item>
            </n-gi>

            <n-gi :span="2">
              <n-form-item label="Краски" :path="`items[${index}].paintUsed`">
                <n-input v-model:value="item.paintUsed" placeholder="Используемые краски" />
              </n-form-item>
            </n-gi>

            <n-gi>
              <n-form-item label="Итого" :path="`items[${index}].totalPrice`">
                <n-input-number :value="item.quantity * item.unitPrice" disabled style="width: 100%">
                  <template #suffix>₽</template>
                </n-input-number>
              </n-form-item>
            </n-gi>
          </n-grid>
        </div>

        <n-button @click="addItem" type="primary" quaternary class="mb-4">
          <template #icon>
            <n-icon>
              <AddCircleOutline />
            </n-icon>
          </template>
          Добавить позицию
        </n-button>
      </n-gi>

      <!-- Примечания -->
      <n-gi :span="2">
        <n-form-item label="Примечания" path="notes">
          <n-input v-model:value="formData.notes" type="textarea" :rows="3"
            placeholder="Дополнительная информация о заказе" />
        </n-form-item>
      </n-gi>

      <!-- Итоговая сумма -->
      <n-gi :span="2">
        <n-card>
          <div class="flex justify-between items-center">
            <n-text strong>Итоговая сумма заказа:</n-text>
            <n-text strong size="large" type="primary">
              {{ formatCurrency(totalAmount) }}
            </n-text>
          </div>
        </n-card>
      </n-gi>
    </n-grid>

    <div class="flex justify-end gap-3 mt-6">
      <n-button @click="$emit('cancel')">Отмена</n-button>
      <n-button type="primary" @click="handleSubmit" :loading="loading">
        {{ initialData ? 'Сохранить изменения' : 'Создать заказ' }}
      </n-button>
    </div>
  </n-form>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import type { FormInst, FormRules } from 'naive-ui'
import { useMessage } from 'naive-ui'
import {
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NSelect,
  NDatePicker,
  NButton,
  NIcon,
  NCard,
  NText,
  NH3,
  NGrid,
  NGi
} from 'naive-ui'
import { AddCircleOutline } from '@vicons/ionicons5'
import { useUserStore } from '@/stores/user'
import type { Order } from '@/types'

const emit = defineEmits<{
  submit: [data: Partial<Order>]
  cancel: []
}>()

const props = defineProps<{
  initialData?: Partial<Order>
}>()

const userStore = useUserStore()
const message = useMessage()
const formRef = ref<FormInst | null>(null)
const loading = ref(false)

const formData = reactive({
  customerName: props.initialData?.customerName || '',
  customerPhone: props.initialData?.customerPhone || '',
  customerEmail: props.initialData?.customerEmail || '',
  status: props.initialData?.status || 'new',
  priority: props.initialData?.priority || 'medium',
  orderDate: props.initialData?.orderDate ? new Date(props.initialData.orderDate).getTime() : Date.now(),
  deadline: props.initialData?.deadline ? new Date(props.initialData.deadline).getTime() : Date.now() + 14 * 24 * 60 * 60 * 1000,
  items: props.initialData?.items ? JSON.parse(JSON.stringify(props.initialData.items)) : [
    {
      productName: '',
      quantity: 1,
      unitPrice: 0,
      materialUsed: '',
      paintUsed: ''
    }
  ],
  notes: props.initialData?.notes || ''
})

const statusOptions = [
  { label: 'Новый', value: 'new' },
  { label: 'В обработке', value: 'processing' },
  { label: 'Готов', value: 'ready' },
  { label: 'Отправлен', value: 'shipped' },
  { label: 'Завершен', value: 'completed' },
  { label: 'Отменен', value: 'cancelled' }
]

const priorityOptions = [
  { label: 'Низкий', value: 'low' },
  { label: 'Средний', value: 'medium' },
  { label: 'Высокий', value: 'high' },
  { label: 'Срочный', value: 'urgent' }
]

const totalAmount = computed(() => {
  return formData.items.reduce((sum: number, item: { quantity: number; unitPrice: number }) => {
    return sum + (item.quantity * item.unitPrice)
  }, 0)
})

const rules: FormRules = {
  customerName: [
    { required: true, message: 'Введите ФИО клиента', trigger: 'blur' },
    { min: 2, message: 'Имя должно быть не менее 2 символов', trigger: 'blur' }
  ],
  customerPhone: [
    { pattern: /^[\d\s()+-\/]*$/, message: 'Некорректный номер телефона', trigger: 'blur' }
  ],
  customerEmail: [
    { type: 'email', message: 'Некорректный email', trigger: 'blur' }
  ],
  priority: [
    { required: true, message: 'Выберите приоритет', trigger: 'change' }
  ],
  deadline: [
    { required: true, type: 'number', message: 'Выберите срок выполнения', trigger: 'change' }
  ],
  'items[0].productName': [
    { required: true, message: 'Введите наименование товара', trigger: 'blur' }
  ],
  'items[0].quantity': [
    { required: true, type: 'number', min: 1, message: 'Количество должно быть не менее 1', trigger: 'blur' }
  ],
  'items[0].unitPrice': [
    { required: true, type: 'number', min: 0, message: 'Цена должна быть положительной', trigger: 'blur' }
  ]
}

const disablePastDate = (date: number) => {
  return date < Date.now() - 24 * 60 * 60 * 1000 // Запретить прошедшие даты
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0
  }).format(amount)
}

const addItem = () => {
  formData.items.push({
    productName: '',
    quantity: 1,
    unitPrice: 0,
    materialUsed: '',
    paintUsed: ''
  })
}

const removeItem = (index: number) => {
  formData.items.splice(index, 1)
}

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    loading.value = true

    // Подготовка данных для отправки
    const orderData = {
      ...formData,
      orderDate: new Date(formData.orderDate),
      deadline: new Date(formData.deadline),
      totalAmount: totalAmount.value,
      items: formData.items.map((item: { productName: string; quantity: number; unitPrice: number; materialUsed: string }) => ({
        ...item,
        id: Math.random().toString(36).substr(2, 9),
        productId: `PROD-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
        totalPrice: item.quantity * item.unitPrice
      })),
      createdBy: userStore.user?.name || 'Система'
    } as Partial<Order> // Partially built order

    // Имитация задержки API
    setTimeout(() => {
      emit('submit', orderData)
      loading.value = false
    }, 1000)
  } catch {
    message.error('Пожалуйста, исправьте ошибки в форме')
  }
}
</script>

<style scoped>
.order-item {
  background-color: rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
