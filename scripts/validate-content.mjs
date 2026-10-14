import { loadScenes } from '../src/lib/scenes.ts';

try {
  const scenes = loadScenes();
  console.log(`Validated ${scenes.length} scene(s): ${scenes.map((scene) => scene.id).join(', ')}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
