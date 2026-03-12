<template>
  <n-modal
    :show="show"
    @update:show="$emit('close')"
    preset="card"
    :title="`Управление QR-кодами заказа: ${orderNumber}`"
    style="width: 900px"
    :auto-focus="false"
  >
    <n-tabs type="line" animated>
      <!-- Вкладка со списком существующих кодов -->
      <n-tab-pane name="list" tab="Список кодов">
        <div class="space-y-4">
          <div class="flex justify-between items-center mb-4">
            <n-text depth="3">
              Всего сгенерировано для заказа: {{ orderCodes.length }}
            </n-text>
            <n-space>
              <n-button type="primary" size="small" @click="handlePrintAll" :disabled="orderCodes.length === 0">
                <template #icon>
                  <n-icon><PrintOutline /></n-icon>
                </template>
                Печать всех
              </n-button>
            </n-space>
          </div>

          <n-table size="small" striped>
            <thead>
              <tr>
                <th>Код</th>
                <th>Позиция</th>
                <th>Информация</th>
                <th>Статус</th>
                <th>Дата</th>
                <th class="text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="code in orderCodes" :key="code.id">
                <td>
                  <n-text code>{{ code.id.substring(0, 8) }}...</n-text>
                </td>
                <td>{{ code.productName || '—' }}</td>
                <td>
                  <n-text v-if="code.label?.info && code.label.info !== code.productName">
                    {{ code.label.info }}
                  </n-text>
                  <n-text v-else depth="3" italic>—</n-text>
                </td>
                <td>
                  <n-tag :type="getStatusType(code.status)" size="small">
                    {{ getStatusLabel(code.status) }}
                  </n-tag>
                </td>
                <td>{{ formatDate(code.generatedAt) }}</td>
                <td class="text-right">
                  <n-space justify="end">
                    <n-button quaternary size="tiny" type="primary" @click="handlePrint(code)">
                      <template #icon>
                        <n-icon><PrintOutline /></n-icon>
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
              <tr v-if="orderCodes.length === 0">
                <td colspan="6" class="text-center py-8">
                  <n-empty description="Коды для этого заказа еще не сгенерированы" />
                </td>
              </tr>
            </tbody>
          </n-table>
        </div>
      </n-tab-pane>

      <!-- Вкладка генерации новых кодов -->
      <n-tab-pane name="generate" tab="Генерация">
        <div class="py-4">
          <n-form :model="genForm" label-placement="left" label-width="120">
            <n-form-item label="Позиция">
              <n-select 
                v-model:value="genForm.productId" 
                :options="productOptions" 
                placeholder="Выберите позицию из заказа" 
              />
            </n-form-item>
            <n-form-item label="Количество">
              <n-input-number v-model:value="genForm.count" :min="1" :max="1000" />
            </n-form-item>
            <n-form-item label="Название детали">
              <n-input v-model:value="genForm.productName" placeholder="Название для системы" />
            </n-form-item>
            <n-form-item label="Инфо на этикетке">
              <n-input v-model:value="genForm.labelInfo" placeholder="Дополнительная информация" />
            </n-form-item>
            
            <n-divider>Предпросмотр надписи</n-divider>
            <div class="qr-preview-box mb-6">
              <div class="preview-line">Заказ: {{ orderNumber }}</div>
              <div class="preview-name text-lg">{{ previewName }}</div>
              <div v-if="genForm.labelInfo" class="preview-info opacity-70">{{ genForm.labelInfo }}</div>
              <div class="text-[10px] opacity-50 mt-2">Будет создано {{ genForm.count }} шт.</div>
            </div>

            <div class="flex justify-end" style="margin-top: 12px">
              <n-space>
                <n-button 
                  type="primary" 
                  size="large"
                  @click="handleGenerate" 
                  :disabled="!genForm.productId"
                  :loading="isGenerating"
                >
                  <template #icon>
                    <n-icon><QrCodeOutline /></n-icon>
                  </template>
                  Сгенерировать код
                </n-button>
                
                <n-button 
                  type="info" 
                  size="large"
                  @click="handlePrintLastGenerated" 
                  :disabled="!canPrintLast"
                >
                  <template #icon>
                    <n-icon><PrintOutline /></n-icon>
                  </template>
                  Распечатать код
                </n-button>
              </n-space>
            </div>
          </n-form>
        </div>
      </n-tab-pane>
    </n-tabs>

    <template #footer>
      <div class="flex justify-end">
        <n-button @click="$emit('close')">Закрыть</n-button>
      </div>
    </template>
  </n-modal>

  <!-- Модальное окно самой печати (превью и отправка на принтер) -->
  <QRPrintModal
    v-model:show="showSinglePrintModal"
    :title="singlePrintData.title"
    :code="singlePrintData.code"
    :description="singlePrintData.description"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { 
  NModal, NTabs, NTabPane, NTable, NText, NTag, NButton, 
  NSpace, NIcon, NInputNumber, NForm, NFormItem, NSelect, 
  NDivider, NEmpty, NInput, useDialog, useMessage 
} from 'naive-ui'
import { 
  PrintOutline, TrashOutline, QrCodeOutline 
} from '@vicons/ionicons5'
import QRPrintModal from '@/components/common/QRPrintModal.vue'
import { useQRCodesStore } from '@/stores/qrCodes'
import { useUserStore } from '@/stores/user'
import type { OrderItem, QRCode } from '@/types'

