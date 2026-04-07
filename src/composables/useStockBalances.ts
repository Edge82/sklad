import { ref } from 'vue';

export interface Movement {
  period: string;
  itemId: string;
  quantity: number;
  type: 'Receipt' | 'Expense';
  lineNumber?: number;
  price?: number;
  warehouseId?: string;
}

export interface Balance {
  itemId: string;
  quantity: number;
}

const baseURL = import.meta.env.VITE_1C_BASE_URL || '/api-1c';
const authUser = import.meta.env.VITE_1C_USERNAME || 'odata.user';
const authPass = import.meta.env.VITE_1C_PASSWORD || 'HoroshenkoUserSklad';
const authToken = 'Basic ' + btoa(`${authUser}:${authPass}`);
const warehouseGuid = import.meta.env.VITE_1C_WAREHOUSE_GUID || '344cfb30-e233-11f0-862e-fa163e5c9fa8';

export function useStockBalances() {
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchOData(endpoint: string, params: Record<string, string> = {}) {
    let allResults: any[] = [];
    let skip = 0;
    const top = 1000;
    let hasMore = true;

    while (hasMore) {
      const urlParams = new URLSearchParams({
        '$format': 'json',
        ...params,
        '$top': top.toString(),
        '$skip': skip.toString()
      });

      const url = `${baseURL}/odata/standard.odata/${endpoint}?${urlParams}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': authToken,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`1C Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const currentBatch = data.value || (Array.isArray(data) ? data : []);
      
      if (currentBatch.length > 0) {
        allResults = [...allResults, ...currentBatch];
      }

      if (data['odata.nextLink']) {
        hasMore = true;
      } else {
        hasMore = currentBatch.length === top;
      }

      skip += top;
      if (skip > 100000) break;
    }
    return allResults;
  }

  async function fetchNomenclature() {
    try {
      const items = await fetchOData('Catalog_Номенклатура', {
        '$select': 'Ref_Key,Description,Артикул,ЕдиницаИзмерения_Key,КатегорияНоменклатуры_Key,IsFolder'
      });
      return items.map((item: any) => ({
        id: item.Ref_Key,
        name: item.Description,
        sku: item.Артикул || '',
        unitId: item.ЕдиницаИзмерения_Key,
        categoryId: item.КатегорияНоменклатуры_Key,
        price: 0,
        stock: 0,
        reserved: 0
      }));
    } catch (err) {
      console.error('Ошибка загрузки номенклатуры:', err);
      throw err;
    }
  }

  async function fetchCategories() {
    try {
      const items = await fetchOData('Catalog_КатегорииНоменклатуры', {
        '$select': 'Ref_Key,Description'
      });
      return items.map((cat: any) => ({
        id: cat.Ref_Key,
        name: cat.Description
      }));
    } catch (err) {
      return [];
    }
  }

  async function fetchPrices() {
    const priceRegisters = [
      'InformationRegister_ЦеныНоменклатуры_SliceLast',
      'InformationRegister_ЦеныНоменклатуры',
      'InformationRegister_ЦеныНоменклатурыИХарактеристик_SliceLast'
    ];

    for (const register of priceRegisters) {
      try {
        const isSliceLast = register.endsWith('SliceLast');
        const params: Record<string, string> = isSliceLast 
          ? { '$select': 'Номенклатура_Key,Цена' }
          : { '$select': 'Номенклатура_Key,Цена,Period', '$orderby': 'Period desc' };

        const items = await fetchOData(register, params);
        if (items && items.length > 0) {
          const getNomId = (p: any) => p.Номенклатура_Key || p.Номенклатура;
          const getPrice = (p: any) => p.Цена || 0;
          
          if (isSliceLast) {
            return items.map((price: any) => ({
              nomenclatureId: getNomId(price),
              value: getPrice(price)
            }));
          } else {
            const latestPrices = new Map();
            items.forEach((p: any) => {
              const id = getNomId(p);
              if (id && !latestPrices.has(id)) latestPrices.set(id, getPrice(p));
            });
            return Array.from(latestPrices.entries()).map(([id, val]) => ({
              nomenclatureId: id,
              value: val
            }));
          }
        }
      } catch (err) { continue; }
    }
    return [];
  }

  async function fetchUnits() {
    try {
      const unitRegisters = ['Catalog_КлассификаторЕдиницИзмерения', 'Catalog_ЕдиницыИзмерения'];
      for (const register of unitRegisters) {
        try {
          const items = await fetchOData(register, { '$select': 'Ref_Key,Description' });
          if (items && items.length > 0) {
            return items.map((unit: any) => ({ id: unit.Ref_Key, name: unit.Description }));
          }
        } catch (e) { continue; }
      }
      return [];
    } catch (err) { return []; }
  }

  async function fetchMovements(): Promise<Movement[]> {
    try {
      const records = await fetchOData('AccumulationRegister_ЗапасыНаСкладах', { '$orderby': 'Period desc' });
      const movements: Movement[] = [];
      records.forEach((item: any) => {
        const itemId = item.Номенклатура_Key || item.Item_Key;
        if (!itemId) return;
        const type = String(item.RecordType);
        movements.push({
          period: item.Period,
          itemId: itemId,
          quantity: Number(item.Количество) || 0,
          type: (type === 'Receipt' || type === '0' || type === 'true') ? 'Receipt' : 'Expense',
          lineNumber: item.LineNumber,
          warehouseId: item.Склад_Key || item.СтруктурнаяЕдиница_Key
        });
      });
      return movements;
    } catch (err) { return []; }
  }

  async function fetchReserves(): Promise<Map<string, number>> {
    try {
      const records = await fetchOData('AccumulationRegister_Запасы', { '$top': '50000' });
      const reserveMap = new Map<string, number>();
      records.forEach((item: any) => {
        const itemId = item.Номенклатура_Key;
        if (!itemId) return;
        const hasOrder = (item.ЗаказПокупателя_Key && item.ЗаказПокупателя_Key !== '00000000-0000-0000-0000-000000000000') ||
                         (item.Заказ_Key && item.Заказ_Key !== '00000000-0000-0000-0000-000000000000');
        if (!hasOrder) return;
        const qty = Number(item.Количество) || 0;
        const type = String(item.RecordType);
        const isPlus = type === 'Receipt' || type === '0' || type === 'true';
        const current = reserveMap.get(itemId) || 0;
        reserveMap.set(itemId, Number((current + (isPlus ? qty : -qty)).toFixed(3)));
      });
      return reserveMap;
    } catch (err) { return new Map(); }
  }

  function calculateBalances(movements: Movement[]) {
    const balanceMap = new Map<string, number>();
    const lastPriceMap = new Map<string, number>();
    const warehouseMap = new Map<string, Set<string>>();

    movements.forEach(m => {
      const currentValue = balanceMap.get(m.itemId) || 0;
      const typeStr = String(m.type);
      const isReceipt = typeStr === 'Receipt' || typeStr === '0' || typeStr === 'true';
      const qty = Number(m.quantity) || 0;

      if (m.warehouseId) {
        if (!warehouseMap.has(m.itemId)) warehouseMap.set(m.itemId, new Set());
        warehouseMap.get(m.itemId)?.add(m.warehouseId);
      }

      const newValue = isReceipt ? currentValue + qty : currentValue - qty;
      balanceMap.set(m.itemId, Number(newValue.toFixed(3)));
    });
    return { balanceMap, lastPriceMap, warehouseMap };
  }

  async function fetchWarehouses() {
    try {
      const items = await fetchOData('Catalog_СтруктурныеЕдиницы', { '$select': 'Ref_Key,Description' });
      return items.map((w: any) => ({ id: w.Ref_Key, name: w.Description }));
    } catch (err) { return []; }
  }

  async function fetchPartners() {
    try {
      const items = await fetchOData('Catalog_Контрагенты', { '$select': 'Ref_Key,Description' });
      return items.map((p: any) => ({ id: p.Ref_Key, name: p.Description }));
    } catch (err) { return []; }
  }

  async function fetchCustomerOrders() {
    try {
      const orders = await fetchOData('Document_ЗаказПокупателя', {
        '$orderby': 'Date desc',
        '$top': '500'
      });
      
      return (orders || []).map((order: any) => ({
        id: order.Ref_Key,
        number: order.Number,
        date: order.Date,
        customerRef: order.Контрагент_Key,
        amount: order.СуммаДокумента || 0,
        statusKey: order.СостояниеЗаказа
      }));
    } catch (err) { 
      console.error('Error fetching orders:', err);
      return [];
    }
  }

  async function fetchOrderStates() {
    const stateCatalogs = [
      'Catalog_СостоянияЗаказовПокупателей',
      'Catalog_СостоянияЗаказов',
      'Catalog_СтатусыЗаказов'
    ];

    for (const catalog of stateCatalogs) {
      try {
        const items = await fetchOData(catalog, { '$select': 'Ref_Key,Description' });
        if (items && items.length > 0) {
          return items.map((s: any) => ({ id: s.Ref_Key, name: s.Description }));
        }
      } catch (err) {
        continue;
      }
    }
    return [];
  }

  return {
    loading,
    error,
    fetchOData,
    fetchNomenclature,
    fetchCategories,
    fetchPrices,
    fetchUnits,
    fetchMovements,
    calculateBalances,
    fetchReserves,
    fetchWarehouses,
    fetchCustomerOrders,
    fetchPartners,
    fetchOrderStates
  };
}
