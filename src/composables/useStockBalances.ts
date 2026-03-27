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

    // ВОЗВРАЩАЕМ ПАГИНАЦИЮ, НО С ПРАВИЛЬНОЙ СТРУКТУРОЙ
    while (hasMore) {
      // 1С OData требует $skip для пагинации
      const urlParams = new URLSearchParams({
        '$format': 'json',
        ...params,
        '$top': top.toString(),
        '$skip': skip.toString()
      });

      const url = `${baseURL}/odata/standard.odata/${endpoint}?${urlParams}`;
      console.log(`Fetching 1C: ${endpoint} (skip: ${skip}, top: ${top})`);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': authToken,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('1C Error Response:', { status: response.status, body: errorText });
        throw new Error(`1C Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // ВАЖНО: 1С может возвращать данные в data.value или напрямую в data
      const currentBatch = data.value || (Array.isArray(data) ? data : []);
      
      if (currentBatch.length > 0) {
        allResults = [...allResults, ...currentBatch];
        console.log(`Получено порции: ${currentBatch.length} записей. Всего: ${allResults.length}`);
      }

      // Если в ответе есть odata.nextLink, значит точно есть еще данные
      // Иначе ориентируемся на количество записей в текущей порции
      if (data['odata.nextLink']) {
        hasMore = true;
      } else {
        hasMore = currentBatch.length === top;
      }

      skip += top;

      // Защита от бесконечного цикла (макс 100 страниц)
      if (skip > 100000) break;
    }

    return allResults;
  }

  async function fetchNomenclature() {
    try {
      // Прямой запрос к номенклатуре. По логам видно, что полей цен в Catalog_Номенклатура нет.
      // Сразу запрашиваем базовые поля, чтобы избежать лишних 400 ошибок.
      const baseFields = 'Ref_Key,Description,Артикул,ЕдиницаИзмерения_Key,КатегорияНоменклатуры_Key,IsFolder';
      
      const items = await fetchOData('Catalog_Номенклатура', {
        '$select': baseFields
      });
      
      console.log(`Загружено номенклатуры (всего): ${items.length}`);
      
      // DEBUG: Проверяем наличие Ножки в ответе
      const foundNoshka = items.find((i: any) => 
        String(i.Description).includes('Ножка') || 
        String(i.Ref_Key).includes('a6f30663-956e-11ef-ac3a-00155d017b0d')
      );
      if (foundNoshka) {
        console.log('--- NOSHKA FOUND IN NOMENCLATURE ---', foundNoshka);
      } else {
        console.log('--- NOSHKA NOT FOUND IN NOMENCLATURE ---');
        // Если не нашли, выведем первые 5 элементов для понимания структуры
        console.log('Sample nomenclature:', items.slice(0, 5));
      }

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
      
      console.log(`Загружено категорий (всего): ${items.length}`);
      return items.map((cat: any) => ({
        id: cat.Ref_Key,
        name: cat.Description
      }));
    } catch (err) {
      console.error('Ошибка загрузки категорий:', err);
      return [];
    }
  }

  async function fetchPrices() {
    // В 1С:УНФ могут быть разные названия регистров цен в зависимости от версии или настроек OData
    const priceRegisters = [
      'InformationRegister_ЦеныНоменклатуры_SliceLast',
      'InformationRegister_ЦеныНоменклатуры',
      'InformationRegister_ЦеныНоменклатурыИХарактеристик_SliceLast',
      'InformationRegister_ЦеныНоменклатурыИХарактеристик',
      'InformationRegister_ЦеныНоменклатурыСрезПоследних', 
      'InformationRegister_ЦеныНоменклатурыИХарактеристикСрезПоследних',
      'InformationRegister_Цены' // Добавлено как возможный вариант
    ];

    for (const register of priceRegisters) {
      try {
        const isSliceLast = register.endsWith('SliceLast') || register.endsWith('СрезПоследних');
        
        let params: Record<string, string> = {};
        
        if (isSliceLast) {
          params = { '$select': 'Номенклатура_Key,Цена' };
        } else {
          params = {
            '$select': 'Номенклатура_Key,Цена,Period',
            '$orderby': 'Period desc'
          };
        }

        console.log(`Пробуем получить цены из регистра: ${register}`);
        let items;
        try {
          items = await fetchOData(register, params);
        } catch (e: any) {
          // Если 404 - пропускаем этот регистр
          if (e.message && e.message.includes('404')) {
            continue;
          }

          // Попытка с "Номенклатура" вместо "Номенклатура_Key"
          if (params['$select'] && params['$select'].includes('Номенклатура_Key')) {
            try {
              const altParams = { ...params };
              altParams['$select'] = params['$select'].replace('Номенклатура_Key', 'Номенклатура');
              items = await fetchOData(register, altParams);
            } catch (e2) {
              continue;
            }
          } else {
            continue;
          }
        }
        
        if (items && items.length > 0) {
          console.log(`Успешно загружено цен из ${register}: ${items.length}`);
          
          const getNomId = (p: any) => p.Номенклатура_Key || p.Номенклатура || p.Ref_Key;
          const getPrice = (p: any) => p.Цена || p.Value || 0;
          
          if (isSliceLast) {
            return items.map((price: any) => ({
              nomenclatureId: getNomId(price),
              value: getPrice(price)
            }));
          } else {
            // Для обычного регистра фильтруем только последние по дате
            const latestPrices = new Map();
            items.forEach((p: any) => {
              const id = getNomId(p);
              if (id && !latestPrices.has(id)) {
                latestPrices.set(id, getPrice(p));
              }
            });
            
            return Array.from(latestPrices.entries()).map(([id, val]) => ({
              nomenclatureId: id,
              value: val
            }));
          }
        }
      } catch (err: any) {
        console.warn(`Регистр ${register} не доступен: ${err.message}`);
        continue;
      }
    }

    console.error('Ни один из регистров цен не доступен или пуст');
    return [];
  }

  async function fetchUnits() {
    try {
      const unitRegisters = [
        'Catalog_КлассификаторЕдиницИзмерения',
        'Catalog_ЕдиницыИзмерения',
        'Catalog_УпаковкиНоменклатуры'
      ];

      for (const register of unitRegisters) {
        try {
          console.log(`Пробуем получить единицы измерения из регистра: ${register}`);
          const items = await fetchOData(register, {
            '$select': 'Ref_Key,Description'
          });
          
          if (items && items.length > 0) {
            console.log(`Загружено единиц измерения из ${register}: ${items.length}`);
            return items.map((unit: any) => ({
              id: unit.Ref_Key,
              name: unit.Description
            }));
          }
        } catch (e) {
          console.warn(`Регистр ${register} не доступен`);
        }
      }

      console.warn('Ни один из регистров единиц измерения не загрузил данные');
      return [];
    } catch (err) {
      console.error('Ошибка загрузки единиц измерения:', err);
      return [];
    }
  }

  const warehouseGuid = '86620986-e3ba-11ef-968b-d45d6487e614';

  async function fetchMovements(fromDate: string | null = null): Promise<Movement[]> {
    try {
      const params: Record<string, string> = {
        '$orderby': 'Period desc'
      };

      console.log(`Загрузка движений из регистра: AccumulationRegister_ЗапасыНаСкладах`);
      const records = await fetchOData('AccumulationRegister_ЗапасыНаСкладах', params);
      const movements: Movement[] = [];
      const processedUniqueKeys = new Set<string>();
      
      console.log(`[AccumulationRegister_ЗапасыНаСкладах] Получено записей OData: ${records.length}`);

      records.forEach((record: any) => {
        const processItem = (item: any) => {
          // Игнорируем метаданные odata
          if (!item || item['odata.type'] || item['odata.metadata']) return;

          const itemId = item.Номенклатура_Key || (item.Номенклатура && item.Номенклатура.Ref_Key) || item.Номенклатура || item.Item_Key;
          if (!itemId) return;

          // DEBUG: Логируем Ножку в движениях склада
          if (String(item.Description || '').includes('Ножка') || String(itemId).includes('a6f30663-956e-11ef-ac3a-00155d017b0d')) {
             console.log('--- NOSHKA FOUND IN WAREHOUSE MOVEMENTS ---', item);
          }

          const warehouse = item.Склад_Key || item.СтруктурнаяЕдиница_Key || item.Склад || item.СтруктурнаяЕдиница || item.Warehouse_Key;
          const warehouseKey = (typeof warehouse === 'object' && warehouse !== null) ? warehouse.Ref_Key : String(warehouse);
          
          const isTargetWarehouse = true; 

          if (isTargetWarehouse) {
            const uniqueKey = `${item.Period}_${item.LineNumber ?? '0'}_${itemId}_${item.Количество}_${item.RecordType}`;
            if (!processedUniqueKeys.has(uniqueKey)) {
              const qty = Number(item.Количество) || 0;
              const type = String(item.RecordType);
              
              movements.push({
                period: item.Period,
                itemId: itemId,
                quantity: qty,
                type: (type === 'Receipt' || type === '0' || type === 'true') ? 'Receipt' : 'Expense',
                lineNumber: item.LineNumber,
                price: qty !== 0 ? (Number(item.Сумма || item.Amount || 0) / qty) : 0,
                warehouseId: warehouseKey
              });
              processedUniqueKeys.add(uniqueKey);
            }
          }
        };

        if (record.RecordSet && Array.isArray(record.RecordSet)) {
          record.RecordSet.forEach(processItem);
        } else {
          processItem(record);
        }
      });

      return movements;
    } catch (err: any) {
      console.error(`Ошибка загрузки движений из AccumulationRegister_ЗапасыНаСкладах:`, err);
      return [];
    }
  }

  async function fetchReserves(): Promise<Map<string, number>> {
    try {
      // Сразу пробуем основной регистр 'Запасы' (фолбэк стал основным способом)
      const regName = 'AccumulationRegister_Запасы';
      console.log(`[Reserves] Получение данных из основного регистра: ${regName}`);
      let records: any[] = [];
      try {
        const items = await fetchOData(regName, { '$top': '50000' });
        if (items && items.length > 0) {
          records = items;
          console.log(`[${regName}] Получено записей: ${records.length}`);
        }
      } catch (e) {
        console.error('Ошибка при получении резервов из Запасы:', e);
      }

      if (records.length === 0) {
        console.warn('Регистр накопления Запасы не вернул данных для резервов');
        return new Map<string, number>();
      }

      const reserveMap = new Map<string, number>();
      const processedUniqueKeys = new Set<string>();

      records.forEach((record: any) => {
        const processItem = (item: any) => {
          if (!item || item['odata.type'] || item['odata.metadata']) return;

          const itemId = item.Номенклатура_Key || (item.Номенклатура && item.Номенклатура.Ref_Key) || item.Номенклатура;
          if (!itemId) return;

          // Фиксируем, что мы работаем с регистром 'Запасы' (основной источник в UNF)
          const currentReg = 'AccumulationRegister_Запасы';
          const isBalanceRegister = false; // 'Запасы' - это регистр накопления (движения), а не остатков
          
          if (!isBalanceRegister && (item.Active === false || item.Active === 'false')) return;

          // ДЛЯ РЕГИСТРА 'Запасы' (AccumulationRegister_Запасы):
          // В УНФ резерв определяется наличием любого документа в полях Заказ... или ДокументРезерва
          // Либо по СодержаниюПроводки "Резервирование запасов"
          const content = String(item.СодержаниеПроводки || '');
          const isReserveContent = content.includes('Резервирование') || 
                                  content.includes('резерв') || 
                                  content.includes('Заказ');
          
          const hasOrder = (item.ЗаказПокупателя_Key && item.ЗаказПокупателя_Key !== '00000000-0000-0000-0000-000000000000') ||
                          (item.Заказ_Key && item.Заказ_Key !== '00000000-0000-0000-0000-000000000000') ||
                          (item.ДокументРезерва_Key && item.ДокументРезерва_Key !== '00000000-0000-0000-0000-000000000000') ||
                          (item.ЗаказНаПроизводство_Key && item.ЗаказНаПроизводство_Key !== '00000000-0000-0000-0000-000000000000') ||
                          (item.ЗаказНаПеремещение_Key && item.ЗаказНаПеремещение_Key !== '00000000-0000-0000-0000-000000000000') ||
                          (item.ЗаказПродажи_Key && item.ЗаказПродажи_Key !== '00000000-0000-0000-0000-000000000000') ||
                          (item.Recorder && String(item.Recorder).includes('Заказ'));
          
          if (!hasOrder && !isReserveContent) return;

          // Определяем количество
          const qty = Number(item.КоличествоОстаток || item.Количество || 0);
          if (qty === 0) return;

          if (isBalanceRegister) {
            const currentReserve = reserveMap.get(itemId) || 0;
            reserveMap.set(itemId, Number((currentReserve + qty).toFixed(3)));
          } else {
            // Для обычных регистров накопления важен RecordType
            const uniqueKey = `${item.Period}_${item.LineNumber ?? '0'}_${item.Recorder_Key ?? 'no-reg'}_${itemId}_${item.Количество}_${item.RecordType}`;
            
            if (!processedUniqueKeys.has(uniqueKey)) {
              const type = String(item.RecordType);
              // 0 = Приход (увеличение резерва), 1 = Расход (уменьшение резерва)
              const isPlus = type === 'Receipt' || type === '0' || type === 'true';
              
              const currentReserve = reserveMap.get(itemId) || 0;
              // В UNF 'Запасы' (Receipt/Приход) — это уменьшение товара на складе (увеличение резерва)
              // Expense/Расход — это уменьшение резерва.
              // Применяем Math.abs, так как в 1С движения резерва могут приходить с разными знаками, 
              // а нам нужно ПОЛОЖИТЕЛЬНОЕ число для отображения 'В РЕЗЕРВЕ 6'.
              const diff = isPlus ? qty : -qty;
              const newReserve = Number((currentReserve + diff).toFixed(3));
              
              // DEBUG: Логируем Ножку для проверки расчёта резерва
              if (itemId.includes('efc175de-002f-11f1-9078-fa163e5c9fa8')) {
                 console.log(`[RESERVE CALC] Ножка: ${isPlus ? '+' : '-'}${qty}, было: ${currentReserve}, стало: ${newReserve} (Type: ${type})`);
              }
              
              reserveMap.set(itemId, newReserve);
              processedUniqueKeys.add(uniqueKey);
            }
          }
        };

        if (record.RecordSet && Array.isArray(record.RecordSet)) {
          record.RecordSet.forEach(processItem);
        } else {
          processItem(record);
        }
      });

      console.log(`Итого резервов рассчитано: ${reserveMap.size} товаров`);
      return reserveMap;
    } catch (err: any) {
      console.error(`Ошибка загрузки резервов:`, err);
      return new Map<string, number>();
    }
  }

  function calculateBalances(movements: Movement[]) {
    // ВАЖНО: Мы ВСЕГДА создаем новый Map, чтобы не прибавлять к старым значениям
    const balanceMap = new Map<string, number>();
    const lastPriceMap = new Map<string, number>();
    const warehouseMap = new Map<string, Set<string>>(); // itemId -> Set of lastWarehouseIds

    // 1. Считаем остатки на складах
    movements.forEach(m => {
      if (!m.itemId) return;
      
      const currentValue = balanceMap.get(m.itemId) || 0;
      const typeStr = String(m.type);
      
      // 1С OData RecordType: 'Receipt' (0) или 'Expense' (1)
      const isReceipt = typeStr === 'Receipt' || typeStr === '0' || typeStr === 'true';
      const isExpense = typeStr === 'Expense' || typeStr === '1' || typeStr === 'false';
      
      const qty = Number(m.quantity) || 0;
      
      if (m.warehouseId && m.warehouseId !== 'undefined' && m.warehouseId !== 'null') {
        if (!warehouseMap.has(m.itemId)) {
          warehouseMap.set(m.itemId, new Set());
        }
        warehouseMap.get(m.itemId)?.add(m.warehouseId);
      }

      if (isReceipt) {
        const newValue = currentValue + qty;
        balanceMap.set(m.itemId, Number(newValue.toFixed(3)));
        if (m.price && m.price > 0) {
          lastPriceMap.set(m.itemId, m.price);
        }
      } else if (isExpense) {
        const newValue = currentValue - qty;
        balanceMap.set(m.itemId, Number(newValue.toFixed(3)));
      } else {
        // Fallback если тип не распознан (считаем как приход)
        const newValue = currentValue + qty;
        balanceMap.set(m.itemId, Number(newValue.toFixed(3)));
      }
    });

    console.log(`ИТОГОВЫЙ РАСЧЕТ: Остатки: ${balanceMap.size}, Движений: ${movements.length}`);
    return { balanceMap, lastPriceMap, warehouseMap };
  }

  async function fetchWarehouses() {
    try {
      const registers = [
        'Catalog_СтруктурныеЕдиницы',
        'Catalog_Склады'
      ];

      for (const reg of registers) {
        try {
          const items = await fetchOData(reg, { '$select': 'Ref_Key,Description' });
          if (items && items.length > 0) {
            return items.map((w: any) => ({ id: w.Ref_Key, name: w.Description }));
          }
        } catch (e) {
          continue;
        }
      }
      return [];
    } catch (err) {
      return [];
    }
  }

  return {
    loading,
    error,
    fetchNomenclature,
    fetchCategories,
    fetchPrices,
    fetchUnits,
    fetchMovements,
    calculateBalances,
    fetchReserves,
    fetchWarehouses
  };
}

