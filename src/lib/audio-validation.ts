import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { textSha256 } from './audio-text.ts';
import { httpsUrl, identifier, nonblank, record } from './validation.ts';

// 場景與詞表共用的音檔與聲線 metadata 驗證；音檔依內容用途分在不同的類別目錄。

export interface AudioClip {
  src: string;
  voiceId: string;
  textSha256: string;
  sha256: string;
}

export interface VoiceProfile {
  id: string;
  label: string;
  kind: 'synthetic';
  accent: string;
  provider: string;
  voice: string;
  libraryVersion: string;
  modelRevision: string;
  modelSha256: string;
  voiceSha256: string;
  sourceUrl: string;
  modelLicenseName: string;
  modelLicenseUrl: string;
  sampleRate: number;
  speed: number;
}

const hashPattern = /^[a-f0-9]{64}$/;
const revisionPattern = /^[a-f0-9]{40}$/;

export type AudioCategory = 'words' | 'phrases' | 'sentences' | 'wordlists';

export function voiceProfile(value: unknown, path: string, issues: string[]): VoiceProfile {
  const data = record(value, path, issues);
  const id = identifier(data.id, `${path}.id`, issues);
  const kind = nonblank(data.kind, `${path}.kind`, issues);
  if (kind && kind !== 'synthetic') issues.push(`${path}.kind: expected "synthetic"`);
  const modelRevision = nonblank(data.modelRevision, `${path}.modelRevision`, issues);
  if (modelRevision && !revisionPattern.test(modelRevision)) issues.push(`${path}.modelRevision: expected 40 lowercase hex characters`);
  const modelSha256 = nonblank(data.modelSha256, `${path}.modelSha256`, issues);
  if (modelSha256 && !hashPattern.test(modelSha256)) issues.push(`${path}.modelSha256: expected 64 lowercase hex characters`);
  const voiceSha256 = nonblank(data.voiceSha256, `${path}.voiceSha256`, issues);
  if (voiceSha256 && !hashPattern.test(voiceSha256)) issues.push(`${path}.voiceSha256: expected 64 lowercase hex characters`);
  if (!Number.isSafeInteger(data.sampleRate) || (data.sampleRate as number) <= 0) {
    issues.push(`${path}.sampleRate: expected a positive integer`);
  }
  if (typeof data.speed !== 'number' || !Number.isFinite(data.speed) || data.speed <= 0) {
    issues.push(`${path}.speed: expected a finite positive number`);
  }
  return {
    id,
    label: nonblank(data.label, `${path}.label`, issues),
    kind: kind as 'synthetic',
    accent: nonblank(data.accent, `${path}.accent`, issues),
    provider: nonblank(data.provider, `${path}.provider`, issues),
    voice: nonblank(data.voice, `${path}.voice`, issues),
    libraryVersion: nonblank(data.libraryVersion, `${path}.libraryVersion`, issues),
    modelRevision,
    modelSha256,
    voiceSha256,
    sourceUrl: httpsUrl(data.sourceUrl, `${path}.sourceUrl`, issues),
    modelLicenseName: nonblank(data.modelLicenseName, `${path}.modelLicenseName`, issues),
    modelLicenseUrl: httpsUrl(data.modelLicenseUrl, `${path}.modelLicenseUrl`, issues),
    sampleRate: data.sampleRate as number,
    speed: data.speed as number,
  };
}

export function audio(value: unknown, path: string, publicDir: string, category: AudioCategory, expectedText: string, profile: VoiceProfile, issues: string[]): AudioClip {
  const data = record(value, path, issues);
  const allowedFields = new Set(['src', 'voiceId', 'textSha256', 'sha256']);
  for (const key of Object.keys(data)) {
    if (!allowedFields.has(key)) issues.push(`${path}.${key}: unexpected audio field`);
  }
  const src = nonblank(data.src, `${path}.src`, issues);
  const pattern = new RegExp(`^/audio/${category}/(?:[a-zA-Z0-9_-]+/)*[a-zA-Z0-9_-]+\\.mp3$`, 'i');
  if (src) {
    if (!pattern.test(src)) {
      issues.push(`${path}.src: expected a local /audio/${category}/ MP3 path`);
    } else {
      const root = resolve(publicDir, 'audio', category);
      const file = resolve(publicDir, src.slice(1));
      const within = relative(root, file);
      if (!within || within.startsWith('..') || isAbsolute(within)) {
        issues.push(`${path}.src: audio must stay inside /audio/${category}/`);
      } else if (!existsSync(file) || !statSync(file).isFile() || statSync(file).size === 0) {
        issues.push(`${path}.src: audio file must be an existing nonempty regular file (${src})`);
      } else {
        const realWithin = relative(realpathSync(root), realpathSync(file));
        if (!realWithin || realWithin.startsWith('..') || isAbsolute(realWithin)) {
          issues.push(`${path}.src: audio must stay inside /audio/${category}/`);
        } else {
          const actual = createHash('sha256').update(readFileSync(file)).digest('hex');
          if (data.sha256 !== actual) issues.push(`${path}.sha256: does not match audio file bytes`);
        }
      }
    }
  }
  const voiceId = identifier(data.voiceId, `${path}.voiceId`, issues);
  if (voiceId && profile.id && voiceId !== profile.id) issues.push(`${path}.voiceId: must match voice profile "${profile.id}"`);
  const expectedHash = textSha256(expectedText);
  const clipTextSha256 = nonblank(data.textSha256, `${path}.textSha256`, issues);
  if (clipTextSha256 && !hashPattern.test(clipTextSha256)) issues.push(`${path}.textSha256: expected 64 lowercase hex characters`);
  if (clipTextSha256 && clipTextSha256 !== expectedHash) issues.push(`${path}.textSha256: does not match canonical English text`);
  const sha256 = nonblank(data.sha256, `${path}.sha256`, issues);
  if (sha256 && !hashPattern.test(sha256)) issues.push(`${path}.sha256: expected 64 lowercase hex characters`);
  return {
    src,
    voiceId,
    textSha256: clipTextSha256,
    sha256,
  };
}
