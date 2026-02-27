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
              <div><n-text strong>{{ scan.code }}</n-text></div>
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
import { useInventoryStore } from '@/stores/inventory'
import { useMessage } from 'naive-ui'

const scanMode = ref('receive')
const lastScannedCode = ref('')
const scanResult = ref<{ title: string, message: string, type: 'success' | 'error' | 'warning' } | null>(null)
const scanHistory = ref<any[]>([])

const qrStore = useQRCodesStore()
const userStore = useUserStore()
const inventoryStore = useInventoryStore()
const message = useMessage()

// Делаем qrStore доступным глобально для функции авто-создания в inventoryStore
if (typeof window !== 'undefined') {
  (window as any).qrCodesStore = qrStore
}

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
    // Обновляем статус QR-кода
    const oldStatus = qr.status
    const newStatus = scanMode.value === 'ship' ? 'shipped' : 'scanned'
    const workerName = userStore.user?.name || 'Кладовщик'
    
    qrStore.updateQRCodeStatus(qr.id, newStatus, workerName)
    
    // АВТОМАТИЗАЦИЯ СКЛАДА:
    // Если мы в режиме "Приёмка" и сканируем QR-код продукции, 
    // автоматически увеличиваем остаток этой продукции на складе готовой продукции.
    if (scanMode.value === 'receive' && oldStatus !== 'scanned') {
      const success = inventoryStore.receiveFromProduction(
        qr.productId, 
        1, 
        qr.orderNumber, 
        workerName
      )
      
      if (success) {
        setResult('Успех', `Изделие "${qr.productName}" принято на склад. Остаток увеличен.`, 'success')
      } else {
        setResult('Внимание', `Статус обновлен, но изделие "${qr.productName}" не найдено в справочнике. Остатки не изменились.`, 'warning')
      }
    } else if (scanMode.value === 'receive' && oldStatus === 'scanned') {
      setResult('Внимание', 'Этот код уже был отсканирован ранее и принят на склад.', 'warning')
    } else {
      setResult('Успех', `Код обработан: ${scanMode.value === 'ship' ? 'Отгружено' : 'Принято'}`, 'success')
    }

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
  background: #242428;
  border: 1px solid #333;
  border-radius: 8px;
}
.w-full { width: 100%; }
.mt-6 { margin-top: 24px; }
.mt-4 { margin-top: 16px; }
</style>
