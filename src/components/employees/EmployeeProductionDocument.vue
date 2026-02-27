<template>
  <div class="production-document-registry-style shadow-2xl rounded-lg overflow-hidden border border-gray-800">
    <n-data-table
      :columns="columns"
      :data="combinedData"
      :pagination="false"
      striped
      class="registry-table"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, h } from 'vue'
import { NDataTable, NTag, NIcon} from 'naive-ui'
import { CheckmarkCircleOutline, TimeOutline } from '@vicons/ionicons5'
import type { Employee, Tool, QRCode } from '@/types'

const props = defineProps<{
  employee: Employee
  tools: Tool[]
  scannedItems: QRCode[]
  materials?: any[]
}>()

const combinedData = computed(() => {
  const result: any[] = []
  
  // Scanned details
  props.scannedItems.forEach((doc, index) => {
    result.push({
      key: `scanned-${doc.id}`,
      index: index + 1,
      orderNumber: doc.orderNumber,
      name: doc.productName,
      subtext: `ID (QR): ${doc.code}`,
      unit: 'шт.',
      quantity: 1,
      timestamp: doc.scannedAt,
      status: 'Укомплектовано',
      isScanned: true,
      showScanOk: true
    })
  })

  // Materials from invoice
  const offset = props.scannedItems.length
  props.materials?.forEach((group) => {
    group.items?.forEach((item: any, iIdx: number) => {
      result.push({
        key: `item-${group.date}-${iIdx}`,
        index: offset + iIdx + 1,
        orderNumber: group.orderNumber,
        name: item.productName,
        subtext: `ART: ${item.article || 'N/A'}`,
        unit: item.unit || 'шт.',
        quantity: item.quantity,
        timestamp: item.scannedAt || group.date,
        status: 'Укомплектовано',
        isScanned: false,
        showScanOk: true
      })
    })
  })

  return result
})

const columns = [
  {
    title: '№',
    key: 'index',
    width: 60,
    render: (row: any) => h('span', { class: 'text-gray-500 font-bold' }, row.index)
  },
  {
    title: 'Комплектующие / Артикул',
    key: 'name',
    render: (row: any) => h('div', [
      h('div', { class: 'font-bold text-white uppercase text-[12px] tracking-tight' }, row.name),
      h('div', { class: 'text-[10px] text-gray-500 font-mono mt-0.5' }, row.subtext)
    ])
  },
  {
    title: 'Заказ',
    key: 'orderNumber',
    width: 120,
    render: (row: any) => h(NTag, { type: 'success', quaternary: true, size: 'small', class: 'font-bold font-mono' }, { default: () => row.orderNumber || '—' })
  },
  {
    title: 'Ед.',
    key: 'unit',
    width: 80,
    render: (row: any) => h('span', { class: 'text-gray-400 font-medium' }, row.unit)
  },
  {
    title: 'Кол-во',
    key: 'quantity',
    width: 80,
    render: (row: any) => h('span', { class: 'font-black text-white' }, row.quantity)
  },
  {
    title: 'Дата, время',
    key: 'timestamp',
    width: 150,
    render: (row: any) => h('div', { class: 'flex items-center gap-1.5 text-gray-400 text-[11px]' }, [
      h(NIcon, { size: 14 }, { default: () => h(TimeOutline) }),
      h('span', formatDateTime(row.timestamp))
    ])
  },
  {
    title: 'Статус',
    key: 'status',
    width: 180,
    align: 'right' as const,
    render: (row: any) => h('div', { class: 'flex flex-col items-end' }, [
      h('div', { class: 'flex items-center gap-1.5' }, [
        h(NIcon, { color: '#18a058' }, { default: () => h(CheckmarkCircleOutline) }),
        h('span', { class: 'text-[10px] font-black uppercase text-green-500' }, row.status)
      ]),
      row.showScanOk ? h('div', { 
        class: 'text-[9px] text-green-500 font-black mt-1 uppercase border border-green-500/30 px-1 py-0.5 rounded leading-none' 
      }, 'SCAN OK') : null
    ])
  }
]

const formatDateTime = (date: any) => {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d)
}
</script>

<style scoped>
:deep(.registry-table) {
  --n-td-color: #1a1a1e !important;
  --n-td-color-striped: #242428 !important;
  --n-th-color: #101014 !important;
  --n-th-font-weight: 900 !important;
  --n-th-text-color: #666 !important;
  --n-border-color: #333 !important;
  --n-td-text-color: #eee !important;
}

.production-document-registry-style {
  background: #1a1a1e;
}
</style>


