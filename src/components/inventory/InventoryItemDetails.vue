<template>
  <n-modal v-model:show="showModal" preset="card" :title="`Детали: ${item?.name || 'Материал'}`" style="width: 1000px"
    :bordered="false" size="huge" @close="handleClose">
    <div v-if="item" class="item-details">
      <!-- Шапка с основной информацией -->
      <div class="mb-6">
        <div class="flex justify-between items-start mb-4">
          <div>
            <n-h2 class="m-0">{{ item.name }}</n-h2>
            <div class="flex items-center gap-3 mt-2">
              <n-text code>{{ item.sku }}</n-text>
              <n-tag :type="inventoryStore.getStatusColor(item.status)" size="small">
                {{ inventoryStore.getStatusLabel(item.status) }}
              </n-tag>
              <n-text depth="3">{{ item.category }}</n-text>
            </div>
          </div>
          <div class="flex gap-2">
            <n-button type="warning" @click="handleEdit">
              <template #icon>
                <n-icon>
                  <PencilOutline />
                </n-icon>
              </template>
              Редактировать
            </n-button>
            <n-button type="primary" @click="printLabel">
              <template #icon>
                <n-icon>
                  <PrintOutline />
                </n-icon>
              </template>
              Печать этикетки
            </n-button>
          </div>
        </div>
      </div>

      <n-tabs type="line" animated>
        <!-- Основная информация -->
        <n-tab-pane name="info" tab="Информация">
          <n-grid :cols="2" :x-gap="24" :y-gap="16">
            <!-- Основные данные -->
            <n-gi>
              <n-card title="Основные данные" size="small">
                <n-list>
                  <n-list-item>
                    <n-thing title="Артикул" :description="item.sku" />
                  </n-list-item>
                  <n-list-item>
                    <n-thing title="Штрих-код" :description="item.barcode || 'Не указан'" />
                  </n-list-item>
                  <n-list-item>
                    <n-thing title="Категория" :description="item.category" />
                  </n-list-item>
                  <n-list-item>
                    <n-thing title="Единица измерения" :description="item.unit" />
                  </n-list-item>
                  <n-list-item>
                    <n-thing title="Описание" :description="item.description || 'Нет описания'" />
                  </n-list-item>
                </n-list>
              </n-card>
            </n-gi>

            <!-- Количественные показатели -->
            <n-gi>
              <n-card title="Остатки" size="small">
                <n-list>
                  <n-list-item>
                    <n-thing title="Текущий остаток">
                      <template #description>
                        <div class="flex items-center gap-2">
                          <n-text strong size="large">{{ item.currentStock }} {{ item.unit }}</n-text>
                          <n-tag v-if="item.reserved > 0" type="info" size="small">
                            {{ item.reserved }} в резерве
                          </n-tag>
                        </div>
                      </template>
                    </n-thing>
                  </n-list-item>
                  <n-list-item>
                    <n-thing title="Доступно" :description="`${item.available} ${item.unit}`" />
                  </n-list-item>
                  <n-list-item>
                    <n-thing title="Минимальный запас" :description="`${item.minStock} ${item.unit}`" />
                  </n-list-item>
                  <n-list-item>
                    <n-thing title="Максимальный запас" :description="`${item.maxStock} ${item.unit}`" />
                  </n-list-item>
                  <n-list-item>
                    <n-thing title="Место хранения" :description="item.location" />
                  </n-list-item>
                </n-list>
              </n-card>
            </n-gi>

            <!-- Финансовые данные -->
            <n-gi>
              <n-card title="Финансы" size="small">
                <n-list>
                  <n-list-item>
                    <n-thing title="Цена закупки" :description="formatCurrency(item.purchasePrice)" />
                  </n-list-item>
                  <n-list-item>
                    <n-thing title="Средняя цена" :description="formatCurrency(item.averagePrice)" />
                  </n-list-item>
                  <n-list-item>
                    <n-thing title="Последняя цена" :description="formatCurrency(item.lastPurchasePrice)" />
                  </n-list-item>
                  <n-list-item>
                    <n-thing title="Общая стоимость">
                      <template #description>
                        <n-text strong type="primary">{{ formatCurrency(item.totalValue) }}</n-text>
                      </template>
                    </n-thing>
                  </n-list-item>
                </n-list>
              </n-card>
            </n-gi>

            <!-- Поставщики -->
            <n-gi>
              <n-card title="Поставщики" size="small">
                <n-list>
                  <n-list-item>
                    <n-thing title="Основной поставщик" :description="item.mainSupplier" />
                  </n-list-item>
                  <n-list-item>
                    <n-thing title="Срок поставки" :description="`${item.deliveryTime} дней`" />
                  </n-list-item>
                  <n-list-item>
                    <n-thing title="Мин. партия" :description="`${item.minOrderQuantity} ${item.unit}`" />
                  </n-list-item>
                  <n-list-item v-if="item.alternativeSuppliers.length > 0">
                    <n-thing title="Альтернативные поставщики">
                      <template #description>
                        <div class="flex flex-wrap gap-1">
                          <n-tag v-for="supplier in item.alternativeSuppliers" :key="supplier" size="small">
                            {{ supplier }}
                          </n-tag>
                        </div>
                      </template>
                    </n-thing>
                  </n-list-item>
                </n-list>
              </n-card>
            </n-gi>
          </n-grid>
        </n-tab-pane>

        <!-- История операций -->
        <n-tab-pane name="history" tab="История операций">
          <n-card>
            <div class="mb-4">
              <n-space>
                <n-date-picker v-model:value="historyDateRange" type="daterange" clearable placeholder="Период"
                  style="width: 300px" />
                <n-button @click="loadHistory">
                  <template #icon>
                    <n-icon>
                      <RefreshOutline />
                    </n-icon>
                  </template>
                  Обновить
                </n-button>
              </n-space>
            </div>

            <n-data-table :columns="historyColumns" :data="filteredHistory" :pagination="{ pageSize: 10 }" striped />
          </n-card>
        </n-tab-pane>

        <!-- Статистика -->
        <n-tab-pane name="stats" tab="Статистика">
          <n-grid :cols="2" :x-gap="16" :y-gap="16">
            <n-gi>
              <n-card title="Потребление">
                <div class="text-center py-8">
                  <n-statistic label="Всего потреблено" :value="item.totalConsumed">
                    <template #suffix>{{ item.unit }}</template>
                  </n-statistic>
                </div>
              </n-card>
            </n-gi>
            <n-gi>
              <n-card title="Популярность">
                <div class="text-center py-8">
                  <n-progress type="circle" :percentage="item.popularity * 10" :stroke-width="10" :gap-degree="180"
                    :gap-offset-degree="0" :offset-degree="180">
                    <span class="text-2xl">{{ item.popularity }}/10</span>
                  </n-progress>
                </div>
              </n-card>
            </n-gi>
            <n-gi :span="2">
              <n-card title="Последние операции">
                <n-list>
                  <n-list-item v-if="item.lastReceived">
                    <n-thing title="Последний приход" :description="formatDate(item.lastReceived)" />
                  </n-list-item>
                  <n-list-item v-if="item.lastIssued">
                    <n-thing title="Последний расход" :description="formatDate(item.lastIssued)" />
                  </n-list-item>
                  <n-list-item>
                    <n-thing title="Дата создания" :description="formatDate(item.createdAt)" />
                  </n-list-item>
                  <n-list-item>
                    <n-thing title="Последнее обновление" :description="formatDate(item.updatedAt)" />
                  </n-list-item>
                </n-list>
              </n-card>
            </n-gi>
          </n-grid>
        </n-tab-pane>
      </n-tabs>

      <div class="flex justify-end gap-3 mt-6">
        <n-button @click="showModal = false">Закрыть</n-button>
      </div>
    </div>

    <div v-else class="text-center py-8">
      <n-text depth="3">Материал не найден</n-text>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import type { InventoryItem, InventoryTransaction } from '@/types'
