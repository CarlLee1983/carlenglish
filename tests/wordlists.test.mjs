import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { after } from 'node:test';
import { textSha256 } from '../src/lib/audio-text.ts';
import { WordListError, loadWordLists, toWordListData, validateWordLists } from '../src/lib/wordlists.ts';
import { attributionText, parseWordListData } from '../src/lib/wordlist-data.ts';

const audioBytes = Buffer.from('nonempty audio fixture');
const fileSha256 = createHash('sha256').update(audioBytes).digest('hex');
const profile = () => ({
  id: 'one-us-female', label: 'One US female voice', kind: 'synthetic', accent: 'US English',
  provider: 'Example Provider', voice: 'Example Voice', libraryVersion: '1.0.0',
  modelRevision: 'a'.repeat(40), modelSha256: 'b'.repeat(64), voiceSha256: 'c'.repeat(64),
  sourceUrl: 'https://example.org/model', modelLicenseName: 'Example License',
  modelLicenseUrl: 'https://example.org/license', sampleRate: 24000, speed: 1,
});
const clip = (listId, entryId, english) => ({
  src: `/audio/wordlists/${listId}/${entryId}.mp3`, voiceId: 'one-us-female',
  textSha256: textSha256(english), sha256: fileSha256,
});

const words = [['be', '是、成為'], ['the', '這個、那個'], ['you', '你、你們']];

function list(id = 'sample-list') {
  return {
    id, name: '範例詞表', description: '測試用的詞表。',
    source: { name: 'Sample List 1.0', authors: 'Example, A.', url: 'https://example.org/list', adaptation: '依詞頻排序並加入中文意思。' },
    license: { name: 'CC BY-SA 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/' },
    entries: words.map(([english, meaning], index) => ({
      id: english, rank: index + 1, english, meaning, example: `An example with ${english}.`, audio: clip(id, english, english),
    })),
  };
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'wordlist content '));
  const publicDir = join(root, 'public');
  const contentDir = join(root, 'content', 'wordlists');
  mkdirSync(contentDir, { recursive: true });
  mkdirSync(join(root, 'content', 'audio'), { recursive: true });
  writeFileSync(join(root, 'content', 'audio', 'voice-profile.json'), JSON.stringify(profile()));
  for (const id of ['sample-list', 'other-list']) {
    mkdirSync(join(publicDir, 'audio', 'wordlists', id), { recursive: true });
    for (const [english] of words) writeFileSync(join(publicDir, 'audio', 'wordlists', id, `${english}.mp3`), audioBytes);
  }
  return { root, contentDir, publicDir };
}

function withFixture(run) {
  const dirs = fixture();
  try { run(dirs); } finally { rmSync(dirs.root, { recursive: true, force: true }); }
}

// 驗證會檢查詞表目錄裡的 LICENSE，所以「正常」的詞表檔放在一個真的有 LICENSE 的目錄。
const licensedRoot = mkdtempSync(join(tmpdir(), 'licensed wordlist '));
const at = join(licensedRoot, 'sample-list', 'wordlist.json');
mkdirSync(join(licensedRoot, 'sample-list'));
writeFileSync(join(licensedRoot, 'sample-list', 'LICENSE'), 'Attribution-ShareAlike 4.0 International');
after(() => rmSync(licensedRoot, { recursive: true, force: true }));

function issuesOf(publicDir, ...lists) {
  try {
    validateWordLists(lists.map((data, index) => ({ source: index === 0 ? at : `content/wordlists/${index}/wordlist.json`, data })), publicDir, profile());
  } catch (error) {
    assert.ok(error instanceof WordListError);
    return error.issues;
  }
  return [];
}

function issuesOf2(publicDir, source) {
  try {
    validateWordLists([{ source, data: list() }], publicDir, profile());
  } catch (error) {
    assert.ok(error instanceof WordListError);
    return error.issues;
  }
  return [];
}

function expectIssue(change, fragment) {
  withFixture(({ publicDir }) => {
    const data = list();
    change(data);
    const issues = issuesOf(publicDir, data);
    assert.ok(issues.some((issue) => issue.includes(fragment)), `Expected an issue containing "${fragment}", got:\n${issues.join('\n')}`);
  });
}

