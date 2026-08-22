import React, { useEffect, useState } from 'react'
import { DollarSign, Users, TrendingUp, Building2 } from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import api from '../api/client'

function fmt(n) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n || 0)
}

export default function PayrollPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ base_salary: 0, allowances: 0, deductions: 0 })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await api.get('/payroll/company')
      setData(res.data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to load payroll data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const startEdit = (row) => {
    setEditId(row.user_id)
    setForm({
      base_salary: row.base_salary,
      allowances: row.allowances,
      deductions: row.deductions,
    })
  }

  const save = async () => {
    setSaving(true)
    try {
      await api.put(`/payroll/${editId}`, form)
      setEditId(null)
      await load()
    } catch (e) {
      alert(e.response?.data?.detail || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const c = data?.company

  return (
    <DashboardLayout title="Payroll & Salary" subtitle="Company financial overview">
      <div className="max-w-6xl mx-auto space-y-6">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="text-center py-20 text-slate-500">Loading payroll...</div>
        ) : (
          <>
            {/* Company totals */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: Users, label: 'Employees', value: c?.employee_count ?? 0 },
                { icon: DollarSign, label: 'Total Net Payroll', value: fmt(c?.total_net_payroll) },
                { icon: TrendingUp, label: 'Avg Net Salary', value: fmt(c?.average_net_salary) },
                { icon: Building2, label: 'Total Base + Allow.', value: fmt((c?.total_base_salary || 0) + (c?.total_allowances || 0)) },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-amber-500/30 transition-all">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="text-xl font-bold text-white">{value}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-slate-400 text-xs mb-1">Total Base Salaries</div>
                <div className="text-lg font-semibold text-white">{fmt(c?.total_base_salary)}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-slate-400 text-xs mb-1">Total Allowances</div>
                <div className="text-lg font-semibold text-emerald-400">{fmt(c?.total_allowances)}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-slate-400 text-xs mb-1">Total Deductions</div>
                <div className="text-lg font-semibold text-rose-400">{fmt(c?.total_deductions)}</div>
              </div>
            </div>

            {/* Employee table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800">
                <h3 className="font-bold text-white">Employee Salary Details</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                      <th className="px-4 py-3">Login ID</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Base</th>
                      <th className="px-4 py-3">Allowances</th>
                      <th className="px-4 py-3">Deductions</th>
                      <th className="px-4 py-3">Net</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.employees || []).map((row) => (
                      <tr key={row.user_id} className="border-b border-slate-800/80 hover:bg-slate-800/30">
                        <td className="px-4 py-3 font-mono text-xs text-amber-300/90">{row.employee_id}</td>
                        <td className="px-4 py-3 text-white font-medium">{row.name}</td>
                        <td className="px-4 py-3 text-slate-400">{row.department}</td>
                        {editId === row.user_id ? (
                          <>
                            <td className="px-2 py-2">
                              <input type="number" className="w-24 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white"
                                value={form.base_salary} onChange={e => setForm({ ...form, base_salary: +e.target.value })} />
                            </td>
                            <td className="px-2 py-2">
                              <input type="number" className="w-20 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white"
                                value={form.allowances} onChange={e => setForm({ ...form, allowances: +e.target.value })} />
                            </td>
                            <td className="px-2 py-2">
                              <input type="number" className="w-20 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white"
                                value={form.deductions} onChange={e => setForm({ ...form, deductions: +e.target.value })} />
                            </td>
                            <td className="px-4 py-3 text-amber-300 font-semibold">
                              {fmt(form.base_salary + form.allowances - form.deductions)}
                            </td>
                            <td className="px-4 py-3 space-x-2">
                              <button onClick={save} disabled={saving}
                                className="text-xs px-2 py-1 rounded bg-amber-500 text-black font-semibold">Save</button>
                              <button onClick={() => setEditId(null)}
                                className="text-xs px-2 py-1 rounded border border-slate-600 text-slate-300">Cancel</button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 text-slate-300">{fmt(row.base_salary)}</td>
                            <td className="px-4 py-3 text-emerald-400/90">{fmt(row.allowances)}</td>
                            <td className="px-4 py-3 text-rose-400/90">{fmt(row.deductions)}</td>
                            <td className="px-4 py-3 text-amber-300 font-semibold">{fmt(row.net_salary)}</td>
                            <td className="px-4 py-3">
                              <button onClick={() => startEdit(row)}
                                className="text-xs px-2 py-1 rounded border border-amber-500/40 text-amber-300 hover:bg-amber-500/10">
                                Edit
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
