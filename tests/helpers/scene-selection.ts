// Only the per-scene loops use this helper; shared catalog/audio/SEO checks keep all scenes.
export function selectScenes<T extends { id: string }>(
  scenes: T[],
  env: { CARLENGLISH_SCENE_IDS?: string; CI?: string } = process.env,
): T[] {
  const raw = env.CARLENGLISH_SCENE_IDS;
  if (raw === undefined) return scenes;
  if (env.CI) throw new Error('CARLENGLISH_SCENE_IDS is local-only and must not be set in CI.');
  let ids: unknown;
  try { ids = JSON.parse(raw); }
  catch { throw new Error('CARLENGLISH_SCENE_IDS must be a nonempty JSON array of scene IDs.'); }
  const known = new Set(scenes.map((scene) => scene.id));
  if (!Array.isArray(ids) || ids.length === 0 || ids.some((id) => typeof id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || !known.has(id)) || new Set(ids).size !== ids.length) {
    throw new Error('CARLENGLISH_SCENE_IDS must contain unique, valid, known scene IDs.');
  }
  const selected = new Set(ids);
  return scenes.filter((scene) => selected.has(scene.id));
}
