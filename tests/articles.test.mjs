import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { ArticleContentError, getArticle, loadArticles, validateArticles } from '../src/lib/articles.ts';
import { crossTypeDuplicateIds } from '../src/lib/validation.ts';

const questions = () => [
  { question: '誰宣布了消息？', answer: '圖書館館長。' },
  { question: '何時生效？', answer: '下週一。' },
];

function news(id = 'library-news') {
  return {
    id, track: 'news', stage: 'N1', origin: 'original', title: '圖書館延長開放', titleEn: 'Library stays open late',
    paragraphs: [
      { english: 'The library will stay open until 9 p.m.', translation: '圖書館會開到晚上九點。' },
      { english: 'The director said students asked for it.', translation: '館長說是學生提出的要求。' },
    ],
    glossary: [{ english: 'Director', translation: '館長' }],
    questions: questions(),
  };
}

function rewrite(id = 'prize-news') {
  return {
    ...news(id), stage: 'N2', origin: 'rewrite', background: '背景說明。',
    source: {
      outlet: 'Example News', title: 'Original headline', url: 'https://example.org/story',
      publishedAt: '2026-10-05', accessedAt: '2026-10-14', eventDate: '2026-10-05', rewrittenAt: '2026-10-14',
    },
  };
}

function posts(id = 'app-posts') {
  return {
    id, track: 'posts', stage: 'S1', origin: 'original', title: 'App 討論', titleEn: 'About the app',
    posts: [
      { author: '@maya', english: 'ngl the app is great', translation: '老實說這個 App 很棒。' },
      { author: '@dan', replyTo: '@maya', english: 'lol maybe', translation: '哈，也許吧。' },
      { author: '@news', quoting: '@dan', english: 'ICYMI: app update', translation: '錯過的人看這裡：App 更新。' },
    ],
    glossary: [{ english: 'ngl', translation: '老實說' }, { english: 'icymi', translation: '錯過的人看這裡' }],
    questions: questions(),
  };
}

const at = 'content/articles/a.json';
const entry = (data, source = at) => ({ source, data });
const issuesOf = (entries) => {
  try {
    validateArticles(entries);
  } catch (error) {
    assert.ok(error instanceof ArticleContentError);
    return error.issues;
  }
  return [];
};
const expectIssue = (data, fragment) => {
  const issues = issuesOf([entry(data)]);
  assert.ok(issues.some((issue) => issue.startsWith(`${at}.${fragment}`)), `expected "${fragment}" in:\n${issues.join('\n')}`);
};
const mutate = (base, change) => {
  const copy = structuredClone(base);
  change(copy);
  return copy;
};

test('valid news, rewrite, and posts articles pass and keep their fields', () => {
  const articles = validateArticles([entry(news('a-one'), 'one.json'), entry(rewrite('a-two'), 'two.json'), entry(posts('a-three'), 'three.json')]);
  assert.deepEqual(articles.map((article) => article.id), ['a-one', 'a-two', 'a-three']);
  assert.equal(articles[1].source.url, 'https://example.org/story');
  assert.equal(articles[1].background, '背景說明。');
  assert.equal(articles[2].posts[1].replyTo, '@maya');
  assert.equal(articles[2].posts[2].quoting, '@dan');
  assert.deepEqual(articles[0].glossary.map((item) => item.english), ['Director']);
});

test('track and stage must agree', () => {
  expectIssue(mutate(news(), (a) => { a.stage = 'S1'; }), 'stage: ');
  expectIssue(mutate(posts(), (a) => { a.stage = 'N1'; }), 'stage: ');
  expectIssue(mutate(news(), (a) => { a.track = 'blog'; }), 'track: ');
});

test('origin decides whether source is required or forbidden', () => {
  expectIssue(mutate(rewrite(), (a) => { delete a.source; }), 'source: ');
  expectIssue(mutate(news(), (a) => { a.source = rewrite().source; }), 'source: ');
  expectIssue(mutate(news(), (a) => { a.origin = 'copy'; }), 'origin: ');
});

