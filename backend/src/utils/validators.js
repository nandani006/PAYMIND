const Joi = require('joi');

const schemas = {
  register: Joi.object({
    full_name: Joi.string().trim().min(2).max(100).required(),
    email: Joi.string().email().lowercase().required(),
    password: Joi.string().min(8).max(128).required(),
    org_name: Joi.string().trim().min(2).max(255).required(),
    org_domain: Joi.string().domain().lowercase().optional().allow(''),
  }),

  login: Joi.object({
    email: Joi.string().email().lowercase().required(),
    password: Joi.string().required(),
  }),

  createPolicy: Joi.object({
    name: Joi.string().trim().min(2).max(255).required(),
    single_purchase_limit: Joi.number().positive().required(),
    monthly_budget_limit: Joi.number().positive().optional(),
    requires_approval_above: Joi.number().min(0).required(),
    auto_approve_below: Joi.number().min(0).optional(),
    allowed_categories: Joi.array().items(Joi.string()).optional(),
    blocked_vendors: Joi.array().items(Joi.string()).optional(),
  }),

  createBudget: Joi.object({
    department: Joi.string().trim().optional(),
    total_amount: Joi.number().positive().required(),
    currency: Joi.string().length(3).uppercase().default('USD'),
    period: Joi.string().valid('monthly', 'quarterly', 'annual').default('monthly'),
    period_start: Joi.date().iso().required(),
    period_end: Joi.date().iso().greater(Joi.ref('period_start')).required(),
  }),

  createRequest: Joi.object({
    title: Joi.string().trim().min(3).max(255).required(),
    description: Joi.string().max(2000).optional().allow(''),
    vendor: Joi.string().trim().min(1).max(255).required(),
    category: Joi.string().trim().required(),
    amount: Joi.number().positive().precision(2).required(),
    currency: Joi.string().length(3).uppercase().default('USD'),
    justification: Joi.string().max(1000).optional().allow(''),
    idempotency_key: Joi.string().max(255).optional(),
  }),

  approvalDecision: Joi.object({
    comments: Joi.string().max(1000).optional().allow(''),
  }),
};

function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.details.map(d => ({ field: d.context?.key, message: d.message })),
      });
    }
    req.body = value;
    next();
  };
}

module.exports = { schemas, validate };
