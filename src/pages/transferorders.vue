<template>
  <div class="transfer-orders-page p-6">
    <div class="flex justify-between items-center mb-6">
      <div class="flex items-center gap-4">
        <n-button v-if="selectedOrderId" circle @click="selectedOrderId = null" type="primary" secondary>
          <template #icon><n-icon><ArrowBackOutline /></n-icon></template>
        </n-button>
        <div>
          <n-h1 class="mb-0!">
            <span v-if="!selectedOrderId">Заказы на перемещение</span>
            <span v-else>{{ selectedOrder?.Number }}</span>
          </n-h1>
          <n-text depth="3">
            <span v-if="!selectedOrderId">Список заказов на перемещение товаров между складами</span>
            <span v-else>Детали заказа и товары для сканирования</span>
          </n-text>
        </div>
      </div>
      <n-space>
        <n-button v-if="selectedOrderId" type="default" @click="printTransferOrder">
          <template #icon><n-icon><PrintOutline /></n-icon></template>
          Распечатать заказ
        </n-button>
        <n-button v-if="!selectedOrderId" type="primary" @click="handleSync" :loading="syncing">
          <template #icon><n-icon><ReloadOutline /></n-icon></template>
          Синхронизировать с 1С
        </n-button>
        <n-button v-if="!selectedOrderId" type="success" @click="openCreateModal">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          Новый заказ на перемещение
        </n-button>
      </n-space>
    </div>

    <!-- Список заказов -->
    <div v-if="!selectedOrderId">
      <!-- Статистика -->
      <n-grid :cols="6" :x-gap="12" :y-gap="12" class="mb-6 items-stretch py-2">
        <n-gi>
          <n-card
            size="small"
            hoverable
            class="metric-card h-full flex flex-col justify-center"
            :class="{ 'active': !filterStatus }"
            @click="filterStatus = ''"
          >
            <div class="flex items-center gap-3 py-1">
              <n-icon size="28" color="#2080f0">
                <CubeOutline />
              </n-icon>
              <div>
                <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Всего заказов</n-text>
                <n-h3 class="m-0 leading-none">{{ orders.length }}</n-h3>
              </div>
            </div>
          </n-card>
        </n-gi>

        <n-gi>
          <n-card
            size="small"
            hoverable
            class="metric-card h-full flex flex-col justify-center"
            :class="{ 'active': filterStatus === 'locals' }"
            @click="filterStatus = 'locals'"
          >
            <div class="flex items-center gap-3 py-1">
              <n-icon size="28" color="#805ad5">
                <DocumentsOutline />
              </n-icon>
              <div>
                <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Черновики</n-text>
                <n-h3 class="m-0 leading-none">{{ localsCount }}</n-h3>
              </div>
            </div>
          </n-card>
        </n-gi>

        <n-gi>
          <n-card
            size="small"
            hoverable
            class="metric-card h-full flex flex-col justify-center"
            :class="{ 'active': filterStatus === 'active_cells' }"
            @click="filterStatus = 'active_cells'"
          >
            <div class="flex items-center gap-3 py-1">
              <n-icon size="28" color="#f0a020">
                <TimeOutline />
              </n-icon>
              <div>
                <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">В работе (ячейки)</n-text>
                <n-h3 class="m-0 leading-none">{{ activeCellsCount }}</n-h3>
              </div>
            </div>
          </n-card>
        </n-gi>

        <n-gi>
          <n-card
            size="small"
            hoverable
            class="metric-card h-full flex flex-col justify-center"
            :class="{ 'active': filterStatus === 'active_writeoff' }"
            @click="filterStatus = 'active_writeoff'"
          >
            <div class="flex items-center gap-3 py-1">
              <n-icon size="28" color="#f0a020">
                <TimeOutline />
              </n-icon>
              <div>
                <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">В работе (к списанию)</n-text>
                <n-h3 class="m-0 leading-none">{{ activeWriteoffCount }}</n-h3>
              </div>
            </div>
          </n-card>
        </n-gi>

        <n-gi>
          <n-card
            size="small"
            hoverable
            class="metric-card h-full flex flex-col justify-center"
            :class="{ 'active': filterStatus === 'completed_cells' }"
            @click="filterStatus = 'completed_cells'"
          >
            <div class="flex items-center gap-3 py-1">
              <n-icon size="28" color="#18a058">
                <CheckmarkCircleOutline />
              </n-icon>
              <div>
                <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Завершён (ячейки)</n-text>
                <n-h3 class="m-0 leading-none">{{ completedCellsCount }}</n-h3>
              </div>
            </div>
          </n-card>
        </n-gi>

        <n-gi>
          <n-card
            size="small"
            hoverable
            class="metric-card h-full flex flex-col justify-center"
            :class="{ 'active': filterStatus === 'completed_writeoff' }"
            @click="filterStatus = 'completed_writeoff'"
          >
            <div class="flex items-center gap-3 py-1">
              <n-icon size="28" color="#18a058">
                <CheckmarkCircleOutline />
              </n-icon>
              <div>
                <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">Завершён (списание)</n-text>
                <n-h3 class="m-0 leading-none">{{ completedWriteoffCount }}</n-h3>
              </div>
            </div>
          </n-card>
        </n-gi>
      </n-grid>

      <div style="margin-top: 24px;">
        <div class="flex justify-between items-center mb-4">
          <n-text depth="3">Всего: {{ filteredOrders.length }}</n-text>
          <div class="flex items-center gap-2">
            <n-text>Показывать:</n-text>
            <n-select v-model:value="itemsPerPage" :options="pageSizeOptions" class="w-24!" />
          </div>
        </div>
        <n-spin :show="loading">
          <n-empty v-if="orders.length === 0" description="Нет заказов на перемещение" />

          <n-data-table
          v-else
          :columns="columns"
          :data="filteredOrders"
          :pagination="pagination"
          :bordered="false"
          :single-line="false"
          size="small"
          striped
          @click="(e: any) => {
            const row = (e.target as HTMLElement).closest('tr')
            if (row && row.dataset.key) {
              openOrder(row.dataset.key)
            }
          }"
          :row-props="(row) => ({
            'data-key': row.Ref_Key,
            style: 'cursor: pointer; transition: background-color 0.2s;',
            onMouseEnter: (e: MouseEvent) => {
              (e.target as HTMLElement).closest('tr')?.style.setProperty('background-color', 'rgba(63, 131, 226, 0.08)')
            },
            onMouseLeave: (e: MouseEvent) => {
              (e.target as HTMLElement).closest('tr')?.style.removeProperty('background-color')
            }
          })"
        />
      </n-spin>
      </div>
    </div>

    <!-- Детали заказа -->
    <div v-else>
      <n-spin :show="loadingDetails">
        <div v-if="selectedOrder" class="space-y-6">
          <!-- Информация о заказе -->
          <n-card size="small" title="Информация о заказе">
            <n-grid :cols="2" :x-gap="12" :y-gap="12">
              <n-gi>
                <div class="flex justify-between">
                  <n-text depth="3">Состояние:</n-text>
                  <n-tag :type="selectedOrder.statusDescription === 'Завершен' ? 'error' : 'warning'">
                    {{ selectedOrder.statusDescription || 'Неизвестно' }}
                  </n-tag>
                </div>
              </n-gi>
              <n-gi>
                <div class="flex justify-between">
                  <n-text depth="3">Статус:</n-text>
                  <n-tag :type="selectedOrder.Posted ? 'success' : 'warning'">
                    {{ selectedOrder.Posted ? 'Проведен' : 'Черновик' }}
                  </n-tag>
                </div>
              </n-gi>
              <n-gi>
                <div class="flex justify-between">
                  <n-text depth="3">Дата:</n-text>
                  <n-text strong>{{ formatDate(selectedOrder.Date) }}</n-text>
                </div>
              </n-gi>
              <n-gi>
                <div class="flex justify-between">
                  <n-text depth="3">От склада:</n-text>
                  <n-text strong>{{ selectedOrder.sourceWarehouseName }}</n-text>
                </div>
              </n-gi>
              <n-gi>
                <div class="flex justify-between">
                  <n-text depth="3">На склад:</n-text>
                  <n-text strong>{{ selectedOrder.destinationWarehouseName }}</n-text>
                </div>
              </n-gi>
              <n-gi v-if="selectedOrder.customerOrderNumber">
                <div class="flex justify-between">
                  <n-text depth="3">Заказ покупателя:</n-text>
                  <n-text strong>{{ selectedOrder.customerOrderNumber }}</n-text>
                </div>
              </n-gi>
            </n-grid>
          </n-card>

          <!-- Товары для сканирования -->
          <n-card v-if="!scanningMode" size="small" :title="isLocalOrder ? 'Товары в заказе' : 'Товары для сканирования'">
            <template v-if="isLocalOrder">
              <div class="flex gap-2 mb-4" style="position: relative;">
                <n-input
                  ref="orderDetailBarcodeInputRef"
                  v-model:value="orderDetailBarcodeBuffer"
                  placeholder="Отсканируйте штрихкод (повторное сканирование увеличит количество)"
                  @keydown.enter.prevent="handleOrderDetailScan"
                  :disabled="syncing"
                >
                  <template #prefix>
                    <n-icon><CameraOutline /></n-icon>
