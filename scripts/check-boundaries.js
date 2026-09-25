#!/usr/bin/env node
/**
 * Fails the build when a feature reaches into another feature's internals, or when
 * the Domain layer imports infrastructure. Lint covers this in the editor; this
 * script is the CI backstop and runs on the whole tree in one pass.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
const violations = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.tsx?$/.test(entry.name)) check(full);
  }
}

function check(file) {
  const rel = path.relative(SRC, file);
  const src = fs.readFileSync(file, 'utf8');
  const imports = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
  const inFeature = rel.match(/^features\/([^/]+)\//);
  const inDomain = /(^|\/)domain\//.test(rel);

  for (const spec of imports) {
    if (/^@features\/[^/]+\/./.test(spec)) {
      violations.push(`${rel}: deep import into a feature (${spec}) — use its public barrel`);
    }
    if (inFeature) {
      const other = spec.match(/^@features\/([^/]+)/);
      if (other && other[1] === inFeature[1] && spec !== `@features/${inFeature[1]}`) {
        violations.push(`${rel}: import your own feature by relative path, not the alias`);
      }
    }
    if (inDomain && (spec.startsWith('@core/') || /(^|\/)data\//.test(spec) ||
        ['react', 'react-native', 'axios'].includes(spec) || spec.startsWith('expo'))) {
      violations.push(`${rel}: Domain must stay framework-free (imports ${spec})`);
    }
  }
}

// Expo Router resolves 'src/app' BEFORE 'app'. If this directory ever comes
// back, routing silently moves to it and the app bundles with no routes.
if (fs.existsSync(path.join(SRC, 'app'))) {
  violations.push("src/app/ exists — it shadows Expo Router's route directory. The composition root is src/bootstrap/.");
}

walk(SRC);
if (violations.length) {
  console.error('Architecture boundary violations:\n' + violations.map((v) => '  - ' + v).join('\n'));
  process.exit(1);
}
console.log('Boundaries OK');
