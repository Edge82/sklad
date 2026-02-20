<template>
  <n-modal :show="show" @update:show="$emit('update:show', $event)" preset="card" style="width: 400px" :title="'Печать QR-кода: ' + title">
    <div id="qr-print-content" class="qr-container">
      <img :src="qrUrl" class="qr-image" />
      <div class="label-title">{{ title }}</div>
      <div v-if="description" class="qr-description">{{ description }}</div>
      <div v-else class="qr-code-text">{{ code }}</div>
    </div>
    <template #footer>
      <n-space justify="end">
        <n-button @click="$emit('update:show', false)">Закрыть</n-button>
        <n-button type="primary" @click="handlePrint">
          <template #icon>
            <n-icon><PrintOutline /></n-icon>
          </template>
          Печать
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { PrintOutline } from '@vicons/ionicons5'
import { NModal, NButton, NSpace, NIcon } from 'naive-ui'

const props = defineProps<{
  show: boolean
  title: string
  code: string
  description?: string
}>()

const emit = defineEmits(['update:show'])

const qrUrl = computed(() => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(props.code)}`
})

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
            background-color: #f5f5f5;
          }
          .qr-container { 
            text-align: center; 
            background: white;
            padding: 10px; 
            width: 280px;
            box-sizing: border-box;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
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
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            width: 100%;
            display: block;
          }
          .qr-description { 
            font-family: monospace;
            font-size: 14px; 
            font-weight: bold;
            color: #333; 
          }
          .qr-code-text {
            font-family: monospace;
            font-size: 14px;
            color: #666;
          }
          @media print {
            body { 
              min-height: auto; 
              background: none; 
              display: block;
            }
            .qr-container { 
              box-shadow: none; 
              width: 100%;
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="qr-container">
          <img src="${qrUrl.value}" class="qr-image" />
          <div class="label-title">${props.title}</div>
          ${props.description ? `<div class="qr-description">${props.description}</div>` : `<div class="qr-code-text">${props.code}</div>`}
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
