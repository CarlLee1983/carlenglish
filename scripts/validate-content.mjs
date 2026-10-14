import { loadScenes } from '../src/lib/scenes.ts';
import { createCatalog } from '../src/lib/catalog.ts';

try {
  const scenes = loadScenes();
  createCatalog(scenes);
  console.log(`Validated ${scenes.length} scene(s): ${scenes.map((scene) => scene.id).join(', ')}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
