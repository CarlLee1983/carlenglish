import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalUrl, defaultSocialImage, indexedPaths, sceneSocialImage, serializeJsonLd } from '../src/lib/seo.ts';

const site = new URL('https://carlenglish.gravito.dev');
const scene = (id, level) => ({ id, level });

test('JSON-LD serialization preserves hostile text as data without a raw HTML opening bracket', () => {
  const hostile = '</script><script>alert("x")</script> & <tag>\u2028\u2029';
  const serialized = serializeJsonLd({ name: hostile, nested: [hostile] });
  assert.equal(serialized.includes('<'), false);
  assert.deepEqual(JSON.parse(serialized), { name: hostile, nested: [hostile] });
});

test('canonical URLs require the configured site and discard query and fragment', () => {
  assert.equal(canonicalUrl('/levels/beginner/?q=coffee#story', site), 'https://carlenglish.gravito.dev/levels/beginner/');
  assert.equal(canonicalUrl('/scenes/cafe-breakfast/?category=飲食', site), 'https://carlenglish.gravito.dev/scenes/cafe-breakfast/');
  assert.equal(canonicalUrl('/', site), 'https://carlenglish.gravito.dev/');
  assert.throws(() => canonicalUrl('/scenes/cafe-breakfast/', undefined), /site|origin|URL/i);
});

test('indexed paths include the home, populated levels, and every current scene in order', () => {
  assert.deepEqual(indexedPaths([]), ['/']);
  const scenes = [scene('a', '中級'), scene('b', '入門'), scene('c', '高級'), scene('d', '初級至初中級')];
  assert.deepEqual(indexedPaths(scenes), [
    '/', '/levels/beginner/', '/levels/intermediate/', '/levels/advanced/',
    '/scenes/a/', '/scenes/b/', '/scenes/c/', '/scenes/d/',
  ]);
  assert.deepEqual(indexedPaths([], [{ id: 'news-a' }, { id: 'posts-b' }]), ['/', '/articles/news-a/', '/articles/posts-b/']);
  assert.deepEqual(indexedPaths(scenes, [{ id: 'news-a' }]), [
    '/', '/levels/beginner/', '/levels/intermediate/', '/levels/advanced/',
    '/scenes/a/', '/scenes/b/', '/scenes/c/', '/scenes/d/', '/articles/news-a/',
  ]);
});

test('small illustrations use the full-size brand card; suitable art gets a scene share image', () => {
  const image = { src: '/images/scenes/sample.webp', alt: 'Sample scene', width: 1200, height: 800 };
  assert.deepEqual(sceneSocialImage({ id: 'sample', image }), {
    src: '/images/social/scenes/sample.png', alt: image.alt, width: 1200, height: 630, type: 'image/png',
  });
  assert.strictEqual(sceneSocialImage({ id: 'small', image: { ...image, width: 1199 } }), defaultSocialImage);
  assert.strictEqual(sceneSocialImage({ id: 'short', image: { ...image, height: 629 } }), defaultSocialImage);
});
