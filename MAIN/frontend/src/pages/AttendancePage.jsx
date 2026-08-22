import React, { useEffect, useState } from 'react'
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  LogIn,
  LogOut,
  PlusCircle,
  Loader2,
  Filter,
  Users,
  Search,
  X,
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import { useAuth } from '../context/AuthContext'
import { attendanceApi } from '../api/attendanceApi'
import { employeeApi } from '../api/employeeApi'

export default function AttendancePage() {
  const { user, isHR } = useAuth()
  const [records, setRecords] = useState([])
  const [todayRecord, setTodayRecord] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString())

  // HR Manual Attendance Log Modal State
  const [isLogModalOpen, setIsLogModalOpen] = useState(false)
  const [employeesList, setEmployeesList] = useState([])
  const [manualForm, setManualForm] = useState({
    user_id: '',
    date: new Date().toISOString().split('T')[0],
    status: 'present',
    working_hours: 8.0,
  })

  // Digital clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const loadData = async () => {
    try {
      setError('')
      if (isHR) {
        const [attData, emps] = await Promise.all([
          attendanceApi.getAllAttendance({ date: selectedDate || undefined }),
          employeeApi.getEmployees(),
        ])
        setRecords(attData)
        setEmployeesList(emps)
      } else {
        const [myAtt, today] = await Promise.all([
          attendanceApi.getMyAttendance(),
          attendanceApi.getTodayAttendance(),
        ])
        setRecords(myAtt)
        setTodayRecord(today)
      }
    } catch (err) {
      setError('Unable to load attendance records. Please check backend connection.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedDate, isHR])

  const handleCheckIn = async () => {
    setActionLoading(true)
    setMessage('')
    try {
      const res = await attendanceApi.checkIn()
      setMessage(res.message || 'Checked in successfully!')
      await loadData()
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Failed to check in.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCheckOut = async () => {
    setActionLoading(true)
    setMessage('')
    try {
      const res = await attendanceApi.checkOut()
      setMessage(res.message || 'Checked out successfully!')
      await loadData()
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Failed to check out.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleManualRecordSubmit = async (e) => {
    e.preventDefault()
    if (!manualForm.user_id) {
      setError('Please select an employee.')
      return
    }
    setActionLoading(true)
    setError('')
    try {
      await attendanceApi.recordAttendance({
        user_id: parseInt(manualForm.user_id, 10),
        date: manualForm.date,
        status: manualForm.status,
        working_hours: parseFloat(manualForm.working_hours) || 0.0,
      })
      setMessage('Attendance record saved successfully.')
      setIsLogModalOpen(false)
      await loadData()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to record attendance.')
    } finally {
      setActionLoading(false)
    }
  }

  // Calculate employee stats
  const totalPresentDays = records.filter(r => r.status === 'present').length
  const totalHalfDays = records.filter(r => r.status === 'half-day').length
  const totalHoursWorked = records.reduce((acc, r) => acc + (r.working_hours || 0), 0)

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Clock className="w-7 h-7 text-blue-500" />
              Attendance Management
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {isHR
                ? 'Review company daily logs, verify working hours, and manually record attendance'
                : 'Track your daily check-in, check-out times, and working history'}
            </p>
          </div>

          {isHR && (
            <button
              type="button"
              onClick={() => {
                if (employeesList.length > 0) {
                  setManualForm({
                    user_id: employeesList[0].user_id,
                    date: selectedDate || new Date().toISOString().split('T')[0],
                    status: 'present',
                    working_hours: 8.0,
                  })
                }
                setIsLogModalOpen(true)
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all cursor-pointer w-fit"
            >
              <PlusCircle className="w-4 h-4" />
              Log / Edit Attendance Record
            </button>
          )}
        </div>

        {message && (
          <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Employee Check-In / Check-Out Action Banner */}
        {!isHR && (
          <div className="bg-gradient-to-r from-blue-900/40 via-slate-900 to-indigo-900/30 border border-blue-500/20 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-white">Daily Punch Clock</h2>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {currentTime}
                  </span>
                </div>
                <p className="text-slate-400 text-xs mt-1">
                  Today is {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>

                <div className="mt-3 flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-slate-500">Check In:</span>{' '}
                    <strong className="text-white">{todayRecord?.record?.check_in ? todayRecord.record.check_in.split('T')[1]?.slice(0, 8) : 'Not yet'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Check Out:</span>{' '}
                    <strong className="text-white">{todayRecord?.record?.check_out ? todayRecord.record.check_out.split('T')[1]?.slice(0, 8) : 'Not yet'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Hours:</span>{' '}
                    <strong className="text-emerald-400">{todayRecord?.record?.working_hours || 0} hrs</strong>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {!todayRecord?.is_checked_in ? (
                  <button
                    type="button"
                    onClick={handleCheckIn}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                    Clock In Now
                  </button>
                ) : !todayRecord?.is_checked_out ? (
                  <button
                    type="button"
                    onClick={handleCheckOut}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-amber-600/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                    Clock Out
                  </button>
                ) : (
                  <span className="px-4 py-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold">
                    ✓ Completed for today ({todayRecord?.record?.working_hours}h)
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* HR Date Filter Toolbar */}
        {isHR && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                Filter by Date:
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setSelectedDate('')}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
              >
                Show All Dates
              </button>
            </div>

            <div className="text-xs text-slate-400">
              Showing <strong className="text-white">{records.length}</strong> attendance record(s)
            </div>
          </div>
        )}

        {/* Summary Stats Cards */}
        {!isHR && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase">Days Present</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{totalPresentDays}</p>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase">Half Days</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">{totalHalfDays}</p>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-400 uppercase">Total Hours Logged</p>
              <p className="text-2xl font-bold text-blue-400 mt-1">{totalHoursWorked.toFixed(1)} hrs</p>
            </div>
          </div>
        )}

        {/* Attendance Records Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span className="text-sm">Loading attendance logs...</span>
            </div>
          </div>
        ) : records.length === 0 ? (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
            <Clock className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <p className="text-base font-semibold text-slate-300">No attendance logs found</p>
            <p className="text-xs text-slate-500 mt-1">
              {isHR ? 'No attendance recorded for the selected date.' : 'Clock in using the button above to create your first record.'}
            </p>
          </div>
        ) : (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <tr>
                    {isHR && <th className="px-5 py-3.5">Employee</th>}
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Check In</th>
                    <th className="px-5 py-3.5">Check Out</th>
                    <th className="px-5 py-3.5">Hours</th>
                    <th className="px-5 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {records.map((rec) => {
                    const statusColor =
                      rec.status === 'present'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : rec.status === 'half-day'
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-400 border-rose-500/30'

                    return (
                      <tr key={rec.id} className="hover:bg-slate-800/40 transition-colors">
                        {isHR && (
                          <td className="px-5 py-4">
                            <div className="font-bold text-white">{rec.name || 'Staff Member'}</div>
                            <div className="text-xs text-slate-400 font-mono">{rec.employee_id} • {rec.department}</div>
                          </td>
                        )}
                        <td className="px-5 py-4 font-semibold text-slate-200">
                          {rec.date}
                        </td>
                        <td className="px-5 py-4 text-xs font-mono text-slate-300">
                          {rec.check_in ? rec.check_in.split('T')[1]?.slice(0, 8) || rec.check_in : '—'}
                        </td>
                        <td className="px-5 py-4 text-xs font-mono text-slate-300">
                          {rec.check_out ? rec.check_out.split('T')[1]?.slice(0, 8) || rec.check_out : '—'}
                        </td>
                        <td className="px-5 py-4 text-xs font-semibold text-blue-400">
                          {rec.working_hours ? `${rec.working_hours} hrs` : '—'}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-semibold border capitalize ${statusColor}`}>
                            {rec.status}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: HR Manual Attendance Log */}
        {isLogModalOpen && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-blue-500" />
                  Log / Override Attendance
                </h3>
                <button
                  onClick={() => setIsLogModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleManualRecordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Select Employee *</label>
                  <select
                    required
                    value={manualForm.user_id}
                    onChange={(e) => setManualForm({ ...manualForm, user_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                  >
                    {employeesList.map((emp) => (
                      <option key={emp.user_id} value={emp.user_id}>
                        {emp.name} ({emp.employee_id} - {emp.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={manualForm.date}
                    onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Status</label>
                    <select
                      value={manualForm.status}
                      onChange={(e) => setManualForm({ ...manualForm, status: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                    >
                      <option value="present">Present</option>
                      <option value="half-day">Half-Day</option>
                      <option value="absent">Absent</option>
                      <option value="leave">On Leave</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      value={manualForm.working_hours}
                      onChange={(e) => setManualForm({ ...manualForm, working_hours: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsLogModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
                  >
                    {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Record
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}
