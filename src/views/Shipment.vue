<template>
  <div class="shipment-page p-6 bg-[#1a1a1a] min-h-full">
    <div class="flex justify-between items-center mb-8">
      <div>
        <n-h1 class="mb-0 text-white">📦 Отгрузка продукции</n-h1>
        <n-text depth="3">Контроль логистики и распределения заказов производства</n-text>
      </div>
      <n-button type="primary" size="large" @click="showCreateModal = true">
        <template #icon>
          <n-icon><add-circle-outline /></n-icon>
        </template>
        Новая отгрузка
      </n-button>
    </div>

    <!-- Статистика -->
    <n-grid :cols="4" :x-gap="16" class="mb-8">
      <n-gi v-for="stat in stats" :key="stat.label">
        <n-card bordered class="stat-card" size="medium">
          <div class="flex items-center gap-4">
            <div 
              class="w-12 h-12 rounded-lg flex items-center justify-center"
              :style="{ backgroundColor: stat.color + '20' }"
            >
              <n-icon size="24" :component="stat.icon" :color="stat.color" />
            </div>
            <div>
              <n-statistic :label="stat.label" :value="stat.value">
                <template #label>
                  <n-text depth="3" class="text-xs uppercase tracking-wider font-semibold">
                    {{ stat.label }}
                  </n-text>
                </template>
              </n-statistic>
            </div>
          </div>
        </n-card>
      </n-gi>
    </n-grid>

    <n-card bordered class="table-card">
      <div class="flex items-center justify-between mb-6 pb-4 border-b border-gray-800">
        <n-tabs type="segment" v-model:value="activeTab" style="width: 400px">
          <n-tab name="all">Все потоки</n-tab>
          <n-tab name="pending">В ожидании</n-tab>
          <n-tab name="completed">Завершенные</n-tab>
        </n-tabs>
        
        <div class="flex gap-3">
          <n-input-group>
            <n-input placeholder="Поиск накладной или заказа..." v-model:value="searchQuery" style="width: 300px">
              <template #prefix>
                <n-icon><search-outline /></n-icon>
              </template>
            </n-input>
            <n-button type="primary" ghost>
              Найти
            </n-button>
          </n-input-group>
        </div>
      </div>

      <n-data-table
        :columns="columns"
        :data="filteredShipments"
        :pagination="pagination"
        :loading="loading"
        :row-class-name="() => 'row-dark'"
      />
    </n-card>

    <!-- Модальное окно создания отгрузки -->
    <n-modal
      v-model:show="showCreateModal"
      preset="card"
      title="Новая отгрузка"
      class="max-w-2xl"
      :segmented="{ content: 'soft', footer: 'soft' }"
    >
      <n-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-placement="left"
        label-width="140"
      >
        <n-form-item label="Заказ" path="orderId">
          <n-select
            v-model:value="formData.orderId"
            :options="orderOptions"
            placeholder="Выберите заказ"
            @update:value="handleOrderChange"
          />
        </n-form-item>
        
        <n-form-item label="Пункт назначения" path="destination">
          <n-input v-model:value="formData.destination" placeholder="Напр. Склад клиента" />
        </n-form-item>

        <n-grid :cols="2" :x-gap="12">
          <n-grid-item>
            <n-form-item label="Водитель" path="driverName">
              <n-input v-model:value="formData.driverName" placeholder="ФИО" />
            </n-form-item>
          </n-grid-item>
          <n-grid-item>
            <n-form-item label="Транспорт" path="vehicleInfo">
              <n-input v-model:value="formData.vehicleInfo" placeholder="Марка, госномер" />
            </n-form-item>
          </n-grid-item>
        </n-grid>

        <n-form-item label="Накладная" path="waybillNumber">
          <n-input v-model:value="formData.waybillNumber" placeholder="№ ТТН" />
        </n-form-item>

        <n-divider>Сканирование</n-divider>
        <n-alert
          title="Режим сканирования"
          type="info"
          bordered
        >
          Для привязки конкретных QR-кодов к отгрузке используйте мобильный сканер 
          или перейдите в раздел <n-a @click="$router.push('/scan')">Сканирование</n-a>.
        </n-alert>
      </n-form>
      
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button @click="showCreateModal = false">Отмена</n-button>
          <n-button type="primary" @click="handleSubmit" :loading="submitting">
            Подтвердить отгрузку
          </n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h, reactive } from 'vue'
