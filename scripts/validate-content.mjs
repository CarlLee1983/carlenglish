import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { articleMetrics, loadArticles, stageWarnings } from '../src/lib/articles.ts';
import { loadScenes } from '../src/lib/scenes.ts';
import { loadWordLists } from '../src/lib/wordlists.ts';
import { loadVocabularyCatalog } from '../src/lib/vocabulary.ts';
import { classicWarnings, loadClassics } from '../src/lib/classics.ts';
import { createCatalog, sceneCategories } from '../src/lib/catalog.ts';
import { crossTypeDuplicateIds } from '../src/lib/validation.ts';

// 載入成功後各檔的 id 已通過驗證；這裡重讀 id 只為了找出跨類型重複並指出來源檔。
function idsIn(dir) {
  return readdirSync(dir).filter((name) => name.endsWith('.json')).sort()
    .map((name) => ({ id: JSON.parse(readFileSync(join(dir, name), 'utf8')).id, source: join(dir, name) }));
}

try {
  const scenes = loadScenes();
  const invalidCategoryScenes = scenes.filter((scene) => !sceneCategories.includes(scene.category));
  if (invalidCategoryScenes.length) {
    throw new Error(`Invalid scene categories:\n${invalidCategoryScenes.map((scene) => `- scene "${scene.id}": "${scene.category}" is not in canonical categories (${sceneCategories.join('、')})`).join('\n')}`);
  }
  createCatalog(scenes);
  const articles = loadArticles();
  const wordLists = loadWordLists();
  const vocabulary = loadVocabularyCatalog({ wordLists });
  const classics = loadClassics();
  const duplicates = crossTypeDuplicateIds(
    idsIn(join(process.cwd(), 'content', 'scenes')),
    idsIn(join(process.cwd(), 'content', 'articles')),
    wordLists.map((list) => ({ id: list.id, source: join(process.cwd(), 'content', 'wordlists', list.id, 'wordlist.json') })),
    idsIn(join(process.cwd(), 'content', 'classics')),
  );
  if (duplicates.length) throw new Error(`Invalid content:\n${duplicates.map((issue) => `- ${issue}`).join('\n')}`);
  console.log(`Validated ${scenes.length} scene(s): ${scenes.map((scene) => scene.id).join(', ')}`);
  console.log(`Validated ${articles.length} article(s): ${articles.map((article) => article.id).join(', ')}`);
  console.log(`Validated ${wordLists.length} word list(s): ${wordLists.map((list) => `${list.id} (${list.entries.length} entries)`).join(', ')}`);
  console.log(`Validated vocabulary banks: ${vocabulary.map((bank) => `${bank.level.id} (${bank.entries.length} entries)`).join(', ')}`);
  console.log(`Validated ${classics.length} classic(s): ${classics.map((classic) => classic.id).join(', ')}`);
  for (const article of articles) {
    const { words, averageSentenceLength } = articleMetrics(article);
    console.log(`${article.stage} ${article.id}: ${words} words, ${averageSentenceLength.toFixed(1)} words/sentence`);
  }
  // 長度參考只警告，不影響結束碼
  for (const article of articles) {
    for (const warning of stageWarnings(article)) console.error(`warning: ${warning}`);
  }
  for (const classic of classics) {
    for (const warning of classicWarnings(classic)) console.error(`warning: ${warning}`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
