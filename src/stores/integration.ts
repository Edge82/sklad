import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useStockBalances } from '@/composables/useStockBalances';
import type { Movement } from '@/composables/useStockBalances';
import { useInventoryStore } from './inventory';
import type { InventoryItem } from '@/types';

export const useIntegrationStore = defineStore('integration', () => {
  const stockBalances = useStockBalances();
  const inventoryStore = useInventoryStore();
  
  const loading = ref(false);
  const error = ref<string | null>(null);
  const lastSyncTime = ref<string | null>(localStorage.getItem('1c_last_sync'));
  const syncProgress = ref(0);

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

        // DEBUG: Логируем Ножку при формировании объекта для стора
        if (itemId.includes('efc175de-002f-11f1-9078-fa163e5c9fa8')) {
          console.log('--- NOSHKA FINAL SYNC DATA ---', {
            id: itemId,
            name: n.name || n.Description,
            totalStockRaw,
            resValue,
            stock, // Должно стать 40
            reserved, // Должно стать 6
            available // Должно стать 34
          });
        }
        
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
        
        let price = Number(priceMap.get(itemId) || lastPriceMap.get(itemId) || 0);
        
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
    syncWith1C
  };
});


