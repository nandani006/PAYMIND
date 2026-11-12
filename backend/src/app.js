const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { doubleCsrf } = require('csrf-csrf');
const morgan = require('morgan');

const { rateLimiter, authRateLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/users.routes');
const orgRoutes = require('./routes/organisations.routes');
const policyRoutes = require('./routes/policies.routes');
const budgetRoutes = require('./routes/budgets.routes');
const requestRoutes = require('./routes/requests.routes');
const approvalRoutes = require('./routes/approvals.routes');
const paymentRoutes = require('./routes/payments.routes');
const auditRoutes = require('./routes/audit.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const app = express();

// Security headers
app.use(helmet());

// CORS — allow frontend origin with credentials
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging
app.use(morgan('combined'));

// CSRF protection (double-submit cookie pattern)
const { generateToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => {
    const s = process.env.CSRF_SECRET;
    if (!s && process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: CSRF_SECRET environment variable is missing.');
    }
    return s || 'paymind-dev-csrf-secret-min-32-chars-long';
  },
  cookieName: 'paymind_csrf',
  cookieOptions: {
    httpOnly: false, // must be readable by JS (double-submit pattern)
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  },
  size: 64,
  getTokenFromRequest: (req) => req.headers['x-csrf-token'],
});

// Expose token generation on res.locals for the CSRF endpoint
app.use((req, res, next) => {
  res.locals.generateCsrfToken = () => generateToken(req, res);
  next();
});

// Apply CSRF protection to all state-changing routes
// (GET endpoints and external PayPal webhooks are excluded)
app.use('/api', (req, res, next) => {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) return next();
  if (req.path === '/payments/webhooks') return next();
  doubleCsrfProtection(req, res, next);
});

// Rate limiting
app.use('/api', rateLimiter);

// Health check (unauthenticated)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'paymind-backend', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/organisations', orgRoutes);
app.use('/api/policies', policyRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
