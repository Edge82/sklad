export interface User {
  id: string;
  email: string;
  name: string;
  role: 'director' | 'manager' | 'storekeeper' | 'worker';
  department?: string;
  isActive: boolean;
  lastLogin?: Date;
  permissions: string[]; // Дополнительные разрешения
  avatar?: string;
  phone?: string;
  createdAt?: Date;
}

// Заказ
export interface Order {
  id: string;
  orderNumber: string;           // Например, "ORD-2024-001"
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerId?: string;
  orderDate: Date;
  deadline?: Date;
  createdAt: Date;
  createdBy: string;
  lastUpdated?: Date;
  status: OrderStatus;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  items: OrderItem[];
  notes?: string;
  totalAmount?: number;
  
  // Количественные показатели
  plannedQuantity: number;       // Плановое количество (сумма по позициям)
  actualQuantity: number;        // Фактически произведено/отсканировано
  remainingQuantity: number;     // Остаток к отгрузке
  
  // Отгрузки
  shipments: OrderShipment[];
  partialShipmentAllowed: boolean;
  
  // Даты
  plannedDate?: Date;            // Плановая дата готовности
  completedAt?: Date;            // Дата полной готовности
  shippedAt?: Date;              // Дата полной отгрузки
}

// Позиция заказа
export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  itemName?: string;
  productArticle?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  materialUsed?: string;
  plannedQuantity: number;
  actualQuantity: number;
  remainingQuantity: number;
  unit: string;
}

// Статусы заказа
export type OrderStatus = 
  | 'new'                 // Создан
  | 'processing'          // В обработке
  | 'printing'            // Печать QR
  | 'in_progress'         // В производстве (сканируется)
  | 'partially_ready'     // Частично готов
  | 'ready'               // Полностью готов
  | 'partially_shipped'   // Частично отгружен
  | 'shipped'             // Полностью отгружен
  | 'completed'           // Выполнен
  | 'cancelled';          // Отменён

// QR-код
export interface QRCode {
  id: string;
  code: string;                   // Уникальный код (UUID)
  
  // Привязка
  orderId: string;
  orderNumber: string;
  orderItemId?: string;
  productId: string;
  productName: string;
  
  // Надписи для печати
  label: {
    order: string;                // "Заказ: ORD-001"
    info: string;                 // "Деталь: ..."
    line3?: string;               // Доп. информация
  };
  
  // Статусы
  status: QRCodeStatus;
  isActive: boolean;
  
  // Версионирование
  version: number;
  supersededBy?: string;
  supersededAt?: Date;
  
  // Сканирование
  scannedAt?: Date;
  scannedBy?: string;
  
  // Местоположение
  currentLocation?: string;        // Адрес ячейки
  
  // Отгрузка
  shipmentId?: string;
  shippedAt?: Date;
  
  // Метаданные
  generatedAt: Date;
  generatedBy: string;
  printedAt?: Date;
}

export type QRCodeStatus = 
  | 'generated'    // Сгенерирован
  | 'printed'      // Распечатан
  | 'scanned'      // Отсканирован (на складе)
  | 'shipped'      // Отгружен
  | 'deactivated'; // Деактивирован

// Частичная отгрузка
export interface OrderShipment {
  id: string;
  shipmentNumber: string;
  orderId: string;
  orderNumber: string;
  createdAt: Date;
  createdBy: string;
  status: 'pending' | 'completed' | 'cancelled';
  items: ShipmentItem[];
  qrCodes: string[];
  destination: string;
  vehicleInfo?: string;
  driverName?: string;
  waybillNumber?: string;
}

export interface ShipmentItem {
  orderItemId: string;
  productId: string;
  productName: string;
  quantity: number;
  qrCodes: string[];
}

// Инструмент
export interface Tool {
  id: string;
  name: string;
  type: 'power_tool' | 'hand_tool' | 'measuring' | 'fixture' | 'container';
  
  // Идентификация
  inventoryNumber: string;
  serialNumber?: string;
  qrCode: string;                 // QR-код инструмента
  
  // Характеристики
  model?: string;
  manufacturer?: string;
  
  // Статус
  status: 'in_stock' | 'issued' | 'repair' | 'written_off';
  
  // Если выдан
  issuedTo?: string;
  issuedToName?: string;
  issuedAt?: Date;
  expectedReturnAt?: Date;
  
  // Поверка (для измерительных)
  lastCalibration?: Date;
  nextCalibration?: Date;
  
  // Местоположение
  location?: string;               // Адрес ячейки
  
  // Стоимость
  price?: number;                  // Цена приобретения

  // Ремонт
  breakdownDescription?: string;   // Описание поломки
}

// Поломка/ремонт
export interface ToolBreakdown {
  id: string;
  toolId: string;
  toolName: string;
  inventoryNumber: string;
  
