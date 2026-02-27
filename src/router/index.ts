import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue')
  },
  {
    path: '/inventory',
    name: 'Inventory',
    component: () => import('@/views/Inventory.vue'),
    props: { mode: 'material' }
  },
  {
    path: '/inventory/finished',
    name: 'FinishedGoods',
    component: () => import('@/views/Inventory.vue'),
    props: { mode: 'product' }
  },
  {
    path: '/orders',
    name: 'Orders',
    component: () => import('@/views/Orders.vue')
  },
  {
    path: '/scan',
    name: 'Scan',
    component: () => import('@/views/Scan.vue')
  },
  {
    path: '/tools',
    name: 'Tools',
    component: () => import('@/views/Tools.vue')
  },
  {
    path: '/integration',
    name: 'Integration',
    component: () => import('@/views/Integration.vue')
  },
  {
    path: '/shipment',
    name: 'Shipment',
    component: () => import('@/views/Shipment.vue')
  },
  {
    path: '/employees',
    name: 'Employees',
    component: () => import('@/views/Employees.vue')
  },
  {
    path: '/employees/:id',
    name: 'EmployeeDetails',
    component: () => import('@/views/EmployeeDetailsView.vue')
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/Profile.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue')
  },
  {
    path: '/reports',
    name: 'Reports',
    component: () => import('@/views/Reports.vue')
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

export default router
