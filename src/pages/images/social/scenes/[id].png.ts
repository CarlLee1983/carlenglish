import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { loadScenes, type Scene } from '../../../../lib/scenes';
import { sceneSocialImage } from '../../../../lib/seo';

export function getStaticPaths() {
  return loadScenes().map((scene) => ({ params: { id: scene.id }, props: { scene } }));
}

export const GET: APIRoute = async ({ props }) => {
  const scene: Scene = props.scene;
  // The loader validates this local asset; transform its bytes without moving or duplicating source artwork.
  const source = await readFile(join(process.cwd(), 'public', scene.image.src.slice(1)));
  const { data, info } = await sharp(source).rotate().resize(1200, 630, { fit: 'cover', position: 'north', withoutEnlargement: true }).png().toBuffer({ resolveWithObject: true });
  if (info.format !== 'png') throw new Error(`Scene "${scene.id}" social image must be PNG, received ${info.format}.`);
  const expected = sceneSocialImage(scene);
  if (expected.type === 'image/png' && (info.width !== expected.width || info.height !== expected.height)) {
    throw new Error(`Scene "${scene.id}" social image dimensions do not match its Open Graph metadata.`);
  }
  return new Response(new Uint8Array(data), { headers: { 'Content-Type': 'image/png' } });
};
