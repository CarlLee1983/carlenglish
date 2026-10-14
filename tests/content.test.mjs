import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { ContentError, getScene, loadScenes, validateScenes } from '../src/lib/scenes.ts';
import { canonicalStoryText, textSha256 } from '../src/lib/audio-text.ts';

const audioBytes = Buffer.from('nonempty audio fixture');
const fileSha256 = createHash('sha256').update(audioBytes).digest('hex');
const profile = () => ({
  id: 'one-us-female', label: 'One US female voice', kind: 'synthetic', accent: 'US English',
  provider: 'Example Provider', voice: 'Example Voice', libraryVersion: '1.0.0',
  modelRevision: 'a'.repeat(40), modelSha256: 'b'.repeat(64), voiceSha256: 'c'.repeat(64),
  sourceUrl: 'https://example.org/model', modelLicenseName: 'Example License',
  modelLicenseUrl: 'https://example.org/license', sampleRate: 24000, speed: 1,
});
const clip = (category, text) => ({
  src: `/audio/${category}/sample.mp3`, voiceId: 'one-us-female',
  textSha256: textSha256(text), sha256: fileSha256,
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'scene content '));
  const contentDir = join(root, 'content', 'scenes');
  const publicDir = join(root, 'public');
  mkdirSync(contentDir, { recursive: true });
  mkdirSync(join(publicDir, 'images', 'scenes'), { recursive: true });
  mkdirSync(join(root, 'content', 'audio'), { recursive: true });
  writeFileSync(join(root, 'content', 'audio', 'voice-profile.json'), JSON.stringify(profile()));
  writeFileSync(join(publicDir, 'images', 'scenes', 'cafe.webp'), 'image');
  for (const category of ['words', 'phrases', 'stories']) {
    mkdirSync(join(publicDir, 'audio', category), { recursive: true });
    writeFileSync(join(publicDir, 'audio', category, 'sample.mp3'), audioBytes);
  }
  return { root, contentDir, publicDir };
}

function scene(id = 'cafe-breakfast') {
  const phrases = Array.from({ length: 4 }, (_, i) => ({
    id: `phrase-${i + 1}`, english: `Phrase ${i + 1}`, translation: `短句 ${i + 1}`,
    audio: clip('phrases', `Phrase ${i + 1}`),
  }));
  const words = Array.from({ length: 6 }, (_, i) => ({
    id: `word-${i + 1}`, english: `Word ${i + 1}`, translation: `單字 ${i + 1}`, example: `A word ${i + 1}.`,
    audio: clip('words', `Word ${i + 1}`),
  }));
  const sentences = Array.from({ length: 5 }, (_, i) => ({
    segments: [
      { text: 'I ask for ', phraseIds: [`phrase-${(i % 4) + 1}`], wordIds: [`word-${(i % 6) + 1}`] },
      { text: 'coffee.', wordIds: [`word-${((i + 1) % 6) + 1}`] },
    ],
    translation: `我點了咖啡 ${i + 1}。`,
  }));
  return {
    id, title: '咖啡店買早餐', titleEn: 'Breakfast at a café', category: 'Food', level: 'Beginner',
    image: { src: '/images/scenes/cafe.webp', alt: 'A customer ordering breakfast', width: 1200, height: 800 },
    sentences,
    audio: clip('stories', canonicalStoryText(sentences)),
    phrases, words,
  };
}

function withFixture(run) {
  const dirs = fixture();
  try { run(dirs); } finally { rmSync(dirs.root, { recursive: true, force: true }); }
}

function expectIssue(data, publicDir, path, extra = [], voice = profile()) {
  assert.throws(
    () => validateScenes([{ source: 'sample.json', data }, ...extra], publicDir, voice),
    (error) => error instanceof ContentError && error.issues.some((issue) => issue.includes(path)),
    `Expected a content error at ${path}`,
  );
}

