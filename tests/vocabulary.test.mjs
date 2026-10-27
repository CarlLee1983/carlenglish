import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadVocabularyCatalog, validateVocabularyBanks, VocabularyError } from '../src/lib/vocabulary.ts';
import { loadWordListsOnce } from '../src/lib/wordlists.ts';

const entry = (id, english, meaning) => ({ id, english, meaning, example: `${english} example`, rank: 1, audio: { src: `/audio/wordlists/base/${id}.mp3` } });
const list = { id: 'base', name: '來源詞表', description: 'test', excluded: [],
  source: { name: 'Original list', authors: 'Authors', url: 'https://example.com/list', adaptation: 'Local examples' },
  license: { name: 'CC BY-SA 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/' },
  entries: [entry('apple', 'apple', '蘋果'), entry('budget', 'budget', '預算'), entry('ethics', 'ethics', '倫理')] };
const manifest = () => ({ version: 1, banks: ['beginner', 'intermediate', 'advanced'].map((level, index) => ({
  level, description: `${level} vocabulary`, criteria: `${level} editorial criteria`,
  entries: [{ wordListId: 'base', entryId: list.entries[index].id }],
})) });

function rejects(change, pattern) {
  const data = manifest();
  change(data);
  assert.throws(() => validateVocabularyBanks(data, [list]), (error) => error instanceof VocabularyError && pattern.test(error.message));
}

test('independent banks preserve content and attribution as a unit without mutating input', () => {
  const data = manifest();
  const before = structuredClone({ data, list });
  data.banks.reverse();
  const banks = validateVocabularyBanks(data, [list]);
  assert.deepEqual(banks.map(({ level }) => level.id), ['beginner', 'intermediate', 'advanced']);
  const word = banks[0].entries[0];
  assert.deepEqual(word, { key: 'base/apple', english: 'apple', meaning: '蘋果', example: 'apple example', audioSrc: '/audio/wordlists/base/apple.mp3',
    source: { id: 'base', title: '來源詞表', href: '#source-base' } });
  assert.deepEqual(banks[0].sources[0], { id: list.id, name: list.name, source: list.source, license: list.license });
  assert.deepEqual(list, before.list);
  assert.deepEqual(data.banks, before.data.banks.toReversed());
});

test('banks sort alphabetically without using the manifest order or source frequency ranks', () => {
  const data = manifest();
  const extra = entry('bag', 'bag', '袋子');
  const source = { ...list, entries: [...list.entries, extra] };
  data.banks[0].entries = [{ wordListId: 'base', entryId: 'bag' }, ...data.banks[0].entries];
  const words = validateVocabularyBanks(data, [source])[0].entries;
  assert.deepEqual(words.map(({ english }) => english), ['apple', 'bag']);
});

test('rejects unknown schema, fields, levels, missing levels and empty published banks', () => {
  rejects((data) => { data.version = 2; }, /version/);
  rejects((data) => { data.unexpected = true; }, /unexpected field/);
  rejects((data) => { data.banks[0].level = 'expert'; }, /unsupported vocabulary level/);
  rejects((data) => { data.banks.pop(); }, /missing level/);
  rejects((data) => { data.banks[1].level = 'beginner'; }, /duplicate level/);
  rejects((data) => { data.banks[0].criteria = ''; }, /criteria/);
  rejects((data) => { data.banks[0].entries = []; }, /must not be empty/);
  rejects((data) => { data.banks[0].entries = null; }, /expected an array/);
});

test('rejects malformed and dangling references and repeated assignments across banks', () => {
  rejects((data) => { data.banks[0].entries[0].wordListId = 'missing'; }, /unknown wordlist entry/);
  rejects((data) => { data.banks[0].entries[0].entryId = 'missing'; }, /unknown wordlist entry/);
  rejects((data) => { data.banks[0].entries[0].entryId = '../apple'; }, /lowercase hyphenated ID/);
  rejects((data) => { data.banks[0].entries[0].rank = 1; }, /unexpected field/);
  rejects((data) => { data.banks[1].entries.push(data.banks[0].entries[0]); }, /duplicate assignment/);
  const duplicate = { ...list, id: 'other', entries: [entry('another-apple', ' APPLE ', ' 蘋果 ')] };
  const data = manifest();
  data.banks[1].entries.push({ wordListId: 'other', entryId: 'another-apple' });
  assert.throws(() => validateVocabularyBanks(data, [list, duplicate]), /duplicate word and meaning/);
});

test('loader reports missing or malformed files without falling back to scenes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'carlenglish-vocabulary-'));
  try {
    const file = join(dir, 'banks.json');
    assert.throws(() => loadVocabularyCatalog({ file, wordLists: [list] }), /cannot read or parse/);
    writeFileSync(file, '{broken json');
    assert.throws(() => loadVocabularyCatalog({ file, wordLists: [list] }), /cannot read or parse/);
    writeFileSync(file, JSON.stringify(manifest()));
    assert.equal(loadVocabularyCatalog({ file, wordLists: [list] }).length, 3);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('production banks contain fifty independently assigned words each with original examples, audio and license', () => {
  const banks = loadVocabularyCatalog();
  const lists = loadWordListsOnce();
  const words = new Set();
  assert.deepEqual(banks.map(({ entries }) => entries.length), [50, 50, 50]);
  for (const bank of banks) {
    for (const word of bank.entries) {
      const [listId, entryId] = word.key.split('/');
      const original = lists.find(({ id }) => id === listId).entries.find(({ id }) => id === entryId);
      assert.equal(word.english, original.english);
      assert.equal(word.meaning, original.meaning);
      assert.equal(word.example, original.example);
      assert.equal(word.audioSrc, original.audio.src);
      const normalized = word.english.trim().toLowerCase();
      assert.ok(!words.has(normalized), `duplicate headword ${normalized}`);
      words.add(normalized);
    }
    assert.ok(bank.sources.every(({ license }) => license.name === 'CC BY-SA 4.0'));
  }
  assert.deepEqual(readFileSync('content/vocabulary/LICENSE'), readFileSync('content/wordlists/ngsl-spoken/LICENSE'));
});
