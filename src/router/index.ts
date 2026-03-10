import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/inventory'
  },
  {
    path: '/inventory',
    name: 'Inventory',
    component: () => import('@/views/Inventory.vue'),
    props: { mode: 'material' },
    meta: { requiresAuth: true }
  },
  {
    path: '/inventory/finished',
    name: 'FinishedGoods',
    component: () => import('@/views/Inventory.vue'),
    props: { mode: 'product' },
    meta: { requiresAuth: true }
  },
  {
    path: '/orders',
    name: 'Orders',
    component: () => import('@/views/Orders.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/scan',
    name: 'Scan',
    component: () => import('@/views/Scan.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/tools',
    name: 'Tools',
    component: () => import('@/views/Tools.vue'),
    meta: { requiresAuth: true, roles: ['director', 'manager', 'storekeeper'] }
  },
  {
    path: '/integration',
    name: 'Integration',
    component: () => import('@/views/Integration.vue'),
    meta: { requiresAuth: true, roles: ['director', 'manager', 'storekeeper'] }
  },
  {
    path: '/shipment',
    name: 'Shipment',
    component: () => import('@/views/Shipment.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/employees',
    name: 'Employees',
    component: () => import('@/views/Employees.vue'),
    meta: { requiresAuth: true, roles: ['director', 'manager', 'storekeeper'] }
  },
  {
    path: '/employees/:id',
    name: 'EmployeeDetails',
    component: () => import('@/views/EmployeeDetailsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/Profile.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue')
  },
  {
    path: '/reports',
    name: 'Reports',
    component: () => import('@/views/Reports.vue'),
    meta: { requiresAuth: true, roles: ['director', 'manager'] }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  
  // Проверка авторизации
  if (to.meta.requiresAuth && !userStore.isAuthenticated) {
    next('/login')
    return
  }

  // Проверка ролей
  if (to.meta.roles && !to.meta.roles.includes(userStore.user?.role)) {
    // Если рабочий пытается зайти в сотрудников, редиректим в его профиль
    if (userStore.isWorker && to.path === '/employees') {
      next('/profile')
      return
    }
    next('/') // Или на страницу 403
    return
  }

  next()
})

export default router
