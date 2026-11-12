#!/usr/bin/env node

/**
 * PAYMIND Enterprise — Repository Submission Cleanup Script
 * 
 * Safely removes:
 * 1. node_modules in backend and frontend
 * 2. Python __pycache__, .pytest_cache, and .pyc files
 * 3. Actual active .env files (retaining .env.example templates)
 * 4. Temporary test / build logs
 * 
 * Preserves:
 * - Source code, tests, configs, migrations, seeds, documentation, package-lock files, requirements.txt
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

function removeDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    console.log(`[Removing Directory] ${path.relative(ROOT_DIR, dirPath)}`);
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

function removeFile(filePath) {
  if (fs.existsSync(filePath)) {
    console.log(`[Removing File] ${path.relative(ROOT_DIR, filePath)}`);
    fs.unlinkSync(filePath);
  }
}

console.log('='.repeat(70));
console.log(' PAYMIND Enterprise — Repository Cleanup for Submission');
console.log('='.repeat(70));

// 1. Remove active .env files
removeFile(path.join(ROOT_DIR, 'ai-service', '.env'));
removeFile(path.join(ROOT_DIR, 'backend', '.env'));
removeFile(path.join(ROOT_DIR, 'frontend', '.env'));
removeFile(path.join(ROOT_DIR, '.env'));

// 2. Remove node_modules
removeDir(path.join(ROOT_DIR, 'backend', 'node_modules'));
removeDir(path.join(ROOT_DIR, 'frontend', 'node_modules'));
removeDir(path.join(ROOT_DIR, 'node_modules'));

// 3. Remove Python caches recursively
function cleanPythonCaches(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__pycache__' || entry.name === '.pytest_cache') {
        removeDir(fullPath);
      } else {
        cleanPythonCaches(fullPath);
      }
    } else if (entry.name.endsWith('.pyc') || entry.name.endsWith('.pyo')) {
      removeFile(fullPath);
    }
  }
}

cleanPythonCaches(ROOT_DIR);

console.log('='.repeat(70));
console.log(' Cleanup completed successfully.');
console.log(' Running pre-submission check now:');
console.log('='.repeat(70));

require('./pre-submission-check');

