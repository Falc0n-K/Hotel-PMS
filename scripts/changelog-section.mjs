#!/usr/bin/env node
// Affiche la section du CHANGELOG d'une version (notes de la release GitHub).
import { readFileSync } from 'node:fs';

const version = process.argv[2];
const text = readFileSync('CHANGELOG.md', 'utf8');
const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const match = text.match(new RegExp(`## \\[${escaped}\\][^\\n]*\\n([\\s\\S]*?)(?=\\n## \\[|$)`));
if (!match || !match[1].trim()) {
  console.error(`Aucune section « ## [${version}] » dans CHANGELOG.md`);
  process.exit(1);
}
process.stdout.write(match[1].trim() + '\n');