</template>
                </n-input>
                <div
                  v-if="orderDetailSearchOptions.length > 0"
                  style="position: absolute; top: 100%; left: 0; right: 0; z-index: 100; max-height: 240px; overflow-y: auto"
                >
                  <n-card size="small" content-style="padding: 4px 0">
                    <div
                      v-for="opt in orderDetailSearchOptions"
                      :key="opt.value || opt.label"
                      style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid var(--n-border-color)"
                      :style="{ color: opt.value ? 'inherit' : 'var(--n-text-color-disabled)' }"
                      @click="handleOrderDetailSelect(opt)"
                      @mouseenter="(e: MouseEvent) => (e.target as HTMLElement).style.background = 'var(--n-action-color)'"
                      @mouseleave="(e: MouseEvent) => (e.target as HTMLElement).style.background = ''"
                    >
                      {{ opt.label }}
                    </div>
                  </n-card>
                </div>
              </div>
            </template>

            <n-empty v-if="!selectedOrder.items || selectedOrder.items.length === 0" description="Нет товаров в заказе" />

            <div v-else class="space-y-3">
              <n-data-table
                :columns="isLocalOrder ? localItemsColumns : itemsColumns"
                :data="selectedOrder.items"
                :bordered="false"
                :single-line="false"
                size="small"
                striped
                :row-props="orderItemRowProps"
              />
            </div>
          </n-card>

          <!-- Режим сканирования -->
          <n-card v-if="scanningMode && !scanningComplete" size="small" title="🔴 Режим сканирования активирован">
            <div class="space-y-4">
              <!-- Прогресс сканирования -->
              <div>
                <div class="flex justify-between mb-2">
                  <n-text strong>Прогресс по товарам</n-text>
                  <n-text>{{ selectedOrder.items?.filter(i => (i.scannedQty || 0) === i.Количество).length }} / {{ selectedOrder.items?.length || 0 }}</n-text>
                </div>
                <div class="bg-gray-200 rounded-full h-2">
                  <div
                    class="bg-green-500 h-2 rounded-full transition-all"
                    :style="{ width: `${selectedOrder.items?.length ? (selectedOrder.items.filter(i => (i.scannedQty || 0) === i.Количество).length / selectedOrder.items.length * 100) : 0}%` }"
                  />
                </div>
              </div>

              <!-- Поле ввода штрихкода (скрытое, но в фокусе) -->
              <div>
                <n-input
                  ref="barcodeInputRef"
                  v-model:value="barcodeBuffer"
                  placeholder="Сканируйте штрихкоды..."
                  size="large"
                  @keyup.enter="handleScan"
                  class="barcode-input"
                />
                <n-text depth="3" class="mt-2 block">
                  Последний отсканированный: <code>{{ lastBarcode || '—' }}</code>
                </n-text>
              </div>

              <!-- Список товаров для сканирования -->
              <n-data-table
                :columns="itemsScanColumns"
                :data="selectedOrder.items"
                :bordered="false"
                :single-line="false"
                size="small"
                striped
              />

              <!-- Подсказка -->
              <n-alert type="info" closable>
                <strong>💡 Подсказка:</strong>
                <ul class="mt-2 ml-4 list-disc">
                  <li>Сканируйте товары штрих-кодом</li>
                  <li>🟢 Зелёные - товары полностью отсканированы</li>
                  <li>🟡 Жёлтые - отсканировано не полностью</li>
                  <li>🔴 Красные - больше чем в заказе!</li>
                  <li>Нажмите <kbd style="color: black">ESC</kbd> чтобы завершить сканирование</li>
                </ul>
              </n-alert>
            </div>
          </n-card>

          <!-- Результаты сканирования -->
          <n-card v-else-if="scanningComplete" size="small" title="📋 Результаты сканирования">
            <div class="space-y-4">
              <n-data-table
                :columns="itemsScanColumns"
                :data="selectedOrder.items"
                :bordered="false"
                :single-line="false"
                size="small"
                striped
              />

              <n-alert
                :type="(selectedOrder.items?.reduce((s, i) => s + (i.scannedQty || 0), 0) || 0) === (selectedOrder.items?.reduce((s, i) => s + i.Количество, 0) || 0) ? 'success' : 'warning'"
              >
                <template v-if="(selectedOrder.items?.reduce((s, i) => s + (i.scannedQty || 0), 0) || 0) === (selectedOrder.items?.reduce((s, i) => s + i.Количество, 0) || 0)">
                  <strong>✓ Все товары отсканированы правильно!</strong> Можно отправить в 1C
                </template>
                <template v-else>
                  <strong>⚠ Количество не совпадает:</strong> Отсканировано {{ selectedOrder.items?.reduce((s, i) => s + (i.scannedQty || 0), 0) || 0 }} из {{ selectedOrder.items?.reduce((s, i) => s + i.Количество, 0) || 0 }} товаров
                </template>
              </n-alert>

              <div class="flex gap-2 flex-wrap">
                <n-button
                  type="primary"
                  size="large"
                  @click="saveScanningLocally"
                  v-if="(selectedOrder.items?.reduce((s, i) => s + (i.scannedQty || 0), 0) || 0) < (selectedOrder.items?.reduce((s, i) => s + i.Количество, 0) || 0)"
                  :disabled="selectedOrder.saved"
                >
                  💾 {{ selectedOrder.saved ? '✓ Сохранено локально' : 'Сохранить локально' }}
                </n-button>

                <n-button
                  type="success"
                  size="large"
                  @click="submitToOnec"
                  :loading="syncing"
                  v-if="(selectedOrder.items?.reduce((s, i) => s + (i.scannedQty || 0), 0) || 0) === (selectedOrder.items?.reduce((s, i) => s + i.Количество, 0) || 0)"
                >
                  🚀 Отправить в 1C
                </n-button>

                <n-button
                  @click="continueScanningAfterCompletion"
                  size="large"
                >
                  🔄 Продолжить сканирование
                </n-button>
              </div>
            </div>
          </n-card>

          <!-- Кнопки действий для нормального режима -->
          <div v-if="!scanningComplete" class="flex gap-2">
            <!-- Local order: send to 1C -->
            <template v-if="isLocalOrder && !scanningMode">
              <n-button type="primary" size="large" :loading="syncing" @click="sendTo1C">
                <template #icon><n-icon><CloudUploadOutline /></n-icon></template>
                Отправить в 1С
              </n-button>
              <n-button @click="openAddItemsModal" size="large">
                <template #icon><n-icon><PencilOutline /></n-icon></template>
                Редактировать товары
              </n-button>
            </template>

            <!-- 1C order with 'В работе (ячейки)': scanning -->
            <template v-else-if="!isLocalOrder && !scanningMode && selectedOrder?.statusDescription === 'В работе (ячейки)'">
              <n-button type="primary" size="large" @click="startScanning">
                <template #icon><n-icon><CameraOutline /></n-icon></template>
                Начать сканирование
              </n-button>
            </template>

            <!-- 1C order with other statuses: disabled -->
            <template v-else-if="!isLocalOrder && !scanningMode">
              <n-button disabled type="default" size="large">
                <template #icon><n-icon><CloseCircleOutline /></n-icon></template>
                {{ selectedOrder?.statusDescription === 'Завершен (ячейки)' || selectedOrder?.statusDescription === 'Завершен (списание)' ? 'Заказ завершён' : 'Недоступно' }}
              </n-button>
            </template>

            <!-- Scanning mode buttons -->
            <template v-if="scanningMode">
              <n-button type="error"
              size="large"
              @click="stopScanning"
              style="color: white; font-weight: bold; font-size: 16px;"
            >
              <template #icon><n-icon><CloseCircleOutline /></n-icon></template>
              Завершить сканирование (ESC)
            </n-button>
            </template>
          </div>
        </div>
      </n-spin>
    </div>
  </div>

  <!-- Модал создания нового заказа на перемещение -->
  <n-modal v-model:show="showCreateModal" :mask-closable="false" :close-on-esc="false" preset="card" style="width: 1100px; max-width: 98vw" :title="editingOrderRefKey ? 'Редактировать товары' : 'Новый заказ на перемещение'" :segmented="{ content: true }">
    <div class="space-y-4">
      <n-grid :cols="2" :x-gap="12">
        <n-gi>
          <n-form-item label="Склад отправитель" required>
            <n-select v-model:value="createForm.sourceWarehouseKey" :options="warehouseOptions" filterable placeholder="Выберите склад" />
          </n-form-item>
        </n-gi>
        <n-gi>
          <n-form-item label="Склад получатель" required>
            <n-select v-model:value="createForm.destinationWarehouseKey" :options="warehouseOptionsAll" filterable placeholder="Выберите склад" />
          </n-form-item>
        </n-gi>
      </n-grid>



      <n-grid :cols="2" :x-gap="12">
        <n-gi>
          <n-form-item label="Заказ покупателя (для всех товаров)">
            <n-select v-model:value="createForm.customerOrderKey" :options="customerOrderOptions" filterable placeholder="Выберите заказ" clearable :disabled="hasPerItemCustomerOrder" @update:value="onGlobalCustomerOrderChange" />
          </n-form-item>
        </n-gi>
        <n-gi>
          <n-form-item label="Изделие из заказа">
            <n-select v-model:value="createForm.selectedProduct" :options="selectedOrderProducts" filterable placeholder="Выберите изделие" clearable :disabled="!createForm.customerOrderKey || hasPerItemCustomerOrder" />
          </n-form-item>
        </n-gi>
      </n-grid>

      <n-card size="small" title="Товары" :segmented="true">
        <p class="text-xs mb-2" style="color: var(--n-text-color-3);">
          Для каждого товара можно указать свой заказ покупателя и изделие из него.
          Если выбран заказ покупателя для конкретного товара, общий выбор блокируется.
        </p>
        <div class="flex gap-2 mb-4" style="position: relative; margin-bottom: 12px">
          <n-input
            ref="createBarcodeInputRef"
            v-model:value="createBarcodeBuffer"
            placeholder="Отсканируйте штрихкод или введите название товара"
            @keydown.enter.prevent="handleCreateScan"
            :disabled="createSaving"
          >
            <template #prefix>
              <n-icon><CameraOutline /></n-icon>
            </template>
          </n-input>
          <div
            v-if="searchOptions.length > 0"
            style="position: absolute; top: 100%; left: 0; right: 0; z-index: 100; max-height: 240px; overflow-y: auto"
          >
            <n-card size="small" content-style="padding: 4px 0">
              <div
                v-for="opt in searchOptions"
                :key="opt.value || opt.label"
                style="padding: 8px 12px; cursor: pointer; border-bottom: 1px solid var(--n-border-color)"
                :style="{ color: opt.value ? 'inherit' : 'var(--n-text-color-disabled)' }"
                @click="handleProductSelectResult(opt)"
                @mouseenter="(e: MouseEvent) => (e.target as HTMLElement).style.background = 'var(--n-action-color)'"
                @mouseleave="(e: MouseEvent) => (e.target as HTMLElement).style.background = ''"
              >
                {{ opt.label }}
              </div>
            </n-card>
          </div>
        </div>

        <n-data-table
          :columns="createItemsColumns"
          :data="createForm.items"
          :bordered="false"
          :single-line="true"
          size="small"
          :max-height="300"
          v-if="createForm.items.length > 0"
        />
        <n-empty v-else description="Отсканируйте товары, они появятся в таблице" />
      </n-card>

      <n-alert v-if="createResult" :type="'success'" title="Заказ сохранён локально">
        {{ createResult.message }}
      </n-alert>

      <div class="flex justify-end gap-2 pt-2">
        <n-button @click="closeCreateModal" :disabled="createSaving">Отмена</n-button>
        <n-button type="primary" @click="saveCreateOrder" :loading="createSaving" :disabled="!canSaveCreate">
          Сохранить локально
        </n-button>
        <n-button type="success" @click="saveCreateAndSendTo1C" :loading="createSaving" :disabled="!canSaveCreate">
          <template #icon><n-icon><CloudUploadOutline /></n-icon></template>
          Сохранить и отправить в 1С
        </n-button>
      </div>
    </div>
  </n-modal>
  <InventoryItemModal
    v-model:show="showEditItemModal"
    :item-id="editingItemId"
    mode="material"
    @submit="handleEditItemSubmit"
    @update:show="(val) => !val && (editingItemId = null)"
  />
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onActivated, h, onBeforeUnmount, watch, nextTick } from 'vue'
import { useStockBalances } from '@/composables/useStockBalances'
import { useMessage } from 'naive-ui'
import {
  NDataTable,
  NEmpty,
  NSpin,
  NCard,
  NGrid,
  NGi,
  NButton,
  NPopconfirm,
  NIcon,
  NText,
  NTag,
  NH1,
  NH3,
  NAlert,
  NInput,
  NModal,
  NSelect,
  NFormItem,
  type InputInst
} from 'naive-ui'
import { ArrowBackOutline, CameraOutline, ReloadOutline, CloseCircleOutline, CubeOutline, PencilOutline, CheckmarkCircleOutline, TimeOutline, PrintOutline, AddOutline, CloudUploadOutline, DocumentsOutline } from '@vicons/ionicons5'
import type { DataTableColumns } from 'naive-ui'
import { useOrdersStore } from '@/stores/orders'
import { useUserStore } from '@/stores/user'
import { useEmployeesStore } from '@/stores/employees'
import { useInventoryStore } from '@/stores/inventory'
import type { MaterialInvoice, InventoryItem } from '@/types'
import InventoryItemModal from '@/components/inventory/InventoryItemModal.vue'

