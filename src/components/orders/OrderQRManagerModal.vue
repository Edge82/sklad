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
            <n-space align="center">
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
                  <n-tag v-if="code.isPackage" size="tiny" type="info" class="ml-1">📦</n-tag>
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
            <n-form-item label="Упаковать">
              <n-checkbox
                v-model:checked="genForm.isPackage"
                :disabled="hasPackageCodesForSelected"
              >
                Генерировать как код упаковки
                <n-text v-if="hasPackageCodesForSelected" depth="3" class="ml-1 text-xs">
                  (уже есть упаковочные коды для этого изделия)
                </n-text>
              </n-checkbox>
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
              <div v-if="genForm.isPackage" class="text-[10px] text-blue-400 font-bold mt-1">📦 Код упаковки</div>
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
                  @click="handlePrintLastOnly"
                  :disabled="lastGeneratedCodes.length === 0"
                >
                  <template #icon>
                    <n-icon><PrintOutline /></n-icon>
                  </template>
                  Распечатать коды
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


</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import {
  NModal, NTabs, NTabPane, NTable, NText, NTag, NButton,
  NSpace, NIcon, NInputNumber, NForm, NFormItem, NSelect,
  NDivider, NEmpty, NInput, NCheckbox, useDialog, useMessage
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
const landscape = ref(false)

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
  labelInfo: '',
  isPackage: false
})

const showSinglePrintModal = ref(false)
const singlePrintData = ref({
  title: '',
  code: '',
  description: ''
})

const canPrintLast = computed(() => lastGeneratedCodes.value.length > 0)

// Проверяем, есть ли у выбранного изделия упаковочные коды
const hasPackageCodesForSelected = computed(() => {
  if (!genForm.value.productId) return false
  return qrStore.qrCodes.some(q =>
    q.productId === genForm.value.productId && q.isPackage
  )
})

