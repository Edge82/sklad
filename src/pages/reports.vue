<template>
  <div class="reports-page p-6">
    <!-- Шапка страницы -->
    <div class="flex justify-between items-center mb-6">
      <div class="flex items-center gap-4">
        <div>
          <n-h1 class="mb-0">{{ pageHeader }}</n-h1>
          <n-text depth="3">{{ pageSubHeader }}</n-text>
        </div>
      </div>
    </div>
    <!-- Основной контент (переключаемый) -->
    <div class="reports-content">
        <!-- Сводка (закреплена сверху) -->
        <div class="sticky-summary">
          <n-grid :cols="6" :x-gap="12" class="mb-4 py-2">
            <!-- Метрики -->
            <n-gi v-for="metric in summaryMetrics" :key="metric.id">
              <n-card
                size="small"
                hoverable
                :class="['metric-card', { 'active': activeTab === metric.id }]"
                @click="activeTab = metric.id"
              >
                <div class="flex items-center gap-3 py-1">
                  <n-icon size="28" :color="metric.color">
                    <component :is="metric.icon" />
                  </n-icon>
                  <div>
                    <n-text depth="3" class="text-[10px] uppercase font-bold tracking-wider">{{ metric.label }}</n-text>
                    <n-h3 class="m-0 leading-none">{{ metric.value }}</n-h3>
                  </div>
                </div>
              </n-card>
            </n-gi>
          </n-grid>
        </div>

       <!-- Контент в зависимости от вкладки -->
        <div v-if="activeTab === 'main'">
          <div class="mb-4 flex justify-between items-center">
            <n-h2 class="m-0">Финансовая отчётность</n-h2>
            <div class="flex gap-2">
              <n-button size="small" :loading="profitabilityLoading" @click="loadProfitabilityReport">
                Обновить отчёт
              </n-button>
              <n-button size="small" @click="printProfitabilityReport">
                Печать
              </n-button>
            </div>
          </div>
          <div class="mb-4 flex gap-3 flex-wrap">
            <n-input
              v-model:value="profitabilitySearchQuery"
              type="text"
              placeholder="Поиск по заказу или клиенту..."
              clearable
              style="width: 350px"
            />
            <n-date-picker
              v-model:value="profitabilityDateRange"
              type="daterange"
              placeholder="Период"
              clearable
              style="width: 280px"
            />
          </div>
          <div v-if="profitabilityLoading" class="flex items-center justify-center" style="min-height: 100px">
          <n-spin size="large" />
        </div>
        <div v-else>
            <n-card border-variant="dark" v-if="profitabilityLoaded">
              <div v-if="profitabilityReport.length === 0">
                <n-empty description="Нет данных по заказам" />
              </div>
              <div v-else>
                <n-data-table
                  ref="profitabilityTableRef"
                  :columns="profitabilityColumns"
                  :data="profitabilityReport"
                  :row-key="(row: any) => row.orderKey"
                  v-model:expanded-row-keys="profitabilityExpandedKeys"
                  :scroll-x="profitabilityScrollX"
                  :max-height="profitabilityTableMaxHeight"
                  :row-props="(row: any) => ({
                    style: 'cursor: pointer;',
                    onClick: (e: MouseEvent) => {
                      // клик по стрелке раскрытия обрабатывается самой таблицей,
                      // иначе сработают два переключателя подряд и строка не раскроется
                      if ((e.target as HTMLElement).closest('.n-data-table-expand-trigger')) return
                      const key = row.orderKey
                      const idx = profitabilityExpandedKeys.indexOf(key)
                      if (idx > -1) {
                        profitabilityExpandedKeys.splice(idx, 1)
                      } else {
                        profitabilityExpandedKeys.push(key)
                      }
                    }
                  })"
                />
                <!-- Итог по всем заказам -->
                <div class="mt-2">
                  <div class="flex justify-between items-center py-2 px-3 rounded" style="background: #252525">
                    <n-text strong>Итог по всем заказам ({{ profitabilityReport.length }})</n-text>
                    <div class="flex items-center gap-4 text-sm">
                      <span>Сумма: <b>{{ fmtNumber(grandTotal.sum) }}</b></span>
                      <span :style="{ color: grandTotal.net >= 0 ? '#18a058' : '#f0a020' }">Прибыль: <b>{{ fmtNumber(grandTotal.net) }}</b></span>
                    </div>
                  </div>
                  <table class="profitability-table text-sm mt-2">
                    <thead>
                      <tr>
                        <th style="white-space: normal">Итог</th>
                        <th class="text-right">Кол-во</th>
                        <th class="text-right">Сумма</th>
                        <th class="text-right">Материалы</th>
                        <th class="text-right">%</th>
                        <th class="text-right">З/П</th>
                        <th class="text-right">%</th>
                        <th class="text-right">Услуги</th>
                        <th class="text-right">%</th>
                        <th class="text-right">Расходы</th>
                        <th class="text-right" style="white-space: normal">Валовая<br>прибыль</th>
                        <th class="text-right">Накладные<br>расходы</th>
                        <th class="text-right">%</th>
                        <th class="text-right">Прибыль</th>
                        <th class="text-right">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr class="profitability-total">
                        <td>Всего</td>
                        <td class="text-right">{{ grandTotal.qty }}</td>
                        <td class="text-right">{{ fmtNumber(grandTotal.sum) }}</td>
                        <td class="text-right">{{ fmtNumber(grandTotal.materials) }}</td>
                        <td class="text-right">{{ grandTotal.sum ? (grandTotal.materials / grandTotal.sum * 100).toFixed(1) + '%' : '0%' }}</td>
                        <td class="text-right">{{ fmtNumber(grandTotal.fot) }}</td>
                        <td class="text-right">{{ grandTotal.sum ? (grandTotal.fot / grandTotal.sum * 100).toFixed(1) + '%' : '0%' }}</td>
                        <td class="text-right">{{ fmtNumber(grandTotal.delivery) }}</td>
                        <td class="text-right">{{ grandTotal.sum ? (grandTotal.delivery / grandTotal.sum * 100).toFixed(1) + '%' : '0%' }}</td>
                        <td class="text-right">{{ fmtNumber(grandTotal.expense) }}</td>
                        <td class="text-right" style="color: #2080f0">{{ fmtNumber(grandTotal.gross) }}</td>
                        <td class="text-right">{{ fmtNumber(grandTotal.overhead) }}</td>
                        <td class="text-right">{{ grandTotal.sum ? (grandTotal.overhead / grandTotal.sum * 100).toFixed(1) + '%' : '0%' }}</td>
                        <td class="text-right" :style="{ color: grandTotal.net >= 0 ? '#18a058' : '#f0a020' }">{{ fmtNumber(grandTotal.net) }}</td>
                        <td class="text-right">{{ grandTotal.sum ? (grandTotal.net / grandTotal.sum * 100).toFixed(1) + '%' : '0%' }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </n-card>
          </div>
        </div>

        <!-- Детальный отчет по заказам -->
        <div v-else-if="activeTab === 'orders'">
          <div class="mb-4 flex justify-between items-center">
            <n-h2 class="m-0">Резерв материалов по заказам</n-h2>
            <div class="flex gap-3 items-center">
              <n-button size="small" :loading="refreshingReserves" @click="refreshReserves">
                Обновить резервы из 1С
              </n-button>
              <n-input
                v-model:value="ordersSearchQuery"
                placeholder="Поиск по номеру заказа..."
                clearable
                style="width: 500px"
              />
              <n-select
                v-model:value="ordersStatusFilter"
                placeholder="Статус заказа"
                :options="ordersStatusOptions"
                clearable
                style="width: 250px"
              />
            </div>
          </div>

          <n-card border-variant="dark" class="table-card shadow-sm">
            <n-data-table
              :columns="ordersReportColumns"
              :data="filteredOrdersReport"
              :row-key="(row: OrderReportEntry) => row.orderNumber"
              v-model:expanded-row-keys="expandedOrderKeys"
              max-height="calc(100vh - 320px)"
              :pagination="ordersPagination"
              :row-props="(row: OrderReportEntry) => ({
                 style: 'cursor: pointer;',
                 onClick: () => handleOrderReportRowClick(row)
              })"
            />
          </n-card>
          <n-empty v-if="filteredOrdersReport.length === 0" description="За выбранный период данных не найдено" class="mt-20" />
        </div>

        <!-- Детальный отчет по инструменту -->
        <div v-else-if="activeTab === 'tools'">
          <div class="mb-4 flex justify-between items-center">
            <n-h2 class="m-0">Инструмент на руках</n-h2>
            <n-input
              v-model:value="searchToolsQuery"
              type="text"
              placeholder="Поиск по названию или сотруднику..."
              clearable
              class="w-65"
            />
          </div>

          <n-card border-variant="dark" class="table-card shadow-sm">
            <n-data-table
              :columns="toolsDetailedColumns"
              :data="filteredForgottenTools"
              max-height="calc(100vh - 320px)"
              :pagination="toolsPagination"
            />
          </n-card>
          <n-empty v-if="filteredForgottenTools.length === 0" description="Инструменты не найдены" class="mt-20" />
        </div>

        <!-- Расход материалов по заказам (производство) -->
        <div v-else-if="activeTab === 'production'">
          <div class="mb-4 flex justify-between items-center">
            <n-h2 class="m-0">Расход материалов по заказам</n-h2>
          </div>
          <div class="mb-4 flex gap-3 flex-wrap">
            <n-input
              v-model:value="productionSearchQuery"
              type="text"
              placeholder="Поиск по заказу или изделию..."
              clearable
              style="width: 350px"
            />
            <n-input
              v-model:value="productionCustomerQuery"
              type="text"
              placeholder="Поиск по клиенту..."
              clearable
              style="width: 250px"
            />
            <n-date-picker
              v-model:value="productionDateRange"
              type="daterange"
              placeholder="Период"
              clearable
              style="width: 280px"
            />
          </div>
          <n-card border-variant="dark">
    <n-data-table
      :columns="productionColumns"
      :data="filteredProductionReport"
      :row-key="(row: any) => row.orderNumber"
      v-model:expanded-row-keys="productionExpandedKeys"
      max-height="calc(100vh - 320px)"
      :pagination="productionPagination"
      :row-props="(row: any) => ({
                style: 'cursor: pointer;',
                onClick: () => {
                  const key = row.orderNumber
                  const idx = productionExpandedKeys.indexOf(key)
                  if (idx > -1) {
                    productionExpandedKeys.splice(idx, 1)
                  } else {
                    productionExpandedKeys.push(key)
                  }
                }
              })"
            />
          </n-card>
          <n-empty v-if="productionReport.length === 0" description="Нет данных" class="mt-20" />
        </div>

        <!-- Зарплата (ФОТ) -->
        <div v-else-if="activeTab === 'salary'">
          <div class="mb-4 flex justify-between items-center">
            <n-h2 class="m-0">Зарплата (ФОТ)</n-h2>
            <div class="flex gap-2">
              <n-button size="small" @click="printSalaryReport">Печать</n-button>
              <n-button size="small" type="primary" @click="openCreateModal()">Создать</n-button>
            </div>
          </div>
          <n-card border-variant="dark" class="table-card shadow-sm">
            <n-data-table
              :columns="salaryColumns"
              :data="salaryDocs"
              :row-key="(row: any) => row.id"
              max-height="calc(100vh - 320px)"
              :row-props="(row: any) => ({
                style: 'cursor: pointer;',
                onClick: () => openDocModal(row)
              })"
            />
          </n-card>
          <n-empty v-if="salaryDocs.length === 0" description="Документы зарплаты не созданы" class="mt-20" />
        </div>

        <!-- Накладные расходы -->
        <div v-else-if="activeTab === 'overhead'">
          <div class="mb-4 flex justify-between items-center">
            <n-h2 class="m-0">Накладные расходы</n-h2>
            <div class="flex gap-2">
              <n-button size="small" @click="printOverheadReport">Печать</n-button>
              <n-button size="small" type="primary" @click="openOverheadCreate()">Создать</n-button>
            </div>
          </div>
          <n-card border-variant="dark" class="table-card shadow-sm">
            <n-data-table
              :columns="overheadColumns"
              :data="overheadDocs"
              :row-key="(row: any) => row.id"
              max-height="calc(100vh - 320px)"
              :row-props="(row: any) => ({
                style: 'cursor: pointer;',
                onClick: () => openOverheadDoc(row)
              })"
            />
          </n-card>
          <n-empty v-if="overheadDocs.length === 0" description="Документы накладных расходов не созданы" class="mt-20" />
        </div>

    </div>
  </div>

  <!-- Скрытая область для печати отчёта по рентабельности -->
  <Teleport to="body">
    <div class="profit-print">
      <div class="pp-title-block">
        <h1>Финансовая отчётность</h1>
        <div class="pp-printed-at">Печатано: {{ printDateTime }}</div>
      </div>
      <div v-if="profitabilityReport.length === 0" class="pp-empty">Нет данных по заказам</div>
      <div v-for="order in profitabilityReport" :key="order.orderKey" class="pp-order">
        <div class="pp-order-header">
          <span class="pp-order-num">{{ order.orderNumber }}</span>
          <span class="pp-customer">{{ order.customer || '-' }}</span>
          <span>Сумма: <b>{{ fmtNumber(order.totalSum) }}</b></span>
          <span>Прибыль: <b>{{ fmtNumber(orderNetProfit(order)) }}</b></span>
        </div>
        <div v-if="profitabilityExpandedKeys.includes(order.orderKey)">
          <table class="pp-table" v-if="order.products.length > 0">
            <thead>
              <tr>
                <th>Изделие</th>
                <th>Кол-во</th>
                <th>Сумма</th>
                <th>Материалы</th>
                <th>%</th>
                <th>З/П</th>
                <th>%</th>
                <th>Услуги</th>
                <th>%</th>
                <th>Расходы</th>
                <th>Валовая прибыль</th>
                <th>Накладные расходы</th>
                <th>%</th>
                <th>Прибыль</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in order.products" :key="p.productName">
                <td class="pp-name">{{ p.productName }}</td>
                <td>{{ p.quantity }} {{ p.unit }}</td>
                <td>{{ fmtNumber(p.productSum) }}</td>
                <td>{{ fmtNumber(p.materialsCost) }}</td>
                <td>{{ fmtPct(p.materialsCost || 0, p.productSum) }}</td>
                <td>{{ fmtNumber(p._fotDoc || 0) }}</td>
                <td>{{ fmtPct(p._fotDoc || 0, p.productSum) }}</td>
                <td>—</td>
                <td>—</td>
                <td>{{ fmtNumber(productTotalExpense(p)) }}</td>
                <td>{{ fmtNumber(productGrossProfit(p)) }}</td>
                <td>{{ fmtNumber(productOverhead(p)) }}</td>
                <td>{{ fmtPct(productOverhead(p), p.productSum) }}</td>
                <td>{{ fmtNumber(productGrossProfit(p) - productOverhead(p)) }}</td>
                <td>{{ fmtPct(productGrossProfit(p) - productOverhead(p), p.productSum) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="pp-total">
                <td>Итого</td>
                <td>{{ order.products.reduce((s: number, p: any) => s + p.quantity, 0) }}</td>
                <td>{{ fmtNumber(order.totalSum) }}</td>
                <td>{{ fmtNumber(order.totalMaterials) }}</td>
                <td>{{ fmtPct(order.totalMaterials, order.totalSum) }}</td>
                <td>{{ fmtNumber(orderTotalFot(order)) }}</td>
                <td>{{ fmtPct(orderTotalFot(order), order.totalSum) }}</td>
                <td>{{ fmtNumber(orderTotalDelivery(order)) }}</td>
                <td>{{ fmtPct(orderTotalDelivery(order), order.totalSum) }}</td>
                <td>{{ fmtNumber(orderTotalExpense(order)) }}</td>
                <td>{{ fmtNumber(orderGrossProfit(order)) }}</td>
                <td>{{ fmtNumber(orderOverhead(order)) }}</td>
                <td>{{ fmtPct(orderOverhead(order), order.totalSum) }}</td>
                <td>{{ fmtNumber(orderGrossProfit(order) - orderOverhead(order)) }}</td>
                <td>{{ fmtPct(orderGrossProfit(order) - orderOverhead(order), order.totalSum) }}</td>
              </tr>
            </tfoot>
          </table>
          <div v-if="order.orderMaterials && order.orderMaterials.length > 0" class="pp-other">
            Прочие материалы: {{ fmtNumber(orderOtherMaterialsSum(order)) }}
          </div>
        </div>
      </div>
      <!-- Итог по всем заказам -->
      <div v-if="profitabilityReport.length > 0" class="pp-order">
        <div class="pp-order-header">
          <span class="pp-order-num">Итог по всем заказам ({{ profitabilityReport.length }})</span>
          <span>Сумма: <b>{{ fmtNumber(grandTotal.sum) }}</b></span>
          <span>Прибыль: <b>{{ fmtNumber(grandTotal.net) }}</b></span>
        </div>
        <table class="pp-table">
          <thead>
            <tr>
              <th>Итог</th>
              <th>Кол-во</th>
              <th>Сумма</th>
              <th>Материалы</th>
              <th>%</th>
              <th>З/П</th>
              <th>%</th>
              <th>Услуги</th>
              <th>%</th>
              <th>Расходы</th>
              <th>Валовая прибыль</th>
              <th>Накладные расходы</th>
              <th>%</th>
              <th>Прибыль</th>
              <th>%</th>
            </tr>
          </thead>
          <tbody>
            <tr class="pp-total">
              <td>Всего</td>
              <td>{{ grandTotal.qty }}</td>
              <td>{{ fmtNumber(grandTotal.sum) }}</td>
              <td>{{ fmtNumber(grandTotal.materials) }}</td>
              <td>{{ fmtPct(grandTotal.materials, grandTotal.sum) }}</td>
              <td>{{ fmtNumber(grandTotal.fot) }}</td>
              <td>{{ fmtPct(grandTotal.fot, grandTotal.sum) }}</td>
              <td>{{ fmtNumber(grandTotal.delivery) }}</td>
              <td>{{ fmtPct(grandTotal.delivery, grandTotal.sum) }}</td>
              <td>{{ fmtNumber(grandTotal.expense) }}</td>
              <td>{{ fmtNumber(grandTotal.gross) }}</td>
              <td>{{ fmtNumber(grandTotal.overhead) }}</td>
              <td>{{ fmtPct(grandTotal.overhead, grandTotal.sum) }}</td>
              <td>{{ fmtNumber(grandTotal.net) }}</td>
              <td>{{ fmtPct(grandTotal.net, grandTotal.sum) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </Teleport>

  <!-- Скрытая область для печати отчёта по зарплате (ФОТ) -->
  <Teleport to="body">
    <div class="salary-print">
      <div class="sp-title-block">
        <h1>Зарплата (ФОТ)</h1>
        <div class="sp-printed-at">Печатано: {{ salaryPrintDateTime }}</div>
      </div>
      <div v-if="salaryDocs.length === 0" class="sp-empty">Документы зарплаты не созданы</div>
      <div v-for="doc in salaryDocs" :key="doc.id" class="sp-doc">
        <div class="sp-doc-header">
          <span class="sp-doc-date">Документ от {{ formatDocDate(doc.docDate) }}</span>
          <span>Заказов: <b>{{ doc.count || 0 }}</b></span>
          <span>Итого: <b>{{ fmtNumber(doc.total || 0) }} ₽</b></span>
        </div>
        <table class="sp-table">
          <thead>
            <tr>
              <th>Заказ</th>
              <th>Клиент</th>
              <th>Изделие</th>
              <th>Сумма, ₽</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in doc.items" :key="item.id">
              <td class="sp-name">{{ item.orderNumber || item.orderRefKey || '—' }}</td>
              <td class="sp-name">{{ item.customer || '—' }}</td>
              <td class="sp-name">{{ item.productName || 'Весь заказ' }}</td>
              <td>{{ fmtNumber(item.amount || 0) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="salaryDocs.length > 0" class="sp-total">
        Всего по всем документам: {{ fmtNumber(salaryDocs.reduce((s, d: any) => s + (d.total || 0), 0)) }} ₽
      </div>
    </div>
  </Teleport>

  <!-- Скрытая область для печати отчёта по накладным расходам -->
  <Teleport to="body">
    <div class="overhead-print">
      <div class="op-title-block">
        <h1>Накладные расходы</h1>
        <div class="op-printed-at">Печатано: {{ overheadPrintDateTime }}</div>
      </div>
      <div v-if="overheadDocs.length === 0" class="op-empty">Документы накладных расходов не созданы</div>
      <div v-for="doc in overheadDocs" :key="doc.id" class="op-doc">
        <div class="op-doc-header">
          <span class="op-doc-date">Документ от {{ formatDocDate(doc.docDate) }}</span>
          <span>Строк: <b>{{ doc.count || 0 }}</b></span>
          <span>Итого: <b>{{ fmtNumber(doc.total || 0) }} ₽</b></span>
        </div>
        <table class="op-table">
          <thead>
            <tr>
              <th>Заказ</th>
              <th>Клиент</th>
              <th>Изделие</th>
              <th>Сумма, ₽</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in doc.items" :key="item.id">
              <td class="op-name">{{ item.orderNumber || item.orderRefKey || '—' }}</td>
              <td class="op-name">{{ item.customer || '—' }}</td>
              <td class="op-name">{{ item.productName || 'Весь заказ' }}</td>
              <td>{{ fmtNumber(item.amount || 0) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="overheadDocs.length > 0" class="op-total">
        Всего по всем документам: {{ fmtNumber(overheadDocs.reduce((s, d: any) => s + (d.total || 0), 0)) }} ₽
      </div>
    </div>
  </Teleport>

  <n-modal v-model:show="showSalaryModal" preset="card" :title="salaryModalIsCreate ? 'Создать документ зарплаты' : 'Редактировать документ'" style="width: 780px">
    <div class="flex flex-col gap-3">
      <div class="flex items-center gap-2">
        <n-text depth="3">Дата документа:</n-text>
        <n-date-picker
          v-model:value="salaryDocDate"
          type="date"
          placeholder="Выберите дату"
          style="width: 180px"
        />
      </div>
      <div class="flex justify-between items-center">
        <n-text depth="3">Заказ / изделие и сумма</n-text>
        <n-button size="small" @click="addSalaryRow">+ Добавить строку</n-button>
      </div>
      <div v-for="(row, idx) in salaryModalRows" :key="idx" class="flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <n-select
            v-model:value="row.orderRefKey"
            :options="salaryOrderOptions"
            filterable
            clearable
            placeholder="Выберите или найдите заказ..."
            class="flex-1"
            @update:value="onSalaryRowOrderChange(row)"
          />
          <n-input-number
            v-model:value="row.amount"
            :min="0"
            :precision="2"
            placeholder="Сумма, ₽"
            style="width: 160px"
          />
          <n-button size="small" quaternary type="error" @click="removeSalaryRow(idx)">Удалить</n-button>
        </div>
        <div v-if="row.orderRefKey" class="flex items-center gap-2 pl-2">
          <n-text depth="3" class="text-xs whitespace-nowrap">Изделие (опционально):</n-text>
          <n-select
            v-model:value="row.productName"
            :options="overheadProductOptionsFor(row.orderRefKey)"
            filterable
            clearable
            placeholder="Без изделия — сумма в итого заказа"
            class="flex-1"
          />
        </div>
      </div>
      <div v-if="salaryModalRows.length === 0" class="text-center py-4">
        <n-button size="small" @click="addSalaryRow">+ Добавить строку</n-button>
      </div>
    </div>
    <template #action>
      <n-space justify="end">
        <n-button @click="showSalaryModal = false">Отмена</n-button>
        <n-button type="primary" :loading="salarySaving" @click="saveSalaryDoc">Сохранить</n-button>
      </n-space>
    </template>
  </n-modal>

  <n-modal v-model:show="showOverheadModal" preset="card" :title="overheadModalIsCreate ? 'Создать документ накладных расходов' : 'Редактировать документ'" style="width: 780px">
    <div class="flex flex-col gap-3">
      <div class="flex items-center gap-2">
        <n-text depth="3">Дата документа:</n-text>
        <n-date-picker
          v-model:value="overheadDocDate"
          type="date"
          placeholder="Выберите дату"
          style="width: 180px"
        />
      </div>
      <div class="flex justify-between items-center">
        <n-text depth="3">Заказ / изделие и сумма</n-text>
        <n-button size="small" @click="addOverheadRow">+ Добавить строку</n-button>
      </div>
      <div v-for="(row, idx) in overheadModalRows" :key="idx" class="flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <n-select
            v-model:value="row.orderRefKey"
            :options="salaryOrderOptions"
            filterable
            clearable
            placeholder="Выберите или найдите заказ..."
            class="flex-1"
            @update:value="onOverheadRowOrderChange(row)"
          />
          <n-input-number
            v-model:value="row.amount"
            :min="0"
            :precision="2"
            placeholder="Сумма, ₽"
            style="width: 160px"
          />
          <n-button size="small" quaternary type="error" @click="removeOverheadRow(idx)">Удалить</n-button>
        </div>
        <div v-if="row.orderRefKey" class="flex items-center gap-2 pl-2">
          <n-text depth="3" class="text-xs whitespace-nowrap">Изделие (опционально):</n-text>
          <n-select
            v-model:value="row.productName"
            :options="overheadProductOptionsFor(row.orderRefKey)"
            filterable
            clearable
            placeholder="Без изделия — сумма в итого заказа"
            class="flex-1"
          />
        </div>
      </div>
      <div v-if="overheadModalRows.length === 0" class="text-center py-4">
        <n-button size="small" @click="addOverheadRow">+ Добавить строку</n-button>
      </div>
    </div>
    <template #action>
      <n-space justify="end">
        <n-button @click="showOverheadModal = false">Отмена</n-button>
        <n-button type="primary" :loading="overheadSaving" @click="saveOverheadDoc">Сохранить</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, h, onMounted, onActivated, onUnmounted, watch, markRaw } from 'vue'
import { useRouter } from 'vue-router'
import * as XLSX from 'xlsx'
import { storeToRefs } from 'pinia'
import { useInventoryStore } from '@/stores/inventory'
import { useToolsStore } from '@/stores/tools'
import { useReportsStore } from '@/stores/reports'
import { useOrdersStore } from '@/stores/orders'
import {
  type MaterialInvoiceItem
} from '@/types'
import {
  StatsChartOutline, CubeOutline
} from '@vicons/ionicons5'
import {
  NSelect, NIcon, NH1, NText, NGrid, NGi, NCard, NH3,
  NDatePicker, NDataTable, NList, NListItem,
  NThing, NAvatar, NTag, NH2, NTable, NEmpty,
  NInput, NInputNumber, NButton, NModal, NForm, NFormItem, type DataTableColumns
} from 'naive-ui'

const router = useRouter()
const inventoryStore = useInventoryStore()
const toolsStore = useToolsStore()
const reportsStore = useReportsStore()
const ordersStore = useOrdersStore()
const { ordersReport, topEmployees } = storeToRefs(reportsStore)

const activeTab = ref('main')
const productionReport = ref<any[]>([])
const profitabilityReport = ref<any[]>([])
const profitabilityLoading = ref(false)
const profitabilityExpandedKeys = ref<string[]>([])
const profitabilityTableRef = ref<any>(null)
const profitabilityTableMaxHeight = ref(500)

// Высота таблицы подбирается по факту: от её верхнего края до нижней границы
// скролл-контейнера страницы, минус блок «Итог по всем заказам» под таблицей,
// чтобы и таблица, и итог помещались в видимую область без прокрутки страницы.
// Иначе нижняя полоса горизонтального скролла уходит за пределы видимой области
// (статический calc(100vh - N) хрупкий: над таблицей — padding, заголовок,
// метрики, фильтры, отступы карточки)
const recalcProfitabilityTableHeight = () => {
  const el = profitabilityTableRef.value?.$el as HTMLElement | undefined
  if (!el) return
  // max-height применяется к телу таблицы (без шапки), поэтому отсчёт —
  // от верхнего края тела, иначе шапка съест ~70px и итог уйдёт за экран
  const bodyEl = el.querySelector('.n-data-table-base-table-body') as HTMLElement | null
  const top = bodyEl
    ? bodyEl.getBoundingClientRect().top
    : el.getBoundingClientRect().top
  const grandTotalEl = el.parentElement?.querySelector(':scope > .mt-2') as HTMLElement | null
  const grandTotalHeight = grandTotalEl ? grandTotalEl.getBoundingClientRect().height : 0
  let scrollEl: HTMLElement | null = el.parentElement
  while (scrollEl) {
    const ov = getComputedStyle(scrollEl).overflowY
    if (ov === 'auto' || ov === 'scroll') break
    scrollEl = scrollEl.parentElement
  }
  const bottom = scrollEl ? scrollEl.getBoundingClientRect().bottom : window.innerHeight
  const available = bottom - top - grandTotalHeight - 16
  if (available > 160) {
    profitabilityTableMaxHeight.value = Math.floor(available)
  }
}

const scheduleRecalcProfitabilityTableHeight = () => {
  requestAnimationFrame(recalcProfitabilityTableHeight)
}
const profitabilitySearchQuery = ref('')
const profitabilityDateRange = ref<number | null>(null)
const profitabilityLoaded = ref(false)
const salaryDocs = ref<any[]>([])
const showSalaryModal = ref(false)
const salaryModalIsCreate = ref(true)
const salaryModalRows = ref<{ orderRefKey: string | null, productName: string | null, amount: number | null }[]>([])
const salaryDocDate = ref<number | null>(null)
const salaryPrintDateTime = ref('')
const editingDoc = ref<any>(null)
const salarySaving = ref(false)
const overheadDocs = ref<any[]>([])
const showOverheadModal = ref(false)
const overheadModalIsCreate = ref(true)
const overheadModalRows = ref<{ orderRefKey: string | null, productName: string | null, amount: number | null }[]>([])
const overheadDocDate = ref<number | null>(null)
const overheadPrintDateTime = ref('')
const editingOverheadDoc = ref<any>(null)
const overheadSaving = ref(false)
const productionSearchQuery = ref('')
const productionCustomerQuery = ref('')
const productionDateRange = ref<number | null>(null)
const productionExpandedKeys = ref<string[]>([])
const productExpandedKeys = ref<Record<string, string[]>>({})
const expandedOrderKeys = ref<string[]>([])
const searchToolsQuery = ref('')
const ordersSearchQuery = ref('')
const ordersStatusFilter = ref<string | null>(null)
const refreshingReserves = ref(false)
const ordersCurrentPage = ref(1)
const ordersItemsPerPage = ref(10)
const ordersPagination = computed(() => ({
  pageSize: ordersItemsPerPage.value,
  page: ordersCurrentPage.value,
  pageCount: Math.ceil(filteredOrdersReport.value.length / ordersItemsPerPage.value),
  showSizePicker: true,
  pageSizes: [10, 15, 25, 50, 100],
  onChange: (page: number) => {
    ordersCurrentPage.value = page
  },
  onUpdatePageSize: (pageSize: number) => {
    ordersItemsPerPage.value = pageSize
    ordersCurrentPage.value = 1
  }
}))
const productionPagination = computed(() => ({
  pageSize: productionPageSize.value,
  page: productionPage.value,
  pageCount: Math.ceil(productionReport.value.length / productionPageSize.value),
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  onChange: (page: number) => {
    productionPage.value = page
  },
  onUpdatePageSize: (pageSize: number) => {
    productionPageSize.value = pageSize
    productionPage.value = 1
  }
}))
const productionPage = ref(1)
const productionPageSize = ref(20)

const toolsCurrentPage = ref(1)
const toolsItemsPerPage = ref(10)
const toolsPagination = computed(() => ({
  pageSize: toolsItemsPerPage.value,
  page: toolsCurrentPage.value,
  pageCount: Math.ceil(filteredForgottenTools.value.length / toolsItemsPerPage.value),
  showSizePicker: true,
  pageSizes: [10, 20, 50, 100],
  onChange: (page: number) => {
    toolsCurrentPage.value = page
  },
  onUpdatePageSize: (pageSize: number) => {
    toolsItemsPerPage.value = pageSize
    toolsCurrentPage.value = 1
  }
}))

const ordersStatusOptions = computed(() => [
  { label: 'В работе', value: 'in_progress' },
  { label: 'На складе', value: 'ready' },
  { label: 'Завершён', value: 'completed' }
])

const pageHeader = ref('Отчёты')
const pageSubHeader = ref('Аналитика и отчёты по складу')

interface MetricCard {
  id: string
  label: string
  value: string
  color: string
  icon: any
}
const summaryMetrics = ref<MetricCard[]>([
  { id: 'main', label: 'Главная', value: 'Обзор', color: '#2080f0', icon: markRaw(StatsChartOutline) },
  { id: 'orders', label: 'Резерв по заказам', value: '0', color: '#18a058', icon: markRaw(CubeOutline) },
  { id: 'production', label: 'Производство', value: '0', color: '#f0a020', icon: markRaw(CubeOutline) },
  { id: 'tools', label: 'Инструменты', value: '0', color: '#8a8a8a', icon: markRaw(CubeOutline) },
  { id: 'salary', label: 'Зар. плата', value: '0', color: '#d64040', icon: markRaw(CubeOutline) },
  { id: 'overhead', label: 'Накл. расходы', value: '0', color: '#7c3aed', icon: markRaw(CubeOutline) }
])

const filteredForgottenTools = computed(() => {
  const issued = toolsStore.issuedTools
  if (!searchToolsQuery.value) return issued
  const q = searchToolsQuery.value.toLowerCase()
  return issued.filter(t =>
    t.name.toLowerCase().includes(q) ||
    (t.issuedToName || '').toLowerCase().includes(q)
  )
})

const handleOrderReportRowClick = (row: OrderReportEntry) => {
  const idx = expandedOrderKeys.value.indexOf(row.orderNumber)
  if (idx > -1) {
    expandedOrderKeys.value.splice(idx, 1)
  } else {
    expandedOrderKeys.value.push(row.orderNumber)
  }
}

const allowedStatuses = ['in_progress', 'ready', 'completed']

const fmtCurrency = (value: number | null | undefined) => {
  if (value == null) return '—'
  return Math.round(value * 10) / 10
}

const saveProductionOrderToFile = (row: any) => {
  const ws: any[][] = []
  ws.push(['Заказ:', row.orderNumber])
  ws.push(['Клиент:', row.customer || ''])
  ws.push([])

  if (row.products?.length) {
    for (const p of row.products) {
      ws.push(['Изделие:', p.name])
      ws.push(['Материал', 'Кол-во', 'Цена, ₽', 'Сумма, ₽', 'Заказ на перемещение'])
      let total = 0
      for (const m of p.materials) {
        const price = fmtCurrency(m.price || 0)
        const sum = fmtCurrency((m.price || 0) * m.quantity)
        ws.push([m.name, m.quantity, price, sum, (m.transferOrderNumbers || []).join(', ')])
        total += (m.price || 0) * m.quantity
      }
      ws.push(['', '', 'Итого:', fmtCurrency(total)])
      ws.push([])
    }
  }

  if (row.orderMaterials?.length) {
    ws.push(['Прочие материалы'])
    ws.push(['Материал', 'Кол-во', 'Цена, ₽', 'Сумма, ₽', 'Заказ на перемещение'])
    let total = 0
    for (const m of row.orderMaterials) {
      const price = fmtCurrency(m.price || 0)
      const sum = fmtCurrency((m.price || 0) * m.quantity)
      ws.push([m.name, m.quantity, price, sum, (m.transferOrderNumbers || []).join(', ')])
      total += (m.price || 0) * m.quantity
    }
    ws.push(['', '', 'Итого:', fmtCurrency(total)])
    ws.push([])
  }

  ws.push(['', '', 'Общая сумма:', fmtCurrency(row.orderTotal || 0)])

  const wb = XLSX.utils.book_new()
  const wsData = XLSX.utils.aoa_to_sheet(ws)
  wsData['!cols'] = [{ wch: 50 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(wb, wsData, 'Производство')
  XLSX.writeFile(wb, `Производство_${row.orderNumber}.xlsx`)
}

const filteredOrdersReport = computed(() => {
  return ordersReport.value.filter(r => {
    const order = ordersStore.orders.find((o: any) => o.orderNumber === r.orderNumber)
    if (!order) return false
    if (!allowedStatuses.includes(order.status)) return false
    if (ordersStatusFilter.value) return order.status === ordersStatusFilter.value
    if (ordersSearchQuery.value) {
      const q = ordersSearchQuery.value.toLowerCase()
      if (!r.orderNumber.toLowerCase().includes(q)) return false
    }
    return true
  })
})

watch([ordersSearchQuery, ordersStatusFilter], () => {
  ordersCurrentPage.value = 1
})

const refreshReserves = async () => {
  refreshingReserves.value = true
  try {
    const res = await fetch('/sklad/api/reports/refresh-reserves', { method: 'POST' })
    if (res.ok) {
      await reportsStore.loadOrdersReport()
    }
  } catch { /* ignore */ } finally {
    refreshingReserves.value = false
  }
}

watch(searchToolsQuery, () => {
  toolsCurrentPage.value = 1
})

watch(productionSearchQuery, () => {
  productionPage.value = 1
  loadProductionReport()
})

watch(productionCustomerQuery, () => {
  productionPage.value = 1
})

watch(productionDateRange, () => {
  productionPage.value = 1
})

const loadProductionReport = async () => {
  try {
    const params = new URLSearchParams()
    if (productionSearchQuery.value) {
      params.set('search', productionSearchQuery.value)
    }
    if (productionDateRange.value && Array.isArray(productionDateRange.value)) {
      const [start, end] = productionDateRange.value
      params.set('dateFrom', tsToLocalDate(start))
      params.set('dateTo', tsToLocalDate(end))
    }
    const qs = params.toString()
    const res = await fetch(`/sklad/api/reports/production-materials${qs ? '?' + qs : ''}`)
    if (res.ok) {
      const data = await res.json()
      productionReport.value = data.data || []
    }
  } catch { /* ignore */ }
}

const loadProfitabilityReport = async () => {
  profitabilityLoading.value = true
  try {
    const params = new URLSearchParams()
    if (profitabilitySearchQuery.value) {
      params.set('search', profitabilitySearchQuery.value)
    }
    if (profitabilityDateRange.value && Array.isArray(profitabilityDateRange.value)) {
      const [start, end] = profitabilityDateRange.value
      params.set('dateFrom', tsToLocalDate(start))
      params.set('dateTo', tsToLocalDate(end))
    }
    const qs = params.toString()
    const res = await fetch(`/sklad/api/reports/profitability${qs ? '?' + qs : ''}`)
    if (res.ok) {
      const data = await res.json()
      // Pre-compute all values to avoid expensive template expressions
        const mappedOrders = (data.data || []).map((order: any) => {
           const orderFot = orderTotalFot(order)
          const orderDelivery = order.services || 0
          const orderExpense = order.totalMaterials + orderFot + orderDelivery
          const orderGross = order.totalSum - orderExpense
          const oOverhead = order.products.reduce((s: number, p: any) => s + productOverhead(p), 0) + (order.overheadOrder || 0)
          const orderNet = orderGross - oOverhead

          return {
            ...order,
            products: order.products.map((p: any) => {
              const pExpense = (p.materialsCost || 0)
              const pGross = p.productSum - pExpense
             const pOverhead = productOverhead(p)
             const pNet = pGross - pOverhead
             return {
               ...p,
               _expense: pExpense,
               _gross: pGross,
               _net: pNet
             }
           }),
            _fot: orderFot,
            _delivery: orderDelivery,
            _expense: orderExpense,
            _gross: orderGross,
            _overhead: oOverhead,
            _net: orderNet
          }
        })
       // Сортировка по возрастанию номера заказа (числовые — по числу, остальные — алфавитом)
       mappedOrders.sort((a: any, b: any) => {
          const na = String(a.orderNumber || '').trim()
          const nb = String(b.orderNumber || '').trim()
          const pa = Number(na)
          const pb = Number(nb)
          const aNum = na !== '' && !isNaN(pa)
          const bNum = nb !== '' && !isNaN(pb)
          if (aNum && bNum) return pa - pb
          if (aNum) return -1
          if (bNum) return 1
          return na.localeCompare(nb, 'ru')
       })
       profitabilityReport.value = mappedOrders
     }
     profitabilityLoaded.value = true
  } catch { /* ignore */ } finally {
    profitabilityLoading.value = false
  }
}

const fmtNumber = (val: number) => {
  if (val == null || isNaN(val)) return '0.00'
  return val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

// Таймстемп датапикера в локальную дату YYYY-MM-DD (без сдвига часового пояса,
// который даёт toISOString(): в MSK полуночь локального дня в UTC — это предыдущий день)
const tsToLocalDate = (ts: number) => {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const fmtPct = (part: number, total: number) => {
  if (!total) return '0.0%'
  return (part / total * 100).toFixed(1) + '%'
}

// Услуги перенесены на уровень заказа (из 1С, order.services), в изделие не закладываются
const productTotalExpense = (p: any) => (p.materialsCost || 0)
const productGrossProfit = (p: any) => p.productSum - productTotalExpense(p)
// Накладные по изделию = ручное значение (inline, из order_financials) + сумма из документов
const productOverhead = (p: any) => (p._overhead || 0) + (p._overheadDoc || 0)
const productNetProfit = (p: any) => productGrossProfit(p) - productOverhead(p)

// ФОТ по заказу = сумма «на весь заказ» из документов + сумма по изделиям из документов
const orderTotalFot = (o: any) => (o.salary || 0) + o.products.reduce((s: number, p: any) => s + (p._fotDoc || 0), 0)
const orderTotalDelivery = (o: any) => o.services || 0
const orderTotalExpense = (o: any) => o.totalMaterials + orderTotalFot(o) + orderTotalDelivery(o)
const orderGrossProfit = (o: any) => o.totalSum - orderTotalExpense(o)
// Накладные по заказу = сумма по изделиям + отдельная сумма «на весь заказ» из документов
const orderOverhead = (o: any) => o.products.reduce((s: number, p: any) => s + productOverhead(p), 0) + (o.overheadOrder || 0)
const orderNetProfit = (o: any) => orderGrossProfit(o) - orderOverhead(o)

// Суммарный итог по всем заказам отчёта
const grandTotal = computed(() => {
  const acc = { qty: 0, sum: 0, materials: 0, fot: 0, delivery: 0, expense: 0, gross: 0, overhead: 0, net: 0 }
  for (const o of profitabilityReport.value) {
    acc.qty += o.products.reduce((s: number, p: any) => s + (p.quantity || 0), 0)
    acc.sum += o.totalSum || 0
    acc.materials += o.totalMaterials || 0
    acc.fot += orderTotalFot(o)
    acc.delivery += orderTotalDelivery(o)
    acc.expense += orderTotalExpense(o)
    acc.gross += orderGrossProfit(o)
    acc.overhead += orderOverhead(o)
    acc.net += orderNetProfit(o)
  }
  return acc
})

const printDateTime = new Date().toLocaleString('ru-RU')

const printProfitabilityReport = () => {
  document.body.classList.add('print-profit-report')
  const cleanup = () => {
    document.body.classList.remove('print-profit-report')
    window.removeEventListener('afterprint', cleanup)
  }
  window.addEventListener('afterprint', cleanup)
  window.print()
}

const printSalaryReport = () => {
  salaryPrintDateTime.value = new Date().toLocaleString('ru-RU')
  document.body.classList.add('print-salary-report')
  const cleanup = () => {
    document.body.classList.remove('print-salary-report')
    window.removeEventListener('afterprint', cleanup)
  }
  window.addEventListener('afterprint', cleanup)
  window.print()
}

const printOverheadReport = () => {
  overheadPrintDateTime.value = new Date().toLocaleString('ru-RU')
  document.body.classList.add('print-overhead-report')
  const cleanup = () => {
    document.body.classList.remove('print-overhead-report')
    window.removeEventListener('afterprint', cleanup)
  }
  window.addEventListener('afterprint', cleanup)
  window.print()
}

const orderOtherMaterialsSum = (order: any) => {
  return (order.orderMaterials || []).reduce((s: number, m: any) => s + (m.sum || 0), 0)
}

// Таблица финансового отчёта: строка — заказ, при раскрытии — детали по изделиям.
// ВАЖНО: ширина первой колонки (50) обязательна — шапка и тело таблицы — отдельные
// <table> с table-layout: fixed, без явной ширины данные съезжают относительно шапки.
// Колонки раскрытой таблицы выровнены по сетке основной:
// [стрелка 50] + [Изделие 300 + Кол-во 60] занимают место [Заказ 180 + Клиент 180],
// далее — те же ширины, что в основной таблице (110/110/64/100/64/100/64/110/120/120/64/110/64).
const profitabilityExpandedWidths = [50, 300, 60, 110, 110, 64, 100, 64, 100, 64, 110, 120, 120, 64, 110, 64]
// Суммарная ширина таблицы: обязательна для scroll-x, иначе при max-height
// горизонтальный скролл отключается и таблица выходит за пределы контейнера
const profitabilityScrollX = profitabilityExpandedWidths.reduce((a: number, b: number) => a + b, 0)

const profitabilityColumns: DataTableColumns<any> = [
  {
    type: 'expand',
    width: 50,
    expandable: () => true,
    renderExpand: (order: any) => {
      // Сетка раскрытой таблицы совпадает с основной: первая колонка — под стрелкой,
      // «Изделие» + «Кол-во» занимают место «Заказа» + «Клиента», далее — те же ширины.
      const expandedTotalWidth = profitabilityExpandedWidths.reduce((a: number, b: number) => a + b, 0)
      const productRows = order.products.map((p: any) => h('tr', { key: p.productName }, [
        h('td'),
        h('td', { style: 'text-align: left; word-break: break-word' }, p.productName),
        h('td', { class: 'text-right' }, `${p.quantity} ${p.unit}`),
        h('td', { class: 'text-right' }, fmtNumber(p.productSum)),
        h('td', { class: 'text-right' }, fmtNumber(p.materialsCost)),
        h('td', { class: 'text-right' }, p.productSum ? (p.materialsCost / p.productSum * 100).toFixed(1) + '%' : '0%'),
        h('td', { class: 'text-right' }, fmtNumber(p._fotDoc || 0)),
        h('td', { class: 'text-right' }, p.productSum ? ((p._fotDoc || 0) / p.productSum * 100).toFixed(1) + '%' : '0%'),
        h('td', { class: 'text-right' }, '—'),
        h('td', { class: 'text-right' }, '—'),
        h('td', { class: 'text-right' }, fmtNumber(productTotalExpense(p))),
        h('td', { class: 'text-right', style: 'color: #2080f0' }, fmtNumber(productGrossProfit(p))),
        h('td', { class: 'text-right' }, fmtNumber(productOverhead(p))),
        h('td', { class: 'text-right' }, p.productSum ? (productOverhead(p) / p.productSum * 100).toFixed(1) + '%' : '0%'),
        h('td', { class: 'text-right', style: (productGrossProfit(p) - productOverhead(p)) >= 0 ? 'color: #18a058' : 'color: #f0a020' }, fmtNumber(productGrossProfit(p) - productOverhead(p))),
        h('td', { class: 'text-right' }, p.productSum ? ((productGrossProfit(p) - productOverhead(p)) / p.productSum * 100).toFixed(1) + '%' : '0%')
      ]))
      const totalRow = h('tr', { class: 'profitability-total' }, [
        h('td'),
        h('td', { style: 'text-align: left' }, 'Итого'),
        h('td', { class: 'text-right' }, String(order.products.reduce((s: number, p: any) => s + (p.quantity || 0), 0))),
        h('td', { class: 'text-right' }, fmtNumber(order.totalSum)),
        h('td', { class: 'text-right' }, fmtNumber(order.totalMaterials)),
        h('td', { class: 'text-right' }, order.totalSum ? (order.totalMaterials / order.totalSum * 100).toFixed(1) + '%' : '0%'),
        h('td', { class: 'text-right' }, fmtNumber(orderTotalFot(order))),
        h('td', { class: 'text-right' }, order.totalSum ? (orderTotalFot(order) / order.totalSum * 100).toFixed(1) + '%' : '0%'),
        h('td', { class: 'text-right' }, fmtNumber(orderTotalDelivery(order))),
        h('td', { class: 'text-right' }, order.totalSum ? (orderTotalDelivery(order) / order.totalSum * 100).toFixed(1) + '%' : '0%'),
        h('td', { class: 'text-right' }, fmtNumber(orderTotalExpense(order))),
        h('td', { class: 'text-right', style: 'color: #2080f0' }, fmtNumber(orderGrossProfit(order))),
        h('td', { class: 'text-right' }, fmtNumber(orderOverhead(order))),
        h('td', { class: 'text-right' }, order.totalSum ? (orderOverhead(order) / order.totalSum * 100).toFixed(1) + '%' : '0%'),
        h('td', { class: 'text-right', style: (orderGrossProfit(order) - orderOverhead(order)) >= 0 ? 'color: #18a058' : 'color: #f0a020' }, fmtNumber(orderGrossProfit(order) - orderOverhead(order))),
        h('td', { class: 'text-right' }, order.totalSum ? ((orderGrossProfit(order) - orderOverhead(order)) / order.totalSum * 100).toFixed(1) + '%' : '0%')
      ])
      const children: any[] = [
        h('div', { style: 'font-size: 11px; font-weight: 700; color: #2080f0; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; padding-left: 58px' }, 'Позиции заказа'),
        // Без thead: шапка основной таблицы закреплена сверху и совпадает по колонкам,
        // повторять её в раскрытом заказе не нужно
        h('table', {
          class: 'profitability-table text-sm',
          style: `width: ${expandedTotalWidth}px; table-layout: fixed; border-collapse: collapse`
        }, [
          h('colgroup', profitabilityExpandedWidths.map((w: number) => h('col', { width: String(w) }))),
          h('tbody', productRows),
          h('tfoot', [totalRow])
        ])
      ]
      if (order.orderMaterials && order.orderMaterials.length > 0) {
        children.push(h('div', { style: 'padding-left: 58px; margin-top: 8px' }, [
          h(NTag, { size: 'small', type: 'warning' }, { default: () => `Прочие материалы: ${fmtNumber(orderOtherMaterialsSum(order))}` })
        ]))
      }
      // Отрицательные отступы компенсируют padding ячейки раскрытия, чтобы таблица
      // начиналась ровно с левого края основной таблицы
      return h('div', { style: 'margin: 0 calc(-1 * var(--n-td-padding, 12px)) 12px calc(-1 * var(--n-td-padding, 12px)); padding: 8px 0; background: rgba(255,255,255,0.03)' }, children)
    }
  },
  {
    title: 'Заказ',
    key: 'orderNumber',
    width: 180,
    render: (row: any) => h('div', { style: 'display:flex; align-items:center; gap:8px' }, [
      h('div', { style: 'width:3px; height:20px; background:#2080f0; border-radius:2px; flex-shrink:0' }),
      h(NText, { strong: true }, { default: () => row.orderNumber })
    ])
  },
  {
    title: 'Клиент',
    key: 'customer',
    width: 180,
    ellipsis: true,
    render: (row: any) => h(NText, { depth: 3 }, { default: () => row.customer || '—' })
  },
  { title: 'Сумма', key: 'totalSum', width: 110, align: 'right', render: (row: any) => fmtNumber(row.totalSum || 0) },
  { title: 'Материалы', key: 'totalMaterials', width: 110, align: 'right', render: (row: any) => fmtNumber(row.totalMaterials || 0) },
  { title: '%', key: 'materialsPct', width: 64, align: 'right', render: (row: any) => row.totalSum ? (row.totalMaterials / row.totalSum * 100).toFixed(1) + '%' : '0%' },
  { title: 'З/П', key: 'fot', width: 100, align: 'right', render: (row: any) => fmtNumber(orderTotalFot(row)) },
  { title: '%', key: 'fotPct', width: 64, align: 'right', render: (row: any) => row.totalSum ? (orderTotalFot(row) / row.totalSum * 100).toFixed(1) + '%' : '0%' },
  { title: 'Услуги', key: 'delivery', width: 100, align: 'right', render: (row: any) => fmtNumber(orderTotalDelivery(row)) },
  { title: '%', key: 'deliveryPct', width: 64, align: 'right', render: (row: any) => row.totalSum ? (orderTotalDelivery(row) / row.totalSum * 100).toFixed(1) + '%' : '0%' },
  { title: 'Расходы', key: 'expense', width: 110, align: 'right', render: (row: any) => fmtNumber(orderTotalExpense(row)) },
  { title: 'Валовая прибыль', key: 'gross', width: 120, align: 'right', render: (row: any) => h('span', { style: 'color: #2080f0; font-weight: 700' }, fmtNumber(orderGrossProfit(row))) },
  { title: 'Накладные расходы', key: 'overhead', width: 120, align: 'right', render: (row: any) => fmtNumber(orderOverhead(row)) },
  { title: '%', key: 'overheadPct', width: 64, align: 'right', render: (row: any) => row.totalSum ? (orderOverhead(row) / row.totalSum * 100).toFixed(1) + '%' : '0%' },
  {
    title: 'Прибыль',
    key: 'net',
    width: 110,
    align: 'right',
    render: (row: any) => {
      const net = orderNetProfit(row)
      return h('span', { style: `color: ${net >= 0 ? '#18a058' : '#f0a020'}; font-weight: 700` }, fmtNumber(net))
    }
  },
  { title: '%', key: 'netPct', width: 64, align: 'right', render: (row: any) => row.totalSum ? (orderNetProfit(row) / row.totalSum * 100).toFixed(1) + '%' : '0%' }
]

const salaryOrderOptions = computed(() => {
  const allowed = ['in_progress', 'ready', 'completed']
  return ordersStore.orders
    .filter((o: any) => allowed.includes(o.status))
    .map((o: any) => ({
      label: `${o.orderNumber} — ${o.customerName || ''}`.trim(),
      value: o.id
    }))
})

const formatDocDate = (dateStr: string) => {
  if (!dateStr) return '—'
  const parts = String(dateStr).slice(0, 10).split('-')
  if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`
  return dateStr
}

const loadSalaries = async () => {
  try {
    const res = await fetch('/sklad/api/reports/salaries')
    if (res.ok) {
      const data = await res.json()
      salaryDocs.value = data.data || []
      if (summaryMetrics.value[4]) summaryMetrics.value[4].value = `${salaryDocs.value.length} док.`
    }
  } catch { /* ignore */ }
}

const bumpOrderSalary = (orderRefKey: string, delta: number, productName: string | null) => {
  const order = profitabilityReport.value.find((o: any) => o.orderKey === orderRefKey || o.orderNumber === orderRefKey)
  if (!order) return
  if (productName) {
    const p = order.products.find((pp: any) => pp.productName === productName)
    if (p) p._fotDoc = (p._fotDoc || 0) + delta
  } else {
    order.salary = (order.salary || 0) + delta
  }
  recalcProfitability(order)
}

const buildDeduped = (rows: { orderRefKey: string | null, productName: string | null, amount: number | null }[]) => {
  const deduped: { orderRefKey: string, productName: string | null, amount: number }[] = []
  for (const r of rows) {
    if (!r.orderRefKey) continue
    const amount = Number(r.amount) || 0
    const existing = deduped.find(d => d.orderRefKey === r.orderRefKey && d.productName === (r.productName || null))
    if (existing) existing.amount = amount
    else deduped.push({ orderRefKey: r.orderRefKey, productName: r.productName || null, amount })
  }
  return deduped
}

const buildDeltas = (oldItems: any[], newItems: { orderRefKey: string, productName: string | null, amount: number }[]) => {
  const deltas: { orderRefKey: string, productName: string | null, delta: number }[] = []
  const oldMap = new Map<string, number>(oldItems.map((i: any) => [overheadItemKey(i.orderRefKey, i.productName || null), i.amount || 0]))
  const newMap = new Map<string, number>(newItems.map((i: any) => [overheadItemKey(i.orderRefKey, i.productName || null), i.amount || 0]))
  for (const [k, amt] of newMap) {
    const prev = oldMap.get(k)
    const idx = k.indexOf('\u0001')
    const orderRefKey = k.slice(0, idx)
    const productName = (idx < 0 ? '' : k.slice(idx + 1)) || null
    if (prev === undefined) deltas.push({ orderRefKey, productName, delta: amt })
    else if (amt - prev !== 0) deltas.push({ orderRefKey, productName, delta: amt - prev })
    oldMap.delete(k)
  }
  for (const [k, amt] of oldMap) {
    const idx = k.indexOf('\u0001')
    deltas.push({ orderRefKey: k.slice(0, idx), productName: (idx < 0 ? '' : k.slice(idx + 1)) || null, delta: -amt })
  }
  return deltas
}

const applySalaryDeltas = (deltas: { orderRefKey: string, productName: string | null, delta: number }[]) => {
  for (const d of deltas) {
    if (d.delta) bumpOrderSalary(d.orderRefKey, d.delta, d.productName)
  }
}

const openCreateModal = () => {
  salaryModalIsCreate.value = true
  editingDoc.value = null
  salaryModalRows.value = [{ orderRefKey: null, productName: null, amount: null }]
  const now = new Date()
  salaryDocDate.value = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  showSalaryModal.value = true
}

const openDocModal = (doc: any) => {
  salaryModalIsCreate.value = false
  editingDoc.value = doc
  salaryModalRows.value = (doc.items || []).map((it: any) => ({ orderRefKey: it.orderRefKey, productName: it.productName || null, amount: it.amount }))
  const parts = String(doc.docDate || '').slice(0, 10).split('-')
  salaryDocDate.value = parts.length === 3
    ? new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getTime()
    : null
  showSalaryModal.value = true
}

const addSalaryRow = () => {
  salaryModalRows.value.push({ orderRefKey: null, productName: null, amount: null })
}

const removeSalaryRow = (idx: number) => {
  salaryModalRows.value.splice(idx, 1)
}

// при смене заказа сбрасываем изделие (список изделий меняется)
const onSalaryRowOrderChange = (row: any) => {
  row.productName = null
}

const saveSalaryDoc = async () => {
  const deduped = buildDeduped(salaryModalRows.value)
  const docDate = salaryDocDate.value ? tsToLocalDate(salaryDocDate.value) : undefined
  salarySaving.value = true
  try {
    if (salaryModalIsCreate.value) {
      if (deduped.length === 0) return
      const res = await fetch('/sklad/api/reports/salaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: deduped, docDate })
      })
      if (res.ok) {
        applySalaryDeltas(buildDeltas([], deduped))
        await loadSalaries()
        showSalaryModal.value = false
      }
    } else if (editingDoc.value) {
      const docId = editingDoc.value.id
      let res: Response
      if (deduped.length === 0) {
        res = await fetch('/sklad/api/reports/salaries/' + docId, { method: 'DELETE' })
      } else {
        res = await fetch('/sklad/api/reports/salaries/' + docId, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: deduped, docDate })
        })
      }
      if (res.ok) {
        applySalaryDeltas(buildDeltas((editingDoc.value.items || []) as any[], deduped))
        await loadSalaries()
        showSalaryModal.value = false
      }
    }
  } catch { /* ignore */ } finally {
    salarySaving.value = false
  }
}

const deleteSalaryDoc = async (doc: any) => {
  if (!window.confirm('Удалить документ?')) return
  try {
    const res = await fetch('/sklad/api/reports/salaries/' + doc.id, { method: 'DELETE' })
    if (res.ok) {
      applySalaryDeltas(buildDeltas((doc.items || []) as any[], []))
      await loadSalaries()
    }
  } catch { /* ignore */ }
}

const salaryColumns: DataTableColumns<any> = [
  { title: 'Дата', key: 'docDate', width: 200, render: (row: any) => h(NText, { strong: true }, { default: () => formatDocDate(row.docDate) }) },
  { title: 'Заказов', key: 'count', width: 120, render: (row: any) => h(NTag, { type: 'info', quaternary: true, size: 'small' }, { default: () => `${row.count || 0}` }) },
  { title: 'Итого, ₽', key: 'total', width: 160, render: (row: any) => h(NText, { strong: true }, { default: () => fmtNumber(row.total || 0) }) },
  {
    title: '',
    key: 'actions',
    width: 120,
    render: (row: any) => h('div', { style: 'display:flex; gap:8px; justify-content:flex-end' }, [
      h(NButton, { size: 'small', quaternary: true, type: 'error', onClick: (e: any) => { e.stopPropagation(); deleteSalaryDoc(row) } }, { default: () => 'Удалить' })
    ])
  }
]

// ─── Накладные расходы (документы) ───────────────────────────────────────────
const overheadColumns: DataTableColumns<any> = [
  { title: 'Дата', key: 'docDate', width: 200, render: (row: any) => h(NText, { strong: true }, { default: () => formatDocDate(row.docDate) }) },
  { title: 'Строк', key: 'count', width: 120, render: (row: any) => h(NTag, { type: 'info', quaternary: true, size: 'small' }, { default: () => `${row.count || 0}` }) },
  { title: 'Итого, ₽', key: 'total', width: 160, render: (row: any) => h(NText, { strong: true }, { default: () => fmtNumber(row.total || 0) }) },
  {
    title: '',
    key: 'actions',
    width: 120,
    render: (row: any) => h('div', { style: 'display:flex; gap:8px; justify-content:flex-end' }, [
      h(NButton, { size: 'small', quaternary: true, type: 'error', onClick: (e: any) => { e.stopPropagation(); deleteOverheadDoc(row) } }, { default: () => 'Удалить' })
    ])
  }
]

const loadOverheads = async () => {
  try {
    const res = await fetch('/sklad/api/reports/overheads')
    if (res.ok) {
      const data = await res.json()
      overheadDocs.value = data.data || []
      if (summaryMetrics.value[5]) summaryMetrics.value[5].value = `${overheadDocs.value.length} док.`
    }
  } catch { /* ignore */ }
}

// Изделия выбранного заказа (для выпадающего списка в модалке)
const overheadProductOptionsFor = (orderRefKey: string | null) => {
  if (!orderRefKey) return []
  const order = ordersStore.orders.find((o: any) => o.id === orderRefKey)
  if (!order || !Array.isArray(order.items)) return []
  const names = Array.from(new Set(
    order.items.map((i: any) => i.productName || i.itemName).filter(Boolean)
  ))
  return names.map((name: string) => ({ label: name, value: name }))
}

const onOverheadRowOrderChange = (row: any) => {
  // при смене заказа сбрасываем изделие (список изделий меняется)
  row.productName = null
}

const buildOverheadDeduped = (rows: { orderRefKey: string | null, productName: string | null, amount: number | null }[]) => {
  const deduped: { orderRefKey: string, productName: string | null, amount: number }[] = []
  for (const r of rows) {
    if (!r.orderRefKey) continue
    const amount = Number(r.amount) || 0
    const existing = deduped.find(d => d.orderRefKey === r.orderRefKey && d.productName === (r.productName || null))
    if (existing) existing.amount = amount
    else deduped.push({ orderRefKey: r.orderRefKey, productName: r.productName || null, amount })
  }
  return deduped
}

const overheadItemKey = (orderRefKey: string, productName: string | null) =>
  orderRefKey + '\u0001' + (productName || '')

const buildOverheadDeltas = (oldItems: any[], newItems: { orderRefKey: string, productName: string | null, amount: number }[]) => {
  const deltas: { orderRefKey: string, productName: string | null, delta: number }[] = []
  const oldMap = new Map<string, number>(oldItems.map((i: any) => [overheadItemKey(i.orderRefKey, i.productName || null), i.amount || 0]))
  const newMap = new Map<string, number>(newItems.map((i: any) => [overheadItemKey(i.orderRefKey, i.productName || null), i.amount || 0]))
  for (const [k, amt] of newMap) {
    const prev = oldMap.get(k)
    const idx = k.indexOf('\u0001')
    const orderRefKey = k.slice(0, idx)
    const productName = (idx < 0 ? '' : k.slice(idx + 1)) || null
    if (prev === undefined) deltas.push({ orderRefKey, productName, delta: amt })
    else if (amt - prev !== 0) deltas.push({ orderRefKey, productName, delta: amt - prev })
    oldMap.delete(k)
  }
  for (const [k, amt] of oldMap) {
    const idx = k.indexOf('\u0001')
    deltas.push({ orderRefKey: k.slice(0, idx), productName: (idx < 0 ? '' : k.slice(idx + 1)) || null, delta: -amt })
  }
  return deltas
}

const bumpOrderOverhead = (orderRefKey: string, delta: number, productName: string | null) => {
  const order = profitabilityReport.value.find((o: any) => o.orderKey === orderRefKey || o.orderNumber === orderRefKey)
  if (!order) return
  if (productName) {
    const p = order.products.find((pp: any) => pp.productName === productName)
    if (p) p._overheadDoc = (p._overheadDoc || 0) + delta
  } else {
    order.overheadOrder = (order.overheadOrder || 0) + delta
  }
  recalcProfitability(order)
}

const applyOverheadDeltas = (deltas: { orderRefKey: string, productName: string | null, delta: number }[]) => {
  for (const d of deltas) {
    if (d.delta) bumpOrderOverhead(d.orderRefKey, d.delta, d.productName)
  }
}

const openOverheadCreate = () => {
  overheadModalIsCreate.value = true
  editingOverheadDoc.value = null
  overheadModalRows.value = [{ orderRefKey: null, productName: null, amount: null }]
  const now = new Date()
  overheadDocDate.value = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  showOverheadModal.value = true
}

const openOverheadDoc = (doc: any) => {
  overheadModalIsCreate.value = false
  editingOverheadDoc.value = doc
  overheadModalRows.value = (doc.items || []).map((it: any) => ({ orderRefKey: it.orderRefKey, productName: it.productName || null, amount: it.amount }))
  const parts = String(doc.docDate || '').slice(0, 10).split('-')
  overheadDocDate.value = parts.length === 3
    ? new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getTime()
    : null
  showOverheadModal.value = true
}

const addOverheadRow = () => {
  overheadModalRows.value.push({ orderRefKey: null, productName: null, amount: null })
}

const removeOverheadRow = (idx: number) => {
  overheadModalRows.value.splice(idx, 1)
}

const saveOverheadDoc = async () => {
  const deduped = buildOverheadDeduped(overheadModalRows.value)
  const docDate = overheadDocDate.value ? tsToLocalDate(overheadDocDate.value) : undefined
  overheadSaving.value = true
  try {
    if (overheadModalIsCreate.value) {
      if (deduped.length === 0) return
      const res = await fetch('/sklad/api/reports/overheads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: deduped, docDate })
      })
      if (res.ok) {
        applyOverheadDeltas(buildOverheadDeltas([], deduped))
        await loadOverheads()
        showOverheadModal.value = false
      }
    } else if (editingOverheadDoc.value) {
      const docId = editingOverheadDoc.value.id
      let res: Response
      if (deduped.length === 0) {
        res = await fetch('/sklad/api/reports/overheads/' + docId, { method: 'DELETE' })
      } else {
        res = await fetch('/sklad/api/reports/overheads/' + docId, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: deduped, docDate })
        })
      }
      if (res.ok) {
        applyOverheadDeltas(buildOverheadDeltas((editingOverheadDoc.value.items || []) as any[], deduped))
        await loadOverheads()
        showOverheadModal.value = false
      }
    }
  } catch { /* ignore */ } finally {
    overheadSaving.value = false
  }
}

const deleteOverheadDoc = async (doc: any) => {
  if (!window.confirm('Удалить документ?')) return
  try {
    const res = await fetch('/sklad/api/reports/overheads/' + doc.id, { method: 'DELETE' })
    if (res.ok) {
      applyOverheadDeltas(buildOverheadDeltas((doc.items || []) as any[], []))
      await loadOverheads()
    }
  } catch { /* ignore */ }
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null
const recalcProfitability = (order: any) => {
  const orderFot = orderTotalFot(order)
  const orderDelivery = order.services || 0
  const orderExpense = order.totalMaterials + orderFot + orderDelivery
  const orderGross = order.totalSum - orderExpense
  const orderOverhead = order.products.reduce((s: number, p: any) => s + productOverhead(p), 0) + (order.overheadOrder || 0)
  const orderNet = orderGross - orderOverhead
  order._fot = orderFot
  order._delivery = orderDelivery
  order._expense = orderExpense
  order._gross = orderGross
  order._overhead = orderOverhead
  order._net = orderNet

  order.products.forEach((p: any) => {
    const pExpense = (p.materialsCost || 0)
    p._expense = pExpense
    p._gross = p.productSum - pExpense
    p._net = p._gross - productOverhead(p)
  })

  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(async () => {
    try {
      await fetch('/sklad/api/reports/profitability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderKey: order.orderKey,
          products: order.products.map((p: any) => ({
            productName: p.productName,
            fot: p.fot || 0,
            _fotMonths: p._fotMonths || [],
            delivery: p.delivery || 0,
            overhead: p._overhead || 0
          }))
        })
      })
    } catch { /* ignore */ }
  }, 500)
}

const filteredProductionReport = computed(() => {
  let result = productionReport.value
  if (productionCustomerQuery.value) {
    const q = productionCustomerQuery.value.toLowerCase()
    result = result.filter(r =>
      (r.customer || '').toLowerCase().includes(q)
    )
  }
  // Date filtering is done on backend now
  return result
})

const productionColumns: DataTableColumns<any> = [
  {
    type: 'expand',
    expandable: () => true,
    renderExpand: (row: any) => {
      const children: any[] = []

      const materialColumns = [
        h('th', { style: 'width:25%' }, 'Материал'),
        h('th', { style: 'width:10%' }, 'Кол-во'),
        h('th', { style: 'width:15%' }, 'Цена, ₽'),
        h('th', { style: 'width:15%' }, 'Сумма, ₽'),
        h('th', { style: 'width:20%' }, 'Заказ на перемещение')
      ]
      const materialRow = (m: any) => {
        const tonContent = !m.transferOrderNumbers || m.transferOrderNumbers.length === 0
          ? '—'
          : m.transferOrderNumbers.map((ton: string, i: number) =>
              h('span', {
                key: i,
                style: 'cursor:pointer; color:#2080f0; text-decoration:underline;',
                onClick: () => router.push({ path: '/transfer-orders', query: { search: ton } })
              }, ton)
            )
        return [
          h('td', m.name),
          h('td', h(NText, { strong: true }, { default: () => m.quantity })),
          h('td', h(NText, { depth: 3 }, { default: () => m.price ? fmtCurrency(m.price).toLocaleString('ru-RU') : '—' })),
          h('td', h(NText, { strong: true }, { default: () => m.sum ? fmtCurrency(m.sum).toLocaleString('ru-RU') : '—' })),
          h('td', tonContent)
        ]
      }

      // Products section first
      if (row.products?.length) {
        const orderKey = row.orderNumber
        const productColumns = [
          { type: 'expand' as const, expandable: () => true, renderExpand: (p: any) => {
            const total = p.materials.reduce((s: number, m: any) => s + (m.sum || 0), 0)
            return h('div', { style: 'margin:4px 8px 4px 16px; border-left:2px solid #2080f0; background:rgba(32,128,240,0.04); border-radius:0 4px 4px 0; padding:6px 10px' }, [
              h('div', { style: 'font-size:11px; font-weight:600; color:#2080f0; margin-bottom:4px' }, 'Состав изделия'),
              h(NTable, { size: 'small', singleLine: false, striped: true, style: 'background:transparent' }, {
                default: () => [
                  h('thead', [h('tr', materialColumns)]),
                  h('tbody', p.materials.map((m: any) => h('tr', [...materialRow(m)])))
                ]
              }),
              h('div', { style: 'text-align:right; font-size:13px; font-weight:700; margin-top:6px; padding-top:4px; border-top:1px solid rgba(255,255,255,0.08)' }, `Итого: ${fmtCurrency(total).toLocaleString('ru-RU')} ₽`)
            ])
          }},
          { title: 'Изделие', key: 'name', ellipsis: true, render: (p: any) => h(NText, { strong: true, style: 'padding-left:4px' }, { default: () => p.name }) },
          { title: 'Материалов', key: 'materialCount', width: 110, render: (p: any) => h(NTag, { type: 'info', quaternary: true, size: 'small' }, { default: () => `${p.materials?.length || 0} наим.` }) },
          { title: 'Сумма, ₽', key: 'totalSum', width: 110, render: (p: any) => h(NText, { strong: true, type: 'success' }, { default: () => fmtCurrency(p.totalSum || 0).toLocaleString('ru-RU') }) }
        ]
        children.push(h('div', { style: 'margin:0 4px 8px 4px; border:1px solid rgba(255,255,255,0.08); border-radius:8px; background:rgba(255,255,255,0.03)' }, [
          h('div', { style: 'padding:10px 14px 4px; font-size:12px; font-weight:700; color:#aaa; text-transform:uppercase; letter-spacing:0.5px' }, 'Изделия'),
          h(NDataTable, {
            columns: productColumns,
            data: row.products,
            size: 'small',
            bordered: false,
            singleLine: false,
            striped: true,
            rowKey: (p: any) => p.name,
            expandedRowKeys: productExpandedKeys.value[orderKey] || [],
            'onUpdate:expanded-row-keys': (keys: string[]) => {
              productExpandedKeys.value = { ...productExpandedKeys.value, [orderKey]: keys }
            },
            rowProps: (p: any) => ({
              style: 'cursor: pointer;',
              onClick: () => {
                const key = p.name
                const current = productExpandedKeys.value[orderKey] || []
                const idx = current.indexOf(key)
                const next = idx > -1 ? current.filter((k: string) => k !== key) : [...current, key]
                productExpandedKeys.value = { ...productExpandedKeys.value, [orderKey]: next }
              }
            })
          })
        ]))
      }

      // Order-level materials section (after products)
      if (row.orderMaterials?.length) {
        const total = row.orderMaterials.reduce((s: number, m: any) => s + (m.sum || 0), 0)
        children.push(h('div', { style: 'margin:8px 12px; border-left:3px solid #f0a020; background:rgba(240,160,32,0.06); border-radius:0 6px 6px 0; padding:8px 12px' }, [
          h('div', { style: 'font-size:12px; font-weight:700; color:#f0a020; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px' }, `Прочие материалы по заказу — ${fmtCurrency(total).toLocaleString('ru-RU')} ₽`),
          h(NTable, { size: 'small', singleLine: false, striped: true, style: 'background:transparent' }, {
             default: () => [
               h('thead', [h('tr', materialColumns)]),
               h('tbody', row.orderMaterials.map((m: any) => h('tr', [...materialRow(m)])))
             ]
           })
        ]))
      }
      return h('div', { style: 'padding:4px 0; background:rgba(255,255,255,0.02); border-top:1px solid rgba(255,255,255,0.06)' }, children)
    }
  },
  {
    title: 'Заказ покупателя',
    key: 'orderNumber',
    width: 240,
    render: (row: any) => h('div', { style: 'display:flex; align-items:center; gap:8px' }, [
      h('div', { style: 'width:3px; height:20px; background:#f0a020; border-radius:2px; flex-shrink:0' }),
      h(NText, { strong: true }, { default: () => row.orderNumber })
    ])
  },
  {
    title: 'Клиент',
    key: 'customer',
    width: 200,
    ellipsis: true,
    render: (row: any) => h(NText, { depth: 3 }, { default: () => row.customer || '—' })
  },
  {
    title: 'Изделий',
    key: 'productCount',
    width: 100,
    render: (row: any) => h(NTag, { type: 'info', quaternary: true, size: 'small' }, { default: () => `${row.products?.length || 0} шт.` })
  },
  {
    title: 'Материалов',
    key: 'materialCount',
    width: 120,
    render: (row: any) => {
      const count = (row.orderMaterials?.length || 0) + (row.products || []).reduce((s: number, p: any) => s + (p.materials?.length || 0), 0)
      return h(NTag, { type: 'success', quaternary: true, size: 'small' }, { default: () => `${count} наим.` })
    }
  },
  {
    title: 'Сумма материалов, ₽',
    key: 'orderTotal',
    width: 150,
    render: (row: any) => h(NText, { strong: true }, { default: () => row.orderTotal ? fmtCurrency(row.orderTotal).toLocaleString('ru-RU') : '—' })
  },
  {
    title: '',
    key: 'actions',
    width: 80,
    render: (row: any) => h(NButton, {
      size: 'small',
      quaternary: true,
      type: 'primary',
      onClick: () => saveProductionOrderToFile(row)
    }, { default: () => 'Сохранить' })
  },
]

// Load reports on mount
onMounted(async () => {
  // Высота таблицы не зависит от данных — подбираем её сразу,
  // не дожидаясь медленных 1С-запросов (иначе таблица до их завершения
  // остаётся с дефолтным max-height и выглядит как «пол экрана»)
  scheduleRecalcProfitabilityTableHeight()
  window.addEventListener('resize', scheduleRecalcProfitabilityTableHeight)

  await Promise.all([
    reportsStore.loadAllReports(),
    loadProductionReport(),
    loadProfitabilityReport(),
    ordersStore.loadOrdersFromApi(),
    toolsStore.loadToolsFromApi(),
    loadSalaries(),
    loadOverheads()
  ])
  const totalOrders = ordersReport.value.reduce((s, r) => s + r.items.length, 0)
  if (summaryMetrics.value[1]) summaryMetrics.value[1].value = `${filteredOrdersReport.value.length} заказов`

  const prodOrders = productionReport.value.length
  if (summaryMetrics.value[2]) summaryMetrics.value[2].value = `${prodOrders} заказов`

  const issuedCount = toolsStore.issuedTools.length
  if (summaryMetrics.value[3]) summaryMetrics.value[3].value = `${issuedCount} шт.`
})

onUnmounted(() => {
  window.removeEventListener('resize', scheduleRecalcProfitabilityTableHeight)
})

onActivated(async () => {
  // Финансовую отчётность не пересчитываем: она считается один раз,
  // обновление — кнопкой «Обновить отчёт»
  await Promise.all([
    reportsStore.loadAllReports(),
    loadProductionReport(),
    ordersStore.loadOrdersFromApi(),
    toolsStore.loadToolsFromApi(),
    loadSalaries(),
    loadOverheads()
  ])
  const totalOrders = ordersReport.value.reduce((s, r) => s + r.items.length, 0)
  if (summaryMetrics.value[1]) summaryMetrics.value[1].value = `${filteredOrdersReport.value.length} заказов`
  const prodOrders = productionReport.value.length
  if (summaryMetrics.value[2]) summaryMetrics.value[2].value = `${prodOrders} заказов`
  const issuedCount = toolsStore.issuedTools.length
  if (summaryMetrics.value[3]) summaryMetrics.value[3].value = `${issuedCount} шт.`
})

watch(productionSearchQuery, () => {
  loadProductionReport()
})

// Lazy-load profitability only when "main" tab is active
watch(activeTab, (tab) => {
  if (tab === 'main') {
    if (!profitabilityLoaded.value) {
      loadProfitabilityReport()
    }
    // таблица появляется заново — подбираем высоту под видимую область
    scheduleRecalcProfitabilityTableHeight()
  }
})

// Как только таблица финансовой отчётности появилась в DOM — сразу
// подбираем её высоту (не дожидаясь остальных, медленных загрузок)
watch(profitabilityLoaded, (loaded) => {
  if (loaded) {
    scheduleRecalcProfitabilityTableHeight()
  }
})

// Debounced search and date filters for profitability
let profitabilityDebounce: ReturnType<typeof setTimeout> | null = null
watch([profitabilitySearchQuery, profitabilityDateRange], () => {
  if (profitabilityDebounce) clearTimeout(profitabilityDebounce)
  profitabilityDebounce = setTimeout(() => {
    if (profitabilityLoaded.value) {
      loadProfitabilityReport()
    }
  }, 400)
})

interface OrderReportEntry {
  orderNumber: string
  items: MaterialInvoiceItem[]
  employees: Set<string>
}

// Колонки основной таблицы отчета по заказам
const ordersReportColumns: DataTableColumns<OrderReportEntry> = [
  {
    type: 'expand',
    expandable: () => true,
    renderExpand: (row) => {
      return h('div', { class: 'p-4 bg-[rgba(255,255,255,0.02)] border-t border-gray-800' }, [
        h(NTable, { size: 'small', singleLine: false, striped: true }, {
          default: () => [
            h('thead', [
              h('tr', [
                h('th', 'Наименование'),
                h('th', 'Цена'),
                h('th', 'Кол-во'),
                h('th', 'Ед.'),
                h('th', 'Резерв'),
                h('th', 'Сумма')
              ])
            ]),
            h('tbody', row.items.map(item => h('tr', [
              h('td', item.productName),
              h('td', `${fmtCurrency(item.price || 0).toLocaleString('ru-RU')} ₽`),
              h('td', h(NText, { strong: true }, { default: () => item.quantity })),
              h('td', item.unit),
              h('td', h(NText, { strong: true }, { default: () => (item as any).reserve ? Number((item as any).reserve).toLocaleString('ru-RU') : '0' })),
              h('td', h(NText, { strong: true }, { default: () => `${fmtCurrency((item.price || 0) * item.quantity).toLocaleString('ru-RU')} ₽` }))
            ])))
          ]
        })
      ])
    }
  },
  {
    title: 'Заказ',
    key: 'orderNumber',
    render: (row: OrderReportEntry) => h(NText, { strong: true, class: 'text-lg font-mono' }, { default: () => row.orderNumber })
  },
  {
    title: 'Позиций ТМЦ',
    key: 'itemsCount',
    render: (row: OrderReportEntry) => h(NTag, { type: 'success', quaternary: true }, { default: () => `${row.items.length} наим.` })
  },
  {
    title: 'Резерв',
    key: 'totalReserve',
    render: (row: OrderReportEntry) => {
      const total = row.items.reduce((sum, i) => sum + ((i as any).reserve || 0), 0)
      return h(NText, { strong: true }, { default: () => total ? total.toLocaleString('ru-RU') : '0' })
    }
  }
]

const toolsDetailedColumns = [
  { title: 'Инструмент', key: 'name' },
  { title: 'Сотрудник', key: 'issuedToName' },
  {
    title: 'Срок (дней)', key: 'issuedAt',
    render: (row: any) => row.issuedAt ? Math.floor((Date.now() - new Date(row.issuedAt).getTime()) / (1000 * 60 * 60 * 24)) : '-'
  }
]

</script>

<style scoped>
.sticky-summary {
  position: sticky;
  top: 0px;
  z-index: 100;
  background: #101014;
  margin-bottom: 12px;
}
.metric-card {
  transition: all 0.3s ease;
  cursor: pointer;
  border-bottom: 4px solid transparent;
  background-color: #2a2a2a;
}
.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
.metric-card.active {
  border-bottom-color: v-bind('summaryMetrics.find(m => m.id === activeTab)?.color || "transparent"' );
  background-color: #333;
}
.top-employees-mini {
  height: 100%;
}
.reports-page {
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 24px;
}
@media (max-width: 768px) {
  .reports-page {
    padding: 0 12px;
  }
}

.profitability-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  table-layout: auto;
}
.profitability-table thead th {
  font-weight: 700;
  text-align: center;
  padding: 8px 4px;
  border: 1px solid #333;
  background: #1a1a1a;
  white-space: nowrap;
}
.profitability-table tbody td {
  text-align: center;
  padding: 6px 4px;
  border: 1px solid #333;
}
.profitability-table input[type="number"]::-webkit-inner-spin-button,
.profitability-table input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.profitability-table input[type="number"] {
  -moz-appearance: textfield;
}
.profitability-total td {
  font-weight: 700;
  background: #1a1a1a;
  border: 1px solid #333;
  padding: 6px 4px;
  text-align: center;
}
.profitability-table .n-input-number {
  width: 96px !important;
}
.profitability-order-header {
  padding: 10px 12px;
  background: #1a1a1a;
  border-radius: 6px;
  margin-bottom: 2px;
  transition: background 0.15s;
}
.profitability-order-header:hover {
  background: #252525;
}
.profitability-other td {
  color: #f0a020;
  font-style: italic;
}
.n-modal-body input[type="number"]:focus {
  border-color: #2080f0;
  box-shadow: 0 0 0 2px rgba(32, 128, 240, 0.2);
}
.n-modal-body input[type="number"]::-webkit-inner-spin-button,
.n-modal-body input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.n-modal-body input[type="number"] {
  -moz-appearance: textfield;
}
</style>