import { 
  NTag, NButton, NIcon, NSpace, NH1, NCard, NGrid, NGridItem, 
  NStatistic, NTabs, NTab, NInput, NDataTable, NModal, NForm, 
  NFormItem, NSelect, NDivider, NText, NA, useMessage, useDialog,
  type DataTableColumns, type FormInst
} from 'naive-ui'
import { 
  AddCircleOutline, 
  SearchOutline, 
  TrashOutline, 
  EyeOutline,
  QrCodeOutline,
  DocumentTextOutline,
  CarOutline,
  CheckmarkCircleOutline,
  TimeOutline
} from '@vicons/ionicons5'
import { useShipmentsStore } from '@/stores/shipments'
import { useOrdersStore } from '@/stores/orders'
import type { OrderShipment } from '@/types'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

const message = useMessage()
const dialog = useDialog()
const shipmentsStore = useShipmentsStore()
const ordersStore = useOrdersStore()

const loading = ref(false)
const submitting = ref(false)
const showCreateModal = ref(false)
const activeTab = ref('all')
const searchQuery = ref('')
const formRef = ref<FormInst | null>(null)

// Статистика
const stats = computed(() => [
  { label: 'Всего отгрузок', value: shipmentsStore.shipments.length, icon: DocumentTextOutline, color: '#18a058' },
  { label: 'За сегодня', value: 1, icon: TimeOutline, color: '#2080f0' },
  { label: 'В пути', value: 2, icon: CarOutline, color: '#f0a020' },
  { label: 'Доставлено', value: 12, icon: CheckmarkCircleOutline, color: '#18a058' }
])

// Опции для выбора заказа
const orderOptions = computed(() => 
  ordersStore.orders
    .filter(o => ['ready', 'partially_ready', 'in_progress'].includes(o.status))
    .map(o => ({ 
      label: `${o.orderNumber} (${o.customerName})`, 
      value: o.id 
    }))
)

// Форма
const formData = reactive({
  orderId: null as string | null,
  orderNumber: '',
  destination: '',
  driverName: '',
  vehicleInfo: '',
  waybillNumber: '',
  status: 'pending' as const,
  createdBy: 'Администратор',
  items: [],
  qrCodes: []
})

const rules = {
  orderId: { required: true, message: 'Выберите заказ' },
  destination: { required: true, message: 'Укажите пункт назначения' }
}

const handleOrderChange = (val: string) => {
  const order = ordersStore.orders.find(o => o.id === val)
  if (order) {
    formData.orderNumber = order.orderNumber
  }
}

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
    submitting.value = true
    
    // В реальном приложении здесь был бы API запрос
    shipmentsStore.addShipment({
      orderId: formData.orderId!,
      orderNumber: formData.orderNumber,
      destination: formData.destination,
      driverName: formData.driverName,
      vehicleInfo: formData.vehicleInfo,
      waybillNumber: formData.waybillNumber,
      status: 'completed', // Сразу завершаем для примера
      createdBy: formData.createdBy,
      items: [],
      qrCodes: []
    })

    // Обновляем статус заказа
    ordersStore.updateOrder(formData.orderId!, { status: 'shipped' })

    message.success('Отгрузка успешно создана и проведена')
    showCreateModal.value = false
    
    // Сброс формы
    Object.assign(formData, {
      orderId: null,
      orderNumber: '',
      destination: '',
      driverName: '',
      vehicleInfo: '',
      waybillNumber: '',
      status: 'pending'
    })
  } catch (err) {
    message.error('Заполните обязательные поля')
  } finally {
    submitting.value = false
  }
}

