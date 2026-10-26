import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectGitChanges, planContentChange } from './content-change.mjs';

export function parseArguments(args) {
  let base = 'HEAD';
  let planOnly = false;
  let sawBase = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--plan' && !planOnly) planOnly = true;
    else if (args[i] === '--base' && !sawBase && args[i + 1] && !['--plan', '--base'].includes(args[i + 1])) {
      base = args[++i];
      sawBase = true;
    } else throw new Error('Usage: node scripts/verify-content-change.mjs [--base REF] [--plan]');
  }
  return { base, planOnly };
}

export function verificationCommands(plan, ci = '') {
  if (ci || plan.mode === 'full') return [['run', 'verify']];
  return [
    ['run', 'verify:static'],
    ['exec', 'playwright', 'test', 'browser.spec.ts', 'pronunciation.spec.ts', 'seo.spec.ts'],
  ];
}

export function runVerification(plan, env = process.env, run = (command, childEnv) => spawnSync('pnpm', command, { env: childEnv, stdio: 'inherit' })) {
  const cleanEnv = { ...env };
  delete cleanEnv.CARLENGLISH_SCENE_IDS;
  for (const command of verificationCommands(plan, env.CI)) {
    const childEnv = { ...cleanEnv };
    if (plan.mode === 'scenes' && !env.CI && command[0] === 'exec') childEnv.CARLENGLISH_SCENE_IDS = JSON.stringify(plan.sceneIds);
    const result = run(command, childEnv);
    if (result.error) throw result.error;
    if (result.status !== 0) return result.status ?? 1;
  }
  return 0;
}

export function main(args = process.argv.slice(2)) {
  const { base, planOnly } = parseArguments(args);
  const cwd = process.cwd();
  const scope = collectGitChanges((gitArgs) => execFileSync('git', gitArgs, { cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }), base);
  let plan;
  try {
    const dir = join(cwd, 'content/scenes');
    const scenes = readdirSync(dir).filter((name) => name.endsWith('.json')).sort().map((name) => {
      const path = `content/scenes/${name}`;
      try { return { path, data: JSON.parse(readFileSync(join(cwd, path), 'utf8')) }; }
      catch (error) { return { path, error: error.message }; }
    });
    const existingPaths = new Set(scope.changes.map(({ path }) => path).filter((path) => existsSync(join(cwd, path)) && statSync(join(cwd, path)).isFile()));
    plan = planContentChange({ ...scope, scenes, existingPaths });
  } catch (error) {
    plan = { mode: 'full', sceneIds: [], reason: `Cannot inspect current scene content: ${error.message}` };
  }
  if (process.env.CI) plan = { mode: 'full', sceneIds: [], reason: 'CI always runs the complete verification suite.' };
  console.log(planOnly ? 'PLAN ONLY — no checks have run; this is not validation evidence.' : 'Content-change verification plan:');
  console.log(JSON.stringify({ ...scope, changes: undefined, ...plan }, null, 2));
  const commands = verificationCommands(plan, process.env.CI);
  for (const command of commands) console.log(`  pnpm ${command.join(' ')}`);
  if (planOnly) return 0;
  return runVerification(plan);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { process.exitCode = main(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
