<template>
  <n-modal v-model:show="showModal" preset="card" :title="title" style="width: 800px" :bordered="false" size="huge">
    <n-form ref="formRef" :model="formData" :rules="rules" label-placement="top">
      <div v-if="props.mode === 'product'" class="py-2">
        <n-grid :cols="2" :x-gap="24">
          <n-gi>
            <n-form-item label="Название изделия" path="name" required>
              <n-input v-model:value="formData.name" placeholder="Введите название изделия" />
            </n-form-item>

            <n-form-item label="Единица измерения" path="unit" required>
              <n-select v-model:value="formData.unit" :options="unitOptions" placeholder="Выберите единицу" />
            </n-form-item>

            <n-form-item label="Текущее количество на складе" path="currentStock" required>
              <n-input-number v-model:value="formData.currentStock" :min="0" placeholder="Введите количество"
                style="width: 100%" />
            </n-form-item>

            <n-form-item label="Штрих-код (QR-код)" path="barcode">
              <n-input-group>
                <n-input v-model:value="formData.barcode" placeholder="ID изделия или штрих-код" />
                <n-button @click="generateBarcode" type="primary" ghost>
                  Генерация
                </n-button>
              </n-input-group>
            </n-form-item>
          </n-gi>

          <n-gi>
            <n-form-item label="Описание" path="description">
              <n-input v-model:value="formData.description" type="textarea" :rows="6"
                placeholder="Дополнительная информация об изделии" />
            </n-form-item>
          </n-gi>
        </n-grid>
      </div>

      <n-tabs v-else type="line" animated>
        <!-- Основная информация -->
        <n-tab-pane name="basic" tab="Основное">
          <n-grid :cols="2" :x-gap="24">
            <n-gi>
              <n-form-item label="Название" path="name" required>
                <n-input v-model:value="formData.name" placeholder="Название материала" />
              </n-form-item>

              <n-form-item label="Артикул (SKU)" path="sku" required>
                <n-input v-model:value="formData.sku" placeholder="Уникальный артикул" />
              </n-form-item>

              <n-form-item label="Штрих-код (QR-код)" path="barcode">
                <n-input-group>
                  <n-input v-model:value="formData.barcode" placeholder="Сгенерируйте код" />
                  <n-button @click="generateBarcode" type="primary" secondary>
                    Сгенерировать
                  </n-button>
                </n-input-group>
              </n-form-item>

              <n-form-item label="Категория" path="categoryId" required>
                <n-select v-model:value="formData.categoryId" :options="categoryOptions"
                  placeholder="Выберите категорию" />
              </n-form-item>

              <n-form-item label="Единица измерения" path="unit" required>
                <n-select v-model:value="formData.unit" :options="unitOptions" placeholder="Выберите единицу" />
              </n-form-item>

              <n-form-item label="Средняя цена" path="averagePrice" required>
                <n-input-number v-model:value="formData.averagePrice" :min="0" placeholder="Введите цену"
                  style="width: 100%">
                  <template #suffix>₽</template>
                </n-input-number>
              </n-form-item>
            </n-gi>

            <n-gi>
              <n-form-item label="Место хранения" path="location" required>
                <n-input v-model:value="formData.location" placeholder="Стеллаж-полка-ячейка" />
              </n-form-item>

              <n-form-item label="Описание" path="description">
                <n-input v-model:value="formData.description" type="textarea" :rows="3"
                  placeholder="Описание материала" />
              </n-form-item>
            </n-gi>
          </n-grid>
        </n-tab-pane>

        <!-- Количественные показатели -->
        <n-tab-pane name="quantities" tab="Количества">
          <n-grid :cols="2" :x-gap="24">
            <n-gi>
              <n-form-item label="Текущий остаток" path="currentStock" required>
                <n-input-number v-model:value="formData.currentStock" :min="0" placeholder="Текущее количество"
                  style="width: 100%" />
              </n-form-item>

              <n-form-item label="Минимальный запас" path="minStock" required>
                <n-input-number v-model:value="formData.minStock" :min="0" placeholder="Минимальное количество"
                  style="width: 100%" />
              </n-form-item>
            </n-gi>

            <n-gi>
              <n-form-item label="Максимальный запас" path="maxStock" required>
                <n-input-number v-model:value="formData.maxStock" :min="0" placeholder="Максимальное количество"
                  style="width: 100%" />
              </n-form-item>

              <n-form-item label="Резерв" path="reserved" required>
                <n-input-number v-model:value="formData.reserved" :min="0" placeholder="Зарезервировано"
                  style="width: 100%" />
              </n-form-item>
            </n-gi>
          </n-grid>
        </n-tab-pane>

        <!-- Поставщики -->
        <n-tab-pane name="suppliers" tab="Поставщики">
          <n-grid :cols="2" :x-gap="24">
            <n-gi>
              <n-form-item label="Основной поставщик" path="mainSupplier" required>
                <n-input v-model:value="formData.mainSupplier" placeholder="Основной поставщик" />
              </n-form-item>

              <n-form-item label="Код поставщика" path="supplierCode">
                <n-input v-model:value="formData.supplierCode" placeholder="Код у поставщика" />
              </n-form-item>
            </n-gi>

            <n-gi>
              <n-form-item label="Срок поставки (дни)" path="deliveryTime" required>
                <n-input-number v-model:value="formData.deliveryTime" :min="1" placeholder="Срок поставки"
                  style="width: 100%" />
              </n-form-item>

              <n-form-item label="Мин. партия" path="minOrderQuantity" required>
                <n-input-number v-model:value="formData.minOrderQuantity" :min="0" placeholder="Минимальная партия"
                  style="width: 100%" />
              </n-form-item>
            </n-gi>
          </n-grid>
        </n-tab-pane>
      </n-tabs>

      <div class="flex justify-end gap-3 mt-6">
        <n-button @click="handleCancel">Отмена</n-button>
        <n-button v-if="!props.itemId || isDirty" type="primary" @click="handleSubmit" :loading="loading">
          Сохранить
        </n-button>
      </div>
    </n-form>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { FormInst, FormRules } from 'naive-ui'
