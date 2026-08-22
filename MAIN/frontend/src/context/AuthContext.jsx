/**
 * AuthContext — Global authentication state for Dayflow.
 *
 * Provides:
 *  - user: { user_id, email, role, employee_id, name } | null
 *  - token: string | null
 *  - isAuthenticated: boolean
 *  - isHR: boolean
 *  - isEmployee: boolean
 *  - loading: boolean (true while restoring from localStorage on first render)
 *  - login(token, userData): store auth state
 *  - logout(): clear auth state and redirect to /login
 *
 * Storage: JWT and user info are persisted in localStorage so the session
 * survives browser refresh. On mount, auth state is restored from storage.
 *
 * Security note (production):
 *   For production, replace localStorage with HttpOnly cookies so the token
 *   cannot be accessed by JavaScript (XSS protection). The login() function
 *   would then just store non-sensitive user info (name, role) while the
 *   token travels as a cookie automatically.
 */

import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [token, setToken]     = useState(null)
  const [loading, setLoading] = useState(true) // restoring from storage

  // Restore auth state from localStorage on first render
  useEffect(() => {
    const storedToken = localStorage.getItem('dayflow_token')
    const storedUser  = localStorage.getItem('dayflow_user')

    if (storedToken && storedUser) {
      try {
        setToken(storedToken)
        setUser(JSON.parse(storedUser))
      } catch {
        // Corrupt stored data — wipe it
        localStorage.removeItem('dayflow_token')
        localStorage.removeItem('dayflow_user')
      }
    }
    setLoading(false)
  }, [])

  /**
   * Store auth state after a successful login.
   * @param {string} accessToken  - JWT from the backend
   * @param {object} userData     - { user_id, email, role, employee_id, name }
   */
  function login(accessToken, userData) {
    setToken(accessToken)
    setUser(userData)
    localStorage.setItem('dayflow_token', accessToken)
    localStorage.setItem('dayflow_user', JSON.stringify(userData))
  }

  /** Clear all auth state and send user back to the login page. */
  function logout() {
    setToken(null)
    setUser(null)
    localStorage.removeItem('dayflow_token')
    localStorage.removeItem('dayflow_user')
    // Navigate is not available here (outside Router), so we use window.location
    window.location.href = '/login'
  }

  const isAuthenticated = !!token && !!user
  const isHR            = user?.role === 'hr'
  const isEmployee      = user?.role === 'employee'

  return (
    <AuthContext.Provider value={{
      user, token, login, logout,
      loading, isAuthenticated, isHR, isEmployee,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * useAuth — custom hook to access auth context.
 * Must be called inside a component wrapped by <AuthProvider>.
 */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be called inside <AuthProvider>')
  return ctx
}
