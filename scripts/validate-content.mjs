import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadArticles } from '../src/lib/articles.ts';
import { loadScenes } from '../src/lib/scenes.ts';
import { createCatalog } from '../src/lib/catalog.ts';
import { crossTypeDuplicateIds } from '../src/lib/validation.ts';

// 載入成功後各檔的 id 已通過驗證；這裡重讀 id 只為了找出跨類型重複並指出來源檔。
function idsIn(dir) {
  return readdirSync(dir).filter((name) => name.endsWith('.json')).sort()
    .map((name) => ({ id: JSON.parse(readFileSync(join(dir, name), 'utf8')).id, source: join(dir, name) }));
}

try {
  const scenes = loadScenes();
  createCatalog(scenes);
  const articles = loadArticles();
  const duplicates = crossTypeDuplicateIds(idsIn(join(process.cwd(), 'content', 'scenes')), idsIn(join(process.cwd(), 'content', 'articles')));
  if (duplicates.length) throw new Error(`Invalid content:\n${duplicates.map((issue) => `- ${issue}`).join('\n')}`);
  console.log(`Validated ${scenes.length} scene(s): ${scenes.map((scene) => scene.id).join(', ')}`);
  console.log(`Validated ${articles.length} article(s): ${articles.map((article) => article.id).join(', ')}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
