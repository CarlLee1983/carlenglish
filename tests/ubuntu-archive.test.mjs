import assert from 'node:assert/strict';
import test from 'node:test';
import { useUbuntuArchive } from '../scripts/use-ubuntu-archive.mjs';

test('changes only the complete Azure Ubuntu archive URL and preserves mirror priorities and other repositories', () => {
  const source = '# Ubuntu mirrors\nhttp://azure.archive.ubuntu.com/ubuntu priority:1\nhttp://archive.ubuntu.com/ubuntu priority:2\nhttp://security.ubuntu.com/ubuntu priority:3\n';
  assert.equal(useUbuntuArchive(source), '# Ubuntu mirrors\nhttps://archive.ubuntu.com/ubuntu priority:1\nhttp://archive.ubuntu.com/ubuntu priority:2\nhttp://security.ubuntu.com/ubuntu priority:3\n');
});

test('preserves indentation, trailing slashes, metadata and CRLF line endings', () => {
  assert.equal(useUbuntuArchive(' \thttp://azure.archive.ubuntu.com/ubuntu/\tpriority:1\r\n'),
    ' \thttps://archive.ubuntu.com/ubuntu/\tpriority:1\r\n');
});

test('an already configured official archive is idempotent', () => {
  const source = 'https://archive.ubuntu.com/ubuntu priority:1\n';
  assert.equal(useUbuntuArchive(source), source);
  assert.equal(useUbuntuArchive(useUbuntuArchive(source)), source);
});

test('unknown mirror configuration and partial URL matches fail closed', () => {
  for (const source of ['', 'http://example.com/ubuntu\n', 'http://azure.archive.ubuntu.com/ubuntu-other\n']) {
    assert.throws(() => useUbuntuArchive(source), /Expected an Azure Ubuntu archive/);
  }
});

test('commented archive URLs do not count as active mirror configuration', () => {
  assert.throws(() => useUbuntuArchive('# http://azure.archive.ubuntu.com/ubuntu\n# https://archive.ubuntu.com/ubuntu\n'),
    /Expected an Azure Ubuntu archive/);
});
