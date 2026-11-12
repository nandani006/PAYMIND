import axios from 'axios'

function getBaseUrl() {
  const envUrl = import.meta.env.VITE_API_URL
  if (!envUrl) return '/api'
  const trimmed = envUrl.replace(/\/+$/, '')
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`
}

const api = axios.create({
  baseURL: getBaseUrl(),
  withCredentials: true, // send HttpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
})

// Store CSRF token in memory
let csrfToken = null

export async function fetchCsrfToken() {
  try {
    const res = await api.get('/auth/csrf-token')
    csrfToken = res.data.csrfToken
    api.defaults.headers.common['X-CSRF-Token'] = csrfToken
    return csrfToken
  } catch {
    console.warn('Could not fetch CSRF token')
    return null
  }
}

// Request interceptor: attach CSRF token
api.interceptors.request.use((config) => {
  const mutatingMethods = ['post', 'put', 'patch', 'delete']
  if (mutatingMethods.includes(config.method) && csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken
  }
  return config
})

// Response interceptor: handle 401 without redirect loops
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      csrfToken = null
      const currentPath = window.location.pathname
      const isAuthCheck = error.config?.url?.includes('/auth/me')
      if (currentPath !== '/login' && currentPath !== '/register' && !isAuthCheck) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api

// Auth
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
}

// Users
export const usersApi = {
  list: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.patch(`/users/${id}`, data),
  remove: (id) => api.delete(`/users/${id}`),
}

// Policies
export const policiesApi = {
  list: () => api.get('/policies'),
  create: (data) => api.post('/policies', data),
  update: (id, data) => api.put(`/policies/${id}`, data),
  remove: (id) => api.delete(`/policies/${id}`),
}

// Budgets
export const budgetsApi = {
  list: () => api.get('/budgets'),
  create: (data) => api.post('/budgets', data),
  summary: (id) => api.get(`/budgets/${id}/summary`),
}

// Purchase Requests
export const requestsApi = {
  list: () => api.get('/requests'),
  get: (id) => api.get(`/requests/${id}`),
  create: (data) => api.post('/requests', data),
  cancel: (id) => api.patch(`/requests/${id}/cancel`),
}

// Approvals
export const approvalsApi = {
  queue: () => api.get('/approvals/queue'),
  approve: (requestId, data) => api.post(`/approvals/${requestId}/approve`, data),
  reject: (requestId, data) => api.post(`/approvals/${requestId}/reject`, data),
}

// Payments
export const paymentsApi = {
  createOrder: (data) => api.post('/payments/orders', data),
  captureOrder: (orderId) => api.post(`/payments/orders/${orderId}/capture`),
  orderStatus: (orderId) => api.get(`/payments/orders/${orderId}/status`),
  transactions: () => api.get('/payments/transactions'),
}

// Dashboard
export const dashboardApi = {
  summary: () => api.get('/dashboard/summary'),
  spendTrend: () => api.get('/dashboard/spend-trend'),
  topVendors: () => api.get('/dashboard/top-vendors'),
  categoryBreakdown: () => api.get('/dashboard/category-breakdown'),
}

// Audit
export const auditApi = {
  list: (params) => api.get('/audit', { params }),
  byEntity: (type, id) => api.get(`/audit/entity/${type}/${id}`),
}