interface TransferOrder {
  Ref_Key: string
  Number: string
  Date: string
  Posted: boolean
  statusKey?: string
  statusDescription?: string
  sourceWarehouseKey: string
  sourceWarehouseName?: string
  destinationWarehouseKey: string
  destinationWarehouseName?: string
  customerOrderKey?: string
  customerOrderNumber?: string
  comment?: string
  perItemCustomerOrders?: string[]
  saved?: boolean
  items?: Array<{
    LineNumber: number
    Номенклатура_Key: string
    nomenclatureName: string
    Количество: number
    scannedQty?: number
    barcode?: string
    location?: string
    storageBin?: string
  }>
}

const { fetchTransferOrders, fetchTransferOrderDetails, syncTransferOrders, completeTransferOrderInOneC, loadTransferOrderScans, saveTransferOrderScans } = useStockBalances()
const ordersStore = useOrdersStore()
const userStore = useUserStore()
const employeesStore = useEmployeesStore()
const inventoryStore = useInventoryStore()
const message = useMessage()
const showEditItemModal = ref(false)
const editingItemId = ref<string | null>(null)

const orderItemRowProps = (row: any) => {
  return {
    class: 'cursor-pointer hover:bg-gray-50',
    onClick: () => {
      openEditItem(row)
    }
  }
}

const openEditItem = (orderItem: any) => {
  const nomenclatureKey = orderItem.Номенклатура_Key || orderItem.nomenclatureKey || ''
  if (!nomenclatureKey) {
    message.warning('Не удалось определить товар')
    return
  }
  let inventoryItem = inventoryStore.items.find(i => i.ref_key === nomenclatureKey || i.id === nomenclatureKey)
  if (!inventoryItem) {
    inventoryItem = inventoryStore.items.find(i => i.barcode === orderItem.barcode)
  }
  if (inventoryItem) {
    editingItemId.value = inventoryItem.id
    showEditItemModal.value = true
  } else {
    message.info('Загрузка данных склада...')
    inventoryStore.loadStocksFromApi().then(() => {
      let found = inventoryStore.items.find(i => i.ref_key === nomenclatureKey || i.id === nomenclatureKey)
      if (!found) {
        found = inventoryStore.items.find(i => i.barcode === orderItem.barcode)
      }
      if (found) {
        editingItemId.value = found.id
        showEditItemModal.value = true
      } else {
        message.error('Товар не найден на складе')
      }
    }).catch(() => {
      message.error('Не удалось загрузить данные склада')
    })
  }
}

const handleEditItemSubmit = (data: Partial<InventoryItem>) => {
  message.success('Товар обновлён')
  inventoryStore.loadStocksFromApi().catch(() => {})
}
const loading = ref(false)
const syncing = ref(false)
const loadingDetails = ref(false)
const scanningMode = ref(false)
const scanningComplete = ref(false)
const barcodeBuffer = ref('')
const lastBarcode = ref('')
const barcodeInputRef = ref<InputInst | null>(null)
const filterStatus = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(10)

const pageSizeOptions = [
  { label: '10', value: 10 },
  { label: '25', value: 25 },
  { label: '50', value: 50 },
  { label: '100', value: 100 }
]

watch(filterStatus, () => {
  currentPage.value = 1
})
const orders = ref<TransferOrder[]>([])
const selectedOrderId = ref<string | null>(null)
const selectedOrder = ref<TransferOrder | null>(null)
const scannedBarcodes = ref<Set<string>>(new Set())

// Create order modal state
const showCreateModal = ref(false)
const createSaving = ref(false)
const editingOrderRefKey = ref<string | null>(null)
const createBarcodeBuffer = ref('')
const createBarcodeInputRef = ref<InputInst | null>(null)
const warehouseOptions = ref<Array<{ label: string; value: string }>>([])
const warehouseOptionsAll = ref<Array<{ label: string; value: string }>>([])
const createResult = ref<{ success: boolean; message: string; details?: string } | null>(null)
const searchOptions = ref<Array<{ label: string; value: string }>>([])
const stockDataMap = ref<Map<string, any>>(new Map())
let searchTimer: ReturnType<typeof setTimeout> | null = null

interface CreateItem {
  nomenclatureKey: string
  productName: string
  barcode: string
  quantity: number
  sku: string
  unit: string
  unitKey: string
  storageBin: string
  price: number
  customerOrderKey: string
  customerOrderNumber: string
  selectedProduct: string
  _qtyInput?: string
}

const isLocalOrder = computed(() =>
  selectedOrder.value?.Ref_Key?.startsWith('LOCAL-') ?? false
)

const createForm = reactive({
  sourceWarehouseKey: '',
  destinationWarehouseKey: '',
  customerOrderKey: '',
  selectedProduct: '',
  items: [] as CreateItem[]
})

const hasPerItemCustomerOrder = computed(() =>
  createForm.items.some(i => i.customerOrderKey)
)

const customerOrderOptions = computed(() =>
  ordersStore.orders.map(o => ({
    label: `${o.orderNumber} — ${o.customerName}`,
    value: o.id
  }))
)

const selectedOrderProducts = computed(() => {
  if (!createForm.customerOrderKey) return []
  const order = ordersStore.orders.find(o => o.id === createForm.customerOrderKey)
  return (order?.items || []).map((item: any) => ({
    label: item.productName || item.itemName || 'Без названия',
    value: item.productName || item.itemName || ''
  }))
})

// Order detail item add state
const orderDetailBarcodeBuffer = ref('')
const orderDetailSearchOptions = ref<Array<{ label: string; value: string }>>([])
const orderDetailStockDataMap = ref<Map<string, any>>(new Map())
const orderDetailBarcodeInputRef = ref<InputInst | null>(null)
let orderDetailSearchTimer: ReturnType<typeof setTimeout> | null = null

const canSaveCreate = computed(() =>
  !createResult.value &&
  createForm.sourceWarehouseKey &&
  createForm.destinationWarehouseKey &&
  createForm.sourceWarehouseKey !== createForm.destinationWarehouseKey &&
  createForm.items.length > 0 &&
  !createSaving.value
)

const handleProductSearch = () => {
  const query = createBarcodeBuffer.value
  if (!query || query.length < 2) {
    searchOptions.value = []
    return
  }
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(async () => {
    try {
      const res = await fetch(`/sklad/api/onec/stocks?search=${encodeURIComponent(query)}`)
      const data = await res.json()
      const stocks = data.value || []
      const options: Array<{ label: string; value: string }> = []
      const map = new Map<string, any>()
      stocks.slice(0, 30).forEach((s: any) => {
        const label = `${s.name || s.product || 'Без названия'}${s.barcode ? ' [' + s.barcode + ']' : ''}`
        options.push({ label, value: s.ref_key })
        map.set(s.ref_key, s)
      })
      searchOptions.value = options.length > 0 ? options : [{ label: 'Ничего не найдено', value: '' }]
      stockDataMap.value = map
    } catch {
      searchOptions.value = [{ label: 'Ошибка поиска', value: '' }]
    }
  }, 300)
}

const handleProductSelectResult = (opt: { label: string; value: string }) => {
  if (!opt.value) {
    searchOptions.value = []
    return
  }
  const stock = stockDataMap.value.get(opt.value)
  if (!stock) return

  const existing = createForm.items.find((i: CreateItem) => i.nomenclatureKey === opt.value)
  if (existing) {
    existing.quantity++
    message.success(`✓ ${existing.productName}: +1 (всего ${existing.quantity})`)
  } else {
    createForm.items.push({
      nomenclatureKey: opt.value,
      productName: stock.name || stock.product || 'Без названия',
      barcode: stock.barcode || '',
      quantity: 1,
      sku: stock.sku || '',
      unit: stock.unit || 'шт',
      unitKey: stock.unit_key || '',
      storageBin: stock.storageBin || '',
      price: Number(stock.purchasePrice || stock.averagePrice || 0),
      customerOrderKey: '',
      customerOrderNumber: '',
      selectedProduct: ''
    })
    message.success(`✓ Добавлен: ${stock.name || stock.product}`)
  }
  createBarcodeBuffer.value = ''
  searchOptions.value = []
  nextTick(() => createBarcodeInputRef.value?.focus())
}

// Auto-detect barcode scanner AND product name search
watch(createBarcodeBuffer, (val) => {
  if (!val) {
    searchOptions.value = []
    return
  }
  const trimmed = val.replace(/[\r\n]+/g, '')
  if (trimmed.length < val.length) {
    // Scanner input detected
    createBarcodeBuffer.value = trimmed
    handleCreateScan()
    return
  }
  // Manual input — product search
  handleProductSearch()
})