import { useInventoryStore } from '@/stores/inventory'
import { useMessage } from 'naive-ui'
import type { InventoryItem } from '@/types'
import {
  NModal,
  NForm,
  NFormItem,
  NInput,
  NInputGroup,
  NInputNumber,
  NSelect,
  NButton,
  NTabs,
  NTabPane,
  NGrid,
  NGi
} from 'naive-ui'

const props = defineProps<{
  show: boolean
  itemId?: string | null
  mode?: 'material' | 'product'
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  submit: [data: Partial<InventoryItem>]
}>()

const inventoryStore = useInventoryStore()
const message = useMessage()
const formRef = ref<FormInst | null>(null)
const loading = ref(false)
const initialDataStr = ref('')

const title = computed(() => {
  if (props.itemId) return props.mode === 'product' ? 'Редактировать изделие' : 'Редактировать материал'
  return props.mode === 'product' ? 'Новое изделие' : 'Новый материал'
})

const formData = reactive({
  name: '',
  sku: '',
  barcode: '',
  categoryId: props.mode === 'product' ? '99' : '1',
  description: '',
  unit: props.mode === 'product' ? 'шт' : 'шт',
  currentStock: 0,
  minStock: 0,
  maxStock: 100,
  reserved: 0,
  location: '',
  purchasePrice: 0,
  averagePrice: 0,
  lastPurchasePrice: 0,
  mainSupplier: props.mode === 'product' ? 'Собственное производство' : '',
  supplierCode: '',
  deliveryTime: 3,
  minOrderQuantity: 1,
  totalConsumed: 0,
  popularity: 5,
  type: props.mode || 'material'
})

// Загрузка данных при редактировании
watch(() => props.show, (newShow) => {
  if (newShow && props.itemId) {
    const item = inventoryStore.getItemById(props.itemId)
    if (item) {
      Object.assign(formData, { ...item })
      initialDataStr.value = JSON.stringify(formData)
    }
  } else if (newShow && !props.itemId) {
    // Сброс формы для нового элемента
    Object.assign(formData, {
      name: '',
      sku: '',
      barcode: '',
      categoryId: props.mode === 'product' ? '99' : '1',
      description: '',
      unit: props.mode === 'product' ? 'шт' : 'шт',
      currentStock: 0,
      minStock: 0,
      maxStock: 100,
      reserved: 0,
      location: '',
      purchasePrice: 0,
      averagePrice: 0,
      lastPurchasePrice: 0,
      mainSupplier: props.mode === 'product' ? 'Собственное производство' : '',
      supplierCode: '',
      deliveryTime: 3,
      minOrderQuantity: 1,
      totalConsumed: 0,
      popularity: 5,
      type: props.mode || 'material'
    })
    initialDataStr.value = JSON.stringify(formData)
  }
})

