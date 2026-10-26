import assert from 'node:assert/strict';
import test from 'node:test';
import { collectGitChanges, planContentChange } from '../scripts/content-change.mjs';
import { parseArguments, runVerification, verificationCommands } from '../scripts/verify-content-change.mjs';
import { selectScenes } from './helpers/scene-selection.ts';

const fixture = (id, shared = false) => ({
  path: `content/scenes/${id}.json`,
  data: {
    id,
    image: { src: `/images/scenes/${shared ? 'shared' : id}.webp` },
    sentences: [{ audio: { src: `/audio/sentences/${shared ? 'shared' : id}/1.mp3` } }],
    phrases: [{ audio: { src: `/audio/phrases/${shared ? 'shared' : id}-hello.mp3` } }],
    words: [{ audio: { src: `/audio/words/${shared ? 'shared' : id}-word.mp3` } }],
  },
});
const scenes = [fixture('alpha', true), fixture('beta', true), fixture('gamma')];
const change = (path, status = 'M') => ({ path, status });
const plan = (changes, extra = {}) => planContentChange({ changes, scenes, existingPaths: new Set(changes.map(({ path }) => path)), ...extra });

test('new and modified scenes select their current IDs, retaining companion documentation', () => {
  assert.deepEqual(plan([
    change('content/scenes/gamma.json', '?'), change('content/scenes/alpha.json', 'A'),
    change('content/scenes/alpha.json'), change('docs/batch.md'), change('README.md'),
  ]).sceneIds, ['alpha', 'gamma']);
  assert.equal(plan([change('content/scenes/beta.json')]).mode, 'scenes');
});

test('every kind of shared scene asset selects all current referencing scenes', () => {
  for (const path of [
    'public/images/scenes/shared.webp', 'public/audio/sentences/shared/1.mp3',
    'public/audio/phrases/shared-hello.mp3', 'public/audio/words/shared-word.mp3',
  ]) assert.deepEqual(plan([change(path)]).sceneIds, ['alpha', 'beta']);
});

test('deleted or renamed paths never reduce the suite, even if the current file exists', () => {
  for (const status of ['D', 'R100', 'T', 'U']) {
    const result = plan([change('content/scenes/alpha.json', status)]);
    assert.equal(result.mode, 'full');
    assert.match(result.reason, /Deleted, renamed, or unsupported/);
  }
  assert.equal(plan([change('content/scenes/new-name.json', 'A')]).mode, 'full');
});

test('application, scripts, tests, workflows, config, dependencies, and other content require full verification', () => {
  for (const path of [
    'src/pages/index.astro', 'scripts/content-change.mjs', 'tests/browser.spec.ts',
    '.github/workflows/ci.yml', 'package.json', 'pnpm-lock.yaml', 'playwright.config.ts',
    'content/articles/story.json', 'content/classics/story.json', 'content/wordlists/core/wordlist.json',
    'content/audio/voice-profile.json', 'public/images/brand.png', 'public/audio/articles/story.mp3',
    'notes.txt',
  ]) {
    const result = plan([change('content/scenes/alpha.json'), change(path)]);
    assert.equal(result.mode, 'full', path);
    assert.match(result.reason, /outside scene content/);
  }
});

test('unreferenced, missing, or unrecognized scene assets require full verification', () => {
  for (const path of ['public/images/scenes/orphan.webp', 'public/audio/words/orphan.mp3', 'public/images/scenes/shared.svg']) {
    assert.equal(plan([change(path)]).mode, 'full', path);
  }
  assert.match(plan([change('public/images/scenes/shared.webp')], { existingPaths: new Set() }).reason, /missing or not referenced/);
});

test('invalid scene JSON, mismatched/duplicate/invalid IDs, and malformed asset references require full verification', () => {
  for (const broken of [
    { path: 'content/scenes/broken.json', error: 'Invalid JSON' },
    { path: 'content/scenes/broken.json', data: { id: 'different' } },
    { path: 'content/scenes/broken.json', data: { id: '../broken' } },
    { ...fixture('alpha'), data: { id: 'alpha' } },
    { ...fixture('alpha'), data: { ...fixture('alpha').data, words: [{}] } },
  ]) assert.equal(plan([change('content/scenes/alpha.json')], { scenes: [...scenes.filter((entry) => entry.path !== broken.path), broken] }).mode, 'full');
  assert.equal(plan([change('content/scenes/alpha.json')], { scenes: [...scenes, fixture('alpha')] }).mode, 'full');
});

test('documentation alone, an unchanged tree, and an unresolved base never claim selected verification', () => {
  assert.match(plan([]).reason, /No changed scenes/);
  assert.match(plan([change('docs/notes.md')]).reason, /No changed scenes/);
  assert.equal(plan([change('content/scenes/alpha.json')], { baseError: 'Unknown base' }).reason, 'Unknown base');
});

test('Git adapter aggregates fixed-base commits, staged, unstaged and NUL-delimited untracked paths', () => {
  const calls = [];
  const base = 'a'.repeat(40), head = 'b'.repeat(40);
  const outputs = [base + '\n', head + '\n', 'A\0content/scenes/alpha.json\0',
    'M\0src/reverted.ts\0', 'M\0src/reverted.ts\0M\0content/scenes/beta.json\0',
    'content/scenes/gamma.json\0docs/has a\nnewline.md\0'];
  const result = collectGitChanges((args) => { calls.push(args); return outputs.shift(); }, 'feature~2');
  assert.equal(result.baseCommit, base); assert.equal(result.headCommit, head);
  assert.deepEqual(result.changes, [
    change('content/scenes/alpha.json', 'A'), change('src/reverted.ts'), change('src/reverted.ts'),
    change('content/scenes/beta.json'), change('content/scenes/gamma.json', '?'), change('docs/has a\nnewline.md', '?'),
  ]);
  assert.deepEqual(calls[0], ['rev-parse', '--verify', '--end-of-options', 'feature~2^{commit}']);
  assert.deepEqual(calls[2], ['diff', '--name-status', '-z', '--no-renames', base, head, '--']);
  assert.ok(calls[3].includes('--cached')); assert.ok(calls[4].includes('--no-renames'));
  assert.equal(plan(result.changes).mode, 'full', 'canceled code changes remain conservative');
});

