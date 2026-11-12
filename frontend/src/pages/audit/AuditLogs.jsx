import { useState, useEffect } from 'react'
import {
  History,
  Shield,
  ShieldCheck,
  Search,
  User,
  Clock,
  RefreshCw,
  Code2,
  ChevronDown,
  ChevronRight,
  Filter,
  Layers,
  Database
} from 'lucide-react'
import { auditApi } from '../../services/api.js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.jsx'
import { Badge } from '../../components/ui/badge.jsx'
import { Button } from '../../components/ui/button.jsx'
import { toast } from '../../hooks/useToast.js'
import { formatDateTime } from '../../utils/formatters.js'

export default function AuditLogs() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedLogId, setExpandedLogId] = useState(null)

  async function fetchLogs() {
    try {
      setLoading(true)
      const res = await auditApi.list({ limit: 100 })
      setLogs(res.data.logs || [])
      setTotal(res.data.total || 0)
    } catch (err) {
      toast({
        title: 'Error loading audit trail',
        description: err.response?.data?.message || 'Could not fetch audit logs.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  function getActionBadge(action) {
    if (action.includes('reject') || action.includes('cancel')) {
      return <Badge variant="destructive" className="font-mono text-[11px] py-0.5">{action}</Badge>
    }
    if (action.includes('approve') || action.includes('captured') || action.includes('completed')) {
      return <Badge variant="success" className="font-mono text-[11px] py-0.5">{action}</Badge>
    }
    if (action.includes('login') || action.includes('logout')) {
      return <Badge variant="outline" className="font-mono text-[11px] py-0.5 border-slate-300 text-slate-700">{action}</Badge>
    }
    if (action.includes('create') || action.includes('payment')) {
      return <Badge variant="indigo" className="font-mono text-[11px] py-0.5">{action}</Badge>
    }
    return <Badge variant="secondary" className="font-mono text-[11px] py-0.5">{action}</Badge>
  }

  const filteredLogs = logs.filter(log => {
    const q = searchQuery.toLowerCase()
    return (
      (log.action && log.action.toLowerCase().includes(q)) ||
      (log.actor_name && log.actor_name.toLowerCase().includes(q)) ||
      (log.actor_email && log.actor_email.toLowerCase().includes(q)) ||
      (log.entity_type && log.entity_type.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Immutable Audit Trail</h1>
            <Badge variant="indigo" className="text-xs px-2 py-0.5 font-medium">
              Enterprise Compliance
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Chronological, immutable system ledger recording all procurement, authorization, and financial transactions.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={loading}
            className="text-xs h-9 gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Trail
          </Button>
        </div>
      </div>

      {/* Compliance Guarantee Strip */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Neon PostgreSQL Append-Only Ledger
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Zero deletions allowed. Every transition records actor identity, IP, entity reference, and full JSON payload state.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 self-start sm:self-auto">
          <span className="flex items-center gap-1.5 font-medium text-slate-700">
            <ShieldCheck className="h-4 w-4 text-emerald-600" /> SOC2 / SOX Ready
          </span>
          <span className="text-slate-300">|</span>
          <span className="font-mono text-slate-600">{total} Total Events</span>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-card overflow-hidden">
        {/* Search & Filter Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by action, actor, or entity..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>

          <span className="text-xs text-slate-400 self-center">
            Showing {filteredLogs.length} of {total} events
          </span>
        </div>

        {loading ? (
          <div className="p-16 text-center text-slate-400">
            <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent animate-spin rounded-full mx-auto mb-3" />
            <p className="text-xs font-medium text-slate-600">Retrieving audit events...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-16 text-center">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <History className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-slate-900 text-base">No audit events found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              System events will appear here once administrative or procurement actions are performed.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase font-semibold text-slate-500 tracking-wider">
                  <th className="px-5 py-3 w-8"></th>
                  <th className="px-4 py-3">Action Event</th>
                  <th className="px-5 py-3">Actor / Principal</th>
                  <th className="px-5 py-3">Entity Type</th>
                  <th className="px-5 py-3">State / Payload Snapshot</th>
                  <th className="px-5 py-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map(log => {
                  const isExpanded = expandedLogId === log.id
                  const hasState = Boolean(log.after_state)

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/60 transition group cursor-pointer"
                      onClick={() => hasState && setExpandedLogId(isExpanded ? null : log.id)}
                    >
                      <td className="px-3 py-3.5 text-center text-slate-400">
                        {hasState && (
                          isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-slate-600" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600" />
                          )
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0 border border-slate-200">
                            {log.actor_name ? log.actor_name.charAt(0) : 'S'}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{log.actor_name || 'System / Daemon'}</div>
                            <div className="text-[10px] text-slate-400">{log.actor_email || 'automated-service'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200/60">
                          {log.entity_type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 max-w-xs">
                        {hasState ? (
                          isExpanded ? (
                            <pre className="text-[10px] font-mono bg-slate-900 text-slate-200 p-3 rounded-lg overflow-x-auto max-w-md my-2 shadow-inner">
                              {JSON.stringify(log.after_state, null, 2)}
                            </pre>
                          ) : (
                            <div className="text-slate-500 font-mono text-[11px] truncate max-w-xs group-hover:text-slate-700">
                              {JSON.stringify(log.after_state)}
                            </div>
                          )
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {formatDateTime(log.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
