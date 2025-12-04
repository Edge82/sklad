<template>
  <n-modal v-model:show="showModal" preset="card" :title="title" style="width: 800px" :bordered="false" size="huge">
    <n-form ref="formRef" :model="formData" :rules="rules" label-placement="top">
      <n-tabs type="line" animated>
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

              <n-form-item label="Категория" path="categoryId" required>
                <n-select v-model:value="formData.categoryId" :options="categoryOptions"
                  placeholder="Выберите категорию" />
              </n-form-item>

              <n-form-item label="Единица измерения" path="unit" required>
                <n-select v-model:value="formData.unit" :options="unitOptions" placeholder="Выберите единицу" />
              </n-form-item>
            </n-gi>

            <n-gi>
              <n-form-item label="Штрих-код" path="barcode">
                <n-input v-model:value="formData.barcode" placeholder="Штрих-код" />
              </n-form-item>

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

        <!-- Финансы -->
        <n-tab-pane name="finance" tab="Финансы">
          <n-grid :cols="2" :x-gap="24">
            <n-gi>
              <n-form-item label="Цена закупки" path="purchasePrice" required>
                <n-input-number v-model:value="formData.purchasePrice" :min="0" placeholder="Цена закупки"
                  style="width: 100%">
                  <template #suffix>₽</template>
                </n-input-number>
              </n-form-item>

              <n-form-item label="Средняя цена" path="averagePrice" required>
                <n-input-number v-model:value="formData.averagePrice" :min="0" placeholder="Средняя цена"
                  style="width: 100%">
                  <template #suffix>₽</template>
                </n-input-number>
              </n-form-item>
            </n-gi>

            <n-gi>
              <n-form-item label="Последняя цена" path="lastPurchasePrice" required>
                <n-input-number v-model:value="formData.lastPurchasePrice" :min="0" placeholder="Последняя цена закупки"
                  style="width: 100%">
                  <template #suffix>₽</template>
                </n-input-number>
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
        <n-button type="primary" @click="handleSubmit" :loading="loading">
          Сохранить
        </n-button>
      </div>
    </n-form>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import type { FormInst, FormRules } from 'naive-ui'
import {
  NModal,
  NForm,
  NFormItem,
  NInput,
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
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  submit: [data: any]
}>()

const formRef = ref<FormInst | null>(null)
const loading = ref(false)

const title = computed(() => 'Новый материал')

const formData = reactive({
  name: '',
  sku: '',
  barcode: '',
  categoryId: 1,
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

const categoryOptions = [
  { label: 'Древесина', value: 1 },
  { label: 'Фурнитура', value: 2 },
  { label: 'Отделочные материалы', value: 3 },
  { label: 'Стекло и зеркала', value: 4 },
  { label: 'Ткани и наполнители', value: 5 },
  { label: 'Крепеж', value: 6 },
  { label: 'Упаковочные материалы', value: 7 },
  { label: 'Электроника', value: 8 }
]

const unitOptions = [
  { label: 'шт', value: 'шт' },
  { label: 'м', value: 'м' },
  { label: 'м²', value: 'м²' },
  { label: 'кг', value: 'кг' },
  { label: 'литр', value: 'литр' },
  { label: 'банка', value: 'банка' },
  { label: 'рулон', value: 'рулон' },
  { label: 'лист', value: 'лист' },
  { label: 'пара', value: 'пара' }
]

const rules: FormRules = {
  name: [
    { required: true, message: 'Введите название', trigger: 'blur' },
    { min: 2, message: 'Название должно быть не менее 2 символов', trigger: 'blur' }
  ],
  sku: [
    { required: true, message: 'Введите артикул', trigger: 'blur' }
  ],
  categoryId: [
    { required: true, message: 'Выберите категорию', trigger: 'change' }
  ],
  unit: [
    { required: true, message: 'Выберите единицу измерения', trigger: 'change' }
  ],
  currentStock: [
    { required: true, type: 'number', min: 0, message: 'Введите корректное количество', trigger: 'blur' }
  ],
  minStock: [
    { required: true, type: 'number', min: 0, message: 'Введите минимальный запас', trigger: 'blur' }
  ],
  maxStock: [
    { required: true, type: 'number', min: 0, message: 'Введите максимальный запас', trigger: 'blur' }
  ],
  purchasePrice: [
    { required: true, type: 'number', min: 0, message: 'Введите цену закупки', trigger: 'blur' }
  ],
  averagePrice: [
    { required: true, type: 'number', min: 0, message: 'Введите среднюю цену', trigger: 'blur' }
  ],
  mainSupplier: [
    { required: true, message: 'Введите поставщика', trigger: 'blur' }
  ]
}

const showModal = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})

const handleCancel = () => {
  showModal.value = false
}

const handleSubmit = () => {
  formRef.value?.validate((errors) => {
    if (!errors) {
      loading.value = true

      setTimeout(() => {
        emit('submit', formData)
        loading.value = false
        showModal.value = false

        // Сброс формы
        Object.assign(formData, {
          name: '',
          sku: '',
          barcode: '',
          categoryId: 1,
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
      }, 1000)
    } else {
      window.$message?.error('Пожалуйста, исправьте ошибки в форме')
    }
  })
}
</script>
