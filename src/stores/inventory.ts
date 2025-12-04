import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { InventoryItem, InventoryCategory, InventoryTransaction, Supplier, InventoryStats } from '@/types'

export const useInventoryStore = defineStore('inventory', () => {
  // Категории материалов для мебельного производства
  const categories = ref<InventoryCategory[]>([
    { id: 1, name: 'Древесина', icon: 'leaf-outline', description: 'Массив, МДФ, ДСП, фанера' },
    { id: 2, name: 'Фурнитура', icon: 'construct-outline', description: 'Ручки, петли, направляющие' },
    { id: 3, name: 'Отделочные материалы', icon: 'color-palette-outline', description: 'Лаки, краски, клей' },
    { id: 4, name: 'Стекло и зеркала', icon: 'diamond-outline', description: 'Стекла, зеркала' },
    { id: 5, name: 'Ткани и наполнители', icon: 'bed-outline', description: 'Ткани, поролон, синтепон' },
    { id: 6, name: 'Крепеж', icon: 'hammer-outline', description: 'Саморезы, гвозди, болты' },
    { id: 7, name: 'Упаковочные материалы', icon: 'cube-outline', description: 'Пленка, картон, скотч' },
    { id: 8, name: 'Электроника', icon: 'flash-outline', description: 'Светильники, провода' }
  ])

  // Поставщики
  const suppliers = ref<Supplier[]>([
    {
      id: 1,
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
      id: 2,
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
      id: 3,
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
      id: 1,
      name: 'Дубовая доска 40мм',
      sku: 'WOOD-DUB-40-001',
      barcode: '5901234567890',
      category: 'Древесина',
      categoryId: 1,
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
      id: 2,
      name: 'Фанера берёзовая 18мм',
      sku: 'PLY-BIR-18-001',
      barcode: '5901234567891',
      category: 'Древесина',
      categoryId: 1,
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
      id: 3,
      name: 'МДФ ламинированный 16мм',
      sku: 'MDF-LAM-16-001',
      barcode: '5901234567892',
      category: 'Древесина',
      categoryId: 1,
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
      id: 4,
      name: 'Петли скрытые Blum',
      sku: 'HARD-BLM-001',
      barcode: '5901234567893',
      category: 'Фурнитура',
      categoryId: 2,
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
      id: 5,
      name: 'Направляющие шариковые 500мм',
      sku: 'HARD-SLD-500-001',
      barcode: '5901234567894',
      category: 'Фурнитура',
      categoryId: 2,
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
      id: 6,
      name: 'Лак акриловый матовый',
      sku: 'FIN-ACR-001',
      barcode: '5901234567895',
      category: 'Отделочные материалы',
      categoryId: 3,
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
      id: 7,
      name: 'Стекло закаленное 8мм',
      sku: 'GLAS-TEM-8-001',
      barcode: '5901234567896',
      category: 'Стекло и зеркала',
      categoryId: 4,
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
      id: 8,
      name: 'Ткань мебельная "Велюр"',
      sku: 'FAB-VEL-001',
      barcode: '5901234567897',
      category: 'Ткани и наполнители',
      categoryId: 5,
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
      updatedAt: new Date('2024-01-20')
    }
  ])

  // Транзакции
  const transactions = ref<InventoryTransaction[]>([
    {
      id: 1,
      itemId: 1,
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
      id: 2,
      itemId: 1,
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
      id: 3,
      itemId: 2,
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
    }
  ])

  // Computed свойства
  const totalItems = computed(() => items.value.length)
  const totalValue = computed(() => items.value.reduce((sum, item) => sum + item.totalValue, 0))

  const lowStockItems = computed(() =>
    items.value.filter(item => item.status === 'low_stock').length
  )

  const outOfStockItems = computed(() =>
    items.value.filter(item => item.status === 'out_of_stock').length
  )

  const inventoryStats = computed<InventoryStats>(() => {
    const categoryConsumption: Record<string, number> = {}

    items.value.forEach(item => {
      if (!categoryConsumption[item.category]) {
        categoryConsumption[item.category] = 0
      }
      categoryConsumption[item.category] += item.totalConsumed
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
  const getItemById = (id: number) => {
    return items.value.find(item => item.id === id)
  }

  const getItemsByCategory = (categoryId: number) => {
    return items.value.filter(item => item.categoryId === categoryId)
  }

  const getItemsByStatus = (status: InventoryItem['status']) => {
    return items.value.filter(item => item.status === status)
  }

  const updateStock = (itemId: number, quantity: number, type: InventoryTransaction['type'], transactionData: Partial<InventoryTransaction> = {}) => {
    const item = items.value.find(i => i.id === itemId)
    if (!item) return null

    // Обновляем остатки
    if (type === 'incoming') {
      item.currentStock += quantity
      item.lastReceived = new Date()
    } else if (type === 'outgoing' || type === 'write_off') {
      item.currentStock -= quantity
      item.lastIssued = new Date()
    } else if (type === 'reservation') {
      item.reserved += quantity
    }

    // Обновляем доступное количество
    item.available = item.currentStock - item.reserved

    // Обновляем статус
    updateItemStatus(item)
    item.updatedAt = new Date()

    // Создаем транзакцию
    const transaction: InventoryTransaction = {
      id: transactions.value.length + 1,
      itemId,
      type,
      quantity,
      unitPrice: item.lastPurchasePrice,
      totalPrice: quantity * (item.lastPurchasePrice || 0),
      createdBy: 'Система',
      createdAt: new Date(),
      ...transactionData
    }

    transactions.value.unshift(transaction)
    return transaction
  }

  const updateItemStatus = (item: InventoryItem) => {
    item.available = item.currentStock - item.reserved

    if (item.currentStock <= 0) {
      item.status = 'out_of_stock'
    } else if (item.currentStock <= item.minStock) {
      item.status = 'low_stock'
    } else if (item.reserved > 0 && item.available <= item.minStock) {
      item.status = 'reserved'
    } else {
      item.status = 'in_stock'
    }

    // Обновляем общую стоимость
    item.totalValue = item.currentStock * item.averagePrice
  }

  const addItem = (itemData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt' | 'available' | 'totalValue' | 'status'>) => {
    const newItem: InventoryItem = {
      ...itemData,
      id: items.value.length + 1,
      available: itemData.currentStock - itemData.reserved,
      totalValue: itemData.currentStock * itemData.averagePrice,
      status: 'in_stock',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    updateItemStatus(newItem)
    items.value.unshift(newItem)
    return newItem
  }

  const updateItem = (id: number, updates: Partial<InventoryItem>) => {
    const index = items.value.findIndex(item => item.id === id)
    if (index !== -1) {
      items.value[index] = { ...items.value[index], ...updates, updatedAt: new Date() }
      updateItemStatus(items.value[index])
    }
  }

  const deleteItem = (id: number) => {
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

  const getStatusColor = (status: InventoryItem['status']) => {
    const colorMap: Record<InventoryItem['status'], string> = {
      'in_stock': 'success',
      'low_stock': 'warning',
      'out_of_stock': 'error',
      'reserved': 'info',
      'on_order': 'primary',
      'blocked': 'default'
    }
    return colorMap[status] || 'default'
  }

  const getTransactionsByItem = (itemId: number) => {
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

  return {
    // Данные
    categories,
    suppliers,
    items,
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
    getItemsByStatus,
    updateStock,
    addItem,
    updateItem,
    deleteItem,
    getStatusLabel,
    getStatusColor,
    getTransactionsByItem,
    generateReport
  }
})
