import { useState, useEffect } from 'react'
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  DollarSign,
  Building2,
  Lock,
  Layers
} from 'lucide-react'
import { paymentsApi } from '../../services/api.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.jsx'
import { Badge } from '../../components/ui/badge.jsx'
import { Button } from '../../components/ui/button.jsx'
import { toast } from '../../hooks/useToast.js'
import { formatCurrency, formatDateTime } from '../../utils/formatters.js'

export default function Transactions() {
  const { isAtLeast } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // all | completed | failed | pending

  async function fetchTransactions() {
    try {
      setLoading(true)
      const res = await paymentsApi.transactions()
      setTransactions(res.data?.transactions || [])
    } catch (err) {
      toast({
        title: 'Error loading transactions',
        description: err.response?.data?.message || 'Could not fetch payment transactions.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  const filteredTransactions = transactions.filter(t => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      (t.paypal_order_id && t.paypal_order_id.toLowerCase().includes(q)) ||
      (t.paypal_capture_id && t.paypal_capture_id.toLowerCase().includes(q)) ||
      (t.title && t.title.toLowerCase().includes(q)) ||
      (t.vendor && t.vendor.toLowerCase().includes(q)) ||
      (t.requester_name && t.requester_name.toLowerCase().includes(q))

    if (!matchesSearch) return false

    if (statusFilter === 'all') return true
    return t.status === statusFilter
  })

  const totalSettledAmount = transactions
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0)

  const completedCount = transactions.filter(t => t.status === 'completed').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Disbursements &amp; Transactions</h1>
            <Badge variant="indigo" className="text-xs px-2 py-0.5 font-medium">
              PayPal Orders v2
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time record of all PayPal Sandbox payment authorizations, captures, and settled disbursements.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTransactions}
            disabled={loading}
            className="text-xs h-9 gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Security & Verification Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-white">Zero-Trust Server-Side Capture Ledger</h3>
            <p className="text-xs text-slate-300 mt-0.5 max-w-xl leading-relaxed">
              Every disbursement is matched against the database row lock in Neon PostgreSQL before server execution.
              Client-supplied amounts are ignored, and all settled funds are recorded immutably.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono self-start sm:self-auto">
          <div>
            <span className="text-slate-400 font-sans block text-[10px] uppercase">Total Settled</span>
            <span className="font-bold text-emerald-400 text-sm">
              {formatCurrency(totalSettledAmount, 'USD')}
            </span>
          </div>
          <div className="h-6 w-px bg-slate-800" />
          <div>
            <span className="text-slate-400 font-sans block text-[10px] uppercase">Successful</span>
            <span className="font-bold text-white text-sm">{completedCount}</span>
          </div>
        </div>
      </div>

      {/* Transactions Table Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-card overflow-hidden">
        {/* Search & Filters */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Order ID, capture ID, vendor..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {['all', 'completed', 'failed'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium capitalize transition ${
                  statusFilter === status
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="p-16 text-center text-slate-400">
            <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent animate-spin rounded-full mx-auto mb-3" />
            <p className="text-xs font-medium text-slate-600">Retrieving payment transactions...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-16 text-center">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <CreditCard className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-slate-900 text-base">No transactions recorded yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Transactions will appear here once approved purchase requests are disbursed via PayPal Sandbox.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase font-semibold text-slate-500 tracking-wider">
                  <th className="px-5 py-3">PayPal Order &amp; Capture ID</th>
                  <th className="px-5 py-3">Item Title &amp; Vendor</th>
                  <th className="px-5 py-3">Requester</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Captured Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3.5 font-mono text-[11px]">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <CreditCard className="h-3 w-3 text-indigo-600" />
                        <span>{tx.paypal_order_id}</span>
                      </div>
                      {tx.paypal_capture_id && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Cap ID: {tx.paypal_capture_id}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900 text-xs">{tx.title}</div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                        <Building2 className="h-3 w-3" />
                        <span>{tx.vendor}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {tx.requester_name || 'Corporate Requester'}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900 text-xs">
                      {formatCurrency(tx.amount, tx.currency || 'USD')}
                    </td>
                    <td className="px-5 py-3.5">
                      {tx.status === 'completed' ? (
                        <Badge variant="success" className="text-[10px] py-0 capitalize">
                          Completed
                        </Badge>
                      ) : tx.status === 'failed' ? (
                        <Badge variant="destructive" className="text-[10px] py-0 capitalize">
                          Failed
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] py-0 capitalize">
                          {tx.status}
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {formatDateTime(tx.captured_at || tx.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

