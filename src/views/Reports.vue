<template>
  <div class="reports-page p-6">
    <div class="flex justify-between items-center mb-6">
      <div>
        <n-h1 class="m-0">Отчеты и аналитика</n-h1>
        <n-text depth="3">Визуализация данных склада и производства</n-text>
      </div>
      <n-space>
        <n-date-picker v-model:value="dateRange" type="daterange" clearable placeholder="Выберите период" />
        <n-button type="primary" @click="exportReport">
          <template #icon>
            <n-icon><DownloadOutline /></n-icon>
          </template>
          Экспорт PDF
        </n-button>
      </n-space>
    </div>

    <n-grid :cols="4" :x-gap="16" :y-gap="16" class="mb-6">
      <n-gi>
        <n-card title="Оборачиваемость" size="small">
          <div class="text-center py-4">
            <n-statistic label="За 30 дней" :value="1.2">
              <template #suffix>раз/мес</template>
            </n-statistic>
          </div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card title="Точность склада" size="small">
          <div class="text-center py-4">
            <n-statistic label="По инвентаризации" :value="98.5">
              <template #suffix>%</template>
            </n-statistic>
          </div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card title="Загрузка пр-ва" size="small">
          <div class="text-center py-4">
            <n-statistic label="Текущая" :value="84">
              <template #suffix>%</template>
            </n-statistic>
          </div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card title="Брак / Списания" size="small">
          <div class="text-center py-4">
            <n-statistic label="За текущий месяц" :value="12450">
              <template #suffix>₽</template>
            </n-statistic>
          </div>
        </n-card>
      </n-gi>
    </n-grid>

    <n-grid :cols="2" :x-gap="16" :y-gap="16">
      <n-gi>
        <n-card title="Динамика стоимости запасов">
          <div class="h-80 flex items-center justify-center bg-gray-50 rounded border border-dashed border-gray-300">
            <n-result status="404" title="График в разработке" description="Здесь будет график изменения стоимости материалов во времени">
              <template #icon>
                <n-icon size="48" color="#18a058"><TrendingUpOutline /></n-icon>
              </template>
            </n-result>
          </div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card title="Топ расходуемых материалов">
          <n-data-table
            :columns="topMaterialsColumns"
            :data="topMaterialsData"
            size="small"
          />
        </n-card>
      </n-gi>
    </n-grid>

    <n-card class="mt-6" title="Анализ причин списаний">
      <n-grid :cols="3" :x-gap="16">
        <n-gi v-for="reason in scanReasons" :key="reason.name">
          <div class="mb-4">
            <div class="flex justify-between mb-1">
              <n-text>{{ reason.name }}</n-text>
              <n-text strong>{{ reason.value }}%</n-text>
            </div>
            <n-progress
              type="line"
              :percentage="reason.value"
              :color="reason.color"
              :show-indicator="false"
              processing
            />
          </div>
        </n-gi>
      </n-grid>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  NH1,
  NText,
  NSpace,
  NDatePicker,
  NButton,
  NIcon,
  NGrid,
  NGi,
  NCard,
  NStatistic,
  NResult,
  NDataTable,
  NProgress,
  useMessage
} from 'naive-ui'
import {
  DownloadOutline,
  TrendingUpOutline
} from '@vicons/ionicons5'

const dateRange = ref<[number, number] | null>(null)
const message = useMessage()

const exportReport = () => {
  message.success('Отчет формируется и будет скачан автоматически')
}

const topMaterialsColumns = [
  { title: 'Материал', key: 'name' },
  { title: 'Расход', key: 'usage' },
  { title: 'Остаток', key: 'stock' }
]

const topMaterialsData = [
  { name: 'ДСП Белый матовый 16мм', usage: '450 м²', stock: '120 м²' },
  { name: 'Кромка ПВХ 2мм', usage: '1200 м', stock: '3500 м' },
  { name: 'Направляющие Blum Tandem', usage: '86 компл.', stock: '12 компл.' },
  { name: 'Саморез 3.5x16', usage: '15000 шт', stock: '45000 шт' },
  { name: 'Столешница Дуб Вотан', usage: '14 шт', stock: '2 шт' }
]

const scanReasons = [
  { name: 'Производство', value: 75, color: '#18a058' },
  { name: 'Брак при распиле', value: 12, color: '#d03050' },
  { name: 'Образцы для шоурума', value: 8, color: '#2080f0' },
  { name: 'Повреждение при хранении', value: 5, color: '#f0a020' }
]
</script>

<style scoped>
.reports-page {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
