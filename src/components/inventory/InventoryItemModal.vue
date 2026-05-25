<template>
  <n-modal v-model:show="showModal" preset="card" :title="title" class="w-200!" :bordered="false" size="huge" :trap-focus="!showPrintModal" :auto-focus="false">
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
                  <n-select v-model:value="formData.unit" :options="combinedUnitOptions" placeholder="Выберите единицу" />
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

      <!-- Режим создания материала: полная форма -->
      <div v-if="!props.itemId && props.mode === 'material'" class="py-2">
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
                  <n-select v-model:value="formData.categoryId" :options="categoryOptions1C"
                    placeholder="Выберите категорию" />
                </n-form-item>

                <div class="font-bold mb-4 border-b pb-1 text-gray-500">ЛОКАЛЬНЫЕ ПОЛЯ</div>
                <n-form-item label="Штрих-код (QR-код)" path="barcode">
                  <n-input-group>
                    <n-input v-model:value="formData.barcode" placeholder="Сгенерируйте код" />
                    <n-button @click="generateBarcode" type="primary" secondary>
                      <template #icon>
                        <n-icon><CloudUploadOutline /></n-icon>
                      </template>
                    </n-button>
                    <n-button @click="printBarcode" :disabled="!formData.barcode" type="info" secondary>
                      <template #icon>
                        <n-icon><PrintOutline /></n-icon>
                      </template>
                    </n-button>
                  </n-input-group>
                </n-form-item>

                <n-form-item label="Место хранения (полка/ячейка)" path="storageBin">
                  <n-input v-model:value="formData.storageBin" placeholder="Например: А/2 или Полка 3, Ячейка 12" />
                </n-form-item>
              </n-gi>
            </n-grid>

          </n-gi>

          <!-- Правая колонка: Единица измерения и Изображение -->
          <n-gi :span="8">
            <div class="font-bold mb-4 border-b pb-1 text-gray-500 uppercase">ОСНОВНОЕ</div>

            <n-form-item label="Единица измерения" path="unit" required>
              <n-select v-model:value="formData.unit" :options="combinedUnitOptions" placeholder="Выберите единицу" />
            </n-form-item>

            <div class="font-bold mb-4 border-b pb-1 text-gray-500 mt-6">ИЗОБРАЖЕНИЕ</div>
            <n-form-item label="Фото материала">
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
                  <n-upload-dragger class="w-full py-6">
                    <div class="mb-2">
                      <n-icon size="40" :depth="3">
                        <CloudUploadOutline />
                      </n-icon>
                    </div>
                    <n-text style="font-size: 12px">
                      Нажми или перетащи
                    </n-text>
                  </n-upload-dragger>
                </n-upload>
              </div>
            </n-form-item>
          </n-gi>
        </n-grid>
      </div>

      <!-- Режим редактирования материала: информация из 1С + два локальных поля -->
      <div v-else-if="props.itemId && props.mode === 'material'" class="py-2">
        <div class="mb-6">
          <div class="font-bold mb-4 border-b pb-2 text-gray-500">ОСНОВНАЯ ИНФОРМАЦИЯ</div>

          <!-- Readonly информация из 1C -->
          <div class="grid grid-cols-2 gap-6 mb-4">
            <div>
              <div class="text-sm text-gray-400 mb-1">Название</div>
              <div class="text-base font-medium">{{ formData.name || 'Не указано' }}</div>
            </div>
            <div>
              <div class="text-sm text-gray-400 mb-1">Единица измерения</div>
              <div class="text-base font-medium">{{ getUnitLabel(formData.unit) || 'Не указано' }}</div>
            </div>
            <div>
              <div class="text-sm text-gray-400 mb-1">Категория</div>
              <div class="text-base font-medium">{{ getCategoryLabel(formData.categoryId) || 'Не указано' }}</div>
            </div>
            <div>
              <div class="text-sm text-gray-400 mb-1">Склад</div>
              <div class="text-base font-medium">{{ formData.warehouse || 'Не указано' }}</div>
            </div>
          </div>

          <!-- Два редактируемых локальных поля -->
          <div class="font-bold border-b pb-2 text-gray-500" style="margin-top: 24px; margin-bottom: 16px; padding-left: 16px;">РЕДАКТИРУЕМЫЕ ПОЛЯ</div>

          <div style="padding-left: 16px;">
            <n-form-item label="Штрих-код (QR-код)" path="barcode">
              <n-input-group>
                <n-input v-model:value="formData.barcode" placeholder="Введите штрих-код или QR-код" />
                <n-button @click="generateBarcode" type="primary" secondary>
                  <template #icon>
                    <n-icon><CloudUploadOutline /></n-icon>
                  </template>
                </n-button>
                <n-button @click="printBarcode" :disabled="!formData.barcode" type="info" secondary>
                  <template #icon>
                    <n-icon><PrintOutline /></n-icon>
                  </template>
                </n-button>
              </n-input-group>
            </n-form-item>

            <n-form-item label="Место хранения (полка/ячейка)" path="storageBin">
              <n-input v-model:value="formData.storageBin" placeholder="Например: Ячейка-1 или А/2" />
            </n-form-item>

            <n-form-item label="Фото материала">
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
                  <n-upload-dragger class="w-full py-6">
                    <div class="mb-2">
                      <n-icon size="40" :depth="3">
                        <CloudUploadOutline />
                      </n-icon>
                    </div>
                    <n-text style="font-size: 12px">
                      Нажми или перетащи
                    </n-text>
                  </n-upload-dragger>
                </n-upload>
              </div>
            </n-form-item>
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-3 mt-6 pt-4 border-t">
        <n-button @click="handleCancel">Отмена</n-button>
        <n-button v-if="!props.itemId || isDirty" type="primary" @click="handleSubmit" :loading="loading" size="large" class="px-8">
          Сохранить
        </n-button>
      </div>


    </n-form>

    <!-- Модальное окно для печати штрихкода -->
    <teleport to="body">
      <div v-if="showPrintModal" class="barcode-print-overlay" @click.self="closePrintModal">
        <div class="barcode-print-card">
          <div class="barcode-print-header">
            <span class="barcode-print-title">Печать штрихкода</span>
            <button class="barcode-print-close-icon" @click="closePrintModal">×</button>
          </div>

          <div class="barcode-print-body">
            <div class="scale-controls">
              <n-button size="small" @click="scale = Math.max(0.5, +(scale - 0.1).toFixed(1))">−</n-button>
              <n-slider v-model:value="scale" :min="0.5" :max="2" :step="0.1" style="width: 120px" />
              <span class="scale-value">{{ Math.round(scale * 100) }}%</span>
              <n-button size="small" @click="scale = Math.min(2, +(scale + 0.1).toFixed(1))">+</n-button>
              <n-switch v-model:value="landscape" size="small">
                <template #checked>Альбом</template>
                <template #unchecked>Портрет</template>
              </n-switch>
            </div>

            <div class="barcode-preview-wrapper">
              <div class="barcode-preview-scaler" :style="previewStyle">
                <div id="barcode-print-content" class="barcode-label" :style="labelStyle">
                  <div class="barcode-title">Штрих-код</div>
                  <svg id="barcode-preview" :style="barcodeSvgStyle"></svg>
                  <div class="barcode-item-name">{{ formData.name || 'Товар' }}</div>
                  <div v-if="printInfo" class="barcode-info">{{ printInfo }}</div>
                </div>
              </div>
            </div>

            <div class="print-info-input">
              <label class="text-sm text-gray-400 mb-2 block">Дополнительная информация для печати (опционально):</label>
              <n-input
                v-model:value="printInfo"
                type="textarea"
                placeholder="Например: лот, дата производства, и т.д."
                :rows="2"
              />
            </div>
          </div>

          <div class="barcode-print-footer">
            <n-space justify="end">
              <n-button @click="closePrintModal">Отмена</n-button>
              <n-button type="primary" @click="handlePrint">
                <template #icon>
                  <n-icon><PrintOutline /></n-icon>
                </template>
                Печать
              </n-button>
            </n-space>
          </div>
        </div>
      </div>
    </teleport>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, nextTick } from 'vue'
