import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cardKey } from './review-state.ts';
import { array, identifier, nonblank, onlyFields, record } from './validation.ts';
import { loadWordListsOnce, type WordList } from './wordlists.ts';

export const vocabularyLevels = [
  { id: 'beginner', name: '初級', english: 'Beginner' },
  { id: 'intermediate', name: '中級', english: 'Intermediate' },
  { id: 'advanced', name: '高級', english: 'Advanced' },
] as const;
export type VocabularyLevel = typeof vocabularyLevels[number];

export interface VocabularyEntry {
  key: string;
  english: string;
  meaning: string;
  example: string;
  audioSrc: string;
  source: { id: string; title: string; href: string };
}
export interface VocabularyBank {
  level: VocabularyLevel;
  description: string;
  criteria: string;
  entries: VocabularyEntry[];
  sources: Pick<WordList, 'id' | 'name' | 'source' | 'license'>[];
}

export class VocabularyError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Invalid vocabulary banks:\n${issues.map((issue) => `- ${issue}`).join('\n')}`);
    this.name = 'VocabularyError';
    this.issues = issues;
  }
}

/** 編選只維護分級與穩定引用；中文、例句、錄音與授權仍由原詞表一起提供。 */
export function validateVocabularyBanks(value: unknown, wordLists: WordList[]): VocabularyBank[] {
  const issues: string[] = [];
  const data = record(value, 'vocabulary', issues);
  onlyFields(data, ['version', 'banks'], 'vocabulary', issues);
  if (data.version !== 1) issues.push('vocabulary.version: expected 1');
  const lists = new Map(wordLists.map((list) => [list.id, { list, entries: new Map(list.entries.map((entry) => [entry.id, entry])) }]));
  const banks = new Map<VocabularyLevel['id'], VocabularyBank>();
  const references = new Set<string>();
  const meanings = new Set<string>();
  for (const [index, item] of array(data.banks, 'vocabulary.banks', issues).entries()) {
    const path = `vocabulary.banks[${index}]`;
    const bank = record(item, path, issues);
    onlyFields(bank, ['level', 'description', 'criteria', 'entries'], path, issues);
    const levelId = identifier(bank.level, `${path}.level`, issues);
    const level = vocabularyLevels.find(({ id }) => id === levelId);
    if (!level) issues.push(`${path}.level: unsupported vocabulary level "${levelId}"`);
    else if (banks.has(level.id)) issues.push(`${path}.level: duplicate level "${level.id}"`);
    const description = nonblank(bank.description, `${path}.description`, issues);
    const criteria = nonblank(bank.criteria, `${path}.criteria`, issues);
    const entries: VocabularyEntry[] = [];
    const sources = new Map<string, VocabularyBank['sources'][number]>();
    const refs = array(bank.entries, `${path}.entries`, issues);
    if (refs.length === 0) issues.push(`${path}.entries: published banks must not be empty`);
    for (const [entryIndex, ref] of refs.entries()) {
      const refPath = `${path}.entries[${entryIndex}]`;
      const reference = record(ref, refPath, issues);
      onlyFields(reference, ['wordListId', 'entryId'], refPath, issues);
      const listId = identifier(reference.wordListId, `${refPath}.wordListId`, issues);
      const entryId = identifier(reference.entryId, `${refPath}.entryId`, issues);
      const source = lists.get(listId);
      const entry = source?.entries.get(entryId);
      if (!source || !entry) { issues.push(`${refPath}: unknown wordlist entry "${listId}/${entryId}"`); continue; }
      const key = `${listId}/${entryId}`;
      if (references.has(key)) issues.push(`${refPath}: duplicate assignment "${key}"`);
      references.add(key);
      const meaningKey = cardKey(entry);
      if (meanings.has(meaningKey)) issues.push(`${refPath}: duplicate word and meaning "${entry.english}"`);
      meanings.add(meaningKey);
      const { list } = source;
      entries.push({ key, english: entry.english, meaning: entry.meaning, example: entry.example, audioSrc: entry.audio.src,
        source: { id: list.id, title: list.name, href: `#source-${list.id}` } });
      sources.set(list.id, { id: list.id, name: list.name, source: { ...list.source }, license: { ...list.license } });
    }
    if (level) banks.set(level.id, { level, description, criteria,
      entries: entries.sort((a, b) => a.english.localeCompare(b.english, 'en') || a.meaning.localeCompare(b.meaning, 'zh-Hant')),
      sources: [...sources.values()] });
  }
  for (const { id } of vocabularyLevels) if (!banks.has(id)) issues.push(`vocabulary.banks: missing level "${id}"`);
  if (issues.length) throw new VocabularyError(issues);
  return vocabularyLevels.map(({ id }) => banks.get(id)!);
}

export function loadVocabularyCatalog({ file = join(process.cwd(), 'content', 'vocabulary', 'banks.json'), wordLists = loadWordListsOnce() }: {
  file?: string; wordLists?: WordList[];
} = {}): VocabularyBank[] {
  let data: unknown;
  try { data = JSON.parse(readFileSync(file, 'utf8')); }
  catch (error) { throw new VocabularyError([`${file}: cannot read or parse JSON (${(error as Error).message})`]); }
  return validateVocabularyBanks(data, wordLists);
}