// Таблица
const columns: DataTableColumns<OrderShipment> = [
  {
    title: '№ Отгрузки',
    key: 'shipmentNumber',
    width: 150,
    render(row) {
      return h('span', { class: 'font-mono font-bold text-[#18a058]' }, row.shipmentNumber)
    }
  },
  {
    title: 'Заказ',
    key: 'orderNumber',
    width: 140
  },
  {
    title: 'Дата',
    key: 'createdAt',
    render(row) {
      return format(new Date(row.createdAt), 'dd.MM.yyyy HH:mm', { locale: ru })
    }
  },
  {
    title: 'Получатель/Пункт',
    key: 'destination'
  },
  {
    title: 'Логистика',
    key: 'logistic',
    render(row) {
      return h('div', [
        h('div', { class: 'text-xs text-gray-400' }, row.driverName || '—'),
        h('div', { class: 'text-xs text-gray-400' }, row.vehicleInfo || '—')
      ])
    }
  },
  {
    title: 'Статус',
    key: 'status',
    render(row) {
      const type = row.status === 'completed' ? 'success' : row.status === 'pending' ? 'info' : 'error'
      const label = row.status === 'completed' ? 'Завершена' : row.status === 'pending' ? 'В пути' : 'Отменена'
      return h(NTag, { type, bordered: false, size: 'small' }, { default: () => label })
    }
  },
  {
    title: 'Действия',
    key: 'actions',
    width: 100,
    render(row) {
      return h(NSpace, { size: 'small' }, {
        default: () => [
          h(NButton, {
            quaternary: true,
            circle: true,
            size: 'small',
            type: 'info',
            onClick: () => message.info(`Просмотр отгрузки ${row.shipmentNumber}`)
          }, { icon: () => h(NIcon, null, { default: () => h(EyeOutline) }) }),
          h(NButton, {
            quaternary: true,
            circle: true,
            size: 'small',
            type: 'error',
            onClick: () => handleDelete(row.id)
          }, { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) })
        ]
      })
    }
  }
]

const handleDelete = (id: string) => {
  dialog.warning({
    title: 'Удаление отгрузки',
    content: 'Вы уверены, что хотите удалить запись об отгрузке? Это действие нельзя отменить.',
    positiveText: 'Удалить',
    negativeText: 'Отмена',
    onPositiveClick: () => {
      shipmentsStore.deleteShipment(id)
      message.success('Отгрузка удалена')
    }
  })
}

const filteredShipments = computed(() => {
  let list = shipmentsStore.shipments
  
  if (activeTab.value !== 'all') {
    list = list.filter(s => s.status === activeTab.value)
  }
  
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(s => 
      s.shipmentNumber.toLowerCase().includes(q) || 
      s.orderNumber.toLowerCase().includes(q) ||
      s.destination.toLowerCase().includes(q)
    )
  }
  
  return list
})

const pagination = {
  pageSize: 10
}
</script>

<style scoped>
.shipment-page {
  background-color: #1a1a1a;
  min-height: 100%;
}

.stat-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-color: #333 !important;
  background-color: #242424;
}

.stat-card:hover {
  transform: translateY(-2px);
  border-color: #444 !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.table-card {
  border-color: #333 !important;
  background-color: #242424;
}

:deep(.n-data-table) {
  background-color: transparent !important;
}

:deep(.n-data-table-td) {
  background-color: transparent !important;
  border-bottom: 1px solid #333 !important;
}

:deep(.n-data-table-th) {
  background-color: #2a2a2a !important;
  border-bottom: 2px solid #333 !important;
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 0.5px;
  color: #888;
}

:deep(.n-tabs-tab) {
  font-size: 13px;
}

:deep(.n-statistic .n-statistic-value .n-statistic-value__content) {
  font-size: 20px;
  font-weight: 700;
}
</style>
