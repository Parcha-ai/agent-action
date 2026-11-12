import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// A consumer check of the actual release artifact, never a publish operation.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const directory = mkdtempSync(join(tmpdir(), 'agent-action-package-'));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const run = (command, args, cwd = root) => execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const pack = JSON.parse(run(npm, ['pack', '--ignore-scripts', '--json', '--pack-destination', directory]))[0];
const tarball = join(directory, pack.filename);
assert(pack.files.some(({ path }) => path === 'dist/styles.css'), 'Optional stylesheet is packed');
for (const entry of ['dist/index.js', 'dist/index.cjs', 'dist/index.d.ts', 'dist/index.d.cts', 'dist/core.js', 'dist/core.cjs', 'dist/core.d.ts', 'dist/core.d.cts', 'README.md', 'LICENSE', 'NOTICE']) {
  assert(pack.files.some(({ path }) => path === entry), `Missing packed file: ${entry}`);
}
for (const { path } of pack.files) {
  assert(/^(dist\/|docs\/|README\.md$|LICENSE$|NOTICE$|package\.json$)/.test(path), `Unexpected release file: ${path}`);
  assert(!path.startsWith('docs/media/'), `Demo media must stay out of the package: ${path}`);
  if (/\.(?:js|cjs|map|json|ts|cts|css|md)$/.test(path)) {
    const contents = readFileSync(join(root, path), 'utf8');
    assert(!/\/home\/ubuntu\/|max-zorin\.m\.parcha\.dev|baron-samedi\.m\.parcha\.dev|BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY/.test(contents), `Machine/product-specific material in ${path}`);
  }
}
for (const file of ['dist/index.js', 'dist/index.cjs']) {
  assert(/^\s*["']use client["'];/.test(readFileSync(join(root, file), 'utf8')), `${file} must retain its React client boundary`);
}

for (const reactVersion of ['18.3.1', '19.2.0']) {
  const fixture = join(directory, `react-${reactVersion}`);
  mkdirSync(fixture);
  writeFileSync(join(fixture, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  run(npm, ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball, `react@${reactVersion}`, `react-dom@${reactVersion}`, `@types/react@${reactVersion.startsWith('18') ? '18' : '19'}`, `@types/react-dom@${reactVersion.startsWith('18') ? '18' : '19'}`], fixture);
  const runtime = `
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { AgentAction } from '@parcha/agent-action';
import { createHandoff, defaultProviders } from '@parcha/agent-action/core';
const require = createRequire(import.meta.url);
assert.equal(typeof require('@parcha/agent-action').AgentAction, 'function');
assert.equal(typeof require('@parcha/agent-action/core').createHandoff, 'function');
assert.match(require.resolve('@parcha/agent-action/styles.css'), /styles\\.css$/);
assert.equal(createHandoff(defaultProviders[0], 'Hello').kind, 'link');
const html = renderToString(React.createElement(AgentAction, { label: 'Build an agent', prompt: 'Test this consumer' }));
assert.match(html, /Build an agent/);
assert(!html.includes('Test this consumer'), 'Closed widget should not leak prompt into SSR HTML');
console.log('ESM, CJS, CSS export and SSR passed');
`;
  writeFileSync(join(fixture, 'smoke.mjs'), runtime);
  process.stdout.write(`React ${reactVersion}: ${run(process.execPath, ['smoke.mjs'], fixture)}`);
  const types = `
import { AgentAction, type AgentActionProps } from '@parcha/agent-action';
import { createHandoff, defaultProviders, type AgentProvider } from '@parcha/agent-action/core';
const props: AgentActionProps = { prompt: 'Typecheck', label: 'Build' };
const agent: AgentProvider = defaultProviders[0];
void AgentAction; void props; void createHandoff(agent, 'Hello');
`;
  writeFileSync(join(fixture, 'consumer.mts'), types);
  writeFileSync(join(fixture, 'consumer.cts'), types);
  run(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '--strict', '--skipLibCheck', '--noEmit', '--target', 'ES2022', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--jsx', 'react-jsx', 'consumer.mts', 'consumer.cts'], fixture);
  console.log(`React ${reactVersion}: ESM and CJS TypeScript consumers passed`);
}

// Extract just the packed artifacts: the core works with no dependencies or browser globals.
const coreOnly = join(directory, 'core-only'); mkdirSync(coreOnly);
run('tar', ['-xzf', tarball, '-C', coreOnly]);
const coreDir = join(coreOnly, 'package');
writeFileSync(join(coreDir, 'core-only.mjs'), `
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { defaultProviders, createHandoff, createPreferenceStore } from './dist/core.js';
const require = createRequire(import.meta.url);
assert.equal(typeof require('./dist/core.cjs').createHandoff, 'function');
assert.equal(typeof window, 'undefined');
assert.equal(createHandoff(defaultProviders[1], 'hello').kind, 'copy');
assert.equal(createPreferenceStore().getServerSnapshot(), null);
console.log('Core ESM/CJS runs without React, dependencies or browser globals');
`);
process.stdout.write(run(process.execPath, ['core-only.mjs'], coreDir));
console.log(`Verified ${pack.name}@${pack.version}: ${pack.files.length} packed files, ${pack.size} bytes`);
console.log(`Artifact: ${tarball}`);
console.log(`Consumer fixtures: ${directory}`);