const pagination = computed(() => ({
  pageSize: itemsPerPage.value,
  page: currentPage.value,
  pageCount: Math.ceil(filteredOrders.value.length / itemsPerPage.value),
  showSizePicker: true,
  pageSizes: [10, 25, 50, 100],
  onChange: (page: number) => {
    currentPage.value = page
  },
  onUpdatePageSize: (pageSize: number) => {
    itemsPerPage.value = pageSize
    currentPage.value = 1
  }
}))

const handleSync = async () => {
  syncing.value = true
  try {
    await syncTransferOrders()
    // После синхронизации перезагружаем список заказов
    const data = await fetchTransferOrders()
    orders.value = data
    message.success('Заказы на перемещение синхронизированы с 1С')
  } catch (error) {
    console.error('Ошибка при синхронизации:', error)
    message.error('Ошибка при синхронизации с 1С')
  } finally {
    syncing.value = false
  }
}

const startScanning = () => {
  scanningMode.value = true
  barcodeBuffer.value = ''
  lastBarcode.value = ''
  scannedBarcodes.value.clear()
  message.info('🔴 Режим сканирования активирован. Сканируйте товары...')
  // Фокусируем поле ввода штрихкода
  nextTick(() => {
    barcodeInputRef.value?.focus()
  })
}

const stopScanning = () => {
  scanningMode.value = false
  barcodeBuffer.value = ''
  lastBarcode.value = ''
  scanningComplete.value = true

  const totalItems = selectedOrder.value?.items?.reduce((sum, item) => sum + item.Количество, 0) || 0
  const scannedCount = selectedOrder.value?.items?.reduce((sum, item) => sum + (item.scannedQty || 0), 0) || 0

  if (scannedCount === 0) {
    message.warning('Ничего не отсканировано')
    scanningComplete.value = false
    return
  }

  if (scannedCount === totalItems) {
    message.success(`✓ Все товары отсканированы! ${scannedCount}/${totalItems}`)
  } else if (scannedCount < totalItems) {
    message.warning(`⚠ Отсканировано ${scannedCount} из ${totalItems} товаров`)
  }
}

let scanTimeout: ReturnType<typeof setTimeout> | null = null

// Конвертация символов русской раскладки клавиатуры в латинские
// (сканер работает как клавиатура и вводит русские буквы при русской раскладке)
// --- Create order modal functions ---

const createItemsColumns: DataTableColumns<CreateItem> = [
  {
    title: '№',
    key: 'index',
    width: 40,
    render: (_, index) => index + 1
  },
  {
    title: 'Товар',
    key: 'productName',
    ellipsis: true
  },
  {
    title: 'Артикул',
    key: 'sku',
    width: 100,
    render: (row) => row.sku || '-'
  },
  {
    title: 'Кол-во',
    key: 'quantity',
    width: 80,
    align: 'center',
    render: (row, index) => h(NInput, {
      value: createForm.items[index]?._qtyInput ?? String(row.quantity).replace('.', ','),
      size: 'small',
      style: 'width: 60px; text-align: center',
      onInput: (val: string) => {
        if (createForm.items[index]) {
          createForm.items[index]._qtyInput = val
        }
      },
      onBlur: () => {
        const item = createForm.items[index]
        if (item?._qtyInput != null) {
          const num = parseFloat(String(item._qtyInput).replace(',', '.'))
          item.quantity = isNaN(num) ? item.quantity : Math.max(0.001, num)
          delete item._qtyInput
        }
      }
    })
  },
  {
    title: 'Заказ покупателя',
    key: 'customerOrderKey',
    width: 180,
    render: (row, index) => h(NSelect, {
      value: row.customerOrderKey || createForm.customerOrderKey,
      options: customerOrderOptions.value,
      filterable: true,
      placeholder: createForm.customerOrderKey ? 'Выбран глобальный' : 'Выберите заказ',
      size: 'small',
      style: 'width: 170px',
      clearable: true,
      disabled: !!createForm.customerOrderKey,
      'onUpdate:value': (val: string) => {
        const item = createForm.items[index]
        if (item) {
          item.customerOrderKey = val || ''
          item.customerOrderNumber = val
            ? ordersStore.orders.find(o => o.id === val)?.orderNumber || ''
            : ''
          item.selectedProduct = ''
        }
      }
    })
  },
  {
    title: 'Изделие из заказа',
    key: 'selectedProduct',
    width: 180,
    render: (row, index) => {
      const orderKey = row.customerOrderKey || createForm.customerOrderKey
      const products = orderKey ? getOrderProducts(orderKey) : []
      return h(NSelect, {
        value: row.selectedProduct,
        options: products,
        filterable: true,
        placeholder: createForm.customerOrderKey ? 'Выбран глобальный' : 'Выберите изделие',
        size: 'small',
        style: 'width: 170px',
        clearable: true,
        disabled: !orderKey || !!createForm.customerOrderKey,
        'onUpdate:value': (val: string) => {
          const item = createForm.items[index]
          if (item) item.selectedProduct = val || ''
        }
      })
    }
  },
  {
    title: 'Место хранения',
    key: 'storageBin',
    width: 130,
    render: (row) => row.storageBin || '-'
  },
  {
    title: '',
    key: 'actions',
    width: 40,
    render: (_, index) => h(NButton, {
      text: true,
      type: 'error',
      onClick: () => { createForm.items.splice(index, 1) }
    }, { default: () => '✕' })
  }
]

const onGlobalCustomerOrderChange = (value: string) => {
  createForm.selectedProduct = ''
  createForm.items.forEach(item => {
    item.customerOrderKey = ''
    item.customerOrderNumber = ''
    item.selectedProduct = ''
  })
}

const getCustomerOrderOptions = () => customerOrderOptions.value

const getOrderProducts = (orderKey: string) => {
  if (!orderKey) return []
  const order = ordersStore.orders.find(o => o.id === orderKey)
  return (order?.items || []).map((item: any) => ({
    label: item.productName || item.itemName || 'Без названия',
    value: item.productName || item.itemName || ''
  }))
}

const openCreateModal = async () => {
  editingOrderRefKey.value = null
  createForm.items = []
  createForm.customerOrderKey = ''
  createForm.selectedProduct = ''
  createBarcodeBuffer.value = ''
  createResult.value = null
  showCreateModal.value = true

  // Load orders if needed
  if (ordersStore.orders.length === 0) {
    try { await ordersStore.loadOrdersFromApi() } catch { /* ignore */ }
  }

  // Load warehouse options
  if (warehouseOptions.value.length === 0) {
    const [whRes, allRes] = await Promise.all([
      fetch('/sklad/api/onec/warehouses'),
      fetch('/sklad/api/onec/warehouses?all=1')
    ])
    const mapItems = (items: any[]) => items.map((w: any) => ({
      label: w.name || w.description || w.Description || w.id,
      value: w.id || w.ref_key || w.Ref_Key
    }))
    try {
      warehouseOptions.value = mapItems(((await whRes.json()).value || []))
    } catch { warehouseOptions.value = [] }
    try {
      warehouseOptionsAll.value = mapItems(((await allRes.json()).value || []))
    } catch { warehouseOptionsAll.value = [] }
    if (warehouseOptions.value.length === 0) {
      warehouseOptions.value = [
        { label: 'Основной склад', value: 'main' },
        { label: 'Склад готовой продукции', value: 'finished' }
      ]
    }
    if (warehouseOptionsAll.value.length === 0) {
      warehouseOptionsAll.value = warehouseOptions.value
    }
  }

  // Устанавливаем склады по умолчанию
  const mainWh = warehouseOptions.value.find(o => o.label.toLowerCase().includes('основной'))
  const prodWh = warehouseOptionsAll.value.find(o => o.label.toLowerCase().includes('производств'))
  createForm.sourceWarehouseKey = mainWh?.value || warehouseOptions.value[0]?.value || ''
  createForm.destinationWarehouseKey = prodWh?.value || warehouseOptionsAll.value[1]?.value || ''

  nextTick(() => {
    createBarcodeInputRef.value?.focus()
  })
}

const closeCreateModal = () => {
  showCreateModal.value = false
  createResult.value = null
  editingOrderRefKey.value = null
}

const handleCreateScan = async () => {
  const raw = createBarcodeBuffer.value.trim()
  if (!raw) return

  const barcode = normalizeBarcode(raw)
  if (!barcode) return

  // Check if already in list
  const existing = createForm.items.find((i: CreateItem) => normalizeBarcode(i.barcode) === barcode)
  if (existing) {
    existing.quantity++
    createBarcodeBuffer.value = ''
    message.success(`✓ ${existing.productName}: +1 (всего ${existing.quantity})`)
    nextTick(() => createBarcodeInputRef.value?.focus())
    return
  }

  // Lookup barcode via API
  try {
    const res = await fetch(`/sklad/api/onec/stocks/by-barcode?barcode=${encodeURIComponent(barcode)}`)
    const data = await res.json()
    if (data.success && data.items.length > 0) {
      const found = data.items[0]
      createForm.items.push({
        nomenclatureKey: found.ref_key || '',
        productName: found.name || found.product || 'Неизвестный товар',
        barcode: barcode,
        quantity: 1,
        sku: found.sku || '',
        unit: found.unit || 'шт',
        unitKey: found.unit_key || '',
        storageBin: found.storageBin || '',
        price: Number(found.purchasePrice || found.averagePrice || 0),
        customerOrderKey: createForm.customerOrderKey || '',
        customerOrderNumber: createForm.customerOrderKey
          ? (ordersStore.orders.find(o => o.id === createForm.customerOrderKey)?.orderNumber || '')
          : '',
        selectedProduct: ''
      })
      message.success(`✓ Добавлен: ${found.name}`)
    } else {
      message.warning(`Товар со штрихкодом ${barcode} не найден`)
    }
  } catch {
    message.error('Ошибка поиска штрихкода')
  }

  createBarcodeBuffer.value = ''
  nextTick(() => createBarcodeInputRef.value?.focus())
}

