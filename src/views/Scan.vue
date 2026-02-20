<template>
  <div class="scan-page">
    <n-h1>Сканирование</n-h1>
    
    <n-card>
      <n-tabs type="segment" v-model:value="scanMode">
        <n-tab-pane name="receive" tab="Приёмка" />
        <n-tab-pane name="ship" tab="Отгрузка" />
        <n-tab-pane name="tools" tab="Инструменты" />
      </n-tabs>

      <div class="scan-input-area mt-6">
        <n-input
          v-model:value="lastScannedCode"
          placeholder="Наведите сканер на QR-код или введите вручную"
          size="large"
          @keyup.enter="handleScan"
          autofocus
        >
          <template #prefix>
            <n-icon><QrCodeOutline /></n-icon>
          </template>
        </n-input>
        <n-button type="primary" size="large" @click="handleScan" class="mt-4 w-full">
          Отправить
        </n-button>
      </div>

      <div v-if="scanResult" class="scan-result mt-6" :class="scanResult.type">
        <n-alert :title="scanResult.title" :type="scanResult.type">
          {{ scanResult.message }}
        </n-alert>
      </div>
    </n-card>

    <n-card title="История последних сканирований" class="mt-6">
      <n-list>
        <n-list-item v-for="(scan, index) in scanHistory" :key="index">
          <div class="flex justify-between items-center">
            <div>
              <n-text depth="3">{{ scan.time.toLocaleTimeString() }}</n-text>
              <div class="font-bold">{{ scan.code }}</div>
            </div>
            <n-tag :type="scan.resultType">{{ scan.resultMessage }}</n-tag>
          </div>
        </n-list-item>
      </n-list>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { QrCodeOutline } from '@vicons/ionicons5'
import { useQRCodesStore } from '@/stores/qrCodes'
import { useUserStore } from '@/stores/user'

const scanMode = ref('receive')
const lastScannedCode = ref('')
const scanResult = ref<{ title: string, message: string, type: 'success' | 'error' | 'warning' } | null>(null)
const scanHistory = ref<any[]>([])

const qrStore = useQRCodesStore()
const userStore = useUserStore()

function handleScan() {
  const code = lastScannedCode.value.trim()
  if (!code) return

  const qr = qrStore.getQRCodeByCode(code)
  
  if (!qr) {
    setResult('Ошибка', 'Код не найден в системе!', 'error')
    addToHistory(code, 'Ошибка', 'error')
  } else if (qr.status === 'scanned' && scanMode.value === 'receive') {
    setResult('Внимание', 'Этот код уже был отсканирован ранее', 'warning')
    addToHistory(code, 'Дубликат', 'warning')
  } else {
    qrStore.updateQRCodeStatus(qr.id, scanMode.value === 'ship' ? 'shipped' : 'scanned', userStore.user?.name)
    setResult('Успех', `Деталь ${qr.productName} принята`, 'success')
    addToHistory(code, 'Успех', 'success')
  }

  lastScannedCode.value = ''
}

function setResult(title: string, message: string, type: any) {
  scanResult.value = { title, message, type }
  setTimeout(() => { scanResult.value = null }, 5000)
}

function addToHistory(code: string, message: string, type: any) {
  scanHistory.value.unshift({
    time: new Date(),
    code,
    resultMessage: message,
    resultType: type
  })
}
</script>

<style scoped>
.scan-page {
  max-width: 800px;
  margin: 0 auto;
}
.scan-input-area {
  padding: 20px;
  background: #f0f2f5;
  border-radius: 8px;
}
.w-full { width: 100%; }
.mt-6 { margin-top: 24px; }
.mt-4 { margin-top: 16px; }
</style>
