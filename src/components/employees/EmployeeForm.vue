<template>
  <n-form ref="formRef" :model="formData" :rules="rules" label-placement="top">
    <n-grid :cols="2" :x-gap="24">
      <!-- Основная информация -->
      <n-gi>
        <n-h3>Основная информация</n-h3>
        <n-form-item label="ФИО" path="name" required>
          <n-input v-model:value="formData.name" placeholder="Введите ФИО сотрудника" />
        </n-form-item>

        <n-form-item label="Email" path="email" required>
          <n-input v-model:value="formData.email" placeholder="email@company.com" />
        </n-form-item>

        <n-form-item label="Фото сотрудника" path="avatar">
          <div class="flex items-center gap-4">
            <n-avatar
              round
              :size="80"
              :src="formData.avatar"
              fallback-src="https://0x0.st/H-8W.png"
            />
            <n-upload
              @change="handleFileListChange"
              :max="1"
              accept="image/*"
              list-type="image"
              :show-file-list="false"
            >
              <n-button>Загрузить фото</n-button>
            </n-upload>
            <n-button v-if="formData.avatar" quaternary @click="formData.avatar = ''; formData.photo = ''">Удалить</n-button>
          </div>
        </n-form-item>

        <n-form-item label="Телефон" path="phone" required>
          <n-input v-model:value="formData.phone" placeholder="+7 (999) 999-99-99" />
        </n-form-item>

        <n-form-item label="Дата рождения" path="birthDate">
          <n-date-picker v-model:value="formData.birthDate" type="date" placeholder="Выберите дату"
            style="width: 100%" />
        </n-form-item>
      </n-gi>

      <!-- Рабочая информация -->
      <n-gi>
        <n-h3>Рабочая информация</n-h3>
        <n-form-item label="Должность" path="position" required>
          <n-input v-model:value="formData.position" placeholder="Например, Менеджер" />
        </n-form-item>

        <n-form-item label="Отдел" path="department" required>
          <n-select v-model:value="formData.department" :options="departmentOptions" placeholder="Выберите отдел" />
        </n-form-item>

        <n-form-item label="Роль" path="role" required>
          <n-select v-model:value="formData.role" :options="roleOptions" placeholder="Выберите роль" />
        </n-form-item>

        <n-form-item label="Статус" path="status" required>
          <n-select v-model:value="formData.status" :options="statusOptions" placeholder="Выберите статус" />
        </n-form-item>
      </n-gi>

      <!-- Финансы и даты -->
      <n-gi>
        <n-h3>Финансы</n-h3>
        <n-form-item label="Зарплата" path="salary" required>
          <n-input-number v-model:value="formData.salary" :min="0" :precision="0" placeholder="Введите зарплату"
            style="width: 100%">
            <template #suffix>₽/мес</template>
          </n-input-number>
        </n-form-item>

        <n-form-item label="Дата приема" path="hireDate" required>
          <n-date-picker v-model:value="formData.hireDate" type="date" placeholder="Выберите дату приема"
            style="width: 100%" />
        </n-form-item>
      </n-gi>

      <!-- Дополнительная информация -->
      <n-gi>
        <n-h3>Дополнительно</n-h3>
        <n-form-item label="Адрес" path="address">
          <n-input v-model:value="formData.address" placeholder="Адрес проживания" />
        </n-form-item>

        <n-form-item label="Навыки" path="skills">
          <n-dynamic-tags v-model:value="formData.skills" />
        </n-form-item>

        <n-form-item label="Примечания" path="notes">
          <n-input v-model:value="formData.notes" type="textarea" :rows="2" placeholder="Дополнительная информация" />
        </n-form-item>
      </n-gi>
    </n-grid>

    <div class="flex justify-end gap-3 mt-6">
      <n-button @click="$emit('cancel')">Отмена</n-button>
      <n-button type="primary" @click="handleSubmit" :loading="loading" :disabled="isReading">
        Сохранить
      </n-button>
    </div>
  </n-form>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import type { FormInst, FormRules, UploadFileInfo } from 'naive-ui'
import { useEmployeesStore } from '@/stores/employees'
import { useMessage } from 'naive-ui'
import type { Employee } from '@/types'
import {
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NSelect,
  NDatePicker,
  NButton,
  NH3,
  NGrid,
  NGi,
  NDynamicTags,
  NUpload,
  NAvatar
} from 'naive-ui'

const props = defineProps<{
  employeeId?: string | null
}>()

const emit = defineEmits<{
  submit: [data: Partial<Employee>]
  cancel: []
}>()

const employeesStore = useEmployeesStore()
const message = useMessage()
const formRef = ref<FormInst | null>(null)
const loading = ref(false)
const isReading = ref(false)