const isDirty = computed(() => {
  return JSON.stringify(formData) !== initialDataStr.value
})

const categoryOptions = computed(() => {
  const categories = props.mode === 'product' 
    ? inventoryStore.categories.filter(c => c.id === '99') 
    : inventoryStore.categories.filter(c => c.id !== '99')
    
  return categories.map(cat => ({
    label: cat.name,
    value: cat.id
  }))
})

const unitOptions = [
  { label: 'шт', value: 'шт' },
  { label: 'м', value: 'м' },
  { label: 'м²', value: 'м²' },
  { label: 'кг', value: 'кг' },
  { label: 'литр', value: 'литр' },
  { label: 'банка', value: 'банка' },
  { label: 'рулон', value: 'рулон' },
  { label: 'лист', value: 'лист' },
  { label: 'пара', value: 'пара' },
  { label: 'комплект', value: 'комплект' }
]

const rules = computed<FormRules>(() => {
  const isProduct = props.mode === 'product'
  
  return {
    name: [
      { required: true, message: 'Введите название', trigger: 'blur' },
      { min: 2, message: 'Название должно быть не менее 2 символов', trigger: 'blur' }
    ],
    sku: [
      { required: !isProduct, message: 'Введите артикул', trigger: 'blur' }
    ],
    categoryId: [
      { required: !isProduct, type: 'string', message: 'Выберите категорию', trigger: 'change' }
    ],
    unit: [
      { required: true, type: 'string', message: 'Выберите единицу измерения', trigger: 'change' }
    ],
    currentStock: [
      { required: true, type: 'number', min: 0, message: 'Введите корректное количество', trigger: 'blur' }
    ],
    minStock: [
      { required: !isProduct, type: 'number', min: 0, message: 'Введите минимальный запас', trigger: 'blur' }
    ],
    maxStock: [
      { required: !isProduct, type: 'number', min: 0, message: 'Введите максимальный запас', trigger: 'blur' }
    ],
    averagePrice: [
      { required: !isProduct, type: 'number', min: 0, message: 'Введите цену', trigger: 'blur' }
    ],
    mainSupplier: [
      { required: !isProduct, message: 'Введите поставщика', trigger: 'blur' }
    ]
  }
})

const showModal = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})

const handleCancel = () => {
  showModal.value = false
}

const generateBarcode = () => {
  const prefix = props.mode === 'product' ? 'PRD' : 'MAT'
  const year = new Date().getFullYear().toString().substring(2)
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  formData.barcode = `${prefix}-${year}-${random}`
  // Для материалов также заполняем SKU если он пустой
  if (props.mode !== 'product' && !formData.sku) {
    formData.sku = formData.barcode
  }
}

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    loading.value = true

    // Для изделий автоматически заполняем скрытые обязательные поля
    if (props.mode === 'product') {
      if (!formData.barcode) generateBarcode()
      if (!formData.sku) formData.sku = formData.barcode
      if (!formData.location) formData.location = 'FG-ZONE'
      formData.categoryId = '99'
      formData.mainSupplier = 'Собственное производство'
    }

    // Синхронизируем все цены с "Цена" (средняя цена)
    formData.purchasePrice = formData.averagePrice
    formData.lastPurchasePrice = formData.averagePrice

    setTimeout(() => {
      const item = {
      ...formData,
      id: props.itemId || `ITEM-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      category: inventoryStore.categories.find(c => c.id === formData.categoryId)?.name || 'Прочее',
      available: formData.currentStock - formData.reserved,
      totalValue: formData.currentStock * formData.averagePrice
    }
    emit('submit', item)
      loading.value = false
      showModal.value = false

      // Сброс формы (только если не редактирование)
      if (!props.itemId) {
        Object.assign(formData, {
          name: '',
          sku: '',
          barcode: '',
          categoryId: '1',
          description: '',
          unit: 'шт',
          currentStock: 0,
          minStock: 0,
          maxStock: 100,
          reserved: 0,
          location: '',
          purchasePrice: 0,
          averagePrice: 0,
          lastPurchasePrice: 0,
          mainSupplier: '',
          supplierCode: '',
          deliveryTime: 3,
          minOrderQuantity: 1,
          totalConsumed: 0,
          popularity: 5
        })
      }
    }, 1000)
  } catch {
    message.error('Пожалуйста, исправьте ошибки в форме')
  }
}
</script>
