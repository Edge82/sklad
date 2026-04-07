import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useStockBalances } from '@/composables/useStockBalances';
import { useInventoryStore } from './inventory';
import { useOrdersStore } from './orders';
import type { InventoryItem, Order, OrderStatus } from '@/types';

export const useIntegrationStore = defineStore('integration', () => {
  const stockBalances = useStockBalances();
  const inventoryStore = useInventoryStore();
  const ordersStore = useOrdersStore();
  
  const loading = ref(false);
  const error = ref<string | null>(null);
  const lastSyncTime = ref<string | null>(localStorage.getItem('1c_last_sync'));
  const syncProgress = ref(0);

  async function syncOrders() {
    loading.value = true;
    error.value = null;
    try {
      // Загружаем заказы, партнеров, справочник состояний и номенклатуру параллельно
      const [odataOrders, partners, statusCatalog, nomenclature] = await Promise.all([
        stockBalances.fetchCustomerOrders(),
        stockBalances.fetchPartners(),
        stockBalances.fetchOrderStates(),
        stockBalances.fetchNomenclature()
      ]);
      
      const partnerMap = new Map(partners.map(p => [p.id, p.name]));
      const stateMap = new Map(statusCatalog.map((s: any) => [s.id, s.name]));
      const nomMap = new Map(nomenclature.map(n => [n.id, n]));
      
      const mappedOrders: Order[] = odataOrders.map(o => {
        // Используем ____Presentation, если 1С прислала текстовое значение, 
        // иначе берем из справочника
        let stateName = (o as any).statusDescription || stateMap.get((o as any).statusKey) || '';
        
        // Очищаем название от номеров
        if (stateName.match(/^\d+\.\s*/)) {
          stateName = stateName.replace(/^\d+\.\s*/, '');
        }

        let localStatus: OrderStatus = 'new';
        const name = stateName.toLowerCase();
        
        // Маппинг состояний
        if (name.includes('завершен') || name.includes('выполнен') || name.includes('отгружен') || name.includes('готов')) {
          localStatus = 'ready';
        } else if (name.includes('в работе') || name.includes('на выполнении') || name.includes('производств') || name.includes('сборк')) {
          localStatus = 'in_progress';
        } else if (name.includes('счет') || name.includes('оплачен')) {
          localStatus = 'in_progress';
        }

        const items: OrderItem[] = ((o as any).items || []).map((item: any) => {
          const product = nomMap.get(item.productId);
          return {
            id: item.id,
            orderId: o.id,
            productId: item.productId,
            productName: item.productName || product?.name || 'Неизвестный товар',
            itemName: item.productName || product?.name || 'Неизвестный товар',
            productArticle: product?.sku || '',
            quantity: item.quantity,
            unitPrice: item.price,
            totalPrice: item.total,
            plannedQuantity: item.quantity,
            actualQuantity: 0,
            remainingQuantity: item.quantity,
            unit: 'шт'
          };
        });

        const totalPlanned = items.reduce((sum, item) => sum + (item.plannedQuantity || 0), 0);

        return {
          id: o.id,
          orderNumber: o.number,
          customerName: (o as any).customerName || partnerMap.get(o.customerRef) || 'Неизвестный клиент',
          customerPhone: '',
          orderDate: new Date(o.date),
          deadline: new Date(o.date),
          priority: 'medium',
          totalAmount: Number(o.amount) || 0,
          createdAt: new Date(o.date),
          createdBy: '1C Integration',
          status: localStatus,
          notes: stateName ? `1С: ${stateName}` : '',
          items: items,
          plannedQuantity: totalPlanned,
          actualQuantity: 0,
          remainingQuantity: totalPlanned,
          shipments: [],
          partialShipmentAllowed: true,
          odata_id: o.id
        };
      });

      // Обновляем стор только новыми заказами (которых еще нет в списке)
      mappedOrders.forEach(newOrder => {
        const exists = ordersStore.orders.find(existing => 
          (newOrder.odata_id && existing.odata_id === newOrder.odata_id) || 
          existing.id === newOrder.id ||
          existing.orderNumber === newOrder.orderNumber
        );
        
        if (!exists) {
          ordersStore.orders.unshift(newOrder);
        } else {
          const index = ordersStore.orders.indexOf(exists);
          ordersStore.orders[index] = {
            ...exists,
            totalAmount: newOrder.totalAmount || exists.totalAmount,
            customerName: newOrder.customerName || exists.customerName,
            odata_id: newOrder.odata_id || exists.odata_id,
            status: newOrder.status, // Обновляем статус из 1С
            notes: newOrder.notes,
            items: newOrder.items,
            plannedQuantity: newOrder.plannedQuantity,
            remainingQuantity: newOrder.remainingQuantity
          };
        }
      });

      return true;
    } catch (err: any) {
      error.value = err.message || 'Ошибка синхронизации заказов';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function syncOrderDetails(orderId: string) {
    if (!orderId) return;
    
    try {
      const items = await stockBalances.fetchOrderItems(orderId);
      console.log('DEBUG: Raw items from 1C for order', orderId, items);
      
      if (!items || items.length === 0) return;

      const order = ordersStore.orders.find(o => o.id === orderId);
      if (order) {
        const nomenclatureMap = new Map();
        const needsNomenclature = items.some(i => !i.productName || i.productName === 'Неизвестный товар');
        
        if (needsNomenclature) {
          console.log('DEBUG: Fetching nomenclature catalog to match IDs...');
          const nomData = await stockBalances.fetchNomenclature();
          console.log('DEBUG: Nomenclature catalog size:', nomData.length);
          console.log('DEBUG: First 3 items from catalog:', nomData.slice(0, 3));
          nomData.forEach(n => nomenclatureMap.set(n.id, n.name));
        }

        const mappedItems: OrderItem[] = items.map(item => {
          const nameFromCatalog = nomenclatureMap.get(item.productId);
          console.log(`DEBUG: Mapping item ${item.productId}. From order: ${item.productName}, From catalog: ${nameFromCatalog}`);
          
          const finalName = item.productName && item.productName !== 'Неизвестный товар' 
            ? item.productName 
            : (nameFromCatalog || 'Неизвестный товар');

          return {
            id: item.id,
            orderId: orderId,
            productId: item.productId,
            productName: finalName,
            itemName: finalName,
            productArticle: '', 
            quantity: item.quantity,
            unitPrice: item.price,
            totalPrice: item.total,
            plannedQuantity: item.quantity,
            actualQuantity: 0,
            remainingQuantity: item.quantity,
            unit: 'шт'
          };
        });

        order.items = mappedItems;
        order.plannedQuantity = mappedItems.reduce((sum, i) => sum + (i.plannedQuantity || 0), 0);
        order.remainingQuantity = order.plannedQuantity;
      }
    } catch (err) {
      console.error('Ошибка загрузки деталей заказа:', err);
    }
  }

  async function syncWith1C() {
    loading.value = true;
    error.value = null;
    syncProgress.value = 10;

    try {
      console.log('Начало полной синхронизации с 1С...');
      
      // 1. Загружаем справочники параллельно
      const [nomenclature, units, categories, prices, warehouses] = await Promise.all([
        stockBalances.fetchNomenclature(),
        stockBalances.fetchUnits(),
        stockBalances.fetchCategories(),
        stockBalances.fetchPrices(),
        stockBalances.fetchWarehouses()
      ]);
      syncProgress.value = 40;

      // 2. Работаем с движениями
      // Загружаем основные остатки и резервы
      const [allMovements, reserveMap] = await Promise.all([
        stockBalances.fetchMovements(),
        stockBalances.fetchReserves()
      ]);
      
      syncProgress.value = 70;

      // 3. Высчитываем остатки
      const { balanceMap, lastPriceMap, warehouseMap } = stockBalances.calculateBalances(allMovements);
      
      // 3.1 Готовим карту цен
      const priceMap = new Map((prices as any[]).map(p => [p.nomenclatureId, p.value]));

      // 4. Формируем новый список материалов
      const unitMap = new Map((units as any[]).map(u => [u.id, u.name]));
      const categoryMap = new Map((categories as any[]).map(c => [c.id, c.name]));
      const storeMap = new Map((warehouses as any[]).map(w => [w.id, w.name]));
      
      const newInventory: InventoryItem[] = (nomenclature as any[]).map(n => {
        const itemId = n.id || n.Ref_Key;
        const totalStockRaw = balanceMap.get(itemId) || 0;
        
        // В 1С:УНФ остаток в регистре 'Запасы' может быть УЖЕ за вычетом резерва или наоборот.
        // Исходя из ваших данных: если 1С прислала -6 резерва, значит нам нужно его отобразить как +6,
        // а реальный физический остаток на складе (stock) — это 40 (34 + 6).
        const resValue = reserveMap.get(itemId) || 0;
        const reserved = Math.abs(Number(resValue.toFixed(3)));
        
        // stock — это ОБЩИЙ физический остаток (40)
        // available — это СВОБОДНЫЙ остаток (34)
        const stock = Number((totalStockRaw + (resValue < 0 ? Math.abs(resValue) : 0)).toFixed(3));
        const available = Number((stock - reserved).toFixed(3));

        const warehouseIds = warehouseMap.get(itemId);
        let warehouseName = '—'; 
        
        if (warehouseIds && warehouseIds.size > 0) {
          const names = Array.from(warehouseIds)
            .map(id => storeMap.get(id))
            .filter(name => !!name);
          
          if (names.length > 0) {
            warehouseName = names.join(', ');
          }
        } else if (stock > 0) {
          warehouseName = 'Основной склад';
        }
        
        const price = Number(priceMap.get(itemId) || lastPriceMap.get(itemId) || 0);
        
        return {
          id: itemId,
          name: n.name || n.Description,
          sku: n.sku || n.Артикул || '',
          barcode: '',
          category: categoryMap.get(n.categoryId) || 'Без категории',
          categoryId: n.categoryId || '1',
          description: '',
          unit: unitMap.get(n.unitId) || n.unitName || 'шт',
          currentStock: stock, // Это ОБЩИЙ остаток (40)
          minStock: 0,
          maxStock: 1000,
          reserved: reserved, // Это РЕЗЕРВ (6)
          available: available, // Это ДОСТУПНО (34)
          location: warehouseName,
          purchasePrice: price,
          averagePrice: price,
          lastPurchasePrice: price,
          totalValue: Number((stock * price).toFixed(2)),
          mainSupplier: '',
          alternativeSuppliers: [],
          deliveryTime: 0,
          minOrderQuantity: 0,
          totalConsumed: 0,
          popularity: 5,
          status: available > 0 ? 'in_stock' : (stock > 0 ? 'in_stock' : 'out_of_stock'),
          type: 'material' as const,
          createdAt: new Date(),
          updatedAt: new Date()
        } as InventoryItem;
      });

      // 5. Обновляем список категорий в inventoryStore (если нужно)
      if (categories.length > 0) {
        inventoryStore.categories = categories.map((c: any) => ({
          id: c.id,
          name: c.name,
          icon: 'folder-outline'
        }));
      }

      // 6. Полная замена данных в сторе
      // Сначала жестко очищаем переменную в Pinia, чтобы исключить любое мерджинг-поведение
      inventoryStore.items = [];
      inventoryStore.replaceAll(newInventory);

      // 6. Финализация
      const now = new Date().toISOString();
      lastSyncTime.value = now;
      localStorage.setItem('1c_last_sync', now);
      syncProgress.value = 100;

      console.log('Синхронизация с 1С успешно завершена');

    } catch (err: any) {
      error.value = err.message || 'Ошибка синхронизации с 1С';
      console.error('Sync Error:', err);
    } finally {
      loading.value = false;
      setTimeout(() => { syncProgress.value = 0; }, 2000);
    }
  }

  return {
    loading,
    error,
    lastSyncTime,
    syncProgress,
    syncWith1C,
    syncOrders,
    syncOrderDetails
  };
});


