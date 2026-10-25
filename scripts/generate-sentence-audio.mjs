import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { canonicalSentenceText, textSha256 } from '../src/lib/audio-text.ts';

const [python, modelDirectory, ...sceneIds] = process.argv.slice(2);
if (!python || !modelDirectory) throw new Error('Usage: node scripts/generate-sentence-audio.mjs <isolated-python> <local-model-directory> [scene-id ...]');
const root = resolve(import.meta.dirname, '..');
const profilePath = join(root, 'content/audio/voice-profile.json');
const profile = JSON.parse(readFileSync(profilePath, 'utf8'));
const output = join(root, '.scratch/sentence-reading-20261025');
const provenance = join(root, 'docs/audio-generation/sentence-reading-20261025');
const previousPath = join(provenance, 'manifest.json');
const previous = existsSync(previousPath) ? JSON.parse(readFileSync(previousPath, 'utf8')) : null;
const previousClips = new Map(previous && JSON.stringify(previous.profile) === JSON.stringify(profile)
  ? previous.clips.map((clip) => [clip.src, clip]) : []);
const scenes = readdirSync(join(root, 'content/scenes')).filter((name) => name.endsWith('.json')).sort().map((name) => {
  const path = join(root, 'content/scenes', name);
  return { path, data: JSON.parse(readFileSync(path, 'utf8')) };
}).filter(({ data }) => !sceneIds.length || sceneIds.includes(data.id));
if (sceneIds.some((id) => !scenes.some(({ data }) => data.id === id))) throw new Error('Unknown scene ID');
const clips = scenes.flatMap(({ data }) => {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.id)) throw new Error('Invalid scene ID');
  return data.sentences.map((sentence, index) => {
    const text = canonicalSentenceText(sentence);
    if (!text.trim()) throw new Error('Empty sentence');
    return { sceneId: data.id, sentenceIndex: index, src: `/audio/sentences/${data.id}/${index + 1}.mp3`, text, textSha256: textSha256(text) };
  });
});
if (!clips.length || new Set(clips.map(({ src }) => src)).size !== clips.length) throw new Error('Empty or duplicate sentence batch');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const reused = new Map();
for (const clip of clips) {
  const old = previousClips.get(clip.src);
  const sentence = scenes.find(({ data }) => data.id === clip.sceneId).data.sentences[clip.sentenceIndex];
  const file = join(root, 'public', clip.src.slice(1));
  if (old?.text === clip.text && old.textSha256 === clip.textSha256 && old.voiceId === profile.id
    && sentence.audio?.src === old.src && sentence.audio?.textSha256 === old.textSha256
    && sentence.audio?.voiceId === old.voiceId && sentence.audio?.sha256 === old.sha256 && existsSync(file)) {
    const bytes = readFileSync(file);
    if (bytes.length && hash(bytes) === old.sha256) reused.set(clip.src, old);
  }
}
const pending = clips.filter(({ src }) => !reused.has(src));
mkdirSync(output, { recursive: true });
const inputPath = join(output, 'inputs.json');
writeFileSync(inputPath, JSON.stringify({ profile, clips: pending }, null, 2) + '\n');
let generated = [];
if (pending.length) {
  const result = spawnSync(resolve(python), [join(root, 'scripts/synthesize-audio.py'), inputPath, resolve(modelDirectory), output], {
    stdio: 'inherit', env: { ...process.env, HF_HUB_OFFLINE: '1', HF_HUB_DISABLE_IMPLICIT_TOKEN: '1' },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Synthesis failed (${result.status}); production content was not changed`);
  const manifest = JSON.parse(readFileSync(join(output, 'manifest.json'), 'utf8'));
  if (JSON.stringify(manifest.profile) !== JSON.stringify(profile) || manifest.clips.length !== pending.length) throw new Error('Unexpected generation manifest');
  generated = manifest.clips;
  for (let i = 0; i < pending.length; i++) {
    if (generated[i].src !== pending[i].src) throw new Error('Unexpected generated clip order');
  }
}
const bySrc = new Map([...reused.values(), ...generated].map((clip) => [clip.src, clip]));
// Re-read all current content and verify the entire payload before applying any audio.
const updates = scenes.map(({ path }) => ({ path, data: JSON.parse(readFileSync(path, 'utf8')) }));
for (let i = 0; i < scenes.length; i++) {
  if (updates[i].data.id !== scenes[i].data.id || updates[i].data.sentences.length !== scenes[i].data.sentences.length) {
    throw new Error('Scene identity or sentence count changed during generation; rerun before applying');
  }
}
const verified = clips.map((expected) => {
  const clip = bySrc.get(expected.src);
  const source = join(reused.has(expected.src) ? join(root, 'public') : output, expected.src.slice(1));
  if (!clip || clip.text !== expected.text || clip.textSha256 !== expected.textSha256 || clip.voiceId !== profile.id) throw new Error('Clip manifest mismatch');
  const bytes = readFileSync(source);
  if (!bytes.length || hash(bytes) !== clip.sha256) throw new Error('Audio hash mismatch');
  const scene = updates.find(({ data }) => data.id === expected.sceneId)?.data;
  const sentence = scene?.sentences[expected.sentenceIndex];
  if (!sentence || canonicalSentenceText(sentence) !== expected.text) throw new Error('English changed during generation; rerun before applying');
  sentence.audio = { src: clip.src, voiceId: clip.voiceId, textSha256: clip.textSha256, sha256: clip.sha256 };
  return { clip, source };
});
if (JSON.stringify(JSON.parse(readFileSync(profilePath, 'utf8'))) !== JSON.stringify(profile)) throw new Error('Voice profile changed during generation');
for (const { clip, source } of verified) {
  if (reused.has(clip.src)) continue;
  const target = join(root, 'public', clip.src.slice(1));
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
}
for (const { path, data } of updates) writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
mkdirSync(provenance, { recursive: true });
writeFileSync(join(provenance, 'inputs.json'), JSON.stringify({ profile, clips }, null, 2) + '\n');
const retained = previous && JSON.stringify(previous.profile) === JSON.stringify(profile)
  ? previous.clips.filter(({ src }) => !bySrc.has(src)) : [];
writeFileSync(previousPath, JSON.stringify({ profile, clips: [...retained, ...verified.map(({ clip }) => clip)].sort((a, b) => a.src.localeCompare(b.src)) }, null, 2) + '\n');
console.log(`Applied ${clips.length} sentence clips (${pending.length} generated, ${reused.size} reused) with voice ${profile.id}.`);
