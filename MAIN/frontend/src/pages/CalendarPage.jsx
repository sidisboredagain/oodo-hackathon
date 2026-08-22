import React, { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Clock, TrendingUp } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import api from '../api/client'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function statusClass(status) {
  if (!status) return 'bg-slate-800/40 text-slate-600'
  if (status === 'present') return 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40'
  if (status === 'half-day') return 'bg-amber-500/25 text-amber-300 border-amber-500/40'
  if (status === 'absent') return 'bg-rose-500/25 text-rose-300 border-rose-500/40'
  if (status?.startsWith('leave:Paid')) return 'bg-sky-500/25 text-sky-300 border-sky-500/40'
  if (status?.startsWith('leave:Sick')) return 'bg-violet-500/25 text-violet-300 border-violet-500/40'
  if (status?.startsWith('leave:Unpaid')) return 'bg-orange-500/25 text-orange-300 border-orange-500/40'
  if (status === 'leave') return 'bg-sky-500/25 text-sky-300 border-sky-500/40'
  return 'bg-slate-700 text-slate-300'
}

function statusLabel(status) {
  if (!status) return ''
  if (status.startsWith('leave:')) return status.replace('leave:', '')
  return status
}

export default function CalendarPage() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/calendar/me', { params: { year, month } })
      setData(res.data)
    } catch (e) {
      setError('Could not load calendar data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [year, month])

  const prev = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const next = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  // Pad calendar grid (Mon-start)
  const firstWeekday = data?.days?.[0]?.weekday ?? 0 // 0=Mon in our API
  const blanks = Array(firstWeekday).fill(null)

  return (
    <DashboardLayout title="My Calendar" subtitle="Time off & work periods">
      <div className="max-w-5xl mx-auto space-y-6">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">{error}</div>
        )}

        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <button onClick={prev} className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-amber-400">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CalIcon className="w-5 h-5 text-amber-400" />
            {data?.month_name || '...'} {year}
          </h2>
          <button onClick={next} className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-amber-400">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs">
          {[
            ['Present', 'bg-emerald-500/25 border-emerald-500/40 text-emerald-300'],
            ['Half-day', 'bg-amber-500/25 border-amber-500/40 text-amber-300'],
            ['Paid PTO', 'bg-sky-500/25 border-sky-500/40 text-sky-300'],
            ['Sick', 'bg-violet-500/25 border-violet-500/40 text-violet-300'],
            ['Unpaid', 'bg-orange-500/25 border-orange-500/40 text-orange-300'],
            ['Absent', 'bg-rose-500/25 border-rose-500/40 text-rose-300'],
          ].map(([label, cls]) => (
            <span key={label} className={`px-2 py-1 rounded-md border ${cls}`}>{label}</span>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-slate-500 py-1">{d}</div>
            ))}
          </div>
          {loading ? (
            <div className="text-center py-16 text-slate-500 text-sm">Loading calendar...</div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {blanks.map((_, i) => <div key={`b${i}`} className="aspect-square" />)}
              {data?.days?.map((d) => (
                <div
                  key={d.date}
                  className={`aspect-square rounded-lg border p-1 flex flex-col items-center justify-center text-xs ${statusClass(d.status)}`}
                  title={d.status ? `${d.date}: ${statusLabel(d.status)}` : d.date}
                >
                  <span className="font-semibold">{d.day}</span>
                  {d.leave_type && (
                    <span className="text-[9px] mt-0.5 opacity-90">{d.leave_type}</span>
                  )}
                  {!d.leave_type && d.status === 'present' && d.working_hours != null && (
                    <span className="text-[9px] mt-0.5 opacity-80">{d.working_hours}h</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" /> This Month
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Present', data?.stats_month?.present_days],
                ['Half-days', data?.stats_month?.half_days],
                ['Leave days', data?.stats_month?.leave_days],
                ['Hours worked', data?.stats_month?.total_working_hours],
              ].map(([label, val]) => (
                <div key={label} className="bg-slate-800/60 rounded-xl p-3">
                  <div className="text-lg font-bold text-white">{val ?? '—'}</div>
                  <div className="text-xs text-slate-400">{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" /> Year to Date ({year})
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                ['Present', data?.stats_ytd?.present_days],
                ['Half-days', data?.stats_ytd?.half_days],
                ['Leave days', data?.stats_ytd?.leave_days],
                ['Hours worked', data?.stats_ytd?.total_working_hours],
              ].map(([label, val]) => (
                <div key={label} className="bg-slate-800/60 rounded-xl p-3">
                  <div className="text-lg font-bold text-white">{val ?? '—'}</div>
                  <div className="text-xs text-slate-400">{label}</div>
                </div>
              ))}
            </div>
            <div className="text-xs text-slate-400 space-y-1">
              <div className="font-semibold text-slate-300 mb-1">Leave breakdown (days)</div>
              {Object.entries(data?.leave_breakdown_ytd?.by_days || {}).length === 0 && (
                <div>No approved leave this year.</div>
              )}
              {Object.entries(data?.leave_breakdown_ytd?.by_days || {}).map(([type, days]) => (
                <div key={type} className="flex justify-between">
                  <span>{type}</span>
                  <span className="text-amber-300 font-medium">{days} days</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