const props = defineProps<{
  show: boolean
  orderId: string
  orderNumber: string
  items: OrderItem[]
}>()

const emit = defineEmits(['close', 'updated'])

const qrStore = useQRCodesStore()
const userStore = useUserStore()
const dialog = useDialog()
const message = useMessage()

const isGenerating = ref(false)
const lastGeneratedCodes = ref<QRCode[]>([])

// Форма генерации
const genForm = ref({
  productId: null as string | null,
  count: 1,
  productName: '',
  labelInfo: ''
})

const showSinglePrintModal = ref(false)
const singlePrintData = ref({
  title: '',
  code: '',
  description: ''
})

const canPrintLast = computed(() => lastGeneratedCodes.value.length > 0)

// При смене позиции обновляем предлагаемое название и инфо
watch(() => genForm.value.productId, (newId) => {
  if (newId) {
    const item = props.items.find(i => (i.productId || i.id) === newId)
    if (item) {
      genForm.value.productName = item.productName || item.itemName || ''
      genForm.value.labelInfo = ''
    }
  }
})

// Список кодов именно для этого заказа
const orderCodes = computed(() => {
  return qrStore.qrCodes.filter(q => q.orderId === props.orderId)
})

const productOptions = computed(() => 
  props.items.map(item => ({ 
    label: `${item.productName || item.itemName} (в заказе: ${item.quantity} ${item.unit || 'шт.'})`, 
    value: item.productId || item.id 
  }))
)

// Название для предпросмотра
const previewName = computed(() => {
  return genForm.value.productName || '...'
})

