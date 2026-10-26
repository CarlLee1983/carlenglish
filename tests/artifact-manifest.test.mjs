import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { artifactManifest, verifyArtifact } from '../scripts/artifact-manifest.mjs';

const sha = 'a'.repeat(40);
function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), 'carlenglish-artifact-'));
  try {
    const dist = join(root, 'dist');
    mkdirSync(dist);
    writeFileSync(join(dist, 'index.html'), '<h1>Reading</h1>');
    mkdirSync(join(dist, '.well-known'));
    writeFileSync(join(dist, '.well-known', 'example'), 'hidden asset');
    run({ root, dist });
  } finally { rmSync(root, { recursive: true, force: true }); }
}

test('artifact verifies all built files, including hidden paths, against the source commit', () => fixture(({ dist }) => {
  const manifest = artifactManifest(dist, sha);
  assert.equal(manifest.files['.well-known/example'].length, 64);
  assert.doesNotThrow(() => verifyArtifact(dist, JSON.parse(JSON.stringify(manifest)), sha));
}));

test('a different commit cannot publish an otherwise identical artifact', () => fixture(({ dist }) => {
  assert.throws(() => verifyArtifact(dist, artifactManifest(dist, sha), 'b'.repeat(40)), /do not match/);
}));

test('changed, missing, or additional built files invalidate the artifact', () => fixture(({ dist }) => {
  const manifest = artifactManifest(dist, sha);
  writeFileSync(join(dist, 'index.html'), 'changed');
  assert.throws(() => verifyArtifact(dist, manifest, sha), /do not match/);
  writeFileSync(join(dist, 'index.html'), '<h1>Reading</h1>');
  writeFileSync(join(dist, 'extra.txt'), 'unverified');
  assert.throws(() => verifyArtifact(dist, manifest, sha), /do not match/);
  rmSync(join(dist, 'extra.txt'));
  rmSync(join(dist, '.well-known', 'example'));
  assert.throws(() => verifyArtifact(dist, manifest, sha), /do not match/);
}));

test('empty output and symlinks cannot become deployable artifacts', () => fixture(({ root, dist }) => {
  const empty = join(root, 'empty'); mkdirSync(empty);
  assert.throws(() => artifactManifest(empty, sha), /index.html/);
  const outside = join(root, 'outside'); writeFileSync(outside, 'outside');
  symlinkSync(outside, join(dist, 'linked'));
  assert.throws(() => artifactManifest(dist, sha), /symlinks/);
}));
