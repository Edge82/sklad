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
                  </n-input-group>
                </n-form-item>

                <n-form-item label="Место хранения (полка/ячейка)" path="storageBin">
                  <n-input v-model:value="formData.storageBin" placeholder="Например: А/2 или Полка 3, Ячейка 12" />
                </n-form-item>
              </n-gi>
            </n-grid>

          </n-gi>

          <!-- Правая колонка: Единица измерения -->
          <n-gi :span="8" class="p-4 rounded-lg">
            <div class="font-bold mb-4 border-b pb-1 text-gray-500 uppercase">ОСНОВНОЕ</div>
            
            <n-form-item label="Единица измерения" path="unit" required>
              <n-select v-model:value="formData.unit" :options="combinedUnitOptions" placeholder="Выберите единицу" />
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
              <div class="text-base font-medium">{{ getWarehouseLabel(formData.warehouseId) || 'Не указано' }}</div>
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
              </n-input-group>
            </n-form-item>

            <n-form-item label="Место хранения (полка/ячейка)" path="storageBin">
              <n-input v-model:value="formData.storageBin" placeholder="Например: Ячейка-1 или А/2" />
            </n-form-item>
          </div>
        </div>
      </div>

      <!-- Режим изделий (product) - остаётся как было -->
      <div v-else class="py-2">
        <n-grid :cols="24" :x-gap="24">
          <n-gi :span="16">
            <n-grid :cols="2" :x-gap="12">
              <n-gi>
                <div class="font-bold mb-4 border-b pb-1 text-gray-500">ОСНОВНАЯ ИНФОРМАЦИЯ</div>
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
import { ref, reactive, computed, watch, onMounted } from 'vue'
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
const integrationStore = useIntegrationStore()
const stockBalances = useStockBalances()
const message = useMessage()
const formRef = ref<FormInst | null>(null)
const loading = ref(false)
const initialDataStr = ref('')

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
    unitOptions1C.value = units.map(u => ({ label: u.name, value: u.id }))
    warehouseOptions1C.value = warehouses.map(w => ({ label: w.name, value: w.id }))
    categoryOptions1C.value = categories.map(c => ({ label: c.name, value: c.id }))
    
    // Устанавливаем единицу измерения по умолчанию - первую из 1C если есть
    if (unitOptions1C.value.length > 0) {
      const defaultUnit = unitOptions1C.value.find(u => u.label === 'шт') || unitOptions1C.value[0]
      formData.unit = defaultUnit.value  // Это будет GUID из 1C
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
  
  // Если не нашли по GUID, используем название из formData (уже загружено из API)
  if (formData.warehouse) return formData.warehouse
  
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
          unitId: unitId,
          categoryId: categoryId,
          image: formData.image,
          imageFileName: formData.imageFileName
        });
        
        // После создания синхронизируем материалы из 1С
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

    const item = {
      ...formData,
      id: props.itemId || created1C?.id || `ITEM-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      category: inventoryStore.categories.find(c => c.id === formData.categoryId)?.name || 'Прочее',
      available: formData.currentStock - formData.reserved,
      totalValue: formData.currentStock * formData.averagePrice
    }
    
    // Save local fields (barcode, storageBin) to local DB only
    const itemIdToUse = props.itemId || created1C?.id || item.id
    if (itemIdToUse && (formData.barcode || formData.storageBin)) {
      try {
        const response = await fetch(`${API_BASE_URL}/onec/stocks/${itemIdToUse}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            barcode: formData.barcode || '',  // Штрих-код (локальное поле)
            storageBin: formData.storageBin || ''  // Место хранения (полка/ячейка)
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
