import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { QRCode, QRCodeStatus } from '@/types'

export const useQRCodesStore = defineStore('qrCodes', () => {
  const qrCodes = ref<QRCode[]>([
    {
      id: 'qr-1',
      code: 'WD-001-A',
      orderId: '1',
      orderNumber: 'ORD-2024-001',
      productId: 'p1',
      productName: 'Шкаф купе "Люкс"',
      label: {
        line1: 'Заказ: ORD-2024-001',
        line2: 'Деталь: Боковая панель',
      },
      status: 'generated' as QRCodeStatus,
      isActive: true,
      version: 1,
      generatedAt: new Date('2024-01-15'),
      generatedBy: 'Админ'
    },
    {
      id: 'qr-2',
      code: 'WD-001-B',
      orderId: '1',
      orderNumber: 'ORD-2024-001',
      productId: 'p1',
      productName: 'Шкаф купе "Люкс"',
      label: {
        line1: 'Заказ: ORD-2024-001',
        line2: 'Деталь: Полка внутренняя',
      },
      status: 'generated' as QRCodeStatus,
      isActive: true,
      version: 1,
      generatedAt: new Date('2024-01-15'),
      generatedBy: 'Админ'
    },
    ...Array.from({ length: 8 }).map((_, i) => ({
      id: `qr-extra-${i}`,
      code: `WD-001-${i + 3}`,
      orderId: '1',
      orderNumber: 'ORD-2024-001',
      productId: 'p1',
      productName: 'Шкаф купе "Люкс"',
      label: {
        line1: 'Заказ: ORD-2024-001',
        line2: `Деталь: Комплект №${i + 3}`,
      },
      status: 'generated' as QRCodeStatus,
      isActive: true,
      version: 1,
      generatedAt: new Date('2024-01-15'),
      generatedBy: 'Админ'
    }))
  ])

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

  function removeQRCode(id: string) {
    const index = qrCodes.value.findIndex(q => q.id === id)
    if (index !== -1) {
      qrCodes.value.splice(index, 1)
    }
  }

  function getCodesByItem(orderId: string, productId: string) {
    return qrCodes.value.filter(q => q.orderId === orderId && q.productId === productId)
  }

  return {
    qrCodes,
    generateQRCodes,
    getQRCodeByCode,
    updateQRCodeStatus,
    removeQRCode,
    getCodesByItem
  }
})
