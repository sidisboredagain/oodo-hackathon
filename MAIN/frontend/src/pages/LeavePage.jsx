import React, { useEffect, useState } from 'react'
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  PlusCircle,
  Loader2,
  AlertCircle,
  Check,
  X,
  MessageSquare,
  Filter,
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import { useAuth } from '../context/AuthContext'
import { leaveApi } from '../api/leaveApi'

export default function LeavePage() {
  const { user, isHR } = useAuth()
  const [leaves, setLeaves] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Apply Leave Modal State
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false)
  const [applyForm, setApplyForm] = useState({
    leave_type: 'Paid',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    remarks: '',
  })

  // Review Modal State (HR)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [selectedLeave, setSelectedLeave] = useState(null)
  const [reviewStatus, setReviewStatus] = useState('approved')
  const [adminComment, setAdminComment] = useState('')

  const loadLeaves = async () => {
    try {
      setError('')
      if (isHR) {
        const data = await leaveApi.getAllLeaves({
          status: statusFilter !== 'all' ? statusFilter : undefined,
        })
        setLeaves(data)
      } else {
        const data = await leaveApi.getMyLeaves()
        setLeaves(data.requests || [])
        setSummary(data.summary || null)
      }
    } catch (err) {
      setError('Unable to load leave requests. Please check backend connection.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLeaves()
  }, [statusFilter, isHR])

  const handleApplySubmit = async (e) => {
    e.preventDefault()
    if (applyForm.end_date < applyForm.start_date) {
      setError('End date cannot be earlier than start date.')
      return
    }

    setActionLoading(true)
    setError('')
    setFeedback('')

    try {
      await leaveApi.applyLeave(applyForm)
      setFeedback('Leave application submitted successfully. Awaiting HR review.')
      setIsApplyModalOpen(false)
      setApplyForm({
        leave_type: 'Paid',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        remarks: '',
      })
      await loadLeaves()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit leave application.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleReviewSubmit = async (e) => {
    e.preventDefault()
    if (!selectedLeave) return

    setActionLoading(true)
    setError('')
    setFeedback('')

    try {
      await leaveApi.updateLeaveStatus(selectedLeave.id, {
        status: reviewStatus,
        admin_comment: adminComment,
      })
      setFeedback(`Leave request marked as ${reviewStatus}.`)
      setReviewModalOpen(false)
      setSelectedLeave(null)
      setAdminComment('')
      await loadLeaves()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update leave status.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Calendar className="w-7 h-7 text-blue-500" />
              Leave Management
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {isHR
                ? 'Review, approve, or reject employee leave applications across departments'
                : 'Apply for time off, view your available allowances, and track approval status'}
            </p>
          </div>

          {!isHR && (
            <button
              type="button"
              onClick={() => setIsApplyModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all cursor-pointer w-fit"
            >
              <PlusCircle className="w-4 h-4" />
              Apply for Leave
            </button>
          )}
        </div>

        {feedback && (
          <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Employee Leave Balance Summary Cards */}
        {!isHR && summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
              <span className="text-xs font-semibold text-blue-400 uppercase">Paid Leave Remaining</span>
              <p className="text-2xl font-bold text-white mt-1">{summary.paid_remaining} days</p>
              <p className="text-xs text-slate-400 mt-0.5">{summary.paid_used} used of {summary.paid_allowance} allowance</p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
              <span className="text-xs font-semibold text-violet-400 uppercase">Sick Leave Remaining</span>
              <p className="text-2xl font-bold text-white mt-1">{summary.sick_remaining} days</p>
              <p className="text-xs text-slate-400 mt-0.5">{summary.sick_used} used of {summary.sick_allowance} allowance</p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
              <span className="text-xs font-semibold text-amber-400 uppercase">Pending Requests</span>
              <p className="text-2xl font-bold text-white mt-1">{summary.pending_count}</p>
              <p className="text-xs text-slate-400 mt-0.5">Awaiting HR decision</p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
              <span className="text-xs font-semibold text-emerald-400 uppercase">Unpaid Days Taken</span>
              <p className="text-2xl font-bold text-white mt-1">{summary.unpaid_used} days</p>
              <p className="text-xs text-slate-400 mt-0.5">Total unpaid absence</p>
            </div>
          </div>
        )}

        {/* HR Filter Tabs */}
        {isHR && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 shadow-sm flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-semibold text-slate-400 uppercase px-2">Status:</span>
            {['all', 'pending', 'approved', 'rejected'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        )}

        {/* Leave Requests Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span className="text-sm">Loading leave applications...</span>
            </div>
          </div>
        ) : leaves.length === 0 ? (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <p className="text-base font-semibold text-slate-300">No leave requests found</p>
            <p className="text-xs text-slate-500 mt-1">
              {isHR ? 'No leave records match the selected filter.' : 'Click "Apply for Leave" above to request time off.'}
            </p>
          </div>
        ) : (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <tr>
                    {isHR && <th className="px-5 py-3.5">Employee</th>}
                    <th className="px-5 py-3.5">Leave Type</th>
                    <th className="px-5 py-3.5">Dates / Duration</th>
                    <th className="px-5 py-3.5">Reason / Remarks</th>
                    <th className="px-5 py-3.5">Status</th>
                    {isHR && <th className="px-5 py-3.5 text-right">Decision</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {leaves.map((leave) => {
                    const statusColor =
                      leave.status === 'approved'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : leave.status === 'rejected'
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                        : 'bg-amber-500/20 text-amber-400 border-amber-500/30'

                    return (
                      <tr key={leave.id} className="hover:bg-slate-800/40 transition-colors">
                        {isHR && (
                          <td className="px-5 py-4">
                            <div className="font-bold text-white">{leave.name}</div>
                            <div className="text-xs text-slate-400 font-mono">{leave.employee_id} • {leave.department}</div>
                          </td>
                        )}

                        <td className="px-5 py-4">
                          <span className="font-semibold text-white">{leave.leave_type}</span>
                        </td>

                        <td className="px-5 py-4 text-xs">
                          <div className="font-medium text-slate-200">{leave.start_date} to {leave.end_date}</div>
                          <div className="text-blue-400 mt-0.5 font-semibold">{leave.days} {leave.days === 1 ? 'day' : 'days'} total</div>
                        </td>

                        <td className="px-5 py-4 text-xs text-slate-300 max-w-xs">
                          <div className="truncate">{leave.remarks || '—'}</div>
                          {leave.admin_comment && (
                            <div className="text-[11px] text-blue-300 mt-1 italic">
                              HR Note: "{leave.admin_comment}"
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-semibold border capitalize ${statusColor}`}>
                            {leave.status}
                          </span>
                        </td>

                        {isHR && (
                          <td className="px-5 py-4 text-right">
                            {leave.status === 'pending' ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedLeave(leave)
                                    setReviewStatus('approved')
                                    setAdminComment('Approved by HR')
                                    setReviewModalOpen(true)
                                  }}
                                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedLeave(leave)
                                    setReviewStatus('rejected')
                                    setAdminComment('Unable to approve at this time')
                                    setReviewModalOpen(true)
                                  }}
                                  className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-500 font-medium">Decided</span>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Apply for Leave (Employee) */}
        {isApplyModalOpen && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-blue-500" />
                  Submit Leave Application
                </h3>
                <button
                  onClick={() => setIsApplyModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleApplySubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Leave Type</label>
                  <select
                    value={applyForm.leave_type}
                    onChange={(e) => setApplyForm({ ...applyForm, leave_type: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                  >
                    <option value="Paid">Paid Leave</option>
                    <option value="Sick">Sick Leave</option>
                    <option value="Casual">Casual Leave</option>
                    <option value="Unpaid">Unpaid Leave</option>
                    <option value="Emergency">Emergency Leave</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Start Date *</label>
                    <input
                      type="date"
                      required
                      value={applyForm.start_date}
                      onChange={(e) => setApplyForm({ ...applyForm, start_date: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">End Date *</label>
                    <input
                      type="date"
                      required
                      value={applyForm.end_date}
                      onChange={(e) => setApplyForm({ ...applyForm, end_date: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Reason / Remarks</label>
                  <textarea
                    rows="3"
                    value={applyForm.remarks}
                    onChange={(e) => setApplyForm({ ...applyForm, remarks: e.target.value })}
                    placeholder="Brief description of leave reason..."
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsApplyModalOpen(false)}
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
                    Submit Application
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: HR Review Decision */}
        {reviewModalOpen && selectedLeave && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-500" />
                  Review Leave Request: {selectedLeave.name}
                </h3>
                <button
                  onClick={() => setReviewModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div className="bg-slate-800/60 p-3.5 rounded-xl text-xs space-y-1">
                  <p className="text-slate-300"><strong>Type:</strong> {selectedLeave.leave_type} ({selectedLeave.days} days)</p>
                  <p className="text-slate-300"><strong>Dates:</strong> {selectedLeave.start_date} to {selectedLeave.end_date}</p>
                  <p className="text-slate-400"><strong>Reason:</strong> "{selectedLeave.remarks || 'No reason provided'}"</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Decision</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setReviewStatus('approved')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        reviewStatus === 'approved'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      Approve Request
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewStatus('rejected')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        reviewStatus === 'rejected'
                          ? 'bg-rose-600 text-white shadow-md'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      <X className="w-4 h-4" />
                      Reject Request
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">HR Note / Comment to Employee</label>
                  <input
                    type="text"
                    value={adminComment}
                    onChange={(e) => setAdminComment(e.target.value)}
                    placeholder="e.g. Approved. Please hand over pending tasks."
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setReviewModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className={`px-5 py-2 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer ${
                      reviewStatus === 'approved' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                    }`}
                  >
                    {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Confirm {reviewStatus === 'approved' ? 'Approval' : 'Rejection'}
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
