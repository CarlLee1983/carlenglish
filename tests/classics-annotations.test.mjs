import assert from 'node:assert/strict';
import test from 'node:test';
import { ClassicContentError, validateClassics } from '../src/lib/classics.ts';

const source = 'content/classics/annotation-fixture.json';
const fixture = () => ({
  id: 'annotation-fixture', title: '註釋範例', titleEn: 'Annotation example', stage: 'L1', origin: 'rewrite', rewrittenAt: '2026-10-16',
  sourceWork: { author: 'O. Henry', title: 'Annotation example', published: 1905, gutenberg: { ebook: 7256, url: 'https://www.gutenberg.org/ebooks/7256', accessedAt: '2026-10-16' } },
  parts: [0, 1].map((index) => ({
    title: `Part ${index + 1}`, intro: '閱讀前先想想。', paragraphs: ["Della's watch (old) was precious. She loved it."],
    annotations: [{ english: 'watch (old)', translation: '舊錶' }],
    questions: [{ question: '誰有手錶？', answer: 'Della。' }, { question: '手錶如何？', answer: '珍貴。' }],
    ...(index === 1 ? { wholeQuestions: [{ question: '故事說了什麼？', answer: '送禮的心意。' }] } : {}),
  })),
});

test('annotation validation accepts punctuation in a term found in a sentence', () => {
  assert.equal(validateClassics([{ source, data: fixture() }])[0].parts[0].annotations[0].english, 'watch (old)');
});

test('annotation validation rejects terms absent from the part and more than twelve entries', () => {
  const missing = fixture();
  missing.parts[0].annotations[0].english = 'missing';
  assert.throws(() => validateClassics([{ source, data: missing }]), (error) => error instanceof ClassicContentError && error.issues.some((issue) => issue.includes('parts[0].annotations[0].english')));

  const tooMany = fixture();
  tooMany.parts[0].annotations = Array(13).fill(tooMany.parts[0].annotations[0]);
  assert.throws(() => validateClassics([{ source, data: tooMany }]), (error) => error instanceof ClassicContentError && error.issues.some((issue) => issue.includes('parts[0].annotations')));
});

test('annotation validation rejects a term spanning two sentences', () => {
  const data = fixture();
  data.parts[0].annotations[0].english = 'precious. She';
  assert.throws(() => validateClassics([{ source, data }]), (error) => error instanceof ClassicContentError && error.issues.some((issue) => issue.includes('parts[0].annotations[0].english')));
});