// Авто-выбор если позиция одна
onMounted(() => {
  if (props.items.length === 1) {
    const item = props.items[0]
    if (item) {
      genForm.value.productId = item.productId || item.id
      genForm.value.productName = item.productName || item.itemName || ''
      genForm.value.labelInfo = ''
    }
  }
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

const formatDate = (date: any) => {
  if (!date) return '-'
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}

const handleRemove = (code: QRCode) => {
  dialog.warning({
    title: 'Удаление кода',
    content: `Вы уверены, что хотите удалить код для ${code.productName}?`,
    positiveText: 'Удалить',
    negativeText: 'Отмена',
    onPositiveClick: () => {
      qrStore.removeQRCode(code.id)
      message.success('Код удален')
    }
  })
}

const handlePrint = (code: QRCode) => {
  // Выводим инфо только если оно заполнено и отличается от названия детали
  const hasExtraInfo = code.label?.info && code.label.info.trim() !== '' && code.label.info !== code.productName
  
  singlePrintData.value = {
    title: code.orderNumber,
    code: code.code,
    description: hasExtraInfo ? `${code.productName}\n${code.label.info}` : code.productName
  }
  showSinglePrintModal.value = true
}

const handlePrintAll = () => {
  if (orderCodes.value.length === 0) return
  
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    message.error('Заблокировано всплывающее окно. Разрешите его для печати.')
    return
  }

  const itemsHtml = orderCodes.value.map(code => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(code.code)}`
    
    // Проверяем наличие доп. информации, отличной от названия
    const info = code.label?.info ? code.label.info.trim() : ''
    const showInfo = info !== '' && info !== code.productName
    
    return `
      <div class="qr-label">
        <img src="${qrUrl}" class="qr-image" />
        <div class="label-title">${code.orderNumber}</div>
        <div class="qr-product-name">${code.productName || ''}</div>
        ${showInfo ? `<div class="qr-description">${info}</div>` : ''}
      </div>
    `
  }).join('<div class="page-break"></div>')

  printWindow.document.write(`
    <html>
      <head>
        <title>Печать всех QR-кодов заказа ${props.orderNumber}</title>
        <style>
          body { 
            font-family: sans-serif; 
            margin: 0; 
            padding: 0;
          }
          .qr-label { 
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center; 
            padding: 10px; 
            width: 280px;
            height: 380px;
            margin: 0 auto;
            box-sizing: border-box;
          }
          .qr-image { 
            width: 250px; 
            height: 250px; 
            margin-bottom: 10px; 
          }
          .label-title { 
            font-size: 18px; 
            font-weight: bold; 
            margin-bottom: 5px;
            width: 100%;
          }
          .qr-product-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .qr-description { 
            font-family: monospace;
            font-size: 14px; 
            font-weight: normal;
          }
          .page-break {
            page-break-after: always;
          }
          @media print {
            .qr-label {
              height: 100vh;
              width: 100vw;
            }
          }
        </style>
      </head>
      <body>
        ${itemsHtml}
        <script>
          window.onload = () => {
            window.print();
            window.close();
          };
        <\/script>
      </body>
    </html>
  `)
  printWindow.document.close()
}

const handlePrintLastGenerated = () => {
  const code = lastGeneratedCodes.value[0]
  if (lastGeneratedCodes.value.length === 1 && code) {
    handlePrint(code)
  } else if (lastGeneratedCodes.value.length > 1) {
    message.info(`Отправка пачки на печать: ${lastGeneratedCodes.value.length} шт.`)
  }
}

async function handleGenerate() {
  if (!genForm.value.productId) return
  
  const item = props.items.find(i => (i.productId || i.id) === genForm.value.productId)
  if (!item) return

  isGenerating.value = true
  try {
    const newCodes = await qrStore.generateQRCodes({
      orderId: props.orderId,
      orderNumber: props.orderNumber,
      productId: genForm.value.productId,
      productName: genForm.value.productName || item?.productName || item?.itemName || 'Без названия',
      labelInfo: genForm.value.labelInfo,
      count: genForm.value.count,
      generatedBy: userStore.user?.name || 'Система'
    })
    
    lastGeneratedCodes.value = newCodes
    message.success(`Сгенерировано ${genForm.value.count} кодов`)
    emit('updated')
  } catch (e) {
    message.error('Ошибка при генерации')
  } finally {
    isGenerating.value = false
  }
}
</script>

<style scoped>
.qr-preview-box {
  border: 1px dashed rgba(255, 255, 255, 0.2);
  padding: 16px;
  text-align: center;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}
.preview-line {
  font-weight: bold;
  margin-bottom: 4px;
}
</style>