test('a complete word list passes validation and keeps entries in rank order', () => {
  withFixture(({ publicDir }) => {
    const [result] = validateWordLists([{ source: at, data: list() }], publicDir, profile());
    assert.equal(result.id, 'sample-list');
    assert.deepEqual(result.entries.map((entry) => [entry.rank, entry.english, entry.meaning]), words.map(([english, meaning], index) => [index + 1, english, meaning]));
    assert.equal(result.entries[0].audio.src, '/audio/wordlists/sample-list/be.mp3');
  });
});

test('missing list fields are reported with their path', () => {
  for (const field of ['id', 'name', 'description', 'source', 'license', 'entries']) {
    expectIssue((data) => { delete data[field]; }, `${at}.${field}`);
  }
  for (const field of ['name', 'authors', 'url', 'adaptation']) {
    expectIssue((data) => { delete data.source[field]; }, `${at}.source.${field}`);
  }
  for (const field of ['name', 'url']) {
    expectIssue((data) => { delete data.license[field]; }, `${at}.license.${field}`);
  }
});

test('source and license links must be HTTPS URLs', () => {
  expectIssue((data) => { data.source.url = 'http://example.org/list'; }, `${at}.source.url`);
  expectIssue((data) => { data.license.url = 'not a url'; }, `${at}.license.url`);
});

test('missing entry fields are reported with their path', () => {
  for (const field of ['id', 'rank', 'english', 'meaning', 'example', 'audio']) {
    expectIssue((data) => { delete data.entries[1][field]; }, `${at}.entries[1].${field}`);
  }
});

test('unexpected fields are rejected so typos do not pass silently', () => {
  expectIssue((data) => { data.entries[0].translation = '是'; }, `${at}.entries[0].translation: unexpected field`);
  expectIssue((data) => { data.licence = 'CC BY-SA 4.0'; }, `${at}.licence: unexpected field`);
  expectIssue((data) => { data.entries[0].audio.extra = 1; }, `${at}.entries[0].audio.extra`);
});

test('frequency ranks must run 1..n without gaps, repeats or reordering', () => {
  expectIssue((data) => { data.entries[2].rank = 4; }, `${at}.entries[2].rank`);
  expectIssue((data) => { data.entries[0].rank = 0; data.entries[1].rank = 1; data.entries[2].rank = 2; }, `${at}.entries[0].rank`);
  expectIssue((data) => { data.entries[1].rank = 1; }, `${at}.entries[1].rank`);
  expectIssue((data) => { data.entries.reverse(); }, `${at}.entries[0].rank`);
  expectIssue((data) => { data.entries[1].rank = 2.5; }, `${at}.entries[1].rank`);
});

const exclusion = (rank, english) => ({ rank, english, reason: '逐字稿標記，不是常用字' });

test('ranks may skip only the ranks the list declares as excluded', () => {
  withFixture(({ publicDir }) => {
    const data = list();
    data.excluded = [exclusion(2, 'um'), exclusion(9, 'cough')];
    data.entries[1].rank = 3;
    data.entries[2].rank = 4;
    assert.deepEqual(issuesOf(publicDir, data), []);
  });
  expectIssue((data) => { data.entries[1].rank = 3; data.entries[2].rank = 4; }, `${at}.entries[1].rank`);
  expectIssue((data) => { data.excluded = [exclusion(2, 'um')]; data.entries[1].rank = 4; data.entries[2].rank = 5; }, `${at}.entries[1].rank`);
});

test('an excluded rank cannot also be an entry, and an excluded word cannot come back under another rank', () => {
  expectIssue((data) => { data.excluded = [exclusion(2, 'um')]; }, `${at}.entries[1].rank`);
  expectIssue((data) => { data.excluded = [exclusion(9, 'THE')]; }, `${at}.excluded[0]: excluded word "THE" is also an entry`);
});

