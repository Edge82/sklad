<template>
  <div class="shipment-page p-6">
    <!-- Заголовок и пояснение -->
    <div class="flex justify-between items-center mb-6">
      <div class="flex items-center gap-4">
        <n-button v-if="selectedInvoice" quaternary circle @click="selectedInvoice = null">
          <template #icon>
            <n-icon size="24"><ArrowBackOutline /></n-icon>
          </template>
        </n-button>
        <div>
          <n-h1 class="m-0">{{ selectedInvoice ? 'Детали накладной' : 'Движение материалов' }}</n-h1>
          <n-text depth="3">
            {{ selectedInvoice ? `Накладная #${selectedInvoice.id.slice(-6).toUpperCase()}` : 'История всех сканирований и движений ТМЦ' }}
          </n-text>
        </div>
      </div>
    </div>

    <!-- Резюме (Статистика в стиле Inventory.vue) -->
    <n-grid v-if="!selectedInvoice" :cols="4" :x-gap="16" :y-gap="16" class="mb-6">
      <n-gi>
        <n-card 
          class="cursor-pointer transition-colors" 
          :class="{ 'border-blue-500 bg-blue-50/10': filterDestination === 'all' }"
          @click="filterDestination = 'all'"
        >
          <div class="flex justify-between items-center">
            <div>
              <n-text depth="3">Всего операций</n-text>
              <n-h3 class="m-0">{{ allInvoices.length }}</n-h3>
            </div>
            <n-icon size="32" :color="filterDestination === 'all' ? '#2080f0' : '#888'">
              <DocumentTextOutline />
            </n-icon>
          </div>
        </n-card>
      </n-gi>

      <n-gi>
        <n-card 
          class="cursor-pointer transition-colors" 
          :class="{ 'border-green-500 bg-green-50/10': filterDestination === 'Клиент' }"
          @click="filterDestination = 'Клиент'"
        >
          <div class="flex justify-between items-center">
            <div>
              <n-text depth="3">Отгружено клиентам</n-text>
              <n-h3 class="m-0">{{ statsByType.client }}</n-h3>
            </div>
            <n-icon size="32" :color="filterDestination === 'Клиент' ? '#18a058' : '#888'">
              <CarOutline />
            </n-icon>
          </div>
        </n-card>
      </n-gi>

      <n-gi>
        <n-card 
          class="cursor-pointer transition-colors" 
          :class="{ 'border-blue-500 bg-blue-50/10': filterDestination === 'Производство' }"
          @click="filterDestination = 'Производство'"
        >
          <div class="flex justify-between items-center">
            <div>
              <n-text depth="3">Выдано в пр-во</n-text>
              <n-h3 class="m-0">{{ statsByType.production }}</n-h3>
            </div>
            <n-icon size="32" :color="filterDestination === 'Производство' ? '#2080f0' : '#888'">
              <BusinessOutline />
            </n-icon>
          </div>
        </n-card>
      </n-gi>

      <n-gi>
        <n-card class="revenue-card">
          <div class="flex justify-between items-center">
            <div>
              <n-text depth="3" class="revenue-label">Сумма накладных</n-text>
              <n-h3 class="m-0 revenue-value">{{ totalRevenue.toLocaleString() }} ₽</n-h3>
            </div>
            <n-icon size="32" color="#18a058">
              <AnalyticsOutline />
            </n-icon>
          </div>
        </n-card>
      </n-gi>
    </n-grid>

    <n-card v-if="!selectedInvoice" class="mb-6 shadow-sm">
      <n-space justify="space-between" align="center">
        <n-space>
          <n-input-group>
            <n-input-group-label>Назначение</n-input-group-label>
            <n-select 
              v-model:value="filterDestination" 
              :options="destinationOptions" 
              style="width: 220px"
              placeholder="Все направления"
            />
          </n-input-group>
        </n-space>

        <n-input 
          v-model:value="searchQuery" 
          placeholder="Заказ, товар, сотрудник..." 
          style="width: 400px"
          clearable
        >
          <template #prefix>
            <n-icon><SearchOutline /></n-icon>
          </template>
        </n-input>
      </n-space>
    </n-card>

    <n-card bordered class="table-card shadow-sm">
      <div v-if="!selectedInvoice">
        <n-data-table
          :columns="columns"
          :data="filteredInvoices"
          :pagination="pagination"
          :row-props="rowProps"
          class="cursor-pointer"
        />
      </div>

      <div v-else class="invoice-details-view">
        <n-descriptions bordered label-placement="left" :column="2" class="mb-8">
          <n-descriptions-item label="Номер заказа">
            <n-tag type="primary" strong>{{ selectedInvoice.orderNumber || 'Без привязки' }}</n-tag>
          </n-descriptions-item>
          <n-descriptions-item label="Дата и время">
            {{ new Date(selectedInvoice.date).toLocaleString() }}
          </n-descriptions-item>
          <n-descriptions-item label="Сотрудник">
            {{ selectedInvoice.workerName }}
          </n-descriptions-item>
          <n-descriptions-item label="ID Операции">
             <n-text depth="3">{{ selectedInvoice.id }}</n-text>
          </n-descriptions-item>
        </n-descriptions>

        <n-h3>Список позиций</n-h3>
        <n-table :single-line="false" size="medium">
          <thead>
            <tr>
              <th>Артикул</th>
              <th>Наименование</th>
              <th style="text-align: right">Цена</th>
              <th style="text-align: right">Количество</th>
              <th style="text-align: right">Сумма</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in selectedInvoice.items" :key="idx">
              <td><n-text depth="3">{{ item.article ?? '—' }}</n-text></td>
              <td><n-text strong>{{ item.productName }}</n-text></td>
              <td style="text-align: right">{{ (item.price || 0).toLocaleString() }} ₽</td>
              <td style="text-align: right">
                <n-text depth="2" strong>{{ item.quantity }} {{ item.unit }}</n-text>
              </td>
              <td style="text-align: right">
                <n-text type="success" strong>{{ ((item.price || 0) * item.quantity).toLocaleString() }} ₽</n-text>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <th colspan="4" style="text-align: right">Итого к списанию:</th>
              <th style="text-align: right">
                <n-text type="success" strong style="font-size: 1.1em">
                  {{ (selectedInvoice.totalAmount || selectedInvoice.items.reduce((sum: number, i: any) => sum + (i.price || 0) * i.quantity, 0)).toLocaleString() }} ₽
                </n-text>
              </th>
            </tr>
          </tfoot>
        </n-table>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, h } from 'vue'