// При смене позиции проверяем, есть ли уже упаковочные коды
watch(() => genForm.value.productId, (newId) => {
  if (newId) {
    const item = props.items.find(i => (i.productId || i.id) === newId)
    if (item) {
      genForm.value.productName = item.productName || item.itemName || ''
      genForm.value.labelInfo = ''

      // Проверяем, есть ли у этого изделия уже упаковочные коды
      const existingPackageCodes = qrStore.qrCodes.filter(q =>
        q.productId === newId && q.isPackage
      )
      genForm.value.isPackage = existingPackageCodes.length > 0
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
  set: (val: string | null) => {
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
      // Проверяем упаковочные коды
      const existingPackageCodes = qrStore.qrCodes.filter(q =>
        q.productId === genForm.value.productId && q.isPackage
      )
      genForm.value.isPackage = existingPackageCodes.length > 0
    }
  }
})

// При открытии модалки (props.show становится true) сбрасываем форму и загружаем коды
watch(() => props.show, async (isShown) => {
  if (isShown) {
    console.log(`🔓 [QR MODAL] Opening for order: ${props.orderId}`)
    genForm.value.productId = null
    genForm.value.productName = ''
    genForm.value.labelInfo = ''
    genForm.value.count = 1
    genForm.value.isPackage = false
    lastGeneratedCodes.value = []

    // Загружаем существующие QR коды для этого заказа с сервера
    try {
      await qrStore.loadQRCodesForOrder(props.orderId)
    } catch (err) {
      // Error handled in store
    }

    // Если в заказе всего одна позиция, выбираем её сразу
    if (props.items.length === 1) {
      const item = props.items[0]
      if (item) {
        genForm.value.productId = item.productId || item.id || null
        genForm.value.productName = item.productName || item.itemName || ''
        const existingPackageCodes = qrStore.qrCodes.filter(q =>
          q.productId === genForm.value.productId && q.isPackage
        )
        genForm.value.isPackage = existingPackageCodes.length > 0
      }
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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const handlePrint = async (code: QRType) => {
  const isExtraInfo = code.label?.info && code.label.info.trim() !== '' && code.label.info !== code.productName
  const infoText = isExtraInfo ? code.label.info : ''

  singlePrintData.value = {
    title: code.productName,
    code: code.code,
    description: infoText
      ? `Заказ: ${code.orderNumber}\n${infoText}`
      : `Заказ: ${code.orderNumber}`
  }
  showSinglePrintModal.value = true
}

const handlePrintAll = async () => {
  if (orderCodes.value.length === 0) return

  // Открываем popup синхронно (пока браузер считает это ответом на клик)
  const printWindow = window.open('', '_blank', 'popup,width=850,height=700,top=50,left=100')
  if (!printWindow) {
    message.error('Разрешите всплывающие окна для печати')
    return
  }

  // Закрываем модалку перед печатью, чтобы системный диалог Chrome
  // появился поверх окна, а не позади модалки с z-index: 2000
  emit('close')

  const pageSize = landscape.value ? '58mm 38mm' : '38mm 58mm'
  const labelW = landscape.value ? '58mm' : '38mm'
  const labelH = landscape.value ? '38mm' : '58mm'

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
        <div class="label-title">${escapeHtml(code.orderNumber)}</div>
        <div class="product-name">${escapeHtml(code.productName || '')}</div>
        ${showInfo ? `<div class="info">${escapeHtml(info)}</div>` : ''}
      </div>
      <div class="page-break"></div>
    `
  }))

  const finalHtml = itemsHtml.join('')

  printWindow.document.write(`
    <html>
      <head>
        <title>Печать всех QR-кодов заказа ${escapeHtml(props.orderNumber)}</title>
        <style>
          @page { size: ${pageSize}; margin: 0; }
          * { box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #fff; }
          .qr-label {
            width: ${labelW}; height: ${labelH}; padding: 1.5mm; background: #fff; color: #000;
            display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
            text-align: center; overflow: hidden; page-break-after: always;
          }
          .qr-image { width: 24mm; height: 24mm; margin-bottom: 1mm; object-fit: contain; }
          .label-title { font-size: 10pt; font-weight: 800; line-height: 1.1; margin-bottom: 0.8mm;
                         width: 100%; overflow: hidden; text-overflow: ellipsis;
                         display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
                         word-break: break-word; }
          .product-name { font-size: 8.5pt; font-weight: 700; color: #222; line-height: 1.15;
                          width: 100%; overflow: hidden; text-overflow: ellipsis;
                          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
                          word-break: break-word; }
          .info { font-size: 12pt; font-weight: 600; font-family: monospace; color: #444;
                  line-height: 1.15; word-break: break-all; }
          .page-break { page-break-after: always; }
        </style>
      </head>
      <body>
        ${finalHtml}
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 100);
          };
          window.onafterprint = function() {
            window.close();
          };
        <\/script>
      </body>
    </html>
  `)
  printWindow.document.close()

  message.success(`Отправлено на печать: ${orderCodes.value.length} шт.`)
}

const handlePrintLastGenerated = async () => {
  const codes = lastGeneratedCodes.value
  if (codes.length === 0) return

  if (codes.length === 1) {
    const code = codes[0]
    if (code) {
      await handlePrint(code)
    }
    return
  }

  // Открываем popup синхронно (пока браузер считает это ответом на клик)
  const printWindow = window.open('', '_blank', 'popup,width=850,height=700,top=50,left=100')
  if (!printWindow) {
    message.error('Разрешите всплывающие окна для печати')
    return
  }

  // Закрываем модалку перед печатью, чтобы системный диалог Chrome
  // появился поверх окна, а не позади модалки с z-index: 2000
  emit('close')

  const pageSize = landscape.value ? '58mm 38mm' : '38mm 58mm'
  const labelW = landscape.value ? '58mm' : '38mm'
  const labelH = landscape.value ? '38mm' : '58mm'

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
        <div class="label-title">${escapeHtml(code.orderNumber)}</div>
        <div class="product-name">${escapeHtml(code.productName || '')}</div>
        ${showInfo ? `<div class="info">${escapeHtml(info)}</div>` : ''}
      </div>
      <div class="page-break"></div>
    `
  }))

  const finalHtml = itemsHtml.join('')

  printWindow.document.write(`
    <html>
      <head>
        <title>Печать QR-кодов (${codes.length} шт.)</title>
        <style>
          @page { size: ${pageSize}; margin: 0; }
          * { box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #fff; }
          .qr-label {
            width: ${labelW}; height: ${labelH}; padding: 1.5mm; background: #fff; color: #000;
            display: flex; flex-direction: column; align-items: center; justify-content: flex-start;
            text-align: center; overflow: hidden; page-break-after: always;
          }
          .qr-image { width: 24mm; height: 24mm; margin-bottom: 1mm; object-fit: contain; }
          .label-title { font-size: 10pt; font-weight: 800; line-height: 1.1; margin-bottom: 0.8mm;
                         width: 100%; overflow: hidden; text-overflow: ellipsis;
                         display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
                         word-break: break-word; }
          .product-name { font-size: 8.5pt; font-weight: 700; color: #222; line-height: 1.15;
                          width: 100%; overflow: hidden; text-overflow: ellipsis;
                          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
                          word-break: break-word; }
          .info { font-size: 12pt; font-weight: 600; font-family: monospace; color: #444;
                  line-height: 1.15; word-break: break-all; }
          .page-break { page-break-after: always; }
        </style>
      </head>
      <body>
        ${finalHtml}
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 100);
          };
          window.onafterprint = function() {
            window.close();
          };
        <\/script>
      </body>
    </html>
  `)
  printWindow.document.close()

  message.success(`Отправлено на печать: ${codes.length} шт.`)
}

async function handleGenerate() {
  if (!genForm.value.productId) return
  if (isGenerating.value) return // Prevent double submission

  const item = props.items.find(i => (i.productId || i.id) === genForm.value.productId)
  if (!item) return

  isGenerating.value = true
  try {
    // Если есть упаковочные коды — генерируем только упаковки
    const hasPackages = qrStore.qrCodes.some(q =>
      q.productId === genForm.value.productId && q.isPackage
    )
    if (hasPackages && !genForm.value.isPackage) {
      genForm.value.isPackage = true
    }

    const newCodes = await qrStore.generateQRCodes({
      orderId: props.orderId,
      orderNumber: props.orderNumber,
      productId: genForm.value.productId,
      productName: genForm.value.productName || item?.productName || item?.itemName || 'Без названия',
      labelInfo: genForm.value.labelInfo,
      count: genForm.value.count,
      isPackage: genForm.value.isPackage,
      generatedBy: userStore.user?.name || 'Система'
    })

    lastGeneratedCodes.value = newCodes

    message.success(`Сгенерировано ${genForm.value.count} кодов`)
    emit('updated')
  } catch {
    message.error('Ошибка при генерации')
  } finally {
    isGenerating.value = false
  }
}

// Печать последних сгенерированных кодов (без новой генерации)
function handlePrintLastOnly() {
  if (lastGeneratedCodes.value.length === 0) {
    message.warning('Нет сгенерированных кодов для печати')
    return
  }

  if (lastGeneratedCodes.value.length === 1) {
    handlePrint(lastGeneratedCodes.value[0])
  } else {
    handlePrintLastGenerated()
  }
}

async function handleGenerateAndPrint() {
  if (!genForm.value.productId) return
  if (isGenerating.value) return // Prevent double submission

  const item = props.items.find(i => (i.productId || i.id) === genForm.value.productId)
  if (!item) return

  isGenerating.value = true
  try {
    // Если есть упаковочные коды — генерируем только упаковки
    const hasPackages = qrStore.qrCodes.some(q =>
      q.productId === genForm.value.productId && q.isPackage
    )
    if (hasPackages && !genForm.value.isPackage) {
      genForm.value.isPackage = true
    }

    const newCodes = await qrStore.generateQRCodes({
      orderId: props.orderId,
      orderNumber: props.orderNumber,
      productId: genForm.value.productId,
      productName: genForm.value.productName || item?.productName || item?.itemName || 'Без названия',
      labelInfo: genForm.value.labelInfo,
      count: genForm.value.count,
      isPackage: genForm.value.isPackage,
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
