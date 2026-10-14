import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { audio, voiceProfile, type AudioClip } from './audio-validation.ts';
import { cardKey } from './review-state.ts';
import type { WordListData, WordListLicense, WordListSource } from './wordlist-data.ts';
import { array, httpsUrl, identifier, nonblank, onlyFields, record } from './validation.ts';

// 詞表是獨立於場景與文章的內容類型（同 ADR 0001 的做法）：自己的資料目錄、型別與驗證。
// 每份詞表一個目錄 content/wordlists/<id>/，內含 wordlist.json、授權檔 LICENSE 與出處 NOTICE.md。

export interface WordListEntry {
  id: string;
  rank: number;
  english: string;
  meaning: string;
  example: string;
  audio: AudioClip;
}

export interface WordList {
  id: string;
  name: string;
  description: string;
  source: WordListSource;
  license: WordListLicense;
  entries: WordListEntry[];
}

export class WordListError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Invalid word list content:\n${issues.map((issue) => `- ${issue}`).join('\n')}`);
    this.name = 'WordListError';
    this.issues = issues;
  }
}

const listFields = ['id', 'name', 'description', 'source', 'license', 'entries'];
const sourceFields = ['name', 'authors', 'url', 'adaptation'];
const licenseFields = ['name', 'url'];
const entryFields = ['id', 'rank', 'english', 'meaning', 'example', 'audio'];

function source(value: unknown, path: string, issues: string[]): WordListSource {
  const data = record(value, path, issues);
  onlyFields(data, sourceFields, path, issues);
  return {
    name: nonblank(data.name, `${path}.name`, issues),
    authors: nonblank(data.authors, `${path}.authors`, issues),
    url: httpsUrl(data.url, `${path}.url`, issues),
    adaptation: nonblank(data.adaptation, `${path}.adaptation`, issues),
  };
}

function license(value: unknown, path: string, issues: string[]): WordListLicense {
  const data = record(value, path, issues);
  onlyFields(data, licenseFields, path, issues);
  return { name: nonblank(data.name, `${path}.name`, issues), url: httpsUrl(data.url, `${path}.url`, issues) };
}

function entries(value: unknown, path: string, publicDir: string, profile: ReturnType<typeof voiceProfile>, issues: string[]): WordListEntry[] {
  const raw = array(value, path, issues);
  if (Array.isArray(value) && raw.length === 0) issues.push(`${path}: expected at least one entry`);
  const seenIds = new Set<string>();
  const seenCards = new Set<string>();
  return raw.map((item, index) => {
    const entryPath = `${path}[${index}]`;
    const data = record(item, entryPath, issues);
    onlyFields(data, entryFields, entryPath, issues);
    const id = identifier(data.id, `${entryPath}.id`, issues);
    if (id && seenIds.has(id)) issues.push(`${entryPath}.id: duplicate ID "${id}"`);
    seenIds.add(id);
    // 詞頻序號必須恰好是 1..n：缺號、重複、亂序與非整數都會讓這個比對失敗。
    if (data.rank !== index + 1) issues.push(`${entryPath}.rank: expected ${index + 1} (ranks run 1..n in order)`);
    const english = nonblank(data.english, `${entryPath}.english`, issues);
    const meaning = nonblank(data.meaning, `${entryPath}.meaning`, issues);
    if (english && meaning) {
      const key = cardKey({ english, meaning });
      if (seenCards.has(key)) issues.push(`${entryPath}: duplicate card "${english}" with the same meaning "${meaning}"`);
      seenCards.add(key);
    }
    return {
      id,
      rank: data.rank as number,
      english,
      meaning,
      example: nonblank(data.example, `${entryPath}.example`, issues),
      audio: audio(data.audio, `${entryPath}.audio`, publicDir, 'wordlists', english, profile, issues),
    };
  });
}

function validateWordListsAt(items: { source: string; data: unknown }[], publicDir: string, rawProfile: unknown, profileSource: string): WordList[] {
  const issues: string[] = [];
  const profile = voiceProfile(rawProfile, profileSource, issues);
  const ids = new Map<string, string>();
  const lists = items.map(({ source: file, data: raw }) => {
    const data = record(raw, file, issues);
    onlyFields(data, listFields, file, issues);
    const id = identifier(data.id, `${file}.id`, issues);
    if (id && ids.has(id)) issues.push(`${file}.id: duplicate word list ID "${id}" (also in ${ids.get(id)})`);
    if (id) ids.set(id, file);
    return {
      id,
      name: nonblank(data.name, `${file}.name`, issues),
      description: nonblank(data.description, `${file}.description`, issues),
      source: source(data.source, `${file}.source`, issues),
      license: license(data.license, `${file}.license`, issues),
      entries: entries(data.entries, `${file}.entries`, publicDir, profile, issues),
    };
  });
  if (issues.length) throw new WordListError(issues);
  return lists;
}

export function validateWordLists(items: { source: string; data: unknown }[], publicDir: string, profile: unknown): WordList[] {
  return validateWordListsAt(items, publicDir, profile, 'content/audio/voice-profile.json');
}

export function loadWordLists({ contentDir = join(process.cwd(), 'content', 'wordlists'), publicDir = join(process.cwd(), 'public') }: {
  contentDir?: string;
  publicDir?: string;
} = {}): WordList[] {
  const profileSource = join(dirname(contentDir), 'audio', 'voice-profile.json');
  let profile: unknown;
  try {
    profile = JSON.parse(readFileSync(profileSource, 'utf8')) as unknown;
  } catch (error) {
    throw new WordListError([`${profileSource}: cannot read or parse voice profile (${(error as Error).message})`]);
  }
  let directories: string[];
  try {
    directories = readdirSync(contentDir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  } catch (error) {
    throw new WordListError([`${contentDir}: cannot read word list directory (${(error as Error).message})`]);
  }
  const parseIssues: string[] = [];
  const items = directories.flatMap((name) => {
    const file = join(contentDir, name, 'wordlist.json');
    try {
      return [{ source: file, data: JSON.parse(readFileSync(file, 'utf8')) as unknown }];
    } catch (error) {
      parseIssues.push(`${file}: cannot parse JSON (${(error as Error).message})`);
      return [];
    }
  });
  if (parseIssues.length) throw new WordListError(parseIssues);
  return validateWordListsAt(items, publicDir, profile, profileSource);
}

/** 建置時輸出給瀏覽器的版本：只留複習頁需要的欄位，音檔 metadata 的雜湊不外送。 */
export function toWordListData(list: WordList): WordListData {
  return {
    id: list.id,
    name: list.name,
    description: list.description,
    source: list.source,
    license: list.license,
    entries: list.entries.map(({ id, rank, english, meaning, example, audio: clip }) => ({ id, rank, english, meaning, example, audioSrc: clip.src })),
  };
}