const saveCreateOrder = async () => {
  if (!canSaveCreate.value) return
  createSaving.value = true
  createResult.value = null

  try {
    const itemsPayload = createForm.items.map((item: CreateItem) => ({
      nomenclatureKey: item.nomenclatureKey,
      productName: item.productName,
      barcode: item.barcode,
      quantity: item.quantity,
      unitKey: item.unitKey,
      storageBin: item.storageBin,
      price: item.price || 0,
      customerOrderKey: item.customerOrderKey || undefined,
      customerOrderNumber: item.customerOrderNumber || undefined,
      selectedProduct: item.selectedProduct || undefined
    }))

    // If editing existing local order, use PUT
    if (editingOrderRefKey.value) {
      const res = await fetch(`/sklad/api/transfer-orders/${editingOrderRefKey.value}/items`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        },
        body: JSON.stringify({ items: itemsPayload })
      })
      const result = await res.json()
      if (result.success) {
        message.success('✓ Товары обновлены')
        closeCreateModal()
        const data = await fetchTransferOrders()
        orders.value = data
        if (selectedOrderId.value) {
          const details = await fetchTransferOrderDetails(selectedOrderId.value)
          if (details) selectedOrder.value = details
        }
      } else {
        message.error(result.error || 'Ошибка обновления')
      }
      return
    }

    // Create new local order
    const res = await fetch('/sklad/api/transfer-orders/create', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
      },
      body: JSON.stringify({
        sourceWarehouseKey: createForm.sourceWarehouseKey,
        sourceWarehouseName: warehouseOptions.value.find(o => o.value === createForm.sourceWarehouseKey)?.label || '',
        destinationWarehouseKey: createForm.destinationWarehouseKey,
        destinationWarehouseName: warehouseOptions.value.find(o => o.value === createForm.destinationWarehouseKey)?.label || '',
        items: itemsPayload,
        customerOrderKey: createForm.customerOrderKey || undefined,
        customerOrderNumber: createForm.customerOrderKey
          ? ordersStore.orders.find(o => o.id === createForm.customerOrderKey)?.orderNumber
          : undefined,
        selectedProduct: createForm.selectedProduct || undefined
      })
    })

    const result = await res.json()

    if (result.success) {
      message.success(`Заказ №${result.order.order_number} сохранён локально`)
      closeCreateModal()
      const data = await fetchTransferOrders()
      orders.value = data
    } else {
      message.error(result.error || 'Ошибка создания заказа')
    }
  } catch (err) {
    message.error(err instanceof Error ? err.message : 'Ошибка создания заказа')
  } finally {
    createSaving.value = false
  }
}



// --- End create order modal functions ---

const convertRussianKeyboardToLatin = (text: string): string => {
  const map: Record<string, string> = {
    'й': 'q', 'ц': 'w', 'у': 'e', 'к': 'r', 'е': 't', 'н': 'y', 'г': 'u', 'ш': 'i', 'щ': 'o', 'з': 'p',
    'х': '[', 'ъ': ']',
    'ф': 'a', 'ы': 's', 'в': 'd', 'а': 'f', 'п': 'g', 'р': 'h', 'о': 'j', 'л': 'k', 'д': 'l',
    'ж': ';', 'э': "'",
    'я': 'z', 'ч': 'x', 'с': 'c', 'м': 'v', 'и': 'b', 'т': 'n', 'ь': 'm',
    'б': ',', 'ю': '.',
    'Й': 'Q', 'Ц': 'W', 'У': 'E', 'К': 'R', 'Е': 'T', 'Н': 'Y', 'Г': 'U', 'Ш': 'I', 'Щ': 'O', 'З': 'P',
    'Х': '[', 'Ъ': ']',
    'Ф': 'A', 'Ы': 'S', 'В': 'D', 'А': 'F', 'П': 'G', 'Р': 'H', 'О': 'J', 'Л': 'K', 'Д': 'L',
    'Ж': ';', 'Э': "'",
    'Я': 'Z', 'Ч': 'X', 'С': 'C', 'М': 'V', 'И': 'B', 'Т': 'N', 'Ь': 'M',
    'Б': ',', 'Ю': '.',
    '.': '/',
  }
  return text.split('').map(char => map[char] || char).join('')
}

// Функция нормализации штрихкода (удаляем пробелы, управляющие символы, конвертируем раскладку)
const normalizeBarcode = (code: string): string => {
  return convertRussianKeyboardToLatin(
    code
      .trim()
      .replace(/[\|\r\n\t]+/g, '')
  ).replace(/[^\x20-\x7E]/g, '')
}

const saveCreateAndSendTo1C = async () => {
  if (!canSaveCreate.value) return
  createSaving.value = true
  try {
    const itemsPayload = createForm.items.map((item: CreateItem) => ({
      nomenclatureKey: item.nomenclatureKey,
      productName: item.productName,
      barcode: item.barcode,
      quantity: item.quantity,
      unitKey: item.unitKey,
      storageBin: item.storageBin,
      price: item.price || 0,
      customerOrderKey: item.customerOrderKey || undefined,
      customerOrderNumber: item.customerOrderNumber || undefined,
      selectedProduct: item.selectedProduct || undefined
    }))

    const res = await fetch('/sklad/api/transfer-orders/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
      },
      body: JSON.stringify({
        sourceWarehouseKey: createForm.sourceWarehouseKey,
        sourceWarehouseName: warehouseOptions.value.find(o => o.value === createForm.sourceWarehouseKey)?.label || '',
        destinationWarehouseKey: createForm.destinationWarehouseKey,
        destinationWarehouseName: warehouseOptions.value.find(o => o.value === createForm.destinationWarehouseKey)?.label || '',
        items: itemsPayload,
        customerOrderKey: createForm.customerOrderKey || undefined,
        customerOrderNumber: createForm.customerOrderKey
          ? ordersStore.orders.find(o => o.id === createForm.customerOrderKey)?.orderNumber
          : undefined,
        selectedProduct: createForm.selectedProduct || undefined
      })
    })

    const result = await res.json()
    if (!result.success) {
      message.error(result.error || 'Ошибка создания заказа')
      return
    }

    const refKey = result.order.ref_key
    const sendRes = await fetch(`/sklad/api/transfer-orders/${refKey}/send-to-1c`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
      }
    })
    const sendResult = await sendRes.json()
    if (sendResult.success) {
      message.success(`✓ Заказ №${result.order.order_number} создан и отправлен в 1С (статус: ${sendResult.status})`)
    } else {
      message.warning(`Заказ сохранён локально, но ошибка отправки в 1С: ${sendResult.error}`)
    }

    closeCreateModal()
    const data = await fetchTransferOrders()
    orders.value = data
    window.dispatchEvent(new CustomEvent('transferOrderOperation'))
    window.dispatchEvent(new CustomEvent('refreshUserOperations'))
  } catch (err) {
    message.error(err instanceof Error ? err.message : 'Ошибка')
  } finally {
    createSaving.value = false
  }
}

const handleOrderDetailSearch = () => {
  const query = orderDetailBarcodeBuffer.value
  if (!query || query.length < 2) {
    orderDetailSearchOptions.value = []
    return
  }
  if (orderDetailSearchTimer) clearTimeout(orderDetailSearchTimer)
  orderDetailSearchTimer = setTimeout(async () => {
    try {
      const res = await fetch(`/sklad/api/onec/stocks?search=${encodeURIComponent(query)}`)
      const data = await res.json()
      const stocks = data.value || []
      const options: Array<{ label: string; value: string }> = []
      const map = new Map<string, any>()
      stocks.slice(0, 30).forEach((s: any) => {
        const label = `${s.name || s.product || 'Без названия'}${s.barcode ? ' [' + s.barcode + ']' : ''}`
        options.push({ label, value: s.ref_key })
        map.set(s.ref_key, s)
      })
      orderDetailSearchOptions.value = options.length > 0 ? options : [{ label: 'Ничего не найдено', value: '' }]
      orderDetailStockDataMap.value = map
    } catch {
      orderDetailSearchOptions.value = [{ label: 'Ошибка поиска', value: '' }]
    }
  }, 300)
}

const handleOrderDetailSelect = async (opt: { label: string; value: string }) => {
  if (!opt.value) {
    orderDetailSearchOptions.value = []
    return
  }
  const stock = orderDetailStockDataMap.value.get(opt.value)
  if (!stock) return
  await addItemToLocalOrder(stock)
  orderDetailBarcodeBuffer.value = ''
  orderDetailSearchOptions.value = []
  nextTick(() => orderDetailBarcodeInputRef.value?.focus())
}

const handleOrderDetailScan = async () => {
  const raw = orderDetailBarcodeBuffer.value.trim()
  if (!raw) return

  const barcode = normalizeBarcode(raw)
  if (!barcode) return

  const existing = selectedOrder.value?.items?.find(
    (i: any) => normalizeBarcode(i.barcode || '') === barcode
  )
  if (existing) {
    // Увеличиваем количество для существующего товара
    existing.Количество = (existing.Количество || 0) + 1
    message.success(`✓ ${existing.nomenclatureName}: количество = ${existing.Количество}`)
    orderDetailBarcodeBuffer.value = ''
    nextTick(() => orderDetailBarcodeInputRef.value?.focus())
    return
  }

  try {
    const res = await fetch(`/sklad/api/onec/stocks/by-barcode?barcode=${encodeURIComponent(barcode)}`)
    const data = await res.json()
    if (data.success && data.items.length > 0) {
      const found = data.items[0]
      await addItemToLocalOrder(found)
    } else {
      message.warning(`Товар со штрихкодом ${barcode} не найден`)
    }
  } catch {
    message.error('Ошибка поиска штрихкода')
  }

  orderDetailBarcodeBuffer.value = ''
  nextTick(() => orderDetailBarcodeInputRef.value?.focus())
}

const addItemToLocalOrder = async (stock: any) => {
  if (!selectedOrder.value) return
  const refKey = selectedOrder.value.Ref_Key

  const currentItems = (selectedOrder.value.items || []).map((item: any) => ({
    nomenclatureKey: item.Номенклатура_Key || item.nomenclatureKey,
    productName: item.nomenclatureName || item.productName,
    barcode: item.barcode || '',
    quantity: item.Количество || item.quantity || 1,
    unitKey: item.unitKey || '',
    storageBin: item.storageBin || '',
    price: Number(item.price || item.Цена || 0)
  }))

  if (currentItems.some((i: any) => i.nomenclatureKey === (stock.ref_key || stock.Ref_Key || stock.Номенклатура_Key))) {
    message.info('Этот товар уже есть в заказе')
    return
  }

  currentItems.push({
    nomenclatureKey: stock.ref_key || stock.Ref_Key || '',
    productName: stock.name || stock.product || stock.nomenclatureName || 'Без названия',
    barcode: stock.barcode || '',
    quantity: 1,
    unitKey: stock.unit_key || '',
    storageBin: stock.storageBin || '',
    price: Number(stock.purchasePrice || stock.averagePrice || 0)
  })

  try {
    const res = await fetch(`/sklad/api/transfer-orders/${refKey}/items`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
      },
      body: JSON.stringify({ items: currentItems })
    })
    const result = await res.json()
    if (result.success) {
      message.success('✓ Товар добавлен в заказ')
      const details = await fetchTransferOrderDetails(refKey)
      if (details) selectedOrder.value = details
    } else {
      message.error(result.error || 'Ошибка добавления товара')
    }
  } catch (err) {
    message.error(err instanceof Error ? err.message : 'Ошибка добавления товара')
  }
}

