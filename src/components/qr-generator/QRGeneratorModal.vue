<template>
  <n-modal :show="show" @update:show="$emit('close')" preset="card" style="width: 600px" title="Генерация QR-кодов" :auto-focus="false">
    <n-form :model="form" label-placement="left" label-width="120">
      <n-form-item label="Позиция">
        <n-select v-model:value="form.productId" :options="productOptions" placeholder="Выберите позицию" />
      </n-form-item>
      <n-form-item label="Количество">
        <n-input-number v-model:value="form.count" :min="1" :max="1000" />
      </n-form-item>
      <n-divider>Предпросмотр надписи</n-divider>
      <div class="qr-preview-box">
        <div class="preview-line">{{ form.labelLine1 || 'Заказ: ' + orderNumber }}</div>
        <div class="preview-line">{{ form.labelLine2 || 'Деталь: ' + (selectedProductName || '...') }}</div>
      </div>
    </n-form>
    <template #footer>
      <n-space justify="end">
        <n-button @click="$emit('close')">Отмена</n-button>
        <n-button type="primary" @click="handleGenerate" :disabled="!form.productId">Сгенерировать</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQRCodesStore } from '@/stores/qrCodes'
import { useUserStore } from '@/stores/user'

const props = defineProps<{
  show: boolean
  orderId: string
  orderNumber: string
  items: any[]
}>()

const emit = defineEmits(['close', 'generated'])
const qrStore = useQRCodesStore()
const userStore = useUserStore()

const form = ref({
  productId: null,
  count: 1,
  labelLine1: '',
  labelLine2: ''
})

const productOptions = computed(() => 
  props.items.map(item => ({ 
    label: item.productName || item.itemName || 'Без названия', 
    value: item.productId || item.id || Math.random().toString(36).substr(2, 9) 
  }))
)

const selectedProductName = computed(() => {
  const item = props.items.find(i => (i.productId || i.id) === form.value.productId)
  return item?.productName || item?.itemName
})

function handleGenerate() {
  const item = props.items.find(i => (i.productId || i.id) === form.value.productId)
  if (!item) return
  
  qrStore.generateQRCodes({
    orderId: props.orderId,
    orderNumber: props.orderNumber,
    productId: form.value.productId,
    productName: item?.productName || item?.itemName || 'Без названия',
    count: form.value.count,
    generatedBy: userStore.user?.name || 'Система'
  })
  
  emit('generated')
  emit('close')
}
</script>

<style scoped>
.qr-preview-box {
  border: 1px dashed rgba(255, 255, 255, 0.2);
  padding: 16px;
  text-align: center;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}
.preview-line {
  font-weight: bold;
  margin-bottom: 4px;
  color: #fff;
}
</style>
