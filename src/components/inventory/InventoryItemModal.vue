<template>
  <n-modal v-model:show="showModal" preset="card" :title="title" class="w-200!" :bordered="false" size="huge">
    <n-form ref="formRef" :model="formData" :rules="rules" label-placement="top">
      <div v-if="props.mode === 'product'" class="py-2">
        <n-grid :cols="24" :x-gap="24">
          <n-gi :span="16">
            <n-grid :cols="2" :x-gap="12">
              <n-gi>
                <n-form-item label="Название изделия" path="name" required>
                  <n-input v-model:value="formData.name" placeholder="Введите название изделия" />
                </n-form-item>

                <n-form-item label="Единица измерения" path="unit" required>
                  <n-select v-model:value="formData.unit" :options="unitOptions" placeholder="Выберите единицу" />
                </n-form-item>
              </n-gi>
              <n-gi>
                <n-form-item label="Текущее количество на складе" path="currentStock">
                  <n-input-number v-model:value="formData.currentStock" :min="0" placeholder="Введите количество"
                    class="w-full" />
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
            </n-grid>
            <n-form-item label="Описание" path="description">
              <n-input v-model:value="formData.description" type="textarea" :rows="4"
                placeholder="Дополнительная информация об изделии" />
            </n-form-item>
          </n-gi>

          <n-gi :span="8">
            <n-form-item label="Изображение">
              <div class="w-full">
                <div v-if="formData.image" class="relative group mb-2 border rounded-md overflow-hidden bg-gray-50 flex items-center justify-center min-h-40">
                  <n-image :src="formData.image" class="max-h-60 object-contain" />
                  <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <n-button type="error" circle size="small" @click="removeImage">
                      <template #icon><n-icon><TrashOutline /></n-icon></template>
                    </n-button>
                  </div>
                </div>
                <n-upload
                  v-else
                  @change="handleImageChange"
                  :show-file-list="false"
                  accept="image/*"
                  trigger-class="w-full"
                >
                  <n-upload-dragger class="w-full py-8">
                    <div class="mb-3">
                      <n-icon size="48" :depth="3">
                        <CloudUploadOutline />
                      </n-icon>
                    </div>
                    <n-text style="font-size: 14px">
                      Нажмите или перетащите картинку
                    </n-text>
                  </n-upload-dragger>
                </n-upload>
              </div>
            </n-form-item>
          </n-gi>
        </n-grid>
      </div>

      <div v-else class="py-2">
        <n-grid :cols="24" :x-gap="24">
          <!-- Левая колонка: Основное и Изображение -->
          <n-gi :span="16">
            <n-grid :cols="2" :x-gap="12">
              <n-gi>
                <div class="font-bold mb-4 border-b pb-1 text-gray-500">ОСНОВНАЯ ИНФОРМАЦИЯ</div>
                <n-form-item label="Название" path="name" required>
                  <n-input v-model:value="formData.name" placeholder="Название материала" />
                </n-form-item>

                <n-form-item label="Артикул (SKU)" path="sku">
                  <n-input v-model:value="formData.sku" placeholder="Уникальный артикул" />
                </n-form-item>

                <n-form-item label="Категория" path="categoryId" required>
                  <n-select v-model:value="formData.categoryId" :options="categoryOptions"
                    placeholder="Выберите категорию" />
                </n-form-item>

                <n-form-item label="Место хранения" path="location">
                  <n-input v-model:value="formData.location" placeholder="Стеллаж-полка-ячейка" />
                </n-form-item>

                <div class="font-bold mb-4 border-b pb-1 text-gray-500">ИЗОБРАЖЕНИЕ</div>
                <n-form-item>
                  <div class="w-full">
                    <div v-if="formData.image" class="relative group mb-2 border rounded-md overflow-hidden bg-gray-50 flex items-center justify-center min-h-40">
                      <n-image :src="formData.image" class="max-h-44 object-contain" />
                      <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <n-button type="error" circle size="small" @click="removeImage">
                          <template #icon><n-icon><TrashOutline /></n-icon></template>
                        </n-button>
                      </div>
                    </div>
                    <n-upload
                      v-else
                      @change="handleImageChange"
                      :show-file-list="false"
                      accept="image/*"
                    >
                      <n-upload-dragger class="py-4">
                        <div class="mb-2">
                          <n-icon size="32" :depth="3">
                            <CloudUploadOutline />
                          </n-icon>
                        </div>
                        <n-text style="font-size: 13px">Загрузить фото</n-text>
                      </n-upload-dragger>
                    </n-upload>
                  </div>
                </n-form-item>
                
                <n-form-item label="Штрих-код (QR-код)" path="barcode">
                  <n-input-group>
                    <n-input v-model:value="formData.barcode" placeholder="Сгенерируйте код" />
                    <n-button @click="generateBarcode" type="primary" secondary>
                      <template #icon>
                        <n-icon><CloudUploadOutline /></n-icon>
                      </template>
                    </n-button>
                  </n-input-group>
                </n-form-item>
              </n-gi>
            </n-grid>

            <div class="font-bold mt-4 mb-4 border-b pb-1 text-gray-500 uppercase">Поставщик и описание</div>
            <n-grid :cols="2" :x-gap="12">
              <n-gi>
                <n-form-item label="Основной поставщик" path="mainSupplier">
                  <n-input v-model:value="formData.mainSupplier" placeholder="Основной поставщик" />
                </n-form-item>
              </n-gi>
              <n-gi>
                <n-form-item label="Срок поставки (дни)" path="deliveryTime">
                  <n-input-number v-model:value="formData.deliveryTime" :min="1" placeholder="Срок поставки"
                    class="w-full" />
                </n-form-item>
              </n-gi>
            </n-grid>
            <n-form-item label="Описание" path="description">
              <n-input v-model:value="formData.description" type="textarea" :rows="2"
                placeholder="Описание материала" />
            </n-form-item>
          </n-gi>

          <!-- Правая колонка: Количества и Цены -->
          <n-gi :span="8" class="p-4 rounded-lg">
            <div class="font-bold mb-4 border-b pb-1 text-gray-500 uppercase">СКЛАД И ЦЕНЫ</div>
            
            <n-form-item label="Единица измерения" path="unit" required>
              <n-select v-model:value="formData.unit" :options="unitOptions" placeholder="Выберите единицу" />
            </n-form-item>

            <n-form-item label="Средняя цена" path="averagePrice">
              <n-input-number v-model:value="formData.averagePrice" :min="0" placeholder="Введите цену"
                class="w-full">
                <template #suffix>₽</template>
              </n-input-number>
            </n-form-item>

            <n-divider title-placement="left" style="margin-top: 12px; margin-bottom: 12px">Остатки</n-divider>

            <n-grid :cols="2" :x-gap="12">
              <n-gi>
                <n-form-item label="В наличии" path="currentStock">
                  <n-input-number v-model:value="formData.currentStock" :min="0" placeholder="0" class="w-full" />
                </n-form-item>
              </n-gi>
              <n-gi>
                <n-form-item label="Резерв" path="reserved">
                  <n-input-number v-model:value="formData.reserved" :min="0" placeholder="0" class="w-full" />
                </n-form-item>
              </n-gi>
            </n-grid>

            <n-grid :cols="2" :x-gap="12">
              <n-gi>
                <n-form-item label="Мин. запас" path="minStock">
                  <n-input-number v-model:value="formData.minStock" :min="0" placeholder="0" class="w-full" />
                </n-form-item>
              </n-gi>
              <n-gi>
                <n-form-item label="Макс. запас" path="maxStock">
                  <n-input-number v-model:value="formData.maxStock" :min="0" placeholder="0" class="w-full" />
                </n-form-item>
              </n-gi>
            </n-grid>

             <n-form-item label="Мин. партия заказа" path="minOrderQuantity">
              <n-input-number v-model:value="formData.minOrderQuantity" :min="0" placeholder="Минимальная партия"
                class="w-full" />
            </n-form-item>
          </n-gi>
        </n-grid>
      </div>

      <div class="flex justify-end gap-3 mt-6 pt-4 border-t">
        <n-button @click="handleCancel">Отмена</n-button>
        <n-button v-if="!props.itemId || isDirty" type="primary" @click="handleSubmit" :loading="loading" size="large" class="px-8">
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
  NGrid,
  NGi,
  NUpload,
  NImage,
  NIcon,
  NDivider,
  type UploadFileInfo
} from 'naive-ui'
import { CloudUploadOutline, TrashOutline } from '@vicons/ionicons5'

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
  image: '',
  status: 'in_stock',
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

