/**
 * Axios API client for Dayflow HRMS.
 *
 * - Base URL: /api  (proxied by Vite to http://localhost:8000 in dev)
 * - Automatically attaches the JWT Bearer token from localStorage.
 * - On 401 (unauthorized / expired token): clears storage and redirects to /login.
 *
 * Security note (production):
 *   In production, store the JWT in an HttpOnly cookie instead of localStorage.
 *   HttpOnly cookies are inaccessible to JavaScript, protecting against XSS.
 *   You would then remove the Authorization header injection here and rely on
 *   the browser sending the cookie automatically on same-origin requests.
 */

import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach JWT to every outgoing request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('dayflow_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// On 401: token is missing, invalid, or expired → clear auth and redirect
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('dayflow_token')
      localStorage.removeItem('dayflow_user')
      // Only redirect if not already on the login page (prevents redirect loop)
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
