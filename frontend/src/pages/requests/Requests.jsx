import { useState, useEffect } from 'react'
import {
  FileText,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Building2,
  DollarSign,
  ChevronRight,
  Shield,
  CreditCard,
  X,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  Layers,
  ArrowRight
} from 'lucide-react'
import { requestsApi } from '../../services/api.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.jsx'
import { Badge } from '../../components/ui/badge.jsx'
import { Button } from '../../components/ui/button.jsx'
import { Input } from '../../components/ui/input.jsx'
import { Label } from '../../components/ui/label.jsx'
import { toast } from '../../hooks/useToast.js'
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters.js'
import { CATEGORIES, REQUEST_STATUS_COLORS, REQUEST_STATUS_LABELS } from '../../utils/constants.js'
import PayPalCheckoutModal from '../../components/payments/PayPalCheckoutModal.jsx'

export default function Requests() {
  const { user, isAtLeast } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [payingRequest, setPayingRequest] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // New request form state
  const [form, setForm] = useState({
    title: '',
    vendor: '',
    category: 'Software & SaaS',
    amount: '',
    currency: 'USD',
    justification: '',
    description: '',
  })
  const [formError, setFormError] = useState('')

  async function fetchRequests() {
    try {
      setLoading(true)
      const res = await requestsApi.list()
      setRequests(res.data.requests || [])
    } catch (err) {
      toast({
        title: 'Error loading requests',
        description: err.response?.data?.message || 'Could not fetch requests.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  function handleFormChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setFormError('')
  }

  async function handleCreateRequest(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.vendor.trim() || !form.amount) {
      setFormError('Title, vendor, and amount are required fields.')
      return
    }

    const amountNum = parseFloat(form.amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setFormError('Amount must be a positive number greater than 0.')
      return
    }

    try {
      setSubmitting(true)
      setFormError('')
      const idempotencyKey = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
      await requestsApi.create({
        ...form,
        amount: amountNum,
        idempotency_key: idempotencyKey,
      })

      toast({
        title: 'Request Submitted',
        description: 'Gemini AI intelligence and spending policy check initiated.',
      })

      setIsNewModalOpen(false)
      setForm({
        title: '',
        vendor: '',
        category: 'Software & SaaS',
        amount: '',
        currency: 'USD',
        justification: '',
        description: '',
      })
      await fetchRequests()
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to submit purchase request.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancelRequest(id) {
    if (!window.confirm('Are you sure you want to cancel this procurement request?')) return
    try {
      await requestsApi.cancel(id)
      toast({ title: 'Request Cancelled', description: 'The purchase request has been marked cancelled.' })
      if (selectedRequest?.id === id) setSelectedRequest(null)
      fetchRequests()
    } catch (err) {
      toast({
        title: 'Action Failed',
        description: err.response?.data?.message || 'Failed to cancel request.',
        variant: 'destructive',
      })
    }
  }

  const filteredRequests = requests.filter(r => {
    const matchesSearch =
      r.title?.toLowerCase().includes(search.toLowerCase()) ||
      r.vendor?.toLowerCase().includes(search.toLowerCase()) ||
      r.category?.toLowerCase().includes(search.toLowerCase()) ||
      r.requester_name?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Procurement Purchase Requests</h1>
          <p className="text-xs text-slate-500 mt-1">
            {isAtLeast('manager')
              ? 'Monitor, evaluate, and disburse organization-wide procurement requests.'
              : 'Submit and track your corporate purchasing requests.'}
          </p>
        </div>

        <Button
          onClick={() => setIsNewModalOpen(true)}
          className="gap-2 bg-slate-900 hover:bg-slate-800 text-white shadow-xs text-xs font-semibold"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Purchase Request</span>
        </Button>
      </div>

      {/* ── Filter Bar & Search ─────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full lg:w-80">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search title, vendor, category, requester..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs bg-slate-50/50 border-slate-200"
              />
            </div>

            {/* Segmented Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0">
              {[
                { id: 'all', label: 'All Requests' },
                { id: 'pending_approval', label: 'Awaiting Approval' },
                { id: 'approved', label: 'Approved' },
                { id: 'payment_initiated', label: 'In Progress' },
                { id: 'completed', label: 'Completed' },
                { id: 'rejected', label: 'Rejected' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setStatusFilter(id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap select-none ${
                    statusFilter === id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 bg-white border border-slate-200/70'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Requests Table ──────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-16 text-center text-slate-500">
              <div className="h-6 w-6 border-2 border-[#635BFF] border-t-transparent animate-spin rounded-full mx-auto mb-2.5" />
              <p className="text-xs font-medium">Loading procurement ledger...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-16 text-center text-slate-400">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400 border border-slate-200">
                <FileText className="h-5 w-5" />
              </div>
              <p className="font-semibold text-slate-800 text-sm">No purchase requests found</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {search || statusFilter !== 'all'
                  ? 'Try clearing your search query or switching the status filter.'
                  : 'Get started by submitting your first procurement request.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-200/80 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Request Item / Vendor</th>
                    <th className="px-4 py-3.5">Category</th>
                    <th className="px-4 py-3.5">Amount</th>
                    <th className="px-4 py-3.5">AI Intelligence</th>
                    <th className="px-4 py-3.5">Requester</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/90">
                  {filteredRequests.map(r => {
                    const hasAiRisk = r.risk_score !== undefined && r.risk_score !== null
                    const riskLevel = hasAiRisk
                      ? r.risk_score < 0.3
                        ? 'low'
                        : r.risk_score < 0.7
                        ? 'medium'
                        : 'high'
                      : null

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors group">
                        {/* Title & Vendor */}
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-900 group-hover:text-[#635BFF] transition-colors leading-snug">
                            {r.title}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span className="font-medium text-slate-700">{r.vendor}</span>
                            <span>•</span>
                            <span>{formatDate(r.created_at)}</span>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3.5">
                          <span className="text-[11px] text-slate-600 bg-slate-100/80 px-2 py-0.5 rounded border border-slate-200/60 font-medium whitespace-nowrap">
                            {r.category}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3.5 font-bold text-slate-900 font-sans text-xs whitespace-nowrap">
                          {formatCurrency(r.amount, r.currency)}
                        </td>

                        {/* AI Intelligence Badge */}
                        <td className="px-4 py-3.5">
                          {hasAiRisk ? (
                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant={riskLevel === 'low' ? 'success' : riskLevel === 'medium' ? 'warning' : 'destructive'}
                                className="text-[10px] uppercase font-bold py-0 gap-1"
                              >
                                {riskLevel === 'low' ? (
                                  <ShieldCheck className="h-3 w-3" />
                                ) : riskLevel === 'medium' ? (
                                  <AlertTriangle className="h-3 w-3" />
                                ) : (
                                  <ShieldAlert className="h-3 w-3" />
                                )}
                                <span>{riskLevel} ({Math.round(r.risk_score * 100)}%)</span>
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Pending AI</span>
                          )}
                        </td>

                        {/* Requester */}
                        <td className="px-4 py-3.5">
                          <div className="text-[11px] font-semibold text-slate-800">
                            {r.requester_name || 'Team Member'}
                          </div>
                          <div className="text-[10px] text-slate-400">{r.department || 'General'}</div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          <Badge
                            variant={REQUEST_STATUS_COLORS[r.status] || 'secondary'}
                            className="capitalize text-[10px] font-semibold py-0.5"
                          >
                            {REQUEST_STATUS_LABELS[r.status] || r.status}
                          </Badge>
                        </td>

                        {/* Actions Cell */}
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* PayPal Pay Action for Finance Managers/Admins */}
                            {isAtLeast('finance_manager') && ['approved', 'payment_initiated'].includes(r.status) && (
                              <Button
                                size="sm"
                                onClick={() => setPayingRequest(r)}
                                className="h-7 px-2.5 text-[11px] gap-1.5 bg-[#635BFF] hover:bg-[#5348F2] text-white font-semibold shadow-xs"
                              >
                                <CreditCard className="h-3 w-3" /> Pay
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedRequest(r)}
                              className="h-7 px-2 text-xs text-slate-600 hover:text-slate-900"
                            >
                              <span>Details</span>
                              <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── CREATE NEW REQUEST MODAL ────────────────────────────────────── */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            <div className="flex items-center justify-between p-5 border-b bg-slate-50/60">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                  <Plus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">New Purchase Request</h3>
                  <p className="text-[11px] text-slate-500">Autonomous Gemini spending compliance evaluation</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="p-6 space-y-4">
              {formError && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs font-semibold text-slate-800">
                  Request Item Title *
                </Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="e.g. Datadog Production APM Pro Subscription"
                  value={form.title}
                  onChange={handleFormChange}
                  disabled={submitting}
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="vendor" className="text-xs font-semibold text-slate-800">
                    Vendor / Merchant *
                  </Label>
                  <Input
                    id="vendor"
                    name="vendor"
                    placeholder="e.g. Datadog, Inc."
                    value={form.vendor}
                    onChange={handleFormChange}
                    disabled={submitting}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="category" className="text-xs font-semibold text-slate-800">
                    Category *
                  </Label>
                  <select
                    id="category"
                    name="category"
                    value={form.category}
                    onChange={handleFormChange}
                    disabled={submitting}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30 font-medium"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="amount" className="text-xs font-semibold text-slate-800">
                    Amount ($ USD) *
                  </Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={handleFormChange}
                    disabled={submitting}
                    className="h-9 text-xs font-sans font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="currency" className="text-xs font-semibold text-slate-800">
                    Settlement Currency
                  </Label>
                  <Input id="currency" name="currency" value="USD (US Dollar)" disabled className="h-9 text-xs bg-slate-50 text-slate-500 font-medium" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="justification" className="text-xs font-semibold text-slate-800">
                  Business Justification &amp; Purpose
                </Label>
                <textarea
                  id="justification"
                  name="justification"
                  rows={3}
                  placeholder="Explain why this procurement is needed and how it impacts departmental operations..."
                  value={form.justification}
                  onChange={handleFormChange}
                  disabled={submitting}
                  className="w-full p-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30 text-slate-800 leading-relaxed"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2.5 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsNewModalOpen(false)}
                  disabled={submitting}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-[#635BFF] hover:bg-[#5348F2] text-white text-xs font-semibold"
                >
                  {submitting ? 'Evaluating with Gemini...' : 'Submit Procurement Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── REQUEST DETAILS & AI INTELLIGENCE MODAL ──────────────────────── */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b bg-slate-50/70">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">{selectedRequest.title}</h3>
                  <Badge variant={REQUEST_STATUS_COLORS[selectedRequest.status]}>
                    {REQUEST_STATUS_LABELS[selectedRequest.status] || selectedRequest.status}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Submitted {formatDateTime(selectedRequest.created_at)} by {selectedRequest.requester_name} ({selectedRequest.department || 'General'})
                </p>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Financial Snapshot */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50/90 border border-slate-200/80 p-4 rounded-xl">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Amount</span>
                  <p className="text-lg font-bold text-slate-900 font-sans mt-0.5">
                    {formatCurrency(selectedRequest.amount, selectedRequest.currency)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vendor</span>
                  <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">{selectedRequest.vendor}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</span>
                  <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">{selectedRequest.category}</p>
                </div>
              </div>

              {/* Justification */}
              <div>
                <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Business Justification
                </h4>
                <p className="text-xs text-slate-700 bg-white border border-slate-200 rounded-lg p-3 leading-relaxed">
                  {selectedRequest.justification || 'No justification provided.'}
                </p>
              </div>

              {/* Rejection notice */}
              {selectedRequest.rejection_reason && (
                <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                  <span className="font-bold block mb-0.5">Rejection Reason:</span>
                  {selectedRequest.rejection_reason}
                </div>
              )}

              {/* ── Signature Gemini AI Intelligence Experience Card ───────── */}
              {selectedRequest.risk_score !== undefined && selectedRequest.risk_score !== null && (() => {
                const aiData = typeof selectedRequest.flags === 'object' && selectedRequest.flags !== null && !Array.isArray(selectedRequest.flags)
                  ? selectedRequest.flags
                  : {
                      risk_level: selectedRequest.risk_score < 0.3 ? 'low' : selectedRequest.risk_score < 0.7 ? 'medium' : 'high',
                      risk_factors: Array.isArray(selectedRequest.flags) ? selectedRequest.flags : [],
                      policy_observations: [],
                      duplicate_risk: 'low',
                    }
                const riskLevel = aiData.risk_level || (selectedRequest.risk_score < 0.3 ? 'low' : selectedRequest.risk_score < 0.7 ? 'medium' : 'high')

                return (
                  <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/20 p-4 space-y-3.5 shadow-2xs">
                    {/* AI Header */}
                    <div className="flex items-center justify-between pb-2.5 border-b border-indigo-100/60">
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded-md bg-[#635BFF] text-white">
                          <Sparkles className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 leading-none block">
                            Gemini AI Spending Intelligence
                          </span>
                          <span className="text-[10px] text-slate-500">Autonomous Procurement Assessment</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant={riskLevel === 'low' ? 'success' : riskLevel === 'medium' ? 'warning' : 'destructive'}
                          className="capitalize text-[10px] py-0 font-bold"
                        >
                          Risk: {riskLevel}
                        </Badge>
                        <Badge
                          variant={selectedRequest.recommendation === 'approve' ? 'success' : selectedRequest.recommendation === 'review' ? 'warning' : 'destructive'}
                          className="text-[10px] uppercase font-bold py-0"
                        >
                          Rec: {selectedRequest.recommendation}
                        </Badge>
                      </div>
                    </div>

                    {/* Risk Score Progress Bar */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600 font-medium text-[11px]">Calculated Risk Score</span>
                        <span className="font-bold text-slate-900 font-sans text-xs">
                          {Math.round(selectedRequest.risk_score * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            selectedRequest.risk_score < 0.3
                              ? 'bg-emerald-500'
                              : selectedRequest.risk_score < 0.7
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${selectedRequest.risk_score * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Reasoning Box */}
                    <div className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200/70 leading-relaxed shadow-2xs">
                      <span className="font-bold text-slate-900 block mb-1">Assessment Reasoning:</span>
                      {selectedRequest.reasoning}
                    </div>

                    {/* Risk Factors & Policy Observations */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {aiData.risk_factors && aiData.risk_factors.length > 0 && (
                        <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200/60">
                          <span className="font-semibold text-slate-800 text-[11px] block mb-1">Risk Factors:</span>
                          <ul className="list-disc list-inside space-y-0.5 text-slate-600 text-[11px]">
                            {aiData.risk_factors.map((rf, idx) => (
                              <li key={idx}>{rf}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {aiData.policy_observations && aiData.policy_observations.length > 0 && (
                        <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200/60">
                          <span className="font-semibold text-slate-800 text-[11px] block mb-1">Policy Checks:</span>
                          <ul className="list-disc list-inside space-y-0.5 text-slate-600 text-[11px]">
                            {aiData.policy_observations.map((po, idx) => (
                              <li key={idx}>{po}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Duplicate Alert & Advisory Footer */}
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-indigo-100/60">
                      <span>Duplicate Purchase Risk: <strong className="capitalize text-slate-800">{aiData.duplicate_risk || 'None'}</strong></span>
                      <span className="italic">Human manager authorization required</span>
                    </div>
                  </div>
                )
              })()}

              {/* Actions Footer */}
              <div className="flex items-center justify-between pt-4 border-t gap-2">
                {selectedRequest.requester_id === user?.id &&
                  ['draft', 'pending_ai', 'policy_check', 'pending_approval'].includes(selectedRequest.status) && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleCancelRequest(selectedRequest.id)}
                      className="text-xs"
                    >
                      Cancel Request
                    </Button>
                  )}

                <div className="ml-auto flex items-center gap-2">
                  {/* PayPal Pay Trigger */}
                  {isAtLeast('finance_manager') && ['approved', 'payment_initiated'].includes(selectedRequest.status) && (
                    <Button
                      size="sm"
                      onClick={() => {
                        const reqToPay = selectedRequest
                        setSelectedRequest(null)
                        setPayingRequest(reqToPay)
                      }}
                      className="gap-1.5 bg-[#635BFF] hover:bg-[#5348F2] text-white font-semibold shadow-xs text-xs"
                    >
                      <CreditCard className="h-3.5 w-3.5" /> Disburse via PayPal Sandbox
                    </Button>
                  )}

                  <Button variant="outline" size="sm" onClick={() => setSelectedRequest(null)} className="text-xs">
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PAYPAL CHECKOUT MODAL ───────────────────────────────────────── */}
      <PayPalCheckoutModal
        isOpen={Boolean(payingRequest)}
        onClose={() => setPayingRequest(null)}
        request={payingRequest}
        onSuccess={() => {
          fetchRequests()
          setPayingRequest(null)
        }}
      />
    </div>
  )
}
