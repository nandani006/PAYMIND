import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  Users,
  Building2,
  FileText,
  Sliders,
  History,
  Lock,
  ArrowRight,
  RefreshCw,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Database
} from 'lucide-react'
import { usersApi, budgetsApi, policiesApi, auditApi, dashboardApi } from '../../services/api.js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.jsx'
import { Badge } from '../../components/ui/badge.jsx'
import { Button } from '../../components/ui/button.jsx'
import { toast } from '../../hooks/useToast.js'
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters.js'

export default function AdminDashboard({ user }) {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [budgets, setBudgets] = useState([])
  const [policies, setPolicies] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  async function loadAdminData() {
    try {
      setLoading(true)
      const [usrRes, budRes, polRes, audRes, sumRes] = await Promise.allSettled([
        usersApi.list(),
        budgetsApi.list(),
        policiesApi.list(),
        auditApi.list({ limit: 10 }),
        dashboardApi.summary()
      ])

      if (usrRes.status === 'fulfilled') setUsers(usrRes.value.data?.users || [])
      if (budRes.status === 'fulfilled') setBudgets(budRes.value.data?.budgets || [])
      if (polRes.status === 'fulfilled') setPolicies(polRes.value.data?.policies || [])
      if (audRes.status === 'fulfilled') setAuditLogs(audRes.value.data?.logs || [])
      if (sumRes.status === 'fulfilled') setSummary(sumRes.value.data)
    } catch (err) {
      toast({
        title: 'Error loading administration suite',
        description: 'Unable to retrieve enterprise administrative records.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAdminData()
  }, [])

  const activePolicy = policies[0] || null

  return (
    <div className="space-y-6">
      {/* Enterprise Admin Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Organisation Administration &amp; Governance Console
            </h1>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-900 text-white">
              Org Admin
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Global governance controls, user roster administration, deterministic spending limits, and compliance logs.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={loadAdminData}
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
            <Link to="/users">
              <Users className="h-3.5 w-3.5" />
              Manage Team &amp; Users
            </Link>
          </Button>
        </div>
      </div>

      {/* 4 Governance Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
              Organisation Users
            </span>
            <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono tracking-tight">
            {users.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Across all departments</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
              Department Budgets
            </span>
            <div className="h-7 w-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono tracking-tight">
            {budgets.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Active fiscal allocations</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
              Spending Policies
            </span>
            <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Sliders className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2 font-mono tracking-tight">
            {policies.length} Active
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Deterministic rule engines</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
              Audit Events Logged
            </span>
            <div className="h-7 w-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <History className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono tracking-tight">
            {auditLogs.length}+
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Append-only Neon ledger</p>
        </div>
      </div>

      {/* Admin Split View: Policy Health & Team Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Policy Governance Status */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900">Enforced Spending Policy Limits</h3>
              </div>
              <Badge variant="success" className="text-[10px]">Active</Badge>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Hard stop limits evaluated on every purchase submission before AI assessment.
            </p>

            {activePolicy ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Single Purchase Cap</span>
                    <span className="text-base font-bold font-mono text-slate-900 mt-0.5 block">
                      {formatCurrency(activePolicy.single_purchase_limit, 'USD')}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Monthly Org Limit</span>
                    <span className="text-base font-bold font-mono text-slate-900 mt-0.5 block">
                      {formatCurrency(activePolicy.monthly_budget_limit || 0, 'USD')}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Requires Approval</span>
                    <span className="text-base font-bold font-mono text-slate-900 mt-0.5 block">
                      &gt; {formatCurrency(activePolicy.requires_approval_above, 'USD')}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Auto-Approve Below</span>
                    <span className="text-base font-bold font-mono text-emerald-600 mt-0.5 block">
                      &lt; {formatCurrency(activePolicy.auto_approve_below, 'USD')}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-6">No spending policy configured.</p>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <Link to="/policies" className="text-indigo-600 hover:underline font-semibold flex items-center gap-1">
              <span>View full policy configuration</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Team Members Roster Preview */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">Team Roster Snapshot</h3>
              </div>
              <Link to="/users" className="text-xs text-indigo-600 hover:underline font-medium">
                View all ({users.length}) &rarr;
              </Link>
            </div>

            <p className="text-xs text-slate-500 mb-3">
              Active users and assigned roles across departments.
            </p>

            <div className="divide-y divide-slate-100">
              {users.slice(0, 4).map(u => (
                <div key={u.id} className="py-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[11px] border border-slate-200">
                      {u.full_name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900 block">{u.full_name}</span>
                      <span className="text-slate-400 text-[11px]">{u.email}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-[10px] py-0 capitalize">
                      {u.role.replace('_', ' ')}
                    </Badge>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {u.department || 'General'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100">
            <Link
              to="/users"
              className="text-xs text-indigo-600 hover:underline font-semibold flex items-center justify-between"
            >
              <span>Manage users, roles and permissions</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Compliance & Audit Trail Snapshot */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900">Recent Immutable Audit Events</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Append-only audit ledger recording all administrative, financial, and AI transitions.
            </p>
          </div>
          <Link to="/audit" className="text-xs text-indigo-600 hover:underline font-semibold flex items-center gap-1">
            <span>Open full audit trail</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {auditLogs.slice(0, 5).map(log => (
            <div key={log.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2.5">
                <Badge variant="secondary" className="font-mono text-[10px] py-0.5">
                  {log.action}
                </Badge>
                <span className="text-slate-800 font-medium">{log.actor_name || 'System Daemon'}</span>
                <span className="text-slate-400 text-[11px]">({log.entity_type})</span>
              </div>
              <span className="text-slate-400 font-mono text-[11px] whitespace-nowrap">
                {formatDateTime(log.created_at)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

