import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { Button } from '../../components/ui/button.jsx'
import { Input } from '../../components/ui/input.jsx'
import { Label } from '../../components/ui/label.jsx'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card.jsx'
import { toast } from '../../hooks/useToast.js'
import { Shield, Sparkles, Lock, ArrowRight, CheckCircle2 } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email || !form.password) {
      setError('Email and password are required.')
      return
    }

    setLoading(true)
    setError('')

    try {
      await login({ email: form.email, password: form.password })
      toast({ title: 'Welcome back!', description: 'Authenticated successfully.' })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg = err?.response?.data?.message || 'Login failed. Please verify your credentials.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  function fillDemo(role) {
    const demos = {
      admin:    { email: 'admin@democorp.com',    password: 'Demo1234!' },
      finance:  { email: 'finance@democorp.com',  password: 'Demo1234!' },
      manager:  { email: 'manager@democorp.com',  password: 'Demo1234!' },
      employee: { email: 'employee@democorp.com', password: 'Demo1234!' },
    }
    setForm(demos[role])
    setError('')
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-indigo-500 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Icon */}
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-slate-900 shadow-md border border-slate-800 mb-3">
          <span className="text-xl font-black text-white tracking-tighter">P</span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          PAYMIND <span className="text-indigo-600 font-semibold">Enterprise</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Autonomous B2B Procurement Intelligence &amp; PayPal Sandbox Disbursement
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-8 rounded-2xl border border-slate-200/80 shadow-modal">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">Sign in to your console</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your corporate credentials to access the workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                Work Email Address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="colleague@democorp.com"
                value={form.email}
                onChange={handleChange}
                disabled={loading}
                className="h-10 text-xs bg-slate-50/50 focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                  Password
                </Label>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                disabled={loading}
                className="h-10 text-xs bg-slate-50/50 focus:bg-white"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-10 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Authenticating...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  Sign in to Workspace <ArrowRight className="h-3.5 w-3.5" />
                </span>
              )}
            </Button>
          </form>

          {/* Quick Demo Accounts Selector */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Hackathon Demo Roles
              </span>
              <span className="text-[10px] text-slate-400 font-mono">PWD: Demo1234!</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'admin', label: 'Org Admin', role: 'Full System' },
                { key: 'finance', label: 'Finance Mgr', role: 'PayPal Payer' },
                { key: 'manager', label: 'Team Manager', role: 'Approver' },
                { key: 'employee', label: 'Requester', role: 'Submitter' },
              ].map(({ key, label, role }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => fillDemo(key)}
                  className="flex flex-col items-start p-2.5 rounded-lg border border-slate-200/80 bg-slate-50/60 hover:bg-indigo-50/50 hover:border-indigo-200 text-left transition group"
                >
                  <span className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600 transition">
                    {label}
                  </span>
                  <span className="text-[10px] text-slate-400 group-hover:text-slate-600">
                    {role}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 text-center">
            <p className="text-xs text-slate-500">
              New organization?{' '}
              <Link to="/register" className="text-indigo-600 font-medium hover:underline">
                Register company domain
              </Link>
            </p>
          </div>
        </div>

        {/* Security Trust Indicators */}
        <div className="mt-6 flex items-center justify-center gap-4 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Lock className="h-3 w-3 text-emerald-500" /> HttpOnly Cookie Isolation
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Shield className="h-3 w-3 text-indigo-500" /> CSRF Protected
          </span>
          <span>·</span>
          <span>Neon PostgreSQL</span>
        </div>
      </div>
    </div>
  )
}
