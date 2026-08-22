import api from './client'

export const attendanceApi = {
  getMyAttendance: async (params = {}) => {
    const response = await api.get('/attendance/me', { params })
    return response.data
  },
  getTodayAttendance: async () => {
    const response = await api.get('/attendance/today')
    return response.data
  },
  checkIn: async () => {
    const response = await api.post('/attendance/check-in')
    return response.data
  },
  checkOut: async () => {
    const response = await api.post('/attendance/check-out')
    return response.data
  },
  getAllAttendance: async (params = {}) => {
    const response = await api.get('/attendance/all', { params })
    return response.data
  },
  recordAttendance: async (recordData) => {
    const response = await api.post('/attendance/record', recordData)
    return response.data
  },
}
