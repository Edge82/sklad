<template>
  <n-modal :show="show" @update:show="$emit('update:show', $event)" preset="card" title="Управление QR-кодами"
    style="width: 1000px; max-height: 90vh; overflow-y: auto;">
    <div class="p-4">
      <div class="flex justify-between items-center mb-6">
        <div>
          <n-h2 class="!mb-1">Заказ #{{ orderNumber }}</n-h2>
          <n-text depth="3">{{ customerName }}</n-text>
        </div>
        <div class="flex gap-2">
          <n-button @click="generateAllCodes" type="primary" :loading="generating"
            :disabled="orderItems.length === 0">
            Сгенерировать все
          </n-button>
          <n-button @click="printAllCodes" :disabled="qrCodes.length === 0">
            <template #icon>
              <n-icon>
                <PrintOutline />
              </n-icon>
            </template>
            Печать всех
          </n-button>
        </div>
      </div>

      <n-table :bordered="false" :single-line="false">
        <thead>
          <tr>
            <th>Товар</th>
            <th>Кол-во</th>
            <th>Статус QR</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in orderItems" :key="item.id">
            <td>{{ item.productName }}</td>
            <td>{{ item.quantity || 0 }} {{ item.unit }}</td>
            <td>
              <n-tag v-if="hasQR(item.id)" type="success" size="small">Готов</n-tag>
              <n-tag v-else type="warning" size="small">Не создан</n-tag>
            </td>
            <td>
              <div class="flex gap-2">
                <n-button size="small" quaternary circle @click="viewQR(item.id)" :disabled="!hasQR(item.id)">
                  <template #icon>
                    <n-icon>
                      <EyeOutline />
                    </n-icon>
                  </template>
                </n-button>
                <n-button size="small" quaternary circle @click="generateSingleQR(item)" :loading="generating">
                  <template #icon>
                    <n-icon>
                      <QrCodeOutline />
                    </n-icon>
                  </template>
                </n-button>
                <n-button size="small" quaternary circle @click="printSingleQR(item)" :disabled="!hasQR(item.id)">
                  <template #icon>
                    <n-icon>
                      <PrintOutline />
                    </n-icon>
                  </template>
                </n-button>
              </div>
            </td>
          </tr>
        </tbody>
      </n-table>

      <!-- Modal for individual QR preview -->
      <n-modal v-model:show="showPreview" preset="dialog" title="Предпросмотр QR-кода" positive-text="Закрыть">
        <div v-if="selectedQR" class="flex flex-col items-center p-4">
          <div class="bg-white p-4 rounded-lg shadow-inner">
            <canvas ref="qrCanvas"></canvas>
          </div>
          <div class="mt-4 text-center">
            <n-text strong>{{ selectedQR.productName }}</n-text><br />
            <n-text depth="3">Заказ: #{{ orderNumber }}</n-text>
          </div>
          <n-button class="mt-4" type="primary" @click="printSingleQRDirectly(selectedQR)">
            Печать этого кода
          </n-button>
        </div>
      </n-modal>
    </div>

    <!-- Hidden Printing Template -->
    <div style="display: none">
      <div id="qr-print-template">
        <div v-for="qr in qrCodesToPrint" :key="qr.itemId" class="print-page"
          style="width: 58mm; height: 40mm; padding: 2mm; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; justify-content: center; page-break-after: always; color: black; background: white;">
          <canvas :id="'qr-print-canvas-' + qr.itemId" style="width: 25mm; height: 25mm;"></canvas>
          <div style="font-size: 8px; font-weight: bold; margin-top: 1mm; text-align: center; width: 100%;">
            {{ qr.productName }}
          </div>
          <div style="font-size: 7px; margin-top: 0.5mm; text-align: center; width: 100%;">
            Заказ: #{{ orderNumber }} | {{ qr.quantity || 0 }} {{ qr.unit }}
          </div>
        </div>
      </div>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import {
  NModal, NButton, NIcon, NH2, NText, NTable, NTag, useMessage
} from 'naive-ui'
import { PrintOutline, EyeOutline, QrCodeOutline } from '@vicons/ionicons5'
import QRCode from 'qrcode'
import type { OrderItem } from '@/types'

const props = defineProps<{
  show: boolean
  orderId: string
  orderNumber: string
  customerName: string
  orderItems: OrderItem[]
}>()

defineEmits(['update:show'])

const message = useMessage()
const generating = ref(false)
const qrCanvas = ref<HTMLCanvasElement | null>(null)
const showPreview = ref(false)

interface QRData {
  itemId: string
  productName: string
  quantity: number
  unit: string
  data: string
}

const qrCodes = ref<QRData[]>([])
const qrCodesToPrint = ref<QRData[]>([])
const selectedQR = ref<QRData | null>(null)

const hasQR = (itemId: string) => {
  return qrCodes.value.some(q => q.itemId === itemId)
}

const generateQRContent = (item: OrderItem) => {
  return JSON.stringify({
    orderId: props.orderId,
    itemId: item.id,
    p: item.productName,
    o: props.orderNumber
  })
}

const generateSingleQR = async (item: OrderItem) => {
  try {
    const data = generateQRContent(item)
    const existingIndex = qrCodes.value.findIndex(q => q.itemId === item.id)
    const qrObj: QRData = {
      itemId: item.id,
      productName: item.productName,
      quantity: item.quantity || 0,
      unit: item.unit,
      data
    }

    if (existingIndex > -1) {
      qrCodes.value[existingIndex] = qrObj
    } else {
      qrCodes.value.push(qrObj)
    }
    
    message.success('QR-код создан для ' + item.productName)
  } catch {
    message.error('Ошибка генерации QR-кода')
  }
}

const generateAllCodes = async () => {
  generating.value = true
  try {
    for (const item of props.orderItems) {
      await generateSingleQR(item)
    }
    message.success('Все QR-коды сгенерированы')
  } finally {
    generating.value = false
  }
}

const viewQR = (itemId: string) => {
  const qr = qrCodes.value.find(q => q.itemId === itemId)
  if (qr) {
    selectedQR.value = qr
    showPreview.value = true
    nextTick(() => {
      if (qrCanvas.value) {
        QRCode.toCanvas(qrCanvas.value, qr.data, { width: 200, margin: 2 })
      }
    })
  }
}

const printSingleQRDirectly = (qr: QRData) => {
  qrCodesToPrint.value = [qr]
  nextTick(() => {
    printPrepared()
  })
}

const printSingleQR = (item: OrderItem) => {
  const qr = qrCodes.value.find(q => q.itemId === item.id)
  if (qr) {
    printSingleQRDirectly(qr)
  }
}

const printAllCodes = () => {
  if (qrCodes.value.length === 0) return
  qrCodesToPrint.value = [...qrCodes.value]
  nextTick(() => {
    printPrepared()
  })
}

const printPrepared = async () => {
  for (const qr of qrCodesToPrint.value) {
    const canvas = document.getElementById('qr-print-canvas-' + qr.itemId) as HTMLCanvasElement
    if (canvas) {
      await QRCode.toCanvas(canvas, qr.data, { width: 100, margin: 0 })
    }
  }

  const printTmp = document.getElementById('qr-print-template')
  if (!printTmp) return
  
  const printContent = printTmp.innerHTML
  const win = window.open('', '_blank')
  if (win) {
    win.document.write('<html><head><title>Print QR</title><style>@page { margin: 0; } body { margin: 0; padding: 0; } .print-page { page-break-after: always; display: flex; flex-direction: column; align-items: center; justify-content: center; }</style></head><body onload="window.print();window.close();">' + printContent + '</body></html>')
    win.document.close()
  }
}
</script>