test('Git adapter falls back for option refs, unknown bases and unreadable change inventories', () => {
  for (const base of ['', '--all', '-branch', 'bad\0ref']) {
    let called = false;
    const result = collectGitChanges(() => { called = true; }, base);
    assert.equal(called, false); assert.match(result.baseError, /non-option Git ref/);
  }
  assert.match(collectGitChanges(() => { throw new Error('unknown revision'); }, 'missing').baseError, /unknown revision/);
  let calls = 0;
  const result = collectGitChanges(() => ++calls <= 2 ? 'a'.repeat(40) : 'M\0');
  assert.match(result.baseError, /Invalid NUL-delimited/);
});

test('Git adapter handles no-renames D/A and unexpected R output conservatively', () => {
  for (const diff of ['D\0content/scenes/alpha.json\0A\0content/scenes/new.json\0', 'R100\0content/scenes/alpha.json\0content/scenes/new.json\0']) {
    const outputs = ['a'.repeat(40), 'b'.repeat(40), diff, '', '', ''];
    const result = collectGitChanges(() => outputs.shift());
    assert.equal(result.baseError, undefined);
    assert.equal(plan(result.changes).mode, 'full');
  }
});

test('unset selector preserves the exact complete array, including in CI', () => {
  const data = scenes.map(({ data }) => data);
  assert.equal(selectScenes(data, {}), data);
  assert.equal(selectScenes(data, { CI: 'true' }), data);
});

test('local selector retains inventory order and rejects invalid, duplicate, unknown or empty selection', () => {
  const data = scenes.map(({ data }) => data);
  assert.deepEqual(selectScenes(data, { CARLENGLISH_SCENE_IDS: '["gamma","alpha"]' }).map(({ id }) => id), ['alpha', 'gamma']);
  for (const raw of ['', 'null', '{}', '[]', '["alpha","alpha"]', '["missing"]', '[1]', '["../alpha"]', 'not-json']) {
    assert.throws(() => selectScenes(data, { CARLENGLISH_SCENE_IDS: raw }), /CARLENGLISH_SCENE_IDS/);
  }
  for (const ci of ['true', '1', '0']) assert.throws(() => selectScenes(data, { CI: ci, CARLENGLISH_SCENE_IDS: '["alpha"]' }), /local-only/);
});

test('local CLI command plan keeps global checks, all three selected specs and full CI fallback', () => {
  const selected = { mode: 'scenes', sceneIds: ['alpha'] };
  assert.deepEqual(verificationCommands(selected), [
    ['run', 'verify:static'],
    ['exec', 'playwright', 'test', 'browser.spec.ts', 'pronunciation.spec.ts', 'seo.spec.ts'],
  ]);
  assert.deepEqual(verificationCommands(selected, 'true'), [['run', 'verify']]);
  assert.deepEqual(verificationCommands({ mode: 'full' }), [['run', 'verify']]);
  assert.deepEqual(parseArguments([]), { base: 'HEAD', planOnly: false });
  assert.deepEqual(parseArguments(['--plan', '--base', 'main']), { base: 'main', planOnly: true });
  assert.equal(parseArguments(['--base', '-bad']).base, '-bad', 'the Git adapter rejects option refs with an explicit full fallback');
  for (const args of [['--base'], ['--unknown'], ['--base', '--plan'], ['--plan', '--plan']]) assert.throws(() => parseArguments(args), /Usage/);
});

test('the selector reaches only the local browser child and never mutates the parent environment', () => {
  const env = { CARLENGLISH_SCENE_IDS: '["stale"]', KEEP: 'value' };
  const calls = [];
  const run = (command, childEnv) => { calls.push({ command, env: childEnv }); return { status: 0 }; };
  assert.equal(runVerification({ mode: 'scenes', sceneIds: ['alpha'] }, env, run), 0);
  assert.equal(calls[0].env.CARLENGLISH_SCENE_IDS, undefined);
  assert.equal(calls[1].env.CARLENGLISH_SCENE_IDS, '["alpha"]');
  assert.equal(env.CARLENGLISH_SCENE_IDS, '["stale"]');
  for (const plan of [{ mode: 'full' }, { mode: 'scenes', sceneIds: ['alpha'] }]) {
    calls.length = 0;
    assert.equal(runVerification(plan, { ...env, CI: 'true' }, run), 0);
    assert.deepEqual(calls.map(({ command }) => command), [['run', 'verify']]);
    assert.equal(calls[0].env.CARLENGLISH_SCENE_IDS, undefined);
  }
});

test('failed global checks stop dependent browser execution and propagate failure', () => {
  let calls = 0;
  assert.equal(runVerification({ mode: 'scenes', sceneIds: ['alpha'] }, {}, () => { calls++; return { status: 2 }; }), 2);
  assert.equal(calls, 1);
  assert.equal(runVerification({ mode: 'full' }, {}, () => ({ status: null })), 1);
  assert.throws(() => runVerification({ mode: 'full' }, {}, () => ({ error: new Error('spawn failed') })), /spawn failed/);
});
