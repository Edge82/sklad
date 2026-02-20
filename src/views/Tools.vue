<template>
  <div class="tools-page">
    <div class="flex justify-between items-center mb-6">
      <div>
        <n-h1>Учёт инструментов</n-h1>
        <n-text depth="3">Реестр, выдача и ремонт инструментов</n-text>
      </div>
      <n-button type="primary" @click="handleAddTool">Добавить инструмент</n-button>
    </div>

    <n-grid :cols="4" :x-gap="16" :y-gap="16" class="mb-6">
      <n-gi>
        <n-card title="На складе" size="small">
          <n-h2>{{ toolsStore.inStockTools.length }}</n-h2>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card title="Выдано" size="small">
          <n-h2>{{ toolsStore.issuedTools.length }}</n-h2>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card title="В ремонте" size="small">
          <n-h2>{{ toolsStore.repairTools.length }}</n-h2>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card title="Списано" size="small">
          <n-h2>0</n-h2>
        </n-card>
      </n-gi>
    </n-grid>

    <n-card>
      <n-tabs type="line">
        <n-tab-pane name="list" tab="Список инструментов">
          <n-data-table :columns="columns" :data="toolsStore.tools" />
        </n-tab-pane>
        <n-tab-pane name="movement" tab="Выдача/Возврат">
          <!-- TODO: Movement logic -->
        </n-tab-pane>
        <n-tab-pane name="repair" tab="Поломки и ремонт">
          <!-- TODO: Repair logic -->
        </n-tab-pane>
      </n-tabs>
    </n-card>

    <ToolModal 
      v-model:show="showModal" 
      :tool-id="selectedToolId"
      @submit="handleToolSubmit" 
    />

    <QRPrintModal
      v-model:show="showPrintModal"
      :title="printData.title"
      :code="printData.code"
      :description="printData.description"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, h, reactive } from 'vue'
import { NTag, NButton, NSpace, NIcon, useDialog, useMessage } from 'naive-ui'
import { useToolsStore } from '@/stores/tools'
import { PencilOutline, TrashOutline, QrCodeOutline } from '@vicons/ionicons5'
import ToolModal from '@/components/tools/ToolModal.vue'
import QRPrintModal from '@/components/common/QRPrintModal.vue'

const toolsStore = useToolsStore()
const dialog = useDialog()
const message = useMessage()

const showModal = ref(false)
const selectedToolId = ref<string | null>(null)

const showPrintModal = ref(false)
const printData = reactive({
  title: '',
  code: '',
  description: ''
})

const handleAddTool = () => {
  selectedToolId.value = null
  showModal.value = true
}

const handleEditTool = (id: string) => {
  selectedToolId.value = id
  showModal.value = true
}

const handlePrintQR = (tool: any) => {
  printData.title = tool.name
  printData.code = tool.qrCode || tool.inventoryNumber
  printData.description = `Инв. №: ${tool.inventoryNumber}`
  showPrintModal.value = true
}

const handleDeleteTool = (id: string) => {
  dialog.warning({
    title: 'Удалить инструмент',
    content: 'Вы уверены, что хотите удалить этот инструмент?',
    positiveText: 'Удалить',
    negativeText: 'Отмена',
    onPositiveClick: () => {
      toolsStore.deleteTool(id)
      message.success('Инструмент удален')
    }
  })
}

const handleToolSubmit = (toolData: any) => {
  if (selectedToolId.value) {
    toolsStore.updateTool(selectedToolId.value, toolData)
    message.success('Данные инструмента обновлены')
  } else {
    toolsStore.addTool(toolData)
    message.success('Инструмент добавлен в реестр')
  }
}

const columns = [
  { title: 'Инв. №', key: 'inventoryNumber' },
  { title: 'Наименование', key: 'name' },
  { 
    title: 'Тип', 
    key: 'type',
    render(row: any) {
      const typeMap: any = {
        'power_tool': 'Электро',
        'hand_tool': 'Ручной',
        'measuring': 'Измерит.',
        'fixture': 'Оснастка',
        'container': 'Тара'
      }
      return typeMap[row.type] || row.type
    }
  },
  { 
    title: 'Статус', 
    key: 'status',
    render(row: any) {
      const statusMap: any = {
        'in_stock': { label: 'На складе', type: 'success' },
        'issued': { label: 'Выдано', type: 'info' },
        'repair': { label: 'В ремонте', type: 'warning' },
        'written_off': { label: 'Списано', type: 'error' }
      }
      const s = statusMap[row.status]
      return h(NTag, { type: s.type }, { default: () => s.label })
    }
  },
  { title: 'Где/У кого', key: 'issuedToName', render(row: any) { return row.issuedToName || row.location || '-' } },
  {
    title: 'Действия',
    key: 'actions',
    width: 150,
    render(row: any) {
      return h(NSpace, null, {
        default: () => [
          h(NButton, {
            size: 'small',
            quaternary: true,
            onClick: () => handlePrintQR(row)
          }, { icon: () => h(NIcon, null, { default: () => h(QrCodeOutline) }) }),
          h(NButton, {
            size: 'small',
            quaternary: true,
            onClick: () => handleEditTool(row.id)
          }, { icon: () => h(NIcon, null, { default: () => h(PencilOutline) }) }),
          h(NButton, {
            size: 'small',
            quaternary: true,
            type: 'error',
            onClick: () => handleDeleteTool(row.id)
          }, { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) })
        ]
      })
    }
  }
]
</script>
