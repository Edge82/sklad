<template>
  <!-- Модальное окно самой печати (превью и отправка на принтер) -->
  <QRPrintModal
    :show="showSinglePrintModal"
    @update:show="handleClosePrint"
    :title="singlePrintData.title"
    :code="singlePrintData.code"
    :description="singlePrintData.description"
  />

  <n-modal
    id="qr-manager-modal"
    :show="show"
    @update:show="$emit('close')"
    preset="card"
    :title="`Управление QR-кодами заказа: ${orderNumber}`"
    class="w-200!"
    :auto-focus="false"
    :display-directive="'show'"
    :mask-closable="false"
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
                  <n-text code>{{ code.id }}</n-text>
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
                v-model:value="displayProductId" 
                :options="productOptions" 
                placeholder="Выберите позицию из заказа" 
                filterable
              />
            </n-form-item>
            <n-form-item label="Количество">
              <n-input-number v-model:value="genForm.count" :min="1" :max="1000" />
            </n-form-item>
            <n-form-item label="Инфо на этикетке">
              <n-input 
                v-model:value="genForm.labelInfo" 
                placeholder="Дополнительная информация" 
                clearable
                class="label-info-input"
              />
            </n-form-item>
            
            <n-divider>Предпросмотр надписи</n-divider>
            <div class="qr-preview-box mb-6">
              <div class="preview-line">Заказ: {{ orderNumber }}</div>
              <div class="preview-name text-lg">{{ previewName }}</div>
              <div v-if="genForm.labelInfo" class="preview-info opacity-70">{{ genForm.labelInfo }}</div>
              <div class="text-[10px] opacity-50 mt-2">Будет создано {{ genForm.count }} шт.</div>
            </div>

            <div class="flex justify-end mt-3">
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
                  @click="handleGenerateAndPrint" 
                  :disabled="!genForm.productId"
                  :loading="isGenerating"
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

  <!-- Скрытый iframe для тихой печати, чтобы не открывать новые вкладки -->
  <iframe id="print-iframe" style="position: absolute; width: 0; height: 0; border: none; visibility: hidden;"></iframe>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { 
  NModal, NTabs, NTabPane, NTable, NText, NTag, NButton, 
  NSpace, NIcon, NInputNumber, NForm, NFormItem, NSelect, 
  NDivider, NEmpty, NInput, useDialog, useMessage 
} from 'naive-ui'
import { 
  PrintOutline, TrashOutline, QrCodeOutline 
} from '@vicons/ionicons5'
import QRCode from 'qrcode'
import QRPrintModal from '@/components/common/QRPrintModal.vue'
import { useQRCodesStore } from '@/stores/qrCodes'
import { useUserStore } from '@/stores/user'
import type { OrderItem, QRCode as QRType } from '@/types'

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
const lastGeneratedCodes = ref<QRType[]>([])

const handleClosePrint = (val: boolean) => {
  showSinglePrintModal.value = val
}

const restoreFocus = () => {
  const inputs = document.querySelectorAll('.label-info-input input')
  inputs.forEach(el => {
    if (el instanceof HTMLInputElement) {
      el.blur()
      setTimeout(() => el.focus(), 10)
    }
  })
}

// Следим за возвращением фокуса во вкладку
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible' && props.show) {
    setTimeout(restoreFocus, 300)
  }
}

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

// Обрабатываем ситуацию, когда в productId попадает некрасивый ID (UUID) вместо названия
const displayProductId = computed({
  get: () => {
    const id = genForm.value.productId
    if (!id) return null
    // Если id есть в списке опций, возвращаем его (Naive UI сам подставит label)
    if (productOptions.value.some(opt => opt.value === id)) return id
    // Если id нет в списке, ищем его в props.items и берем нормальное имя
    const item = props.items.find(i => (i.productId || i.id) === id)
    return item ? (item.productName || item.itemName) : id
  },
  set: (val) => {
    genForm.value.productId = val
  }
})

// Название для предпросмотра
const previewName = computed(() => {
  return genForm.value.productName || '...'
})

// Авто-выбор если позиция одна
onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('focus', restoreFocus)

  if (props.items.length === 1) {
    const item = props.items[0]
    if (item) {
      genForm.value.productId = item.productId || item.id
      genForm.value.productName = item.productName || item.itemName || ''
      genForm.value.labelInfo = ''
    }
  }
})

