import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import EmployeeDashboard from './EmployeeDashboard.jsx'
import ManagerDashboard from './ManagerDashboard.jsx'
import FinanceDashboard from './FinanceDashboard.jsx'
import AdminDashboard from './AdminDashboard.jsx'
import { requestsApi } from '../../services/api.js'
import { Button } from '../../components/ui/button.jsx'
import { toast } from '../../hooks/useToast.js'
import { X, Plus, AlertTriangle, Building2, DollarSign, FileText } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const [newRequestModalOpen, setNewRequestModalOpen] = useState(false)

  // New Request Form State
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    vendor: '',
    category: 'Software & SaaS',
    amount: '',
    currency: 'USD',
    justification: '',
  })

  function handleFormChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleCreateRequest(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.vendor.trim() || !form.amount) {
      setError('Title, vendor, and amount are required.')
      return
    }

    const parsedAmount = parseFloat(form.amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid positive amount.')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      const idempotencyKey = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

      await requestsApi.create({
        title: form.title.trim(),
        vendor: form.vendor.trim(),
        category: form.category,
        amount: parsedAmount,
        currency: form.currency,
        justification: form.justification.trim() || undefined,
        idempotency_key: idempotencyKey,
      })

      toast({
        title: 'Purchase Request Submitted',
        description: `"${form.title}" is now being processed by the policy engine and Gemini AI.`,
      })

      setNewRequestModalOpen(false)
      setForm({
        title: '',
        vendor: '',
        category: 'Software & SaaS',
        amount: '',
        currency: 'USD',
        justification: '',
      })
      // Reload page to reflect newly created request
      window.location.reload()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit purchase request.')
    } finally {
      setSubmitting(false)
    }
  }

  // Render role-specific dashboard
  const renderDashboard = () => {
    switch (user?.role) {
      case 'employee':
        return (
          <EmployeeDashboard
            user={user}
            onNewRequestClick={() => setNewRequestModalOpen(true)}
          />
        )
      case 'manager':
        return (
          <ManagerDashboard
            user={user}
            onNewRequestClick={() => setNewRequestModalOpen(true)}
          />
        )
      case 'finance_manager':
        return (
          <FinanceDashboard
            user={user}
            onNewRequestClick={() => setNewRequestModalOpen(true)}
          />
        )
      case 'org_admin':
      case 'super_admin':
        return (
          <AdminDashboard
            user={user}
            onNewRequestClick={() => setNewRequestModalOpen(true)}
          />
        )
      default:
        return (
          <EmployeeDashboard
            user={user}
            onNewRequestClick={() => setNewRequestModalOpen(true)}
          />
        )
    }
  }

  return (
    <div className="space-y-6">
      {renderDashboard()}

      {/* NEW REQUEST MODAL */}
      {newRequestModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">New Purchase Request</h3>
                  <p className="text-[11px] text-slate-500">Autonomous policy check &amp; Gemini AI scan</p>
                </div>
              </div>
              <button
                onClick={() => setNewRequestModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="p-5 space-y-4">
              {error && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Purchase Title *
                </label>
                <input
                  type="text"
                  name="title"
                  placeholder="e.g. Figma Enterprise Team License"
                  value={form.title}
                  onChange={handleFormChange}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={submitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Vendor / Merchant *
                  </label>
                  <input
                    type="text"
                    name="vendor"
                    placeholder="e.g. Figma Inc"
                    value={form.vendor}
                    onChange={handleFormChange}
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={submitting}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Category *
                  </label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleFormChange}
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    disabled={submitting}
                  >
                    <option value="Software & SaaS">Software &amp; SaaS</option>
                    <option value="Cloud Infrastructure">Cloud Infrastructure</option>
                    <option value="Hardware & Equipment">Hardware &amp; Equipment</option>
                    <option value="Marketing & Advertising">Marketing &amp; Advertising</option>
                    <option value="Professional Services">Professional Services</option>
                    <option value="Office & Facilities">Office &amp; Facilities</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="amount"
                    placeholder="350.00"
                    value={form.amount}
                    onChange={handleFormChange}
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={submitting}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Currency
                  </label>
                  <input
                    type="text"
                    name="currency"
                    value={form.currency}
                    readOnly
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-xs font-mono bg-slate-50 text-slate-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">
                  Business Justification (Optional)
                </label>
                <textarea
                  rows={3}
                  name="justification"
                  placeholder="Provide context for why this purchase is needed by your team."
                  value={form.justification}
                  onChange={handleFormChange}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={submitting}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setNewRequestModalOpen(false)}
                  disabled={submitting}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="text-xs bg-slate-900 hover:bg-slate-800 text-white"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
