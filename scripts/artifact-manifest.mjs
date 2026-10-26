import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Bind the exact deployable files to the checked-out commit, not a branch name. */
export function artifactManifest(directory, sourceSha) {
  assert.match(sourceSha, /^[a-f0-9]{40}$/, 'A fixed Git commit is required');
  const root = resolve(directory);
  const files = [];
  function visit(path) {
    const stat = lstatSync(path);
    assert.ok(!stat.isSymbolicLink(), `Artifact symlinks are not allowed: ${path}`);
    if (stat.isDirectory()) {
      for (const name of readdirSync(path).sort()) visit(join(path, name));
    } else {
      assert.ok(stat.isFile(), `Artifact must contain regular files: ${path}`);
      files.push([relative(root, path).split(sep).join('/'), createHash('sha256').update(readFileSync(path)).digest('hex')]);
    }
  }
  assert.ok(lstatSync(root).isDirectory(), 'Artifact root must be a directory');
  visit(root);
  assert.ok(files.some(([name]) => name === 'index.html'), 'A built index.html is required');
  return { version: 1, sourceSha, files: Object.fromEntries(files) };
}

export function verifyArtifact(directory, manifest, sourceSha) {
  assert.deepEqual(manifest, artifactManifest(directory, sourceSha), 'Artifact commit or file hashes do not match');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [mode, directory = 'dist', manifestPath = 'artifact-manifest.json'] = process.argv.slice(2);
  if (!['write', 'verify'].includes(mode)) throw new Error('Usage: node scripts/artifact-manifest.mjs <write|verify> [dist] [manifest]');
  assert.equal(execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], { encoding: 'utf8' }).trim(), '', 'Artifact provenance requires a clean checkout');
  const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (mode === 'write') writeFileSync(manifestPath, `${JSON.stringify(artifactManifest(directory, sourceSha), null, 2)}\n`);
  else verifyArtifact(directory, JSON.parse(readFileSync(manifestPath, 'utf8')), sourceSha);
  console.log(`Artifact ${mode}: ${sourceSha}`);
}