test('source requires an HTTPS URL and valid YYYY-MM-DD dates', () => {
  expectIssue(mutate(rewrite(), (a) => { a.source.url = 'http://example.org/story'; }), 'source.url: ');
  expectIssue(mutate(rewrite(), (a) => { a.source.publishedAt = '2026-02-30'; }), 'source.publishedAt: ');
  expectIssue(mutate(rewrite(), (a) => { a.source.accessedAt = '10/14/2026'; }), 'source.accessedAt: ');
  expectIssue(mutate(rewrite(), (a) => { delete a.source.eventDate; }), 'source.eventDate: ');
  expectIssue(mutate(rewrite(), (a) => { a.source.rewrittenAt = ''; }), 'source.rewrittenAt: ');
  expectIssue(mutate(rewrite(), (a) => { a.source.outlet = ' '; }), 'source.outlet: ');
});

test('news and posts bodies are mutually exclusive and bounded', () => {
  expectIssue(mutate(news(), (a) => { a.posts = posts().posts; }), 'posts: ');
  expectIssue(mutate(posts(), (a) => { a.paragraphs = news().paragraphs; }), 'paragraphs: ');
  expectIssue(mutate(news(), (a) => { delete a.paragraphs; }), 'paragraphs: ');
  expectIssue(mutate(news(), (a) => { a.paragraphs = []; }), 'paragraphs: expected 1–12');
  expectIssue(mutate(news(), (a) => { a.paragraphs[1].translation = ''; }), 'paragraphs[1].translation: ');
  expectIssue(mutate(posts(), (a) => { delete a.posts; }), 'posts: ');
  expectIssue(mutate(posts(), (a) => { a.posts = Array(13).fill(a.posts[0]); }), 'posts: expected 1–12');
});

test('post authors, replies, and quotes are checked against earlier posts', () => {
  expectIssue(mutate(posts(), (a) => { a.posts[0].author = 'maya'; }), 'posts[0].author: ');
  expectIssue(mutate(posts(), (a) => { a.posts[1].replyTo = '@nobody'; }), 'posts[1].replyTo: ');
  expectIssue(mutate(posts(), (a) => { a.posts[0].replyTo = '@dan'; }), 'posts[0].replyTo: ');
  expectIssue(mutate(posts(), (a) => { a.posts[2].quoting = '@nobody'; }), 'posts[2].quoting: ');
  expectIssue(mutate(posts(), (a) => { a.posts[2].replyTo = '@maya'; }), 'posts[2]: ');
});

test('background must be nonempty text when present', () => {
  expectIssue(mutate(news(), (a) => { a.background = ' '; }), 'background: ');
});

test('glossary is bounded and every term must appear in the body, ignoring case', () => {
  expectIssue(mutate(news(), (a) => { a.glossary = [{ english: 'telescope', translation: '望遠鏡' }]; }), 'glossary[0].english: ');
  expectIssue(mutate(posts(), (a) => { a.glossary[0].english = 'tbh'; }), 'glossary[0].english: ');
  expectIssue(mutate(news(), (a) => { a.glossary = Array(9).fill({ english: 'library', translation: '圖書館' }); }), 'glossary: expected 0–8');
  expectIssue(mutate(news(), (a) => { a.glossary[0].translation = ''; }), 'glossary[0].translation: ');
});

test('questions require 2 to 4 entries with question and answer', () => {
  expectIssue(mutate(news(), (a) => { a.questions = a.questions.slice(0, 1); }), 'questions: expected 2–4');
  expectIssue(mutate(news(), (a) => { a.questions = Array(5).fill(a.questions[0]); }), 'questions: expected 2–4');
  expectIssue(mutate(news(), (a) => { delete a.questions; }), 'questions: ');
  expectIssue(mutate(news(), (a) => { a.questions[1].answer = ''; }), 'questions[1].answer: ');
});

test('ids must be well formed and unique across articles', () => {
  expectIssue(mutate(news(), (a) => { a.id = 'Bad_ID'; }), 'id: ');
  const issues = issuesOf([entry(news('same-id'), 'one.json'), entry(posts('same-id'), 'two.json')]);
  assert.ok(issues.some((issue) => issue.startsWith('two.json.id: duplicate article ID "same-id"') && issue.includes('one.json')), issues.join('\n'));
  expectIssue(mutate(news(), (a) => { a.title = ''; }), 'title: ');
  expectIssue(mutate(news(), (a) => { delete a.titleEn; }), 'titleEn: ');
});

test('unknown top-level fields are rejected', () => {
  expectIssue(mutate(news(), (a) => { a.glosary = []; }), 'glosary: unexpected field');
});

