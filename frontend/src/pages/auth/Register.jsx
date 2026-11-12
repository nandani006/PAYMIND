import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { Button } from '../../components/ui/button.jsx'
import { Input } from '../../components/ui/input.jsx'
import { Label } from '../../components/ui/label.jsx'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/card.jsx'
import { toast } from '../../hooks/useToast.js'
import { Shield, Sparkles, Lock, ArrowRight, Building2, User } from 'lucide-react'

const INITIAL = {
  full_name: '',
  email: '',
  password: '',
  confirmPassword: '',
  org_name: '',
  org_domain: '',
}

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [form, setForm] = useState(INITIAL)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setErrors(errs => ({ ...errs, [e.target.name]: undefined, general: undefined }))
  }

  function validate() {
    const errs = {}
    if (!form.full_name.trim()) errs.full_name = 'Full name is required.'
    if (!form.email.trim())     errs.email = 'Email is required.'
    if (!form.password)         errs.password = 'Password is required.'
    if (form.password && form.password.length < 8) errs.password = 'Password must be at least 8 characters.'
    if (form.password !== form.confirmPassword)     errs.confirmPassword = 'Passwords do not match.'
    if (!form.org_name.trim()) errs.org_name = 'Organisation name is required.'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }

    setLoading(true)
    setErrors({})

    try {
      await register({
        full_name:  form.full_name,
        email:      form.email,
        password:   form.password,
        org_name:   form.org_name,
        org_domain: form.org_domain || undefined,
      })

      toast({ title: 'Organisation registered!', description: 'Welcome to PAYMIND Enterprise.' })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg = err?.response?.data?.message || 'Registration failed. Please try again.'
      setErrors({ general: msg })
    } finally {
      setLoading(false)
    }
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
          Set up autonomous spending governance for your organization
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg px-4">
        <div className="bg-white py-8 px-6 sm:px-8 rounded-2xl border border-slate-200/80 shadow-modal">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">Create your enterprise workspace</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              You will be configured as the primary Organization Administrator.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.general && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>{errors.general}</span>
              </div>
            )}

            {/* Organisation Details */}
            <div className="space-y-3 pb-4 border-b border-slate-100">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Company Details
              </span>

              <div className="space-y-1.5">
                <Label htmlFor="org_name" className="text-xs font-semibold text-slate-700">
                  Organization Name *
                </Label>
                <Input
                  id="org_name"
                  name="org_name"
                  placeholder="Acme Global Inc"
                  value={form.org_name}
                  onChange={handleChange}
                  disabled={loading}
                  className="h-10 text-xs bg-slate-50/50 focus:bg-white"
                />
                {errors.org_name && <p className="text-[11px] text-rose-600">{errors.org_name}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="org_domain" className="text-xs font-semibold text-slate-700">
                  Corporate Email Domain (Optional)
                </Label>
                <Input
                  id="org_domain"
                  name="org_domain"
                  placeholder="acmeglobal.com"
                  value={form.org_domain}
                  onChange={handleChange}
                  disabled={loading}
                  className="h-10 text-xs bg-slate-50/50 focus:bg-white"
                />
              </div>
            </div>

            {/* Admin User Details */}
            <div className="space-y-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                Admin Administrator Credentials
              </span>

              <div className="space-y-1.5">
                <Label htmlFor="full_name" className="text-xs font-semibold text-slate-700">
                  Full Name *
                </Label>
                <Input
                  id="full_name"
                  name="full_name"
                  autoComplete="name"
                  placeholder="Jane Smith"
                  value={form.full_name}
                  onChange={handleChange}
                  disabled={loading}
                  className="h-10 text-xs bg-slate-50/50 focus:bg-white"
                />
                {errors.full_name && <p className="text-[11px] text-rose-600">{errors.full_name}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                  Corporate Email Address *
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="jane.smith@acmeglobal.com"
                  value={form.email}
                  onChange={handleChange}
                  disabled={loading}
                  className="h-10 text-xs bg-slate-50/50 focus:bg-white"
                />
                {errors.email && <p className="text-[11px] text-rose-600">{errors.email}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                    Password *
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Min 8 chars"
                    value={form.password}
                    onChange={handleChange}
                    disabled={loading}
                    className="h-10 text-xs bg-slate-50/50 focus:bg-white"
                  />
                  {errors.password && <p className="text-[11px] text-rose-600">{errors.password}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-700">
                    Confirm Password *
                  </Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Repeat password"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    disabled={loading}
                    className="h-10 text-xs bg-slate-50/50 focus:bg-white"
                  />
                  {errors.confirmPassword && (
                    <p className="text-[11px] text-rose-600">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-10 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white shadow-sm mt-2"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating Workspace...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  Create Workspace <ArrowRight className="h-3.5 w-3.5" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-5 text-center">
            <p className="text-xs text-slate-500">
              Already have an enterprise account?{' '}
              <Link to="/login" className="text-indigo-600 font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
