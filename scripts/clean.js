#!/usr/bin/env node
/** scripts/clean.js — Remove generated artifacts */
import { rmSync, existsSync } from 'fs';
const TARGETS = ['dist', 'coverage', '.cache', 'node_modules/.cache'];
for (const t of TARGETS) {
  if (existsSync(t)) { rmSync(t, { recursive: true, force: true }); console.log('Removed:', t); }
}
console.log('Clean done.');
