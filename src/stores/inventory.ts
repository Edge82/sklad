import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { InventoryItem, InventoryCategory, InventoryTransaction, Supplier, InventoryStats } from '@/types'

export const useInventoryStore = defineStore('inventory', () => {
  // Категории материалов для мебельного производства
  const categories = ref<InventoryCategory[]>([
    { id: '1', name: 'Древесина', icon: 'leaf-outline', description: 'Массив, МДФ, ДСП, фанера' },
    { id: '2', name: 'Фурнитура', icon: 'construct-outline', description: 'Ручки, петли, направляющие' },
    { id: '3', name: 'Отделочные материалы', icon: 'color-palette-outline', description: 'Лаки, краски, клей' },
    { id: '4', name: 'Стекло и зеркала', icon: 'diamond-outline', description: 'Стекла, зеркала' },
    { id: '5', name: 'Ткани и наполнители', icon: 'bed-outline', description: 'Ткани, поролон, синтепон' },
    { id: '6', name: 'Крепеж', icon: 'hammer-outline', description: 'Саморезы, гвозди, болты' },
    { id: '7', name: 'Упаковочные материалы', icon: 'cube-outline', description: 'Пленка, картон, скотч' },
    { id: '8', name: 'Электроника', icon: 'flash-outline', description: 'Светильники, провода' },
    { id: '99', name: 'Готовая продукция', icon: 'checkmark-done-outline', description: 'Произведенная мебель, готовая к отгрузке' }
  ])

  // Поставщики
  const suppliers = ref<Supplier[]>([
    {
      id: '1',
      name: 'ЛесПром Трейд',
      contactPerson: 'Иванов Алексей',
      phone: '+7 (999) 111-22-33',
      email: 'info@lesprom.ru',
      address: 'г. Москва, ул. Лесная, д. 15',
      materials: ['Древесина', 'Фанера'],
      rating: 4.8,
      deliveryTime: 3,
      paymentTerms: '30 дней',
      isActive: true
    },
    {
      id: '2',
      name: 'МебельФурнитура',
      contactPerson: 'Петрова Мария',
      phone: '+7 (999) 222-33-44',
      email: 'sales@mebel-furnitura.ru',
      address: 'г. Санкт-Петербург, пр. Металлистов, д. 8',
      materials: ['Фурнитура', 'Крепеж'],
      rating: 4.5,
      deliveryTime: 2,
      paymentTerms: 'Предоплата 50%',
      isActive: true
    },
    {
      id: '3',
      name: 'Краски и Лаки',
      contactPerson: 'Сидоров Дмитрий',
      phone: '+7 (999) 333-44-55',
      email: 'order@krasilak.ru',
      address: 'г. Екатеринбург, ул. Химическая, д. 12',
      materials: ['Отделочные материалы'],
      rating: 4.2,
      deliveryTime: 5,
      paymentTerms: '100% предоплата',
      isActive: true
    }
  ])

  // Инвентарь с демо-данными
  const items = ref<InventoryItem[]>([
    {
      id: '1',
      name: 'Дубовая доска 40мм',
      sku: 'WOOD-DUB-40-001',
      barcode: '5901234567890',
      category: 'Древесина',
      categoryId: '1',
      description: 'Дуб массив, толщина 40мм, сорт А',
      unit: 'шт',
      currentStock: 45,
      minStock: 20,
      maxStock: 100,
      reserved: 10,
      available: 35,
      location: 'A-01-12',
      dimensions: '2000x200x40 мм',
      weight: 8.5,
      storageConditions: 'Сухое помещение',
      purchasePrice: 2500,
      averagePrice: 2450,
      lastPurchasePrice: 2550,
      totalValue: 110250,
      mainSupplier: 'ЛесПром Трейд',
      alternativeSuppliers: ['ДревТорг', 'Лесной склад'],
      supplierCode: 'LP-001',
      deliveryTime: 3,
      minOrderQuantity: 10,
      totalConsumed: 156,
      popularity: 9,
      status: 'in_stock',
      materialType: 'дерево',
      thickness: 40,
      length: 2000,
      width: 200,
      grade: 'A',
      imageUrl: '',
      lastReceived: new Date('2024-01-20'),
      lastIssued: new Date('2024-01-21'),
      createdAt: new Date('2023-01-15'),
      updatedAt: new Date('2024-01-20')
    },
    {
      id: '2',
      name: 'Фанера берёзовая 18мм',
      sku: 'PLY-BIR-18-001',
      barcode: '5901234567891',
      category: 'Древесина',
      categoryId: '1',
      description: 'Берёзовая фанера, влагостойкая',
      unit: 'лист',
      currentStock: 12,
      minStock: 15,
      maxStock: 50,
      reserved: 5,
      available: 7,
      location: 'A-02-05',
      dimensions: '1525x1525x18 мм',
      weight: 22,
      storageConditions: 'Сухое помещение',
      purchasePrice: 3200,
      averagePrice: 3150,
      lastPurchasePrice: 3300,
      totalValue: 37800,
      mainSupplier: 'ЛесПром Трейд',
      alternativeSuppliers: ['ФанераПро'],
      supplierCode: 'LP-002',
      deliveryTime: 2,
      minOrderQuantity: 5,
      totalConsumed: 89,
      popularity: 8,
      status: 'low_stock',
      materialType: 'фанера',
      thickness: 18,
      grade: 'B',
      imageUrl: '',
      lastReceived: new Date('2024-01-18'),
      lastIssued: new Date('2024-01-22'),
      createdAt: new Date('2023-02-10'),
      updatedAt: new Date('2024-01-22')
    },
    {
      id: '3',
      name: 'МДФ ламинированный 16мм',
      sku: 'MDF-LAM-16-001',
      barcode: '5901234567892',
      category: 'Древесина',
      categoryId: '1',
      description: 'Ламинированный МДФ, белый матовый',
      unit: 'лист',
      currentStock: 28,
      minStock: 10,
      maxStock: 40,
      reserved: 8,
      available: 20,
      location: 'A-03-08',
      dimensions: '2800x2070x16 мм',
      weight: 35,
      storageConditions: 'Сухое помещение',
      purchasePrice: 2800,
      averagePrice: 2750,
      lastPurchasePrice: 2850,
      totalValue: 77000,
      mainSupplier: 'МебельМатериалы',
      alternativeSuppliers: ['МДФСклад'],
      supplierCode: 'MM-001',
      deliveryTime: 4,
      minOrderQuantity: 2,
      totalConsumed: 67,
      popularity: 7,
      status: 'in_stock',
      materialType: 'МДФ',
      thickness: 16,
      color: 'белый',
      grade: 'A',
      imageUrl: '',
      lastReceived: new Date('2024-01-15'),
      lastIssued: new Date('2024-01-21'),
      createdAt: new Date('2023-03-05'),
      updatedAt: new Date('2024-01-21')
    },
    {
      id: '4',
      name: 'Петли скрытые Blum',
      sku: 'HARD-BLM-001',
      barcode: '5901234567893',
      category: 'Фурнитура',
      categoryId: '2',
      description: 'Петли скрытого монтажа Blum, 110°',
      unit: 'шт',
      currentStock: 245,
      minStock: 100,
      maxStock: 500,
      reserved: 50,
      available: 195,
      location: 'B-01-15',
      weight: 0.15,
      storageConditions: 'Стандартные условия',
      purchasePrice: 150,
      averagePrice: 145,
      lastPurchasePrice: 155,
      totalValue: 35525,
      mainSupplier: 'МебельФурнитура',
      alternativeSuppliers: ['ФурнитураЭксперт'],
      supplierCode: 'MF-001',
      deliveryTime: 1,
      minOrderQuantity: 20,
      totalConsumed: 456,
      popularity: 9,
      status: 'in_stock',
      materialType: 'металл',
      imageUrl: '',
      lastReceived: new Date('2024-01-10'),
      lastIssued: new Date('2024-01-22'),
      createdAt: new Date('2023-04-12'),
      updatedAt: new Date('2024-01-22')
    },
    {
      id: '5',
      name: 'Направляющие шариковые 500мм',
      sku: 'HARD-SLD-500-001',
      barcode: '5901234567894',
      category: 'Фурнитура',
      categoryId: '2',
      description: 'Направляющие шариковые полного выдвижения',
      unit: 'пара',
      currentStock: 8,
      minStock: 20,
      maxStock: 100,
      reserved: 3,
      available: 5,
      location: 'B-02-03',
      weight: 0.8,
      storageConditions: 'Стандартные условия',
      purchasePrice: 450,
      averagePrice: 440,
      lastPurchasePrice: 460,
      totalValue: 3520,
      mainSupplier: 'МебельФурнитура',
      alternativeSuppliers: ['НаправляющиеРФ'],
      supplierCode: 'MF-002',
      deliveryTime: 2,
      minOrderQuantity: 5,
      totalConsumed: 123,
      popularity: 8,
      status: 'low_stock',
      materialType: 'металл',
      imageUrl: '',
      lastReceived: new Date('2024-01-05'),
      lastIssued: new Date('2024-01-18'),
      createdAt: new Date('2023-05-20'),
      updatedAt: new Date('2024-01-18')
    },
    {
      id: '6',
      name: 'Лак акриловый матовый',
      sku: 'FIN-ACR-001',
      barcode: '5901234567895',
      category: 'Отделочные материалы',
      categoryId: '3',
      description: 'Акриловый лак для дерева, матовый, 5л',
      unit: 'банка',
      currentStock: 3,
      minStock: 5,
      maxStock: 20,
      reserved: 0,
      available: 3,
      location: 'C-01-07',
      weight: 6.5,
      storageConditions: '+5°C до +25°C',
      purchasePrice: 2800,
      averagePrice: 2750,
      lastPurchasePrice: 2850,
      totalValue: 8250,
      mainSupplier: 'Краски и Лаки',
      alternativeSuppliers: ['Лакокраска'],
      supplierCode: 'KL-001',
      deliveryTime: 3,
      minOrderQuantity: 1,
      totalConsumed: 34,
      popularity: 6,
      status: 'low_stock',
      materialType: 'химия',
      imageUrl: '',
      lastReceived: new Date('2024-01-10'),
      lastIssued: new Date('2024-01-19'),
      createdAt: new Date('2023-06-15'),
      updatedAt: new Date('2024-01-19')
    },
    {
      id: '7',
      name: 'Стекло закаленное 8мм',
      sku: 'GLAS-TEM-8-001',
      barcode: '5901234567896',
      category: 'Стекло и зеркала',
      categoryId: '4',
      description: 'Закаленное стекло, прозрачное',
      unit: 'м²',
      currentStock: 24.5,
      minStock: 10,
      maxStock: 50,
      reserved: 8.5,
      available: 16,
      location: 'D-01-12',
      weight: 20,
      storageConditions: 'Защита от ударов',
      purchasePrice: 3200,
      averagePrice: 3150,
      lastPurchasePrice: 3300,
      totalValue: 77175,
      mainSupplier: 'СтеклоПро',
      alternativeSuppliers: ['СтеклоМир'],
      supplierCode: 'SP-001',
      deliveryTime: 7,
      minOrderQuantity: 0.5,
      totalConsumed: 45.5,
      popularity: 7,
      status: 'in_stock',
      materialType: 'стекло',
      thickness: 8,
      imageUrl: '',
      lastReceived: new Date('2024-01-12'),
      lastIssued: new Date('2024-01-21'),
      createdAt: new Date('2023-07-10'),
      updatedAt: new Date('2024-01-21')
    },
    {
      id: '8',
      name: 'Ткань мебельная "Велюр"',
      sku: 'FAB-VEL-001',
      barcode: '5901234567897',
      category: 'Ткани и наполнители',
      categoryId: '5',
      description: 'Мебельная ткань велюр, серый',
      unit: 'м',
      currentStock: 0,
      minStock: 20,
      maxStock: 100,
      reserved: 0,
      available: 0,
      location: 'E-01-05',
      weight: 0.35,
      storageConditions: 'Сухое темное место',
      purchasePrice: 850,
      averagePrice: 830,
      lastPurchasePrice: 870,
      totalValue: 0,
      mainSupplier: 'ТекстильМебель',
      alternativeSuppliers: ['ТканиОптом'],
      supplierCode: 'TM-001',
      deliveryTime: 5,
      minOrderQuantity: 10,
      totalConsumed: 156,
      popularity: 8,
      status: 'out_of_stock',
      materialType: 'ткань',
      color: 'серый',
      imageUrl: '',
      lastReceived: new Date('2024-01-05'),
      lastIssued: new Date('2024-01-20'),
      createdAt: new Date('2023-08-05'),
      updatedAt: new Date('2024-01-20'),
      type: 'material'
    },
    {
      id: 'prod-1',
      name: 'Кухонный гарнитур "Сканди"',
      sku: 'PRD-KCH-001',
      barcode: '990000000001',
      category: 'Готовая продукция',
      categoryId: '99',
      description: 'Готовый кухонный гарнитур, фасад белый матовый',
      unit: 'комплект',
      currentStock: 2,
      minStock: 0,
      maxStock: 5,
      reserved: 1,
      available: 1,
      location: 'FG-01-01',
      purchasePrice: 45000,
      averagePrice: 45000,
      lastPurchasePrice: 45000,
      totalValue: 90000,
      mainSupplier: 'Собственное производство',
      alternativeSuppliers: [],
      deliveryTime: 14,
      minOrderQuantity: 1,
      totalConsumed: 12,
      popularity: 10,
      status: 'in_stock',
      type: 'product',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15')
    },
    {
      id: 'prod-2',
      name: 'Шкаф-купе "Лофт"',
      sku: 'PRD-WRD-002',
      barcode: '990000000002',
      category: 'Готовая продукция',
      categoryId: '99',
      description: 'Шкаф-купе с зеркальными вставками',
      unit: 'шт',
      currentStock: 5,
      minStock: 1,
      maxStock: 10,
      reserved: 2,
      available: 3,
      location: 'FG-01-02',
      purchasePrice: 28000,
      averagePrice: 28000,
      lastPurchasePrice: 28000,
      totalValue: 140000,
      mainSupplier: 'Собственное производство',
      alternativeSuppliers: [],
      deliveryTime: 10,
      minOrderQuantity: 1,
      totalConsumed: 8,
      popularity: 9,
      status: 'in_stock',
      type: 'product',
      createdAt: new Date('2024-01-18'),
      updatedAt: new Date('2024-01-18')
    },
    {
      id: 'p1',
      name: 'Шкаф купе "Люкс"',
      sku: 'PRD-WRD-LUX-001',
      barcode: '990000000003',
      category: 'Готовая продукция',
      categoryId: '99',
      description: 'Шкаф купе премиум класса',
      unit: 'шт',
      currentStock: 10,
      minStock: 0,
      maxStock: 20,
      reserved: 0,
      available: 10,
      location: 'FG-01-03',
      purchasePrice: 45000,
      averagePrice: 45000,
      lastPurchasePrice: 45000,
      totalValue: 450000,
      mainSupplier: 'Собственное производство',
      alternativeSuppliers: [],
      deliveryTime: 14,
      minOrderQuantity: 1,
      totalConsumed: 0,
      popularity: 10,
      status: 'in_stock',
      type: 'product',
      orderNumber: 'ORD-2024-001',
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15')
    }
  ])

  // Транзакции
  const transactions = ref<InventoryTransaction[]>([
    {
      id: '1',
      itemId: '1',
      type: 'incoming',
      quantity: 20,
      unitPrice: 2550,
      totalPrice: 51000,
      documentNumber: 'INV-2024-001',
      documentType: 'invoice',
      sourceLocation: 'Поставщик',
      destinationLocation: 'A-01-12',
      reason: 'Пополнение запасов',
      createdBy: 'Иван Петров',
      createdAt: new Date('2024-01-20T10:30:00')
    },
    {
      id: '2',
      itemId: '1',
      type: 'outgoing',
      quantity: 5,
      unitPrice: 2450,
      totalPrice: 12250,
      documentNumber: 'PROD-2024-015',
      documentType: 'production',
      sourceLocation: 'A-01-12',
      destinationLocation: 'Производство',
      reason: 'Кухонный гарнитур №45',
      createdBy: 'Алексей Волков',
      createdAt: new Date('2024-01-21T14:20:00')
    },
    {
      id: '3',
      itemId: '2',
      type: 'outgoing',
      quantity: 3,
      unitPrice: 3150,
      totalPrice: 9450,
      documentNumber: 'PROD-2024-016',
      documentType: 'production',
      sourceLocation: 'A-02-05',
      destinationLocation: 'Производство',
      reason: 'Шкаф-купе №23',
      createdBy: 'Алексей Волков',
      createdAt: new Date('2024-01-22T09:15:00')
    },
    {
      id: 'txn-101',
      itemId: 'p1',
      type: 'incoming',
      quantity: 10,
      unitPrice: 45000,
      totalPrice: 450000,
      documentNumber: 'ORD-2024-001',
      documentType: 'production',
      sourceLocation: 'Цех производства',
      destinationLocation: 'FG-01-03',
      reason: 'Приход из производства по заказу ORD-2024-001 (Полная партия 10 шт.)',
      createdBy: 'Иван Петров',
      createdAt: new Date('2024-01-22T10:30:00')
    }
  ])

  // Computed свойства
  const totalItems = computed(() => items.value.length)
  const totalValue = computed(() => {
    return items.value.reduce((sum, item) => {
      const stock = Number(item.currentStock) || 0
      const price = Number(item.averagePrice) || 0
      return sum + (stock * price)
    }, 0)
  })

  const lowStockItems = computed(() =>
    items.value.filter(item => item.status === 'low_stock').length
  )

  const outOfStockItems = computed(() =>
    items.value.filter(item => item.status === 'out_of_stock').length
  )

  // Индексы для сверхбыстрого поиска O(1) при тысячах товаров
  const itemsMap = computed(() => {
    const map = new Map<string, InventoryItem>()
    items.value.forEach(item => {
      if (item.id) map.set(item.id, item)
      if (item.sku) map.set(item.sku, item)
      if (item.barcode) map.set(item.barcode, item)
    })
    return map
  })

  const inventoryStats = computed<InventoryStats>(() => {
    const categoryConsumption: Record<string, number> = {}

    items.value.forEach(item => {
      if (!categoryConsumption[item.category]) {
        categoryConsumption[item.category] = 0
      }
      categoryConsumption[item.category] = (categoryConsumption[item.category] || 0) + item.totalConsumed
    })

    return {
      totalItems: totalItems.value,
      totalValue: totalValue.value,
      lowStockItems: lowStockItems.value,
      outOfStockItems: outOfStockItems.value,
      categoriesCount: categories.value.length,
      recentTransactions: transactions.value.slice(0, 5),
      topItems: [...items.value]
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 5),
      consumptionByCategory: categoryConsumption
    }
  })

  // Методы
  const getItemById = (id: string) => {
    return items.value.find(item => item.id === id)
  }

  const getItemsByCategory = (categoryId: string) => {
    return items.value.filter(item => item.categoryId === categoryId)
  }

  const getItemUnit = (itemId: string) => {
    const item = items.value.find(i => i.id === itemId)
    return item?.unit || 'шт'
  }

  const getItemsByStatus = (status: InventoryItem['status']) => {
    return items.value.filter(item => item.status === status)
  }

  const updateStock = (itemId: string, quantity: number, type: InventoryTransaction['type'], transactionData: Partial<InventoryTransaction> = {}) => {
    const item = items.value.find(i => i.id === itemId)
    if (!item) return null

    // Обновляем остатки
    if (type === 'incoming') {
      const oldStock = Number(item.currentStock) || 0
      const oldPrice = Number(item.averagePrice) || 0
      const newQuantity = Number(quantity) || 0
      const newPrice = Number(transactionData.unitPrice) || oldPrice

      // Расчет новой средней цены: (Старый_остаток * Старая_цена + Приход * Новая_цена) / (Старый_остаток + Приход)
      const totalOldValue = oldStock * oldPrice
      const totalNewValue = newQuantity * newPrice
      const totalNewStock = oldStock + newQuantity

      if (totalNewStock > 0) {
        item.averagePrice = (totalOldValue + totalNewValue) / totalNewStock
      }

      item.currentStock = totalNewStock
      item.lastPurchasePrice = newPrice
      item.lastReceived = new Date()
      // Обновляем общую стоимость (totalValue)
      item.totalValue = item.currentStock * item.averagePrice
    } else if (type === 'outgoing' || type === 'write_off') {
      item.currentStock -= quantity
      item.lastIssued = new Date()
      // Обновляем общую стоимость
      item.totalValue = item.currentStock * item.averagePrice
    } else if (type === 'reservation') {
      item.reserved += quantity
    }

    // Обновляем доступное количество
    item.available = item.currentStock - item.reserved

    // Обновляем статус
    updateItemStatus(item)
    item.updatedAt = new Date()

    // Создаем транзакцию
    const unitPrice = type === 'incoming' 
      ? (Number(transactionData.unitPrice) || item.averagePrice) 
      : item.averagePrice

    const transaction: InventoryTransaction = {
      id: String(transactions.value.length + 1),
      itemId,
      type,
      quantity,
      unitPrice,
      totalPrice: quantity * unitPrice,
      createdBy: 'Система',
      createdAt: new Date(),
      ...transactionData
    }

    transactions.value.unshift(transaction)
    return transaction
  }

  const updateItemStatus = (item: InventoryItem) => {
    // If the status is 'on_order', we don't change it based on standard logic
    if (item.status === 'on_order' && (Number(item.currentStock) || 0) === 0) {
      return
    }

    const stock = Number(item.currentStock) || 0
    const reserved = Number(item.reserved) || 0
    const price = Number(item.averagePrice) || 0

    item.available = stock - reserved

    if (stock <= 0) {
      item.status = 'out_of_stock'
    } else if (stock <= Number(item.minStock || 0)) {
      item.status = 'low_stock'
    } else if (reserved > 0 && item.available <= Number(item.minStock || 0)) {
      item.status = 'reserved'
    } else {
      item.status = 'in_stock'
    }

    // Обновляем общую стоимость (индивидуальное поле товара)
    item.totalValue = stock * price
  }

  const addItem = (itemData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt' | 'available' | 'totalValue' | 'status'>) => {
    const catId = String(itemData.categoryId)
    const catObj = categories.value.find(c => String(c.id) === catId)
    
    // Безопасное приведение к числам
    const currentStock = Number(itemData.currentStock) || 0
    const reserved = Number(itemData.reserved) || 0
    const averagePrice = Number(itemData.averagePrice) || 0
    const minStock = Number(itemData.minStock) || 0
    const maxStock = Number(itemData.maxStock) || 0
    const purchasePrice = Number(itemData.purchasePrice) || 0
    const lastPurchasePrice = Number(itemData.lastPurchasePrice) || 0
    const deliveryTime = Number(itemData.deliveryTime) || 0
    const minOrderQuantity = Number(itemData.minOrderQuantity) || 0

    // Автоматическая генерация QR-штрихкода, если не указан
    const barcode = itemData.barcode || `MAT-${new Date().getFullYear().toString().substring(2)}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`

    const newItem: InventoryItem = {
      ...itemData,
      categoryId: catId,
      category: catObj ? catObj.name : 'Неизвестно',
      id: String(Math.max(0, ...items.value.map(i => parseInt(i.id))) + 1),
      barcode,
      currentStock,
      reserved,
      averagePrice,
      minStock,
      maxStock,
      purchasePrice,
      lastPurchasePrice,
      deliveryTime,
      minOrderQuantity,
      available: currentStock - reserved,
      totalValue: currentStock * averagePrice,
      status: 'in_stock',
      alternativeSuppliers: itemData.alternativeSuppliers || [],
      totalConsumed: itemData.totalConsumed || 0,
      popularity: itemData.popularity || 5,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    updateItemStatus(newItem)
    items.value.unshift(newItem)
    return newItem
  }

  const updateItem = (id: string, updates: Partial<InventoryItem>) => {
    const index = items.value.findIndex(item => item.id === id)
    if (index !== -1) {
      const finalUpdates = { ...updates }
      
      // Синхронизируем текстовую категорию, если изменили ID категории
      if (updates.categoryId) {
        finalUpdates.categoryId = String(updates.categoryId)
        const catObj = categories.value.find(c => String(c.id) === finalUpdates.categoryId)
        if (catObj) {
          finalUpdates.category = catObj.name
        }
      }

      // Безопасное приведение числовых полей
      const numericFields = ['currentStock', 'reserved', 'averagePrice', 'minStock', 'maxStock', 'purchasePrice', 'lastPurchasePrice', 'deliveryTime', 'minOrderQuantity'] as const
      numericFields.forEach(field => {
        if (field in updates) {
          const val = updates[field]
          if (val !== undefined) {
            // field mapping
            finalUpdates[field] = Number(val) || 0
          }
        }
      })

      items.value[index] = { ...items.value[index], ...finalUpdates, updatedAt: new Date() } as InventoryItem
      updateItemStatus(items.value[index])
    }
  }

  const deleteItem = (id: string) => {
    const index = items.value.findIndex(item => item.id === id)
    if (index !== -1) {
      items.value.splice(index, 1)
    }
  }

  const getStatusLabel = (status: InventoryItem['status']) => {
    const statusMap: Record<InventoryItem['status'], string> = {
      'in_stock': 'В наличии',
      'low_stock': 'Мало осталось',
      'out_of_stock': 'Отсутствует',
      'reserved': 'Зарезервировано',
      'on_order': 'В пути',
      'blocked': 'Заблокировано'
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status: InventoryItem['status']): 'success' | 'warning' | 'error' | 'info' | 'primary' | 'default' => {
    const colorMap: Record<InventoryItem['status'], 'success' | 'warning' | 'error' | 'info' | 'primary' | 'default'> = {
      'in_stock': 'success',
      'low_stock': 'warning',
      'out_of_stock': 'error',
      'reserved': 'info',
      'on_order': 'primary',
      'blocked': 'default'
    }
    return colorMap[status] || 'default'
  }

  const getTransactionsByItem = (itemId: string) => {
    return transactions.value.filter(transaction => transaction.itemId === itemId)
  }

  const generateReport = (type: 'stock' | 'value' | 'consumption') => {
    // Генерация отчета
    return {
      title: `Отчет по ${type === 'stock' ? 'остаткам' : type === 'value' ? 'стоимости' : 'потреблению'}`,
      data: items.value,
      generatedAt: new Date()
    }
  }

  // Метод для автоматического прихода готовой продукции из производства
  const receiveFromProduction = (productId: string, quantity: number, orderNumber: string, workerName: string) => {
    // Ищем товар в справочнике готовой продукции по ID или Артикулу (SKU)
    let item = items.value.find(i => i.id === productId || i.sku === productId)
    
    // Если по ID не нашли, пробуем найти по точному имени (иногда в QR записывается имя)
    if (!item) {
      item = items.value.find(i => i.type === 'product' && i.name === productId)
    }

    // Дополнительная проверка по productName из QR (если productId - это ID, а нам нужно имя)
    // Но в базовой логике Scan.vue передает именно productId из объекта QR

    if (item) {
      if (!item.orderNumber) {
        item.orderNumber = orderNumber
      }
      updateStock(item.id, quantity, 'incoming', {
        documentNumber: orderNumber,
        documentType: 'production',
        reason: `Приход из производства по заказу ${orderNumber}`,
        createdBy: workerName,
        sourceLocation: 'Цех производства',
        destinationLocation: item.location
      })
      return true
    } else {
      // АВТО-СОЗДАНИЕ: Если товара нет в справочнике, создаем его автоматически
      // Это происходит, когда в заказе указано новое изделие, которого раньше не было на складе
      const newItemId = productId || `PRD-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
      
      const qrStore = (window as { qrCodesStore?: { qrCodes?: { productId: string; productName: string }[] } }).qrCodesStore 
      const qrData = qrStore?.qrCodes?.find((q) => q.productId === productId)
      const productName = qrData?.productName || productId || 'Новое изделие'

      const newItem: InventoryItem = {
        id: newItemId,
        name: productName,
        sku: productId.startsWith('PRD-') ? productId : `SKU-${productId.toUpperCase()}`,
        category: 'Готовая продукция',
        categoryId: '99',
        unit: 'шт',
        currentStock: 0,
        minStock: 0,
        maxStock: 100,
        reserved: 0,
        available: 0,
        location: 'FG-NEW',
        purchasePrice: 0,
        averagePrice: 0,
        lastPurchasePrice: 0,
        totalValue: 0,
        mainSupplier: 'Собственное производство',
        alternativeSuppliers: [],
        deliveryTime: 0,
        minOrderQuantity: 1,
        totalConsumed: 0,
        popularity: 5,
        status: 'in_stock',
        type: 'product',
        orderNumber: orderNumber,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      items.value.push(newItem)
      
      // Теперь вызываем обновление остатка для уже созданного товара
      updateStock(newItem.id, quantity, 'incoming', {
        documentNumber: orderNumber,
        documentType: 'production',
        reason: `Автоматическое создание и приход по заказу ${orderNumber}`,
        createdBy: workerName,
        sourceLocation: 'Цех производства',
        destinationLocation: 'FG-NEW'
      })
      
      return true
    }
  }

  return {
    // Данные
    categories,
    suppliers,
    items,
    itemsMap,
    transactions,

    // Computed
    totalItems,
    totalValue,
    lowStockItems,
    outOfStockItems,
    inventoryStats,

    // Методы
    getItemById,
    getItemsByCategory,
    getItemUnit,
    getItemsByStatus,
    updateStock,
    addItem,
    updateItem,
    deleteItem,
    getStatusLabel,
    getStatusColor,
    getTransactionsByItem,
    generateReport,
    receiveFromProduction,
    replaceAll: (newItems: InventoryItem[]) => {
      items.value = newItems;
      localStorage.setItem('inventory_items', JSON.stringify(newItems));
    }
  }
})

