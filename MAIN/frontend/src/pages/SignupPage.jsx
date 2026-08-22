import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Briefcase, AlertCircle, CheckCircle2 } from 'lucide-react'
import api from '../api/client'

export default function SignupPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm_password: '',
    department: 'Engineering',
    job_title: 'Team Member',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdId, setCreatedId] = useState('')

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.')
      return
    }
    if (form.password.length < 8 || !/\d/.test(form.password)) {
      setError('Password must be at least 8 characters and contain a number.')
      return
    }
    setLoading(true)
    try {
      const res = await api.post('/auth/register', {
        name: form.name,
        email: form.email,
        password: form.password,
        department: form.department,
        job_title: form.job_title,
      })
      setCreatedId(res.data.login_id || res.data.employee_id)
    } catch (err) {
      const d = err.response?.data?.detail
      setError(typeof d === 'string' ? d : Array.isArray(d) ? d.map(x => x.msg).join(', ') : 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  if (createdId) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Account Created</h2>
          <p className="text-slate-400 text-sm mb-4">Save your unique Login ID — you will use it to sign in.</p>
          <div className="bg-slate-800 border border-amber-500/40 rounded-xl py-3 px-4 font-mono text-amber-300 text-lg font-bold tracking-wide mb-6">
            {createdId}
          </div>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-semibold"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-gradient-to-tr from-amber-500 to-yellow-600 rounded-2xl mb-3">
            <Briefcase className="w-7 h-7 text-black" />
          </div>
          <h1 className="text-2xl font-bold text-white">Create Employee Account</h1>
          <p className="text-slate-400 text-sm mt-1">Your Login ID will be generated automatically</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          {error && (
            <div className="mb-4 flex gap-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{typeof error === 'string' ? error : JSON.stringify(error)}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Full Name</label>
              <input name="name" required value={form.name} onChange={handleChange}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="Alice Johnson" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Email</label>
              <input name="email" type="email" required value={form.email} onChange={handleChange}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                placeholder="you@company.com" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Department</label>
                <select name="department" value={form.department} onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm">
                  {['Engineering','Design','Marketing','Analytics','Sales','HR','Finance'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Job Title</label>
                <input name="job_title" value={form.job_title} onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Password</label>
              <input name="password" type="password" required value={form.password} onChange={handleChange}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-amber-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Confirm Password</label>
              <input name="confirm_password" type="password" required value={form.confirm_password} onChange={handleChange}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-amber-500 outline-none" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-semibold disabled:opacity-50">
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>
          <p className="mt-4 text-center text-xs text-slate-400">
            Already have an account? <Link to="/login" className="text-amber-400">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
