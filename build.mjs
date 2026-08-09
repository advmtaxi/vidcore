/**
 * Cross-platform build script for the web UI.
 *
 * Replaces the bash-only `build:web` npm script so it works
 * on Windows, Linux, macOS, and inside Docker containers.
 *
 * Usage: node build.mjs
 */

import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';

// 1. Clean previous build
if (existsSync(DIST)) {
  rmSync(DIST, { recursive: true, force: true });
}

// 2. Compile web TS → dist/
execSync('npx tsc -p tsconfig.web.json', { stdio: 'inherit' });

// 3. Copy static assets into dist/
mkdirSync(join(DIST, 'styles'), { recursive: true });
cpSync('web/index.html', join(DIST, 'index.html'));
cpSync('web/styles/app.css', join(DIST, 'styles', 'app.css'));

console.log('web build → dist/ ✓');
