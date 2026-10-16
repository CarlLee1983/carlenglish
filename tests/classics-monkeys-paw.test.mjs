import assert from 'node:assert/strict';
import test from 'node:test';
import { classicWarnings, loadClassics } from '../src/lib/classics.ts';

test('the published Monkey’s Paw L2 reading is complete and within its teaching range', () => {
  const classic = loadClassics().find((item) => item.id === 'monkeys-paw-l2');
  assert.ok(classic, 'the L2 reading is published');
  assert.equal(classic.stage, 'L2');
  assert.equal(classic.origin, 'rewrite');
  assert.deepEqual([classic.sourceWork.author, classic.sourceWork.title, classic.sourceWork.published, classic.sourceWork.gutenberg.ebook],
    ['W. W. Jacobs', 'The Monkey’s Paw', 1902, 12122]);
  assert.equal(classic.parts.length, 6);
  for (const [index, part] of classic.parts.entries()) {
    const words = part.paragraphs.join(' ').split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
    assert.ok(words >= 300 && words <= 500, `part ${index + 1}: ${words} words`);
    assert.match(part.intro, /[\p{Script=Han}]/u);
    assert.ok(part.annotations.length <= 12);
    assert.ok(part.questions.length >= 2 && part.questions.length <= 3);
  }
  assert.equal(classic.parts.at(-1).wholeQuestions.length, 2);
  assert.deepEqual(classicWarnings(classic), []);
  const story = classic.parts.flatMap((part) => part.paragraphs).join(' ');
  assert.match(story, /two hundred pounds/i);
  assert.match(story, /machinery/i);
  assert.match(story, /I wish my son alive again/i);
  assert.match(story, /third (?:and last )?wish/i);
  assert.match(story, /empty road|deserted road/i);
});