const handleImageChange = (options: { file: UploadFileInfo, fileList: Array<UploadFileInfo> }) => {
  const file = options.file.file
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      formData.image = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
}

const removeImage = () => {
  formData.image = ''
}

// Загрузка данных при редактировании
watch(() => props.show, (newShow) => {
  if (newShow && props.itemId) {
    const item = inventoryStore.getItemById(props.itemId)
    if (item) {
      Object.assign(formData, { 
        ...item,
        image: item.image || ''
      })
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
      image: '',
      status: 'in_stock',
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

const statusOptions = [
  { label: 'В наличии', value: 'in_stock' },
  { label: 'Мало осталось', value: 'low_stock' },
  { label: 'Отсутствует', value: 'out_of_stock' },
  { label: 'Зарезервировано', value: 'reserved' },
  { label: 'В пути', value: 'on_order' },
  { label: 'Заблокировано', value: 'blocked' }
]

const rules = computed<FormRules>(() => {
  return {
    name: [
      { required: true, message: 'Введите название', trigger: 'blur' },
      { min: 2, message: 'Название должно быть не менее 2 символов', trigger: 'blur' }
    ],
    categoryId: [
      { required: true, type: 'string', message: 'Выберите категорию', trigger: 'change' }
    ],
    unit: [
      { required: true, type: 'string', message: 'Выберите единицу измерения', trigger: 'change' }
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
          status: 'in_stock',
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
