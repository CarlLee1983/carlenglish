import type { APIRoute } from 'astro';
import { canonicalUrl } from '../lib/seo';

export const GET: APIRoute = ({ site }) => new Response(
  `User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap.xml', canonicalUrl('/', site)).href}\n`,
  { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
);
