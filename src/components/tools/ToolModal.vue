<template>
  <n-modal v-model:show="showModal" preset="card" :title="title" class="w-200!" :bordered="false" size="huge">
    <n-form ref="formRef" :model="formData" :rules="rules" label-placement="top">
      <n-grid :cols="2" :x-gap="24">
        <!-- Основная информация -->
        <n-gi>
          <n-form-item label="Наименование инструмента" path="name" required>
            <n-input v-model:value="formData.name" placeholder="Введите название" />
          </n-form-item>

          <n-form-item label="Инвентарный номер" path="inventoryNumber">
            <n-input v-model:value="formData.inventoryNumber" placeholder="ИН-0000" />
          </n-form-item>

          <n-form-item label="Тип инструмента" path="type">
            <n-select v-model:value="formData.type" :options="typeOptions" placeholder="Выберите тип" />
          </n-form-item>

          <n-form-item label="Место хранения" path="location">
            <n-input v-model:value="formData.location" placeholder="Стеллаж/Ячейка" />
          </n-form-item>
        </n-gi>

        <n-gi>
          <n-form-item label="Модель" path="model">
            <n-input v-model:value="formData.model" placeholder="Бренд/Модель" />
          </n-form-item>

          <n-form-item label="Серийный номер" path="serialNumber">
            <n-input v-model:value="formData.serialNumber" placeholder="S/N" />
          </n-form-item>

          <n-form-item label="Статус" path="status" required>
            <n-select v-model:value="formData.status" :options="statusOptions" placeholder="Выберите статус" :disabled="userStore.isWorker" />
          </n-form-item>

          <n-form-item label="Стоимость" path="price">
            <n-input-number v-model:value="formData.price" :min="0" placeholder="0" class="w-full">
              <template #suffix>₽</template>
            </n-input-number>
          </n-form-item>
        </n-gi>
      </n-grid>

      <!-- Выдача инструмента -->
      <n-grid :cols="2" :x-gap="24" class="mt-6">
        <n-gi v-if="formData.status === 'issued'" :span="2">
          <n-form-item label="Кому выдан" path="issuedTo" required>
            <n-select 
              v-model:value="formData.issuedTo" 
              :options="employeeOptions" 
              placeholder="Выберите сотрудника" 
              filterable
              :disabled="userStore.isWorker"
              @update:value="handleEmployeeChange"
            />
          </n-form-item>
        </n-gi>

        <n-gi v-if="formData.status === 'repair'" :span="2">
          <n-form-item label="Описание поломки" path="breakdownDescription" required>
            <n-input
              v-model:value="formData.breakdownDescription"
              type="textarea"
              placeholder="Опишите, что случилось с инструментом..."
              :rows="4"
              :disabled="userStore.isWorker"
            />
          </n-form-item>
        </n-gi>

        <n-gi v-if="formData.issuedAt" :span="2">
          <n-text depth="3">Выдан: {{ formatDate(formData.issuedAt) }}</n-text>
        </n-gi>
      </n-grid>

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
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useMessage } from 'naive-ui'
import type { FormInst, FormRules } from 'naive-ui'
import { useToolsStore } from '@/stores/tools'
import { useEmployeesStore } from '@/stores/employees'
import { useUserStore } from '@/stores/user'
import type { Tool } from '@/types'
import {
  NModal,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NSelect,
  NGrid,
  NGi,
  NButton,
  NText
} from 'naive-ui'

const props = defineProps<{
  show: boolean
  toolId?: string | null
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  submit: [data: Partial<Tool>]
}>()

const toolsStore = useToolsStore()
const employeesStore = useEmployeesStore()
const userStore = useUserStore()
const message = useMessage()
const formRef = ref<FormInst | null>(null)
const loading = ref(false)

const showModal = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val)
})

const title = computed(() => props.toolId ? 'Редактировать инструмент' : 'Добавить новый инструмент')

const employeeOptions = computed(() => 
  employeesStore.employees.map(emp => ({
    label: emp.name,
    value: emp.id
  }))
)

