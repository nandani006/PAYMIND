import { useState, useEffect } from 'react'
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Sparkles,
  Shield,
  Building2,
  ArrowUpRight,
  ChevronRight,
  Eye,
  AlertTriangle,
  HelpCircle,
  Info,
  Calendar,
  X,
  CreditCard
} from 'lucide-react'
import { requestsApi, dashboardApi } from '../../services/api.js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.jsx'
import { Badge } from '../../components/ui/badge.jsx'
import { Button } from '../../components/ui/button.jsx'
import { toast } from '../../hooks/useToast.js'
import { formatCurrency, formatDate } from '../../utils/formatters.js'

export default function EmployeeDashboard({ user, onNewRequestClick }) {
  const [requests, setRequests] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all') // all | pending | approved | completed | rejected
  const [selectedRequest, setSelectedRequest] = useState(null)

  async function loadEmployeeData() {
    try {
      setLoading(true)
      const [sumRes, reqRes] = await Promise.allSettled([
        dashboardApi.summary(),
        requestsApi.list()
      ])

      if (sumRes.status === 'fulfilled') setSummary(sumRes.value.data)
      if (reqRes.status === 'fulfilled') setRequests(reqRes.value.data?.requests || [])
    } catch (err) {
      toast({
        title: 'Error loading dashboard',
        description: 'Unable to retrieve your personal procurement data.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEmployeeData()
  }, [])

  // Filter requests based on status tab
  const filteredRequests = requests.filter(r => {
    if (statusFilter === 'all') return true
    if (statusFilter === 'pending') {
      return ['pending_approval', 'pending_ai', 'policy_check'].includes(r.status)
    }
    return r.status === statusFilter
  })

  // Personal metrics
  const pendingCount = requests.filter(r =>
    ['pending_approval', 'pending_ai', 'policy_check'].includes(r.status)
  ).length
  const approvedCount = requests.filter(r => r.status === 'approved').length
  const completedCount = requests.filter(r => r.status === 'completed').length
  const rejectedCount = requests.filter(r => r.status === 'rejected').length

  function getStatusBadge(status) {
    switch (status) {
      case 'completed':
        return <Badge variant="success" className="text-[11px] font-medium">Disbursed (Paid)</Badge>
      case 'approved':
        return <Badge variant="success" className="text-[11px] font-medium">Approved</Badge>
      case 'pending_approval':
      case 'pending_ai':
      case 'policy_check':
        return <Badge variant="warning" className="text-[11px] font-medium">Awaiting Review</Badge>
      case 'rejected':
        return <Badge variant="destructive" className="text-[11px] font-medium">Declined</Badge>
      case 'cancelled':
        return <Badge variant="secondary" className="text-[11px] font-medium">Cancelled</Badge>
      default:
        return <Badge variant="secondary" className="text-[11px] font-medium">{status}</Badge>
    }
  }

  async function handleCancelRequest(id) {
    if (!confirm('Are you sure you want to cancel this purchase request?')) return
    try {
      await requestsApi.cancel(id)
      toast({ title: 'Request Cancelled', description: 'Your purchase request has been withdrawn.' })
      loadEmployeeData()
      setSelectedRequest(null)
    } catch (err) {
      toast({
        title: 'Cancellation Failed',
        description: err.response?.data?.message || 'Could not cancel request.',
        variant: 'destructive'
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Employee Personalized Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Welcome back, {user?.full_name?.split(' ')[0] || 'Colleague'}
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              {user?.department || 'General'} Team
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Submit corporate purchase requests, track Gemini AI policy checks, and monitor manager approvals.
          </p>
        </div>

        <Button
          onClick={onNewRequestClick}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-10 px-4 font-semibold shadow-sm gap-2 self-start md:self-auto shrink-0"
        >
          <Plus className="h-4 w-4" />
          Create Purchase Request
        </Button>
      </div>

      {/* 4 Personal Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
              Total Submitted
            </span>
            <div className="h-7 w-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono tracking-tight">
            {requests.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Your lifetime submissions</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
              Awaiting Review
            </span>
            <div className="h-7 w-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2 font-mono tracking-tight">
            {pendingCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Pending manager review</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
              Approved &amp; Ready
            </span>
            <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2 font-mono tracking-tight">
            {approvedCount + completedCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {completedCount} paid · {approvedCount} awaiting release
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
              Declined Requests
            </span>
            <div className="h-7 w-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-2 font-mono tracking-tight">
            {rejectedCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Policy or budget ceiling</p>
        </div>
      </div>

      {/* How Autonomous Procurement Works Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl p-5 border border-slate-800 shadow-card">
        <div className="flex items-center gap-2 font-semibold text-xs text-indigo-300 uppercase tracking-wider mb-3">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <span>Autonomous Procurement Workflow</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div className="flex items-start gap-2.5">
            <span className="h-5 w-5 rounded-full bg-indigo-500/30 text-indigo-300 font-bold flex items-center justify-center shrink-0 border border-indigo-400/30 text-[11px]">
              1
            </span>
            <div>
              <span className="font-semibold text-white block">Submit Request</span>
              <p className="text-[11px] text-slate-300 mt-0.5">Define item, amount &amp; vendor</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="h-5 w-5 rounded-full bg-indigo-500/30 text-indigo-300 font-bold flex items-center justify-center shrink-0 border border-indigo-400/30 text-[11px]">
              2
            </span>
            <div>
              <span className="font-semibold text-white block">Policy Engine</span>
              <p className="text-[11px] text-slate-300 mt-0.5">Deterministic rule validation</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="h-5 w-5 rounded-full bg-indigo-500/30 text-indigo-300 font-bold flex items-center justify-center shrink-0 border border-indigo-400/30 text-[11px]">
              3
            </span>
            <div>
              <span className="font-semibold text-white block">Gemini 3 AI</span>
              <p className="text-[11px] text-slate-300 mt-0.5">Risk &amp; duplicate check</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <span className="h-5 w-5 rounded-full bg-indigo-500/30 text-indigo-300 font-bold flex items-center justify-center shrink-0 border border-indigo-400/30 text-[11px]">
              4
            </span>
            <div>
              <span className="font-semibold text-white block">PayPal Release</span>
              <p className="text-[11px] text-slate-300 mt-0.5">Verified Sandbox disbursement</p>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Requests Feed */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-card overflow-hidden">
        {/* Table Filter Tabs */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-slate-900">My Requests &amp; Tracking</h3>
            <span className="text-xs text-slate-400 font-mono">({requests.length})</span>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'All Requests' },
              { id: 'pending', label: 'Awaiting Review' },
              { id: 'approved', label: 'Approved' },
              { id: 'completed', label: 'Paid' },
              { id: 'rejected', label: 'Declined' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition ${
                  statusFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="p-16 text-center text-slate-400">
            <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent animate-spin rounded-full mx-auto mb-3" />
            <p className="text-xs font-medium text-slate-600">Loading your procurement records...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-16 text-center">
            <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-slate-900 text-base">No requests in this category</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              You haven't submitted any purchase requests matching this filter.
            </p>
            <Button
              onClick={onNewRequestClick}
              size="sm"
              className="mt-4 text-xs bg-slate-900 hover:bg-slate-800 text-white"
            >
              Submit Your First Request
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase font-semibold text-slate-500 tracking-wider">
                  <th className="px-5 py-3">Item &amp; Vendor</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Gemini AI Risk</th>
                  <th className="px-5 py-3">Date Submitted</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map(req => {
                  const aiData =
                    typeof req.flags === 'object' && req.flags !== null && !Array.isArray(req.flags)
                      ? req.flags
                      : { risk_factors: Array.isArray(req.flags) ? req.flags : [] }
                  const riskLevel =
                    aiData.risk_level ||
                    (req.risk_score < 0.3 ? 'low' : req.risk_score < 0.7 ? 'medium' : 'high')

                  const isPending = ['pending_approval', 'pending_ai', 'policy_check', 'draft'].includes(req.status)

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/60 transition group">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-900 text-xs">{req.title}</div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                          <Building2 className="h-3 w-3" />
                          <span>{req.vendor}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                          {req.category}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-900 text-xs">
                        {formatCurrency(req.amount, req.currency || 'USD')}
                      </td>
                      <td className="px-5 py-3.5">
                        {getStatusBadge(req.status)}
                      </td>
                      <td className="px-5 py-3.5">
                        {req.risk_score !== null && req.risk_score !== undefined ? (
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant={riskLevel === 'low' ? 'success' : riskLevel === 'medium' ? 'warning' : 'destructive'}
                              className="text-[10px] py-0 capitalize"
                            >
                              {riskLevel} Risk ({Math.round(req.risk_score * 100)}%)
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Evaluating...</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-[11px]">
                        {formatDate(req.created_at)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedRequest(req)}
                            className="text-xs h-7 px-2 text-slate-700"
                          >
                            <Eye className="h-3 w-3 mr-1 text-slate-400" />
                            Details
                          </Button>
                          {isPending && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelRequest(req.id)}
                              className="text-xs h-7 px-2 text-rose-600 hover:bg-rose-50 hover:border-rose-200"
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Request Details Drawer / Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Purchase Request Details</h3>
                  <p className="text-[11px] text-slate-400 font-mono">ID: {selectedRequest.id.slice(0, 12)}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              {/* Item Summary */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-semibold text-slate-900 text-sm">{selectedRequest.title}</span>
                    <p className="text-slate-500 mt-0.5">Vendor: <strong className="text-slate-700">{selectedRequest.vendor}</strong></p>
                  </div>
                  {getStatusBadge(selectedRequest.status)}
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-slate-500">Requested Amount:</span>
                  <span className="text-lg font-bold font-mono text-slate-900">
                    {formatCurrency(selectedRequest.amount, selectedRequest.currency || 'USD')}
                  </span>
                </div>
              </div>

              {/* Justification */}
              {selectedRequest.justification && (
                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                  <span className="font-semibold text-slate-700 block">Business Justification:</span>
                  <p className="text-slate-600 leading-relaxed">{selectedRequest.justification}</p>
                </div>
              )}

              {/* Rejection reason if applicable */}
              {selectedRequest.rejection_reason && (
                <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 text-rose-800 space-y-1">
                  <span className="font-semibold flex items-center gap-1.5 text-rose-900">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                    Decline Reason:
                  </span>
                  <p className="text-[11px] leading-relaxed">{selectedRequest.rejection_reason}</p>
                </div>
              )}

              {/* Gemini AI Assessment Details */}
              {selectedRequest.risk_score !== null && selectedRequest.risk_score !== undefined && (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-50/60 to-slate-50 border border-indigo-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-indigo-950 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                      Gemini AI Spending Advisory
                    </span>
                    <Badge variant="indigo" className="text-[10px] py-0">
                      Score: {Math.round(selectedRequest.risk_score * 100)}%
                    </Badge>
                  </div>

                  {selectedRequest.reasoning && (
                    <p className="text-slate-600 italic text-[11px] pl-1.5 border-l-2 border-indigo-300 leading-relaxed">
                      "{selectedRequest.reasoning}"
                    </p>
                  )}
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Submitted on {formatDate(selectedRequest.created_at)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedRequest(null)}
                  className="text-xs"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