test('every discovered official scene passes full validation and retains the original stable routes', () => {
  const contentDir = join(process.cwd(), 'content/scenes');
  const files = readdirSync(contentDir).filter((name) => name.endsWith('.json')).sort();
  const expectedIds = files.map((name) => JSON.parse(readFileSync(join(contentDir, name), 'utf8')).id);
  const scenes = loadScenes();
  assert.deepEqual(scenes.map(({ id }) => id), expectedIds);
  for (const id of ['cafe-breakfast', 'school-greeting', 'supermarket-shopping', 'street-directions']) {
    assert.ok(getScene(id, scenes), `original scene ${id} must remain available`);
  }
  for (const scene of scenes) {
    assert.strictEqual(getScene(scene.id, scenes), scene);
    assert.strictEqual(scene.voiceProfile, scenes[0].voiceProfile);
  }
});

test('valid overlapping and repeated annotations preserve segment text and resolve both item types', () => withFixture(({ publicDir }) => {
  const data = scene();
  data.words[0].id = data.phrases[0].id;
  data.sentences[0].segments[0].wordIds = [data.words[0].id];
  data.sentences[0].segments.push({ text: ' Again!', phraseIds: [data.phrases[0].id], wordIds: [data.words[0].id] });
  data.audio.textSha256 = textSha256(canonicalStoryText(data.sentences));
  const [result] = validateScenes([{ source: 'sample.json', data }], publicDir, profile());
  assert.equal(result.sentences[0].segments.map((segment) => segment.text).join(''), 'I ask for coffee. Again!');
  assert.deepEqual(result.sentences[0].segments[0].phraseIds, ['phrase-1']);
  assert.deepEqual(result.sentences[0].segments[0].wordIds, ['phrase-1']);
  assert.deepEqual(result.sentences[0].segments[2].phraseIds, ['phrase-1']);
  assert.deepEqual(result.words[0].audio, data.words[0].audio);
}));

test('requires clips on words, phrases, and stories and preserves one shared voice profile', () => withFixture(({ publicDir }) => {
  const valid = scene();
  const [result] = validateScenes([{ source: 'sample.json', data: valid }], publicDir, profile());
  assert.deepEqual(result.words.map((word) => word.audio), valid.words.map((word) => word.audio));
  assert.deepEqual(result.phrases.map((phrase) => phrase.audio), valid.phrases.map((phrase) => phrase.audio));
  assert.deepEqual(result.audio, valid.audio);
  assert.deepEqual(result.voiceProfile, profile());
  for (const location of ['word', 'phrase', 'story']) {
    const data = scene();
    if (location === 'word') delete data.words[0].audio;
    if (location === 'phrase') delete data.phrases[0].audio;
    if (location === 'story') delete data.audio;
    expectIssue(data, publicDir, location === 'story' ? 'sample.json.audio' : location === 'word' ? 'words[0].audio' : 'phrases[0].audio');
  }
  for (const field of ['src', 'voiceId', 'textSha256', 'sha256']) {
    const data = scene();
    data.words[0].audio[field] = ' ';
    expectIssue(data, publicDir, `words[0].audio.${field}`);
  }
}));

test('clips reject extra fields at story, phrase, and word locations', () => withFixture(({ publicDir }) => {
  for (const location of ['story', 'phrase', 'word']) {
    const data = scene();
    const target = location === 'story' ? data.audio : location === 'phrase' ? data.phrases[0].audio : data.words[0].audio;
    target.licenseName = 'old clip attribution';
    const path = location === 'story' ? 'sample.json.audio.licenseName'
      : location === 'phrase' ? 'phrases[0].audio.licenseName' : 'words[0].audio.licenseName';
    expectIssue(data, publicDir, path);
  }
}));