import type { DataTableColumns } from 'naive-ui'
import {
  NModal,
  NTabs,
  NTabPane,
  NGrid,
  NGi,
  NCard,
  NList,
  NListItem,
  NThing,
  NText,
  NTag,
  NButton,
  NIcon,
  NH2,
  NDatePicker,
  NSpace,
  NDataTable,
  NStatistic,
  NProgress
} from 'naive-ui'
import {
  PencilOutline,
  PrintOutline,
  RefreshOutline,
  ArrowDownOutline,
  ArrowUpOutline,
  SwapHorizontalOutline
} from '@vicons/ionicons5'

const props = defineProps<{
  show: boolean
  itemId: number | null
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  edit: [id: number]
}>()

const inventoryStore = useInventoryStore()
const historyDateRange = ref<[number, number] | null>(null)

const showModal = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})

const item = computed(() => {
  return props.itemId ? inventoryStore.getItemById(props.itemId) : null
})

const itemHistory = computed(() => {
  if (!props.itemId) return []
  return inventoryStore.getTransactionsByItem(props.itemId)
})

const filteredHistory = computed(() => {
  let history = itemHistory.value

  if (historyDateRange.value) {
    const [start, end] = historyDateRange.value
    history = history.filter(transaction => {
      const date = transaction.createdAt.getTime()
      return date >= start && date <= end
    })
  }

  return history
})

