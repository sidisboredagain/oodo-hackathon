/**
 * ProfilePage
 * ===========
 * Displays and edits employee profile information.
 *
 * Role-Based Editing Rules (enforced by both UI and FastAPI backend):
 * - Employee viewing own profile:
 *   - Editable fields: Phone, Address, Profile Picture URL
 *   - Locked fields (read-only): Name, Email, Employee ID, Role, Job Title,
 *     Department, Joining Date, Employment Status
 * - HR viewing any profile:
 *   - Can view and edit all profile fields
 * - Employee viewing another employee's profile:
 *   - Backend returns 403 Forbidden
 */

import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  User, Mail, Phone, MapPin, Briefcase, Calendar, Shield,
  Edit2, Save, X, AlertCircle, CheckCircle2, Lock, ArrowLeft, Loader2, Camera
} from 'lucide-react'
import DashboardLayout from '../components/DashboardLayout'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'

export default function ProfilePage() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const { user: authUser, isHR } = useAuth()

  // Determine effective user ID
  const targetUserId = userId ? parseInt(userId, 10) : authUser?.user_id
  const isOwnProfile = authUser?.user_id === targetUserId

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  // Edit form state
  const [formData, setFormData] = useState({
    // Employee & HR editable
    phone: '',
    address: '',
    profile_picture: '',
    // HR only editable
    name: '',
    job_title: '',
    department: '',
    joining_date: '',
    employment_status: '',
  })

  // Fetch profile
  useEffect(() => {
    if (!targetUserId) return

    setLoading(true)
    setError('')
    setSuccessMsg('')
    setIsEditing(false)

    api.get(`/profile/${targetUserId}`)
      .then((res) => {
        setProfile(res.data)
        setFormData({
          phone: res.data.phone || '',
          address: res.data.address || '',
          profile_picture: res.data.profile_picture || '',
          name: res.data.name || '',
          job_title: res.data.job_title || '',
          department: res.data.department || '',
          joining_date: res.data.joining_date || '',
          employment_status: res.data.employment_status || 'Full-Time',
        })
      })
      .catch((err) => {
        const msg = err.response?.data?.detail || 'Failed to load profile.'
        setError(msg)
      })
      .finally(() => setLoading(false))
  }, [targetUserId])

  function handleInputChange(e) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccessMsg('')

    try {
      // Build payload strictly adhering to RBAC
      const payload = isHR
        ? { ...formData }
        : {
            phone: formData.phone,
            address: formData.address,
            profile_picture: formData.profile_picture,
          }

      const res = await api.patch(`/profile/${targetUserId}`, payload)
      setProfile(res.data.profile)
      setSuccessMsg('Profile updated successfully!')
      setIsEditing(false)
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    if (profile) {
      setFormData({
        phone: profile.phone || '',
        address: profile.address || '',
        profile_picture: profile.profile_picture || '',
        name: profile.name || '',
        job_title: profile.job_title || '',
        department: profile.department || '',
        joining_date: profile.joining_date || '',
        employment_status: profile.employment_status || 'Full-Time',
      })
    }
    setIsEditing(false)
    setError('')
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Back navigation for HR viewing others */}
        {isHR && !isOwnProfile && (
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Directory
          </button>
        )}

        {/* Alerts */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">Access Error</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{successMsg}</p>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-4">
            <div className="h-44 bg-slate-800/60 border border-slate-700/50 rounded-2xl animate-pulse" />
            <div className="h-64 bg-slate-800/60 border border-slate-700/50 rounded-2xl animate-pulse" />
          </div>
        )}

        {!loading && profile && (
          <form onSubmit={handleSave} className="space-y-6">
            
            {/* Header Profile Banner */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="relative">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-blue-600/20 flex-shrink-0">
                      {profile.profile_picture ? (
                        <img
                          src={profile.profile_picture}
                          alt={profile.name}
                          className="w-full h-full object-cover rounded-2xl"
                        />
                      ) : (
                        profile.name?.charAt(0) || '?'
                      )}
                    </div>
                    {isEditing && (
                      <div className="absolute -bottom-1 -right-1 p-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300" title="Edit picture URL below">
                        <Camera className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                        {profile.name}
                      </h1>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                        profile.role === 'hr'
                          ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                          : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      }`}>
                        {profile.role?.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm mt-0.5">{profile.job_title} • {profile.department}</p>
                    <p className="text-slate-500 text-xs mt-1 font-mono">ID: {profile.employee_id}</p>
                  </div>
                </div>

                {/* Edit / Save / Cancel Buttons */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  {!isEditing ? (
                    <button
                      type="button"
                      id="edit-profile-btn"
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-600/20"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit Profile
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors border border-slate-700"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                      <button
                        type="submit"
                        id="save-profile-btn"
                        disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-emerald-600/20"
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* RBAC Notice Banner */}
              {isEditing && (
                <div className="mt-5 p-3 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-400" />
                    <span className="text-slate-300">
                      {isHR
                        ? 'HR Mode: You can edit both personal and organizational details.'
                        : 'Employee Mode: You can edit your contact information and photo URL.'}
                    </span>
                  </div>
                  {!isHR && (
                    <span className="text-amber-400 font-medium flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Job info is HR-managed
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Profile Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* SECTION 1: Personal & Contact Information (Employee & HR editable) */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h2 className="text-base font-semibold text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-400" />
                    Personal & Contact
                  </h2>
                  <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Editable
                  </span>
                </div>

                {/* Full Name (HR-only edit) */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center justify-between">
                    Full Name
                    {!isHR && isEditing && (
                      <span className="text-slate-500 flex items-center gap-1 text-[11px]">
                        <Lock className="w-3 h-3" /> HR only
                      </span>
                    )}
                  </label>
                  {isEditing && isHR ? (
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg px-3 py-2 text-sm text-slate-200">
                      {profile.name || '—'}
                    </div>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Phone Number
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      id="profile-phone-input"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg px-3 py-2 text-sm text-slate-200 flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      {profile.phone || <span className="text-slate-500">Not set</span>}
                    </div>
                  )}
                </div>

                {/* Address */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Residential Address
                  </label>
                  {isEditing ? (
                    <textarea
                      id="profile-address-input"
                      name="address"
                      rows={3}
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Street address, City, State, Zip"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg px-3 py-2 text-sm text-slate-200 flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                      <span>{profile.address || <span className="text-slate-500">Not set</span>}</span>
                    </div>
                  )}
                </div>

                {/* Profile Picture URL */}
                {isEditing && (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Profile Picture URL
                    </label>
                    <input
                      type="url"
                      id="profile-picture-input"
                      name="profile_picture"
                      value={formData.profile_picture}
                      onChange={handleInputChange}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Direct image URL (JPEG/PNG/WebP)
                    </p>
                  </div>
                )}
              </div>

              {/* SECTION 2: Organizational & Job Details */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h2 className="text-base font-semibold text-white flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-indigo-400" />
                    Employment & Job
                  </h2>
                  <span className={`text-xs px-2 py-0.5 rounded border ${
                    isHR
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                      : 'text-slate-400 bg-slate-800 border-slate-700'
                  }`}>
                    {isHR ? 'HR Editable' : 'HR Managed'}
                  </span>
                </div>

                {/* Work Email (Read-only for all in profile update) */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center justify-between">
                    Work Email
                    <span className="text-slate-500 text-[11px] flex items-center gap-1">
                      <Lock className="w-3 h-3" /> System account
                    </span>
                  </label>
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg px-3 py-2 text-sm text-slate-300 flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    {profile.email}
                  </div>
                </div>

                {/* Job Title */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Job Title
                  </label>
                  {isEditing && isHR ? (
                    <input
                      type="text"
                      name="job_title"
                      value={formData.job_title}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg px-3 py-2 text-sm text-slate-200">
                      {profile.job_title || '—'}
                    </div>
                  )}
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Department
                  </label>
                  {isEditing && isHR ? (
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Engineering">Engineering</option>
                      <option value="Design">Design</option>
                      <option value="Analytics">Analytics</option>
                      <option value="Human Resources">Human Resources</option>
                      <option value="Operations">Operations</option>
                      <option value="Marketing">Marketing</option>
                      <option value="General">General</option>
                    </select>
                  ) : (
                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg px-3 py-2 text-sm text-slate-200">
                      {profile.department || '—'}
                    </div>
                  )}
                </div>

                {/* Employment Status & Joining Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Employment Status
                    </label>
                    {isEditing && isHR ? (
                      <select
                        name="employment_status"
                        value={formData.employment_status}
                        onChange={handleInputChange}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Full-Time">Full-Time</option>
                        <option value="Part-Time">Part-Time</option>
                        <option value="Contract">Contract</option>
                        <option value="Intern">Intern</option>
                      </select>
                    ) : (
                      <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg px-3 py-2 text-sm text-emerald-400 font-medium">
                        {profile.employment_status || 'Full-Time'}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Joining Date
                    </label>
                    {isEditing && isHR ? (
                      <input
                        type="date"
                        name="joining_date"
                        value={formData.joining_date}
                        onChange={handleInputChange}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg px-3 py-2 text-sm text-slate-200 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {profile.joining_date || '—'}
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>

          </form>
        )}

      </div>
    </DashboardLayout>
  )
}
