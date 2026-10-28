import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { grammarLessons, grammarPaths } from '../src/data/grammar.ts';

test('six complete original grammar lessons have unique routes, contexts and reasoned answers', () => {
  assert.equal(grammarLessons.length, 6);
  assert.equal(new Set(grammarPaths).size, 7);
  assert.equal(grammarPaths[0], '/grammar/');
  for (const lesson of grammarLessons) {
    assert.match(lesson.id, /^[a-z]+(?:-[a-z]+)*$/);
    for (const key of ['title', 'category', 'focus', 'rule', 'caution', 'story', 'translation', 'check']) assert.ok(lesson[key].trim(), `${lesson.id} ${key}`);
    assert.ok(lesson.examples.length >= 2 && lesson.examples.length <= 4);
    for (const example of lesson.examples) assert.ok(example.english && example.translation && example.note);
    assert.equal(lesson.questions.length, 3);
    for (const item of lesson.questions) assert.ok(item.question && item.answer);
    assert.ok(lesson.story.split(/\s+/).length >= 25);
    assert.ok(lesson.sources.length >= 1);
    for (const source of lesson.sources) assert.equal(new URL(source.url).protocol, 'https:');
  }
});

test('grammar is independently discoverable, indexed and not a required reading gate', () => {
  const home = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
  assert.ok(home.includes('href="/grammar/"'));
  assert.ok(home.indexOf('id="levels-title"') < home.indexOf('id="grammar-title"'));
  const index = readFileSync(new URL('../src/pages/grammar/index.astro', import.meta.url), 'utf8');
  assert.match(index, /尚未製作課程/);
  assert.match(index, /不必先通關/);
  const sitemap = readFileSync(new URL('../src/pages/sitemap.xml.ts', import.meta.url), 'utf8');
  assert.match(sitemap, /\.\.\.grammarPaths/);
});

test('translations and reference answers remain deliberate disclosures', () => {
  const page = readFileSync(new URL('../src/pages/grammar/[id].astro', import.meta.url), 'utf8');
  for (const attr of ['data-example-help', 'data-translation', 'data-answers', 'data-sources']) assert.ok(page.includes(`<details ${attr}>`));
  assert.doesNotMatch(page, /<details[^>]*\bopen(?:\s|>)/);
  assert.match(page, /lang="en"/);
  assert.match(page, /不是原書節選/);
});


test('grammar browser cases participate in the complete verification suite', () => {
  const config = readFileSync(new URL('../playwright.config.ts', import.meta.url), 'utf8');
  assert.ok(config.includes("'grammar.spec.ts'"));
});