watch(orderDetailBarcodeBuffer, (val) => {
  if (!val) {
    orderDetailSearchOptions.value = []
    return
  }
  const trimmed = val.replace(/[\r\n]+/g, '')
  if (trimmed.length < val.length) {
    orderDetailBarcodeBuffer.value = trimmed
    handleOrderDetailScan()
    return
  }
  handleOrderDetailSearch()
})

const procesBarcode = (barcode: string) => {
  if (!selectedOrder.value?.items || !barcode.trim()) return

  // Нормализуем введённый штрихкод
  const normalizedBarcode = normalizeBarcode(barcode)

  // Ищем товар по штрихкоду (также нормализуем штрихкод из базы)
  const foundItem = selectedOrder.value.items.find(item => {
    const itemBarcode = normalizeBarcode(item.barcode || '')
    return itemBarcode === normalizedBarcode
  })

  if (!foundItem) {
    message.error(`✗ Штрихкод не найден: ${barcode}`)
    return
  }

  // Для локальных заказов увеличиваем Количество
  if (isLocalOrder.value) {
    foundItem.Количество = (foundItem.Количество || 0) + 1
    scannedBarcodes.value.add(normalizedBarcode)

    if (selectedOrder.value) {
      selectedOrder.value.saved = false
    }

    message.success(`✓ ${foundItem.nomenclatureName}: количество = ${foundItem.Количество}`)
    return
  }

  // Для 1С заказов - стандартная логика сканирования
  const currentQty = foundItem.scannedQty || 0
  const requiredQty = foundItem.Количество

  // Проверяем не превышено ли количество
  if (currentQty >= requiredQty) {
    message.error(`🚫 Товар "${foundItem.nomenclatureName}" уже полностью отсканирован! (${currentQty}/${requiredQty})`)
    return
  }

  // Увеличиваем счетчик
  foundItem.scannedQty = currentQty + 1
  scannedBarcodes.value.add(normalizedBarcode)

  // Сбрасываем флаг saved при сканировании
  if (selectedOrder.value) {
    selectedOrder.value.saved = false
  }

  const newQty = foundItem.scannedQty
  const totalScanned = selectedOrder.value.items.reduce((sum, item) => sum + (item.scannedQty || 0), 0)
  const totalRequired = selectedOrder.value.items.reduce((sum, item) => sum + item.Количество, 0)
  const percent = Math.round((totalScanned / totalRequired) * 100)

  if (newQty === requiredQty) {
    message.success(`✓ ${foundItem.nomenclatureName} завершено! (${newQty}/${requiredQty})`)
  } else {
    message.info(`✓ ${foundItem.nomenclatureName}: ${newQty}/${requiredQty} (Всего: ${totalScanned}/${totalRequired} - ${percent}%)`)
  }
}

const handleScan = () => {
  const barcode = barcodeBuffer.value.trim()
  if (!barcode) return

  const normalized = normalizeBarcode(barcode)
  lastBarcode.value = normalized
  procesBarcode(barcode)
  barcodeBuffer.value = ''

  // Возвращаем фокус на поле ввода
  nextTick(() => {
    barcodeInputRef.value?.focus()
  })
}

const handleKeyDown = (event: KeyboardEvent) => {
  if (!scanningMode.value) {
    // Если нажата комбинация Ctrl+S, то включаем режим сканирования
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault()
      startScanning()
    }
    return
  }

  // Если Escape - выходим из режима сканирования
  if (event.key === 'Escape') {
    event.preventDefault()
    stopScanning()
    return
  }
}

// Автообработка штрихкода при вводе (watch с debounce как в scan.vue)
watch(barcodeBuffer, (val) => {
  if (scanTimeout) clearTimeout(scanTimeout)
  if (!val.trim()) return
  scanTimeout = setTimeout(() => {
    handleScan()
  }, 300)
})

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ru-RU')
  } catch {
    return dateStr
  }
}

// Вычисляемые свойства для статистики
const activeCellsCount = computed(() =>
  orders.value.filter(o => (o.statusDescription || '') === 'В работе (ячейки)').length
)

const activeWriteoffCount = computed(() =>
  orders.value.filter(o => (o.statusDescription || '') === 'В работе (к списанию)').length
)

const completedCellsCount = computed(() =>
  orders.value.filter(o => (o.statusDescription || '') === 'Завершен (ячейки)').length
)

const completedWriteoffCount = computed(() =>
  orders.value.filter(o => (o.statusDescription || '') === 'Завершен (списание)').length
)

const localsCount = computed(() =>
  orders.value.filter(o => o.Ref_Key?.startsWith('LOCAL-')).length
)

// Отфильтрованные заказы для таблицы
const filteredOrders = computed(() => {
  if (!filterStatus.value) return orders.value

  switch (filterStatus.value) {
    case 'locals':
      return orders.value.filter(o => o.Ref_Key?.startsWith('LOCAL-'))
    case 'active_cells':
      return orders.value.filter(o => (o.statusDescription || '') === 'В работе (ячейки)')
    case 'active_writeoff':
      return orders.value.filter(o => (o.statusDescription || '') === 'В работе (к списанию)')
    case 'completed_cells':
      return orders.value.filter(o => (o.statusDescription || '') === 'Завершен (ячейки)')
    case 'completed_writeoff':
      return orders.value.filter(o => (o.statusDescription || '') === 'Завершен (списание)')
    default:
      return orders.value
  }
})

const columns: DataTableColumns<TransferOrder> = [
  {
    title: '№ Заказа',
    key: 'Number',
    width: 150,
    render: (row) => row.Number
  },
  {
    title: 'Дата',
    key: 'Date',
    width: 120,
    render: (row) => formatDate(row.Date)
  },
  {
    title: 'От склада',
    key: 'sourceWarehouseName',
    width: 150,
    render: (row) => row.sourceWarehouseName || '-'
  },
  {
    title: 'На склад',
    key: 'destinationWarehouseName',
    width: 150,
    render: (row) => row.destinationWarehouseName || '-'
  },
  {
    title: 'Заказ покупателя',
    key: 'customerOrderNumber',
    width: 170,
    render: (row) => {
      const val = row.customerOrderNumber
      if (!val) return '-'
      if (val === 'Разные заказы') {
        return h('span', { style: 'color: var(--n-text-color-3); font-style: italic' }, 'В табличной части')
      }
      return val
    }
  },
  {
    title: 'Состояние',
    key: 'statusDescription',
    width: 140,
    render: (row) => {
      const status = row.statusDescription || 'Неизвестно'
      const type = status === 'Завершен' ? 'error' : 'warning'
      return h(NTag, { type }, {
        default: () => status
      })
    }
  },
  {
    title: '',
    key: 'actions',
    width: 60,
    render: (row) => {
      if (!row.Ref_Key?.startsWith('LOCAL-')) return null
      return h('div', { onClick: (e: MouseEvent) => e.stopPropagation() }, [
        h(NPopconfirm, {
          onPositiveClick: () => handleDeleteLocalOrder(row),
          positiveButtonProps: { type: 'error' as const }
        }, {
          default: () => 'Удалить черновик?',
          trigger: () => h(NButton, {
            text: true,
            type: 'error',
            size: 'small'
          }, { default: () => '✕' })
        })
      ])
    }
  },
]

const itemsColumns: DataTableColumns<any> = [
  {
    title: 'Товар',
    key: 'nomenclatureName',
    width: 300,
    ellipsis: true,
    render: (row) => row.nomenclatureName
  },
  {
    title: 'Штрих код',
    key: 'barcode',
    width: 120,
    render: (row) => row.barcode || '-'
  },
  {
    title: 'Заказ покупателя',
    key: 'customerOrderNumber',
    width: 150,
    render: (row) => row.customerOrderNumber || '-'
  },
  {
    title: 'Место хранения',
    key: 'storageBin',
    width: 150,
    render: (row) => row.storageBin || '-'
  },
  {
    title: 'Количество',
    key: 'Количество',
    width: 100,
    align: 'center'
  },
  {
    title: 'Отсканировано',
    key: 'scannedQty',
    width: 180,
    align: 'center',
    render: (row) => {
      const scanned = row.scannedQty || 0
      const required = row.Количество || 0

      if (!scanningMode.value) {
        return String(scanned)
      }

      return h('div', { class: 'flex items-center gap-2 justify-center' }, [
        h(NButton, {
          text: true,
          type: 'primary',
          size: 'small',
          onClick: () => {
            if (scanned > 0) {
              row.scannedQty = scanned - 1
            }
          }
        }, { default: () => '−' }),
        h(NInput, {
          value: row._scannedQtyInput ?? String(scanned).replace('.', ','),
          type: 'text',
          size: 'small',
          style: { width: '80px', textAlign: 'center' },
          onInput: (val: string) => {
            if (row) {
              row._scannedQtyInput = val
            }
          },
          onBlur: () => {
            if (row._scannedQtyInput != null) {
              const num = parseFloat(String(row._scannedQtyInput).replace(',', '.'))
              row.scannedQty = isNaN(num) ? scanned : Math.max(0, Math.min(num, required + 5))
              delete row._scannedQtyInput
            }
          },
          onKeydown: (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
              const target = e.target as HTMLInputElement
              target?.blur()
            }
          }
        }),
        h(NButton, {
          text: true,
          type: 'primary',
          size: 'small',
          onClick: () => {
            row.scannedQty = scanned + 1
          }
        }, { default: () => '+' })
      ])
    }
  }
]

