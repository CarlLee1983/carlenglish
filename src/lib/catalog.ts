import { ContentError, type Scene } from './scenes.ts';

export const learningLevels = [
  { id: 'beginner', name: '初級', english: 'Beginner', summary: '從看圖理解、簡單句子開始，練習日常會用到的英文。', focus: '看圖理解 · 日常用語' },
  { id: 'intermediate', name: '中級', english: 'Intermediate', summary: '讀懂情境中的對話，練習說明想法、安排事情。', focus: '情境對話 · 表達想法' },
  { id: 'advanced', name: '高級', english: 'Advanced', summary: '練習較深入的閱讀，理解觀點與更細緻的表達。', focus: '深入閱讀 · 理解觀點' },
] as const;

export type LearningLevel = typeof learningLevels[number];
type LevelId = LearningLevel['id'];

// Keep the original editorial label while giving every scene one unambiguous home.
const levelGroups = new Map<string, LevelId>([
  ['入門', 'beginner'], ['初級', 'beginner'], ['初級至初中級', 'beginner'],
  ['中級', 'intermediate'], ['中級至中高級', 'intermediate'],
  ['中高級', 'advanced'], ['進階', 'advanced'], ['高級', 'advanced'],
]);

export function getLearningLevel(scene: Pick<Scene, 'id' | 'level'>): LearningLevel {
  const id = levelGroups.get(scene.level);
  const level = learningLevels.find((item) => item.id === id);
  if (!level) throw new ContentError([`scene "${scene.id}".level: unsupported level "${scene.level}"; use ${[...levelGroups.keys()].join('、')}`]);
  return level;
}

export function createCatalog(scenes: Scene[]) {
  const groups = learningLevels.map((level) => ({ level, scenes: [] as Scene[], categories: [] as string[] }));
  for (const scene of scenes) {
    const level = getLearningLevel(scene);
    groups.find((group) => group.level.id === level.id)!.scenes.push(scene);
  }
  for (const group of groups) group.categories = [...new Set(group.scenes.map((scene) => scene.category))];
  return groups;
}

export function getRelatedScenes(scene: Scene, scenes: Scene[]): Scene[] {
  const level = getLearningLevel(scene);
  return scenes.filter((other) => other.id !== scene.id && getLearningLevel(other).id === level.id).slice(0, 3);
}