test('excluded words are declared with a rank, the word and a reason', () => {
  for (const field of ['rank', 'english', 'reason']) {
    expectIssue((data) => { data.excluded = [exclusion(9, 'cough')]; delete data.excluded[0][field]; }, `${at}.excluded[0].${field}`);
  }
  expectIssue((data) => { data.excluded = [exclusion(9, 'cough'), exclusion(9, 'er')]; }, `${at}.excluded[1].rank: duplicate`);
  expectIssue((data) => { data.excluded = [exclusion(0, 'cough')]; }, `${at}.excluded[0].rank`);
  expectIssue((data) => { data.excluded = [{ ...exclusion(9, 'cough'), extra: 1 }]; }, `${at}.excluded[0].extra: unexpected field`);
  expectIssue((data) => { data.excluded = 'cough'; }, `${at}.excluded`);
});

test('the same English word and meaning cannot appear twice in one list, after normalizing case and spaces', () => {
  expectIssue((data) => { data.entries[1] = { ...data.entries[1], id: 'be-again', english: ' BE ', meaning: ' 是、成為 ', audio: clip('sample-list', 'be', ' BE ') }; }, `${at}.entries[1]: duplicate card`);
});

test('the same English word with a different meaning is a separate entry', () => {
  withFixture(({ publicDir }) => {
    const data = list();
    data.entries[1] = { ...data.entries[1], id: 'be-two', english: 'be', meaning: '存在', audio: clip('sample-list', 'be', 'be') };
    assert.deepEqual(issuesOf(publicDir, data), []);
  });
});

test('entry IDs must be unique within a list and list IDs unique across lists', () => {
  expectIssue((data) => { data.entries[1].id = 'be'; }, `${at}.entries[1].id: duplicate ID "be"`);
  withFixture(({ publicDir }) => {
    const issues = issuesOf(publicDir, list('sample-list'), list('sample-list'));
    assert.ok(issues.some((issue) => issue.includes('duplicate word list ID "sample-list"')), issues.join('\n'));
  });
});

test('entry IDs must be safe file names because they name the audio file', () => {
  expectIssue((data) => { data.entries[0].id = "o'clock"; }, `${at}.entries[0].id`);
  expectIssue((data) => { data.entries[0].id = 'Be'; }, `${at}.entries[0].id`);
});

test('every entry needs an audio file that exists, is nonempty and matches the recorded hashes', () => {
  expectIssue((data) => { data.entries[0].audio.src = '/audio/wordlists/sample-list/missing.mp3'; }, `${at}.entries[0].audio.src: audio file must be an existing nonempty regular file`);
  expectIssue((data) => { data.entries[0].audio.sha256 = 'f'.repeat(64); }, `${at}.entries[0].audio.sha256: does not match audio file bytes`);
  expectIssue((data) => { data.entries[0].audio.textSha256 = textSha256('something else'); }, `${at}.entries[0].audio.textSha256: does not match canonical English text`);
  expectIssue((data) => { data.entries[0].audio.voiceId = 'someone-else'; }, `${at}.entries[0].audio.voiceId`);
  expectIssue((data) => { data.entries[0].audio.src = '/audio/words/sample.mp3'; }, `${at}.entries[0].audio.src: expected a local /audio/wordlists/ MP3 path`);
  expectIssue((data) => { data.entries[0].audio.src = '/audio/wordlists/../words/x.mp3'; }, `${at}.entries[0].audio.src`);
});

test('changing the English text makes the old audio invalid', () => {
  expectIssue((data) => { data.entries[0].english = 'was'; }, `${at}.entries[0].audio.textSha256: does not match canonical English text`);
});

test('a word list directory without a nonempty LICENSE file is rejected', () => {
  withFixture(({ root, publicDir }) => {
    const directory = join(root, 'content', 'wordlists', 'sample-list');
    mkdirSync(directory, { recursive: true });
    const source = join(directory, 'wordlist.json');
    const check = () => issuesOf2(publicDir, source);
    assert.ok(check().some((issue) => issue.includes(join(directory, 'LICENSE'))), 'missing');
    writeFileSync(join(directory, 'LICENSE'), '');
    assert.ok(check().some((issue) => issue.includes('LICENSE')), 'empty');
    writeFileSync(join(directory, 'LICENSE'), 'Attribution-ShareAlike 4.0 International');
    assert.deepEqual(check(), []);
  });
});

test('a list must have at least one entry', () => {
  expectIssue((data) => { data.entries = []; }, `${at}.entries`);
});

