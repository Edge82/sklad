<template>
  <div class="my-hardware-page">
    <div class="header-actions p-4 bg-[#101014] border-b border-gray-800 flex items-center gap-4">
      <n-button quaternary circle @click="$router.back()">
        <template #icon><n-icon size="24"><ArrowBackOutline /></n-icon></template>
      </n-button>
      <div>
        <n-text strong class="text-xl">Фурнитура в работе</n-text>
        <div class="text-xs text-gray-500 mt-1">Выдано: {{ issuedHardware.length }} позиций</div>
      </div>
    </div>
    <div class="p-6">
      <n-empty v-if="issuedHardware.length === 0" size="large" description="Вам не выдана фурнитура" />
      <n-grid v-else :cols="1" :x-gap="16" :y-gap="16">
        <n-gi v-for="item in issuedHardware" :key="item.id">
          <n-card class="w-full">
            <div class="flex items-start justify-between mb-4">
              <div>
                <n-h3 class="m-0 mb-1">{{ item.name }}</n-h3>
                <n-tag type="warning" size="small">{{ item.sku || 'Фурнитура' }}</n-tag>
              </div>
              <n-button type="warning" size="small" @click="openReturnModal(item)">Сдать</n-button>
            </div>
            <n-descriptions :columns="2" size="small" bordered label-placement="left" class="w-full">
              <n-descriptions-item label="Количество">{{ item.checkedOut }} {{ item.unit || 'шт' }}</n-descriptions-item>
              <n-descriptions-item label="Артикул">{{ item.inventoryNumber || '—' }}</n-descriptions-item>
              <n-descriptions-item label="Дата получения">
                <n-text type="info">{{ formatDateTime(item.issuedAt) }}</n-text>
              </n-descriptions-item>
              <n-descriptions-item label="QR-код / Штрихкод">{{ item.qrCode || '—' }}</n-descriptions-item>
            </n-descriptions>
          </n-card>
        </n-gi>
      </n-grid>
    </div>
  </div>

  <n-modal v-model:show="showReturnModal" preset="card" title="Возврат на склад" class="w-md!">
    <n-form v-if="selectedItem" label-placement="top">
      <n-form-item label="Фурнитура">
        <n-text strong>{{ selectedItem.name }}</n-text>
      </n-form-item>
      <n-form-item label="Выдано">
        <n-text type="warning">{{ selectedItem.checkedOut }} {{ selectedItem.unit || 'шт' }}</n-text>
      </n-form-item>
      <n-form-item label="Количество возврата" path="quantity" required>
        <n-input-number v-model:value="returnForm.quantity" :min="1" :max="selectedItem.checkedOut" placeholder="Введите количество" />
      </n-form-item>
    </n-form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <n-button @click="showReturnModal = false">Отмена</n-button>
        <n-button type="warning" @click="confirmReturn" :loading="returning">Сдать</n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onActivated, reactive } from 'vue'
import { useUserStore } from '@/stores/user'
import { useEmployeesStore } from '@/stores/employees'
import { useHardwareStore } from '@/stores/hardware'
import { NButton, NIcon, NText, NEmpty, NGrid, NGi, NCard, NH3, NTag, NDescriptions, NDescriptionsItem, NModal, NForm, NFormItem, NInputNumber, useMessage } from 'naive-ui'
import { ArrowBackOutline } from '@vicons/ionicons5'

const userStore = useUserStore()
const employeesStore = useEmployeesStore()
const hardwareStore = useHardwareStore()
const message = useMessage()

const formatDateTime = (date?: string | null) => {
  if (!date) return '—'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d)
}

const issuedHardware = computed(() => {
  if (!userStore.user?.id) return []
  const currentUserId = parseFloat(String(userStore.user.id))
  const employee = employeesStore.employees.find(e => {
    if (!e.userId) return false
    const empUserId = parseFloat(String(e.userId))
    return !isNaN(empUserId) && empUserId === currentUserId
  })
  if (!employee) return []
  return hardwareStore.getHardwareIssuedToEmployee(employee.id)
})

const showReturnModal = ref(false)
const selectedItem = ref<any>(null)
const returning = ref(false)
const returnForm = reactive({ quantity: 1 })

const openReturnModal = (item: any) => {
  selectedItem.value = item
  returnForm.quantity = item.checkedOut
  showReturnModal.value = true
}

const confirmReturn = async () => {
  if (!selectedItem.value || !returnForm.quantity || returnForm.quantity < 1) {
    message.warning('Укажите количество')
    return
  }
  if (returnForm.quantity > selectedItem.value.checkedOut) {
    message.warning('Нельзя вернуть больше, чем выдано')
    return
  }
  returning.value = true
  try {
    await hardwareStore.returnHardware(selectedItem.value.id, returnForm.quantity)
    message.success('Фурнитура успешно сдана на склад')
    showReturnModal.value = false
    if (window.location.pathname === '/profile') {
      window.dispatchEvent(new CustomEvent('refreshHardwareOperations'))
    }
  } catch (err) { message.error('Ошибка при сдаче фурнитуры'); console.error(err) }
  finally { returning.value = false }
}

onMounted(async () => { await Promise.all([hardwareStore.loadHardwareFromApi(), employeesStore.loadEmployeesFromApi()]) })
onActivated(async () => { await Promise.all([hardwareStore.loadHardwareFromApi(), employeesStore.loadEmployeesFromApi()]) })
</script>

<style scoped>
.my-hardware-page { max-width: 1600px; margin: 0 auto; }
</style>
