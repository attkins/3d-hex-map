#!/usr/bin/env node
// One command to cut a release: bump version, regenerate CHANGELOG from the
// commits, commit both, tag it and push. Works even with npm ignore-scripts=true
// because it does not rely on npm version lifecycle hooks.
//
//   npm run release            # patch bump (default)
//   npm run release minor
//   npm run release major
//   npm run release 1.2.3      # explicit version
//
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const run = (cmd, args) =>
  execFileSync(cmd, args, { stdio: ['inherit', 'pipe', 'inherit'] })
    .toString()
    .trim();
const runLive = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit' });

// 1. Refuse to release from a dirty tree, so the version commit stays clean.
if (run('git', ['status', '--porcelain'])) {
  console.error('Working tree is not clean. Commit or stash first.');
  process.exit(1);
}

// 2. Bump package.json (and lockfile) without committing or tagging.
const bump = process.argv[2] ?? 'patch';
runLive('npm', ['version', bump, '--no-git-tag-version']);
const version = JSON.parse(readFileSync('package.json', 'utf8')).version;
const tag = `v${version}`;

// 3. Regenerate the whole CHANGELOG, attributing the new commits to this tag.
runLive('npx', ['git-cliff', '--tag', tag, '--output', 'CHANGELOG.md']);

// 4. One commit with the bump + changelog, then the tag.
runLive('git', ['add', 'package.json', 'package-lock.json', 'CHANGELOG.md']);
runLive('git', ['commit', '-m', `chore(release): ${version}`]);
runLive('git', ['tag', '-a', tag, '-m', version]);

// 5. Push commit + tag. If there is no upstream yet, tell the user instead of
//    dumping a stack trace.
try {
  runLive('git', ['push', '--follow-tags']);
  console.log(`\nReleased ${tag} and pushed.`);
} catch {
  console.log(`\nReleased ${tag} locally. Push failed — run: git push --follow-tags`);
  process.exit(1);
}
