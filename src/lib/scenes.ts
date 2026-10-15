import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { audio, voiceProfile, type AudioClip, type VoiceProfile } from './audio-validation.ts';
import { canonicalStoryText } from './audio-text.ts';
import { array, identifier, nonblank, record } from './validation.ts';

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

const imagePattern = /^\/images\/scenes\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:png|jpe?g|webp)$/i;

function references(value: unknown, path: string, issues: string[]): string[] {
  if (value === undefined) return [];
  return array(value, path, issues).map((item, index) => identifier(item, `${path}[${index}]`, issues));
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