const localItemsColumns: DataTableColumns<any> = [
  {
    title: 'Товар',
    key: 'nomenclatureName',
    width: 300,
    ellipsis: true,
    render: (row) => row.nomenclatureName
  },
  {
    title: 'Штрих код',
    key: 'barcode',
    width: 120,
    render: (row) => row.barcode || '-'
  },
  {
    title: 'Заказ покупателя',
    key: 'customerOrderNumber',
    width: 150,
    render: (row) => row.customerOrderNumber || '-'
  },
  {
    title: 'Место хранения',
    key: 'storageBin',
    width: 150,
    render: (row) => row.storageBin || '-'
  },
  {
    title: 'Количество',
    key: 'Количество',
    width: 180,
    align: 'center',
    render: (row, index) => {
      const qty = row.Количество || 0

      return h('div', { class: 'flex items-center gap-2 justify-center' }, [
        h(NButton, {
          text: true,
          type: 'primary',
          size: 'small',
          onClick: () => {
            if (qty > 0) {
              row.Количество = qty - 1
            }
          }
        }, { default: () => '−' }),
        h(NInput, {
          value: row._qtyInput ?? String(qty).replace('.', ','),
          type: 'text',
          size: 'small',
          style: { width: '80px', textAlign: 'center' },
          onInput: (val: string) => {
            if (row) {
              row._qtyInput = val
            }
          },
          onBlur: () => {
            if (row._qtyInput != null) {
              const num = parseFloat(String(row._qtyInput).replace(',', '.'))
              row.Количество = isNaN(num) ? qty : Math.max(0, num)
              delete row._qtyInput
            }
          },
          onKeydown: (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
              const target = e.target as HTMLInputElement
              target?.blur()
            }
          }
        }),
        h(NButton, {
          text: true,
          type: 'primary',
          size: 'small',
          onClick: () => {
            row.Количество = qty + 1
          }
        }, { default: () => '+' })
      ])
    }
  }
]

const itemsScanColumns: DataTableColumns<any> = [
  {
    title: 'Статус',
    key: 'barcode',
    width: 100,
    align: 'center',
    render: (row) => {
      const scanned = row.scannedQty || 0
      const required = row.Количество || 0

      if (scanned === required) {
        return h(NTag, { type: 'success', round: true }, {
          default: () => '✓ OK'
        })
      } else if (scanned > required) {
        return h(NTag, { type: 'error', round: true }, {
          default: () => `✗ ${scanned}>${required}`
        })
      } else {
        return h(NTag, { type: 'warning', round: true }, {
          default: () => `⚠ ${scanned}/${required}`
        })
      }
    }
  },
  {
    title: 'Товар',
    key: 'nomenclatureName',
    ellipsis: true
  },
  {
    title: 'Штрих код',
    key: 'barcode',
    width: 150,
    render: (row) => h('code', {}, row.barcode || '-')
  },
  {
    title: 'Заказ покупателя',
    key: 'customerOrderNumber',
    width: 150,
    render: (row) => row.customerOrderNumber || '-'
  },
  {
    title: 'Место хранения',
    key: 'storageBin',
    width: 150,
    render: (row) => row.storageBin || '-'
  },
  {
    title: 'Требуется',
    key: 'Количество',
    width: 100,
    align: 'center'
  },
  {
    title: 'Отсканировано',
    key: 'scannedQty',
    width: 180,
    align: 'center',
    render: (row) => {
      const scanned = row.scannedQty || 0
      const required = row.Количество || 0
      return h('div', { class: 'flex items-center gap-2 justify-center' }, [
        h(NButton, {
          text: true,
          type: 'primary',
          size: 'small',
          onClick: () => {
            if (scanned > 0) {
              row.scannedQty = scanned - 1
            }
          }
        }, { default: () => '−' }),
        h(NInput, {
          value: row._scannedQtyInput ?? String(scanned).replace('.', ','),
          type: 'text',
          size: 'small',
          style: { width: '80px', textAlign: 'center' },
          onInput: (val: string) => {
            if (row) {
              row._scannedQtyInput = val
            }
          },
          onBlur: () => {
            if (row._scannedQtyInput != null) {
              const num = parseFloat(String(row._scannedQtyInput).replace(',', '.'))
              row.scannedQty = isNaN(num) ? scanned : Math.max(0, Math.min(num, required + 5))
              delete row._scannedQtyInput
            }
          },
          onKeydown: (e: KeyboardEvent) => {
            if (e.key === 'Enter') {
              const target = e.target as HTMLInputElement
              target?.blur()
            }
          }
        }),
        h(NButton, {
          text: true,
          type: 'primary',
          size: 'small',
          onClick: () => {
            row.scannedQty = scanned + 1
          }
        }, { default: () => '+' })
      ])
    }
  }
]

const saveScannedDataToStorage = () => {
  if (!selectedOrder.value?.items) return

  const scannedData = selectedOrder.value.items.map(item => ({
    barcode: item.barcode,
    scannedQty: item.scannedQty || 0
  }))

  localStorage.setItem(`scan_${selectedOrder.value.Ref_Key}`, JSON.stringify(scannedData))
}

const loadScannedDataFromStorage = (orderId: string) => {
  const stored = localStorage.getItem(`scan_${orderId}`)
  if (!stored) return

  try {
    const scannedData = JSON.parse(stored)
    if (selectedOrder.value?.items) {
      selectedOrder.value.items.forEach(item => {
        const found = scannedData.find((s: any) => s.barcode === item.barcode)
        if (found) {
          item.scannedQty = found.scannedQty
        }
      })
    }
  } catch (e) {
    console.error('Ошибка загрузки данных сканирования:', e)
  }
}

const openOrder = async (orderId: string) => {
  selectedOrderId.value = orderId
  loadingDetails.value = true
  scanningMode.value = false
  scanningComplete.value = false
  barcodeBuffer.value = ''
  lastBarcode.value = ''
  scannedBarcodes.value.clear()

  try {
    const details = await fetchTransferOrderDetails(orderId)
    // Инициализируем scannedQty для всех товаров
    if (details.items) {
      details.items.forEach((item: any) => {
        item.scannedQty = 0
      })
    }
    details.saved = false
    selectedOrder.value = details

    // Загружаем сохранённые данные сканирования из БД
    try {
      const scans = await loadTransferOrderScans(orderId)
      if (selectedOrder.value?.items && scans) {
        selectedOrder.value.items.forEach(item => {
          if (scans[item.barcode || '']) {
            item.scannedQty = scans[item.barcode || '']
          }
        })
      }
    } catch (e) {
    }
  } catch (error) {
    console.error('Ошибка при загрузке деталей заказа:', error)
  } finally {
    loadingDetails.value = false
  }
}

const saveScanningLocally = () => {
  if (!selectedOrder.value) return

  const result = {
    orderId: selectedOrder.value.Ref_Key,
    orderNumber: selectedOrder.value.Number,
    timestamp: new Date().toISOString(),
    items: selectedOrder.value.items?.map(item => ({
      barcode: item.barcode,
      nomenclatureName: item.nomenclatureName,
      required: item.Количество,
      scanned: item.scannedQty || 0
    }))
  }

  // Сохраняем в localStorage
  const existing = JSON.parse(localStorage.getItem('transfer_order_scans') || '[]')
  existing.push(result)
  localStorage.setItem('transfer_order_scans', JSON.stringify(existing))

  // Добавляем флаг что сохранено
  if (selectedOrder.value) {
    selectedOrder.value.saved = true
  }

  message.success(`✓ Результат сохранён локально. Отсканировано товаров: ${result.items?.reduce((s, i) => s + i.scanned, 0)}`)
  // Экран результатов остаётся видимым!
}

const submitToOnec = async () => {
  if (!selectedOrder.value) return

  syncing.value = true
  try {
    // Проверяем что всё совпало
    const totalScanned = selectedOrder.value.items?.reduce((sum, item) => sum + (item.scannedQty || 0), 0) || 0
    const totalRequired = selectedOrder.value.items?.reduce((sum, item) => sum + item.Количество, 0) || 0

    if (totalScanned !== totalRequired) {
      message.error(`Количество не совпадает: ${totalScanned}/${totalRequired}`)
      return
    }

    const orderId = selectedOrder.value.Ref_Key
    const currentStatus = selectedOrder.value.statusDescription || ''
    const completeStatus = currentStatus.includes('ячейки') ? 'Завершен (ячейки)' : 'Завершен (списание)'
    await completeTransferOrderInOneC(orderId, completeStatus)

    message.success(`✓ Заказ "${selectedOrder.value.Number}" завершён в 1C, локальные данные удалены`)

    // Add to user's material history
    if (userStore.user?.id && selectedOrder.value.items) {
      const historyItem: MaterialInvoice = {
        id: `TO-COMPLETE-${Date.now()}`,
        employeeId: userStore.user.id,
        date: new Date(),
        orderNumber: selectedOrder.value.Number,
        destination: 'Перемещение (завершено)',
        totalAmount: 0,
        items: selectedOrder.value.items.map((item: any) => ({
          productName: item.nomenclatureName || item.productName || '',
          quantity: Number(item.Количество) || Number(item.quantity) || 0,
          unit: 'шт',
          article: item.barcode || '',
          price: Number(item.price || item.Цена || 0),
          scannedAt: new Date()
        })),
        createdBy: userStore.user.name || ''
      }
      employeesStore.addMaterialHistory(userStore.user.id, historyItem)
    }

    const data = await fetchTransferOrders()
    orders.value = data

    scanningComplete.value = false
    barcodeBuffer.value = ''
    lastBarcode.value = ''
    selectedOrder.value = null
    selectedOrderId.value = null
    window.dispatchEvent(new CustomEvent('transferOrderOperation'))
  } catch (error) {
    console.error('Ошибка при отправке в 1C:', error)
    message.error('Ошибка при отправке в 1C')
  } finally {
    syncing.value = false
  }
}

const sendTo1C = async () => {
  if (!selectedOrder.value) return
  syncing.value = true
  try {
    const res = await fetch(`/sklad/api/transfer-orders/${selectedOrder.value.Ref_Key}/send-to-1c`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
      }
    })
    const result = await res.json()
    if (result.success) {
      message.success(`✓ Заказ отправлен в 1С (статус: ${result.status})`)

      // Записываем в историю материалов пользователя
      if (userStore.user?.id && selectedOrder.value?.items) {
        const historyItem: MaterialInvoice = {
          id: `TO-SEND-${Date.now()}`,
          employeeId: userStore.user.id,
          date: new Date(),
          orderNumber: selectedOrder.value.Number,
          destination: 'Перемещение',
          totalAmount: selectedOrder.value.items.reduce((sum: number, item: any) =>
            sum + (Number(item.price || item.Цена || 0) * (Number(item.Количество || item.quantity || 0))), 0),
          items: selectedOrder.value.items.map((item: any) => ({
            productName: item.nomenclatureName || item.productName || '',
            quantity: Number(item.Количество) || Number(item.quantity) || 0,
            unit: 'шт',
            article: item.barcode || '',
            price: Number(item.price || item.Цена || 0),
          scannedAt: new Date()
        })),
        createdBy: userStore.user.name || ''
      }
      employeesStore.addMaterialHistory(userStore.user.id, historyItem)
    }

    const data = await fetchTransferOrders()
    orders.value = data
    selectedOrder.value = null
    selectedOrderId.value = null
    window.dispatchEvent(new CustomEvent('transferOrderOperation'))
    window.dispatchEvent(new CustomEvent('refreshUserOperations'))
  } else {
    message.error(result.error || 'Ошибка отправки в 1С')
  }
} catch (err) {
  message.error(err instanceof Error ? err.message : 'Ошибка отправки в 1С')
} finally {
  syncing.value = false
}
}

