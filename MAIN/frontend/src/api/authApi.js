import api from './client'

export const authApi = {
  login: async (credentials) => {
    // Supports { login_id, password }
    const response = await api.post('/auth/login', credentials)
    return response.data
  },
  register: async (userData) => {
    const response = await api.post('/auth/register', userData)
    return response.data
  },
  verifyEmail: async (data) => {
    const response = await api.post('/auth/verify-email', data)
    return response.data
  },
  getMe: async () => {
    const response = await api.get('/auth/me')
    return response.data
  },
}