const formData = reactive({
  name: '',
  inventoryNumber: '',
  serialNumber: '',
  type: 'hand_tool' as Tool['type'],
  model: '',
  manufacturer: '',
  status: 'in_stock' as Tool['status'],
  location: '',
  price: undefined as number | undefined,
  qrCode: '',
  issuedTo: undefined as string | undefined,
  issuedToName: undefined as string | undefined,
  issuedAt: undefined as Date | undefined,
  breakdownDescription: '' as string | undefined
})

const handleEmployeeChange = (value: string) => {
  const employee = employeesStore.employees.find(emp => emp.id === value)
  if (employee) {
    formData.issuedToName = employee.name
    formData.issuedAt = new Date()
  }
}

const typeOptions = [
  { label: 'Электроинструмент', value: 'power_tool' },
  { label: 'Ручной инструмент', value: 'hand_tool' },
  { label: 'Измерительный прибор', value: 'measuring' },
  { label: 'Оснастка/Шаблон', value: 'fixture' },
  { label: 'Контейнер/Тара', value: 'container' }
]

const statusOptions = [
  { label: 'На складе', value: 'in_stock' },
  { label: 'Выдано', value: 'issued' },
  { label: 'В ремонте', value: 'repair' },
  { label: 'Списано', value: 'written_off' }
]

const rules: FormRules = {
  name: [{ required: true, message: 'Введите название', trigger: 'blur' }],
  status: [{ required: true, message: 'Выберите статус', trigger: 'change' }],
  issuedTo: [{
    required: true,
    message: 'Выберите сотрудника',
    renderMessage: () => formData.status === 'issued' ? 'Выберите сотрудника' : '',
    trigger: ['blur', 'change'],
    validator: (_, value) => {
      if (formData.status === 'issued' && !value) {
        return new Error('Выберите сотрудника')
      }
      return true
    }
  }],
  breakdownDescription: [{
    required: true,
    message: 'Опишите поломку',
    trigger: ['blur', 'input'],
    validator: (_, value) => {
      if (formData.status === 'repair' && !value) {
        return new Error('Опишите поломку')
      }
      return true
    }
  }]
}

const updateFormData = () => {
  if (props.show) {
    if (props.toolId) {
      const tool = toolsStore.getToolById(props.toolId)
      if (tool) {
        // Очищаем форму от старых данных перед заполнением
        Object.keys(formData).forEach(key => {
          (formData as Record<string, unknown>)[key] = undefined
        })
        
        // Устанавливаем значения по умолчанию
        const defaults = {
          inventoryNumber: '',
          serialNumber: '',
          type: 'hand_tool',
          model: '',
          manufacturer: '',
          status: 'in_stock',
          location: '',
          price: undefined,
          qrCode: '',
          issuedTo: undefined,
          issuedToName: undefined,
          issuedAt: undefined,
          breakdownDescription: ''
        }
        
        // Сначала применяем значения из инструмента, перекрывая ими дефолты
        Object.assign(formData, defaults, tool)
      }
    } else {
      Object.assign(formData, {
        name: '',
        inventoryNumber: '',
        serialNumber: '',
        type: 'hand_tool',
        model: '',
        manufacturer: '',
        status: 'in_stock',
        location: '',
        price: undefined,
        qrCode: 'TOOL-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
        issuedTo: undefined,
        issuedToName: undefined,
        issuedAt: undefined,
        breakdownDescription: ''
      })
    }
  }
}

watch(() => props.show, () => updateFormData())
watch(() => props.toolId, () => updateFormData())
watch(() => toolsStore.tools, () => updateFormData(), { deep: false })

// Load employees when modal is shown
onMounted(async () => {
  if (employeesStore.employees.length === 0) {
    await employeesStore.loadEmployeesFromApi()
  }
})

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    loading.value = true
    
    emit('submit', { ...formData })
    
    // Close modal after emit (parent will handle API call)
    setTimeout(() => {
      loading.value = false
      showModal.value = false
    }, 300)
  } catch {
    message.error('Пожалуйста, заполните обязательные поля')
  }
}

const handleCancel = () => {
  showModal.value = false
}

const formatDate = (date: Date | string | undefined) => {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('ru-RU', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>
