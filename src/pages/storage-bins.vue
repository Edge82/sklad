<template>
  <div class="storage-bins-page h-full">
    <n-card :bordered="false" class="h-full flex flex-col">
      <template #header>
        <div class="flex items-center justify-between">
          <span>Справочник — Место хранения готовой продукции</span>
          <n-button type="primary" @click="showAddModal">
            Добавить место хранения
          </n-button>
        </div>
      </template>

      <div v-if="loading" class="flex items-center justify-center py-8">
        <n-spin size="large" />
      </div>

      <n-data-table
        v-else
        :columns="columns"
        :data="storageBins"
        :pagination="false"
        :scroll-x="600"
        size="small"
      />
    </n-card>

    <!-- Модальное окно добавления/редактирования -->
    <n-modal v-model:show="modalVisible" preset="dialog" :title="editingId ? 'Редактировать' : 'Добавить место хранения'" @close="closeModal">
      <n-form ref="formRef" :model="form" :rules="formRules" label-placement="top">
        <n-form-item label="Название" path="name">
          <n-input v-model:value="form.name" placeholder="Например: Стеллаж А-1" />
        </n-form-item>
        <n-form-item label="Примечание" path="notes">
          <n-input v-model:value="form.notes" placeholder="Необязательно" type="textarea" :rows="2" />
        </n-form-item>
      </n-form>
      <template #action>
        <n-space>
          <n-button @click="closeModal">Отмена</n-button>
          <n-button type="primary" :loading="saving" @click="save">
            {{ editingId ? 'Сохранить' : 'Добавить' }}
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, h, onMounted, onActivated } from 'vue'
import { NCard, NButton, NDataTable, NSpin, NModal, NForm, NFormItem, NInput, NSpace, NTag, NIcon } from 'naive-ui'
import { TrashOutline, CreateOutline } from '@vicons/ionicons5'
import { useMessage, useDialog } from 'naive-ui'
import type { DataTableColumns, FormInst, FormRule } from 'naive-ui'
import { API_BASE_URL } from '@/config/api'

const message = useMessage()
const dialog = useDialog()

interface StorageBin {
  id: number
  name: string
  notes: string
  created_at: string
}

const storageBins = ref<StorageBin[]>([])
const loading = ref(false)
const modalVisible = ref(false)
const editingId = ref<number | null>(null)
const saving = ref(false)
const formRef = ref<FormInst | null>(null)

const form = ref({
  name: '',
  notes: ''
})

const formRules = {
  name: {
    required: true,
    message: 'Введите название',
    trigger: 'blur'
  }
}

const loadStorageBins = async () => {
  loading.value = true
  try {
    const res = await fetch(`${API_BASE_URL}/storage-bins`)
    if (res.ok) {
      const data = await res.json()
      storageBins.value = data.storageBins || []
    }
  } catch (err) {
    console.error('Error loading storage bins:', err)
  } finally {
    loading.value = false
  }
}

const showAddModal = () => {
  editingId.value = null
  form.value = { name: '', notes: '' }
  modalVisible.value = true
}

const showEditModal = (bin: StorageBin) => {
  editingId.value = bin.id
  form.value = { name: bin.name, notes: bin.notes || '' }
  modalVisible.value = true
}

const closeModal = () => {
  modalVisible.value = false
  editingId.value = null
}

const save = async () => {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    const url = editingId.value
      ? `${API_BASE_URL}/storage-bins/${editingId.value}`
      : `${API_BASE_URL}/storage-bins`
    const method = editingId.value ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Ошибка сохранения')
    }

    message.success(editingId.value ? 'Место хранения обновлено' : 'Место хранения добавлено')
    closeModal()
    await loadStorageBins()
  } catch (err: any) {
    message.error(err.message || 'Не удалось сохранить')
  } finally {
    saving.value = false
  }
}

const deleteBin = (bin: StorageBin) => {
  dialog.warning({
    title: 'Удаление',
    content: `Удалить место хранения «${bin.name}»?`,
    positiveText: 'Удалить',
    negativeText: 'Отмена',
    onPositiveClick: async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/storage-bins/${bin.id}`, {
          method: 'DELETE'
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Ошибка удаления')
        }
        message.success('Место хранения удалено')
        await loadStorageBins()
      } catch (err: any) {
        message.error(err.message || 'Не удалось удалить')
      }
    }
  })
}

const columns: DataTableColumns<StorageBin> = [
  {
    title: 'Название',
    key: 'name',
    width: 200
  },
  {
    title: 'Примечание',
    key: 'notes',
    ellipsis: {
      tooltip: true
    }
  },
  {
    title: 'Создано',
    key: 'created_at',
    width: 180,
    render: (row) => {
      return new Date(row.created_at).toLocaleString('ru-RU')
    }
  },
  {
    title: 'Действия',
    key: 'actions',
    width: 120,
    render: (row) => {
      return h(NSpace, {}, {
        default: () => [
          h(NButton, {
            size: 'small',
            quaternary: true,
            renderIcon: () => h(NIcon, null, { default: () => h(CreateOutline) }),
            onClick: () => showEditModal(row)
          }),
          h(NButton, {
            size: 'small',
            type: 'error',
            quaternary: true,
            renderIcon: () => h(NIcon, null, { default: () => h(TrashOutline) }),
            onClick: () => deleteBin(row)
          })
        ]
      })
    }
  }
]

onMounted(() => {
  loadStorageBins()
})

onActivated(() => {
  loadStorageBins()
})
</script>

<style scoped>
.storage-bins-page {
  padding: 16px;
}
</style>