const historyColumns: DataTableColumns<InventoryTransaction> = [
  {
    title: 'Тип',
    key: 'type',
    width: 100,
    render: (row) => {
      const icon = row.type === 'incoming' ? ArrowDownOutline :
        row.type === 'outgoing' ? ArrowUpOutline : SwapHorizontalOutline
      const color = row.type === 'incoming' ? 'green' :
        row.type === 'outgoing' ? 'red' : 'orange'
      return h('div', { class: 'flex items-center gap-2' }, [
        h(NIcon, { size: '16', color }, () => h(icon)),
        h('span', getTransactionTypeLabel(row.type))
      ])
    }
  },
  {
    title: 'Количество',
    key: 'quantity',
    width: 100,
    render: (row) => `${row.quantity} ${item.value?.unit || ''}`
  },
  {
    title: 'Цена',
    key: 'unitPrice',
    width: 100,
    render: (row) => row.unitPrice ? formatCurrency(row.unitPrice) : '-'
  },
  {
    title: 'Сумма',
    key: 'totalPrice',
    width: 120,
    render: (row) => row.totalPrice ? formatCurrency(row.totalPrice) : '-'
  },
  {
    title: 'Документ',
    key: 'documentNumber',
    width: 150,
    render: (row) => row.documentNumber || '-'
  },
  {
    title: 'Причина',
    key: 'reason',
    width: 200,
    ellipsis: true
  },
  {
    title: 'Дата',
    key: 'createdAt',
    width: 150,
    render: (row) => formatDateTime(row.createdAt)
  },
  {
    title: 'Создал',
    key: 'createdBy',
    width: 120
  }
]

// Вспомогательные функции
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0
  }).format(amount)
}

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('ru-RU').format(date)
}

const formatDateTime = (date: Date) => {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const getTransactionTypeLabel = (type: string) => {
  const typeMap: Record<string, string> = {
    'incoming': 'Приход',
    'outgoing': 'Расход',
    'transfer': 'Перемещение',
    'adjustment': 'Корректировка',
    'reservation': 'Резервирование',
    'write_off': 'Списание'
  }
  return typeMap[type] || type
}

// Обработчики
const handleClose = () => {
  showModal.value = false
}

const handleEdit = () => {
  if (item.value) {
    emit('edit', item.value.id)
    showModal.value = false
  }
}

const printLabel = () => {
  window.$message?.info('Печать этикетки')
}

const loadHistory = () => {
  window.$message?.success('История обновлена')
}
</script>

<style scoped>
.item-details {
  max-width: 100%;
}
</style>
