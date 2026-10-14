import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { textSha256 } from '../src/lib/audio-text.ts';

// 只為指定詞表「還沒有音檔、或英文已改動」的詞條合成英文詞的音檔（例句不配音）。
// 場景音檔請用 generate-audio.mjs；它會重產全部場景，不要拿來做詞表。
const [python, modelDirectory, listId] = process.argv.slice(2);
if (!python || !modelDirectory || !listId) throw new Error('Usage: node scripts/generate-wordlist-audio.mjs <isolated-python> <local-model-directory> <word-list-id>');
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
if (!idPattern.test(listId)) throw new Error('Invalid word list ID');
const root = resolve(import.meta.dirname, '..');
const output = join(root, '.scratch/wordlist-audio', listId, 'output');
const listPath = join(root, 'content/wordlists', listId, 'wordlist.json');
const profilePath = join(root, 'content/audio/voice-profile.json');
const profile = JSON.parse(readFileSync(profilePath, 'utf8'));
const readList = () => JSON.parse(readFileSync(listPath, 'utf8'));

const clips = [];
for (const entry of readList().entries) {
  if (!idPattern.test(entry.id)) throw new Error(`Invalid entry ID "${entry.id}"`);
  if (entry.audio && entry.audio.textSha256 === textSha256(entry.english)) continue;
  clips.push({ wordListId: listId, entryId: entry.id, src: `/audio/wordlists/${listId}/${entry.id}.mp3`, text: entry.english, textSha256: textSha256(entry.english) });
}
if (clips.length === 0) {
  console.log('Every entry already has audio for its current English; nothing to generate.');
  process.exit(0);
}
if (new Set(clips.map((clip) => clip.src)).size !== clips.length) throw new Error('Duplicate audio paths');
mkdirSync(output, { recursive: true });
const inputPath = join(output, 'inputs.json');
writeFileSync(inputPath, JSON.stringify({ profile, clips }, null, 2) + '\n');
const result = spawnSync(resolve(python), [join(root, 'scripts/synthesize-audio.py'), inputPath, resolve(modelDirectory), output], {
  stdio: 'inherit', env: { ...process.env, HF_HUB_OFFLINE: '1', HF_HUB_DISABLE_IMPLICIT_TOKEN: '1', PYTHONDONTWRITEBYTECODE: '1' },
});
if (result.error) throw result.error;
if (result.status !== 0) throw new Error(`Synthesis failed (${result.status}); production content was not changed`);
const manifest = JSON.parse(readFileSync(join(output, 'manifest.json'), 'utf8'));
if (JSON.stringify(manifest.profile) !== JSON.stringify(profile) || manifest.clips.length !== clips.length) throw new Error('Unexpected generation manifest');
// Verify the complete batch and re-read current text before replacing any production file.
const list = readList();
for (let i = 0; i < clips.length; i++) {
  const expected = clips[i];
  const generated = manifest.clips[i];
  if (generated.src !== expected.src || generated.textSha256 !== expected.textSha256 || generated.voiceId !== profile.id) throw new Error('Clip manifest mismatch');
  const bytes = readFileSync(join(output, expected.src.slice(1)));
  if (createHash('sha256').update(bytes).digest('hex') !== generated.sha256 || !bytes.length) throw new Error('Generated audio hash mismatch');
  const entry = list.entries.find((candidate) => candidate.id === expected.entryId);
  if (entry?.english !== expected.text) throw new Error('English changed during generation; rerun before applying');
  entry.audio = { src: generated.src, voiceId: generated.voiceId, textSha256: generated.textSha256, sha256: generated.sha256 };
}
if (JSON.stringify(JSON.parse(readFileSync(profilePath, 'utf8'))) !== JSON.stringify(profile)) throw new Error('Voice profile changed during generation');
for (const clip of clips) {
  const target = join(root, 'public', clip.src.slice(1));
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(join(output, clip.src.slice(1)), target);
}
writeFileSync(listPath, JSON.stringify(list, null, 2) + '\n');
console.log(`Applied ${clips.length} clips for ${listId} with voice ${profile.id}.`);
