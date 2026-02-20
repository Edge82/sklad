import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { QRCode, QRCodeStatus } from '@/types'

export const useQRCodesStore = defineStore('qrCodes', () => {
  const qrCodes = ref<QRCode[]>([])

  function generateQRCodes(params: {
    orderId: string,
    orderNumber: string,
    productId: string,
    productName: string,
    count: number,
    generatedBy: string
  }) {
    const newCodes: QRCode[] = []
    for (let i = 0; i < params.count; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase()
      newCodes.push({
        id: crypto.randomUUID(),
        code,
        orderId: params.orderId,
        orderNumber: params.orderNumber,
        productId: params.productId,
        productName: params.productName,
        label: {
          line1: `Заказ: ${params.orderNumber}`,
          line2: `Деталь: ${params.productName}`,
        },
        status: 'generated',
        isActive: true,
        version: 1,
        generatedAt: new Date(),
        generatedBy: params.generatedBy
      })
    }
    qrCodes.value.push(...newCodes)
    return newCodes
  }

  function getQRCodeByCode(code: string) {
    return qrCodes.value.find(q => q.code === code)
  }

  function updateQRCodeStatus(id: string, status: QRCodeStatus, scannedBy?: string) {
    const qr = qrCodes.value.find(q => q.id === id)
    if (qr) {
      qr.status = status
      if (status === 'scanned') {
        qr.scannedAt = new Date()
        qr.scannedBy = scannedBy
      }
    }
  }

  return {
    qrCodes,
    generateQRCodes,
    getQRCodeByCode,
    updateQRCodeStatus
  }
})