test('the published JSON carries what the review page needs and no audio hashes', () => {
  withFixture(({ publicDir }) => {
    const [result] = validateWordLists([{ source: at, data: list() }], publicDir, profile());
    const published = toWordListData(result);
    assert.deepEqual(published.entries[0], { id: 'be', rank: 1, english: 'be', meaning: '是、成為', example: 'An example with be.', audioSrc: '/audio/wordlists/sample-list/be.mp3' });
    assert.equal(published.license.name, 'CC BY-SA 4.0');
    assert.equal(JSON.stringify(published).includes(fileSha256), false);
    const parsed = parseWordListData(JSON.parse(JSON.stringify(published)), 'sample-list');
    assert.deepEqual(parsed, published);
  });
});

test('the client rejects fetched list data with a wrong shape, unsafe audio paths or unordered ranks', () => {
  withFixture(({ publicDir }) => {
    const [result] = validateWordLists([{ source: at, data: list() }], publicDir, profile());
    const good = toWordListData(result);
    const entry = (change) => ({ ...good, entries: [{ ...good.entries[0], ...change }, ...good.entries.slice(1)] });
    const bad = [
      null, [], { ...good, id: 'other-list' }, { ...good, entries: [] }, { ...good, source: undefined },
      entry({ audioSrc: 'https://evil.example/a.mp3' }), entry({ audioSrc: '//evil.example/a.mp3' }), entry({ meaning: '' }), entry({ rank: '1' }),
      { ...good, entries: [good.entries[1], good.entries[0], good.entries[2]] },
    ];
    for (const value of bad) assert.equal(parseWordListData(value, 'sample-list'), null, JSON.stringify(value)?.slice(0, 80));
  });
});

test('the client also rejects duplicate entry IDs and a license link that is not HTTPS', () => {
  withFixture(({ publicDir }) => {
    const [result] = validateWordLists([{ source: at, data: list() }], publicDir, profile());
    const good = toWordListData(result);
    assert.notEqual(parseWordListData(good, 'sample-list'), null);
    const duplicate = { ...good, entries: [good.entries[0], { ...good.entries[1], id: good.entries[0].id }, good.entries[2]] };
    assert.equal(parseWordListData(duplicate, 'sample-list'), null);
    for (const url of ['http://example.org/license', 'javascript:alert(1)', 'not a url', '//example.org/license']) {
      assert.equal(parseWordListData({ ...good, license: { ...good.license, url } }, 'sample-list'), null, url);
    }
  });
});

test('attribution names the source, its authors and the license', () => {
  withFixture(({ publicDir }) => {
    const [result] = validateWordLists([{ source: at, data: list() }], publicDir, profile());
    assert.equal(attributionText(result), 'Sample List 1.0（Example, A.），CC BY-SA 4.0');
  });
});

test('loadWordLists reads one wordlist.json per directory and reports unreadable files', () => {
  withFixture(({ root, contentDir, publicDir }) => {
    for (const id of ['other-list', 'sample-list']) {
      mkdirSync(join(contentDir, id));
      writeFileSync(join(contentDir, id, 'wordlist.json'), JSON.stringify(list(id)));
      writeFileSync(join(contentDir, id, 'LICENSE'), 'Attribution-ShareAlike 4.0 International');
    }
    assert.deepEqual(loadWordLists({ contentDir, publicDir }).map((entry) => entry.id), ['other-list', 'sample-list']);
    mkdirSync(join(contentDir, 'unlicensed'));
    writeFileSync(join(contentDir, 'unlicensed', 'wordlist.json'), JSON.stringify(list('unlicensed')));
    assert.throws(() => loadWordLists({ contentDir, publicDir }), (error) => error instanceof WordListError && error.issues.some((issue) => issue.includes('unlicensed') && issue.includes('LICENSE')));
    rmSync(join(contentDir, 'unlicensed'), { recursive: true });
    mkdirSync(join(contentDir, 'broken'));
    writeFileSync(join(contentDir, 'broken', 'wordlist.json'), '{oops');
    assert.throws(() => loadWordLists({ contentDir, publicDir }), (error) => error instanceof WordListError && error.issues.some((issue) => issue.includes('broken') && issue.includes('cannot parse JSON')));
    rmSync(join(contentDir, 'broken'), { recursive: true });
    mkdirSync(join(contentDir, 'empty'));
    assert.throws(() => loadWordLists({ contentDir, publicDir }), (error) => error instanceof WordListError && error.issues.some((issue) => issue.includes('empty') && issue.includes('wordlist.json')));
    assert.throws(() => loadWordLists({ contentDir: join(root, 'nope'), publicDir }), WordListError);
  });
});

