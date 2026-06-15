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

  const addEmployee = async (employee: Omit<Employee, 'id'>) => {
    const newEmployee: Employee = {
      ...employee,
      id: String(Date.now())
    }
    employees.value.push(newEmployee)

    // Save to API and return credentials
    const credentials = await saveEmployeeToAPI(newEmployee)

    const dept = departments.value.find((d: Department) => d.name === employee.department)
    if (dept) {
      dept.employeeCount++
    }

    return { employee: newEmployee, credentials }
  }

  const saveEmployeeToAPI = async (employee: Employee): Promise<{ login: string; password: string } | null> => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch('/sklad/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          id: employee.id,
          name: employee.name,
          email: employee.email,
          phone: employee.phone,
          photo: employee.photo,
          avatar: employee.avatar,
          position: employee.position,
          department: employee.department,
          role: employee.role,
          status: employee.status,
          salary: employee.salary,
          hireDate: employee.hireDate?.toISOString(),
          birthDate: employee.birthDate?.toISOString(),
          address: employee.address,
          skills: employee.skills,
          notes: employee.notes,
          createdBy: userStore.user?.name || 'System'
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to save employee: ${response.statusText}`)
      }

      const data = await response.json()
      return data.credentials || null
    } catch (err) {
      console.error('Error saving employee to API:', err)
      return null
    }
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

      // Save to API
      updateEmployeeOnAPI(id, updates)
    }
  }

  const updateEmployeeOnAPI = async (id: string, updates: Partial<Employee>) => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/sklad/api/employees/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          ...updates,
          hireDate: updates.hireDate?.toISOString(),
          birthDate: updates.birthDate?.toISOString(),
          updatedBy: userStore.user?.name || 'System'
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to update employee: ${response.statusText}`)
      }
    } catch (err) {
      console.error('Error updating employee on API:', err)
    }
  }

  const getEmployeeCredentials = async (id: string): Promise<{ login: string; name: string; email?: string } | null> => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/sklad/api/employees/${id}/credentials`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to load employee credentials: ${response.statusText}`)
      }

      const data = await response.json()
      return data.credentials || null
    } catch (err) {
      console.error('Error loading employee credentials:', err)
      return null
    }
  }

  const updateEmployeeCredentials = async (id: string, login: string, password: string): Promise<{ login: string; name: string } | null> => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/sklad/api/employees/${id}/credentials`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ login, password })
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || `Failed to update employee credentials: ${response.statusText}`)
      }

      const data = await response.json()
      return data.credentials || null
    } catch (err) {
      console.error('Error updating employee credentials:', err)
      return null
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

      // Delete from API
      deleteEmployeeFromAPI(id)
    }
  }

  const deleteEmployeeFromAPI = async (id: string) => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`/sklad/api/employees/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to delete employee: ${response.statusText}`)
      }
    } catch (err) {
      console.error('Error deleting employee from API:', err)
    }
  }

  const getRoleLabel = (role: Employee['role']) => {
    const roleMap: Record<Employee['role'], string> = {
      'admin': 'Администратор',
      'manager': 'Менеджер',
      'storekeeper': 'Кладовщик',
      'worker': 'Рабочий'
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
    if (!userId) {
      console.warn('addMaterialHistory: userId is empty')
      return
    }

    // Преобразуем userId к числу для корректного сравнения
    const searchUserId = parseFloat(String(userId))

    let employee = employees.value.find((emp: any) => {
      if (!emp.userId) return false
      const empUserId = parseFloat(String(emp.userId))
      return !isNaN(empUserId) && empUserId === searchUserId
    })

    if (!employee && employees.value.length > 0) {
      console.warn('addMaterialHistory: No employee found with matching userId', searchUserId, ', using first employee')
      employee = employees.value[0]
    }

    if (employee) {
      if (!employee.materialHistory) {
        employee.materialHistory = []
      }
      employee.materialHistory.unshift(historyItem)
      employees.value = [...employees.value]

      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('employees_data', JSON.stringify(employees.value))
      }

      console.log('addMaterialHistory: Added item for employee', employee.name, 'userId:', employee.userId, '(parsed:', parseFloat(String(employee.userId)), ')')
    } else {
      console.error('addMaterialHistory: No employee found to add material history')
    }
  }

  // Загрузка с API
  async function loadEmployeesFromApi() {
    loading.value = true
    error.value = null
    try {
      const response = await fetch('/sklad/api/employees')
      const data = await response.json()
      if (data.employees && Array.isArray(data.employees)) {
        // Transform database format to frontend format
        employees.value = data.employees.map((emp: any) => ({
          id: String(emp.id),
          userId: emp.user_id ? String(emp.user_id) : null,
          name: emp.name,
          email: emp.email,
          phone: emp.phone,
          photo: emp.photo,
          avatar: emp.avatar,
          position: emp.position,
          department: emp.department,
          role: emp.role,
          status: emp.status,
          salary: emp.salary,
          hireDate: emp.hire_date ? new Date(emp.hire_date) : new Date(),
          birthDate: emp.birth_date ? new Date(emp.birth_date) : undefined,
          address: emp.address,
          skills: emp.skills ? JSON.parse(emp.skills) : [],
          notes: emp.notes,
          currentTools: [],
          currentOrders: [],
          productionDocuments: [],
          // materialHistory загружается отдельно через API
          materialHistory: []
        }))

        // Debug: log loaded employees
        console.log('loadEmployeesFromApi: Loaded', employees.value.length, 'employees')

        if (typeof window !== 'undefined') {
          localStorage.setItem('employees_data', JSON.stringify(employees.value))
        }
      }
    } catch (err: any) {
      error.value = err.message || 'Ошибка загрузки сотрудников'
      console.error('Failed to load employees:', err)
      // Fallback to localStorage
      restoreFromLocalStorage()
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
    getEmployeeCredentials,
    updateEmployeeCredentials,
    getRoleLabel,
    getStatusLabel,
    getStatusColor,
    addMaterialHistory,
    loadEmployeesFromApi,
    restoreFromLocalStorage
  }
})
