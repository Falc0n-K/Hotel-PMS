#!/usr/bin/env node
// Monte la version (SemVer) et date la section du CHANGELOG.
// Usage : npm run version:bump -- <major|minor|patch|prerelease|preminor|premajor|X.Y.Z[-alpha.N]>
//   major      : changement qui casse la compatibilité        1.4.2 → 2.0.0
//   minor      : nouvelle fonctionnalité compatible           1.4.2 → 1.5.0
//   patch      : correction de bug (hotfix), sans ajout       1.4.2 → 1.4.3
//   prerelease : itération de préversion                      1.0.0-alpha.1 → 1.0.0-alpha.2
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const kind = process.argv[2];
if (!kind) {
  console.error('Préciser major, minor, patch, prerelease ou une version X.Y.Z');
  process.exit(1);
}

const changelog = readFileSync('CHANGELOG.md', 'utf8');
const unreleased = changelog.match(/## \[Unreleased\]\n([\s\S]*?)(?=\n## \[|$)/);
if (!unreleased || !unreleased[1].trim()) {
  console.error('La section [Unreleased] du CHANGELOG est vide : décrire les changements avant de monter la version.');
  process.exit(1);
}

execFileSync('npm', ['version', kind, '--no-git-tag-version', '--preid=alpha'], { stdio: 'inherit' });
const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const today = new Date().toISOString().slice(0, 10);
writeFileSync('CHANGELOG.md', changelog.replace('## [Unreleased]\n', `## [Unreleased]\n\n## [${version}] - ${today}\n`));
console.log(`Version ${version} : package.json et CHANGELOG.md à committer, puis PR vers main.`);
