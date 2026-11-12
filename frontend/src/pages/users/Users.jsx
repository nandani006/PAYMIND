import { useState, useEffect } from 'react'
import {
  Users as UsersIcon,
  UserPlus,
  Shield,
  Search,
  Filter,
  RefreshCw,
  Mail,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  Lock
} from 'lucide-react'
import { usersApi } from '../../services/api.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card.jsx'
import { Badge } from '../../components/ui/badge.jsx'
import { Button } from '../../components/ui/button.jsx'
import { toast } from '../../hooks/useToast.js'
import { formatDate } from '../../utils/formatters.js'

export default function Users() {
  const { user: currentUser, isAtLeast } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  // Create User Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'employee',
    department: 'Engineering',
  })

  const isOrgAdmin = isAtLeast('org_admin')

  async function fetchUsers() {
    try {
      setLoading(true)
      const res = await usersApi.list()
      setUsers(res.data?.users || [])
    } catch (err) {
      toast({
        title: 'Error loading team roster',
        description: err.response?.data?.message || 'Could not fetch users.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  function handleFormChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleCreateUser(e) {
    e.preventDefault()
    if (!form.full_name.trim() || !form.email.trim() || !form.password) {
      setError('Full name, email, and password are required.')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      await usersApi.create({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        department: form.department,
      })

      toast({
        title: 'Team Member Provisioned',
        description: `Successfully added ${form.full_name} as ${form.role.replace('_', ' ')}.`,
      })

      setModalOpen(false)
      setForm({
        full_name: '',
        email: '',
        password: '',
        role: 'employee',
        department: 'Engineering',
      })
      fetchUsers()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user.')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      (u.full_name && u.full_name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.department && u.department.toLowerCase().includes(q))

    if (!matchesSearch) return false

    if (roleFilter === 'all') return true
    return u.role === roleFilter
  })

  function getRoleBadge(role) {
    switch (role) {
      case 'org_admin':
      case 'super_admin':
        return <Badge variant="default" className="text-[10px] py-0 capitalize bg-slate-900">Org Admin</Badge>
      case 'finance_manager':
        return <Badge variant="indigo" className="text-[10px] py-0 capitalize">Finance Mgr</Badge>
      case 'manager':
        return <Badge variant="warning" className="text-[10px] py-0 capitalize">Manager</Badge>
      case 'employee':
      default:
        return <Badge variant="secondary" className="text-[10px] py-0 capitalize">Employee</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Team &amp; User Administration</h1>
            <Badge variant="indigo" className="text-xs px-2 py-0.5 font-medium">
              Enterprise Directory
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage organization members, assign procurement authority, and review departmental roles.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsers}
            disabled={loading}
            className="text-xs h-9 gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {isOrgAdmin && (
            <Button
              size="sm"
              onClick={() => setModalOpen(true)}
              className="text-xs h-9 bg-slate-900 hover:bg-slate-800 text-white gap-1.5 shadow-sm"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add Team Member
            </Button>
          )}
        </div>
      </div>

      {/* Users Table Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-card overflow-hidden">
        {/* Search & Role Filters */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, email, department..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: 'all', label: 'All Roles' },
              { id: 'org_admin', label: 'Admins' },
              { id: 'finance_manager', label: 'Finance' },
              { id: 'manager', label: 'Managers' },
              { id: 'employee', label: 'Employees' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setRoleFilter(tab.id)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition ${
                  roleFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Table */}
        {loading ? (
          <div className="p-16 text-center text-slate-400">
            <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent animate-spin rounded-full mx-auto mb-3" />
            <p className="text-xs font-medium text-slate-600">Retrieving user roster...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-16 text-center">
            <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <UsersIcon className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-slate-900 text-base">No team members match filter</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Try adjusting your search query or role filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] uppercase font-semibold text-slate-500 tracking-wider">
                  <th className="px-5 py-3">Team Member</th>
                  <th className="px-5 py-3">Department</th>
                  <th className="px-5 py-3">Assigned Role</th>
                  <th className="px-5 py-3">Account Status</th>
                  <th className="px-5 py-3 text-right">Date Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200">
                          {u.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                            <span>{u.full_name}</span>
                            {u.id === currentUser?.id && (
                              <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 rounded font-normal">
                                (You)
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 font-medium">
                      {u.department || 'General'}
                    </td>
                    <td className="px-5 py-3.5">
                      {getRoleBadge(u.role)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-[11px] text-slate-500">
                      {formatDate(u.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE USER MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Add Team Member</h3>
                  <p className="text-[11px] text-slate-500">Provision corporate account &amp; role</p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-4">
              {error && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">Full Name *</label>
                <input
                  type="text"
                  name="full_name"
                  placeholder="e.g. Alex Morgan"
                  value={form.full_name}
                  onChange={handleFormChange}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={submitting}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">Corporate Email *</label>
                <input
                  type="email"
                  name="email"
                  placeholder="alex.morgan@democorp.com"
                  value={form.email}
                  onChange={handleFormChange}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={submitting}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 block">Initial Password *</label>
                <input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleFormChange}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={submitting}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">Role *</label>
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleFormChange}
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    disabled={submitting}
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="finance_manager">Finance Manager</option>
                    <option value="org_admin">Org Admin</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 block">Department *</label>
                  <select
                    name="department"
                    value={form.department}
                    onChange={handleFormChange}
                    className="w-full p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    disabled={submitting}
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Design">Design</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Finance">Finance</option>
                    <option value="Operations">Operations</option>
                    <option value="Sales">Sales</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="text-xs bg-slate-900 hover:bg-slate-800 text-white"
                >
                  {submitting ? 'Creating...' : 'Provision User'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

