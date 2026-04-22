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
const authUser = import.meta.env.VITE_1C_USERNAME;
const authPass = import.meta.env.VITE_1C_PASSWORD;
const warehouseGuid = import.meta.env.VITE_1C_WAREHOUSE_GUID;
const userGuid = '8f0ba0e0-2143-11f1-8d64-fa163e5c9fa8'; 

// Функция для безопасного создания B64 (поддержка кириллицы в логине/пароле если нужно)
function getAuthToken() {
  if (!authUser || !authPass) return '';
  try {
    return 'Basic ' + btoa(unescape(encodeURIComponent(`${authUser}:${authPass}`)));
  } catch (e) {
    console.error('Ошибка создания Auth Token:', e);
    return '';
  }
}

const authToken = getAuthToken();

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
      
      const headers: Record<string, string> = {
        'Accept': 'application/json'
      };
      
      if (authToken) {
        headers['Authorization'] = authToken;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[1C Response Error]: ${response.status} ${response.statusText}`, errorText);
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

  async function postOData(endpoint: string, data: any) {
    const url = `${baseURL}/odata/standard.odata/${endpoint}?$format=json`;
    
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    
    if (authToken) {
      headers['Authorization'] = authToken;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[1C POST Error]: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`1C Error: ${response.status} ${response.statusText}: ${errorText}`);
    }

    return await response.json();
  }

  async function patchOData(endpoint: string, data: any) {
    const url = `${baseURL}/odata/standard.odata/${endpoint}?$format=json`;
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    if (authToken) headers['Authorization'] = authToken;

    const response = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`1C PATCH Error: ${response.status}: ${errorText}`);
    }
  }

  async function createNomenclature(data: any) {
    try {
      // Для 1С:УНФ важно указать тип номенклатуры (Запас, Услуга и т.д.)
      // По умолчанию создаем как "Запас" (Inventory)
      const payload: any = {
        Description: data.Description,
        Артикул: data.Артикул || '',
        ЕдиницаИзмерения_Key: data.ЕдиницаИзмерения_Key,
        ТипНоменклатуры: data.ТипНоменклатуры || 'Запас',
        Склад_Key: data.Склад_Key || '344cfb30-e233-11f0-862e-fa163e5c9fa8'
      };

      // Если Категория не GUID (например '1'), то не шлем её, чтобы не было ошибки 400
      if (data.КатегорияНоменклатуры_Key && data.КатегорияНоменклатуры_Key.length > 20) {
        payload.КатегорияНоменклатуры_Key = data.КатегорияНоменклатуры_Key;
      }
      
      const result = await postOData('Catalog_Номенклатура', payload);
      return {
        id: result.Ref_Key,
        name: result.Description,
        sku: result.Артикул || '',
        unitId: result.ЕдиницаИзмерения_Key
      };
    } catch (err) {
      console.error('Ошибка создания номенклатуры в 1С:', err);
      throw err;
    }
  }

  async function setPrice(nomenclatureId: string, price: number) {
    try {
      // 1С:УНФ Фреш/OData часто требует строгого соответствия типов.
      // Цена должна быть числом, а периоды - в ISO.
      const now = new Date();
      // Испольуем формат с секундами и 'Z', чтобы 1С поняла UTC
      const dateString = now.toISOString().split('.')[0] + 'Z';
      
      const payload: any = {
        "@odata.type": "StandardODATA.InformationRegister_ЦеныНоменклатуры_RecordType",
        Period: dateString, 
        Номенклатура_Key: nomenclatureId,
        Характеристика_Key: '00000000-0000-0000-0000-000000000000',
        ВидЦены_Key: '7a8dcd90-da53-11ef-810a-00155d01ef06', 
        Цена: Number(price),
        Валюта_Key: '3ec96d36-da51-11ef-810a-00155d01ef06'
      };
      
      console.log('DEBUG: Отправка цены в 1С (Финальная попытка):', JSON.stringify(payload, null, 2));
      return await postOData('InformationRegister_ЦеныНоменклатуры', payload);
    } catch (err) {
      console.error('Ошибка установки цены в 1С:', err);
    }
  }

  // Добавим функцию для поиска правильного GUID пользователя
  async function debugUsers() {
    try {
      const users = await fetchOData('Catalog_Пользователи', { '$select': 'Ref_Key,Description' });
      console.log('DEBUG: Список всех пользователей в вашей 1С:', users);
    } catch (e) {
      console.warn('Не удалось загрузить список пользователей:', e);
    }
  }

  async function uploadToTempStorage(file: File): Promise<string> {
    const tempGuid = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });

    let apiBaseURL = baseURL;
    if (apiBaseURL.includes('/a/sbm/3784912')) {
      apiBaseURL = apiBaseURL.replace('/a/sbm/3784912', '');
    }

    const url = `${apiBaseURL}/ru_RU/e1cib/files/${tempGuid}`;
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authToken
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('uploadToTempStorage failed:', response.status, errorText);
      throw new Error(`Upload to temp storage failed: ${response.status}`);
    }

    const tempPath = await response.text();
    return tempPath;
  }

  async function attachFileToNomenclature(
    nomenclatureId: string,
    tempStoragePath: string,
    fileName: string,
    fileExtension: string
  ): Promise<string> {
    let apiBaseURL = baseURL;
    if (apiBaseURL.includes('/a/sbm/3784912')) {
      apiBaseURL = apiBaseURL.replace('/a/sbm/3784912', '');
    }
    const payload: any = {
      name: 'ДобавитьФайл',
      '#param': [
        '4238019D-7E49-4FC9-91DB-B6B951D5CF8E',
        '9B6ABF8B-0173-48E5-B0A0-83B21FCF63C5'
      ],
      param: [
        {
          Property: [
            { name: 'Автор', Value: undefined },
            { name: 'ВладелецФайлов', '#Value': '4B1B49CB-5430-4F80-9818-A1CEF1B3D410', Value: nomenclatureId },
            { name: 'ИмяБезРасширения', '#Value': '9B6ABF8B-0173-48E5-B0A0-83B21FCF63C5', Value: fileName.replace(`.${fileExtension}`, '') },
            { name: 'РасширениеБезТочки', '#Value': '9B6ABF8B-0173-48E5-B0A0-83B21FCF63C5', Value: fileExtension },
            { name: 'ВремяИзмененияУниверсальное', Value: undefined },
            { name: 'ГруппаФайлов', Value: undefined },
            { name: 'Служебный', '#Value': '5D4125AD-F6E7-4313-BE32-F71D0AB60915', Value: false }
          ]
        },
        tempStoragePath,
        {}
      ]
    };

    const url = `${apiBaseURL}/ru_RU/e1cib/command`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('attachFileToNomenclature failed:', response.status, errorText);
      throw new Error(`Attach failed: ${response.status}`);
    }

    const result: any = await response.json();
    return result?.response?.ret;
  }

  async function uploadImage(nomenclatureId: string, base64Image: string, fileName: string) {
    const extension = fileName.split('.').pop()?.toLowerCase() || 'jpg';
    const nameWithoutExt = fileName.replace(`.${extension}`, '');
    let cleanBase64 = base64Image;
    if (cleanBase64.includes('base64,')) {
      cleanBase64 = cleanBase64.split('base64,')[1] || '';
    }
     // ФОРМИРУЕМ ДАТУ В ПРАВИЛЬНОМ ФОРМАТЕ
    const now = new Date();
    // Формат: YYYY-MM-DDThh:mm:ss (без миллисекунд)
    const nowString = now.toISOString().split('.')[0]; // "2026-04-16T10:30:45"
  
    const payload = {
      ВладелецФайла_Key: nomenclatureId,
      Description: nameWithoutExt,
      DeletionMark: false,
      Автор: userGuid,
      Автор_Type: 'StandardODATA.Catalog_Пользователи',
      //Изменил: userGuid,
      //Изменил_Type: 'StandardODATA.Catalog_Пользователи',
      ДатаСоздания: nowString, 
      ДатаМодификацииУниверсальная: nowString,
      //Редактирует: '00000000-0000-0000-0000-000000000000',
      //Редактирует_Type: 'StandardODATA.Undefined',
      Зашифрован: false,
      ИндексКартинки: 0,
      Описание: '',
      ПодписанЭП: false,
      ПутьКФайлу: '',
      Размер: Math.round(cleanBase64.length * 0.75),
      Расширение: extension,
      СтатусИзвлеченияТекста: 'НеИзвлечен',
      ТипХраненияФайла: 'ВИнформационнойБазе',
      Том_Key: '00000000-0000-0000-0000-000000000000'
    };
    // Для отладки: выводим payload в консоль
    console.log('[1C uploadImage payload]', payload);
    
    const result = await postOData('Catalog_НоменклатураПрисоединенныеФайлы', payload);
    const fileKey = result.Ref_Key;

    // Шаг 2: Загружаем само тело файла (картинку) через PUT в созданный ресурс
    const binaryString = atob(cleanBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const odataBaseURL = import.meta.env.VITE_1C_BASE_URL || '/api-1c';
    const putUrl = `${odataBaseURL}/odata/standard.odata/Catalog_НоменклатураПрисоединенныеФайлы(guid'${fileKey}')/ФайлХранилище/$value`;
    const putResponse = await fetch(putUrl, {
      method: 'PUT',
      headers: {
        'Authorization': authToken,
        'Content-Type': 'application/octet-stream'
      },
      body: bytes
    });

    if (!putResponse.ok) {
      const errorText = await putResponse.text();
      console.error('Ошибка PUT ТекстХранилище:', putResponse.status, errorText);
    }
    
    await patchOData(`Catalog_Номенклатура(guid'${nomenclatureId}')`, {
      ФайлКартинки_Key: fileKey,
      ОсновнаяКартинка_Key: fileKey
    });
    
    return fileKey;
  }

  async function createMaterialWithImage(
    materialData: { Description: string; Артикул?: string; ЕдиницаИзмерения_Key: string; ТипНоменклатуры?: string },
    imageFile: File
  ) {
    try {
      // 1. Создаём материал
      const material = await createNomenclature(materialData);
      console.log('✅ 1. Материал создан:', material.id);

      // 2. Загружаем файл во временное хранилище
      const tempPath = await uploadToTempStorage(imageFile);
      console.log('✅ 2. Файл во временном хранилище:', tempPath);

      // 3. Привязываем файл из временного хранилища к номенклатуре
      const extension = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const attachedFileId = await attachFileToNomenclature(
        material.id,
        tempPath,
        imageFile.name,
        extension
      );
      console.log('✅ 3. Файл привязан к номенклатуре. GUID файла:', attachedFileId);

      // 4. Устанавливаем привязанный файл как основную картинку
      if (attachedFileId) {
        await patchOData(`Catalog_Номенклатура(guid'${material.id}')`, {
          ФайлКартинки_Key: attachedFileId,
          ОсновнаяКартинка_Key: attachedFileId
        });
        console.log('✅ 4. Файл установлен как основная картинка.');
      } else {
        console.warn('⚠️ GUID файла не получен, картинка не установлена.');
      }

      return material;
    } catch (err) {
      console.error('Ошибка createMaterialWithImage:', err);
      throw err;
    }
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
      'InformationRegister_ЦеныНоменклатуры',
      'InformationRegister_ЦеныНоменклатурыИХарактеристик'
    ];

    for (const register of priceRegisters) {
      try {
        const params: Record<string, string> = { 
          '$select': 'Номенклатура_Key,Цена,Period', 
          '$orderby': 'Period desc', 
          '$top': '5000' 
        };

        const items = await fetchOData(register, params);
        if (Array.isArray(items) && items.length > 0) {
          const getNomId = (p: any) => p.Номенклатура_Key || p.Номенклатура;
          const getPrice = (p: any) => p.Цена || 0;
          
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
      
      if (records && Array.isArray(records)) {
        records.forEach((record: any) => {
          // Если запись пришла в виде набора (RecordSet), как в вашем случае
          if (record.RecordSet && Array.isArray(record.RecordSet)) {
            record.RecordSet.forEach((item: any) => {
              const itemId = item.Номенклатура_Key || item.Item_Key;
              if (!itemId) return;
              
              const type = String(item.RecordType);
              const isReceipt = type === 'Receipt' || type === '0' || type === 'true' || type === 'Active';
              
              movements.push({
                period: item.Period,
                itemId: itemId,
                quantity: Number(item.Количество) || 0,
                type: isReceipt ? 'Receipt' : 'Expense',
                lineNumber: item.LineNumber,
                warehouseId: item.Склад_Key || item.СтруктурнаяЕдиница_Key
              });
            });
          } else {
            // Если запись пришла плоским списком (стандартный формат)
            const itemId = record.Номенклатура_Key || record.Item_Key;
            if (!itemId) return;
            
            const type = String(record.RecordType);
            const isReceipt = type === 'Receipt' || type === '0' || type === 'true' || type === 'Active';
            
            movements.push({
              period: record.Period,
              itemId: itemId,
              quantity: Number(record.Количество) || 0,
              type: isReceipt ? 'Receipt' : 'Expense',
              lineNumber: record.LineNumber,
              warehouseId: record.Склад_Key || record.СтруктурнаяЕдиница_Key
            });
          }
        });
      }
      
      return movements;
    } catch (err) { 
      return []; 
    }
  }

  async function fetchReserves(): Promise<Map<string, { total: number, details: Map<string, number> }>> {
    try {
      const records = await fetchOData('AccumulationRegister_Запасы', { '$top': '50000' });
      const reserveMap = new Map<string, { total: number, details: Map<string, number> }>();
      
      if (records && Array.isArray(records)) {
        records.forEach((record: any) => {
          const items = (record.RecordSet && Array.isArray(record.RecordSet)) ? record.RecordSet : [record];
          
          items.forEach((item: any) => {
            const itemId = item.Номенклатура_Key;
            if (!itemId) return;
            
            const orderId = item.ЗаказПокупателя_Key || item.Заказ_Key;
            const hasOrder = orderId && orderId !== '00000000-0000-0000-0000-000000000000';
            
            if (!hasOrder) return;
            
            const qty = Number(item.Количество) || 0;
            const type = String(item.RecordType);
            const isPlus = type === 'Receipt' || type === '0' || type === 'true' || type === 'Active';
            const finalQty = isPlus ? qty : -qty;
            
            if (!reserveMap.has(itemId)) {
              reserveMap.set(itemId, { total: 0, details: new Map<string, number>() });
            }
            
            const itemReserve = reserveMap.get(itemId)!;
            itemReserve.total = Number((itemReserve.total + finalQty).toFixed(3));
            
            const orderQty = itemReserve.details.get(orderId) || 0;
            itemReserve.details.set(orderId, Number((orderQty + finalQty).toFixed(3)));
          });
        });
      }
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
      const isReceipt = typeStr === 'Receipt' || typeStr === '0' || typeStr === 'true' || typeStr === 'Active';
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
      // Прямой запрос без $expand, так как 1С Fresh часто его не поддерживает для табличных частей
      const orders = await fetchOData('Document_ЗаказПокупателя', {
        '$orderby': 'Date desc',
        '$top': '500',
        '$select': 'Ref_Key,Number,Date,СуммаДокумента,СостояниеЗаказа,СостояниеЗаказа____Presentation,Контрагент_Key,Контрагент____Presentation'
      });
      
      return (orders || []).map((order: any) => ({
        id: order.Ref_Key,
        number: order.Number,
        date: order.Date,
        customerRef: order.Контрагент_Key,
        customerName: order.Контрагент____Presentation,
        amount: order.СуммаДокумента || 0,
        statusKey: order.СостояниеЗаказа,
        statusDescription: order.СостояниеЗаказа____Presentation,
        items: [] // Данные будут загружены отдельно через fetchOrderItems при необходимости
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

  async function fetchOrderItems(orderId: string) {
    try {
      // Пытаемся получить табличную часть через прямой запрос к коллекции Запасы
      // 1С OData часто ожидает путь вида Document_ЗаказПокупателя(guid'...')/Запасы
      // API 1С Fresh часто возвращает данные в свойстве Номенклатура_Presentation (без 4 подчеркиваний)
      // или требует явного перечисления в $select
      const selectFields = 'LineNumber,Номенклатура_Key,Номенклатура____Presentation,Номенклатура_Presentation,Количество,Цена,Сумма,ЕдиницаИзмерения_Key';
      const url = `${baseURL}/odata/standard.odata/Document_ЗаказПокупателя(guid'${orderId}')/Запасы?$format=json&$select=${selectFields}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': authToken,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        // Если прямой путь не сработал, пробуем через $filter (старый способ)
        console.warn(`Direct path failed (${response.status}), falling back to filter...`);
        const items = await fetchOData('Document_ЗаказПокупателя_Запасы', {
          '$filter': `Ref_Key eq guid'${orderId}'`,
          '$select': selectFields
        });
        return (items || []).map(mapItem);
      }

      const data = await response.json();
      const rawItems = data.value || [];
      return rawItems.map((item: any) => mapItem(item));

      function mapItem(item: any) {
        return {
          id: item.LineNumber || String(Math.random()),
          productId: item.Номенклатура_Key || item.Номенклатура,
          productName: item.Номенклатура____Presentation || item.Номенклатура_Presentation || 'Неизвестный товар',
          quantity: item.Количество || 0,
          price: item.Цена || 0,
          total: item.Сумма || 0,
          unitId: item.ЕдиницаИзмерения_Key || item.ЕдиницаИзмерения
        };
      }
    } catch (err) {
      console.error(`Error fetching items for order ${orderId}:`, err);
      return [];
    }
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
    fetchOrderStates,
    fetchOrderItems,
    createNomenclature,
    setPrice,
    uploadToTempStorage,
    attachFileToNomenclature,
    createMaterialWithImage
  };
}