const handleFileListChange = (data: { fileList: UploadFileInfo[] }) => {
  const fileList = data.fileList
  if (fileList && fileList.length > 0) {
    const lastFile = fileList[fileList.length - 1]
    const file = lastFile?.file
    if (file) {
      isReading.value = true
      const reader = new FileReader()
      reader.onload = (e) => {
        const base64 = e.target?.result as string
        formData.avatar = base64
        formData.photo = base64
        isReading.value = false
      }
      reader.onerror = () => {
        console.error('❌ FileReader error')
        message.error('Ошибка при чтении файла')
        isReading.value = false
      }
      reader.readAsDataURL(file)
    }
  }
}

const formData = reactive({
  name: '',
  email: '',
  avatar: '',
  photo: '',
  phone: '',
  position: '',
  department: '',
  role: 'worker' as Employee['role'],
  status: 'active' as Employee['status'],
  salary: 50000,
  hireDate: new Date().getTime(),
  birthDate: null as number | null,
  address: '',
  skills: [] as string[],
  notes: ''
})

// Загрузка данных при редактировании
watch(() => props.employeeId, (newId) => {
  if (newId) {
    const employee = employeesStore.getEmployeeById(newId)
    if (employee) {
      // Маппинг данных из стора в форму
      formData.name = employee.name || ''
      formData.email = employee.email || ''
      formData.avatar = employee.avatar || employee.photo || ''
      formData.photo = employee.photo || employee.avatar || ''
      formData.phone = employee.phone || ''
      formData.position = employee.position || ''
      formData.department = employee.department || ''
      formData.role = employee.role || 'worker'
      formData.status = employee.status || 'active'
      formData.salary = employee.salary || 50000
      formData.hireDate = employee.hireDate ? new Date(employee.hireDate).getTime() : Date.now()
      formData.birthDate = employee.birthDate ? new Date(employee.birthDate).getTime() : null
      formData.address = employee.address || ''
      formData.skills = [...(employee.skills || [])]
      formData.notes = employee.notes || ''
    }
  } else {
    // Сброс формы для нового сотрудника
    formData.name = ''
    formData.email = ''
    formData.avatar = ''
    formData.photo = ''
    formData.phone = ''
    formData.position = ''
    formData.department = ''
    formData.role = 'worker'
    formData.status = 'active'
    formData.salary = 50000
    formData.hireDate = Date.now()
    formData.birthDate = null
    formData.address = ''
    formData.skills = []
    formData.notes = ''
  }
}, { immediate: true })

const departmentOptions = [
  { label: 'Производство', value: 'Производство' },
  { label: 'Склад', value: 'Склад' },
  { label: 'Продажи', value: 'Продажи' },
  { label: 'Финансы', value: 'Финансы' },
  { label: 'Логистика', value: 'Логистика' },
  { label: 'Дизайн', value: 'Дизайн' }
]

const roleOptions = [
  { label: 'Администратор', value: 'admin' },
  { label: 'Менеджер', value: 'manager' },
  { label: 'Рабочий', value: 'worker' },
  { label: 'Кладовщик', value: 'warehouse' },
  { label: 'Производство', value: 'production' }
]

const statusOptions = [
  { label: 'Активен', value: 'active' },
  { label: 'Неактивен', value: 'inactive' },
  { label: 'Отпуск', value: 'vacation' },
  { label: 'Больничный', value: 'sick' }
]

const rules: FormRules = {
  name: [
    { required: true, message: 'Введите ФИО', trigger: 'blur' },
    { min: 2, message: 'ФИО должно быть не менее 2 символов', trigger: 'blur' }
  ],
  email: [
    { required: true, message: 'Введите email', trigger: 'blur' },
    { type: 'email', message: 'Некорректный email', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: 'Введите телефон', trigger: 'blur' }
  ],
  position: [
    { required: true, message: 'Введите должность', trigger: 'blur' }
  ],
  department: [
    { required: true, message: 'Выберите отдел', trigger: 'change' }
  ],
  salary: [
    { required: true, type: 'number', min: 0, message: 'Зарплата должна быть положительной', trigger: 'blur' }
  ],
  hireDate: [
    { required: true, type: 'number', message: 'Выберите дату приема', trigger: 'change' }
  ]
}

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    loading.value = true

    // Создаем копию данных для отправки
    const employeeData = {
      ...formData,
      avatar: formData.avatar || formData.photo, // Убеждаемся что оба поля имеют значение
      photo: formData.avatar || formData.photo,
      hireDate: formData.hireDate ? new Date(formData.hireDate) : new Date(),
      birthDate: formData.birthDate ? new Date(formData.birthDate) : undefined
    }

    emit('submit', employeeData)
    loading.value = false
  } catch {
    message.error('Пожалуйста, исправьте ошибки в форме')
  }
}
</script>
