#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const mobileRoot = path.join(repoRoot, 'mobile');
const requestedTargets = process.argv.slice(2);

const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx']);
const IGNORED_DIRS = new Set([
  '.expo',
  '.git',
  '.next',
  'android',
  'build',
  'dist',
  'ios',
  'node_modules',
]);

const alertImportPattern =
  /import\s*{[\s\S]*?\bAlert\b[\s\S]*?}\s*from\s*['"]react-native['"]/m;
const alertUsagePattern = /\bAlert\.alert\s*\(/;

function resolveTarget(target) {
  if (path.isAbsolute(target)) {
    return target;
  }

  const cwdPath = path.resolve(process.cwd(), target);
  if (fs.existsSync(cwdPath)) {
    return cwdPath;
  }

  return path.resolve(repoRoot, target);
}

function discoverTargets() {
  if (requestedTargets.length > 0) {
    return requestedTargets.map(resolveTarget);
  }

  if (!fs.existsSync(mobileRoot)) {
    return [];
  }

  return fs
    .readdirSync(mobileRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.endsWith('-app'))
    .map((entry) => path.join(mobileRoot, entry.name));
}

function walk(dir, files) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_DIRS.has(entry.name)) {
      continue;
    }

    const nextPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(nextPath, files);
      continue;
    }

    if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(nextPath);
    }
  }
}

function findViolations(targets) {
  const violations = [];

  for (const target of targets) {
    if (!fs.existsSync(target)) {
      violations.push({
        file: target,
        reasons: ['Target path does not exist.'],
      });
      continue;
    }

    const sourceFiles = [];
    walk(target, sourceFiles);

    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const reasons = [];

      if (alertImportPattern.test(content)) {
        reasons.push('imports Alert from react-native');
      }

      if (alertUsagePattern.test(content)) {
        reasons.push('calls Alert.alert(...)');
      }

      if (reasons.length > 0) {
        violations.push({
          file,
          reasons,
        });
      }
    }
  }

  return violations;
}

const targets = discoverTargets();

if (targets.length === 0) {
  console.error('No mobile app targets were found to scan.');
  process.exit(1);
}

const violations = findViolations(targets);

if (violations.length > 0) {
  console.error('Alert usage is not allowed in mobile apps. Replace it with in-app UI.');
  for (const violation of violations) {
    console.error(`- ${path.relative(repoRoot, violation.file)}: ${violation.reasons.join(', ')}`);
  }
  process.exit(1);
}

console.log('No Alert usage found in mobile apps.');