test('the official NGSL-Spoken list is complete, ordered, attributed and ships its license', () => {
  const lists = loadWordLists();
  const ngsl = lists.find((entry) => entry.id === 'ngsl-spoken');
  assert.ok(ngsl, 'ngsl-spoken must be present');
  assert.equal(ngsl.entries.length, 716);
  assert.deepEqual(ngsl.entries.slice(0, 3).map((entry) => entry.english), ['be', 'the', 'you']);
  assert.equal(ngsl.license.name, 'CC BY-SA 4.0');
  assert.match(ngsl.source.url, /^https:\/\/www\.newgeneralservicelist\.com\//);
  const license = readFileSync(join(process.cwd(), 'content/wordlists/ngsl-spoken/LICENSE'), 'utf8');
  assert.match(license, /Attribution-ShareAlike 4\.0 International/);
  const notice = readFileSync(join(process.cwd(), 'content/wordlists/ngsl-spoken/NOTICE.md'), 'utf8');
  assert.match(notice, /Browne/);
  assert.match(notice, /newgeneralservicelist\.com/);
});

test('the official list leaves out transcript markers and keeps their original ranks, so the 716 entries have gaps', () => {
  const ngsl = loadWordLists().find((entry) => entry.id === 'ngsl-spoken');
  const markers = ['pause', 'unclear', 'laugh', 'laughter', 'cough'];
  const englishWords = ngsl.entries.map((entry) => entry.english.toLowerCase());
  for (const marker of markers) assert.equal(englishWords.includes(marker), false, marker);
  assert.deepEqual(ngsl.excluded.map((item) => [item.rank, item.english]), [[24, 'pause'], [26, 'unclear'], [80, 'laugh'], [131, 'laughter'], [438, 'cough']]);
  const skipped = ngsl.entries.flatMap((entry, index) => (index === 0 ? [] : Array.from({ length: entry.rank - ngsl.entries[index - 1].rank - 1 }, (_, offset) => ngsl.entries[index - 1].rank + offset + 1)));
  assert.deepEqual(skipped, [24, 26, 80, 131, 438]);
  assert.deepEqual(ngsl.entries.slice(-3).map((entry) => [entry.rank, entry.english]), [[719, 'purpose'], [720, 'bus'], [721, 'create']]);
  assert.deepEqual(ngsl.entries.slice(97, 100).map((entry) => [entry.rank, entry.english]), [[101, 'tell'], [102, 'only'], [103, 'should']]);
  assert.match(ngsl.source.adaptation, /逐字稿/);
  assert.match(readFileSync(join(process.cwd(), 'content/wordlists/ngsl-spoken/NOTICE.md'), 'utf8'), /pause.*unclear.*laugh/s);
});

test('corrected meanings: kind is the noun, well is the discourse marker, by marks the agent', () => {
  const ngsl = loadWordLists().find((entry) => entry.id === 'ngsl-spoken');
  const entry = (english) => ngsl.entries.find((candidate) => candidate.english === english);
  assert.equal(entry('kind').meaning, '種類');
  assert.match(entry('kind').example, /kind of/);
  assert.equal(entry('well').meaning, '嗯、這個嘛');
  assert.match(entry('well').example, /^Well,/);
  assert.equal(entry('by').meaning, '被、藉由');
  assert.match(entry('by').example, /written by/);
});

test('official list entries that are also scene words reuse the identical Chinese meaning so their cards merge', () => {
  const ngsl = loadWordLists().find((entry) => entry.id === 'ngsl-spoken');
  const meaningOf = (english) => ngsl.entries.find((entry) => entry.english === english)?.meaning;
  assert.equal(meaningOf('mean'), '意思是、意指');
  assert.equal(meaningOf('time'), '時間');
});