import type { FormInst, FormRules } from 'naive-ui'
import { useInventoryStore } from '@/stores/inventory'
import { useIntegrationStore } from '@/stores/integration'
import { useStockBalances } from '@/composables/useStockBalances'
import { useMessage } from 'naive-ui'
import type { InventoryItem } from '@/types'
import { API_BASE_URL } from '@/config/api'
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
  NDialog,
  NSlider,
  NSwitch,
  NSpace,
  type UploadFileInfo
} from 'naive-ui'
import { CloudUploadOutline, TrashOutline, PrintOutline } from '@vicons/ionicons5'

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
const integrationStore = useIntegrationStore()
const stockBalances = useStockBalances()
const message = useMessage()
const formRef = ref<FormInst | null>(null)
const loading = ref(false)
const initialDataStr = ref('')
const showPrintModal = ref(false)
const printInfo = ref('')
const scale = ref(1)
const landscape = ref(false)

const unitOptions1C = ref<{ label: string, value: string }[]>([])
const warehouseOptions1C = ref<{ label: string, value: string }[]>([])
const categoryOptions1C = ref<{ label: string, value: string }[]>([])

onMounted(async () => {
  try {
    const [units, warehouses, categories] = await Promise.all([
      stockBalances.fetchUnits(),
      stockBalances.fetchWarehouses(),
      stockBalances.fetchCategories()
    ])
    unitOptions1C.value = units.map((u: any) => ({ label: u.name, value: u.id }))
    warehouseOptions1C.value = warehouses.map((w: any) => ({ label: w.name, value: w.id }))
    categoryOptions1C.value = categories.map((c: any) => ({ label: c.name, value: c.id }))

    // Устанавливаем единицу измерения по умолчанию - первую из 1C если есть
    if (unitOptions1C.value.length > 0) {
      const defaultUnit = unitOptions1C.value.find(u => u.label === 'шт') || unitOptions1C.value[0]
      if (defaultUnit) {
        formData.unit = defaultUnit.value  // Это будет GUID из 1C
      }
    }

    // Если это создание нового и склады загружены, ставим Основной склад по умолчанию
    if (warehouseOptions1C.value.length > 0) {
      const mainWh = warehouseOptions1C.value.find(w =>
        w.label && (w.label.toLowerCase().includes('основной') ||
        w.label.toLowerCase().includes('склад'))
      ) || warehouseOptions1C.value[0]
      if (mainWh) {
        formData.warehouseId = mainWh.value
      }
    }

    // Не устанавливаем категорию по умолчанию - пусть пользователь выбирает
  } catch (e) {
    console.error('Ошибка загрузки данных из 1С:', e)
  }
})

