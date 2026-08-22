/**
 * ProtectedRoute
 * ==============
 * A route guard that enforces authentication and optional role requirements.
 *
 * Props:
 *  - children:      JSX to render if access is granted
 *  - allowedRoles:  string[] — if provided, user must have one of these roles
 *
 * Behaviour:
 *  - While auth is being restored from storage: show a loading spinner
 *    (prevents a flash redirect before we know the user is logged in).
 *  - Not authenticated → redirect to /login.
 *  - Authenticated but wrong role → redirect to their own dashboard.
 *
 * IMPORTANT: This is a frontend convenience only.
 * Real authorization is enforced by the FastAPI backend on every API call.
 * An employee cannot bypass this by navigating directly to /dashboard/hr
 * and then making API calls — the backend will return 403.
 */

import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user, loading } = useAuth()

  // Show a loading screen while auth state is being restored from localStorage.
  // Without this, the app flashes /login before realising the user is logged in.
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <span className="w-5 h-5 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-sm">Loading Dayflow...</span>
        </div>
      </div>
    )
  }

  // Not logged in → send to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Logged in but wrong role → send to their own dashboard, not a generic error
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const redirectTo = user.role === 'hr' ? '/dashboard/hr' : '/dashboard/employee'
    return <Navigate to={redirectTo} replace />
  }

  return children
}
