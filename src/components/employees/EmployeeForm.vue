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
          <n-input v-model:value="formData.email" placeholder="email@company.com" type="email" />
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
      <n-button type="primary" @click="handleSubmit" :loading="loading">
        Сохранить
      </n-button>
    </div>
  </n-form>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import type { FormInst, FormRules } from 'naive-ui'
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
  NDynamicTags
} from 'naive-ui'

const emit = defineEmits<{
  submit: [data: any]
  cancel: []
}>()

const formRef = ref<FormInst | null>(null)
const loading = ref(false)

const formData = reactive({
  name: '',
  email: '',
  phone: '',
  position: '',
  department: '',
  role: 'worker' as const,
  status: 'active' as const,
  salary: 50000,
  hireDate: new Date().getTime(),
  birthDate: null as number | null,
  address: '',
  skills: [] as string[],
  notes: ''
})

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
    { required: true, message: 'Выберите дату приема', trigger: 'change' }
  ]
}

const handleSubmit = () => {
  formRef.value?.validate((errors) => {
    if (!errors) {
      loading.value = true

      const employeeData = {
        ...formData,
        hireDate: formData.hireDate ? new Date(formData.hireDate) : new Date(),
        birthDate: formData.birthDate ? new Date(formData.birthDate) : undefined
      }

      setTimeout(() => {
        emit('submit', employeeData)
        loading.value = false
      }, 1000)
    } else {
      window.$message?.error('Пожалуйста, исправьте ошибки в форме')
    }
  })
}
</script>