test('requires a complete valid voice profile and HTTPS attribution URLs', () => withFixture(({ publicDir }) => {
  assert.throws(() => validateScenes([{ source: 'sample.json', data: scene() }], publicDir, undefined),
    (error) => error instanceof ContentError && error.issues.some((issue) => issue.includes('voice-profile.json')));
  for (const field of ['sourceUrl', 'modelLicenseUrl']) {
    for (const invalid of ['http://example.org/file', 'https://', 'https://user:pass@example.org/file', '/relative', 'https://example.org/file ']) {
      const voice = profile();
      voice[field] = invalid;
      expectIssue(scene(), publicDir, `voice-profile.json.${field}`, [], voice);
    }
  }
  for (const field of ['id', 'label', 'kind', 'accent', 'provider', 'voice', 'libraryVersion', 'modelRevision', 'modelSha256', 'voiceSha256', 'modelLicenseName', 'sampleRate', 'speed']) {
    const voice = profile();
    voice[field] = field === 'sampleRate' || field === 'speed' ? 0 : ' ';
    expectIssue(scene(), publicDir, `voice-profile.json.${field}`, [], voice);
  }
  const malformed = profile();
  malformed.modelRevision = 'a'.repeat(39);
  malformed.modelSha256 = 'a'.repeat(63);
  malformed.voiceSha256 = 'not-hex';
  malformed.speed = Infinity;
  for (const field of ['modelRevision', 'modelSha256', 'voiceSha256', 'speed']) expectIssue(scene(), publicDir, `voice-profile.json.${field}`, [], malformed);
}));

test('clips require category paths, nonempty files, containment, and matching hashes', () => withFixture(({ root, publicDir }) => {
  for (const invalid of ['https://example.org/sample.mp3', '/audio/words/../outside.mp3', '/images/scenes/cafe.webp', '/audio/words/sample.wav', '/audio/words/missing.mp3']) {
    const data = scene();
    data.words[0].audio.src = invalid;
    expectIssue(data, publicDir, 'words[0].audio.src');
  }
  writeFileSync(join(publicDir, 'audio', 'words', 'empty.mp3'), '');
  const empty = scene();
  empty.words[0].audio.src = '/audio/words/empty.mp3';
  expectIssue(empty, publicDir, 'words[0].audio.src');

  mkdirSync(join(publicDir, 'audio', 'words', 'directory.mp3'));
  const directory = scene();
  directory.words[0].audio.src = '/audio/words/directory.mp3';
  expectIssue(directory, publicDir, 'words[0].audio.src');

  const outside = join(root, 'outside.mp3');
  writeFileSync(outside, 'outside audio');
  symlinkSync(outside, join(publicDir, 'audio', 'words', 'linked.mp3'));
  const linked = scene();
  linked.words[0].audio.src = '/audio/words/linked.mp3';
  expectIssue(linked, publicDir, 'words[0].audio.src');
  const wrongCategory = scene();
  wrongCategory.phrases[0].audio.src = '/audio/words/sample.mp3';
  expectIssue(wrongCategory, publicDir, 'phrases[0].audio.src');
  const wrongStoryCategory = scene();
  wrongStoryCategory.audio.src = '/audio/phrases/sample.mp3';
  expectIssue(wrongStoryCategory, publicDir, 'sample.json.audio.src');
  writeFileSync(join(publicDir, 'audio', 'words', 'sample.mp3'), 'different bytes');
  expectIssue(scene(), publicDir, 'words[0].audio.sha256');
}));

test('stale canonical text and mismatched voice IDs are rejected at all clip levels', () => withFixture(({ publicDir }) => {
  const word = scene();
  word.words[0].english = 'Changed word';
  expectIssue(word, publicDir, 'words[0].audio.textSha256');
  const phrase = scene();
  phrase.phrases[0].english = 'Changed phrase';
  expectIssue(phrase, publicDir, 'phrases[0].audio.textSha256');
  const story = scene();
  story.sentences[0].segments[0].text = 'Changed sentence. ';
  expectIssue(story, publicDir, 'sample.json.audio.textSha256');
  for (const location of ['word', 'phrase', 'story']) {
    const data = scene();
    const target = location === 'word' ? data.words[0].audio : location === 'phrase' ? data.phrases[0].audio : data.audio;
    target.voiceId = 'another-voice';
    expectIssue(data, publicDir, `${location === 'story' ? 'sample.json' : location === 'word' ? 'words[0]' : 'phrases[0]'}.audio.voiceId`);
  }
}));

