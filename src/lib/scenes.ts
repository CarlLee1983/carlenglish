import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { canonicalStoryText, textSha256 } from './audio-text.ts';

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

export interface Segment {
  text: string;
  phraseIds?: string[];
  wordIds?: string[];
}

export interface Sentence {
  segments: Segment[];
  translation: string;
}

export interface Phrase {
  id: string;
  english: string;
  translation: string;
  audio: AudioClip;
}

export interface Word extends Phrase {
  example: string;
}

export interface Scene {
  id: string;
  title: string;
  titleEn: string;
  category: string;
  level: string;
  image: { src: string; alt: string; width: number; height: number };
  audio: AudioClip;
  voiceProfile: VoiceProfile;
  sentences: Sentence[];
  phrases: Phrase[];
  words: Word[];
}

export class ContentError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Invalid scene content:\n${issues.map((issue) => `- ${issue}`).join('\n')}`);
    this.name = 'ContentError';
    this.issues = issues;
  }
}

type RecordValue = Record<string, unknown>;
const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const imagePattern = /^\/images\/scenes\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:png|jpe?g|webp)$/i;
const hashPattern = /^[a-f0-9]{64}$/;
const revisionPattern = /^[a-f0-9]{40}$/;

function record(value: unknown, path: string, issues: string[]): RecordValue {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as RecordValue;
  }
  issues.push(`${path}: expected an object`);
  return {};
}

function nonblank(value: unknown, path: string, issues: string[]): string {
  if (typeof value === 'string' && value.trim()) return value;
  issues.push(`${path}: expected nonempty text`);
  return '';
}

function identifier(value: unknown, path: string, issues: string[]): string {
  const id = nonblank(value, path, issues);
  if (id && !idPattern.test(id)) issues.push(`${path}: expected a lowercase hyphenated ID`);
  return id;
}

function array(value: unknown, path: string, issues: string[], min?: number, max?: number): unknown[] {
  if (!Array.isArray(value)) {
    issues.push(`${path}: expected an array`);
    return [];
  }
  if (min !== undefined && (value.length < min || value.length > max!)) {
    issues.push(`${path}: expected ${min}–${max} items, found ${value.length}`);
  }
  return value;
}

function references(value: unknown, path: string, issues: string[]): string[] {
  if (value === undefined) return [];
  return array(value, path, issues).map((item, index) => identifier(item, `${path}[${index}]`, issues));
}

function httpsUrl(value: unknown, path: string, issues: string[]): string {
  const text = nonblank(value, path, issues);
  if (text) {
    try {
      const url = new URL(text);
      if (text !== text.trim() || url.protocol !== 'https:' || !url.hostname || url.username || url.password) {
        issues.push(`${path}: expected an HTTPS URL with a hostname and no credentials`);
      }
    } catch {
      issues.push(`${path}: expected an HTTPS URL with a hostname and no credentials`);
    }
  }
  return text;
}

function voiceProfile(value: unknown, path: string, issues: string[]): VoiceProfile {
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

function audio(value: unknown, path: string, publicDir: string, category: 'words' | 'phrases' | 'stories', expectedText: string, profile: VoiceProfile, issues: string[]): AudioClip {
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

function items(value: unknown, path: string, issues: string[], min: number, max: number, words: boolean, publicDir: string, profile: VoiceProfile): (Phrase | Word)[] {
  const seen = new Set<string>();
  return array(value, path, issues, min, max).map((raw, index) => {
    const itemPath = `${path}[${index}]`;
    const data = record(raw, itemPath, issues);
    const id = identifier(data.id, `${itemPath}.id`, issues);
    if (id && seen.has(id)) issues.push(`${itemPath}.id: duplicate ID "${id}"`);
    seen.add(id);
    const english = nonblank(data.english, `${itemPath}.english`, issues);
    const base = {
      id,
      english,
      translation: nonblank(data.translation, `${itemPath}.translation`, issues),
      audio: audio(data.audio, `${itemPath}.audio`, publicDir, words ? 'words' : 'phrases', english, profile, issues),
    };
    return words ? {
      ...base,
      example: nonblank(data.example, `${itemPath}.example`, issues),
    } : base;
  });
}

function image(value: unknown, path: string, publicDir: string, issues: string[]): Scene['image'] {
  const data = record(value, path, issues);
  const src = nonblank(data.src, `${path}.src`, issues);
  const alt = nonblank(data.alt, `${path}.alt`, issues);
  for (const key of ['width', 'height'] as const) {
    if (!Number.isSafeInteger(data[key]) || (data[key] as number) <= 0) {
      issues.push(`${path}.${key}: expected a positive integer`);
    }
  }
  if (src) {
    if (!imagePattern.test(src)) {
      issues.push(`${path}.src: expected a local /images/scenes/ PNG, JPEG, or WebP path`);
    } else {
      const root = resolve(publicDir, 'images', 'scenes');
      const file = resolve(publicDir, src.slice(1));
      const within = relative(root, file);
      if (!within || within.startsWith('..') || isAbsolute(within)) {
        issues.push(`${path}.src: image must stay inside /images/scenes/`);
      } else if (!existsSync(file) || !statSync(file).isFile()) {
        issues.push(`${path}.src: image file does not exist (${src})`);
      } else {
        const realRoot = realpathSync(root);
        const realFile = realpathSync(file);
        const realWithin = relative(realRoot, realFile);
        if (!realWithin || realWithin.startsWith('..') || isAbsolute(realWithin)) {
          issues.push(`${path}.src: image must stay inside /images/scenes/`);
        }
      }
    }
  }
  return { src, alt, width: data.width as number, height: data.height as number };
}

function validateScenesAt(entries: { source: string; data: unknown }[], publicDir: string, rawProfile: unknown, profileSource: string): Scene[] {
  const issues: string[] = [];
  const scenes: Scene[] = [];
  const sceneIds = new Map<string, string>();
  const profile = voiceProfile(rawProfile, profileSource, issues);

  if (entries.length === 0) issues.push('content/scenes: no scene JSON files found');

  for (const { source, data: raw } of entries) {
    const data = record(raw, source, issues);
    const id = identifier(data.id, `${source}.id`, issues);
    if (id && sceneIds.has(id)) {
      issues.push(`${source}.id: duplicate scene ID "${id}" (also in ${sceneIds.get(id)})`);
    }
    if (id) sceneIds.set(id, source);

    const phrases = items(data.phrases, `${source}.phrases`, issues, 4, 6, false, publicDir, profile) as Phrase[];
    const words = items(data.words, `${source}.words`, issues, 6, 8, true, publicDir, profile) as Word[];
    const phraseIds = new Set(phrases.map((item) => item.id));
    const wordIds = new Set(words.map((item) => item.id));
    const usedPhrases = new Set<string>();
    const usedWords = new Set<string>();
    const sentences = array(data.sentences, `${source}.sentences`, issues, 5, 8).map((rawSentence, sentenceIndex) => {
      const sentencePath = `${source}.sentences[${sentenceIndex}]`;
      const sentence = record(rawSentence, sentencePath, issues);
      const segments = array(sentence.segments, `${sentencePath}.segments`, issues).map((rawSegment, segmentIndex) => {
        const segmentPath = `${sentencePath}.segments[${segmentIndex}]`;
        const segment = record(rawSegment, segmentPath, issues);
        const text = typeof segment.text === 'string' ? segment.text : '';
        if (typeof segment.text !== 'string') issues.push(`${segmentPath}.text: expected text`);
        const phraseRefs = references(segment.phraseIds, `${segmentPath}.phraseIds`, issues);
        const wordRefs = references(segment.wordIds, `${segmentPath}.wordIds`, issues);
        if (!text.trim() && (phraseRefs.length || wordRefs.length)) {
          issues.push(`${segmentPath}.text: referenced learning items require visible text`);
        }
        for (const ref of phraseRefs) {
          if (!phraseIds.has(ref)) issues.push(`${segmentPath}.phraseIds: unknown phrase ID "${ref}"`);
          else usedPhrases.add(ref);
        }
        for (const ref of wordRefs) {
          if (!wordIds.has(ref)) issues.push(`${segmentPath}.wordIds: unknown word ID "${ref}"`);
          else usedWords.add(ref);
        }
        const result: Segment = { text };
        if (segment.phraseIds !== undefined) result.phraseIds = phraseRefs;
        if (segment.wordIds !== undefined) result.wordIds = wordRefs;
        return result;
      });
      if (!segments.map((segment) => segment.text).join('').trim()) {
        issues.push(`${sentencePath}.segments: combined sentence text must be nonempty`);
      }
      return { segments, translation: nonblank(sentence.translation, `${sentencePath}.translation`, issues) };
    });
    phrases.forEach((item, index) => {
      if (item.id && !usedPhrases.has(item.id)) issues.push(`${source}.phrases[${index}].id: unreferenced phrase "${item.id}"`);
    });
    words.forEach((item, index) => {
      if (item.id && !usedWords.has(item.id)) issues.push(`${source}.words[${index}].id: unreferenced word "${item.id}"`);
    });

    scenes.push({
      id,
      title: nonblank(data.title, `${source}.title`, issues),
      titleEn: nonblank(data.titleEn, `${source}.titleEn`, issues),
      category: nonblank(data.category, `${source}.category`, issues),
      level: nonblank(data.level, `${source}.level`, issues),
      image: image(data.image, `${source}.image`, publicDir, issues),
      audio: audio(data.audio, `${source}.audio`, publicDir, 'stories', canonicalStoryText(sentences), profile, issues),
      voiceProfile: profile,
      sentences,
      phrases,
      words,
    });
  }

  if (issues.length) throw new ContentError(issues);
  return scenes;
}

export function validateScenes(entries: { source: string; data: unknown }[], publicDir: string, profile: unknown): Scene[] {
  return validateScenesAt(entries, publicDir, profile, 'content/audio/voice-profile.json');
}

export function loadScenes({ contentDir = join(process.cwd(), 'content', 'scenes'), publicDir = join(process.cwd(), 'public') }: {
  contentDir?: string;
  publicDir?: string;
} = {}): Scene[] {
  const profileSource = join(dirname(contentDir), 'audio', 'voice-profile.json');
  let profile: unknown;
  try {
    profile = JSON.parse(readFileSync(profileSource, 'utf8')) as unknown;
  } catch (error) {
    throw new ContentError([`${profileSource}: cannot read or parse voice profile (${(error as Error).message})`]);
  }
  let filenames: string[];
  try {
    filenames = readdirSync(contentDir).filter((name) => name.endsWith('.json')).sort();
  } catch (error) {
    throw new ContentError([`${contentDir}: cannot read scene directory (${(error as Error).message})`]);
  }
  const parseIssues: string[] = [];
  const entries = filenames.flatMap((name) => {
    const source = join(contentDir, name);
    try {
      return [{ source, data: JSON.parse(readFileSync(source, 'utf8')) as unknown }];
    } catch (error) {
      parseIssues.push(`${source}: cannot parse JSON (${(error as Error).message})`);
      return [];
    }
  });
  let scenes: Scene[] = [];
  try {
    scenes = validateScenesAt(entries, publicDir, profile, profileSource);
  } catch (error) {
    if (error instanceof ContentError && parseIssues.length) throw new ContentError([...parseIssues, ...error.issues]);
    throw error;
  }
  if (parseIssues.length) throw new ContentError(parseIssues);
  return scenes;
}

export function getScene(id: string, scenes: Scene[] = loadScenes()): Scene | undefined {
  return scenes.find((scene) => scene.id === id);
}
