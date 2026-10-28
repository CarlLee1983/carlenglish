import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { bridgeReadings, princeGoalPaths, princePath } from '../src/data/little-prince-path.ts';

test('the first reading goal has four original readings and five unique indexable paths', () => {
  assert.equal(bridgeReadings.length, 4);
  assert.equal(princeGoalPaths.length, 5);
  assert.equal(new Set(princeGoalPaths).size, 5);
  assert.equal(princeGoalPaths[0], princePath);
  for (const reading of bridgeReadings) {
    assert.match(reading.id, /^[a-z]+(?:-[a-z]+)*$/);
    assert.ok(reading.title && reading.titleEn && reading.focus && reading.connection && reading.check);
    assert.equal(reading.paragraphs.length, reading.translations.length);
    assert.ok(reading.paragraphs.length >= 2);
    const text = reading.paragraphs.join(' ');
    const words = text.split(/\s+/).length;
    assert.ok(words >= 45 && words <= 150, `${reading.id}: ${words} words`);
    assert.equal(reading.words.length, 3);
    for (const word of reading.words) assert.ok(text.toLowerCase().includes(word.english.toLowerCase()));
    assert.equal(reading.questions.length, 3);
    for (const question of reading.questions) assert.ok(question.question.trim() && question.answer.trim());
  }
});

test('entry, sitemap and read-first disclosures use the actual goal paths', () => {
  const home = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
  assert.ok(home.includes(`href="${princePath}"`));
  const sitemap = readFileSync(new URL('../src/pages/sitemap.xml.ts', import.meta.url), 'utf8');
  assert.match(sitemap, /\.\.\.princeGoalPaths/);
  const reader = readFileSync(new URL('../src/pages/goals/little-prince/[id].astro', import.meta.url), 'utf8');
  for (const attribute of ['data-hint', 'data-translation', 'data-answers']) assert.ok(reader.includes(`<details ${attribute}>`));
  assert.doesNotMatch(reader, /<details[^>]*\bopen(?:\s|>)/);
  assert.match(reader, /不是《小王子》的原文、翻譯或改寫/);
});
