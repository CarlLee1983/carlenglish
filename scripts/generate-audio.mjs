import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { canonicalStoryText, textSha256 } from '../src/lib/audio-text.ts';

const [python, modelDirectory] = process.argv.slice(2);
if (!python || !modelDirectory) throw new Error('Usage: node scripts/generate-audio.mjs <isolated-python> <local-model-directory>');
const root = resolve(import.meta.dirname, '..');
const output = join(root, '.scratch/illustrated-english/unified-voice/output');
const profile = JSON.parse(readFileSync(join(root, 'content/audio/voice-profile.json'), 'utf8'));
const scenes = readdirSync(join(root, 'content/scenes')).filter((name) => name.endsWith('.json')).sort().map((name) => {
  const path = join(root, 'content/scenes', name);
  return { path, data: JSON.parse(readFileSync(path, 'utf8')) };
});
const clips = [];
for (const { data: scene } of scenes) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(scene.id)) throw new Error('Invalid scene ID');
  clips.push({ sceneId: scene.id, kind: 'stories', itemId: scene.id, src: `/audio/stories/${scene.id}.mp3`, text: canonicalStoryText(scene.sentences) });
  for (const kind of ['phrases', 'words']) for (const item of scene[kind]) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id)) throw new Error('Invalid item ID');
    clips.push({ sceneId: scene.id, kind, itemId: item.id, src: `/audio/${kind}/${scene.id}-${item.id}.mp3`, text: item.english });
  }
}
for (const clip of clips) clip.textSha256 = textSha256(clip.text);
if (new Set(clips.map((clip) => clip.src)).size !== clips.length) throw new Error('Duplicate audio paths');
mkdirSync(output, { recursive: true });
const inputPath = join(output, 'inputs.json');
writeFileSync(inputPath, JSON.stringify({ profile, clips }, null, 2) + '\n');
const result = spawnSync(resolve(python), [join(root, 'scripts/synthesize-audio.py'), inputPath, resolve(modelDirectory), output], {
  stdio: 'inherit', env: { ...process.env, HF_HUB_OFFLINE: '1', HF_HUB_DISABLE_IMPLICIT_TOKEN: '1' },
});
if (result.error) throw result.error;
if (result.status !== 0) throw new Error(`Synthesis failed (${result.status}); production content was not changed`);
const manifest = JSON.parse(readFileSync(join(output, 'manifest.json'), 'utf8'));
if (JSON.stringify(manifest.profile) !== JSON.stringify(profile) || manifest.clips.length !== clips.length) throw new Error('Unexpected generation manifest');
// Verify the complete batch and re-read current text before replacing any production file.
const updates = scenes.map(({ path }) => ({ path, data: JSON.parse(readFileSync(path, 'utf8')) }));
for (let i = 0; i < clips.length; i++) {
  const expected = clips[i];
  const generated = manifest.clips[i];
  if (generated.src !== expected.src || generated.textSha256 !== expected.textSha256 || generated.voiceId !== profile.id) throw new Error('Clip manifest mismatch');
  const bytes = readFileSync(join(output, expected.src.slice(1)));
  if (createHash('sha256').update(bytes).digest('hex') !== generated.sha256 || !bytes.length) throw new Error('Generated audio hash mismatch');
  const scene = updates.find(({ data }) => data.id === expected.sceneId)?.data;
  const item = expected.kind === 'stories' ? scene : scene?.[expected.kind].find((entry) => entry.id === expected.itemId);
  const currentText = expected.kind === 'stories' ? canonicalStoryText(scene.sentences) : item?.english;
  if (currentText !== expected.text) throw new Error('English changed during generation; rerun before applying');
  item.audio = { src: generated.src, voiceId: generated.voiceId, textSha256: generated.textSha256, sha256: generated.sha256 };
}
if (JSON.stringify(JSON.parse(readFileSync(join(root, 'content/audio/voice-profile.json'), 'utf8'))) !== JSON.stringify(profile)) throw new Error('Voice profile changed during generation');
for (const clip of clips) {
  const target = join(root, 'public', clip.src.slice(1));
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(join(output, clip.src.slice(1)), target);
}
for (const { path, data } of updates) writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
console.log(`Applied ${clips.length} clips with voice ${profile.id}.`);
