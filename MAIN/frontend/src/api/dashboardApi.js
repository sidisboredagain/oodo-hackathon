import api from './client'

export const dashboardApi = {
  getHRDashboardStats: async () => {
    const response = await api.get('/dashboard/hr')
    return response.data
  },
  getEmployeeDashboardStats: async () => {
    const response = await api.get('/dashboard/employee')
    return response.data
  },
}
