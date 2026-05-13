import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Employee, Department, MaterialInvoice } from '@/types'
import { useUserStore } from '@/stores/user'

export const useEmployeesStore = defineStore('employees', () => {
  const userStore = useUserStore()
  
  // Статус загрузки с API
  const loading = ref(false)
  const error = ref<string | null>(null)
  
  // Данные от API или localStorage
  const employees = ref<Employee[]>([])

  const departments = ref<Department[]>([
    { id: '1', name: 'Производство', employeeCount: 3, budget: 5000000, location: 'Цех №1' },
    { id: '2', name: 'Склад', employeeCount: 1, budget: 1500000, location: 'Складской комплекс' },
    { id: '3', name: 'Продажи', employeeCount: 1, budget: 3000000, location: 'Офис, 3 этаж' },
    { id: '4', name: 'Финансы', employeeCount: 1, budget: 1000000, location: 'Офис, 2 этаж' },
    { id: '5', name: 'Логистика', employeeCount: 1, budget: 2000000, location: 'Гараж' },
    { id: '6', name: 'Дизайн', employeeCount: 1, budget: 1800000, location: 'Офис, 4 этаж' }
  ])

  // Computed
  const allEmployees = computed(() => {
    return employees.value
  })

  const totalEmployees = computed(() => allEmployees.value.length)
  const activeEmployees = computed(() => allEmployees.value.filter(e => e.status === 'active').length)
  const totalSalary = computed(() => allEmployees.value.reduce((sum, emp) => sum + (emp.salary || 0), 0))

  const departmentStats = computed(() => {
    const stats: Record<string, { count: number, totalSalary: number }> = {}

    allEmployees.value.forEach(emp => {
      if (!stats[emp.department]) {
        stats[emp.department] = { count: 0, totalSalary: 0 }
      }
      const deptStat = stats[emp.department]!
      deptStat.count++
      deptStat.totalSalary += (emp.salary || 0)
    })

    return stats
  })

  // Methods
  const getEmployeeById = (id: string) => {
    return employees.value.find(emp => emp.id === id)
  }

  const getEmployeesByDepartment = (department: string) => {
    return employees.value.filter(emp => emp.department === department)
  }

  const addEmployee = (employee: Omit<Employee, 'id'>) => {
    const newEmployee: Employee = {
      ...employee,
      id: String(employees.value.length + 1)
    }
    employees.value.push(newEmployee)

    const dept = departments.value.find((d: Department) => d.name === employee.department)
    if (dept) {
      dept.employeeCount++
    }

    return newEmployee
  }

  const updateEmployee = (id: string, updates: Partial<Employee>) => {
    const index = employees.value.findIndex(emp => emp.id === id)
    if (index !== -1) {
      const employee = employees.value[index]
      if (!employee) return
      
      const oldDept = employee.department
      const newDept = updates.department

      const updatedEmployee = { 
        ...employee, 
        ...updates
      } as Employee

      employees.value[index] = updatedEmployee
      employees.value = [...employees.value]

      if (newDept && oldDept !== newDept) {
        const oldDeptObj = departments.value.find((d: Department) => d.name === oldDept)
        const newDeptObj = departments.value.find((d: Department) => d.name === newDept)

        if (oldDeptObj) oldDeptObj.employeeCount--
        if (newDeptObj) newDeptObj.employeeCount++
      }
    }
  }

  const deleteEmployee = (id: string) => {
    const index = employees.value.findIndex(emp => emp.id === id)
    if (index !== -1) {
      const employee = employees.value[index]
      if (employee) {
        const dept = departments.value.find((d: Department) => d.name === employee.department)
        if (dept) {
          dept.employeeCount--
        }
      }
      employees.value.splice(index, 1)
    }
  }

  const getRoleLabel = (role: Employee['role']) => {
    const roleMap: Record<Employee['role'], string> = {
      'admin': 'Администратор',
      'manager': 'Менеджер',
      'worker': 'Рабочий',
      'warehouse': 'Кладовщик',
      'production': 'Производство'
    }
    return roleMap[role] || role
  }

  const getStatusLabel = (status: Employee['status']) => {
    const statusMap: Record<Employee['status'], string> = {
      'active': 'Активен',
      'inactive': 'Неактивен',
      'vacation': 'Отпуск',
      'sick': 'Больничный'
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status: Employee['status']): 'success' | 'default' | 'warning' | 'error' => {
    const colorMap: Record<Employee['status'], 'success' | 'default' | 'warning' | 'error'> = {
      'active': 'success',
      'inactive': 'default',
      'vacation': 'warning',
      'sick': 'error'
    }
    return colorMap[status] || 'default'
  }

  const addMaterialHistory = (userId: string, historyItem: MaterialInvoice) => {
    let employee = employees.value.find((emp: any) => emp.userId === userId || emp.id === userId)
    
    if (!employee && employees.value.length > 0) {
      employee = employees.value[0]
    }

    if (employee) {
      if (!employee.materialHistory) {
        employee.materialHistory = []
      }
      employee.materialHistory.unshift(historyItem)
      employees.value = [...employees.value]
    }
  }

  // Загрузка с API
  async function loadEmployeesFromApi() {
    loading.value = true
    error.value = null
    try {
      const data = await fetch('/api/onec/employees').then(r => r.json())
      if (data && Array.isArray(data)) {
        employees.value = data
        if (typeof window !== 'undefined') {
          localStorage.setItem('employees_data', JSON.stringify(employees.value))
        }
      }
    } catch (err: any) {
      error.value = err.message || 'Ошибка загрузки сотрудников'
      console.error('Failed to load employees:', err)
    } finally {
      loading.value = false
    }
  }

  // Восстановление из localStorage
  function restoreFromLocalStorage() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('employees_data')
      if (saved) {
        try {
          employees.value = JSON.parse(saved)
        } catch (err) {
          console.error('Failed to restore employees from localStorage:', err)
        }
      }
    }
  }

  return {
    employees,
    departments,
    loading,
    error,
    totalEmployees,
    activeEmployees,
    totalSalary,
    departmentStats,
    getEmployeeById,
    getEmployeesByDepartment,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    getRoleLabel,
    getStatusLabel,
    getStatusColor,
    addMaterialHistory,
    loadEmployeesFromApi,
    restoreFromLocalStorage
  }
})
