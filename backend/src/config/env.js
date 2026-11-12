/**
 * Environment configuration validator.
 * Enforces production security requirements and rejects startup on missing or weak secrets.
 */

const INSECURE_PLACEHOLDERS = [
  'your_super_secret_jwt_key_at_least_32_characters_long',
  'your_super_secret_jwt_key_min_32_chars',
  'your_csrf_secret_at_least_32_characters_long',
  'your_csrf_secret_min_32_chars',
  'dev-secret-change-in-production',
  'secret',
  'changeme',
  'password',
  '12345678',
];

function validateEnv() {
  const missing = [];
  const weak = [];
  const isProd = process.env.NODE_ENV === 'production';

  // 1. JWT Secret Validation
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    missing.push('JWT_SECRET');
  } else if (jwtSecret.length < 32) {
    weak.push('JWT_SECRET must be at least 32 characters long (current length: ' + jwtSecret.length + ')');
  } else if (isProd && INSECURE_PLACEHOLDERS.includes(jwtSecret.toLowerCase().trim())) {
    weak.push('JWT_SECRET contains an insecure placeholder value. Generate a strong random key.');
  }

  // 2. Database Connection
  if (!process.env.DATABASE_URL && (!process.env.DB_PASSWORD || !process.env.DB_NAME)) {
    missing.push('DATABASE_URL (or DB_PASSWORD + DB_NAME)');
  }

  // 3. CSRF Secret
  const csrfSecret = process.env.CSRF_SECRET;
  if (!csrfSecret) {
    missing.push('CSRF_SECRET');
  } else if (csrfSecret.length < 32) {
    weak.push('CSRF_SECRET must be at least 32 characters long');
  }

  // 4. AI Service Internal Key
  if (!process.env.AI_SERVICE_API_KEY) {
    missing.push('AI_SERVICE_API_KEY');
  }

  // Report errors
  if (missing.length > 0 || (isProd && weak.length > 0)) {
    console.error('❌ Critical Security Configuration Error:');
    if (missing.length > 0) {
      console.error('   Missing required environment variables:', missing.join(', '));
    }
    if (weak.length > 0) {
      console.error('   Weak or insecure secrets:');
      weak.forEach(w => console.error('   - ' + w));
    }
    console.error('   Refer to .env.example to configure required environment values.');
    process.exit(1);
  }

  if (weak.length > 0) {
    console.warn('⚠️  Warning: Non-production environment with weak secrets:');
    weak.forEach(w => console.warn('   - ' + w));
  }
}

module.exports = { validateEnv };
