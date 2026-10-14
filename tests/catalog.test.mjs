import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ContentError } from '../src/lib/scenes.ts';
import { learningLevels, getLearningLevel, createCatalog, getRelatedScenes } from '../src/lib/catalog.ts';

const scene = (id, level, category) => ({ id, level, category });

test('learning levels have a stable order and map every supported content label', () => {
  assert.deepEqual(learningLevels.map(({ id, name }) => [id, name]), [
    ['beginner', '初級'], ['intermediate', '中級'], ['advanced', '高級'],
  ]);
  for (const [label, id] of [
    ['入門', 'beginner'], ['初級', 'beginner'], ['初級至初中級', 'beginner'],
    ['中級', 'intermediate'], ['中級至中高級', 'intermediate'],
    ['中高級', 'advanced'], ['進階', 'advanced'], ['高級', 'advanced'],
  ]) {
    assert.strictEqual(getLearningLevel(scene(`example-${id}`, label)), learningLevels.find((level) => level.id === id));
  }
  assert.throws(() => getLearningLevel(scene('unknown-scene', '未分類')),
    (error) => error instanceof ContentError && error.message.includes('unknown-scene') && error.message.includes('未分類'));
});

test('catalog includes empty levels and preserves input order and unique categories within each level', () => {
  const scenes = [
    scene('a', '中級', '交通'), scene('b', '入門', '飲食'), scene('c', '初級', '飲食'),
    scene('d', '高級', '飲食'), scene('e', '初級至初中級', '購物'), scene('f', '中級', '校園'),
  ];
  const catalog = createCatalog(scenes);
  assert.deepEqual(catalog.map(({ level }) => level.id), ['beginner', 'intermediate', 'advanced']);
  assert.deepEqual(catalog.map(({ scenes }) => scenes.map(({ id }) => id)), [['b', 'c', 'e'], ['a', 'f'], ['d']]);
  assert.deepEqual(catalog.map(({ categories }) => categories), [['飲食', '購物'], ['交通', '校園'], ['飲食']]);
  assert.deepEqual(createCatalog([]).map(({ scenes, categories }) => [scenes, categories]), [[[], []], [[], []], [[], []]]);
});

test('related scenes exclude the current scene, stay within its level, preserve order, and stop at three', () => {
  const scenes = [
    scene('a', '入門', 'A'), scene('x', '中級', 'X'), scene('b', '初級', 'B'),
    scene('c', '初級至初中級', 'C'), scene('d', '初級', 'D'), scene('e', '初級', 'E'),
    scene('y', '高級', 'Y'),
  ];
  assert.deepEqual(getRelatedScenes(scenes[0], scenes).map(({ id }) => id), ['b', 'c', 'd']);
  assert.deepEqual(getRelatedScenes(scenes[1], scenes), []);
  assert.deepEqual(getRelatedScenes(scenes[6], scenes), []);
});

test('the latest production scene inventory is assigned to exactly one level each', () => {
  const contentDir = join(process.cwd(), 'content/scenes');
  const scenes = readdirSync(contentDir).filter((name) => name.endsWith('.json')).sort()
    .map((name) => JSON.parse(readFileSync(join(contentDir, name), 'utf8')));
  assert.ok(scenes.length >= 43, 'the 43-scene baseline must remain available');
  assert.equal(new Set(scenes.map(({ id }) => id)).size, scenes.length);
  const catalog = createCatalog(scenes);
  assert.deepEqual(catalog.map(({ level }) => level.id), ['beginner', 'intermediate', 'advanced']);
  assert.equal(catalog.reduce((count, group) => count + group.scenes.length, 0), scenes.length);
  assert.deepEqual(new Set(catalog.flatMap((group) => group.scenes.map(({ id }) => id))), new Set(scenes.map(({ id }) => id)));
  for (const scene of scenes) {
    const owner = getLearningLevel(scene);
    assert.equal(catalog.filter((group) => group.level.id === owner.id && group.scenes.some(({ id }) => id === scene.id)).length, 1, scene.id);
  }
});