test('unknown fields in nested objects are rejected, such as a misspelled replyTo', () => {
  expectIssue(mutate(posts(), (a) => { a.posts[1].replyto = a.posts[1].replyTo; delete a.posts[1].replyTo; }), 'posts[1].replyto: unexpected field');
  expectIssue(mutate(rewrite(), (a) => { a.source.publisher = 'x'; }), 'source.publisher: unexpected field');
  expectIssue(mutate(news(), (a) => { a.paragraphs[0].note = 'x'; }), 'paragraphs[0].note: unexpected field');
  expectIssue(mutate(news(), (a) => { a.glossary[0].example = 'x'; }), 'glossary[0].example: unexpected field');
  expectIssue(mutate(news(), (a) => { a.questions[0].hint = 'x'; }), 'questions[0].hint: unexpected field');
});

test('glossary terms match from a word start, so "art" does not match "start"', () => {
  const startOnly = mutate(news(), (a) => { a.paragraphs[0].english = 'We start at nine.'; a.glossary = [{ english: 'art', translation: '藝術' }]; });
  expectIssue(startOnly, 'glossary[0].english: ');
  const plural = mutate(news(), (a) => { a.paragraphs[0].english = 'Her eyes were tired.'; a.glossary = [{ english: 'eye', translation: '眼睛' }]; });
  assert.deepEqual(issuesOf([entry(plural)]), []);
});

test('IDs shared between a scene and an article are reported with both sources', () => {
  const issues = crossTypeDuplicateIds(
    [{ id: 'cafe', source: 'content/scenes/cafe.json' }, { id: 'only-scene', source: 'content/scenes/x.json' }],
    [{ id: 'cafe', source: 'content/articles/cafe.json' }],
  );
  assert.equal(issues.length, 1);
  assert.ok(issues[0].includes('"cafe"') && issues[0].includes('content/scenes/cafe.json') && issues[0].includes('content/articles/cafe.json'));
  assert.deepEqual(crossTypeDuplicateIds([{ id: 'a', source: 's' }], [{ id: 'b', source: 't' }]), []);
});

test('issues from several articles accumulate with their own locations', () => {
  const issues = issuesOf([
    entry(mutate(news('one'), (a) => { a.stage = 'S2'; }), 'one.json'),
    entry(mutate(posts('two'), (a) => { a.posts[1].replyTo = '@x'; }), 'two.json'),
  ]);
  assert.ok(issues.some((issue) => issue.startsWith('one.json.stage')));
  assert.ok(issues.some((issue) => issue.startsWith('two.json.posts[1].replyTo')));
});

function withDir(run) {
  const root = mkdtempSync(join(tmpdir(), 'article content '));
  const contentDir = join(root, 'content', 'articles');
  mkdirSync(contentDir, { recursive: true });
  try {
    run({ contentDir });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('loader discovers sorted JSON files and getArticle retrieves by ID', () => withDir(({ contentDir }) => {
  writeFileSync(join(contentDir, 'b.json'), JSON.stringify(posts('b-posts')));
  writeFileSync(join(contentDir, 'a.json'), JSON.stringify(news('a-news')));
  writeFileSync(join(contentDir, 'notes.txt'), 'ignored');
  const articles = loadArticles({ contentDir });
  assert.deepEqual(articles.map((article) => article.id), ['a-news', 'b-posts']);
  assert.equal(getArticle('b-posts', articles).track, 'posts');
  assert.equal(getArticle('missing', articles), undefined);
}));

test('loader reports malformed JSON and unreadable directories with locations', () => withDir(({ contentDir }) => {
  writeFileSync(join(contentDir, 'bad.json'), '{ nope');
  assert.throws(() => loadArticles({ contentDir }), (error) => error instanceof ArticleContentError && error.issues[0].includes('bad.json: cannot parse JSON'));
  assert.throws(() => loadArticles({ contentDir: join(contentDir, 'missing') }), (error) => error instanceof ArticleContentError && error.issues[0].includes('cannot read article directory'));
}));

test('an empty article directory is an error', () => withDir(({ contentDir }) => {
  assert.throws(() => loadArticles({ contentDir }), (error) => error instanceof ArticleContentError && error.issues[0].includes('no article JSON files found'));
}));
