import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  CheckCircle2,
  PiggyBank,
  ShieldCheck,
  History,
  LogOut,
  Building2,
  Sparkles,
  Search,
  Menu,
  X,
  Plus,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  CreditCard,
  Users
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { approvalsApi } from '../../services/api.js'
import { Badge } from '../ui/badge.jsx'
import { Button } from '../ui/button.jsx'
import { ROLE_LABELS } from '../../utils/constants.js'

export default function AppLayout() {
  const { user, logout, isAtLeast } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [pendingQueueCount, setPendingQueueCount] = useState(0)

  const isManagerOrAbove = isAtLeast('manager')
  const isFinanceOrAbove = isAtLeast('finance_manager')
  const isOrgAdmin = isAtLeast('org_admin')
  const isEmployee = user?.role === 'employee'
  const isManager = user?.role === 'manager'

  // Fetch pending queue count for managers & above
  useEffect(() => {
    if (isManagerOrAbove) {
      approvalsApi.queue()
        .then(res => setPendingQueueCount(res.data?.queue?.length || 0))
        .catch(() => {})
    }
  }, [isManagerOrAbove, location.pathname])

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  // Role-Specific Navigation Architecture
  const getNavSections = () => {
    if (isEmployee) {
      return [
        {
          title: 'MY WORKSPACE',
          items: [
            { to: '/dashboard', label: 'My Overview', icon: LayoutDashboard },
            { to: '/requests', label: 'My Purchase Requests', icon: FileText },
          ],
        },
      ]
    }

    if (isManager) {
      return [
        {
          title: 'DEPARTMENT PLATFORM',
          items: [
            { to: '/dashboard', label: 'Team Overview', icon: LayoutDashboard },
            { to: '/requests', label: 'Department Requests', icon: FileText },
            {
              to: '/approvals',
              label: 'Approval Queue',
              icon: CheckCircle2,
              badge: pendingQueueCount > 0 ? pendingQueueCount : null
            },
          ],
        },
        {
          title: 'FINANCE & TEAM',
          items: [
            { to: '/budgets', label: 'Department Budgets', icon: PiggyBank },
            { to: '/users', label: 'Team Directory', icon: Users },
          ],
        },
      ]
    }

    if (user?.role === 'finance_manager') {
      return [
        {
          title: 'EXECUTIVE OVERVIEW',
          items: [
            { to: '/dashboard', label: 'Financial Executive Overview', icon: LayoutDashboard },
            { to: '/requests', label: 'Purchase Requests', icon: FileText },
            {
              to: '/approvals',
              label: 'Approval Queue',
              icon: CheckCircle2,
              badge: pendingQueueCount > 0 ? pendingQueueCount : null
            },
          ],
        },
        {
          title: 'FINANCIAL CONTROL',
          items: [
            { to: '/budgets', label: 'Department Budgets', icon: PiggyBank },
            { to: '/policies', label: 'Spending Policies', icon: ShieldCheck },
            { to: '/transactions', label: 'Disbursements & Payments', icon: CreditCard },
          ],
        },
        {
          title: 'GOVERNANCE',
          items: [
            { to: '/audit', label: 'Compliance Audit Trail', icon: History },
          ],
        },
      ]
    }

    // Default: Org Admin / Super Admin
    return [
      {
        title: 'GOVERNANCE & PLATFORM',
        items: [
          { to: '/dashboard', label: 'Organisation Overview', icon: LayoutDashboard },
          { to: '/requests', label: 'Purchase Requests', icon: FileText },
          {
            to: '/approvals',
            label: 'Approval Queue',
            icon: CheckCircle2,
            badge: pendingQueueCount > 0 ? pendingQueueCount : null
          },
        ],
      },
      {
        title: 'FINANCE & RULES',
        items: [
          { to: '/budgets', label: 'Department Budgets', icon: PiggyBank },
          { to: '/policies', label: 'Spending Policies', icon: ShieldCheck },
          { to: '/transactions', label: 'Disbursements Ledger', icon: CreditCard },
        ],
      },
      {
        title: 'ADMINISTRATION',
        items: [
          { to: '/users', label: 'Team & Directory', icon: Users },
          { to: '/audit', label: 'Compliance Audit Trail', icon: History },
        ],
      },
    ]
  }

  const navSections = getNavSections()

  // Dynamic Header Breadcrumbs & Title
  function getPageTitle() {
    const p = location.pathname
    if (p.includes('/dashboard')) {
      if (isEmployee) return { title: 'My Overview', section: 'Personal' }
      if (isManager) return { title: 'Team Overview', section: 'Department' }
      if (user?.role === 'finance_manager') return { title: 'Financial Executive Suite', section: 'Finance' }
      return { title: 'Organisation Administration', section: 'Governance' }
    }
    if (p.includes('/requests')) {
      return {
        title: isEmployee ? 'My Purchase Requests' : 'Procurement Requests Ledger',
        section: 'Requests'
      }
    }
    if (p.includes('/approvals')) return { title: 'Manager Approval Queue', section: 'Approvals' }
    if (p.includes('/budgets')) return { title: 'Department Budgets & Ceilings', section: 'Budgets' }
    if (p.includes('/policies')) return { title: 'Deterministic Spending Policies', section: 'Policies' }
    if (p.includes('/transactions')) return { title: 'PayPal Sandbox Disbursements', section: 'Disbursements' }
    if (p.includes('/users')) return { title: 'Team & User Administration', section: 'Directory' }
    if (p.includes('/audit')) return { title: 'Immutable Compliance Audit Trail', section: 'Audit' }
    return { title: 'Enterprise Portal', section: 'Workspace' }
  }

  const { title: pageTitle, section: pageSection } = getPageTitle()

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex flex-col md:flex-row font-sans text-slate-900">
      {/* ── DESKTOP SIDEBAR ──────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-200/80 bg-white h-screen sticky top-0 z-40 select-none shadow-[1px_0_4px_rgba(16,24,40,0.02)]">
        {/* Brand Header */}
        <div className="p-5 pb-4 border-b border-slate-100 flex items-center justify-between">
          <NavLink to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#101828] flex items-center justify-center text-white font-bold text-sm shadow-xs group-hover:bg-[#635BFF] transition-all duration-200">
              <span className="tracking-tight">P</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 text-sm tracking-tight leading-none">
                  PAYMIND
                </span>
                <span className="bg-indigo-50 text-[#635BFF] text-[9px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider border border-indigo-100">
                  AI
                </span>
              </div>
              <span className="block text-[10px] uppercase font-medium tracking-wider text-slate-400 mt-0.5">
                Enterprise B2B
              </span>
            </div>
          </NavLink>
        </div>

        {/* Organisation Context Switcher */}
        <div className="px-4 py-3 border-b border-slate-100/80 bg-slate-50/50">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-600 flex-shrink-0 shadow-2xs">
                <Building2 className="h-3.5 w-3.5 text-slate-600" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 text-[11px] truncate">
                  {user?.org_name || 'TechNova Solutions'}
                </p>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-slate-400">Production neondb</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Grouped Nav Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navSections.map(sec => (
            <div key={sec.title} className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                {sec.title}
              </p>
              {sec.items.map(({ to, label, icon: Icon, badge }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 group ${
                      isActive
                        ? 'bg-slate-900 text-white font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`h-4 w-4 transition-colors ${
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'
                          }`}
                        />
                        <span>{label}</span>
                      </div>
                      {badge !== undefined && badge !== null && (
                        <span className="bg-amber-100 text-amber-800 font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                          {badge}
                        </span>
                      )}
                      {isActive && !badge && <ChevronRight className="h-3 w-3 text-slate-400" />}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </div>

        {/* Sidebar Footer: AI Engine Status & User */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/40 space-y-2.5">
          {/* Gemini AI Status Card */}
          <div className="p-2.5 rounded-lg bg-gradient-to-r from-indigo-50/60 to-purple-50/40 border border-indigo-100/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-[#635BFF]" />
              <div className="text-[11px]">
                <span className="font-semibold text-slate-900 block leading-tight">Gemini 3 Flash</span>
                <span className="text-[10px] text-slate-500">Autonomous Policy AI</span>
              </div>
            </div>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </div>

          {/* User Profile */}
          <div className="flex items-center justify-between pt-1 px-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                {user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate leading-tight">
                  {user?.full_name}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Badge variant="outline" className="text-[9px] px-1 py-0 capitalize text-slate-500 font-medium">
                    {ROLE_LABELS[user?.role] || user?.role}
                  </Badge>
                  <span className="text-[9px] text-slate-400 truncate">
                    · {user?.department || 'General'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT SHELL ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 h-14 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 flex items-center justify-between shadow-[0_1px_2px_rgba(16,24,40,0.02)]">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium hidden sm:inline">PAYMIND</span>
            <span className="text-slate-300 hidden sm:inline">/</span>
            <span className="text-slate-500 font-medium hidden sm:inline">{pageSection}</span>
            <span className="text-slate-300 hidden sm:inline">/</span>
            <h1 className="text-sm font-bold text-slate-900 tracking-tight">{pageTitle}</h1>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            {/* Quick Context Action */}
            <Button
              size="sm"
              onClick={() => navigate('/requests')}
              className="hidden sm:flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white shadow-xs text-xs font-semibold h-8 px-3"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Request</span>
            </Button>

            {/* Mobile menu trigger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 md:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex">
            <div className="w-72 bg-white h-full p-5 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-200">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-white font-bold text-xs">
                      P
                    </div>
                    <span className="font-bold text-slate-900 text-sm">PAYMIND Enterprise</span>
                  </div>
                  <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {navSections.map(sec => (
                    <div key={sec.title} className="space-y-1">
                      <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {sec.title}
                      </p>
                      {sec.items.map(({ to, label, icon: Icon, badge }) => (
                        <NavLink
                          key={to}
                          to={to}
                          onClick={() => setMobileMenuOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium ${
                              isActive ? 'bg-slate-900 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
                            }`
                          }
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className="h-4 w-4" />
                            <span>{label}</span>
                          </div>
                          {badge && (
                            <span className="bg-amber-100 text-amber-800 font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                              {badge}
                            </span>
                          )}
                        </NavLink>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{user?.full_name}</p>
                    <p className="text-[10px] text-slate-500">{ROLE_LABELS[user?.role] || user?.role}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleLogout} className="text-rose-600 text-xs">
                    Sign out
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* Content Outlet */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
