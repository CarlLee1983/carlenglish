import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { classicWarnings, loadClassics } from '../src/lib/classics.ts';

test('Happy Prince editions load with complete teaching and original text', () => {
  const classics = loadClassics();
  const l1 = classics.find(({ id }) => id === 'happy-prince-l1');
  const l3 = classics.find(({ id }) => id === 'happy-prince-l3');
  assert.ok(l1);
  assert.ok(l3);
  for (const edition of [l1, l3]) {
    assert.deepEqual(
      [edition.sourceWork.author, edition.sourceWork.title, edition.sourceWork.published],
      ['Oscar Wilde', 'The Happy Prince', 1888],
    );
    assert.ok(edition.parts.every((part) => part.questions.length >= 2 && part.questions.length <= 3));
    assert.ok(edition.parts.every((part) => part.annotations.length <= 12));
    assert.ok(edition.parts.at(-1).wholeQuestions.length >= 1);
  }
  assert.equal(l1.origin, 'rewrite');
  assert.equal(l1.parts.length, 5);
  assert.deepEqual(classicWarnings(l1), []);
  const l1Words = l1.parts.map(({ paragraphs }) => paragraphs.join(' ').split(/\s+/).filter(Boolean).length);
  assert.ok(l1Words.every((count) => count >= 150 && count <= 300), l1Words.join(', '));
  assert.ok(l1Words.reduce((sum, count) => sum + count, 0) >= 900);
  assert.ok(l1Words.reduce((sum, count) => sum + count, 0) <= 1200);

  assert.equal(l3.origin, 'original');
  assert.equal(l3.sourceWork.gutenberg.ebook, 902);
  assert.equal(l3.sourceWork.gutenberg.url, 'https://www.gutenberg.org/ebooks/902');
  assert.equal(l3.sourceWork.gutenberg.accessedAt, '2026-10-16');
  assert.equal(l3.parts.length, 4);
  assert.deepEqual(classicWarnings(l3), []);
  const paragraphs = l3.parts.flatMap((part) => part.paragraphs);
  assert.equal(paragraphs.length, 85);
  assert.equal(paragraphs.join(' ').split(/\s+/).length, 3471);
  assert.equal(createHash('sha256').update(JSON.stringify(paragraphs)).digest('hex'), 'e9f17a230c04afaaf901920c86285cf87b8e84491ba6c88e20fb3a1f09c2813e');
});
