<template>
  <teleport to="body">
    <div v-if="show" class="qr-print-overlay" @click.self="handleClose">
      <div class="qr-print-card">
        <div class="qr-print-header">
          <span class="qr-print-title">Печать QR-кода: {{ title }}</span>
          <button class="qr-print-close-icon" @click="handleClose">×</button>
        </div>

        <div class="qr-print-body">
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

          <div class="qr-preview-wrapper">
            <div class="qr-preview-scaler" :style="previewStyle">
              <div id="qr-print-content" class="qr-label" :style="labelStyle">
                <div v-if="orderLine" class="qr-order-line">{{ orderLine }}</div>
                <div v-else class="qr-code-text">{{ code }}</div>
                <img :src="qrUrl" class="qr-image" />
                <div class="label-title">{{ title }}</div>
                <div v-if="extraInfo" class="qr-extra-info">{{ extraInfo }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="qr-print-footer">
          <n-space justify="end">
            <n-button @click="handleClose">Закрыть</n-button>
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
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { PrintOutline } from '@vicons/ionicons5'
import { NButton, NSpace, NIcon, NSlider, NSwitch } from 'naive-ui'
import QRCode from 'qrcode'

const props = defineProps<{
  show: boolean
  title: string
  code: string
  description?: string
}>()

const emit = defineEmits(['update:show'])

const scale = ref(1)
const landscape = ref(false)

// Разделяем description: первая строка = Заказ, остальное = доп.инфо
const orderLine = computed(() => {
  if (!props.description) return ''
  const idx = props.description.indexOf('\n')
  return idx >= 0 ? props.description.substring(0, idx).trim() : props.description.trim()
})

const extraInfo = computed(() => {
  if (!props.description) return ''
  const idx = props.description.indexOf('\n')
  return idx >= 0 ? props.description.substring(idx + 1).trim() : ''
})

const previewStyle = computed(() => ({
  transform: `scale(${scale.value})`,
  transformOrigin: 'center top'
}))

const labelStyle = computed(() => ({
  width: landscape.value ? '104mm' : '68mm',
  height: landscape.value ? '68mm' : '104mm'
}))

watch(() => props.show, (val) => {
  if (val) {
    scale.value = 1
    landscape.value = false
  }
})

const qrUrl = ref('')

function handleClose() {
  emit('update:show', false)
}

watch(() => props.code, async (newCode) => {
  if (newCode) {
    try {
      qrUrl.value = await QRCode.toDataURL(newCode, {
        width: 500,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      })
    } catch (err) {
      console.error('Ошибка генерации QR:', err)
    }
  }
}, { immediate: true })

function handlePrint() {
  if (!qrUrl.value) return

  // Открываем popup синхронно (пока браузер считает это ответом на клик)
  const printWindow = window.open('', '_blank', 'popup,width=850,height=700,top=50,left=100')
  if (!printWindow) return

  // Закрываем модалку перед печатью, чтобы системный диалог Chrome
  // появился поверх окна, а не позади модалки с z-index: 2000
  handleClose()

  const pageSize = landscape.value ? '104mm 68mm' : '68mm 104mm'
  const labelW = landscape.value ? '104mm' : '68mm'
  const labelH = landscape.value ? '68mm' : '104mm'

  printWindow.document.write(`
    <html>
      <head>
        <title>Печать QR-кода</title>
        <style>
          @page { size: ${pageSize}; margin: 0; }
          * { box-sizing: border-box; }
          body {
            margin: 0; padding: 0; background: #fff;
            font-family: 'Segoe UI', Arial, sans-serif;
            display: flex; align-items: center; justify-content: center;
            min-height: 100vh;
          }
          .qr-scaler {
            transform: scale(${scale.value});
            transform-origin: center center;
          }
          .qr-label {
            width: ${labelW}; height: ${labelH}; padding: 3.6mm 5.4mm;
            background: #fff; color: #000;
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            text-align: center; overflow: hidden;
            border: 0.3mm solid #ddd;
            gap: 1.5mm;
          }
          .qr-image {
            width: 35mm;
            height: 35mm;
            object-fit: contain;
            flex-shrink: 0;
          }
          .qr-order-line {
            font-size: 22pt; font-weight: 900; color: #000; line-height: 1.15;
            width: 100%; overflow: hidden; text-overflow: ellipsis;
            display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
            word-break: break-word; flex-shrink: 0;
          }
          .label-title {
            font-size: 18pt; font-weight: 800; line-height: 1.1;
            font-family: monospace; color: #000;
            width: 100%; overflow: hidden; text-overflow: ellipsis;
            display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
            word-break: break-word; flex-shrink: 0;
          }
          .qr-extra-info {
            font-size: 14pt; font-weight: 600; color: #444; line-height: 1.15;
            width: 100%; overflow: hidden; text-overflow: ellipsis;
            display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;
            white-space: pre-wrap; word-break: break-word;
          }
          .qr-code-text {
            font-size: 8pt; font-family: monospace; font-weight: 600;
            color: #444; word-break: break-all;
          }
        </style>
      </head>
      <body>
        <div class="qr-scaler">
          <div class="qr-label">
            ${orderLine.value ? `<div class="qr-order-line">${escapeHtml(orderLine.value)}</div>` : `<div class="qr-code-text">${escapeHtml(props.code)}</div>`}
            <img src="${qrUrl.value}" class="qr-image" />
            <div class="label-title">${escapeHtml(props.title)}</div>
            ${extraInfo.value ? `<div class="qr-extra-info">${escapeHtml(extraInfo.value).replace(/\n/g, '<br>')}</div>` : ''}
          </div>
        </div>
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
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
</script>

<style scoped>
.qr-print-overlay {
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

.qr-print-card {

  background: #2c2c32;
  border-radius: 8px;
  width: 500px;
  max-width: 90%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
}

.qr-print-header {
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.qr-print-title {
  padding-top: 6px;
  font-size: 20px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
}

.qr-print-close-icon {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 24px;
  cursor: pointer;
  line-height: 1;
}

.qr-print-close-icon:hover {
  color: #fff;
}

.qr-print-body {
  padding: 16px;
}

.qr-print-footer {
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.qr-preview-wrapper {
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 280px;
  max-height: 420px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
}

.qr-preview-scaler {
  display: inline-block;
}

.qr-label {
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
  gap: 1.5mm;
  width: 68mm;
  height: 104mm;
}

.qr-image {
  width: 35mm;
  height: 35mm;
  object-fit: contain;
  flex-shrink: 0;
}

.qr-order-line {
  font-size: 22pt;
  font-weight: 900;
  color: #000;
  line-height: 1.15;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-word;
  flex-shrink: 0;
}

.label-title {
  font-size: 18pt;
  font-weight: 800;
  line-height: 1.1;
  font-family: monospace;
  color: #000;
  margin-bottom: 0;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-word;
  flex-shrink: 0;
}

.qr-extra-info {
  font-size: 14pt;
  font-weight: 600;
  color: #444;
  line-height: 1.15;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  white-space: pre-wrap;
  word-break: break-word;
}

.qr-code-text {
  font-size: 8pt;
  font-family: monospace;
  font-weight: 600;
  color: #444;
  word-break: break-all;
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
</style>
