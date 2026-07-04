#!/usr/bin/env node
/**
 * scripts/deploy.js — Deploy to GitHub Pages
 * GitHub Pages is configured to serve from the root of main branch.
 * This script commits and pushes a production snapshot.
 * Prefer the pages.yml workflow for automated CI/CD deployment.
 */
console.log('For GitHub Pages deployment, push to main branch.');
console.log('The .github/workflows/pages.yml workflow handles deployment automatically.');
