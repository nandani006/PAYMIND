import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts'
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  DollarSign,
  PieChart,
  Sparkles,
  Building2,
  ArrowRight,
  ShieldAlert,
  CreditCard,
  Lock,
  Layers,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Check
} from 'lucide-react'
import { dashboardApi, requestsApi, paymentsApi } from '../../services/api.js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.jsx'
import { Badge } from '../../components/ui/badge.jsx'
import { Button } from '../../components/ui/button.jsx'
import { toast } from '../../hooks/useToast.js'
import { formatCurrency, formatDate } from '../../utils/formatters.js'
import PayPalCheckoutModal from '../../components/payments/PayPalCheckoutModal.jsx'

export default function FinanceDashboard({ user }) {
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [trend, setTrend] = useState([])
  const [vendors, setVendors] = useState([])
  const [categories, setCategories] = useState([])
  const [recentRequests, setRecentRequests] = useState([])
  const [approvedRequests, setApprovedRequests] = useState([])
  const [loading, setLoading] = useState(true)

  // PayPal Checkout Modal State
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false)
  const [selectedPayRequest, setSelectedPayRequest] = useState(null)

  async function loadFinanceData() {
    try {
      setLoading(true)
      const [sumRes, trendRes, venRes, catRes, reqRes] = await Promise.allSettled([
        dashboardApi.summary(),
        dashboardApi.spendTrend(),
        dashboardApi.topVendors(),
        dashboardApi.categoryBreakdown(),
        requestsApi.list()
      ])

      if (sumRes.status === 'fulfilled') setSummary(sumRes.value.data)
      if (trendRes.status === 'fulfilled') setTrend(trendRes.value.data?.trend || [])
      if (venRes.status === 'fulfilled') setVendors(venRes.value.data?.vendors || [])
      if (catRes.status === 'fulfilled') setCategories(catRes.value.data?.categories || [])
      if (reqRes.status === 'fulfilled') {
        const allReqs = reqRes.value.data?.requests || []
        setRecentRequests(allReqs.slice(0, 6))
        setApprovedRequests(allReqs.filter(r => r.status === 'approved'))
      }
    } catch (err) {
      toast({
        title: 'Error loading finance suite',
        description: 'Unable to retrieve corporate financial metrics.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFinanceData()
  }, [])

  function handleOpenPayment(req) {
    setSelectedPayRequest(req)
    setCheckoutModalOpen(true)
  }

  function handlePaymentSuccess() {
    loadFinanceData()
  }

  // AI intelligence statistics
  const totalEvaluated = recentRequests.filter(r => r.risk_score !== null && r.risk_score !== undefined).length
  const lowRiskCount = recentRequests.filter(r => r.risk_score !== null && r.risk_score < 0.3).length
  const medRiskCount = recentRequests.filter(r => r.risk_score >= 0.3 && r.risk_score < 0.7).length
  const highRiskCount = recentRequests.filter(r => (r.risk_score ?? 0) >= 0.7).length

  // Check if historical spend exists
  const hasSettledSpend = trend.some(t => t.spend > 0)

  return (
    <div className="space-y-6">
      {/* Executive Financial Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Executive Financial Control &amp; Disbursement Suite
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              Finance Manager
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Corporate liquidity monitoring, departmental budget ceilings, and authorized PayPal Sandbox disbursement.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={loadFinanceData}
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
            <Link to="/transactions">
              <CreditCard className="h-3.5 w-3.5" />
              Transactions Ledger
            </Link>
          </Button>
        </div>
      </div>

      {/* 4 Executive Financial KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
              Settled Spend (Month)
            </span>
            <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono tracking-tight">
            {formatCurrency(summary?.spend_this_month || 0, 'USD')}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Verified PayPal disbursements</p>
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
            {summary?.budget_utilisation_pct || 0}%
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Ceiling: {formatCurrency(summary?.total_budget || 0, 'USD')}
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
              Ready for Payment
            </span>
            <span className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-bold">
              {approvedRequests.length}
            </span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2 font-mono tracking-tight">
            {approvedRequests.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Approved procurements awaiting capture</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
              AI Evaluated Requests
            </span>
            <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono tracking-tight">
            {totalEvaluated}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Autonomous risk scans complete</p>
        </div>
      </div>

      {/* Main Row: Spend Visualisation & Gemini AI Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Spend Visualisation */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 shadow-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">Procurement Disbursement Trends</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Monthly verified disbursements captured via PayPal Orders v2.
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400">LAST 6 MONTHS</span>
          </div>

          {hasSettledSpend ? (
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#635BFF" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#635BFF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => `$${v}`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-slate-900 text-white p-2.5 rounded-lg text-xs shadow-lg font-mono">
                            <span className="font-sans text-slate-400 block">{payload[0].payload.month}</span>
                            <span className="font-bold text-indigo-300">
                              {formatCurrency(payload[0].value, 'USD')}
                            </span>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="spend"
                    stroke="#635BFF"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#spendGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center p-6 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2.5">
                <CreditCard className="h-5 w-5" />
              </div>
              <h4 className="font-semibold text-slate-800 text-sm">No Settled Disbursements This Period</h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                Disbursement trends will chart automatically as approved purchase requests are executed through the PayPal Sandbox gateway.
              </p>
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-200/60 text-xs text-slate-600 font-mono">
                <div>
                  <span className="text-slate-400 font-sans block text-[10px] uppercase">Recorded Requests</span>
                  <strong>{summary?.requests_this_month || 0}</strong>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div>
                  <span className="text-slate-400 font-sans block text-[10px] uppercase">Pending Review</span>
                  <strong>{summary?.pending_count || 0}</strong>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div>
                  <span className="text-slate-400 font-sans block text-[10px] uppercase">Ready to Pay</span>
                  <strong className="text-emerald-600">{approvedRequests.length}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Gemini AI Spending Intelligence Console */}
        <div className="bg-slate-900 text-white rounded-xl border border-slate-800 p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                <h3 className="font-bold text-sm text-white">Gemini AI Spending Console</h3>
              </div>
              <Badge variant="indigo" className="text-[10px] bg-indigo-500/20 text-indigo-300 border-indigo-400/30">
                Live Advisor
              </Badge>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Real-time heuristic risk profiling, anomalous volume detection, and autonomous policy compliance.
            </p>

            <div className="space-y-3">
              <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/60">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-slate-400">Risk Distribution</span>
                  <span className="text-indigo-300 font-mono text-[11px]">
                    {lowRiskCount} Low · {medRiskCount} Med · {highRiskCount} High
                  </span>
                </div>
                <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden flex">
                  <div style={{ width: `${totalEvaluated > 0 ? (lowRiskCount / totalEvaluated) * 100 : 70}%` }} className="bg-emerald-500 h-full" />
                  <div style={{ width: `${totalEvaluated > 0 ? (medRiskCount / totalEvaluated) * 100 : 20}%` }} className="bg-amber-500 h-full" />
                  <div style={{ width: `${totalEvaluated > 0 ? (highRiskCount / totalEvaluated) * 100 : 10}%` }} className="bg-rose-500 h-full" />
                </div>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/60 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Duplicate Risk Monitoring:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="h-3 w-3" /> Active
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-700/40">
                  <span className="text-slate-400">Policy Conformance:</span>
                  <span className="text-white font-mono font-bold">100% Enforced</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Model: Gemini 3 Flash
            </span>
            <span className="text-indigo-400 font-mono">PORT 8000</span>
          </div>
        </div>
      </div>

      {/* Action Zone: Approved Requests Ready for PayPal Sandbox Disbursement */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900">
              Procurements Ready for Disbursement ({approvedRequests.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Authorized purchase requests eligible for corporate PayPal Sandbox release.
            </p>
          </div>
          <Link to="/requests" className="text-xs text-indigo-600 hover:underline font-semibold">
            View all requests &rarr;
          </Link>
        </div>

        {approvedRequests.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/50 rounded-xl border border-slate-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-800">All authorized items have been disbursed</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              There are no approved requests currently awaiting PayPal settlement.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {approvedRequests.map(req => (
              <div key={req.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{req.title}</span>
                    <Badge variant="success" className="text-[10px] py-0 uppercase">Approved</Badge>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Vendor: <strong className="text-slate-700">{req.vendor}</strong> · Requester: {req.requester_name} ({req.department})
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <span className="text-base font-bold font-mono text-slate-900">
                    {formatCurrency(req.amount, req.currency || 'USD')}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleOpenPayment(req)}
                    className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-sm"
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    Pay via PayPal
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Vendors Leaderboard */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm text-slate-900">Top Corporate Vendors</h3>
          <span className="text-xs text-slate-400">Past 90 Days</span>
        </div>

        {vendors.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">
            Vendor metrics will populate as requests are completed.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {vendors.slice(0, 6).map((v, i) => (
              <div key={v.vendor} className="p-3 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-xs text-slate-800 block">{v.vendor}</span>
                  <span className="text-[10px] text-slate-400">{v.request_count} completed disbursements</span>
                </div>
                <span className="font-mono font-bold text-xs text-slate-900">
                  {formatCurrency(v.total_spend, 'USD')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Checkout Modal */}
      {selectedPayRequest && (
        <PayPalCheckoutModal
          isOpen={checkoutModalOpen}
          onClose={() => {
            setCheckoutModalOpen(false)
            setSelectedPayRequest(null)
          }}
          request={selectedPayRequest}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  )
}

