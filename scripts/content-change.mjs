const idPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const scenePattern = /^content\/scenes\/([a-z0-9]+(?:-[a-z0-9]+)*)\.json$/;
const imagePattern = /^public\/images\/scenes\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:png|jpe?g|webp)$/i;
const audioPattern = /^public\/audio\/(?:sentences\/[a-z0-9-]+\/[a-zA-Z0-9_-]+|(?:phrases|words)\/[a-zA-Z0-9_-]+)\.mp3$/;

const full = (reason) => ({ mode: 'full', reason, sceneIds: [] });

// All inputs describe the current working tree, never a cached validation result.
export function planContentChange({ changes, scenes, existingPaths, baseError }) {
  if (baseError) return full(baseError);
  const byPath = new Map();
  const references = new Map();
  const ids = new Set();
  for (const entry of scenes) {
    const scene = entry.data;
    const match = scenePattern.exec(entry.path);
    if (entry.error || !match || !scene || !idPattern.test(scene.id ?? '') || scene.id !== match[1] || ids.has(scene.id)) {
      return full(`Invalid scene JSON or ID: ${entry.path}`);
    }
    if (!scene.image || typeof scene.image.src !== 'string' || !['sentences', 'phrases', 'words'].every((key) => Array.isArray(scene[key]) && scene[key].length > 0)) {
      return full(`Invalid scene asset references: ${entry.path}`);
    }
    ids.add(scene.id);
    byPath.set(entry.path, scene.id);
    const assets = [scene.image.src, ...['sentences', 'phrases', 'words'].flatMap((key) => scene[key].map((item) => item?.audio?.src))];
    for (const src of assets) {
      if (typeof src !== 'string' || !(imagePattern.test(`public${src}`) || audioPattern.test(`public${src}`))) {
        return full(`Invalid scene asset references: ${entry.path}`);
      }
      const asset = `public${src}`;
      if (!references.has(asset)) references.set(asset, new Set());
      references.get(asset).add(scene.id);
    }
  }
  const selected = new Set();
  for (const { path, status } of changes) {
    if (!['A', 'M', '?'].includes(status)) return full(`Deleted, renamed, or unsupported change (${status}): ${path}`);
    if (scenePattern.test(path)) {
      const id = byPath.get(path);
      if (!id) return full(`Changed scene is missing or invalid: ${path}`);
      selected.add(id);
    } else if (imagePattern.test(path) || audioPattern.test(path)) {
      const owners = references.get(path);
      if (!owners || !existingPaths.has(path)) return full(`Changed asset is missing or not referenced: ${path}`);
      for (const id of owners) selected.add(id);
    } else if (path !== 'README.md' && !/^docs\/.+/.test(path)) {
      return full(`Change outside scene content and companion documentation: ${path}`);
    }
  }
  if (!selected.size) return full('No changed scenes could be selected.');
  return { mode: 'scenes', reason: 'Only scene content, referenced scene assets, and companion documentation changed.', sceneIds: [...selected].sort() };
}

function parseNameStatus(output) {
  const fields = output.split('\0');
  if (fields.at(-1) === '') fields.pop();
  const changes = [];
  for (let i = 0; i < fields.length;) {
    const status = fields[i++];
    const path = fields[i++];
    if (!status || path === undefined) throw new Error('Invalid NUL-delimited git change output.');
    changes.push({ status, path });
    // --no-renames normally yields D/A; keep injected/unexpected R/C output conservative.
    if (/^[RC]/.test(status)) {
      const destination = fields[i++];
      if (destination === undefined) throw new Error('Missing rename destination.');
      changes.push({ status, path: destination });
    }
  }
  return changes;
}

// The runner receives argument arrays, so refs and paths never become shell code.
export function collectGitChanges(runGit, base = 'HEAD') {
  try {
    if (typeof base !== 'string' || !base || base.startsWith('-') || base.includes('\0')) throw new Error('Base must be a non-option Git ref.');
    const baseCommit = runGit(['rev-parse', '--verify', '--end-of-options', `${base}^{commit}`]).trim();
    const headCommit = runGit(['rev-parse', '--verify', 'HEAD^{commit}']).trim();
    if (!/^[a-f0-9]{40,64}$/.test(baseCommit) || !/^[a-f0-9]{40,64}$/.test(headCommit)) throw new Error('Git did not resolve a fixed commit.');
    // Separate index/worktree diffs retain canceled changes rather than hiding them in a net diff.
    const changes = [
      ...parseNameStatus(runGit(['diff', '--name-status', '-z', '--no-renames', baseCommit, headCommit, '--'])),
      ...parseNameStatus(runGit(['diff', '--cached', '--name-status', '-z', '--no-renames', headCommit, '--'])),
      ...parseNameStatus(runGit(['diff', '--name-status', '-z', '--no-renames', '--'])),
      ...runGit(['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean).map((path) => ({ status: '?', path })),
    ];
    return { baseCommit, headCommit, changes };
  } catch (error) {
    return { changes: [], baseError: `Cannot establish change scope for base ${JSON.stringify(base)}: ${error.message}` };
  }
}
