import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { QRCode, QRCodeStatus } from '@/types'

const API_BASE = '/sklad/api'

export const useQRCodesStore = defineStore('qrCodes', () => {
  const qrCodes = ref<QRCode[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Generate QR codes on backend and store them
  async function generateQRCodes(params: {
    orderId: string,
    orderNumber: string,
    productId: string,
    productName: string,
    count: number,
    generatedBy: string,
    employeeId?: string,
    employeeName?: string,
    labelInfo?: string,
    labelOrder?: string
  }) {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_BASE}/orders/${params.orderId}/qr-codes/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quantity: params.count,
          productId: params.productId,
          productName: params.productName,
          generatedBy: params.generatedBy,
          employeeId: params.employeeId,
          employeeName: params.employeeName,
          labelInfo: params.labelInfo,
          labelOrder: params.labelOrder
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to generate QR codes: ${response.statusText}`)
      }

      const data = await response.json()

      // Add to local store for immediate UI updates
      const newCodes: QRCode[] = data.codes.map((code: any) => ({
        id: code.id,
        code: code.code,
        orderId: params.orderId,
        orderNumber: params.orderNumber,
        productId: params.productId,
        productName: params.productName,
        label: {
          order: code.label_order || params.labelOrder || params.orderNumber,
          info: code.label_info || params.labelInfo || ''  // Use actual value or empty
        },
        status: code.status as QRCodeStatus,
        isActive: true,
        version: 1,
        generatedAt: new Date(data.createdAt),
        generatedBy: params.generatedBy
      }))

      qrCodes.value.push(...newCodes)
      return newCodes
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error generating QR codes:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Load QR codes for an order from backend
  async function loadQRCodesForOrder(orderId: string) {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_BASE}/orders/${orderId}/qr-codes`)

      if (!response.ok) {
        throw new Error(`Failed to load QR codes: ${response.statusText}`)
      }

      const data = await response.json()

      // Transform backend data to frontend format
      const loadedCodes: QRCode[] = (data.codes || []).map((code: any) => {
        const transformed = {
          id: code.id,
          code: code.code,
          orderId: orderId,
          orderNumber: code.order_number,
          productId: code.product_id,
          productName: code.product_name,
          label: {
            order: code.label_order || code.order_number,
            info: code.label_info || ''  // Keep empty string if not set, don't default to product_name
          },
          status: code.status as QRCodeStatus,
          isActive: code.status !== 'deleted',
          version: 1,
          generatedAt: new Date(code.generated_at),
          generatedBy: code.generated_by,
          scannedAt: code.scanned_at ? new Date(code.scanned_at) : undefined,
          scannedBy: code.scanned_by
        }
        return transformed
      })

      // Replace codes for this order in local store
      qrCodes.value = qrCodes.value.filter(q => q.orderId !== orderId).concat(loadedCodes)
      return loadedCodes
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error loading QR codes:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  function getQRCodeByCode(code: string) {
    return qrCodes.value.find(q => q.code === code)
  }

  // Scan QR code - update status on backend
  async function updateQRCodeStatus(id: string, status: QRCodeStatus, scannedBy?: string, employeeId?: string) {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_BASE}/qr-codes/${id}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          newStatus: status,
          employeeName: scannedBy,
          employeeId: employeeId
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to update QR code status: ${response.statusText}`)
      }

      const data = await response.json()

      // Update local store
      const qr = qrCodes.value.find(q => q.id === id)
      if (qr) {
        qr.status = status
        if (status === 'scanned') {
          qr.scannedAt = new Date(data.scannedAt)
          qr.scannedBy = data.scannedBy
        }
      }

      return data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error updating QR code status:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Delete QR code from backend
  async function removeQRCode(id: string) {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_BASE}/qr-codes/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`Failed to delete QR code: ${response.statusText}`)
      }

      // Remove from local store
      const index = qrCodes.value.findIndex(q => q.id === id)
      if (index !== -1) {
        qrCodes.value.splice(index, 1)
      }

      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error deleting QR code:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Load QR codes for multiple orders at once
  async function loadQRCodesForOrders(orderIds: string[]) {
    loading.value = true
    error.value = null

    try {
      const allCodes: QRCode[] = []
      let loadedCount = 0
      
      for (const orderId of orderIds) {
        try {
          const response = await fetch(`${API_BASE}/orders/${orderId}/qr-codes`)
          if (response.ok) {
            const data = await response.json()
            const codes = (data.codes || []).map((code: any) => ({
              id: code.id,
              code: code.code,
              orderId: orderId,
              orderNumber: code.order_number,
              productId: code.product_id,
              productName: code.product_name,
              label: {
                order: code.label_order || code.order_number || '',
                info: code.label_info || ''  // Keep empty if not set
              },
              status: code.status || 'generated',
              isActive: true,
              version: 1,
              generatedAt: code.generated_at ? new Date(code.generated_at) : new Date(),
              generatedBy: code.generated_by || 'System',
              scannedAt: code.scanned_at ? new Date(code.scanned_at) : undefined,
              scannedBy: code.scanned_by
            }))
            
            allCodes.push(...codes)
            loadedCount += codes.length
          }
        } catch (err) {
          console.error(`Failed to load QR codes for order ${orderId}:`, err)
        }
      }
      
      // Replace all codes with loaded codes
      qrCodes.value = allCodes
      return allCodes
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error loading QR codes for orders:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  function getCodesByItem(orderId: string, productId: string) {
    return qrCodes.value.filter(q => q.orderId === orderId && q.productId === productId)
  }

  function clearCodesForOrder(orderId: string) {
    qrCodes.value = qrCodes.value.filter(q => q.orderId !== orderId)
  }

  // Индекс для мгновенного поиска QR-кода O(1)
  const qrCodesMap = computed(() => {
    const map = new Map<string, QRCode>()
    qrCodes.value.forEach(qr => {
      if (qr.id) map.set(qr.id, qr)
      if (qr.code) map.set(qr.code, qr)
    })
    return map
  })

  return {
    qrCodes,
    qrCodesMap,
    loading,
    error,
    generateQRCodes,
    loadQRCodesForOrder,
    loadQRCodesForOrders,
    getQRCodeByCode,
    updateQRCodeStatus,
    removeQRCode,
    getCodesByItem,
    clearCodesForOrder
  }
})
