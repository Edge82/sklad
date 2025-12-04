import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Order, OrderItem } from '@/types'

export const useOrdersStore = defineStore('orders', () => {
  const orders = ref<Order[]>([
    {
      id: 1,
      orderNumber: 'ORD-2024-001',
      customerName: 'Иван Иванов',
      customerPhone: '+7 (999) 123-45-67',
      customerEmail: 'ivan@example.com',
      status: 'processing',
      priority: 'high',
      orderDate: new Date('2024-01-15'),
      deadline: new Date('2024-02-01'),
      totalAmount: 45000,
      items: [
        {
          id: 1,
          orderId: 1,
          itemId: 1,
          itemName: 'Кухонный гарнитур "Модерн"',
          quantity: 1,
          unitPrice: 45000,
          totalPrice: 45000,
          materialUsed: 'Дуб, МДФ'
        }
      ],
      notes: 'Срочный заказ, клиент ждет',
      createdBy: 'Иван Петров',
      lastUpdated: new Date('2024-01-16')
    },
    {
      id: 2,
      orderNumber: 'ORD-2024-002',
      customerName: 'ООО "МебельПро"',
      customerPhone: '+7 (999) 987-65-43',
      customerEmail: 'order@mebelpro.ru',
      status: 'ready',
      priority: 'medium',
      orderDate: new Date('2024-01-10'),
      deadline: new Date('2024-01-25'),
      totalAmount: 120000,
      items: [
        {
          id: 2,
          orderId: 2,
          itemId: 2,
          itemName: 'Офисные столы',
          quantity: 5,
          unitPrice: 15000,
          totalPrice: 75000,
          materialUsed: 'Стекло, металл'
        },
        {
          id: 3,
          orderId: 2,
          itemId: 3,
          itemName: 'Офисные стулья',
          quantity: 10,
          unitPrice: 4500,
          totalPrice: 45000,
          materialUsed: 'Ткань, металл'
        }
      ],
      notes: 'Корпоративный заказ',
      createdBy: 'Мария Сидорова',
      lastUpdated: new Date('2024-01-14')
    },
    {
      id: 3,
      orderNumber: 'ORD-2024-003',
      customerName: 'Петр Сидоров',
      customerPhone: '+7 (999) 555-44-33',
      customerEmail: 'petr@example.com',
      status: 'new',
      priority: 'low',
      orderDate: new Date('2024-01-20'),
      deadline: new Date('2024-02-15'),
      totalAmount: 28000,
      items: [
        {
          id: 4,
          orderId: 3,
          itemId: 4,
          itemName: 'Прихожая "Классик"',
          quantity: 1,
          unitPrice: 28000,
          totalPrice: 28000,
          materialUsed: 'Сосна, ДСП'
        }
      ],
      createdBy: 'Иван Петров',
      lastUpdated: new Date('2024-01-20')
    },
    {
      id: 4,
      orderNumber: 'ORD-2024-004',
      customerName: 'Анна Ковалева',
      customerPhone: '+7 (999) 777-88-99',
      customerEmail: 'anna@example.com',
      status: 'completed',
      priority: 'medium',
      orderDate: new Date('2024-01-05'),
      deadline: new Date('2024-01-20'),
      totalAmount: 65000,
      items: [
        {
          id: 5,
          orderId: 4,
          itemId: 5,
          itemName: 'Спальня "Элегант"',
          quantity: 1,
          unitPrice: 65000,
          totalPrice: 65000,
          materialUsed: 'Бук, МДФ'
        }
      ],
      notes: 'Заказ выполнен досрочно',
      createdBy: 'Сергей Волков',
      lastUpdated: new Date('2024-01-18')
    },
    {
      id: 5,
      orderNumber: 'ORD-2024-005',
      customerName: 'Кафе "Уют"',
      customerPhone: '+7 (999) 222-33-44',
      customerEmail: 'cafe@uyut.ru',
      status: 'shipped',
      priority: 'urgent',
      orderDate: new Date('2024-01-18'),
      deadline: new Date('2024-01-25'),
      totalAmount: 89000,
      items: [
        {
          id: 6,
          orderId: 5,
          itemId: 6,
          itemName: 'Барные стойки',
          quantity: 2,
          unitPrice: 35000,
          totalPrice: 70000,
          materialUsed: 'Дуб, камень'
        },
        {
          id: 7,
          orderId: 5,
          itemId: 7,
          itemName: 'Барные стулья',
          quantity: 8,
          unitPrice: 2375,
          totalPrice: 19000,
          materialUsed: 'Металл, кожа'
        }
      ],
      notes: 'Срочно для открытия',
      createdBy: 'Иван Петров',
      lastUpdated: new Date('2024-01-22')
    }
  ])

  const statusOptions = [
    { label: 'Новый', value: 'new', color: 'default' },
    { label: 'В обработке', value: 'processing', color: 'warning' },
    { label: 'Готов', value: 'ready', color: 'info' },
    { label: 'Отправлен', value: 'shipped', color: 'primary' },
    { label: 'Завершен', value: 'completed', color: 'success' },
    { label: 'Отменен', value: 'cancelled', color: 'error' }
  ]

  const priorityOptions = [
    { label: 'Низкий', value: 'low', color: 'success' },
    { label: 'Средний', value: 'medium', color: 'warning' },
    { label: 'Высокий', value: 'high', color: 'error' },
    { label: 'Срочный', value: 'urgent', color: 'error' }
  ]

  // Computed
  const totalOrders = computed(() => orders.value.length)
  const pendingOrders = computed(() => orders.value.filter(o => o.status === 'new' || o.status === 'processing').length)
  const completedOrders = computed(() => orders.value.filter(o => o.status === 'completed').length)
  const totalRevenue = computed(() => orders.value.reduce((sum, order) => sum + order.totalAmount, 0))

  const recentOrders = computed(() =>
    [...orders.value]
      .sort((a, b) => b.orderDate.getTime() - a.orderDate.getTime())
      .slice(0, 5)
  )

  // Methods
  const getOrderById = (id: number) => {
    return orders.value.find(order => order.id === id)
  }

  const getOrdersByStatus = (status: Order['status']) => {
    return orders.value.filter(order => order.status === status)
  }

  const addOrder = (order: Omit<Order, 'id' | 'orderNumber' | 'lastUpdated'>) => {
    const newOrder: Order = {
      ...order,
      id: orders.value.length + 1,
      orderNumber: `ORD-${new Date().getFullYear()}-${String(orders.value.length + 1).padStart(3, '0')}`,
      lastUpdated: new Date()
    }
    orders.value.unshift(newOrder)
    return newOrder
  }

  const updateOrderStatus = (id: number, status: Order['status']) => {
    const order = orders.value.find(o => o.id === id)
    if (order) {
      order.status = status
      order.lastUpdated = new Date()
    }
  }

  const deleteOrder = (id: number) => {
    const index = orders.value.findIndex(o => o.id === id)
    if (index !== -1) {
      orders.value.splice(index, 1)
    }
  }

  const getStatusLabel = (status: Order['status']) => {
    const option = statusOptions.find(opt => opt.value === status)
    return option ? option.label : status
  }

  const getPriorityLabel = (priority: Order['priority']) => {
    const option = priorityOptions.find(opt => opt.value === priority)
    return option ? option.label : priority
  }

  return {
    orders,
    statusOptions,
    priorityOptions,
    totalOrders,
    pendingOrders,
    completedOrders,
    totalRevenue,
    recentOrders,
    getOrderById,
    getOrdersByStatus,
    addOrder,
    updateOrderStatus,
    deleteOrder,
    getStatusLabel,
    getPriorityLabel
  }
})
