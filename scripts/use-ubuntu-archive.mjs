import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function useUbuntuArchive(contents) {
  const azure = /^([ \t]*)http:\/\/azure\.archive\.ubuntu\.com\/ubuntu(\/?)(?=[ \t\r\n]|$)/gm;
  const updated = contents.replace(azure, '$1https://archive.ubuntu.com/ubuntu$2');
  assert.match(updated, /^[ \t]*https:\/\/archive\.ubuntu\.com\/ubuntu\/?(?=[ \t\r\n]|$)/m,
    'Expected an Azure Ubuntu archive or the configured official archive in the runner mirror list');
  return updated;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const path = '/etc/apt/apt-mirrors.txt';
  const original = readFileSync(path, 'utf8');
  const updated = useUbuntuArchive(original);
  if (updated !== original) writeFileSync(path, updated);
  console.log('Ubuntu official archive configured for Playwright system dependencies.');
}
