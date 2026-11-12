import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  ShieldAlert,
  Sparkles,
  Building2,
  User,
  DollarSign,
  PieChart,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  Search,
  Check,
  X
} from 'lucide-react'
import { approvalsApi, dashboardApi, requestsApi, budgetsApi } from '../../services/api.js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.jsx'
import { Badge } from '../../components/ui/badge.jsx'
import { Button } from '../../components/ui/button.jsx'
import { toast } from '../../hooks/useToast.js'
import { formatCurrency, formatDate } from '../../utils/formatters.js'

export default function ManagerDashboard({ user }) {
  const navigate = useNavigate()
  const [queue, setQueue] = useState([])
  const [summary, setSummary] = useState(null)
  const [budgets, setBudgets] = useState([])
  const [recentRequests, setRecentRequests] = useState([])
  const [loading, setLoading] = useState(true)

  // Decision Modal State
  const [activeAction, setActiveAction] = useState(null) // { type: 'approve' | 'reject', request: {...} }
  const [decisionComment, setDecisionComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function loadManagerData() {
    try {
      setLoading(true)
      const [queueRes, sumRes, budRes, reqRes] = await Promise.allSettled([
        approvalsApi.queue(),
        dashboardApi.summary(),
        budgetsApi.list(),
        requestsApi.list()
      ])

      if (queueRes.status === 'fulfilled') setQueue(queueRes.value.data?.queue || [])
      if (sumRes.status === 'fulfilled') setSummary(sumRes.value.data)
      if (budRes.status === 'fulfilled') setBudgets(budRes.value.data?.budgets || [])
      if (reqRes.status === 'fulfilled') setRecentRequests((reqRes.value.data?.requests || []).slice(0, 5))
    } catch (err) {
      toast({
        title: 'Error loading dashboard',
        description: 'Unable to load manager review console data.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadManagerData()
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
        toast({ title: 'Request Authorized', description: `Approved "${request.title}".` })
      } else {
        await approvalsApi.reject(request.id, { comments: decisionComment })
        toast({ title: 'Request Declined', description: `Declined "${request.title}".` })
      }

      setActiveAction(null)
      loadManagerData()
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed.')
    } finally {
      setSubmitting(false)
    }
  }

  // Find manager's department budget
  const deptBudget = budgets.find(
    b => b.department?.toLowerCase() === (user?.department || '').toLowerCase()
  ) || budgets[0]

  const deptTotal = parseFloat(deptBudget?.total_amount) || 0
  const deptSpent = parseFloat(deptBudget?.spent_amount) || 0
  const deptRemaining = Math.max(0, deptTotal - deptSpent)
  const deptUtilPct = deptTotal > 0 ? Math.min(100, Math.round((deptSpent / deptTotal) * 100)) : 0

  const highRiskQueueCount = queue.filter(r => (r.risk_score ?? 0) >= 0.7).length

  return (
    <div className="space-y-6">
      {/* Manager Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Departmental Review &amp; Authorisation Console
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              {user?.department || 'Department'} Manager
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review department requests, verify Gemini AI risk ratings, and sign off on pending procurements.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={loadManagerData}
            disabled={loading}
            className="text-xs h-9 gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            asChild
            size="sm"
            className="text-xs h-9 bg-slate-900 hover:bg-slate-800 text-white gap-1.5"
          >
            <Link to="/approvals">
              Full Queue ({queue.length}) <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* 4 Manager Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
              Pending Approvals
            </span>
            <span className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold">
              {queue.length}
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono tracking-tight">
            {queue.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Awaiting your authorization</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
              Budget Utilisation
            </span>
            <div className="h-7 w-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <PieChart className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono tracking-tight">
            {deptUtilPct}%
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {formatCurrency(deptSpent, 'USD')} of {formatCurrency(deptTotal, 'USD')}
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
              Remaining Liquidity
            </span>
            <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2 font-mono tracking-tight">
            {formatCurrency(deptRemaining, 'USD')}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Uncommitted team balance</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
              High Risk Alerts
            </span>
            <div className="h-7 w-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-2 font-mono tracking-tight">
            {highRiskQueueCount}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Requires careful inspection</p>
        </div>
      </div>

      {/* Main Section: Actionable Approval Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">Pending Review Queue</h2>
            <Badge variant="indigo" className="text-xs px-2 py-0.5">
              Requires Action
            </Badge>
          </div>
          <Link
            to="/approvals"
            className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
          >
            Open dedicated queue <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center text-slate-400 shadow-card">
            <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent animate-spin rounded-full mx-auto mb-3" />
            <p className="text-xs font-medium text-slate-600">Loading pending approval queue...</p>
          </div>
        ) : queue.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center shadow-card">
            <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2.5">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">Your approval queue is completely clear</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              There are no purchase requests currently awaiting your managerial sign-off.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {queue.slice(0, 3).map(req => {
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
                  className="bg-white rounded-xl border border-slate-200/80 shadow-card p-5 hover:border-slate-300 transition duration-150"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Item Details */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{req.title}</span>
                        <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-700">
                          {req.category}
                        </Badge>
                        <Badge
                          variant={riskLevel === 'low' ? 'success' : riskLevel === 'medium' ? 'warning' : 'destructive'}
                          className="text-[10px] py-0 capitalize"
                        >
                          {riskLevel} Risk ({Math.round((req.risk_score ?? 0.1) * 100)}%)
                        </Badge>
                        {req.recommendation && (
                          <Badge
                            variant={req.recommendation === 'approve' ? 'success' : 'warning'}
                            className="text-[10px] py-0 uppercase font-semibold"
                          >
                            AI: {req.recommendation}
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-slate-400" /> {req.vendor}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3 text-slate-400" /> {req.requester_name} (
                          {req.department || 'General'})
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" /> {formatDate(req.created_at)}
                        </span>
                      </div>

                      {req.reasoning && (
                        <p className="text-[11px] text-slate-600 italic bg-indigo-50/40 p-2 rounded border border-indigo-100/70">
                          <Sparkles className="h-3 w-3 text-indigo-600 inline mr-1" />
                          "{req.reasoning}"
                        </p>
                      )}
                    </div>

                    {/* Amount & Fast Actions */}
                    <div className="flex items-center justify-between lg:justify-end gap-5 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      <div className="text-left lg:text-right">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">
                          Amount
                        </span>
                        <span className="text-xl font-bold font-mono text-slate-900">
                          {formatCurrency(req.amount, req.currency || 'USD')}
                        </span>
                      </div>

                      {isSelfRequest ? (
                        <div className="text-right">
                          <Badge variant="outline" className="text-amber-700 bg-amber-50 border-amber-200 text-xs">
                            Self-Approval Blocked
                          </Badge>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDecision('reject', req)}
                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs h-8 px-2.5"
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => openDecision('approve', req)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Approve
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Department Budget & Recent Department Requests Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Department Requests */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-900">Recent Department Submissions</h3>
            <Link to="/requests" className="text-xs text-indigo-600 hover:underline font-medium">
              View all requests &rarr;
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {recentRequests.map(r => (
              <div key={r.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-800 block">{r.title}</span>
                  <span className="text-slate-400 text-[11px]">
                    {r.requester_name} · {r.vendor}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-slate-900 block">
                    {formatCurrency(r.amount, r.currency || 'USD')}
                  </span>
                  <Badge variant="outline" className="text-[10px] py-0">
                    {r.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 1 Col: Department Budget Card */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-900">
                {deptBudget?.department || 'Department'} Budget
              </h3>
              <Badge variant="indigo" className="text-[10px]">
                {deptUtilPct}% Utilized
              </Badge>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Real-time expenditure tracking against the authorized departmental ceiling.
            </p>

            <div className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Allocated Ceiling:</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(deptTotal, 'USD')}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Committed / Disbursed:</span>
                <span className="font-mono font-bold text-slate-900">{formatCurrency(deptSpent, 'USD')}</span>
              </div>
              <div className="flex justify-between text-xs pt-1 border-t border-slate-100">
                <span className="text-slate-500">Available Liquidity:</span>
                <span className="font-mono font-bold text-emerald-600">{formatCurrency(deptRemaining, 'USD')}</span>
              </div>

              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    deptUtilPct > 90 ? 'bg-rose-500' : deptUtilPct > 70 ? 'bg-amber-500' : 'bg-indigo-600'
                  }`}
                  style={{ width: `${deptUtilPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100">
            <Link
              to="/budgets"
              className="text-xs text-indigo-600 hover:underline font-semibold flex items-center justify-between"
            >
              <span>Explore all department budgets</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* DECISION MODAL */}
      {activeAction && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
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
                    {activeAction.type === 'approve' ? 'Authorize Request' : 'Decline Request'}
                  </h3>
                  <p className="text-[11px] text-slate-500">Managerial sign-off</p>
                </div>
              </div>
              <button
                onClick={() => setActiveAction(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs space-y-1">
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
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmitDecision} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                    {activeAction.type === 'approve' ? 'Approval Notes (Optional)' : 'Rejection Reason (Required)'}
                  </label>
                  <textarea
                    rows={3}
                    value={decisionComment}
                    onChange={e => setDecisionComment(e.target.value)}
                    placeholder={
                      activeAction.type === 'approve'
                        ? 'e.g. Approved in accordance with Q4 departmental roadmap.'
                        : 'e.g. Budget ceiling reached; please defer to next month.'
                    }
                    className="w-full p-3 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
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
                    {submitting ? 'Processing...' : activeAction.type === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
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