  reportedBy: string;
  reportedByName: string;
  reportedAt: Date;
  
  description: string;
  severity: 'minor' | 'major' | 'critical';
  
  workerId?: string;               // У кого был инструмент
  workerName?: string;
  
  photos?: string[];                // Ссылки на фото
  
  status: 'reported' | 'inspected' | 'in_repair' | 'repaired' | 'unrepairable';
  
  repairs: RepairAction[];
  
  // Списание
  writeOffReason?: string;
  writeOffDate?: Date;
  writeOffApprovedBy?: string;
}

export interface RepairAction {
  id: string;
  date: Date;
  performedBy: string;
  description: string;
  partsUsed?: { partName: string; quantity: number; cost?: number }[];
  cost?: number;
  result: 'success' | 'failure';
}

export interface MaterialInvoice {
  id: string;
  date: Date;
  orderNumber: string;
  destination?: string;
  totalAmount?: number;
  items: MaterialInvoiceItem[];
}

export interface MaterialInvoiceItem {
  productName: string;
  quantity: number;
  unit: string;
  article?: string;
  price?: number;
  scannedAt?: Date;
}

export interface Employee {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  photo?: string;
  avatar?: string;
  
  // Работа
  position: string;
  department: string;
  role: 'admin' | 'manager' | 'worker' | 'warehouse' | 'production';
  status: 'active' | 'inactive' | 'vacation' | 'sick';
  salary: number;
  hireDate: Date;
  birthDate?: Date;
  address?: string;
  skills?: string[];
  lastLogin?: Date;
  notes?: string;
  
  // Инструменты на руках
  currentTools: {
    toolId: string;
    toolName: string;
    inventoryNumber: string;
    issuedAt: Date;
    expectedReturnAt?: Date;
    status: 'active' | 'overdue';
  }[];
  
  // Текущие заказы
  currentOrders: {
    orderId: string;
    orderNumber: string;
    assignedAt: Date;
    items: { productName: string; quantity: number; completed: number }[];
  }[];
  
  // История получений
  materialHistory: MaterialInvoice[];
}

export interface InventoryCategory {
  id: string;
  name: string;
  itemCount?: number;
  icon?: string;
  description?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  categoryId: string;
  description?: string;
  unit: string; // шт, м, кг, литр, м²
  currentStock: number;
  minStock: number;
  maxStock: number;
  reserved: number;
  available: number;
  location: string; // стеллаж-полка-ячейка
  dimensions?: string; // габариты
  weight?: number; // вес единицы
  storageConditions?: string;

  // Финансы
  purchasePrice: number;
  averagePrice: number;
  lastPurchasePrice: number;
  totalValue: number;

  // Поставщики
  mainSupplier: string;
  alternativeSuppliers: string[];
  supplierCode?: string;
  deliveryTime: number; // дней
  minOrderQuantity: number;

  // Статистика
  lastReceived?: Date;
  lastIssued?: Date;
  totalConsumed: number;
  popularity: number; // 1-10

  // Статус
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'reserved' | 'on_order' | 'blocked';

  isVirtual?: boolean;

  // Тип
  type?: 'material' | 'product';

  // Особенности для мебели
  color?: string;
  materialType?: string; // дерево, металл, ткань и т.д.
  thickness?: number; // толщина в мм
  length?: number; // длина в мм
  width?: number; // ширина в мм
  grade?: string; // сорт A, B, C

  // Изображение
  imageUrl?: string;

  // Ссылка на заказ (для готовой продукции)
  orderNumber?: string;
  orderId?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  type: 'incoming' | 'outgoing' | 'transfer' | 'adjustment' | 'reservation' | 'write_off';
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
  documentNumber?: string;
  documentType?: 'invoice' | 'receipt' | 'transfer' | 'adjustment' | 'production' | 'write_off';
  sourceLocation?: string;
  destinationLocation?: string;
  reason?: string;
  createdBy: string;
  createdAt: Date;
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  materials: string[]; // категории материалов
  rating: number; // 1-5
  deliveryTime: number; // дней
  paymentTerms: string;
  notes?: string;
  isActive: boolean;
}

export interface InventoryStats {
  totalItems: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  categoriesCount: number;
  recentTransactions: InventoryTransaction[];
  topItems: InventoryItem[];
  consumptionByCategory: Record<string, number>;
}

export interface DashboardStats {
  totalItems: number;
  lowStockItems: number;
  recentActivities: Activity[];
  popularItems: InventoryItem[];
  orderStats: OrderStats;
}

export interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  revenue: number;
}

export interface Activity {
  id: string;
  user: string;
  action: string;
  item: string;
  timestamp: Date;
}

export interface Department {
  id: string;
  name: string;
  employeeCount: number;
  budget: number;
  location: string;
}
