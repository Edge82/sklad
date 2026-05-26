import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

// Import pages
import Login from '@/pages/login.vue'
import Inventory from '@/pages/inventory.vue'
import Orders from '@/pages/orders.vue'
import Scan from '@/pages/scan.vue'
import Tools from '@/pages/tools.vue'
import Profile from '@/pages/profile.vue'
import Employees from '@/pages/employees.vue'
import Shipment from '@/pages/shipment.vue'
import Integration from '@/pages/integration.vue'
import Reports from '@/pages/reports.vue'
import EmployeeDetails from '@/pages/employeedetails.vue'
import TransferOrders from '@/pages/transferorders.vue'
import FinishedProducts from '@/pages/finished-products.vue'
import MyTools from '@/pages/my-tools.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: Login,
    meta: { title: 'Вход' }
  },
  {
    path: '/',
    redirect: '/inventory'
  },
  {
    path: '/inventory',
    component: Inventory,
    meta: { title: 'Склад' }
  },
  {
    path: '/inventory/finished',
    component: FinishedProducts,
    meta: { title: 'Готовая продукция' }
  },
  {
    path: '/finished-products',
    component: FinishedProducts,
    meta: { title: 'Готовая продукция' }
  },
  {
    path: '/orders',
    component: Orders,
    meta: { title: 'Заказы' }
  },
  {
    path: '/scan',
    component: Scan,
    meta: { title: 'Сканирование' }
  },
  {
    path: '/tools',
    component: Tools,
    meta: { title: 'Инструменты' }
  },
  {
    path: '/profile',
    component: Profile,
    meta: { title: 'Профиль' }
  },
  {
    path: '/profile/tools',
    component: MyTools,
    meta: { title: 'Инструменты в работе' }
  },
  {
    path: '/employees',
    component: Employees,
    meta: { title: 'Сотрудники' }
  },
  {
    path: '/employees/:id',
    component: EmployeeDetails,
    meta: { title: 'Сотрудник' }
  },
  {
    path: '/shipment',
    component: Shipment,
    meta: { title: 'Движение материалов' }
  },
  {
    path: '/integration',
    component: Integration,
    meta: { title: 'Интеграция' }
  },
  {
    path: '/reports',
    component: Reports,
    meta: { title: 'Отчеты' }
  },
  {
    path: '/transfer-orders',
    component: TransferOrders,
    meta: { title: 'Заказы на перемещение' }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// Защита роутов по ролям
router.beforeEach((to, _from, next) => {
  const storedUser = localStorage.getItem('user_data')
  let userRole = null

  if (storedUser) {
    try {
      const user = JSON.parse(storedUser)
      userRole = user.role
    } catch {
      next('/login')
      return
    }
  }

  // Проверка для /employees и /employees/*
  if (to.path.startsWith('/employees')) {
    if (!userRole || !['director', 'manager'].includes(userRole)) {
      next('/inventory')
      return
    }
  }

  // Проверка для /reports и /reports/*
  if (to.path.startsWith('/reports')) {
    if (!userRole || !['director', 'manager'].includes(userRole)) {
      next('/inventory')
      return
    }
  }

  next()
})

export default router
