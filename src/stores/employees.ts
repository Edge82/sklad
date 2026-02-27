import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Employee, Department } from '@/types'

export const useEmployeesStore = defineStore('employees', () => {
  const employees = ref<Employee[]>([
    {
      id: '1',
      name: 'Иван Петров',
      avatar: 'https://i.pravatar.cc/150?u=1',
      photo: 'https://i.pravatar.cc/150?u=1',
      email: 'ivan.petrov@furniture.com',
      phone: '+7 (999) 123-45-67',
      position: 'Менеджер по производству',
      department: 'Производство',
      role: 'manager',
      status: 'active',
      salary: 85000,
      hireDate: new Date('2021-03-15'),
      birthDate: new Date('1985-07-22'),
      address: 'г. Москва, ул. Производственная, д. 15',
      skills: ['Управление', 'Планирование', 'Контроль качества'],
      lastLogin: new Date('2024-01-22T09:30:00'),
      notes: 'Ответственный сотрудник',
      userId: 'user-1',
      currentTools: [],
      currentOrders: [],
      materialHistory: [
        {
          id: 'inv-101',
          date: new Date('2024-01-20'),
          orderNumber: 'ORD-2024-001',
          items: [
            { productName: 'МДФ Лист 16мм', quantity: 2, unit: 'шт.', article: 'MDF-16-WHT', scannedAt: new Date('2024-01-20T10:15:00') },
            { productName: 'Кромка дуб 2мм', quantity: 15, unit: 'м.п.', article: 'EDG-OAK-02', scannedAt: new Date('2024-01-20T10:18:00') }
          ]
        },
        {
          id: 'inv-102',
          date: new Date('2024-01-21'),
          orderNumber: 'ORD-2024-002',
          items: [
             { productName: 'Саморезы 3.5x16', quantity: 200, unit: 'шт.', article: 'SCR-3516', scannedAt: new Date('2024-01-21T14:30:00') },
             { productName: 'Петля Blum 110', quantity: 8, unit: 'шт.', article: 'HNG-BLM-110', scannedAt: new Date('2024-01-21T14:35:00') }
          ]
        }
      ]
    },
    {
      id: '2',
      name: 'Мария Сидорова',
      avatar: 'https://i.pravatar.cc/150?u=2',
      photo: 'https://i.pravatar.cc/150?u=2',
      email: 'maria.sidorova@furniture.com',
      phone: '+7 (999) 987-65-43',
      position: 'Старший кладовщик',
      department: 'Склад',
      role: 'warehouse',
      status: 'active',
      salary: 65000,
      hireDate: new Date('2022-05-10'),
      birthDate: new Date('1990-11-05'),
      skills: ['Учет', 'Инвентаризация', 'ERP системы'],
      lastLogin: new Date('2024-01-22T08:45:00'),
      userId: 'user-2',
      currentTools: [],
      currentOrders: [],
      materialHistory: [
        {
          id: 'inv-201',
          date: new Date('2024-01-15'),
          orderNumber: 'ORD-2024-005',
          items: [
            { productName: 'Петля Blum 110', quantity: 12, unit: 'шт.', article: 'HNG-BLM-110', scannedAt: new Date('2024-01-15T09:00:00') },
            { productName: 'Ручка мебельная 128мм', quantity: 6, unit: 'шт.', article: 'HND-128-SLV', scannedAt: new Date('2024-01-15T09:05:00') }
          ]
        }
      ]
    },
    {
      id: '3',
      name: 'Алексей Волков',
      avatar: 'https://i.pravatar.cc/150?u=3',
      photo: 'https://i.pravatar.cc/150?u=3',
      email: 'aleksey.volkov@furniture.com',
      phone: '+7 (999) 555-44-33',
      position: 'Мастер столярного цеха',
      department: 'Производство',
      role: 'worker',
      status: 'active',
      salary: 75000,
      hireDate: new Date('2020-08-22'),
      birthDate: new Date('1988-03-14'),
      skills: ['Столярные работы', 'Черчение', 'Работа с деревом'],
      lastLogin: new Date('2024-01-21T17:20:00'),
      userId: 'user-3',
      currentTools: [],
      currentOrders: [],
      materialHistory: [
        {
          id: 'inv-301',
          date: new Date('2024-01-18'),
          orderNumber: 'ORD-2024-010',
          items: [
            { productName: 'Клей столярный Titebond', quantity: 1, unit: 'л.', article: 'GLU-TTB-01', scannedAt: new Date('2024-01-18T11:20:00') },
            { productName: 'Шкант 8x30', quantity: 1000, unit: 'шт.', article: 'DWL-830', scannedAt: new Date('2024-01-18T11:25:00') }
          ]
        }
      ]
    },
    {
      id: '4',
      name: 'Ольга Козлова',
      avatar: 'https://i.pravatar.cc/150?u=4',
      photo: 'https://i.pravatar.cc/150?u=4',
      email: 'olga.kozlova@furniture.com',
      phone: '+7 (999) 777-88-99',
      position: 'Бухгалтер',
      department: 'Финансы',
      role: 'admin',
      status: 'active',
      salary: 70000,
      hireDate: new Date('2021-11-30'),
      birthDate: new Date('1992-09-18'),
      skills: ['Бухгалтерия', 'Налоги', '1С'],
      lastLogin: new Date('2024-01-22T10:15:00'),
      userId: 'user-4',
      currentTools: [],
      currentOrders: [],
      materialHistory: []
    },
    {
      id: '5',
      name: 'Сергей Николаев',
      avatar: 'https://i.pravatar.cc/150?u=5',
      photo: 'https://i.pravatar.cc/150?u=5',
      email: 'sergey.nikolaev@furniture.com',
      phone: '+7 (999) 222-33-44',
      position: 'Сборщик мебели',
      department: 'Производство',
      role: 'worker',
      status: 'vacation',
      salary: 55000,
      hireDate: new Date('2023-02-14'),
      birthDate: new Date('1995-12-08'),
      skills: ['Сборка мебели', 'Чтение чертежей'],
      lastLogin: new Date('2024-01-15T16:40:00'),
      notes: 'В отпуске до 01.02.2024',
      userId: 'user-5',
      currentTools: [],
      currentOrders: [],
      materialHistory: []
    },
    {
      id: '6',
      name: 'Екатерина Морозова',
      avatar: 'https://i.pravatar.cc/150?u=6',
      photo: 'https://i.pravatar.cc/150?u=6',
      email: 'ekaterina.morozova@furniture.com',
      phone: '+7 (999) 666-55-44',
      position: 'Менеджер по продажам',
      department: 'Продажи',
      role: 'manager',
      status: 'active',
      salary: 80000,
      hireDate: new Date('2022-07-01'),
      birthDate: new Date('1993-04-25'),
      skills: ['Продажи', 'Переговоры', 'CRM'],
      lastLogin: new Date('2024-01-22T11:05:00'),
      userId: 'user-6',
      currentTools: [],
      currentOrders: [],
      materialHistory: []
    },
    {
      id: '7',
      name: 'Дмитрий Семенов',
      avatar: 'https://i.pravatar.cc/150?u=7',
      photo: 'https://i.pravatar.cc/150?u=7',
      email: 'dmitry.semenov@furniture.com',
      phone: '+7 (999) 333-22-11',
      position: 'Водитель-экспедитор',
      department: 'Логистика',
      role: 'worker',
      status: 'active',
      salary: 60000,
      hireDate: new Date('2023-04-10'),
      birthDate: new Date('1987-08-30'),
      skills: ['Вождение', 'Логистика', 'Погрузка'],
      lastLogin: new Date('2024-01-22T07:20:00'),
      userId: 'user-7',
      currentTools: [],
      currentOrders: [],
      materialHistory: []
    },
    {
      id: '8',
      name: 'Анна Васнецова',
      avatar: 'https://i.pravatar.cc/150?u=8',
      photo: 'https://i.pravatar.cc/150?u=8',
      email: 'anna.vasnetsova@furniture.com',
      phone: '+7 (999) 444-55-66',
      position: 'Дизайнер',
      department: 'Дизайн',
      role: 'worker',
      status: 'sick',
      salary: 70000,
      hireDate: new Date('2021-09-05'),
      birthDate: new Date('1991-06-12'),
      skills: ['3D моделирование', 'Дизайн', 'AutoCAD'],
      lastLogin: new Date('2024-01-18T14:30:00'),
      notes: 'На больничном',
      userId: 'user-8',
      currentTools: [],
      currentOrders: [],
      materialHistory: []
    }
  ])

  const departments = ref<Department[]>([
    { id: '1', name: 'Производство', employeeCount: 3, budget: 5000000, location: 'Цех №1' },
    { id: '2', name: 'Склад', employeeCount: 1, budget: 1500000, location: 'Складской комплекс' },
    { id: '3', name: 'Продажи', employeeCount: 1, budget: 3000000, location: 'Офис, 3 этаж' },
    { id: '4', name: 'Финансы', employeeCount: 1, budget: 1000000, location: 'Офис, 2 этаж' },
    { id: '5', name: 'Логистика', employeeCount: 1, budget: 2000000, location: 'Гараж' },
    { id: '6', name: 'Дизайн', employeeCount: 1, budget: 1800000, location: 'Офис, 4 этаж' }
  ])

  // Computed
  const totalEmployees = computed(() => employees.value.length)
  const activeEmployees = computed(() => employees.value.filter(e => e.status === 'active').length)
  const totalSalary = computed(() => employees.value.reduce((sum, emp) => sum + emp.salary, 0))

  const departmentStats = computed(() => {
    const stats: Record<string, { count: number, totalSalary: number }> = {}

    employees.value.forEach(emp => {
      if (!stats[emp.department]) {
        stats[emp.department] = { count: 0, totalSalary: 0 }
      }
      const deptStat = stats[emp.department]!
      deptStat.count++
      deptStat.totalSalary += emp.salary
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

    // Обновляем статистику отдела
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

      // Создаем полностью новый объект
      const updatedEmployee = { 
        ...employee, 
        ...updates
      } as Employee

      // Синхронизируем поля аватара и фото, если пришло только одно из них
      if (updates.avatar && !updates.photo) updatedEmployee.photo = updates.avatar
      if (updates.photo && !updates.avatar) updatedEmployee.avatar = updates.photo

      // Заменяем объект в массиве
      employees.value[index] = updatedEmployee

      // Принудительно триггерим реактивность всего массива через копирование
      employees.value = [...employees.value]

      // Обновляем статистику отделов если изменился отдел
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

  const getStatusColor = (status: Employee['status']) => {
    const colorMap: Record<Employee['status'], string> = {
      'active': 'success',
      'inactive': 'default',
      'vacation': 'warning',
      'sick': 'error'
    }
    return colorMap[status] || 'default'
  }

  return {
    employees,
    departments,
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
    getStatusColor
  }
})
