/**
 * VerifyEmailPage
 * ===============
 * DEV MODE email verification page.
 *
 * Accepts a hardcoded code ("123456") — no real email is sent.
 * A prominent DEV MODE banner explains this clearly.
 *
 * Production path (documented here, not implemented):
 *  1. Backend generates a unique token (secrets.token_urlsafe(32)) on registration.
 *  2. Token is emailed to the user via SendGrid/AWS SES as a clickable link.
 *  3. This page (or a landing page) reads the token from the URL query param.
 *  4. Backend validates the token, checks expiry, and marks email_verified=True.
 *  5. The token is invalidated immediately after use (one-time-use).
 */

import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { MailCheck, AlertCircle, CheckCircle2, ArrowLeft, Briefcase } from 'lucide-react'
import api from '../api/client'

export default function VerifyEmailPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Pre-fill email if coming from signup redirect
  const prefillEmail = searchParams.get('email') || ''

  const [email, setEmail]   = useState(prefillEmail)
  const [code, setCode]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [verified, setVerified] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api.post('/auth/verify-email', { email, code })
      setVerified(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-48 -right-48 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">

        {/* Branding */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/30">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Dayflow</h1>
            <p className="text-slate-500 text-xs">Every workday, perfectly aligned.</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-slate-800/70 backdrop-blur-md border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2.5 bg-blue-500/20 rounded-xl">
              <MailCheck className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Verify your email</h2>
              <p className="text-slate-400 text-sm">Enter the verification code below.</p>
            </div>
          </div>

          {/* DEV MODE banner — prominently labeled */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-5">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold text-amber-400 bg-amber-400/20 px-2 py-0.5 rounded">
                🔧 DEV MODE
              </span>
            </div>
            <p className="text-amber-300/90 text-sm leading-relaxed">
              No real email was sent. Use verification code:{' '}
              <button
                type="button"
                onClick={() => setCode('123456')}
                className="font-mono font-bold text-amber-200 bg-amber-400/20 px-2 py-0.5 rounded hover:bg-amber-400/30 transition-colors cursor-pointer"
              >
                123456
              </button>
            </p>
            <p className="text-amber-400/60 text-xs mt-2">
              Production: a unique token would be emailed via SendGrid/SES.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl mb-4">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <p className="text-rose-400 text-sm">{error}</p>
            </div>
          )}

          {/* Success */}
          {verified && (
            <div className="flex items-center gap-2 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-4">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <p className="text-emerald-400 text-sm">Email verified! Redirecting to login...</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="verify-email" className="block text-sm font-medium text-slate-300 mb-1.5">
                Email address
              </label>
              <input
                id="verify-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full bg-slate-900/60 border border-slate-600/60 text-white placeholder-slate-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              />
            </div>

            <div>
              <label htmlFor="verify-code" className="block text-sm font-medium text-slate-300 mb-1.5">
                Verification code
              </label>
              <input
                id="verify-code"
                type="text"
                value={code}
                onChange={e => { setCode(e.target.value); setError('') }}
                placeholder="123456"
                required
                maxLength={10}
                className="w-full bg-slate-900/60 border border-slate-600/60 text-white placeholder-slate-500 rounded-lg px-4 py-2.5 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow text-center text-lg"
              />
            </div>

            <button
              id="verify-submit-btn"
              type="submit"
              disabled={loading || verified}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-2.5 text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-600/20"
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <MailCheck className="w-4 h-4" />
              }
              {loading ? 'Verifying...' : 'Verify email'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-700/50">
            <Link to="/login" className="flex items-center justify-center gap-1.5 text-slate-400 hover:text-slate-200 text-sm transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
