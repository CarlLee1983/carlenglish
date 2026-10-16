import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { firstSentenceContaining } from './sentences.ts';
import { array, httpsUrl, identifier, nonblank, onlyFields, record } from './validation.ts';

export type ClassicStage = 'L1' | 'L2' | 'L3' | 'L4';
export interface ClassicQuestion { question: string; answer: string }
export interface ClassicAnnotation { english: string; translation: string; note?: string }
export interface ClassicPart {
  title: string; intro: string; paragraphs: string[]; annotations: ClassicAnnotation[];
  questions: ClassicQuestion[]; wholeQuestions?: ClassicQuestion[];
}
export interface Classic {
  id: string; title: string; titleEn: string; stage: ClassicStage; origin: 'rewrite' | 'original'; rewrittenAt?: string;
  sourceWork: { author: string; title: string; published: number; gutenberg: { ebook: number; url: string; accessedAt: string } };
  parts: ClassicPart[];
}
export class ClassicContentError extends Error {
  readonly issues: string[];
  constructor(issues: string[]) { super(`Invalid classic content:\n${issues.map((issue) => `- ${issue}`).join('\n')}`); this.name = 'ClassicContentError'; this.issues = issues; }
}
export const classicOriginLabels = { rewrite: '教學改寫', original: '原文' } as const;
export const classicStages: ClassicStage[] = ['L1', 'L2', 'L3', 'L4'];
const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
function date(value: unknown, path: string, issues: string[]): string {
  const text = nonblank(value, path, issues);
  const match = datePattern.exec(text);
  if (text && (!match || new Date(Date.UTC(+match[1], +match[2] - 1, +match[3])).toISOString().slice(0, 10) !== text)) issues.push(`${path}: expected a valid YYYY-MM-DD date`);
  return text;
}
function positiveInteger(value: unknown, path: string, issues: string[]): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) issues.push(`${path}: expected a positive integer`);
  return value as number;
}
function questions(value: unknown, path: string, issues: string[], min: number, max: number): ClassicQuestion[] {
  return array(value, path, issues, min, max).map((raw, index) => {
    const at = `${path}[${index}]`; const data = record(raw, at, issues);
    onlyFields(data, ['question', 'answer'], at, issues);
    return { question: nonblank(data.question, `${at}.question`, issues), answer: nonblank(data.answer, `${at}.answer`, issues) };
  });
}
function part(value: unknown, path: string, last: boolean, issues: string[]): ClassicPart {
  const data = record(value, path, issues);
  onlyFields(data, ['title', 'intro', 'paragraphs', 'annotations', 'questions', 'wholeQuestions'], path, issues);
  const paragraphs = array(data.paragraphs, `${path}.paragraphs`, issues).map((text, index) => nonblank(text, `${path}.paragraphs[${index}]`, issues));
  if (paragraphs.length === 0) issues.push(`${path}.paragraphs: expected at least one paragraph`);
  const annotations = array(data.annotations, `${path}.annotations`, issues, 0, 12).map((raw, index) => {
    const at = `${path}.annotations[${index}]`; const annotation = record(raw, at, issues);
    onlyFields(annotation, ['english', 'translation', 'note'], at, issues);
    const english = nonblank(annotation.english, `${at}.english`, issues);
    if (english && !firstSentenceContaining(paragraphs, english)) issues.push(`${at}.english: no sentence in this part contains "${english}"`);
    const item: ClassicAnnotation = { english, translation: nonblank(annotation.translation, `${at}.translation`, issues) };
    if (annotation.note !== undefined) item.note = nonblank(annotation.note, `${at}.note`, issues);
    return item;
  });
  const result: ClassicPart = {
    title: nonblank(data.title, `${path}.title`, issues), intro: nonblank(data.intro, `${path}.intro`, issues),
    paragraphs, annotations, questions: questions(data.questions, `${path}.questions`, issues, 2, 3),
  };
  if (last) result.wholeQuestions = questions(data.wholeQuestions, `${path}.wholeQuestions`, issues, 1, 2);
  else if (Object.hasOwn(data, 'wholeQuestions')) issues.push(`${path}.wholeQuestions: only allowed in the final part`);
  return result;
}
export function validateClassics(entries: { source: string; data: unknown }[]): Classic[] {
  const issues: string[] = []; const ids = new Map<string, string>(); const works = new Map<string, string>();
  if (!entries.length) issues.push('content/classics: no classic JSON files found');
  const classics = entries.map(({ source, data: raw }) => {
    const data = record(raw, source, issues);
    onlyFields(data, ['id', 'title', 'titleEn', 'stage', 'origin', 'rewrittenAt', 'sourceWork', 'parts'], source, issues);
    const id = identifier(data.id, `${source}.id`, issues);
    if (ids.has(id)) issues.push(`${source}.id: duplicate classic ID "${id}" (also in ${ids.get(id)})`);
    ids.set(id, source);
    const stage = data.stage;
    if (!classicStages.includes(stage as ClassicStage)) issues.push(`${source}.stage: expected L1–L4`);
    const origin = data.origin;
    if (origin !== 'rewrite' && origin !== 'original') issues.push(`${source}.origin: expected rewrite or original`);
    if (classicStages.slice(0, 2).includes(stage as ClassicStage) && origin !== 'rewrite') issues.push(`${source}.origin: L1–L2 must be a rewrite`);
    if (classicStages.slice(2).includes(stage as ClassicStage) && origin !== 'original') issues.push(`${source}.origin: L3–L4 must be original`);
    let rewrittenAt: string | undefined;
    if (origin === 'rewrite') rewrittenAt = date(data.rewrittenAt, `${source}.rewrittenAt`, issues);
    else if (data.rewrittenAt !== undefined) issues.push(`${source}.rewrittenAt: original must not have rewrittenAt`);
    const work = record(data.sourceWork, `${source}.sourceWork`, issues);
    onlyFields(work, ['author', 'title', 'published', 'gutenberg'], `${source}.sourceWork`, issues);
    const gutenberg = record(work.gutenberg, `${source}.sourceWork.gutenberg`, issues);
    onlyFields(gutenberg, ['ebook', 'url', 'accessedAt'], `${source}.sourceWork.gutenberg`, issues);
    const sourceWork = {
      author: nonblank(work.author, `${source}.sourceWork.author`, issues),
      title: nonblank(work.title, `${source}.sourceWork.title`, issues),
      published: positiveInteger(work.published, `${source}.sourceWork.published`, issues),
      gutenberg: {
        ebook: positiveInteger(gutenberg.ebook, `${source}.sourceWork.gutenberg.ebook`, issues),
        url: httpsUrl(gutenberg.url, `${source}.sourceWork.gutenberg.url`, issues),
        accessedAt: date(gutenberg.accessedAt, `${source}.sourceWork.gutenberg.accessedAt`, issues),
      },
    };
    const workKey = JSON.stringify([sourceWork.author, sourceWork.title, sourceWork.published, stage]);
    if (works.has(workKey)) issues.push(`${source}: same source work and stage as ${works.get(workKey)}`);
    works.set(workKey, source);
    const rawParts = array(data.parts, `${source}.parts`, issues, 2, 8);
    const parts = rawParts.map((value, index) => part(value, `${source}.parts[${index}]`, index === rawParts.length - 1, issues));
    return { id, title: nonblank(data.title, `${source}.title`, issues), titleEn: nonblank(data.titleEn, `${source}.titleEn`, issues),
      stage: stage as ClassicStage, origin: origin as Classic['origin'], ...(rewrittenAt ? { rewrittenAt } : {}), sourceWork, parts };
  });
  if (issues.length) throw new ClassicContentError(issues);
  return classics;
}
export function loadClassics({ contentDir = join(process.cwd(), 'content', 'classics') }: { contentDir?: string } = {}): Classic[] {
  let filenames: string[];
  try { filenames = readdirSync(contentDir).filter((name) => name.endsWith('.json')).sort(); }
  catch (error) { throw new ClassicContentError([`${contentDir}: cannot read classic directory (${(error as Error).message})`]); }
  const issues: string[] = [];
  const entries = filenames.flatMap((name) => {
    const source = join(contentDir, name);
    try { return [{ source, data: JSON.parse(readFileSync(source, 'utf8')) as unknown }]; }
    catch (error) { issues.push(`${source}: cannot parse JSON (${(error as Error).message})`); return []; }
  });
  let classics: Classic[] = [];
  try { classics = validateClassics(entries); } catch (error) { if (!(error instanceof ClassicContentError)) throw error; issues.push(...error.issues); }
  if (issues.length) throw new ClassicContentError(issues);
  return classics;
}
export function classicWarnings(classic: Pick<Classic, 'id' | 'stage' | 'parts'>): string[] {
  const [min, max] = classic.stage === 'L1' ? [150, 300] : classic.stage === 'L2' ? [300, 500] : [600, 1200];
  return classic.parts.flatMap((part, index) => {
    const words = part.paragraphs.join(' ').split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
    return words < min || words > max ? [`${classic.id} part ${index + 1}: ${classic.stage} expects ${min}–${max} words, found ${words}`] : [];
  });
}
export function otherVersions(classic: Classic, classics: Classic[]): Classic[] {
  const { author, title, published } = classic.sourceWork;
  return classics.filter((other) => other.id !== classic.id && other.sourceWork.author === author && other.sourceWork.title === title && other.sourceWork.published === published);
}
