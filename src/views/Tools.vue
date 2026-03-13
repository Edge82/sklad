<template>
  <div class="tools-page p-6">
    <div class="flex justify-between items-center mb-6">
      <div>
        <n-h1>Учёт инструментов</n-h1>
        <n-text depth="3">Реестр, выдача и ремонт инструментов</n-text>
      </div>
      <n-button type="primary" @click="handleAddTool">Добавить инструмент</n-button>
    </div>

    <n-grid :cols="5" :x-gap="12" :y-gap="12" class="mb-6 items-stretch" style="padding: 8px 0">
      <n-gi>
        <n-card
          size="small" 
          hoverable
          class="metric-card h-full flex flex-col justify-center"
          :class="{ 'active': filters.status === 'all' }"
          @click="filters.status = 'all'"
        >
          <div class="flex items-center gap-3 py-1">
            <n-icon size="28" color="#18a058">
              <HammerOutline />
            </n-icon>
            <div>
              <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Всего ед.</n-text>
              <n-h3 class="m-0 leading-none">{{ toolsStore.tools.length }}</n-h3>
            </div>
          </div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card
          size="small" 
          hoverable
          class="metric-card h-full flex flex-col justify-center"
          :class="{ 'active': filters.status === 'in_stock' }"
          @click="filters.status = 'in_stock'"
        >
          <div class="flex items-center gap-3 py-1">
            <n-icon size="28" color="#18a058">
              <CheckmarkCircleOutline />
            </n-icon>
            <div>
              <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">В наличии</n-text>
              <n-h3 class="m-0 leading-none">{{ toolsStore.inStockTools.length }}</n-h3>
            </div>
          </div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card
          size="small" 
          hoverable
          class="metric-card h-full flex flex-col justify-center"
          :class="{ 'active': filters.status === 'issued' }"
          @click="filters.status = 'issued'"
        >
          <div class="flex items-center gap-3 py-1">
            <n-icon size="28" color="#2080f0">
              <ConstructOutline />
            </n-icon>
            <div>
              <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Выдано</n-text>
              <n-h3 class="m-0 leading-none">{{ toolsStore.issuedTools.length }}</n-h3>
            </div>
          </div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card
          size="small" 
          hoverable
          class="metric-card h-full flex flex-col justify-center"
          :class="{ 'active': filters.status === 'repair' }"
          @click="filters.status = 'repair'"
        >
          <div class="flex items-center gap-3 py-1">
            <n-icon size="28" color="#f0a020">
              <BuildOutline />
            </n-icon>
            <div>
              <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">В ремонте</n-text>
              <n-h3 class="m-0 leading-none">{{ toolsStore.repairTools.length }}</n-h3>
            </div>
          </div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card border-variant="dark" class="metric-card revenue-card h-full flex flex-col justify-center" size="small">
          <div class="flex items-center gap-3 py-1">
            <n-icon size="28" color="#18a058" :component="CashOutline" />
            <div>
              <n-text depth="3" class="revenue-label block mb-1">Стоимость инстр.</n-text>
              <n-h3 class="m-0 leading-none revenue-value" style="font-size: 22px;">{{ formatCurrency(totalToolsCost) }}</n-h3>
            </div>
          </div>
        </n-card>
      </n-gi>
    </n-grid>

    <n-card class="mb-4" size="small">
      <n-space align="center" :size="[16, 12]">
        <n-input
          v-model:value="filters.search"
          placeholder="Поиск инструмента..."
          clearable
          style="width: 320px"
        >
          <template #prefix>
            <n-icon><SearchOutline /></n-icon>
          </template>
        </n-input>
        
        <n-select 
          v-model:value="filters.status" 
          placeholder="Все статусы" 
          :options="[
            { label: 'Все инструменты', value: 'all' },
            { label: 'В наличии', value: 'available' },
            { label: 'Выдано', value: 'issued' },
            { label: 'В ремонте', value: 'repair' }
          ]" 
          clearable
          style="width: 180px" 
        />
        
        <n-button @click="() => { filters.search = ''; filters.status = 'all'; }" quaternary type="warning">
          Сбросить фильтры
        </n-button>

        <n-tag v-if="filters.status !== 'all'" closable @close="filters.status = 'all'">
          Активен статус: {{ getStatusLabel(filters.status) }}
        </n-tag>
      </n-space>
    </n-card>

    <n-card size="small">
      <n-data-table 
        :columns="columns" 
        :data="filteredTools" 
        :row-props="(row: Tool) => ({
          style: 'cursor: pointer',
          onClick: () => handleEditTool(row.id)
        })"
      />
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
import { ref, h, reactive, computed } from 'vue'
import {
  NTag,
  NButton,
  NSpace,
  NIcon,
  useDialog,
  useMessage,
  NText,
  NGrid,
  NGi,
  NCard,
  NDataTable,
  NInput,
  type DataTableColumns
} from 'naive-ui'
import { useToolsStore } from '@/stores/tools'
import {
  TrashOutline,
  QrCodeOutline,
  CashOutline,
  BuildOutline,
  HammerOutline,
  ConstructOutline,
  CheckmarkCircleOutline,
  SearchOutline
} from '@vicons/ionicons5'
import ToolModal from '@/components/tools/ToolModal.vue'
import QRPrintModal from '@/components/common/QRPrintModal.vue'
import type { Tool } from '@/types'

