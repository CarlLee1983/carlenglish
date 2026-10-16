import type { APIRoute } from 'astro';
import { loadScenes } from '../lib/scenes';
import { loadArticles } from '../lib/articles';
import { loadClassics } from '../lib/classics';
import { canonicalUrl, indexedPaths } from '../lib/seo';

export const GET: APIRoute = ({ site }) => {
  const escapeXml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  const entries = indexedPaths(loadScenes(), loadArticles(), loadClassics()).map((path) => `<url><loc>${escapeXml(canonicalUrl(path, site))}</loc></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
