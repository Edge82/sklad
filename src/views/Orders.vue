<template>
  <div class="orders-page">
    <div class="flex justify-between items-center mb-6">
      <div>
        <n-h1>Заказы</n-h1>
        <n-text depth="3">Управление заказами клиентов и WMS</n-text>
      </div>
      <div style="gap: 8px; display: flex; margin: 8px;">
        <n-button type="primary" @click="showCreateModal = true">
          <template #icon><n-icon><AddCircleOutline /></n-icon></template>
          Новый заказ
        </n-button>
      </div>
    </div>

    <!-- Статистика -->
    <n-grid :cols="4" :x-gap="16" :y-gap="16" class="mb-6">
      <n-gi>
        <n-card><n-statistic label="Всего заказов" :value="ordersStore.totalOrders" /></n-card>
      </n-gi>
      <n-gi>
        <n-card><n-statistic label="В производстве" :value="ordersStore.pendingOrders" /></n-card>
      </n-gi>
    </n-grid>

    <n-card>
      <n-data-table :columns="columns" :data="ordersStore.orders" />
    </n-card>

    <QRGeneratorModal
      v-if="selectedOrderForQR"
      :show="showQRModal"
      :order-id="selectedOrderForQR.id"
      :order-number="selectedOrderForQR.orderNumber"
      :items="selectedOrderForQR.items"
      @close="showQRModal = false"
    />

    <!-- Модальное окно создания/редактирования заказа -->
    <n-modal
      v-model:show="showCreateModal"
      preset="card"
      :title="selectedOrderForEdit ? 'Редактировать заказ' : 'Новый заказ'"
      style="width: 800px"
    >
      <OrderForm 
        :initial-data="selectedOrderForEdit" 
        @submit="handleOrderSubmit" 
        @cancel="showCreateModal = false" 
      />
    </n-modal>

    <!-- Просмотр деталей заказа -->
    <n-modal
      v-model:show="showDetailsModal"
      preset="card"
      title="Детали заказа"
      style="width: 900px"
    >
      <OrderDetails v-if="selectedOrderForDetails" :order="selectedOrderForDetails" />
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, h, watch } from 'vue'
import { useOrdersStore } from '@/stores/orders'
import { NButton, NIcon, NTag, NSpace, NModal, useMessage, useDialog } from 'naive-ui'
import { AddCircleOutline, QrCodeOutline, EyeOutline, CreateOutline, TrashOutline } from '@vicons/ionicons5'
import QRGeneratorModal from '@/components/qr-generator/QRGeneratorModal.vue'
import OrderForm from '@/components/orders/OrderForm.vue'
import OrderDetails from '@/components/orders/OrderDetails.vue'

const ordersStore = useOrdersStore()
const message = useMessage()
const dialog = useDialog()
const showCreateModal = ref(false)
const showQRModal = ref(false)
const showDetailsModal = ref(false)
const selectedOrderForQR = ref<any>(null)
const selectedOrderForDetails = ref<any>(null)
const selectedOrderForEdit = ref<any>(null)

watch(showCreateModal, (val) => {
  if (!val) selectedOrderForEdit.value = null
})

const handleOrderSubmit = (data: any) => {
  if (selectedOrderForEdit.value) {
    ordersStore.updateOrder(selectedOrderForEdit.value.id, data)
    message.success('Заказ успешно обновлен')
  } else {
    ordersStore.addOrder(data)
    message.success('Заказ успешно создан')
  }
  showCreateModal.value = false
}

const handleDeleteOrder = (order: any) => {
  dialog.warning({
    title: 'Удаление заказа',
    content: `Вы уверены, что хотите удалить заказ ${order.orderNumber}?`,
    positiveText: 'Удалить',
    negativeText: 'Отмена',
    onPositiveClick: () => {
      ordersStore.deleteOrder(order.id)
      message.success('Заказ удален')
    }
  })
}

const columns = [
  { title: 'Номер', key: 'orderNumber' },
  { title: 'Клиент', key: 'customerName' },
  { 
    title: 'Статус', 
    key: 'status',
    render(row: any) {
      return h(NTag, { type: 'info' }, { default: () => row.status })
    }
  },
  {
    title: 'Действия',
    key: 'actions',
    render(row: any) {
      return h(NSpace, null, {
        default: () => [
          h(NButton, {
            size: 'small',
            onClick: () => {
              selectedOrderForQR.value = row
              showQRModal.value = true
            }
          }, { icon: () => h(NIcon, null, { default: () => h(QrCodeOutline) }), default: () => 'QR' }),
          h(NButton, { 
            size: 'small', 
            quaternary: true,
            onClick: () => {
              selectedOrderForDetails.value = row
              showDetailsModal.value = true
            }
          }, { icon: () => h(NIcon, null, { default: () => h(EyeOutline) }) }),
          h(NButton, { 
            size: 'small', 
            quaternary: true,
            onClick: () => {
              selectedOrderForEdit.value = row
              showCreateModal.value = true
            }
          }, { icon: () => h(NIcon, null, { default: () => h(CreateOutline) }) }),
          h(NButton, { 
            size: 'small', 
            quaternary: true,
            type: 'error',
            onClick: () => handleDeleteOrder(row)
          }, { icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) })
        ]
      })
    }
  }
]
</script>
