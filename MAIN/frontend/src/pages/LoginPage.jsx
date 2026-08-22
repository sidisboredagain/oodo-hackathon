import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Briefcase, Lock, IdCard, AlertCircle, ArrowRight, KeyRound, UserCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../api/authApi'

export default function LoginPage() {
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await authApi.login({ login_id: loginId.trim().toUpperCase(), password })
      login(data.access_token, {
        user_id: data.user_id,
        email: data.email,
        name: data.name,
        role: data.role,
        employee_id: data.employee_id,
      })
      navigate(data.role === 'hr' ? '/dashboard/hr' : '/dashboard/employee', { replace: true })
    } catch (err) {
      const detail = err.response?.data?.detail
      if (typeof detail === 'string') setError(detail)
      else if (Array.isArray(detail)) setError(detail.map((d) => d.msg).join(', '))
      else setError('Unable to connect. Please ensure the server is running.')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (id, pw) => {
    setLoginId(id)
    setPassword(pw)
    setError('')
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center py-12 px-4">
      <div className="inline-flex items-center justify-center p-3 bg-gradient-to-tr from-amber-500 to-yellow-600 rounded-2xl shadow-xl mb-4">
        <Briefcase className="w-8 h-8 text-black" />
      </div>
      <h1 className="text-3xl font-extrabold text-white tracking-tight text-center">
        Dayflow <span className="text-amber-400">HRMS</span>
      </h1>
      <p className="mt-2 text-sm text-slate-400 text-center">Sign in with your unique Login ID</p>

      <div className="mt-8 w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        {error && (
          <div className="mb-5 flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Login ID</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <IdCard className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={loginId}
                onChange={(e) => setLoginId(e.target.value.toUpperCase())}
                placeholder="e.g. OIALJO20240001"
                className="block w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                autoComplete="username"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="block w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                autoComplete="current-password"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-black bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : <>Sign In <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-800">
          <div className="flex items-center gap-1.5 mb-2.5 text-xs text-slate-400 font-medium">
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            Quick Demo Accounts (click to autofill)
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => fillDemo('OIMOHA20230001', 'HRAdmin2026')}
              className="text-left p-2.5 bg-slate-800/50 hover:bg-amber-950/40 border border-slate-700 hover:border-amber-500/40 rounded-lg text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-amber-300"><UserCheck className="w-3.5 h-3.5" /> HR Admin</div>
              <div className="text-[11px] text-slate-400 mt-0.5 font-mono">OIMOHA20230001</div>
            </button>
            <button type="button" onClick={() => fillDemo('OIALJO20240001', 'Employee2026')}
              className="text-left p-2.5 bg-slate-800/50 hover:bg-amber-950/40 border border-slate-700 hover:border-amber-500/40 rounded-lg text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-amber-300"><UserCheck className="w-3.5 h-3.5" /> Employee</div>
              <div className="text-[11px] text-slate-400 mt-0.5 font-mono">OIALJO20240001</div>
            </button>
          </div>
        </div>
        <div className="mt-4 text-center text-xs text-slate-400">
          Need a new account? <Link to="/signup" className="text-amber-400 hover:text-amber-300 font-medium">Register here</Link>
        </div>
      </div>
    </div>
  )
}
