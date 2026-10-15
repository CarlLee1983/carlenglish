import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { audio, voiceProfile, type AudioClip, type VoiceProfile } from './audio-validation.ts';
import { cardKey } from './review-state.ts';
import { summarizeWordList, type WordListData, type WordListLicense, type WordListSource, type WordListSummary } from './wordlist-data.ts';
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

/** 原詞表收錄、但不是真正常用字而不發出的詞（例如逐字稿標記）；排名保留，讓詞頻序號出現可解釋的跳號。 */
export interface ExcludedWord {
  rank: number;
  english: string;
  reason: string;
}

export interface WordList {
  id: string;
  name: string;
  description: string;
  source: WordListSource;
  license: WordListLicense;
  /** 排除清單；可以包含還沒收錄的排名，讓後續擴充時一併排除。 */
  excluded: ExcludedWord[];
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

const listFields = ['id', 'name', 'description', 'source', 'license', 'excluded', 'entries'];
const excludedFields = ['rank', 'english', 'reason'];
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

function excluded(value: unknown, path: string, issues: string[]): ExcludedWord[] {
  if (value === undefined) return [];
  const seen = new Set<number>();
  return array(value, path, issues).map((item, index) => {
    const itemPath = `${path}[${index}]`;
    const data = record(item, itemPath, issues);
    onlyFields(data, excludedFields, itemPath, issues);
    if (!Number.isSafeInteger(data.rank) || (data.rank as number) < 1) issues.push(`${itemPath}.rank: expected a positive integer`);
    else if (seen.has(data.rank as number)) issues.push(`${itemPath}.rank: duplicate rank ${data.rank}`);
    seen.add(data.rank as number);
    return { rank: data.rank as number, english: nonblank(data.english, `${itemPath}.english`, issues), reason: nonblank(data.reason, `${itemPath}.reason`, issues) };
  });
}

interface EntryContext {
  skipped: ExcludedWord[];
  excludedPath: string;
  publicDir: string;
  profile: VoiceProfile;
  issues: string[];
}

function entries(value: unknown, path: string, { skipped, excludedPath, publicDir, profile, issues }: EntryContext): WordListEntry[] {
  const raw = array(value, path, issues);
  if (Array.isArray(value) && raw.length === 0) issues.push(`${path}: expected at least one entry`);
  const seenIds = new Set<string>();
  const seenCards = new Set<string>();
  const skippedRanks = new Set(skipped.map((item) => item.rank));
  const skippedWords = new Map(skipped.map((item, index) => [item.english.trim().toLowerCase(), index]));
  let expectedRank = 0;
  return raw.map((item, index) => {
    const entryPath = `${path}[${index}]`;
    const data = record(item, entryPath, issues);
    onlyFields(data, entryFields, entryPath, issues);
    const id = identifier(data.id, `${entryPath}.id`, issues);
    if (id && seenIds.has(id)) issues.push(`${entryPath}.id: duplicate ID "${id}"`);
    seenIds.add(id);
    // 詞頻序號依序遞增，只能跳過排除清單裡的排名：缺號、重複、亂序與非整數都會讓這個比對失敗。
    do expectedRank += 1; while (skippedRanks.has(expectedRank));
    if (data.rank !== expectedRank) issues.push(`${entryPath}.rank: expected ${expectedRank} (ranks run in order; only excluded ranks may be skipped)`);
    const english = nonblank(data.english, `${entryPath}.english`, issues);
    const excludedIndex = skippedWords.get(english.trim().toLowerCase());
    if (excludedIndex !== undefined) issues.push(`${excludedPath}[${excludedIndex}]: excluded word "${skipped[excludedIndex].english}" is also an entry`);
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

/** 詞表目錄必須附 LICENSE（CC BY-SA 要求隨內容提供授權）與 NOTICE.md（出處與改作說明）；詞表檔所在的目錄就是詞表目錄。 */
function requireDirectoryFile(wordListFile: string, name: string, issues: string[]) {
  const path = join(dirname(wordListFile), name);
  try {
    if (statSync(path).isFile() && statSync(path).size > 0) return;
  } catch {
    // 讀不到就和空檔案一樣處理，下面統一回報。
  }
  issues.push(`${path}: word list directory must contain a nonempty ${name} file`);
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
    requireDirectoryFile(file, 'LICENSE', issues);
    requireDirectoryFile(file, 'NOTICE.md', issues);
    const skipped = excluded(data.excluded, `${file}.excluded`, issues);
    return {
      id,
      name: nonblank(data.name, `${file}.name`, issues),
      description: nonblank(data.description, `${file}.description`, issues),
      source: source(data.source, `${file}.source`, issues),
      license: license(data.license, `${file}.license`, issues),
      excluded: skipped,
      entries: entries(data.entries, `${file}.entries`, { skipped, excludedPath: `${file}.excluded`, publicDir, profile, issues }),
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

let cached: WordList[] | undefined;

/** 建置程序內只載入驗證一次（驗證會對每個 MP3 算雜湊）；Layout、複習頁與詞表 JSON 端點共用。 */
export function loadWordListsOnce(): WordList[] {
  cached ??= loadWordLists();
  return cached;
}

let summaries: WordListSummary[] | undefined;

/** 每一頁的 Layout 都要帶摘要。 */
export function loadWordListSummaries(): WordListSummary[] {
  summaries ??= loadWordListsOnce().map(summarizeWordList);
  return summaries;
}
