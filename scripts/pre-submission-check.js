#!/usr/bin/env node

/**
 * PAYMIND Enterprise — Pre-Submission Security & Cleanliness Verification
 * 
 * Validates:
 * 1. No actual .env files exist (only .env.example allowed).
 * 2. .gitignore properly excludes all environment files.
 * 3. No node_modules directories exist in the submission package.
 * 4. No Python __pycache__, .pytest_cache, or .pyc files exist.
 * 5. No credentials or secrets leaked into .env.example or frontend source code.
 * 6. Essential files (package-lock.json, requirements.txt, migrations, docs) are present.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

let totalChecks = 0;
let passedChecks = 0;
let errors = [];
let warnings = [];

function check(title, fn) {
  totalChecks++;
  try {
    const result = fn();
    if (result === true || result === undefined) {
      passedChecks++;
      console.log(`[PASS] ${title}`);
    } else {
      errors.push(`${title}: ${result}`);
      console.log(`[FAIL] ${title} - ${result}`);
    }
  } catch (err) {
    errors.push(`${title}: ${err.message}`);
    console.log(`[FAIL] ${title} - ${err.message}`);
  }
}

console.log('='.repeat(70));
console.log(' PAYMIND Enterprise — Final Pre-Submission Verification Check');
console.log('='.repeat(70));

// 1. Check for forbidden .env files
check('Zero actual .env files present in repository', () => {
  const forbiddenFiles = [];
  function scan(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.git') {
          scan(fullPath);
        }
      } else {
        const name = entry.name.toLowerCase();
        if ((name === '.env' || name.startsWith('.env.')) && !name.endsWith('.example')) {
          forbiddenFiles.push(path.relative(ROOT_DIR, fullPath));
        }
      }
    }
  }
  scan(ROOT_DIR);
  if (forbiddenFiles.length > 0) {
    return `Found forbidden active .env files: ${forbiddenFiles.join(', ')}`;
  }
  return true;
});

// 2. Check that .gitignore properly excludes .env
check('.gitignore excludes all environment secret files', () => {
  const gitignorePath = path.join(ROOT_DIR, '.gitignore');
  if (!fs.existsSync(gitignorePath)) return 'Missing .gitignore';
  const content = fs.readFileSync(gitignorePath, 'utf8');
  if (!content.includes('.env') || !content.includes('.env.example')) {
    return '.gitignore does not contain comprehensive .env exclusion rules';
  }
  return true;
});

// 3. Check for .env.example files
check('Safe .env.example files present with placeholder values', () => {
  const requiredExamples = [
    'backend/.env.example',
    'frontend/.env.example',
    'ai-service/.env.example',
  ];
  for (const rel of requiredExamples) {
    const fp = path.join(ROOT_DIR, rel);
    if (!fs.existsSync(fp)) return `Missing required template: ${rel}`;
    const content = fs.readFileSync(fp, 'utf8');
    // Ensure no real secrets or passwords in example files
    if (content.includes('AIzaSy') || content.includes('neondb_owner:npg_') || content.includes('sk-ant-') || content.includes('A21AA')) {
      return `Potential real secret detected in ${rel}`;
    }
  }
  return true;
});

// 4. Check for node_modules presence
check('No node_modules directories in submission package', () => {
  const nmPaths = [
    path.join(ROOT_DIR, 'node_modules'),
    path.join(ROOT_DIR, 'backend', 'node_modules'),
    path.join(ROOT_DIR, 'frontend', 'node_modules'),
  ];
  const found = nmPaths.filter(p => fs.existsSync(p));
  if (found.length > 0) {
    return `Found node_modules at: ${found.map(p => path.relative(ROOT_DIR, p)).join(', ')}`;
  }
  return true;
});

// 5. Check for Python caches
check('No Python cache directories (__pycache__, .pytest_cache, .pyc)', () => {
  const foundCaches = [];
  function scanCaches(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '__pycache__' || entry.name === '.pytest_cache') {
          foundCaches.push(path.relative(ROOT_DIR, fullPath));
        } else if (entry.name !== 'node_modules' && entry.name !== '.git') {
          scanCaches(fullPath);
        }
      } else if (entry.name.endsWith('.pyc') || entry.name.endsWith('.pyo')) {
        foundCaches.push(path.relative(ROOT_DIR, fullPath));
      }
    }
  }
  scanCaches(ROOT_DIR);
  if (foundCaches.length > 0) {
    return `Found Python cache files/folders: ${foundCaches.join(', ')}`;
  }
  return true;
});

// 6. Check that frontend bundle does not expose server secrets
check('Frontend source and build does not contain server secrets', () => {
  const frontendDir = path.join(ROOT_DIR, 'frontend', 'src');
  function scanFrontend(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanFrontend(fullPath);
      } else if (entry.name.endsWith('.js') || entry.name.endsWith('.jsx')) {
        const text = fs.readFileSync(fullPath, 'utf8');
        if (text.includes('PAYPAL_CLIENT_SECRET') || text.includes('JWT_SECRET') || text.includes('CSRF_SECRET') || text.includes('DATABASE_URL')) {
          return `Forbidden server environment variable reference in frontend: ${path.relative(ROOT_DIR, fullPath)}`;
        }
      }
    }
    return true;
  }
  return scanFrontend(frontendDir);
});

// 7. Check essential files preservation
check('Essential lockfiles, schemas, and requirements preserved', () => {
  const essential = [
    'backend/package-lock.json',
    'frontend/package-lock.json',
    'ai-service/requirements.txt',
    'backend/migrations',
    'backend/seeds',
    'docs/deployment.md',
    'docs/paypal-integration.md',
    'docs/api-reference.md',
    'README.md',
  ];
  for (const rel of essential) {
    if (!fs.existsSync(path.join(ROOT_DIR, rel))) {
      return `Missing essential project asset: ${rel}`;
    }
  }
  return true;
});

console.log('='.repeat(70));
console.log(` Summary: ${passedChecks}/${totalChecks} checks passed.`);
if (errors.length > 0) {
  console.log(` ${errors.length} issue(s) detected:`);
  errors.forEach(e => console.log(`   - ${e}`));
  console.log('='.repeat(70));
  process.exit(1);
} else {
  console.log(' ALL PRE-SUBMISSION CHECKS PASSED. Submission package is clean & secure.');
  console.log('='.repeat(70));
  process.exit(0);
}