// При открытии модалки (props.show становится true) сбрасываем форму
watch(() => props.show, (isShown) => {
  if (isShown) {
    genForm.value.productId = null
    genForm.value.productName = ''
    genForm.value.labelInfo = ''
    genForm.value.count = 1
    lastGeneratedCodes.value = []

    // Если в заказе всего одна позиция, выбираем её сразу
    if (props.items.length === 1) {
      const item = props.items[0]
      genForm.value.productId = item.productId || item.id
      genForm.value.productName = item.productName || item.itemName || ''
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

const formatDate = (date: string | number | Date) => {
  if (!date) return '-'
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}

const handleRemove = (code: QRType) => {
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

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('focus', restoreFocus)
})

const handlePrint = async (code: QRType) => {
  const isExtraInfo = code.label?.info && code.label.info.trim() !== '' && code.label.info !== code.productName
  const infoText = isExtraInfo ? code.label.info : ''
  
  const qrDataUrl = await QRCode.toDataURL(code.code, { 
    width: 300, 
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' }
  })

  const printIframe = document.getElementById('print-iframe') as HTMLIFrameElement
  if (!printIframe) return

  const doc = printIframe.contentWindow?.document
  if (!doc) return

  doc.open()
  doc.write(`
    <html>
      <head>
        <style>
          @page { margin: 0; size: auto; }
          body { font-family: sans-serif; margin: 0; padding: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
          .qr-image { width: 200px; height: 200px; }
          .label-title { font-size: 16px; font-weight: bold; margin-top: 5px; }
          .product-name { font-size: 14px; margin-top: 2px; }
          .info { font-size: 12px; font-family: monospace; margin-top: 2px; }
        </style>
      </head>
      <body>
        <img src="${qrDataUrl}" class="qr-image" />
        <div class="label-title">${code.orderNumber}</div>
        <div class="product-name">${code.productName}</div>
        ${infoText ? `<div class="info">${infoText}</div>` : ''}
        <script>
          window.onload = () => {
            window.print();
          };
        <\/script>
      </body>
    </html>
  `)
  doc.close()

  // Принудительно возвращаем фокус сразу после отправки на печать
  setTimeout(() => {
    const inputEl = document.querySelector('.label-info-input input') as HTMLInputElement
    if (inputEl) inputEl.focus()
  }, 500)
}

const handlePrintAll = async () => {
  if (orderCodes.value.length === 0) return
  
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    message.error('Заблокировано всплывающее окно. Разрешите его для печати.')
    return
  }

  // Генерируем QR-коды локально в DataURL
  const itemsHtml = await Promise.all(orderCodes.value.map(async code => {
    const qrDataUrl = await QRCode.toDataURL(code.code, { 
      width: 300, 
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' }
    })
    
    const info = code.label?.info ? code.label.info.trim() : ''
    const showInfo = info !== '' && info !== code.productName
    
    return `
      <div class="qr-label">
        <img src="${qrDataUrl}" class="qr-image" />
        <div class="label-title">${code.orderNumber}</div>
        <div class="qr-product-name">${code.productName || ''}</div>
        ${showInfo ? `<div class="qr-description">${info}</div>` : ''}
      </div>
    `
  }))

  const finalHtml = itemsHtml.join('<div class="page-break"></div>')

  printWindow.document.write(`
    <html>
      <head>
        <title>Печать всех QR-кодов заказа ${props.orderNumber}</title>
        <style>
          @page { margin: 0; size: auto; }
          body { font-family: sans-serif; margin: 0; padding: 0; background: white; color: black; }
          .qr-label { 
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            text-align: center; padding: 5px; width: 100%; height: 100vh; box-sizing: border-box;
          }
          .qr-image { width: 70%; max-width: 250px; height: auto; margin-bottom: 5px; }
          .label-title { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
          .qr-product-name { font-size: 14px; font-weight: bold; margin-bottom: 2px; }
          .qr-description { font-size: 12px; font-weight: normal; font-family: monospace; }
          .page-break { page-break-after: always; }
        </style>
      </head>
      <body>
        ${finalHtml}
        <script>
          window.onload = () => {
            window.print();
            window.setTimeout(() => window.close(), 500);
          };
        <\/script>
      </body>
    </html>
  `)
  printWindow.document.close()
}

const handlePrintLastGenerated = async () => {
  const codes = lastGeneratedCodes.value
  if (codes.length === 0) return

  if (codes.length === 1) {
    handlePrint(codes[0])
    return
  }

  // Печать пачки кодов локально
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    message.error('Заблокировано всплывающее окно. Разрешите его для печати.')
    return
  }

  const itemsHtml = await Promise.all(codes.map(async code => {
    const qrDataUrl = await QRCode.toDataURL(code.code, { 
      width: 300, 
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' }
    })

    const info = code.label?.info ? code.label.info.trim() : ''
    const showInfo = info !== '' && info !== code.productName
    
    return `
      <div class="qr-label">
        <img src="${qrDataUrl}" class="qr-image" />
        <div class="label-title">${code.orderNumber}</div>
        <div class="qr-product-name">${code.productName || ''}</div>
        ${showInfo ? `<div class="qr-description">${info}</div>` : ''}
      </div>
    `
  }))

  const finalHtml = itemsHtml.join('<div class="page-break"></div>')

  printWindow.document.write(`
    <html>
      <head>
        <title>Печать QR-кодов (${codes.length} шт.)</title>
        <style>
          @page { margin: 0; size: auto; }
          body { font-family: sans-serif; margin: 0; padding: 0; background: white; color: black; }
          .qr-label { 
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            text-align: center; padding: 5px; width: 100%; height: 100vh; box-sizing: border-box;
          }
          .qr-image { width: 70%; max-width: 250px; height: auto; margin-bottom: 5px; }
          .label-title { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
          .qr-product-name { font-size: 14px; font-weight: bold; margin-bottom: 2px; }
          .qr-description { font-size: 12px; font-weight: normal; font-family: monospace; }
          .page-break { page-break-after: always; }
        </style>
      </head>
      <body>
        ${finalHtml}
        <script>
          window.onload = () => {
            window.print();
          };
        <\/script>
      </body>
    </html>
  `)
  printWindow.document.close()
  message.success(`Отправлено на печать: ${codes.length} шт.`)
}

async function handleGenerateAndPrint() {
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
    
    if (newCodes.length > 0) {
      if (newCodes.length === 1) {
        handlePrint(newCodes[0])
      } else {
        handlePrintLastGenerated()
      }
    }
  } catch (err) {
    message.error('Ошибка при генерации')
  } finally {
    isGenerating.value = false
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
    // Убрал автоматическую очистку поля, так как пользователь хочет очищать её сам крестиком
    
    message.success(`Сгенерировано ${genForm.value.count} кодов`)
    emit('updated')
  } catch {
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

/* Принудительно разрешаем взаимодействие для инпутов, если они перекрыты */
:deep(.n-input) {
  pointer-events: auto !important;
  z-index: 100 !important;
}

:deep(.n-input__input-el) {
  pointer-events: auto !important;
  z-index: 101 !important;
}
</style>
