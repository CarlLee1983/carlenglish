import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { array, httpsUrl, identifier, nonblank, onlyFields, record } from './validation.ts';

export type Track = 'news' | 'posts';
export type Origin = 'original' | 'rewrite';

export interface ArticleSource {
  outlet: string;
  title: string;
  url: string;
  publishedAt: string;
  accessedAt: string;
  eventDate: string;
  rewrittenAt: string;
}

export interface Paragraph {
  english: string;
  translation: string;
}

export interface Post extends Paragraph {
  author: string;
  replyTo?: string;
  quoting?: string;
}

export interface GlossaryItem {
  english: string;
  translation: string;
}

export interface Question {
  question: string;
  answer: string;
}

export interface Article {
  id: string;
  title: string;
  titleEn: string;
  track: Track;
  stage: string;
  origin: Origin;
  source?: ArticleSource;
  background?: string;
  paragraphs?: Paragraph[];
  posts?: Post[];
  glossary: GlossaryItem[];
  questions: Question[];
}

export class ArticleContentError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Invalid article content:\n${issues.map((issue) => `- ${issue}`).join('\n')}`);
    this.name = 'ArticleContentError';
    this.issues = issues;
  }
}

export const trackLabels: Record<Track, string> = { news: '新聞', posts: '貼文' };
export const originLabels: Record<Origin, string> = {
  original: '教練原創，人物、地點與帳號皆為虛構',
  rewrite: '教學簡化版',
};

const stagesByTrack: Record<Track, string[]> = {
  news: ['N1', 'N2', 'N3', 'N4', 'N5'],
  posts: ['S1', 'S2', 'S3', 'S4'],
};
const articleFields = ['id', 'title', 'titleEn', 'track', 'stage', 'origin', 'source', 'paragraphs', 'posts', 'background', 'glossary', 'questions'];
const sourceFields = ['outlet', 'title', 'url', 'publishedAt', 'accessedAt', 'eventDate', 'rewrittenAt'];
const paragraphFields = ['english', 'translation'];
const postFields = ['author', 'replyTo', 'quoting', 'english', 'translation'];
const questionFields = ['question', 'answer'];
const authorPattern = /^@\S+$/;
const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

function isTrack(value: unknown): value is Track {
  return value === 'news' || value === 'posts';
}

function isoDate(value: unknown, path: string, issues: string[]): string {
  const text = nonblank(value, path, issues);
  if (text) {
    const match = datePattern.exec(text);
    const date = match && new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    if (!match || date!.toISOString().slice(0, 10) !== text) issues.push(`${path}: expected a valid YYYY-MM-DD date`);
  }
  return text;
}

function source(value: unknown, path: string, issues: string[]): ArticleSource {
  const data = record(value, path, issues);
  onlyFields(data, sourceFields, path, issues);
  return {
    outlet: nonblank(data.outlet, `${path}.outlet`, issues),
    title: nonblank(data.title, `${path}.title`, issues),
    url: httpsUrl(data.url, `${path}.url`, issues),
    publishedAt: isoDate(data.publishedAt, `${path}.publishedAt`, issues),
    accessedAt: isoDate(data.accessedAt, `${path}.accessedAt`, issues),
    eventDate: isoDate(data.eventDate, `${path}.eventDate`, issues),
    rewrittenAt: isoDate(data.rewrittenAt, `${path}.rewrittenAt`, issues),
  };
}

function paragraphs(value: unknown, path: string, issues: string[]): Paragraph[] {
  return array(value, path, issues, 1, 12).map((raw, index) => {
    const data = record(raw, `${path}[${index}]`, issues);
    onlyFields(data, paragraphFields, `${path}[${index}]`, issues);
    return {
      english: nonblank(data.english, `${path}[${index}].english`, issues),
      translation: nonblank(data.translation, `${path}[${index}].translation`, issues),
    };
  });
}

function posts(value: unknown, path: string, issues: string[]): Post[] {
  const earlierAuthors = new Set<string>();
  return array(value, path, issues, 1, 12).map((raw, index) => {
    const postPath = `${path}[${index}]`;
    const data = record(raw, postPath, issues);
    onlyFields(data, postFields, postPath, issues);
    const author = nonblank(data.author, `${postPath}.author`, issues);
    if (author && !authorPattern.test(author)) issues.push(`${postPath}.author: expected an account starting with "@"`);
    if (data.replyTo !== undefined && data.quoting !== undefined) {
      issues.push(`${postPath}: replyTo and quoting cannot both be set`);
    }
    const post: Post = {
      author,
      english: nonblank(data.english, `${postPath}.english`, issues),
      translation: nonblank(data.translation, `${postPath}.translation`, issues),
    };
    for (const field of ['replyTo', 'quoting'] as const) {
      if (data[field] === undefined) continue;
      const target = nonblank(data[field], `${postPath}.${field}`, issues);
      if (target && !earlierAuthors.has(target)) issues.push(`${postPath}.${field}: "${target}" has not appeared in an earlier post`);
      post[field] = target;
    }
    if (author) earlierAuthors.add(author);
    return post;
  });
}

/** 詞首需為單字邊界，詞尾不限，讓 eye 仍能對上 eyes，但 art 對不上 start；驗證與例句擷取共用。 */
function glossaryPattern(english: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])${english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'iu');
}

const sentenceSegmenter = new Intl.Segmenter('en', { granularity: 'sentence' });

/** 建置時為關鍵詞決定例句：段落與貼文依序切句後，第一個含有該詞的句子；找不到為 null。 */
export function glossaryExample(article: Pick<Article, 'paragraphs' | 'posts'>, english: string): string | null {
  return firstSentenceContaining([...(article.paragraphs ?? []), ...(article.posts ?? [])], english);
}

function firstSentenceContaining(items: { english: string }[], english: string): string | null {
  const pattern = glossaryPattern(english);
  for (const item of items) {
    for (const { segment } of sentenceSegmenter.segment(item.english)) {
      if (pattern.test(segment)) return segment.trim();
    }
  }
  return null;
}

function glossary(value: unknown, path: string, body: { english: string }[], issues: string[]): GlossaryItem[] {
  if (value === undefined) return [];
  return array(value, path, issues, 0, 8).map((raw, index) => {
    const data = record(raw, `${path}[${index}]`, issues);
    onlyFields(data, paragraphFields, `${path}[${index}]`, issues);
    const english = nonblank(data.english, `${path}[${index}].english`, issues);
    if (english && !glossaryPattern(english).test(body.map((item) => item.english).join('\n'))) {
      issues.push(`${path}[${index}].english: "${english}" does not appear in the article text`);
    } else if (english && firstSentenceContaining(body, english) === null) {
      // 句子切分會在 "Mr. " 這類縮寫後斷開；例句擷取找不到時，字卡背面會缺例句，所以在內容階段就擋下。
      issues.push(`${path}[${index}].english: no sentence contains "${english}" (a term must sit inside a single sentence)`);
    }
    return { english, translation: nonblank(data.translation, `${path}[${index}].translation`, issues) };
  });
}

function questions(value: unknown, path: string, issues: string[]): Question[] {
  return array(value, path, issues, 2, 4).map((raw, index) => {
    const data = record(raw, `${path}[${index}]`, issues);
    onlyFields(data, questionFields, `${path}[${index}]`, issues);
    return {
      question: nonblank(data.question, `${path}[${index}].question`, issues),
      answer: nonblank(data.answer, `${path}[${index}].answer`, issues),
    };
  });
}

export function validateArticles(entries: { source: string; data: unknown }[]): Article[] {
  const issues: string[] = [];
  const articles: Article[] = [];
  const articleIds = new Map<string, string>();

  if (entries.length === 0) issues.push('content/articles: no article JSON files found');

  for (const { source: file, data: raw } of entries) {
    const data = record(raw, file, issues);
    onlyFields(data, articleFields, file, issues);
    const id = identifier(data.id, `${file}.id`, issues);
    if (id && articleIds.has(id)) {
      issues.push(`${file}.id: duplicate article ID "${id}" (also in ${articleIds.get(id)})`);
    }
    if (id) articleIds.set(id, file);

    const track = data.track;
    if (!isTrack(track)) issues.push(`${file}.track: expected "news" or "posts"`);
    const stage = nonblank(data.stage, `${file}.stage`, issues);
    if (stage && isTrack(track) && !stagesByTrack[track].includes(stage)) {
      issues.push(`${file}.stage: "${stage}" does not belong to track "${track}" (expected ${stagesByTrack[track].join(', ')})`);
    }

    const origin = data.origin;
    if (origin !== 'original' && origin !== 'rewrite') issues.push(`${file}.origin: expected "original" or "rewrite"`);
    let articleSource: ArticleSource | undefined;
    if (origin === 'rewrite') articleSource = source(data.source, `${file}.source`, issues);
    else if (origin === 'original' && data.source !== undefined) issues.push(`${file}.source: original articles must not have a source`);

    let body: Paragraph[] | undefined;
    let articlePosts: Post[] | undefined;
    if (track === 'news') {
      body = paragraphs(data.paragraphs, `${file}.paragraphs`, issues);
      if (data.posts !== undefined) issues.push(`${file}.posts: news articles must not have posts`);
    } else if (track === 'posts') {
      articlePosts = posts(data.posts, `${file}.posts`, issues);
      if (data.paragraphs !== undefined) issues.push(`${file}.paragraphs: posts articles must not have paragraphs`);
    }

    let background: string | undefined;
    if (data.background !== undefined) background = nonblank(data.background, `${file}.background`, issues);

    const bodyItems = [...(body ?? []), ...(articlePosts ?? [])];
    const article: Article = {
      id,
      title: nonblank(data.title, `${file}.title`, issues),
      titleEn: nonblank(data.titleEn, `${file}.titleEn`, issues),
      track: track as Track,
      stage,
      origin: origin as Origin,
      glossary: glossary(data.glossary, `${file}.glossary`, bodyItems, issues),
      questions: questions(data.questions, `${file}.questions`, issues),
    };
    if (articleSource) article.source = articleSource;
    if (background !== undefined) article.background = background;
    if (body) article.paragraphs = body;
    if (articlePosts) article.posts = articlePosts;
    articles.push(article);
  }

  if (issues.length) throw new ArticleContentError(issues);
  return articles;
}

export function loadArticles({ contentDir = join(process.cwd(), 'content', 'articles') }: { contentDir?: string } = {}): Article[] {
  let filenames: string[];
  try {
    filenames = readdirSync(contentDir).filter((name) => name.endsWith('.json')).sort();
  } catch (error) {
    throw new ArticleContentError([`${contentDir}: cannot read article directory (${(error as Error).message})`]);
  }
  const parseIssues: string[] = [];
  const entries = filenames.flatMap((name) => {
    const file = join(contentDir, name);
    try {
      return [{ source: file, data: JSON.parse(readFileSync(file, 'utf8')) as unknown }];
    } catch (error) {
      parseIssues.push(`${file}: cannot parse JSON (${(error as Error).message})`);
      return [];
    }
  });
  const issues = [...parseIssues];
  let articles: Article[] = [];
  try {
    articles = validateArticles(entries);
  } catch (error) {
    if (!(error instanceof ArticleContentError)) throw error;
    issues.push(...error.issues);
  }
  if (issues.length) throw new ArticleContentError(issues);
  return articles;
}

export function getArticle(id: string, articles: Article[] = loadArticles()): Article | undefined {
  return articles.find((article) => article.id === id);
}

export interface ArticleMetrics {
  words: number;
  sentences: number;
  averageSentenceLength: number;
}

type MeasuredArticle = Pick<Article, 'paragraphs' | 'posts'>;

// 句尾標點（可接右引號），且後面是文末，或空白加大寫字母／開引號；縮寫、日期與小數因此不會被切開
const sentenceEnd = /[.!?]+["'”’]?(?=$|\s+["'“‘]?\p{Lu})/gu;

export function articleMetrics(article: MeasuredArticle): ArticleMetrics {
  const texts = [...(article.paragraphs ?? []), ...(article.posts ?? [])].map((item) => item.english.trim()).filter(Boolean);
  const words = texts.reduce((sum, text) => sum + text.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length, 0);
  const sentences = texts.reduce((sum, text) => sum + Math.max(1, text.match(sentenceEnd)?.length ?? 0), 0);
  return { words, sentences, averageSentenceLength: sentences ? words / sentences : 0 };
}

// 只有 N1–N3 有長度參考，N4、N5 與貼文軌沒有範圍
export const stageGuidelines: Record<string, { minWords: number; maxWords: number; maxAverageSentenceLength: number }> = {
  N1: { minWords: 80, maxWords: 150, maxAverageSentenceLength: 15 },
  N2: { minWords: 120, maxWords: 250, maxAverageSentenceLength: 18 },
  N3: { minWords: 300, maxWords: 500, maxAverageSentenceLength: 22 },
};

export function stageWarnings(article: MeasuredArticle & Pick<Article, 'id' | 'stage'>): string[] {
  const guideline = stageGuidelines[article.stage];
  if (!guideline) return [];
  const { words, averageSentenceLength } = articleMetrics(article);
  const warnings: string[] = [];
  if (words < guideline.minWords || words > guideline.maxWords) {
    warnings.push(`${article.id}: ${article.stage} expects ${guideline.minWords}–${guideline.maxWords} words, found ${words}`);
  }
  if (averageSentenceLength > guideline.maxAverageSentenceLength) {
    warnings.push(`${article.id}: ${article.stage} expects average sentence length ≤ ${guideline.maxAverageSentenceLength} words, found ${averageSentenceLength.toFixed(1)}`);
  }
  return warnings;
}
