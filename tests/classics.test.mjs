import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { loadClassics, validateClassics, classicWarnings, ClassicContentError } from '../src/lib/classics.ts';
import { crossTypeDuplicateIds } from '../src/lib/validation.ts';

const source = 'content/classics/gift.json';
const base = () => ({
  id: 'gift', title: '禮物', titleEn: 'The Gift', stage: 'L1', origin: 'rewrite', rewrittenAt: '2026-10-16',
  sourceWork: { author: 'O. Henry', title: 'The Gift of the Magi', published: 1905,
    gutenberg: { ebook: 7256, url: 'https://www.gutenberg.org/ebooks/7256', accessedAt: '2026-10-16' } },
  parts: [1, 2].map((n) => ({ title: `Part ${n}`, intro: '閱讀前先想想。', paragraphs: ['Della found a gift. Jim smiled.'],
    annotations: [{ english: 'gift', translation: '禮物' }], questions: [{ question: '誰找到了禮物？', answer: 'Della。' }, { question: '誰笑了？', answer: 'Jim。' }],
    ...(n === 2 ? { wholeQuestions: [{ question: '故事說了什麼？', answer: '送禮的心意。' }] } : {}) })),
});
const issues = (data) => { try { validateClassics([{ source, data }]); return []; } catch (error) { assert.ok(error instanceof ClassicContentError); return error.issues; } };
const rejects = (change, path) => { const data = base(); change(data); assert.ok(issues(data).some((item) => item.includes(path)), `${path}: ${issues(data).join('\n')}`); };

test('a valid rewrite loads and word range only warns', () => {
  assert.equal(validateClassics([{ source, data: base() }])[0].parts.length, 2);
  assert.equal(classicWarnings(base()).length, 2);
});
test('classic schema rejects unknown fields and invalid source or origin', () => {
  rejects((item) => { item.typo = true; }, 'typo');
  rejects((item) => { item.sourceWork.gutenberg.typo = true; }, 'gutenberg.typo');
  rejects((item) => { item.sourceWork.author = ''; }, 'sourceWork.author');
  rejects((item) => { delete item.sourceWork.title; }, 'sourceWork.title');
  rejects((item) => { delete item.sourceWork.published; }, 'sourceWork.published');
  rejects((item) => { delete item.sourceWork.gutenberg.ebook; }, 'gutenberg.ebook');
  rejects((item) => { delete item.sourceWork.gutenberg.accessedAt; }, 'gutenberg.accessedAt');
  rejects((item) => { item.sourceWork.gutenberg.url = 'http://example.org'; }, 'gutenberg.url');
  rejects((item) => { item.sourceWork.gutenberg.accessedAt = '2026-02-30'; }, 'accessedAt');
  rejects((item) => { delete item.rewrittenAt; }, 'rewrittenAt');
  rejects((item) => { item.stage = 'L3'; }, 'origin');
  rejects((item) => { item.stage = 'L3'; item.origin = 'original'; }, 'rewrittenAt');
  rejects((item) => { item.stage = 'L2'; item.origin = 'original'; delete item.rewrittenAt; }, 'origin');
  rejects((item) => { item.stage = 'L4'; }, 'origin');
  rejects((item) => { item.sourceWork.typo = true; }, 'sourceWork.typo');
  rejects((item) => { item.parts[0].typo = true; }, 'parts[0].typo');
  rejects((item) => { item.parts[0].annotations[0].typo = true; }, 'annotations[0].typo');
  rejects((item) => { item.parts[0].questions[0].typo = true; }, 'questions[0].typo');
});
test('L3 and L4 original fixtures pass without rewrittenAt', () => {
  for (const stage of ['L3', 'L4']) {
    const item = base(); item.stage = stage; item.origin = 'original'; delete item.rewrittenAt;
    assert.equal(validateClassics([{ source, data: item }])[0].origin, 'original');
  }
});
test('parts, annotations and questions follow their bounds and placement', () => {
  rejects((item) => { item.parts = item.parts.slice(0, 1); }, 'parts');
  rejects((item) => { item.parts = Array(9).fill(item.parts[0]); }, 'parts');
  rejects((item) => { item.parts[0].questions.pop(); }, 'questions');
  rejects((item) => { item.parts[0].questions = Array(4).fill(item.parts[0].questions[0]); }, 'questions');
  rejects((item) => { item.parts[0].wholeQuestions = []; }, 'wholeQuestions');
  rejects((item) => { delete item.parts[1].wholeQuestions; }, 'wholeQuestions');
  rejects((item) => { item.parts[1].wholeQuestions = []; }, 'wholeQuestions');
  rejects((item) => { item.parts[1].wholeQuestions = Array(3).fill(item.parts[1].wholeQuestions[0]); }, 'wholeQuestions');
  rejects((item) => { item.parts[0].wholeQuestions = undefined; }, 'wholeQuestions');
  rejects((item) => { item.parts[0].annotations[0].english = 'missing'; }, 'annotations[0].english');
  rejects((item) => { item.parts[0].annotations = Array(13).fill(item.parts[0].annotations[0]); }, 'annotations');
});
test('same source work and stage cannot duplicate; IDs cannot collide across types', () => {
  const another = base(); another.id = 'gift-two';
  assert.ok(issues(base()).length === 0);
  assert.throws(() => validateClassics([{ source, data: base() }, { source: 'other.json', data: another }]), /same source work and stage/);
  assert.equal(crossTypeDuplicateIds([{ id: 'gift', source: 's' }], [], [], [{ id: 'gift', source }]).length, 1);
  assert.equal(crossTypeDuplicateIds([], [], [{ id: 'gift', source: 'w' }], [{ id: 'gift', source }]).length, 1);
});
test('all six initial classics pass the same validation', () => {
  const classics = loadClassics();
  for (const id of ['gift-of-the-magi-l1', 'gift-of-the-magi-l3', 'happy-prince-l1', 'happy-prince-l3', 'monkeys-paw-l2', 'scandal-in-bohemia-l4']) {
    assert.ok(classics.some((classic) => classic.id === id), `missing initial classic: ${id}`);
  }
});
test('the normal build rejects a classic ID already used by any other content type', () => {
  const project = process.cwd();
  const root = mkdtempSync(join(tmpdir(), 'carlenglish-classic-collision-'));
  try {
    cpSync(join(project, 'content'), join(root, 'content'), { recursive: true });
    cpSync(join(project, 'package.json'), join(root, 'package.json'));
    cpSync(join(project, 'pnpm-lock.yaml'), join(root, 'pnpm-lock.yaml'));
    cpSync(join(project, 'pnpm-workspace.yaml'), join(root, 'pnpm-workspace.yaml'));
    for (const name of ['node_modules', 'scripts', 'src', 'public']) symlinkSync(join(project, name), join(root, name));
    const classicPath = join(root, 'content/classics/gift-of-the-magi-l1.json');
    const original = JSON.parse(readFileSync(classicPath, 'utf8'));
    for (const id of ['cafe-breakfast', 'daily-standup-sync', 'ngsl-spoken']) {
      writeFileSync(classicPath, JSON.stringify({ ...original, id }));
      const result = spawnSync('pnpm', ['run', 'build'], { cwd: root, encoding: 'utf8', timeout: 20_000 });
      assert.notEqual(result.status, 0, `build unexpectedly accepted ${id}`);
      assert.match(`${result.stdout}\n${result.stderr}`, new RegExp(`duplicate ID "${id}"`));
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
