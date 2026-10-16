import assert from 'node:assert/strict';
import test from 'node:test';
import { classicWarnings, loadClassics } from '../src/lib/classics.ts';

test('the complete eight-part Scandal in Bohemia original is published for L4', () => {
  const classic = loadClassics().find((item) => item.id === 'scandal-in-bohemia-l4');
  assert.ok(classic, 'the L4 original is published');
  assert.deepEqual([classic.stage, classic.origin], ['L4', 'original']);
  assert.deepEqual(classic.sourceWork, {
    author: 'Arthur Conan Doyle', title: 'A Scandal in Bohemia', published: 1891,
    gutenberg: { ebook: 1661, url: 'https://www.gutenberg.org/ebooks/1661', accessedAt: '2026-10-16' },
  });
  assert.deepEqual(classic.parts.map((part) => part.paragraphs.length), [14, 31, 60, 28, 29, 30, 27, 40]);
  assert.deepEqual([classic.parts[0].paragraphs[0], classic.parts[3].paragraphs[16], classic.parts[6].paragraphs[25]], ['I.', 'II.', 'III.']);
  assert.equal(classic.parts.at(-1).paragraphs.at(-1).startsWith('And that was how a great scandal'), true);
  for (const [index, part] of classic.parts.entries()) {
    const words = part.paragraphs.join(' ').split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
    assert.ok(words >= 600 && words <= 1200, `part ${index + 1}: ${words} words`);
    assert.match(part.intro, /[\p{Script=Han}]/u);
    assert.ok(part.annotations.length >= 1 && part.annotations.length <= 12);
    assert.ok(part.questions.length >= 2 && part.questions.length <= 3);
  }
  assert.equal(classic.parts.at(-1).wholeQuestions.length, 2);
  assert.deepEqual(classicWarnings(classic), []);
  assert.match(classic.parts.at(-1).paragraphs.find((paragraph) => paragraph.startsWith('“MY DEAR MR. SHERLOCK HOLMES')), /\n/);
});
