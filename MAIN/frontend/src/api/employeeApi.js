import api from './client'

export const employeeApi = {
  getEmployees: async (params = {}) => {
    const response = await api.get('/employees', { params })
    return response.data
  },
  getEmployee: async (userId) => {
    const response = await api.get(`/employees/${userId}`)
    return response.data
  },
  createEmployee: async (employeeData) => {
    const response = await api.post('/employees', employeeData)
    return response.data
  },
  updateEmployee: async (userId, employeeData) => {
    const response = await api.patch(`/employees/${userId}`, employeeData)
    return response.data
  },
  deleteEmployee: async (userId) => {
    const response = await api.delete(`/employees/${userId}`)
    return response.data
  },
}
