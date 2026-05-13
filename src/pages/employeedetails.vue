<template>
  <div class="employee-details-view h-full">
    <div v-if="employee" class="h-full flex flex-col">
      <div class="header-actions p-4 bg-[#101014] border-b border-gray-800 flex items-center gap-4">
        <n-button quaternary circle @click="handleBack">
          <template #icon>
            <n-icon size="24"><ArrowBackOutline /></n-icon>
          </template>
        </n-button>
        <div>
          <n-text strong class="text-xl">
             {{ detailsRef?.selectedInvoice ? 'Производственная накладная' : 'Личная карточка сотрудника' }}
          </n-text>
          <div v-if="detailsRef?.selectedInvoice" class="text-xs text-gray-500 uppercase tracking-widest font-bold">
            Документ № {{ detailsRef.selectedInvoice.orderNumber }}
          </div>
        </div>
      </div>
      <div class="grow overflow-hidden">
        <EmployeeDetails ref="detailsRef" :employee="employee" />
      </div>
    </div>
    <div v-else class="flex flex-col items-center justify-center h-full">
      <n-empty size="large" description="Сотрудник не найден" />
      <n-button quaternary circle class="mt-4" @click="router.push('/employees')">
        <template #icon><n-icon size="32"><ArrowBackOutline /></n-icon></template>
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEmployeesStore } from '@/stores/employees'
import { NButton, NIcon, NText, NEmpty } from 'naive-ui'
import { ArrowBackOutline } from '@vicons/ionicons5'
import EmployeeDetails from '@/components/employees/EmployeeDetails.vue'

const route = useRoute()
const router = useRouter()
const employeesStore = useEmployeesStore()
const detailsRef = ref<InstanceType<typeof EmployeeDetails> | null>(null)

const employeeId = computed(() => route.params.id as string)
const employee = computed(() => employeesStore.employees.find(e => e.id === employeeId.value))

const handleBack = () => {
  if (detailsRef.value?.selectedInvoice) {
    detailsRef.value.selectedInvoice = null
  } else {
    router.back()
  }
}
</script>

<style scoped>
.employee-details-view {
  display: flex;
  flex-direction: column;
}
</style>