const toolsStore = useToolsStore()
const dialog = useDialog()
const message = useMessage()

// Фильтры
const filters = reactive({
  search: '',
  status: 'all' as 'all' | 'in_stock' | 'issued' | 'repair'
})

const filteredTools = computed(() => {
  return toolsStore.tools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                        tool.inventoryNumber.toLowerCase().includes(filters.search.toLowerCase())
    
    if (filters.status === 'all') return matchesSearch
    return matchesSearch && tool.status === filters.status
  })
})

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'in_stock': return 'В наличии'
    case 'issued': return 'Выдано'
    case 'repair': return 'В ремонте'
    default: return 'Все'
  }
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0
  }).format(amount)
}

const totalToolsCost = computed(() => {
  return filteredTools.value.reduce((sum, tool) => sum + (Number(tool.price) || 0), 0)
})

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

const handlePrintQR = (tool: Tool) => {
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

const handleToolSubmit = (toolData: Partial<Tool>) => {
  if (selectedToolId.value) {
    toolsStore.updateTool(selectedToolId.value, toolData)
    message.success('Данные инструмента обновлены')
  } else {
    toolsStore.addTool(toolData as Omit<Tool, 'id'>)
    message.success('Инструмент добавлен в реестр')
  }
}

const columns: DataTableColumns<Tool> = [
  { title: 'Инв. №', key: 'inventoryNumber', width: 120 },
  { title: 'Наименование', key: 'name' },
  { 
    title: 'Тип', 
    key: 'type',
    width: 120,
    render(row) {
      const typeMap: Record<string, string> = {
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
    title: 'Цена',
    key: 'price',
    width: 120,
    render(row) {
      return row.price ? formatCurrency(row.price) : '-'
    }
  },
  { 
    title: 'Статус', 
    key: 'status',
    width: 120,
    render(row) {
      const statusMap: Record<string, { label: string, type: 'success' | 'info' | 'warning' | 'error' | 'default' }> = {
        'in_stock': { label: 'На складе', type: 'success' },
        'issued': { label: 'Выдано', type: 'info' },
        'repair': { label: 'В ремонте', type: 'warning' },
        'written_off': { label: 'Списано', type: 'error' }
      }
      const s = statusMap[row.status] || { label: row.status, type: 'default' }
      return h(NTag, { type: s.type }, { default: () => s.label })
    }
  },
  { title: 'Где/У кого', key: 'issuedToName', render(row) { return row.issuedToName || row.location || '-' } },
  {
    title: 'Действия',
    key: 'actions',
    width: 100,
    render(row) {
      return h(NSpace, { wrap: false }, {
        default: () => [
          h(NButton, {
            size: 'small',
            quaternary: true,
            onClick: (e) => { e.stopPropagation(); handlePrintQR(row) }
          }, { icon: () => h(NIcon, null, { default: () => h(QrCodeOutline) }) }),
          h(NButton, {
            size: 'small',
            quaternary: true,
            type: 'error',
            onClick: (e) => { e.stopPropagation(); handleDeleteTool(row.id) }
          }, { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) })
        ]
      })
    }
  }
]
</script>

<style scoped>
.tools-page {
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 24px;
}
@media (max-width: 768px) {
  .tools-page {
    padding: 0 12px;
  }
}

.metric-card {
  height: 100%;
  background-color: #2a2a2a;
  border-bottom: 4px solid transparent;
  transition: all 0.3s ease;
  cursor: pointer;
}

.metric-card:not(.revenue-card):hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  background-color: #333;
}

.metric-card.active {
  background-color: #333;
  border-bottom-color: #18a058;
}

.revenue-card {
  background: rgba(24, 160, 88, 0.1) !important;
  border: 1px solid rgba(24, 160, 88, 0.3) !important;
  cursor: default !important;
}

.revenue-label {
  color: #18a058 !important;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-size: 10px;
  line-height: 1;
  margin-bottom: 4px;
}

.line-height-1 {
  line-height: 1;
}

.revenue-value {
  color: #18a058 !important;
  font-weight: 900 !important;
}
</style>