const combinedUnitOptions = computed(() => {
  // Используем только единицы из 1C (у них есть реальные GUID)
  // Если 1C единиц нет, это ошибка - они должны загрузиться при монтировании
  return unitOptions1C.value
})

const title = computed(() => {
  if (props.itemId) return props.mode === 'product' ? 'Редактировать изделие' : 'Редактировать материал'
  return props.mode === 'product' ? 'Новое изделие' : 'Новый материал'
})

const formData = reactive({
  name: '',
  sku: '',
  barcode: '',
  categoryId: '',
  description: '',
  unit: '',  // Будет установлен при монтировании или в watch
  image: '',
  imageFileName: '', // Сохраняем оригинальное имя файла
  status: 'in_stock',
  currentStock: 0,
  minStock: 0,
  maxStock: 100,
  reserved: 0,
  location: '',
  storageBin: '', // Полка/Ячейка (только в БД, не в 1С)
  warehouse: '', // Название склада для отображения
  warehouseId: '', // Новый параметр: GUID склада в 1С
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
    formData.imageFileName = file.name;
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
        image: item.image || '',
        sku: item.sku || '',  // Артикул из 1С (не изменяется)
        barcode: item.barcode || '',  // Штрих-код из БД (локальное поле)
        unit: item.unit || item.unitId || '',  // unit (название) в приоритете перед unitId (GUID)
        warehouseId: item.warehouseId || '',  // warehouseId из 1C
        warehouse: item.warehouse || '',  // Название склада для отображения
        categoryId: item.categoryId || '',  // categoryId из 1C
        location: item.location || '',  // Место хранения из 1C
        storageBin: item.storageBin || ''  // Ячейка/полка из БД
      })
      initialDataStr.value = JSON.stringify(formData)
    }
  } else if (newShow && !props.itemId) {
    // Сброс формы для нового элемента
    Object.assign(formData, {
      name: '',
      sku: '',
      barcode: '',
      categoryId: '',
      description: '',
      unit: unitOptions1C.value.find(u => u.label === 'шт')?.value || unitOptions1C.value[0]?.value || 'шт',  // По умолчанию "шт"
      image: '',
      status: 'in_stock',
      currentStock: 0,
      minStock: 0,
      maxStock: 100,
      reserved: 0,
      location: '',
      storageBin: '',
      warehouse: 'Основной склад',  // Название склада по умолчанию
      warehouseId: '',  // GUID склада из 1C
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

const getUnitLabel = (unitId: string) => {
  return unitOptions1C.value.find(u => u.value === unitId)?.label || unitId
}

const getCategoryLabel = (categoryId: string) => {
  return categoryOptions1C.value.find(c => c.value === categoryId)?.label || categoryId
}

const getWarehouseLabel = (warehouseId: string) => {
  // Сначала ищем по GUID
  let found = warehouseOptions1C.value.find(w => w.value === warehouseId)
  if (found) return found.label

  // Последний вариант - показываем GUID если ничего не нашли
  return warehouseId || 'Не указано'
}

const handleCancel = () => {
  showModal.value = false
}

const generateBarcode = () => {
  const prefix = props.mode === 'product' ? 'PRD' : 'MAT'
  const year = new Date().getFullYear().toString().substring(2)
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  formData.barcode = `${prefix}-${year}-${random}`
}

const previewStyle = computed(() => ({
  transform: `scale(${scale.value})`,
  transformOrigin: 'center top'
}))

const barcodeSvgStyle = computed(() => ({
  height: landscape.value ? '50px' : '65px'
}))

const labelStyle = computed(() => ({
  width: landscape.value ? '104mm' : '68mm',
  height: landscape.value ? '68mm' : '104mm'
}))

// Генерация превью штрихкода через JsBarcode
const generateBarcodePreview = async () => {
  if (!showPrintModal.value || !formData.barcode) return

  // Динамически загружаем JsBarcode если нужно
  if (!(window as any).JsBarcode) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js'
      script.onload = () => resolve()
      script.onerror = () => reject()
      document.head.appendChild(script)
    })
  }

  nextTick(() => {
    const svg = document.getElementById('barcode-preview') as unknown as SVGElement | null
    if (svg && (window as any).JsBarcode) {
      try {
        // Увеличено на 80%
        const isLandscape = landscape.value
        ;(window as any).JsBarcode('#barcode-preview', formData.barcode, {
          format: 'CODE128',
          width: isLandscape ? 1.5 : 1.0,
          height: isLandscape ? 45 : 65,
          displayValue: false,
          margin: 2
        })
        // Принудительно устанавливаем высоту SVG и удаляем viewBox чтобы избежать масштабирования
        svg.removeAttribute('viewBox')
        svg.setAttribute('height', isLandscape ? '45' : '65')
      } catch (e) {
        console.error('Ошибка генерации штрихкода:', e)
      }
    }
  })
}