const openAddItemsModal = () => {
  editingOrderRefKey.value = selectedOrder.value?.Ref_Key || null
  showCreateModal.value = true
  if (selectedOrder.value?.items) {
    createForm.items = selectedOrder.value.items.map((item: any) => ({
      nomenclatureKey: item.Номенклатура_Key || item.nomenclatureKey,
      productName: item.nomenclatureName || item.productName,
      barcode: item.barcode,
      quantity: item.Количество || item.quantity,
      sku: item.sku || '',
      unit: item.unit || 'шт',
      unitKey: item.unitKey || '',
      storageBin: item.storageBin || '',
      price: Number(item.price || item.Цена || 0),
      customerOrderKey: item.customerOrderKey || '',
      customerOrderNumber: item.customerOrderNumber || '',
      selectedProduct: item.selectedProduct || ''
    }))
  }
  createForm.sourceWarehouseKey = selectedOrder.value?.sourceWarehouseKey || ''
  createForm.destinationWarehouseKey = selectedOrder.value?.destinationWarehouseKey || ''
  createForm.customerOrderKey = selectedOrder.value?.customerOrderKey || ''
}

const continueScanningAfterCompletion = () => {
  scanningComplete.value = false
  scanningMode.value = true
  barcodeBuffer.value = ''
  lastBarcode.value = ''
  message.info('Режим сканирования продолжен...')
  nextTick(() => {
    barcodeInputRef.value?.focus()
  })
}

const printTransferOrder = () => {
  if (!selectedOrder.value) return

  const order = selectedOrder.value

  // Создаём скрытый iframe для печати
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  document.body.appendChild(iframe)

  const itemsHtml = (order.items || []).map((item) => `
    <tr>
      <td style="border:1px solid #333;padding:8px;">${item.nomenclatureName || '-'}</td>
      <td style="border:1px solid #333;padding:8px;text-align:center;">${item.Количество || 0}</td>
      <td style="border:1px solid #333;padding:8px;text-align:center;">${item.storageBin || '-'}</td>
    </tr>
  `).join('')

  const doc = iframe.contentDocument || iframe.contentWindow?.document
  if (!doc) {
    message.error('Ошибка при создании документа для печати')
    document.body.removeChild(iframe)
    return
  }

  doc.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Заказ на перемещение ${order.Number}</title>
      <style>
        @page { margin: 10mm; size: auto; }
        body { font-family: Arial, sans-serif; font-size: 11pt; color: #000; margin: 0; padding: 0; }
        h1 { font-size: 16pt; margin-bottom: 6px; margin-top: 0; }
        .meta { margin-bottom: 12px; font-size: 10pt; }
        .meta-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .meta-label { color: #555; }
        .meta-value { font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; table-layout: fixed; }
        th { background: #f0f0f0; font-weight: bold; text-align: left; font-size: 10pt; }
        th, td { border: 1px solid #333; padding: 6px; word-wrap: break-word; }
        td:nth-child(1) { width: 50%; }
        td:nth-child(2) { width: 15%; text-align: center; }
        td:nth-child(3) { width: 35%; }
        .footer { margin-top: 20px; display: flex; justify-content: space-between; }
        .sign { width: 45%; }
        .sign-line { border-bottom: 1px solid #000; margin-top: 25px; margin-bottom: 3px; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <h1>Заказ на перемещение № ${order.Number}</h1>
      <div class="meta">
        <div class="meta-row">
          <span><span class="meta-label">Дата:</span> <span class="meta-value">${formatDate(order.Date)}</span></span>
          <span><span class="meta-label">Состояние:</span> <span class="meta-value">${order.statusDescription || '—'}</span></span>
        </div>
        <div class="meta-row">
          <span><span class="meta-label">От склада:</span> <span class="meta-value">${order.sourceWarehouseName || '—'}</span></span>
          <span><span class="meta-label">На склад:</span> <span class="meta-value">${order.destinationWarehouseName || '—'}</span></span>
        </div>
        ${order.customerOrderNumber ? `
        <div class="meta-row">
          <span><span class="meta-label">Заказ покупателя:</span> <span class="meta-value">${order.customerOrderNumber}</span></span>
        </div>` : ''}
      </div>

      <table>
        <thead>
          <tr>
            <th>Товар</th>
            <th style="text-align:center;">Кол-во</th>
            <th style="text-align:center;">Место хранения</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml || '<tr><td colspan="3" style="text-align:center;">Нет товаров</td></tr>'}
        </tbody>
      </table>

      <div class="footer">
        <div class="sign">
          <div>Отправил:</div>
          <div class="sign-line"></div>
          <div style="font-size:9pt;color:#555;">подпись / ФИО</div>
        </div>
        <div class="sign">
          <div>Принял:</div>
          <div class="sign-line"></div>
          <div style="font-size:9pt;color:#555;">подпись / ФИО</div>
        </div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
            setTimeout(function() {
              const iframe = document.querySelector('iframe');
              if (iframe && iframe.parentElement) {
                iframe.parentElement.removeChild(iframe);
              }
            }, 100);
          }, 200);
        };
      <\/script>
    </body>
    </html>
  `)
  doc.close()
}

// Автосохранение результатов сканирования при изменении
let saveTimeout: NodeJS.Timeout | null = null
watch(
  () => selectedOrder.value?.items,
  async (items) => {
    if (!selectedOrder.value || !items) return

    // Для локальных заказов - сохраняем изменения в items
    if (isLocalOrder.value) {
      // Отменяем предыдущий таймер если есть
      if (saveTimeout) clearTimeout(saveTimeout)

      // Ставим новый с задержкой в 500ms чтобы не спамить запросы
      saveTimeout = setTimeout(async () => {
        try {
          const itemsPayload = items.map((item: any) => ({
            nomenclatureKey: item.Номенклатура_Key || item.nomenclatureKey,
            productName: item.nomenclatureName || item.productName,
            barcode: item.barcode || '',
            quantity: item.Количество || item.quantity || 0,
            unitKey: item.unitKey || '',
            storageBin: item.storageBin || '',
            price: Number(item.price || item.Цена || 0)
          }))
          await fetch(`/sklad/api/transfer-orders/${selectedOrder.value!.Ref_Key}/items`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
            },
            body: JSON.stringify({ items: itemsPayload })
          })
          selectedOrder.value!.saved = true
        } catch {
          // Тихо игнорируем ошибки автосохранения
        }
      }, 500)
      return
    }

    // Для 1С заказов - стандартная логика сканирования
    if (scanningMode.value === false) return

    // Сбрасываем флаг saved при любых изменениях в сканировании
    selectedOrder.value.saved = false

    // Отменяем предыдущий таймер если есть
    if (saveTimeout) clearTimeout(saveTimeout)

    // Ставим новый с задержкой в 500ms чтобы не спамить запросы
    saveTimeout = setTimeout(async () => {
      try {
        await saveTransferOrderScans(selectedOrder.value!.Ref_Key, items.map(item => ({
          barcode: item.barcode || '',
          scannedQty: item.scannedQty || 0
        })))
      } catch {
        // Тихо игнорируем ошибки автосохранения — данные всё равно хранятся в памяти
      }
    }, 500)
  },
  { deep: true }
)

onMounted(async () => {
  loading.value = true
  try {
    const data = await fetchTransferOrders()
    orders.value = data
  } catch (error) {
    console.error('Ошибка при загрузке заказов:', error)
  } finally {
    loading.value = false
  }

  inventoryStore.loadStocksFromApi().catch(() => {})

  // Добавляем обработчик клавиатуры для сканера
  window.addEventListener('keydown', handleKeyDown)
})

onActivated(async () => {
  loading.value = true
  try {
    const data = await fetchTransferOrders()
    orders.value = data
  } catch (error) {
    console.error('Ошибка при загрузке заказов:', error)
  } finally {
    loading.value = false
  }
})

// Очищаем обработчик при размонтировании компонента
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown)
  if (saveTimeout) clearTimeout(saveTimeout)
  if (scanTimeout) clearTimeout(scanTimeout)
})

const handleDeleteLocalOrder = async (order: TransferOrder) => {
  try {
    const res = await fetch(`/sklad/api/onec/transfer-orders/${order.Ref_Key}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
      }
    })
    const result = await res.json()
    if (result.success) {
      message.success('Черновик удалён')
      const data = await fetchTransferOrders()
      orders.value = data
      window.dispatchEvent(new CustomEvent('transferOrderOperation'))
    } else {
      message.error(result.error || 'Ошибка удаления')
    }
  } catch (err) {
    message.error(err instanceof Error ? err.message : 'Ошибка удаления')
  }
}
</script>

<style scoped>
.transfer-orders-page {
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 24px;
}
@media (max-width: 768px) {
  .transfer-orders-page {
    padding: 0 12px;
  }
}

.space-y-6 > * + * {
  margin-top: 1.5rem;
}

.space-y-4 > * + * {
  margin-top: 1rem;
}

.space-y-3 > * + * {
  margin-top: 0.75rem;
}

/* Стили для режима сканирования */
kbd {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: #f5f5f5;
  border: 1px solid #ccc;
  border-radius: 3px;
  font-family: monospace;
  font-size: 0.85em;
}

.barcode-input {
  font-family: monospace;
  font-size: 1.25rem;
}

.barcode-input :deep(input) {
  font-family: monospace;
  font-size: 1.25rem;
  text-align: center;
  letter-spacing: 2px;
}

/* Прогресс-бар */
.bg-gray-200 {
  background-color: #e5e7eb;
}

.bg-gray-100 {
  background-color: #f3f4f6;
}

.bg-green-500 {
  background-color: #10b981;
}

.border-blue-500 {
  border-color: #3b82f6;
}

.metric-card {
  height: 100%;
  background-color: #2a2a2a;
  border-bottom: 4px solid transparent;
  transition: all 0.3s ease;
  cursor: pointer;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  background-color: #333;
}

.metric-card.active {
  background-color: #333;
  border-bottom-color: #18a058;
}
</style>
