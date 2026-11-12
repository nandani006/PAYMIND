export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ORG_ADMIN: 'org_admin',
  FINANCE_MANAGER: 'finance_manager',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
}

export const REQUEST_STATUS = {
  DRAFT: 'draft',
  PENDING_AI: 'pending_ai',
  POLICY_CHECK: 'policy_check',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  PAYMENT_INITIATED: 'payment_initiated',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
}

export const REQUEST_STATUS_LABELS = {
  draft: 'Draft',
  pending_ai: 'AI Assessment',
  policy_check: 'Policy Check',
  pending_approval: 'Awaiting Approval',
  approved: 'Approved',
  payment_initiated: 'Payment In Progress',
  completed: 'Completed',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
}

export const REQUEST_STATUS_COLORS = {
  draft: 'secondary',
  pending_ai: 'secondary',
  policy_check: 'secondary',
  pending_approval: 'warning',
  approved: 'success',
  payment_initiated: 'secondary',
  completed: 'success',
  rejected: 'destructive',
  cancelled: 'secondary',
}

export const CATEGORIES = [
  'Software & SaaS',
  'Hardware & Equipment',
  'Office Supplies',
  'Professional Services',
  'Marketing & Advertising',
  'Travel & Accommodation',
  'Training & Development',
  'Facilities & Maintenance',
  'Cloud & Infrastructure',
  'Other',
]

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  org_admin: 'Organisation Admin',
  finance_manager: 'Finance Manager',
  manager: 'Manager',
  employee: 'Employee',
}
