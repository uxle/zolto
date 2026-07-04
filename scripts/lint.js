#!/usr/bin/env node
/** scripts/lint.js — ESLint wrapper for src/ and tests/ */
import { execSync } from 'child_process';
try {
  execSync('npx eslint src/ tests/ --ext .js', { stdio: 'inherit' });
  console.log('✓ No lint errors');
} catch { process.exit(1); }
