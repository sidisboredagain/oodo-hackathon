import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  DollarSign,
  UserPlus,
  ArrowRight,
  Loader2,
  Building2,
  Check,
  X,
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import { useAuth } from '../context/AuthContext'
import { dashboardApi } from '../api/dashboardApi'
import { leaveApi } from '../api/leaveApi'

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colorMap = {
    blue:    'bg-blue-500/15 text-blue-400 border-blue-500/30',
    emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    violet:  'bg-violet-500/15 text-violet-400 border-violet-500/30',
    amber:   'bg-amber-500/15 text-amber-400 border-amber-500/30',
  }
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all shadow-sm">
      <div className={`p-2.5 rounded-lg border w-fit mb-3 ${colorMap[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      <p className="text-slate-300 text-sm font-medium mt-0.5">{label}</p>
      {sub && <p className="text-slate-400 text-xs mt-1">{sub}</p>}
    </div>
  )
}

export default function HRDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  const loadData = async () => {
    try {
      setError('')
      const stats = await dashboardApi.getHRDashboardStats()
      setData(stats)
    } catch (err) {
      setError('Unable to load HR dashboard statistics. Please ensure backend is running.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleQuickLeaveAction = async (leaveId, status) => {
    setActionLoading(true)
    setStatusMessage('')
    try {
      await leaveApi.updateLeaveStatus(leaveId, {
        status,
        admin_comment: `Quick ${status} from HR Dashboard`,
      })
      setStatusMessage(`Leave request successfully marked as ${status}.`)
      await loadData()
    } catch (err) {
      setStatusMessage(err.response?.data?.detail || 'Failed to update leave request.')
    } finally {
      setActionLoading(false)
    }
  }

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="text-sm font-medium">Calculating live HR metrics...</span>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              HR Administration Overview 👥
            </h1>
            <p className="text-slate-400 text-sm mt-1">{todayStr} • Logged in as HR Admin ({user?.name})</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/employees"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Manage & Add Employees
            </Link>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {statusMessage && (
          <div className="flex items-center gap-3 p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-300 text-sm">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-blue-400" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Live Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Total Employees"
            value={data?.total_employees ?? 0}
            sub="Registered staff members"
            color="blue"
          />
          <StatCard
            icon={CheckCircle2}
            label="Present Today"
            value={data?.present_today ?? 0}
            sub="Clocked in & active"
            color="emerald"
          />
          <StatCard
            icon={XCircle}
            label="Absent / Not Clocked"
            value={data?.absent_today ?? 0}
            sub="Out of office"
            color="amber"
          />
          <StatCard
            icon={Calendar}
            label="Pending Leaves"
            value={data?.pending_leaves_count ?? 0}
            sub="Action required"
            color="violet"
          />
        </div>

        {/* Middle row: Pending Leave Approvals & Department Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Pending Leaves Actions (2 cols) */}
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  Leave Requests Awaiting Decision
                </h3>
                <Link to="/leave" className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  View all leaves
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {!data?.recent_leaves || data.recent_leaves.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-sm">
                  No leave requests currently in system.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.recent_leaves.map((leave) => (
                    <div
                      key={leave.id}
                      className="p-4 bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/50 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{leave.name}</span>
                          <span className="text-xs text-slate-400 font-mono">({leave.employee_id})</span>
                          <span className="text-xs text-slate-500">• {leave.department}</span>
                        </div>
                        <p className="text-xs text-blue-300 mt-1">
                          <strong>{leave.leave_type} Leave:</strong> {leave.start_date} to {leave.end_date} ({leave.days} {leave.days === 1 ? 'day' : 'days'})
                        </p>
                        {leave.remarks && (
                          <p className="text-xs text-slate-400 italic mt-0.5">"{leave.remarks}"</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {leave.status === 'pending' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleQuickLeaveAction(leave.id, 'approved')}
                              disabled={actionLoading}
                              className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickLeaveAction(leave.id, 'rejected')}
                              disabled={actionLoading}
                              className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border capitalize ${
                            leave.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          }`}>
                            {leave.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800">
              <Link
                to="/leave"
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                Go to Full Leave Management Console →
              </Link>
            </div>
          </div>

          {/* Department Breakdown */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-violet-400" />
                Department Breakdown
              </h3>
              <span className="text-xs text-slate-500 font-mono">Real-time</span>
            </div>

            {!data?.department_summary || data.department_summary.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                No departmental data found.
              </div>
            ) : (
              <div className="space-y-4">
                {data.department_summary.map((dept, i) => {
                  const total = data.total_employees || 1
                  const percentage = Math.round((dept.count / total) * 100)
                  return (
                    <div key={i} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-300">{dept.name}</span>
                        <span className="font-mono text-slate-400">{dept.count} members ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(10, percentage)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-400">
              <p>Total Estimated Monthly Payroll: <strong className="text-emerald-400 font-semibold">${data?.total_payroll ? Number(data.total_payroll).toLocaleString() : '0'}</strong></p>
            </div>
          </div>

        </div>

      </div>
    </DashboardLayout>
  )
}
