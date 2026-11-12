import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi, fetchCsrfToken } from '../services/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    try {
      await fetchCsrfToken()
      const res = await authApi.me()
      setUser(res.data.user)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const login = async (credentials) => {
    const res = await authApi.login(credentials)
    await fetchCsrfToken()
    setUser(res.data.user)
    return res.data
  }

  const register = async (data) => {
    const res = await authApi.register(data)
    await fetchCsrfToken()
    setUser(res.data.user)
    return res.data
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } finally {
      setUser(null)
    }
  }

  const hasRole = (roles) => {
    if (!user) return false
    if (typeof roles === 'string') return user.role === roles
    return roles.includes(user.role)
  }

  const isAtLeast = (minRole) => {
    const hierarchy = ['employee', 'manager', 'finance_manager', 'org_admin', 'super_admin']
    if (!user) return false
    return hierarchy.indexOf(user.role) >= hierarchy.indexOf(minRole)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, hasRole, isAtLeast, loadUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
