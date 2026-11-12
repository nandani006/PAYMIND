import { useState, useEffect } from 'react'
import {
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  ShieldAlert,
  AlertTriangle,
  Building2,
  User,
  DollarSign,
  FileText,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  X
} from 'lucide-react'
import { approvalsApi } from '../../services/api.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.jsx'
import { Badge } from '../../components/ui/badge.jsx'
import { Button } from '../../components/ui/button.jsx'
import { toast } from '../../hooks/useToast.js'
import { formatCurrency, formatDate } from '../../utils/formatters.js'

export default function Approvals() {
  const { user } = useAuth()
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRisk, setFilterRisk] = useState('all') // 'all' | 'low' | 'medium' | 'high'

  // Decision Modal State
  const [activeAction, setActiveAction] = useState(null) // { type: 'approve' | 'reject', request: {...} }
  const [decisionComment, setDecisionComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function fetchQueue() {
    try {
      setLoading(true)
      const res = await approvalsApi.queue()
      setQueue(res.data.queue || [])
    } catch (err) {
      toast({
        title: 'Error loading approval queue',
        description: err.response?.data?.message || 'Could not fetch approvals queue.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQueue()
  }, [])

  function openDecision(type, request) {
    setActiveAction({ type, request })
    setDecisionComment('')
    setError('')
  }

  async function handleSubmitDecision(e) {
    e.preventDefault()
    if (!activeAction) return

    const { type, request } = activeAction
    if (type === 'reject' && !decisionComment.trim()) {
      setError('Please provide a reason for rejecting this purchase request.')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      if (type === 'approve') {
        await approvalsApi.approve(request.id, { comments: decisionComment })
        toast({ title: 'Request Approved', description: `Successfully authorized "${request.title}".` })
      } else {
        await approvalsApi.reject(request.id, { comments: decisionComment })
        toast({ title: 'Request Rejected', description: `Declined "${request.title}".` })
      }

      setActiveAction(null)
      fetchQueue()
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed.')
    } finally {
      setSubmitting(false)
    }
  }

  // Filtered queue items
  const filteredQueue = queue.filter(req => {
    const matchesSearch =
      req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.requester_name && req.requester_name.toLowerCase().includes(searchQuery.toLowerCase()))

    if (!matchesSearch) return false

    if (filterRisk === 'all') return true
    const score = req.risk_score ?? 0.5
    if (filterRisk === 'low') return score < 0.3
    if (filterRisk === 'medium') return score >= 0.3 && score < 0.7
    if (filterRisk === 'high') return score >= 0.7
    return true
  })

  // Executive summary stats
  const totalQueueAmount = queue.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
  const aiRecommendedApprove = queue.filter(item => item.recommendation === 'approve').length
  const highRiskCount = queue.filter(item => (item.risk_score ?? 0) >= 0.7).length

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Manager Approvals Queue</h1>
            <Badge variant="indigo" className="text-xs px-2 py-0.5 font-medium">
              Live Queue
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review, evaluate Gemini AI risk assessments, and authorize purchase requests requiring management review.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchQueue}
            disabled={loading}
            className="text-xs h-9 gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Queue
          </Button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Awaiting Review</span>
            <span className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold">
              {queue.length}
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono tracking-tight">{queue.length}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Active requests in queue</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Queue Value</span>
            <div className="h-7 w-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono tracking-tight">
            {formatCurrency(totalQueueAmount, 'USD')}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Total pending disbursement</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">AI Approved</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2 font-mono tracking-tight">
            {aiRecommendedApprove}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Recommended by Gemini</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">High Risk Flags</span>
            <div className="h-7 w-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-2 font-mono tracking-tight">
            {highRiskCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Require deep verification</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80 shadow-card">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title, vendor, or requester..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50/70 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] font-medium text-slate-500 mr-1 hidden sm:inline">Risk Filter:</span>
          {[
            { id: 'all', label: 'All Risks' },
            { id: 'low', label: 'Low (<30%)' },
            { id: 'medium', label: 'Medium (30-69%)' },
            { id: 'high', label: 'High (≥70%)' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterRisk(tab.id)}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition ${
                filterRisk === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Queue Card Feed */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200/80 p-16 text-center text-slate-400 shadow-card">
            <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent animate-spin rounded-full mx-auto mb-3" />
            <p className="text-xs font-medium text-slate-600">Retrieving pending approvals...</p>
          </div>
        ) : filteredQueue.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200/80 p-16 text-center shadow-card">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-slate-900 text-base">Your approval queue is clear</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              There are no purchase requests matching your current filter criteria awaiting manager review.
            </p>
          </div>
        ) : (
          filteredQueue.map(req => {
            const isSelfRequest = req.requester_id === user?.id
            const aiData =
              typeof req.flags === 'object' && req.flags !== null && !Array.isArray(req.flags)
                ? req.flags
                : { risk_factors: Array.isArray(req.flags) ? req.flags : [] }
            const riskLevel =
              aiData.risk_level ||
              (req.risk_score < 0.3 ? 'low' : req.risk_score < 0.7 ? 'medium' : 'high')

            return (
              <div
                key={req.id}
                className="bg-white rounded-xl border border-slate-200/80 hover:border-slate-300 shadow-card hover:shadow-card-hover transition duration-200 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                    {/* Main Request Information */}
                    <div className="space-y-3 flex-1">
                      {/* Top Meta Header */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-base text-slate-900 tracking-tight">
                          {req.title}
                        </span>
                        <Badge variant="secondary" className="text-[11px] font-medium bg-slate-100 text-slate-700">
                          {req.category}
                        </Badge>
                        <Badge
                          variant={riskLevel === 'low' ? 'success' : riskLevel === 'medium' ? 'warning' : 'destructive'}
                          className="text-[10px] py-0 capitalize font-medium"
                        >
                          {riskLevel} Risk ({Math.round((req.risk_score ?? 0.1) * 100)}%)
                        </Badge>
                        {req.recommendation && (
                          <Badge
                            variant={req.recommendation === 'approve' ? 'success' : 'warning'}
                            className="text-[10px] py-0 uppercase font-bold"
                          >
                            AI: {req.recommendation}
                          </Badge>
                        )}
                      </div>

                      {/* Requester & Vendor details */}
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-medium text-slate-700">{req.vendor}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="h-4 w-4 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-700">
                            {req.requester_name ? req.requester_name.charAt(0) : 'U'}
                          </div>
                          <span>
                            {req.requester_name}{' '}
                            <span className="text-slate-400">({req.department || 'General'})</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span>Submitted {formatDate(req.created_at)}</span>
                        </div>
                      </div>

                      {/* Justification note if available */}
                      {req.justification && (
                        <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-100 text-xs">
                          <span className="font-semibold text-slate-700 block mb-0.5">Business Justification:</span>
                          <p className="text-slate-600 leading-relaxed">{req.justification}</p>
                        </div>
                      )}

                      {/* Gemini AI Advisory Box */}
                      {req.risk_score !== undefined && req.risk_score !== null && (
                        <div className="p-3.5 rounded-lg bg-gradient-to-r from-indigo-50/60 via-slate-50 to-indigo-50/30 border border-indigo-100 text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-semibold text-indigo-950">
                              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                              <span>Gemini AI Policy &amp; Risk Intelligence</span>
                            </div>
                            {aiData.duplicate_risk && (
                              <span className="text-[11px] text-slate-600">
                                Duplicate Risk: <strong className="capitalize text-slate-800">{aiData.duplicate_risk}</strong>
                              </span>
                            )}
                          </div>

                          {req.reasoning && (
                            <p className="text-slate-600 italic text-[11px] leading-relaxed pl-1 border-l-2 border-indigo-300">
                              "{req.reasoning}"
                            </p>
                          )}

                          {aiData.risk_factors && aiData.risk_factors.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {aiData.risk_factors.map((rf, idx) => (
                                <span
                                  key={idx}
                                  className="bg-white text-slate-600 border border-slate-200 text-[10px] px-2 py-0.5 rounded font-medium shadow-2xs"
                                >
                                  {rf}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right Amount & Decision Actions */}
                    <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-4 pt-4 lg:pt-0 lg:pl-6 border-t lg:border-t-0 lg:border-l border-slate-100 min-w-[200px]">
                      <div className="text-left sm:text-right">
                        <span className="text-[11px] font-semibold uppercase text-slate-400 block tracking-wider">
                          Requested Amount
                        </span>
                        <div className="text-2xl font-bold text-slate-900 font-mono tracking-tight mt-0.5">
                          {formatCurrency(req.amount, req.currency || 'USD')}
                        </div>
                      </div>

                      {isSelfRequest ? (
                        <div className="text-right">
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-medium">
                            <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                            Self-Approval Blocked
                          </div>
                          <span className="block text-[10px] text-slate-400 mt-1">
                            Zero-Trust separation of duties
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDecision('reject', req)}
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-slate-200 hover:border-rose-200 text-xs h-9 px-3"
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => openDecision('approve', req)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-3.5 shadow-sm"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Approve
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* DECISION MODAL */}
      {activeAction && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div
                  className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                    activeAction.type === 'approve' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {activeAction.type === 'approve' ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {activeAction.type === 'approve' ? 'Authorize Purchase Request' : 'Decline Purchase Request'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Executive manager sign-off</p>
                </div>
              </div>
              <button
                onClick={() => setActiveAction(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs space-y-1.5">
                <div className="font-semibold text-slate-900 text-sm">{activeAction.request.title}</div>
                <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-200/50">
                  <span>Vendor: <strong className="text-slate-700">{activeAction.request.vendor}</strong></span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrency(activeAction.request.amount, activeAction.request.currency || 'USD')}
                  </span>
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmitDecision} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    {activeAction.type === 'approve'
                      ? 'Approval Notes (Optional)'
                      : 'Rejection Reason (Required)'}
                  </label>
                  <textarea
                    rows={3}
                    value={decisionComment}
                    onChange={e => setDecisionComment(e.target.value)}
                    placeholder={
                      activeAction.type === 'approve'
                        ? 'e.g. Approved in accordance with Q4 departmental roadmap.'
                        : 'e.g. Budget ceiling reached for this period; please submit next month.'
                    }
                    className="w-full p-3 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Recorded in the immutable compliance audit ledger.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveAction(null)}
                    disabled={submitting}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submitting}
                    className={
                      activeAction.type === 'approve'
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white text-xs'
                        : 'bg-rose-600 hover:bg-rose-700 text-white text-xs'
                    }
                  >
                    {submitting
                      ? 'Processing...'
                      : activeAction.type === 'approve'
                      ? 'Confirm Authorization'
                      : 'Confirm Rejection'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