watch(() => showPrintModal.value, (val) => {
  if (val) {
    scale.value = 1
    landscape.value = false
    printInfo.value = ''
    // Снимаем фокус с полей основного модального окна, чтобы trap-focus не перехватывал его обратно
    if (document.activeElement && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    generateBarcodePreview()
  }
})

watch([scale, landscape], () => {
  generateBarcodePreview()
})

const printBarcode = () => {
  if (!formData.barcode) {
    message.warning('Сначала сгенерируйте штрих-код')
    return
  }
  printInfo.value = ''
  showPrintModal.value = true
}

const closePrintModal = () => {
  showPrintModal.value = false
}

const handlePrint = () => {
  if (!formData.barcode) {
    message.warning('Сначала сгенерируйте штрих-код')
    return
  }

  // Открываем popup синхронно (пока браузер считает это ответом на клик)
  const printWindow = window.open('', '_blank', 'popup,width=850,height=700,top=50,left=100')
  if (!printWindow) return

  // Закрываем модалку перед печатью, чтобы системный диалог Chrome
  // появился поверх окна, а не позади модалки с z-index: 99999
  closePrintModal()

  const barcode = formData.barcode || ''
  let itemName = (formData.name || 'Товар').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  // Обрезаем название до 40 символов (2 строки по 20 символов)
  if (itemName.length > 40) {
    itemName = itemName.substring(0, 37) + '...'
  }
  let additionalInfo = (printInfo.value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  // Обрезаем доп. информацию до 40 символов (2 строки по 20 символов)
  if (additionalInfo.length > 40) {
    additionalInfo = additionalInfo.substring(0, 37) + '...'
  }

  // Увеличено на 80%: 38×58mm → 68×104mm
  const pageSize = landscape.value ? '104mm 68mm' : '68mm 104mm'
  const labelW = landscape.value ? '104mm' : '68mm'
  const labelH = landscape.value ? '68mm' : '104mm'
  const barcodeWidth = landscape.value ? 1.5 : 1.0
  const barcodeHeight = landscape.value ? 45 : 65

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Печать штрихкода</title>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
        <style>
          @page { size: ${pageSize}; margin: 0; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: ${labelW}; height: ${labelH}; margin: 0; padding: 0; overflow: visible; }
          body { font-family: Arial, sans-serif; background: white; }
          .barcode-label { width: ${labelW}; height: ${labelH}; text-align: center; background: white; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3.6mm 5.4mm; box-sizing: border-box; gap: 1px; overflow: visible; }
          .qr-scaler { transform: scale(${scale.value}); transform-origin: center center; }
          #barcode, #barcode svg { width: auto !important; max-width: 100%; height: ${barcodeHeight}px !important; display: block; }
          .title { font-size: 16px; color: #666; line-height: 1; margin-bottom: 1px; flex-shrink: 0; }
          .item { font-size: 30px; font-weight: bold; letter-spacing: 0.3px; margin: 1px 0; font-family: monospace; color: #000; word-break: break-all; line-height: 1.2; flex-shrink: 0; max-width: 100%; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
          .info { font-size: 28px; font-weight: bold; letter-spacing: 0.3px; margin-top: 1px; font-family: monospace; color: #000; white-space: normal; text-align: center; line-height: 1.1; flex-shrink: 0; max-width: 100%; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
          @media print { html, body { margin: 0; padding: 0; width: ${labelW}; height: ${labelH}; } }
        </style>
      </head>
      <body>
        <div class="barcode-label">
          <div class="qr-scaler">
            <div class="title">Штрих-код</div>
            <svg id="barcode"></svg>
            <div class="item">${itemName}</div>
            ${additionalInfo ? `<div class="info">${additionalInfo}</div>` : ''}
          </div>
        </div>
        <script>
          window.onload = function() {
            try {
              JsBarcode("#barcode", "${barcode}", {
                format: "CODE128",
                width: ${barcodeWidth},
                height: ${barcodeHeight},
                displayValue: false,
                margin: 2
              });
              // Принудительно устанавливаем высоту SVG и удаляем viewBox
              var svg = document.getElementById("barcode");
              if (svg) {
                svg.removeAttribute("viewBox");
                svg.setAttribute("height", "${barcodeHeight}");
              }
              setTimeout(function() { window.print(); }, 100);
            } catch(e) {
              console.error("Ошибка:", e);
            }
          };
          window.onafterprint = function() {
            window.close();
          };
        <\/script>
      </body>
    </html>
  `)
  printWindow.document.close()

  // Сброс настроек после печати
  setTimeout(() => {
    scale.value = 1
    landscape.value = false
    printInfo.value = ''
  }, 500)
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

    // Если это новый элемент (нет itemId), отправляем в 1С
    let created1C = null;
    if (!props.itemId) {
      try {
        message.loading('Создание в 1С...');

        // unitId должен быть GUID (содержит дефисы)
        // Если это был выбран элемент из комбинированного списка, то formData.unit уже будет правильным значением
        let unitId = undefined;
        if (formData.unit && formData.unit.includes('-')) {
          unitId = formData.unit;
        }

        // Если categoryId выбрана в dropdown, она уже GUID - просто используем его как есть
        let categoryId = formData.categoryId || undefined;

        // ⚠️ НЕ отправляем локальные поля (sku, barcode, location, storageBin) в 1С!
        // Они сохраняются только в локальную БД через API endpoint /sklad/api/onec/stocks/{id}
        created1C = await integrationStore.createNomenclature({
          name: formData.name,
          sku: formData.sku || formData.barcode || `SKU-${Date.now()}`,
          unitId: unitId,
          categoryId: categoryId,
          image: formData.image,
          imageFileName: formData.imageFileName
        });

        // После создания синхронизируем материалы из 1С
        // Добавляем задержку чтобы материал успел создаться в 1C
        await new Promise(resolve => setTimeout(resolve, 2000))

        try {
          // Сначала выполняем полную синхронизацию
          await integrationStore.syncAll()
          console.log('✓ Sync completed, reloading stocks from API...')
        } catch (syncErr) {
          console.error('⚠️ Sync error:', syncErr);
        }

        // После синхронизации ВСЕГДА загружаем данные из API
        try {
          await inventoryStore.loadStocksFromApi()
          message.success('Номенклатура создана. Данные синхронизированы из 1С');
        } catch (loadErr) {
          console.error('⚠️ Failed to load stocks:', loadErr);
          message.success('Номенклатура создана в 1С (синхронизация завершится позже)');
        }
      } catch (err: any) {
        console.error('Ошибка при создании в 1С:', err);
        message.error(`Ошибка 1С: ${err.message}. Товар будет создан только локально.`);
      }
    }

    const item: Partial<InventoryItem> = {
      name: formData.name,
      sku: formData.sku,
      barcode: formData.barcode,
      categoryId: formData.categoryId,
      description: formData.description,
      unit: formData.unit,
      image: formData.image,
      imageFileName: formData.imageFileName,
      status: formData.status as 'in_stock' | 'low_stock' | 'out_of_stock' | 'reserved' | 'on_order' | 'blocked',
      currentStock: formData.currentStock,
      minStock: formData.minStock,
      maxStock: formData.maxStock,
      reserved: formData.reserved,
      location: formData.location,
      storageBin: formData.storageBin,
      warehouse: formData.warehouse,
      warehouseId: formData.warehouseId,
      purchasePrice: formData.purchasePrice,
      averagePrice: formData.averagePrice,
      lastPurchasePrice: formData.lastPurchasePrice,
      mainSupplier: formData.mainSupplier,
      supplierCode: formData.supplierCode,
      deliveryTime: formData.deliveryTime,
      minOrderQuantity: formData.minOrderQuantity,
      totalConsumed: formData.totalConsumed,
      popularity: formData.popularity,
      type: formData.type,
      id: props.itemId || created1C?.id || `ITEM-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      category: inventoryStore.categories.find(c => c.id === formData.categoryId)?.name || 'Прочее',
      available: formData.currentStock - formData.reserved,
      totalValue: formData.currentStock * formData.averagePrice
    }

    // Save local fields (barcode, storageBin, image) to local DB only
    const itemIdToUse = props.itemId || created1C?.id || item.id
    if (itemIdToUse && (formData.barcode || formData.storageBin || formData.image)) {
      try {
        const response = await fetch(`${API_BASE_URL}/onec/stocks/${itemIdToUse}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            barcode: formData.barcode || '',  // Штрих-код (локальное поле)
            storageBin: formData.storageBin || '',  // Место хранения (полка/ячейка)
            image: formData.image || ''  // Картинка (base64)
          })
        })
        if (response.ok) {
          console.log('✓ Local fields saved for', itemIdToUse)
          // Перезагружаем данные из API чтобы убедиться что они сохранены
          try {
            await inventoryStore.loadStocksFromApi()
            console.log('✓ Stocks reloaded after save')
          } catch (err) {
            console.warn('⚠️ Failed to reload stocks:', err)
          }
        } else {
          console.warn('⚠️ Failed to save local fields:', response.status)
        }
      } catch (err) {
        console.error('Error saving local fields:', err)
      }
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
        categoryId: '',
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
        popularity: 5,
        type: props.mode || 'material'
      })
    }
  } catch (err) {
    console.error(err)
    message.error('Пожалуйста, исправьте ошибки в форме')
    loading.value = false
  }
}
</script>

<style scoped>
.barcode-print-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.barcode-print-card {
  background: #2c2c32;
  border-radius: 8px;
  width: 500px;
  max-width: 90%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
}

.barcode-print-header {
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.barcode-print-title {
  font-size: 16px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
}

.barcode-print-close-icon {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 24px;
  cursor: pointer;
  line-height: 1;
}

.barcode-print-close-icon:hover {
  color: #fff;
}

.barcode-print-body {
  padding: 16px;
}

.barcode-print-footer {
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.barcode-preview-wrapper {
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 280px;
  max-height: 420px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  margin-bottom: 12px;
}

.barcode-preview-scaler {
  display: inline-block;
}

.barcode-label {
  padding: 3.6mm 5.4mm;
  background: #fff;
  color: #000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  overflow: hidden;
  border: 0.3mm solid #ddd;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  box-sizing: border-box;
  gap: 1px;
  width: 68mm;
  height: 104mm;
}

.barcode-title {
  font-size: 16px;
  color: #666;
  line-height: 1;
  margin-bottom: 1px;
  flex-shrink: 0;
}

.barcode-item-name {
  padding-top: 12px;
  font-size: 30px;
  font-weight: bold;
  letter-spacing: 0.3px;
  margin: 1px 0;
  font-family: monospace;
  color: #000;
  word-break: break-all;
  line-height: 1.2;
  flex-shrink: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.barcode-info {
  padding-top: 8px;
  font-size: 28px;
  font-weight: bold;
  letter-spacing: 0.3px;
  margin-top: 1px;
  font-family: monospace;
  color: #000;
  white-space: normal;
  text-align: center;
  line-height: 1.1;
  flex-shrink: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

#barcode-preview {
  width: auto !important;
  max-width: 100%;
  flex-shrink: 0;
  display: block;
}

.scale-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 12px;
}

.scale-value {
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  min-width: 44px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.print-info-input {
  margin-top: 8px;
}
</style>
