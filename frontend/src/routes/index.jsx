import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute.jsx'
import AppLayout from '../components/layout/AppLayout.jsx'
import Login from '../pages/auth/Login.jsx'
import Register from '../pages/auth/Register.jsx'
import Dashboard from '../pages/dashboard/Dashboard.jsx'
import Requests from '../pages/requests/Requests.jsx'
import Approvals from '../pages/approvals/Approvals.jsx'
import Budgets from '../pages/budgets/Budgets.jsx'
import Policies from '../pages/policies/Policies.jsx'
import Transactions from '../pages/transactions/Transactions.jsx'
import Users from '../pages/users/Users.jsx'
import AuditLogs from '../pages/audit/AuditLogs.jsx'
import NotFound from '../pages/NotFound.jsx'

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected Routes with Application Shell */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          {/* Universal Protected Routes */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/requests" element={<Requests />} />

          {/* Manager & Above */}
          <Route element={<ProtectedRoute minRole="manager" />}>
            <Route path="/approvals" element={<Approvals />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/users" element={<Users />} />
          </Route>

          {/* Finance Manager & Org Admin */}
          <Route element={<ProtectedRoute minRole="finance_manager" />}>
            <Route path="/policies" element={<Policies />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/audit" element={<AuditLogs />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>

      {/* 404 Fallback */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