test('rejects references on whitespace-only segments but permits unannotated spacing', () => withFixture(({ publicDir }) => {
  const invalid = scene();
  invalid.sentences[0].segments.push({ text: ' \t', phraseIds: ['phrase-1'], wordIds: ['word-1'] });
  expectIssue(invalid, publicDir, 'sentences[0].segments[2].text');

  const valid = scene();
  valid.sentences[0].segments.splice(1, 0, { text: ' ' });
  valid.audio.textSha256 = textSha256(canonicalStoryText(valid.sentences));
  const [result] = validateScenes([{ source: 'sample.json', data: valid }], publicDir, profile());
  assert.equal(result.sentences[0].segments.map(({ text }) => text).join(''), 'I ask for  coffee.');
}));

test('reports missing text fields, translations, image metadata, and whitespace-only sentences', () => withFixture(({ publicDir }) => {
  const data = scene();
  data.title = ' ';
  delete data.sentences[0].translation;
  data.sentences[1].segments = [{ text: '   ' }];
  delete data.image.width;
  assert.throws(() => validateScenes([{ source: 'sample.json', data }], publicDir, profile()), (error) => {
    assert.ok(error instanceof ContentError);
    for (const path of ['sample.json.title', 'sample.json.sentences[0].translation', 'sample.json.sentences[1].segments', 'sample.json.image.width']) {
      assert.ok(error.issues.some((issue) => issue.includes(path)), path);
    }
    return true;
  });
}));

test('checks image existence, supported path, dimensions, and item counts', () => withFixture(({ root, publicDir }) => {
  const missing = scene();
  missing.image.src = '/images/scenes/missing.webp';
  expectIssue(missing, publicDir, 'image.src');
  const escape = scene();
  escape.image.src = '/images/scenes/../outside.png';
  expectIssue(escape, publicDir, 'image.src');
  const outside = join(root, 'outside.webp');
  writeFileSync(outside, 'image');
  symlinkSync(outside, join(publicDir, 'images', 'scenes', 'linked.webp'));
  const linked = scene();
  linked.image.src = '/images/scenes/linked.webp';
  expectIssue(linked, publicDir, 'image.src');
  const dimensions = scene();
  dimensions.image.height = 0;
  expectIssue(dimensions, publicDir, 'image.height');
  const counts = scene();
  counts.sentences.pop();
  counts.phrases.pop();
  counts.words.pop();
  for (const path of ['sentences', 'phrases', 'words']) expectIssue(counts, publicDir, path);
}));

test('accepts maximum-length scenes while rejecting any larger story or learning list', () => withFixture(({ publicDir }) => {
  const data = scene();
  while (data.phrases.length < 6) {
    const n = data.phrases.length + 1;
    data.phrases.push({ id: `phrase-${n}`, english: `Phrase ${n}`, translation: `短句 ${n}`, audio: clip('phrases', `Phrase ${n}`) });
  }
  while (data.words.length < 8) {
    const n = data.words.length + 1;
    data.words.push({ id: `word-${n}`, english: `Word ${n}`, translation: `單字 ${n}`, example: `A word ${n}.`, audio: clip('words', `Word ${n}`) });
  }
  data.sentences = data.words.map((word, i) => {
    const phrase = data.phrases[i % data.phrases.length];
    return {
      segments: [{ text: `${phrase.english} includes ${word.english}.`, phraseIds: [phrase.id], wordIds: [word.id] }],
      translation: `第 ${i + 1} 句翻譯。`,
    };
  });
  data.audio.textSha256 = textSha256(canonicalStoryText(data.sentences));
  const [result] = validateScenes([{ source: 'sample.json', data }], publicDir, profile());
  assert.deepEqual([result.sentences.length, result.phrases.length, result.words.length], [8, 6, 8]);
  for (const [field, range] of [['sentences', '5–8'], ['phrases', '4–6'], ['words', '6–8']]) {
    const invalid = structuredClone(data);
    invalid[field].push(structuredClone(invalid[field][0]));
    invalid.audio.textSha256 = textSha256(canonicalStoryText(invalid.sentences));
    assert.throws(() => validateScenes([{ source: 'sample.json', data: invalid }], publicDir, profile()),
      (error) => error instanceof ContentError && error.issues.includes(`sample.json.${field}: expected ${range} items, found ${invalid[field].length}`));
  }
}));

