#!/usr/bin/env node
/** scripts/format.js — Prettier formatter for all JS/MD files */
import { execSync } from 'child_process';
execSync('npx prettier --write src/ tests/ *.md docs/', { stdio: 'inherit' });
