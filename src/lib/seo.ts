import { createCatalog } from './catalog.ts';
import type { Article } from './articles.ts';
import type { Classic } from './classics.ts';
import type { Scene } from './scenes.ts';
import type { VocabularyLevel } from './vocabulary.ts';

export const siteDescription = '透過生活場景、新聞、社群貼文與經典文學練習英文閱讀。從短篇讀本到完整故事，依程度閱讀英文並練習理解。';

export interface SocialImage {
  src: string;
  width: number;
  height: number;
  alt: string;
  type: 'image/jpeg' | 'image/png';
}

export const defaultSocialImage: SocialImage = {
  src: '/images/social/carlenglish.jpg', width: 1200, height: 630, type: 'image/jpeg',
  alt: 'CarlEnglish：生活裡的英文，一篇一篇讀；翻開的插畫讀本呈現咖啡店對話與教室打招呼。',
};

export function sceneSocialImage(scene: Pick<Scene, 'id' | 'image'>): SocialImage {
  // Keep small illustrations at their original size and use the full-sized branded card for sharing.
  if (scene.image.width < 1200 || scene.image.height < 630) return defaultSocialImage;
  return { src: `/images/social/scenes/${scene.id}.png`, width: 1200, height: 630, type: 'image/png', alt: scene.image.alt };
}

export function canonicalUrl(pathname: string, site: URL | undefined): string {
  if (!site) throw new Error('Configure Astro.site before generating SEO URLs.');
  const url = new URL(pathname, site);
  url.search = '';
  url.hash = '';
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url.href;
}

export function indexedPaths(scenes: Scene[], articles: Pick<Article, 'id'>[] = [], classics: Pick<Classic, 'id' | 'parts'>[] = [], vocabularyLevels: VocabularyLevel['id'][] = []): string[] {
  return [
    '/',
    ...createCatalog(scenes).filter((group) => group.scenes.length > 0).map((group) => `/levels/${group.level.id}/`),
    ...vocabularyLevels.map((id) => `/vocabulary/${id}/`),
    ...scenes.map((scene) => `/scenes/${scene.id}/`),
    ...articles.map((article) => `/articles/${article.id}/`),
    ...classics.flatMap((classic) => [`/classics/${classic.id}/`, ...classic.parts.map((_, index) => `/classics/${classic.id}/${index + 1}/`)]),
  ];
}

export function breadcrumbData(items: { name: string; path: string }[], site: URL | undefined) {
  const pageUrl = canonicalUrl(items[items.length - 1].path, site);
  return {
    '@type': 'BreadcrumbList', '@id': `${pageUrl}#breadcrumbs`,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem', position: index + 1, name: item.name, item: canonicalUrl(item.path, site),
    })),
  };
}

/** 內嵌進 <script> 的 JSON：內容字串裡的 </script> 必須留在元素之內。 */
export function serializeJsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export const serializeJsonLd = serializeJsonForScript;