test('rejects duplicate IDs, dangling references, and unreferenced items with precise paths', () => withFixture(({ publicDir }) => {
  const duplicate = scene();
  duplicate.phrases[1].id = duplicate.phrases[0].id;
  expectIssue(duplicate, publicDir, 'phrases[1].id');
  const duplicateWord = scene();
  duplicateWord.words[1].id = duplicateWord.words[0].id;
  expectIssue(duplicateWord, publicDir, 'words[1].id');
  const duplicateScene = scene('cafe-breakfast');
  expectIssue(scene(), publicDir, 'other.json.id', [{ source: 'other.json', data: duplicateScene }]);
  const dangling = scene();
  dangling.sentences[0].segments[0].phraseIds = ['unknown'];
  expectIssue(dangling, publicDir, 'sentences[0].segments[0].phraseIds');
  const unreferenced = scene();
  unreferenced.phrases[0].id = 'unused-phrase';
  expectIssue(unreferenced, publicDir, 'phrases[0].id');
  const unreferencedWord = scene();
  unreferencedWord.words[0].id = 'unused-word';
  expectIssue(unreferencedWord, publicDir, 'words[0].id');
}));

test('discovers sorted JSON files and retrieves only the requested stable scene ID', () => withFixture(({ contentDir, publicDir }) => {
  writeFileSync(join(contentDir, 'z.json'), JSON.stringify(scene('street-directions')));
  writeFileSync(join(contentDir, 'a.json'), JSON.stringify(scene('cafe-breakfast')));
  writeFileSync(join(contentDir, 'notes.txt'), 'ignored');
  const scenes = loadScenes({ contentDir, publicDir });
  assert.deepEqual(scenes.map(({ id }) => id), ['cafe-breakfast', 'street-directions']);
  assert.strictEqual(scenes[0].voiceProfile, scenes[1].voiceProfile);
  assert.equal(getScene('street-directions', scenes)?.titleEn, 'Breakfast at a café');
  assert.equal(getScene('unknown', scenes), undefined);
}));

test('loader locates the required profile beside scenes and rejects missing or malformed JSON', () => withFixture(({ contentDir, publicDir }) => {
  writeFileSync(join(contentDir, 'cafe.json'), JSON.stringify(scene()));
  const profilePath = join(contentDir, '..', 'audio', 'voice-profile.json');
  unlinkSync(profilePath);
  assert.throws(() => loadScenes({ contentDir, publicDir }),
    (error) => error instanceof ContentError && error.message.includes(profilePath));
  writeFileSync(profilePath, '{');
  assert.throws(() => loadScenes({ contentDir, publicDir }),
    (error) => error instanceof ContentError && error.message.includes(profilePath));
  writeFileSync(profilePath, JSON.stringify({ ...profile(), kind: 'human' }));
  assert.throws(() => loadScenes({ contentDir, publicDir }),
    (error) => error instanceof ContentError && error.issues.some((issue) => issue.includes(`${profilePath}.kind`)));
}));

test('missing, empty, and malformed content directories fail with source locations', () => withFixture(({ root, contentDir, publicDir }) => {
  assert.throws(() => loadScenes({ contentDir: join(root, 'missing'), publicDir }), ContentError);
  assert.throws(() => loadScenes({ contentDir, publicDir }), ContentError);
  writeFileSync(join(contentDir, 'bad.json'), '{');
  assert.throws(() => loadScenes({ contentDir, publicDir }), (error) => error instanceof ContentError && error.message.includes('bad.json'));
}));
