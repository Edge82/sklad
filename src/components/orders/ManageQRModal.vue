<template>
  <n-modal
    :show="show"
    @update:show="$emit('update:show', $event)"
    preset="card"
    :title="`Управление кодами: ${itemName}`"
    style="width: 800px"
  >
    <div class="space-y-4">
      <div class="flex justify-between items-center">
        <n-text depth="3">
          Всего сгенерировано: {{ codes.length }}
        </n-text>
        <n-button type="primary" size="small" @click="handlePrintAll" :disabled="codes.length === 0">
          <template #icon>
            <n-icon><PrintOutline /></n-icon>
          </template>
          Печать всех
        </n-button>
      </div>

      <n-table size="small" striped>
        <thead>
          <tr>
            <th>Код</th>
            <th>Статус</th>
            <th>Дата генерации</th>
            <th>Кем создан</th>
            <th class="text-right">Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="code in codes" :key="code.id">
            <td>
              <n-text code>{{ code.code }}</n-text>
            </td>
            <td>
              <n-tag :type="getStatusType(code.status)" size="small">
                {{ getStatusLabel(code.status) }}
              </n-tag>
            </td>
            <td>{{ formatDate(code.generatedAt) }}</td>
            <td>{{ code.generatedBy }}</td>
            <td class="text-right">
              <n-space justify="end">
                <n-button quaternary size="tiny" type="primary" @click="handlePrint(code)">
                  <template #icon>
                    <n-icon><PrintOutline /></n-icon>
                  </template>
                </n-button>
                <n-button quaternary size="tiny" type="info" @click="handleEdit(code)">
                  <template #icon>
                    <n-icon><CreateOutline /></n-icon>
                  </template>
                </n-button>
                <n-button 
                  quaternary 
                  size="tiny" 
                  type="error" 
                  @click="handleRemove(code)"
                  :disabled="code.status === 'scanned' || code.status === 'shipped'"
                >
                  <template #icon>
                    <n-icon><TrashOutline /></n-icon>
                  </template>
                </n-button>
              </n-space>
            </td>
          </tr>
          <tr v-if="codes.length === 0">
            <td colspan="5" class="text-center py-4">
              <n-text depth="3">Коды еще не сгенерированы</n-text>
            </td>
          </tr>
        </tbody>
      </n-table>
    </div>

    <!-- Модальное окно редактирования -->
    <n-modal
      v-model:show="showEditModal"
      preset="dialog"
      title="Редактирование данных QR"
      positiveText="Сохранить"
      negativeText="Отмена"
      @positiveClick="saveEdit"
    >
      <n-form :model="editForm">
        <n-form-item label="Строка 1 (Обычно информация о заказе)">
          <n-input v-model:value="editForm.line1" placeholder="Введите текст" />
        </n-form-item>
        <n-form-item label="Строка 2 (Обычно название детали)">
          <n-input v-model:value="editForm.line2" placeholder="Введите текст" />
        </n-form-item>
      </n-form>
    </n-modal>

    <template #footer>
      <div class="flex justify-end">
        <n-button @click="$emit('update:show', false)">Закрыть</n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { computed, ref, reactive } from 'vue'
import { 
  NModal, 
  NTable, 
  NText, 
  NTag, 
  NButton, 
  NSpace, 
  NIcon,
  NInput,
  NForm,
  NFormItem,
  useDialog,
  useMessage 
} from 'naive-ui'
import { PrintOutline, TrashOutline, CreateOutline } from '@vicons/ionicons5'
import { useQRCodesStore } from '@/stores/qrCodes'
import type { QRCode } from '@/types'

const props = defineProps<{
  show: boolean
  orderId: string
  productId: string
  itemName: string
}>()

defineEmits(['update:show'])

const qrStore = useQRCodesStore()
const dialog = useDialog()
const message = useMessage()

const codes = computed(() => {
  return qrStore.qrCodes.filter(q => q.orderId === props.orderId && q.productId === props.productId)
})

const showEditModal = ref(false)
const editingCode = ref<QRCode | null>(null)
const editForm = reactive({
  line1: '',
  line2: ''
})

const getStatusType = (status: string) => {
  switch (status) {
    case 'generated': return 'default'
    case 'printed': return 'info'
    case 'scanned': return 'success'
    case 'shipped': return 'primary'
    default: return 'default'
  }
}

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = {
    'generated': 'Создан',
    'printed': 'Распечатан',
    'scanned': 'На складе',
    'shipped': 'Отгружен'
  }
  return map[status] || status
}

const formatDate = (date: string | Date | number | undefined) => {
  if (!date) return '-'
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}

const handlePrint = (code: QRCode) => {
  message.info(`Печать кода: ${code.code}`)
}

const handlePrintAll = () => {
  message.info(`Отправлено на печать: ${codes.value.length} шт.`)
}

const handleRemove = (code: QRCode) => {
  dialog.warning({
    title: 'Удаление кода',
    content: `Вы уверены, что хотите удалить код ${code.code}? Это действие нельзя отменить.`,
    positiveText: 'Удалить',
    negativeText: 'Отмена',
    onPositiveClick: () => {
      qrStore.removeQRCode(code.id)
      message.success('Код удален')
    }
  })
}

const handleEdit = (code: QRCode) => {
  editingCode.value = code
  editForm.line1 = code.label?.line1 || ''
  editForm.line2 = code.label?.line2 || ''
  showEditModal.value = true
}

const saveEdit = () => {
  if (editingCode.value) {
    editingCode.value.label = {
      line1: editForm.line1,
      line2: editForm.line2
    }
    showEditModal.value = false
    message.success('Данные обновлены')
  }
}
</script>
