<template>
  <teleport to="body">
    <div v-if="show" class="qr-print-overlay" @click.self="handleClose">
      <div class="qr-print-card">
        <div class="qr-print-header">
          <span class="qr-print-title">Печать QR-кода: {{ title }}</span>
          <button class="qr-print-close-icon" @click="handleClose">×</button>
        </div>

        <div class="qr-print-body">
          <div id="qr-print-content" class="qr-container">
            <img :src="qrUrl" class="qr-image" />
            <div class="label-title">{{ title }}</div>
            <div v-if="description" class="qr-description" style="white-space: pre-wrap;">{{ description }}</div>
            <div v-else class="qr-code-text">{{ code }}</div>
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
import { ref, watch } from 'vue'
import { PrintOutline } from '@vicons/ionicons5'
import { NButton, NSpace, NIcon } from 'naive-ui'
import QRCode from 'qrcode'

const props = defineProps<{
  show: boolean
  title: string
  code: string
  description?: string
}>()

const emit = defineEmits(['update:show'])

const qrUrl = ref('')

function handleClose() {
  console.log('Closing QR Print Overlay')
  emit('update:show', false)
}

// Локально генерируем QR в формате DataURL
watch(() => props.code, async (newCode) => {
  if (newCode) {
    try {
      qrUrl.value = await QRCode.toDataURL(newCode, { 
        width: 300, 
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' }
      })
    } catch (err) {
      console.error('Ошибка генерации QR:', err)
    }
  }
}, { immediate: true })

function handlePrint() {
  const printContents = document.getElementById('qr-print-content')?.innerHTML
  if (!printContents) return

  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  printWindow.document.write(`
    <html>
      <head>
        <title>Печать QR-кода</title>
        <style>
          body { 
            font-family: sans-serif; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
            min-height: 100vh; 
            margin: 0; 
            background-color: white;
          }
          .qr-container { 
            text-align: center; 
            padding: 10px; 
            width: 280px;
            box-sizing: border-box;
          }
          .qr-image { 
            width: 250px; 
            height: 250px; 
            margin-bottom: 10px; 
          }
          .label-title { 
            font-size: 16px; 
            font-weight: bold; 
            margin-bottom: 5px;
          }
          .qr-description { 
            font-family: monospace;
            font-size: 14px; 
            font-weight: bold;
            color: #000; 
          }
        </style>
      </head>
      <body>
        <div class="qr-container">
          <img src="${qrUrl.value}" class="qr-image" />
          <div class="label-title">${props.title}</div>
          ${props.description ? `<div class="qr-description">${props.description.replace(/\n/g, '<br>')}</div>` : ''}
        </div>
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
</script>

<style scoped>
.qr-print-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  z-index: 5000; /* Выше любого модального окна */
  display: flex;
  align-items: center;
  justify-content: center;
}

.qr-print-card {
  background: #2c2c32; /* Цвет темы */
  border-radius: 8px;
  width: 400px;
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
  font-size: 18px;
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
  padding: 20px;
}

.qr-print-footer {
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.qr-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px;
  background: #fff;
  color: #000;
  border: 1px dashed #ddd;
  border-radius: 4px;
}

.qr-image {
  width: 180px;
  height: 180px;
  margin-bottom: 12px;
}

.label-title {
  width: 100%;
  text-align: center;
  font-weight: bold;
  font-size: 1.1em;
  margin-bottom: 4px;
}
</style>

<style scoped>
.qr-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px;
  background: #fff;
  color: #000;
  border: 1px dashed #ddd;
}
.qr-image {
  width: 180px;
  height: 180px;
  margin-bottom: 12px;
}
.label-title {
  width: 100%;
  text-align: center;
  font-weight: bold;
  font-size: 1.1em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 4px;
}
.qr-description {
  font-family: monospace;
  font-weight: bold;
  font-size: 1em;
  color: #333;
}
.qr-code-text {
  font-family: monospace;
  font-size: 0.9em;
  color: #666;
}
.print-only {
  display: none;
}
</style>
