import { useState, useEffect } from 'react'
import {
  ShieldCheck,
  AlertOctagon,
  CheckCircle,
  Plus,
  Info,
  X,
  RefreshCw,
  Sparkles,
  Lock,
  Sliders,
  DollarSign
} from 'lucide-react'
import { policiesApi } from '../../services/api.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.jsx'
import { Badge } from '../../components/ui/badge.jsx'
import { Button } from '../../components/ui/button.jsx'
import { toast } from '../../hooks/useToast.js'
import { formatCurrency, formatDate } from '../../utils/formatters.js'

export default function Policies() {
  const { isAtLeast } = useAuth()
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)

  const isFinanceOrAdmin = isAtLeast('finance_manager')

  async function fetchPolicies() {
    try {
      setLoading(true)
      const res = await policiesApi.list()
      setPolicies(res.data.policies || [])
    } catch (err) {
      toast({
        title: 'Error loading policies',
        description: err.response?.data?.message || 'Could not fetch policies.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPolicies()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Spending &amp; Governance Policies</h1>
            <Badge variant="indigo" className="text-xs px-2 py-0.5 font-medium">
              Deterministic Rules
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Deterministic corporate rules enforced automatically on every procurement request before disbursement.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPolicies}
            disabled={loading}
            className="text-xs h-9 gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Policies
          </Button>
        </div>
      </div>

      {/* Governance Architecture Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-white">Dual-Layer Procurement Verification</h3>
            <p className="text-xs text-slate-300 mt-0.5 max-w-xl leading-relaxed">
              Every request is evaluated first by the deterministic rule engine for hard budget and blacklist compliance,
              then by Gemini AI for contextual anomaly detection, duplicate spending, and price reasonability.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Enforcement Active
          </span>
        </div>
      </div>

      {/* Policies List */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-16 text-center text-slate-400 shadow-card">
          <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent animate-spin rounded-full mx-auto mb-3" />
          <p className="text-xs font-medium text-slate-600">Retrieving corporate spending policies...</p>
        </div>
      ) : policies.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-16 text-center shadow-card">
          <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-slate-900 text-base">No active spending policies</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Contact your Org Administrator to configure corporate spending policies.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {policies.map(p => {
            const allowedCats = Array.isArray(p.allowed_categories)
              ? p.allowed_categories
              : typeof p.allowed_categories === 'string'
              ? JSON.parse(p.allowed_categories || '[]')
              : []

            const blockedVendors = Array.isArray(p.blocked_vendors)
              ? p.blocked_vendors
              : typeof p.blocked_vendors === 'string'
              ? JSON.parse(p.blocked_vendors || '[]')
              : []

            return (
              <div
                key={p.id}
                className="bg-white rounded-xl border border-slate-200/80 shadow-card overflow-hidden"
              >
                {/* Header */}
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-bold text-base text-slate-900">{p.name}</h3>
                      <Badge variant="success" className="text-xs px-2 py-0.5">
                        Active Policy
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Organization wide policy enforced since {formatDate(p.created_at)}
                    </p>
                  </div>

                  <span className="text-[11px] font-mono text-slate-400 self-start sm:self-auto">
                    POLICY ID: {p.id ? p.id.slice(0, 8) : '—'}
                  </span>
                </div>

                <div className="p-6 space-y-6">
                  {/* Financial Thresholds Grid */}
                  <div>
                    <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider block mb-3">
                      Enforced Financial Ceilings &amp; Triggers
                    </span>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100">
                        <span className="text-[11px] text-slate-500 block font-medium">Single Purchase Limit</span>
                        <div className="text-xl font-bold text-slate-900 font-mono mt-1">
                          {formatCurrency(p.single_purchase_limit)}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">Hard stop policy ceiling</span>
                      </div>

                      <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100">
                        <span className="text-[11px] text-slate-500 block font-medium">Monthly Org Limit</span>
                        <div className="text-xl font-bold text-slate-900 font-mono mt-1">
                          {formatCurrency(p.monthly_budget_limit || 0)}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">Monthly aggregate cap</span>
                      </div>

                      <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100">
                        <span className="text-[11px] text-slate-500 block font-medium">Approval Required Above</span>
                        <div className="text-xl font-bold text-slate-900 font-mono mt-1">
                          {formatCurrency(p.requires_approval_above)}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">Mandates manager sign-off</span>
                      </div>

                      <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100">
                        <span className="text-[11px] text-slate-500 block font-medium">Auto-Approve Below</span>
                        <div className="text-xl font-bold text-emerald-600 font-mono mt-1">
                          {formatCurrency(p.auto_approve_below)}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5 block">Zero-touch if AI risk &lt; 20%</span>
                      </div>
                    </div>
                  </div>

                  {/* Permitted Categories */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4 text-emerald-600" /> Permitted Procurement Domains
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {allowedCats.length > 0 ? (
                        allowedCats.map(cat => (
                          <span
                            key={cat}
                            className="text-xs bg-slate-50 text-slate-700 border border-slate-200/80 px-3 py-1 rounded-lg font-medium shadow-2xs"
                          >
                            {cat}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">All standard categories permitted</span>
                      )}
                    </div>
                  </div>

                  {/* Blocked Vendors Blacklist */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <AlertOctagon className="h-4 w-4 text-rose-600" /> Blocked Vendors (Immediate Policy Rejection)
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {blockedVendors.length > 0 ? (
                        blockedVendors.map(vendor => (
                          <span
                            key={vendor}
                            className="text-xs bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1 rounded-lg font-medium flex items-center gap-1"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                            {vendor}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">No blocked vendors currently listed</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer notes */}
                <div className="px-6 py-3.5 bg-slate-50/50 border-t border-slate-100 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Real-time pre-flight validation on all purchase submissions</span>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Modifications require Org Administrator authorization
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
