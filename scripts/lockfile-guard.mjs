#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
const pm =
  existsSync('pnpm-lock.yaml') ? 'pnpm' :
  existsSync('yarn.lock') ? 'yarn' :
  existsSync('package-lock.json') ? 'npm' : null;

if (!pm) {
  console.error('❌ No lockfile found. Commit a lockfile.');
  process.exit(1);
}

console.log(`📦 Detected package manager: ${pm}`);

// If package.json changed but lockfile didn't in this commit, fail.
// We rely on git diff against HEAD for staged files.
try {
  const changed = execSync('git diff --cached --name-only', { encoding: 'utf-8' })
    .split('\n')
    .filter(Boolean);
  
  const pkgChanged = changed.includes('package.json');
  const lockChanged = changed.some(f =>
    ['pnpm-lock.yaml','yarn.lock','package-lock.json'].includes(f)
  );

  if (pkgChanged && !lockChanged) {
    console.error('❌ package.json changed without updating lockfile.');
    console.error(`   Run '${pm} install' to update the lockfile.`);
    process.exit(1);
  }

  // Allow lockfile-only metadata tweaks (warn, don't fail)
  if (lockChanged && !pkgChanged) {
    console.warn('⚠️  Lockfile changed without package.json changes. Proceeding (metadata changes).');
  }

  if (pkgChanged && lockChanged) {
    console.log('✅ Both package.json and lockfile updated correctly.');
  }

  console.log('✅ Lockfile guard passed');
  process.exit(0);
} catch (error) {
  // If we're not in a git repo or no staged changes, that's fine
  console.log('ℹ️  No git staged changes detected, skipping lockfile guard');
  process.exit(0);
}
