import api from './client'

export const leaveApi = {
  getMyLeaves: async () => {
    const response = await api.get('/leaves/me')
    return response.data
  },
  applyLeave: async (leaveData) => {
    const response = await api.post('/leaves/apply', leaveData)
    return response.data
  },
  getAllLeaves: async (params = {}) => {
    const response = await api.get('/leaves/all', { params })
    return response.data
  },
  updateLeaveStatus: async (leaveId, statusData) => {
    const response = await api.patch(`/leaves/${leaveId}/status`, statusData)
    return response.data
  },
}
