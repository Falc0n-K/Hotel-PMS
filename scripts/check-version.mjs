#!/usr/bin/env node
// Vérifie avant un merge dans main que la version de package.json est nouvelle,
// supérieure à la dernière publiée (ordre SemVer : 1.0.0-alpha.2 < 1.0.0-beta.1 < 1.0.0)
// et décrite dans le CHANGELOG.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const parse = (v) => {
  const m = v.replace(/^v/, '').match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!m) throw new Error(`Version non SemVer : ${v}`);
  return { core: [+m[1], +m[2], +m[3]], pre: m[4] ? m[4].split('.') : [] };
};
export function compare(a, b) {
  const x = parse(a);
  const y = parse(b);
  for (let i = 0; i < 3; i++) if (x.core[i] !== y.core[i]) return x.core[i] - y.core[i];
  if (!x.pre.length || !y.pre.length) return y.pre.length - x.pre.length; // sans préversion = plus grande
  for (let i = 0; i < Math.max(x.pre.length, y.pre.length); i++) {
    const [p, q] = [x.pre[i], y.pre[i]];
    if (p === undefined) return -1;
    if (q === undefined) return 1;
    const [pn, qn] = [/^\d+$/.test(p), /^\d+$/.test(q)];
    if (pn && qn && +p !== +q) return +p - +q;
    if (pn !== qn) return pn ? -1 : 1;
    if (p !== q) return p < q ? -1 : 1;
  }
  return 0;
}

const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
parse(version);
const tags = execFileSync('git', ['tag', '--list', 'v*'], { encoding: 'utf8' }).split('\n').filter(Boolean);
const fail = (msg) => {
  console.error(`::error::${msg}`);
  process.exit(1);
};
if (tags.includes(`v${version}`)) {
  fail(`v${version} est déjà publiée. Lancer : npm run version:bump -- patch (correctif) | minor (fonctionnalité) | major (rupture)`);
}
const latest = tags.filter((t) => { try { parse(t); return true; } catch { return false; } }).sort(compare).pop();
if (latest && compare(version, latest) <= 0) fail(`${version} doit être supérieure à la dernière version publiée (${latest})`);
const changelog = readFileSync('CHANGELOG.md', 'utf8');
if (!changelog.includes(`## [${version}]`)) fail(`Aucune section « ## [${version}] » dans CHANGELOG.md`);
console.log(`Version ${version} prête à publier${latest ? ` (dernière : ${latest})` : ''}.`);