import { 
  NText, NCard, NDataTable, NButton, NIcon, NSpace, NInput, NInputGroup,
  NDescriptions, NDescriptionsItem, NTag,
  NTable, NH3, NSelect, NGrid, NGi, NH1, NInputGroupLabel
} from 'naive-ui'
import { 
  SearchOutline, 
  DocumentTextOutline, 
  ArrowBackOutline,
  CarOutline,
  BusinessOutline,
  AnalyticsOutline
} from '@vicons/ionicons5'
import { useEmployeesStore } from '@/stores/employees'

const employeesStore = useEmployeesStore()
const searchQuery = ref('')
const filterDestination = ref('all')
const selectedInvoice = ref<any>(null)

// Обработка клика по строке
const rowProps = (row: any) => {
  return {
    style: 'cursor: pointer',
    onClick: () => {
      selectedInvoice.value = row
    }
  }
}

const destinationOptions = [
  { label: 'Все направления', value: 'all' },
  { label: 'Производство', value: 'Производство' },
  { label: 'Клиент', value: 'Клиент' }
]

const pagination = {
  pageSize: 15
}

// Статистика по типам
const statsByType = computed(() => {
  return {
    production: allInvoices.value.filter(inv => inv.destination === 'Производство').length,
    client: allInvoices.value.filter(inv => inv.destination === 'Клиент').length
  }
})

// Собираем все накладные из всех сотрудников
const allInvoices = computed(() => {
  const invoices: any[] = []
  if (!employeesStore.employees) return invoices

  employeesStore.employees.forEach((emp: any) => {
    if (emp && emp.materialHistory) {
      emp.materialHistory.forEach((history: any) => {
        // Рассчитываем сумму накладной сразу при сборке
        const calculatedTotal = Number(history.totalAmount) || 
          (history.items ? history.items.reduce((acc: number, item: any) => 
            acc + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0) : 0)
        
        invoices.push({
          ...history,
          totalAmount: calculatedTotal,
          workerName: emp.name || 'Неизвестно',
          workerId: emp.id
        })
      })
    }
  })
  // Сортируем по дате (сначала новые)
  return invoices.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0
    const dateB = b.date ? new Date(b.date).getTime() : 0
    return dateB - dateA
  })
})

// Расчет общей суммы отфильтрованных накладных (Итого по таблице)
const totalRevenue = computed(() => {
  return filteredInvoices.value
    .reduce((sum, inv) => {
      return sum + (Number(inv.totalAmount) || 0)
    }, 0)
})

const filteredInvoices = computed(() => {
  let list = allInvoices.value

  if (filterDestination.value !== 'all') {
    list = list.filter(inv => inv.destination === filterDestination.value)
  }

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(inv => 
      inv.orderNumber.toLowerCase().includes(q) ||
      inv.workerName.toLowerCase().includes(q) ||
      inv.items.some((i: any) => i.productName.toLowerCase().includes(q) || (i.article && i.article.toLowerCase().includes(q)))
    )
  }
  return list
})

const columns = [
  {
    title: 'Дата и время',
    key: 'date',
    render: (row: any) => new Date(row.date).toLocaleString(),
    sorter: (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
  },
  {
    title: 'Назначение',
    key: 'destination',
    render: (row: any) => {
      const isClient = row.destination === 'Клиент'
      return h(NTag, { 
        type: isClient ? 'success' : 'info', 
        bordered: false,
        round: true
      }, { 
        default: () => row.destination || 'Производство',
        icon: () => h(NIcon, null, { default: () => isClient ? h(CarOutline) : h(BusinessOutline) })
      })
    }
  },
  {
    title: 'Заказ',
    key: 'orderNumber',
    render: (row: any) => h(NText, { depth: 2, strong: true }, { default: () => row.orderNumber || '—' })
  },
  {
    title: 'Ответственный',
    key: 'workerName'
  },
  {
    title: 'Сумма',
    key: 'totalAmount',
    render: (row: any) => {
      const amount = row.totalAmount || row.items.reduce((sum: number, i: any) => sum + (i.price || 0) * i.quantity, 0)
      return h(NText, { type: 'success', strong: true }, { default: () => amount.toLocaleString() + ' ₽' })
    }
  },
  {
    title: 'Позиций',
    key: 'itemsCount',
    render: (row: any) => row.items.length
  }
]
</script>

<style scoped>
.shipment-page {
  padding: 0;
}
.cursor-pointer {
  cursor: pointer;
}

.revenue-card {
  background: linear-gradient(135deg, rgba(24, 160, 88, 0.05) 0%, rgba(24, 160, 88, 0.1) 100%);
  border-left: 4px solid #18a058;
}

.revenue-label {
  color: #18a058;
  font-weight: 500;
}

.revenue-value {
  color: #18a058;
}
</style>
