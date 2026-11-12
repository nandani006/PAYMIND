import { useState, useEffect } from 'react'
import {
  PiggyBank,
  TrendingUp,
  Calendar,
  Building2,
  DollarSign,
  PieChart,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight
} from 'lucide-react'
import { budgetsApi } from '../../services/api.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.jsx'
import { Badge } from '../../components/ui/badge.jsx'
import { Button } from '../../components/ui/button.jsx'
import { toast } from '../../hooks/useToast.js'
import { formatCurrency, formatDate } from '../../utils/formatters.js'

export default function Budgets() {
  const { isAtLeast } = useAuth()
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchBudgets() {
    try {
      setLoading(true)
      const res = await budgetsApi.list()
      setBudgets(res.data.budgets || [])
    } catch (err) {
      toast({
        title: 'Error loading budgets',
        description: err.response?.data?.message || 'Could not fetch departmental budgets.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBudgets()
  }, [])

  // Aggregate executive metrics
  const totalAllocated = budgets.reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0)
  const totalSpent = budgets.reduce((sum, b) => sum + (parseFloat(b.spent_amount) || 0), 0)
  const totalRemaining = Math.max(0, totalAllocated - totalSpent)
  const avgUtilization = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Departmental Budgets</h1>
            <Badge variant="indigo" className="text-xs px-2 py-0.5 font-medium">
              Fiscal Control
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time departmental spend ceilings, committed disbursements, and remaining liquidity.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchBudgets}
            disabled={loading}
            className="text-xs h-9 gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Budgets
          </Button>
        </div>
      </div>

      {/* Aggregate Financial Health Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Allocated</span>
            <div className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <PiggyBank className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono tracking-tight">
            {formatCurrency(totalAllocated, 'USD')}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Across {budgets.length} active departments</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Committed</span>
            <div className="h-7 w-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono tracking-tight">
            {formatCurrency(totalSpent, 'USD')}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Disbursed or approved</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Available Liquidity</span>
            <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2 font-mono tracking-tight">
            {formatCurrency(totalRemaining, 'USD')}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Uncommitted reserve</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Avg Utilisation</span>
            <div className="h-7 w-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <PieChart className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono tracking-tight">
            {avgUtilization}%
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Corporate aggregate burn</p>
        </div>
      </div>

      {/* Department Cards Grid */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-16 text-center text-slate-400 shadow-card">
          <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent animate-spin rounded-full mx-auto mb-3" />
          <p className="text-xs font-medium text-slate-600">Retrieving departmental budgets...</p>
        </div>
      ) : budgets.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-16 text-center shadow-card">
          <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <PiggyBank className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-slate-900 text-base">No active budgets found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Contact your Finance Manager or Org Admin to establish departmental spend allocations.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {budgets.map(b => {
            const total = parseFloat(b.total_amount) || 0
            const spent = parseFloat(b.spent_amount) || 0
            const remaining = Math.max(0, total - spent)
            const utilPct = total > 0 ? Math.min(100, Math.round((spent / total) * 100)) : 0

            const isHigh = utilPct >= 90
            const isMedium = utilPct >= 70 && utilPct < 90

            return (
              <div
                key={b.id}
                className="bg-white rounded-xl border border-slate-200/80 shadow-card hover:shadow-card-hover transition duration-200 overflow-hidden flex flex-col justify-between"
              >
                {/* Header */}
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-slate-900">{b.department}</span>
                        <span className="text-xs text-slate-400 font-normal">Department</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                        <Calendar className="h-3 w-3 text-slate-400" />
                        <span>
                          {formatDate(b.period_start)} – {formatDate(b.period_end)}
                        </span>
                        <span className="capitalize text-slate-400">({b.period})</span>
                      </div>
                    </div>

                    <Badge
                      variant={isHigh ? 'destructive' : isMedium ? 'warning' : 'outline'}
                      className={`text-xs px-2.5 py-0.5 font-semibold ${
                        !isHigh && !isMedium ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : ''
                      }`}
                    >
                      {utilPct}% Used
                    </Badge>
                  </div>
                </div>

                {/* Numbers Breakdown */}
                <div className="p-5 space-y-5">
                  <div className="grid grid-cols-3 gap-2 bg-slate-50/80 p-3 rounded-xl border border-slate-100 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block tracking-wider">
                        Allocated
                      </span>
                      <p className="text-sm font-bold text-slate-900 font-mono mt-0.5">
                        {formatCurrency(total, b.currency)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block tracking-wider">
                        Committed
                      </span>
                      <p
                        className={`text-sm font-bold font-mono mt-0.5 ${
                          isHigh ? 'text-rose-600' : isMedium ? 'text-amber-600' : 'text-slate-900'
                        }`}
                      >
                        {formatCurrency(spent, b.currency)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block tracking-wider">
                        Remaining
                      </span>
                      <p className="text-sm font-bold text-emerald-600 font-mono mt-0.5">
                        {formatCurrency(remaining, b.currency)}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar & Indicators */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-2">
                      <span className="font-medium">Budget Utilisation</span>
                      <span className="font-mono text-slate-700 font-semibold">{utilPct}% of ceiling</span>
                    </div>

                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isHigh ? 'bg-rose-500' : isMedium ? 'bg-amber-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${utilPct}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100% Limit</span>
                    </div>
                  </div>
                </div>

                {/* Footer status summary */}
                <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 text-xs flex items-center justify-between text-slate-500">
                  <span className="flex items-center gap-1.5">
                    {isHigh ? (
                      <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    )}
                    <span>{isHigh ? 'Approaching budget ceiling' : 'Spending within healthy limits'}</span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    ID: {b.id ? b.id.slice(0, 8) : '—'}
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
