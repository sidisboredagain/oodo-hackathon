import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Clock,
  Calendar,
  DollarSign,
  Bell,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  UserCircle2,
  Loader2,
  LogIn,
  LogOut,
  CalendarCheck,
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import { useAuth } from '../context/AuthContext'
import { dashboardApi } from '../api/dashboardApi'
import { attendanceApi } from '../api/attendanceApi'

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colorMap = {
    blue:    'bg-blue-500/15 text-blue-400 border-blue-500/30',
    emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    violet:  'bg-violet-500/15 text-violet-400 border-violet-500/30',
    amber:   'bg-amber-500/15 text-amber-400 border-amber-500/30',
  }
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-lg border ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
      <p className="text-slate-300 text-sm font-medium mt-0.5">{label}</p>
      {sub && <p className="text-slate-400 text-xs mt-1">{sub}</p>}
    </div>
  )
}

export default function EmployeeDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString())

  // Keep live digital clock updating
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const loadDashboard = async () => {
    try {
      setError('')
      const stats = await dashboardApi.getEmployeeDashboardStats()
      setData(stats)
    } catch (err) {
      setError('Unable to load live dashboard statistics. Please ensure backend is reachable.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const handleCheckIn = async () => {
    setActionLoading(true)
    setActionMessage('')
    try {
      const res = await attendanceApi.checkIn()
      setActionMessage(res.message || 'Checked in successfully!')
      await loadDashboard()
    } catch (err) {
      setActionMessage(err.response?.data?.detail || 'Failed to check in.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCheckOut = async () => {
    setActionLoading(true)
    setActionMessage('')
    try {
      const res = await attendanceApi.checkOut()
      setActionMessage(res.message || 'Checked out successfully!')
      await loadDashboard()
    } catch (err) {
      setActionMessage(err.response?.data?.detail || 'Failed to check out.')
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
            <span className="text-sm font-medium">Fetching real-time employee data...</span>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Top greeting header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Welcome back, {user?.name?.split(' ')[0] || 'Team Member'} 👋
            </h1>
            <p className="text-slate-400 text-sm mt-1">{todayStr}</p>
          </div>
          <Link
            to={`/profile/${user?.user_id || user?.id}`}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm font-medium text-slate-200 hover:text-white transition-all w-fit shadow-xs"
          >
            <UserCircle2 className="w-4 h-4 text-blue-400" />
            View Full Profile
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Profile overview & quick attendance widget */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Employee Details Card */}
          <div className="lg:col-span-2 bg-gradient-to-br from-blue-900/30 via-slate-900 to-indigo-900/20 border border-blue-500/20 rounded-2xl p-6 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-500/20 flex-shrink-0">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold text-white truncate">{user?.name}</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {data?.profile?.employment_status || 'Full-Time'}
                  </span>
                </div>
                <p className="text-blue-300 text-sm font-medium mt-0.5">
                  {data?.profile?.job_title} • {data?.profile?.department}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-2">
                  <span>ID: <strong className="text-slate-300 font-mono">{user?.employee_id}</strong></span>
                  <span>Email: <strong className="text-slate-300">{user?.email}</strong></span>
                  {data?.profile?.joining_date && (
                    <span>Joined: <strong className="text-slate-300">{data?.profile?.joining_date}</strong></span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Clock in/out widget */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-md">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Attendance Clock</span>
                <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 font-medium">
                  {currentTime}
                </span>
              </div>

              <div className="mt-4 mb-2">
                <div className="text-sm font-medium text-slate-300">
                  Status: {' '}
                  <span className={`font-semibold ${data?.today_attendance?.is_checked_in ? (data?.today_attendance?.is_checked_out ? 'text-violet-400' : 'text-emerald-400') : 'text-amber-400'}`}>
                    {data?.today_attendance?.is_checked_in
                      ? (data?.today_attendance?.is_checked_out ? 'Checked Out for Today' : 'Clocked In (Active)')
                      : 'Not Clocked In Today'}
                  </span>
                </div>
                {data?.today_attendance?.check_in && (
                  <p className="text-xs text-slate-400 mt-1">
                    Clocked in at: <strong className="text-slate-200">{data?.today_attendance?.check_in}</strong>
                    {data?.today_attendance?.check_out && ` • Out: ${data?.today_attendance?.check_out}`}
                  </p>
                )}
                {actionMessage && (
                  <p className="text-xs text-blue-300 bg-blue-500/10 p-2 rounded border border-blue-500/20 mt-2">
                    {actionMessage}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-3">
              {!data?.today_attendance?.is_checked_in ? (
                <button
                  type="button"
                  onClick={handleCheckIn}
                  disabled={actionLoading}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                  Clock In Now
                </button>
              ) : !data?.today_attendance?.is_checked_out ? (
                <button
                  type="button"
                  onClick={handleCheckOut}
                  disabled={actionLoading}
                  className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-600/20 disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                  Clock Out
                </button>
              ) : (
                <div className="text-center py-2 text-xs text-slate-400 bg-slate-800/50 rounded-xl border border-slate-800">
                  Completed {data?.today_attendance?.working_hours || 0} working hours today
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live Monthly Quick Stats */}
        <div>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Live Statistics</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Clock}
              label="Days Present"
              value={data?.monthly_present_days ?? 0}
              sub="this calendar month"
              color="emerald"
            />
            <StatCard
              icon={Calendar}
              label="Paid Leave Left"
              value={`${data?.leave_summary?.paid_remaining ?? 0} days`}
              sub={`of ${data?.leave_summary?.paid_allowance ?? 18} days total`}
              color="blue"
            />
            <StatCard
              icon={CalendarCheck}
              label="Sick Leave Left"
              value={`${data?.leave_summary?.sick_remaining ?? 0} days`}
              sub={`of ${data?.leave_summary?.sick_allowance ?? 10} days total`}
              color="violet"
            />
            <StatCard
              icon={AlertCircle}
              label="Pending Leaves"
              value={data?.leave_summary?.pending_count ?? 0}
              sub="awaiting HR review"
              color="amber"
            />
          </div>
        </div>

        {/* Bottom 2 columns: Recent Leave Requests & Notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Leave Requests */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  Recent Leave Requests
                </h3>
                <Link to="/leave" className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  View all / Apply
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {!data?.recent_leaves || data.recent_leaves.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No recent leave requests found.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {data.recent_leaves.map((leave) => {
                    const statusColor =
                      leave.status === 'approved'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : leave.status === 'rejected'
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/30'

                    return (
                      <div
                        key={leave.id}
                        className="flex items-center justify-between p-3.5 bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/50 rounded-xl transition-all"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {leave.leave_type} Leave ({leave.days} {leave.days === 1 ? 'day' : 'days'})
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {leave.start_date} to {leave.end_date} {leave.remarks ? `• "${leave.remarks}"` : ''}
                          </p>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border capitalize ${statusColor}`}>
                          {leave.status}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800/80">
              <Link
                to="/leave"
                className="w-full py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
              >
                + Submit New Leave Application
              </Link>
            </div>
          </div>

          {/* Internal Notifications */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-violet-400" />
                Notifications & Updates
              </h3>
              <span className="text-xs text-slate-500 font-medium">Live from backend</span>
            </div>

            {!data?.notifications || data.notifications.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                No notifications at this time.
              </div>
            ) : (
              <div className="space-y-2.5">
                {data.notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="p-3.5 bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700/50 rounded-xl transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-white">{notif.title}</p>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {notif.created_at ? notif.created_at.split('T')[0] : ''}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{notif.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}
