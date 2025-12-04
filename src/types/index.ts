export interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'manager' | 'worker'
  avatar?: string
  department: string
  phone: string
  lastLogin: Date
  createdAt: Date
}

export interface InventoryItem {
  id: number
  name: string
  category: string
  quantity: number
  unit: string
  minStock: number
  supplier: string
  lastUpdated: Date
  location: string
  price: number
}

export interface Order {
  id: number
  orderNumber: string
  customerName: string
  customerPhone: string
  customerEmail: string
  status: 'new' | 'processing' | 'ready' | 'shipped' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  orderDate: Date
  deadline: Date
  totalAmount: number
  items: OrderItem[]
  notes?: string
  createdBy: string
  lastUpdated: Date
}

export interface OrderItem {
  id: number
  orderId: number
  itemId: number
  itemName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  materialUsed?: string
  notes?: string
}

export interface DashboardStats {
  totalItems: number
  lowStockItems: number
  recentActivities: Activity[]
  popularItems: InventoryItem[]
  orderStats: OrderStats
}

export interface OrderStats {
  totalOrders: number
  pendingOrders: number
  completedOrders: number
  revenue: number
}

export interface Activity {
  id: number
  user: string
  action: string
  item: string
  timestamp: Date
}
export interface Employee {
  id: number
  name: string
  email: string
  phone: string
  position: string
  department: string
  role: 'admin' | 'manager' | 'worker' | 'warehouse' | 'production'
  status: 'active' | 'inactive' | 'vacation' | 'sick'
  salary: number
  hireDate: Date
  birthDate?: Date
  address?: string
  avatar?: string
  skills: string[]
  lastLogin?: Date
  notes?: string
}

export interface Department {
  id: number
  name: string
  managerId?: number
  employeeCount: number
  budget: number
  location: string
}

export interface Attendance {
  id: number
  employeeId: number
  date: Date
  checkIn: Date
  checkOut?: Date
  status: 'present' | 'late' | 'absent' | 'vacation' | 'sick'
  hoursWorked?: number
}
export interface InventoryCategory {
  id: number
  name: string
  parentId?: number
  description?: string
  icon?: string
}

export interface InventoryItem {
  id: number
  name: string
  sku: string
  barcode?: string
  category: string
  categoryId: number
  description?: string
  unit: string // шт, м, кг, литр, м²
  currentStock: number
  minStock: number
  maxStock: number
  reserved: number
  available: number
  location: string // стеллаж-полка-ячейка
  dimensions?: string // габариты
  weight?: number // вес единицы
  storageConditions?: string

  // Финансы
  purchasePrice: number
  averagePrice: number
  lastPurchasePrice: number
  totalValue: number

  // Поставщики
  mainSupplier: string
  alternativeSuppliers: string[]
  supplierCode?: string
  deliveryTime: number // дней
  minOrderQuantity: number

  // Статистика
  lastReceived?: Date
  lastIssued?: Date
  totalConsumed: number
  popularity: number // 1-10

  // Статус
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'reserved' | 'on_order' | 'blocked'

  // Особенности для мебели
  color?: string
  materialType?: string // дерево, металл, ткань и т.д.
  thickness?: number // толщина в мм
  length?: number // длина в мм
  width?: number // ширина в мм
  grade?: string // сорт A, B, C

  // Изображение
  imageUrl?: string

  createdAt: Date
  updatedAt: Date
}

export interface InventoryTransaction {
  id: number
  itemId: number
  type: 'incoming' | 'outgoing' | 'transfer' | 'adjustment' | 'reservation' | 'write_off'
  quantity: number
  unitPrice?: number
  totalPrice?: number
  documentNumber?: string
  documentType?: 'invoice' | 'receipt' | 'transfer' | 'adjustment' | 'production' | 'write_off'
  sourceLocation?: string
  destinationLocation?: string
  reason?: string
  createdBy: string
  createdAt: Date
  notes?: string
}

export interface Supplier {
  id: number
  name: string
  contactPerson: string
  phone: string
  email: string
  address: string
  materials: string[] // категории материалов
  rating: number // 1-5
  deliveryTime: number // дней
  paymentTerms: string
  notes?: string
  isActive: boolean
}

export interface InventoryStats {
  totalItems: number
  totalValue: number
  lowStockItems: number
  outOfStockItems: number
  categoriesCount: number
  recentTransactions: InventoryTransaction[]
  topItems: InventoryItem[]
  consumptionByCategory: Record<string, number>
}
// export type {
//   User,
//   InventoryItem,
//   InventoryCategory,
//   InventoryTransaction,
//   Supplier,
//   InventoryStats,
//   Order,
//   OrderItem,
//   DashboardStats,
//   Activity,
//   Employee,
//   Department,
//   Attendance
// }
