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

test('AWS regional archives use the official archive without changing priorities or security sources', () => {
  const source = 'http://us-east-2.ec2.archive.ubuntu.com/ubuntu priority:1\nhttp://azure.archive.ubuntu.com/ubuntu priority:2\nhttp://security.ubuntu.com/ubuntu priority:3\n';
  assert.equal(useUbuntuArchive(source), 'https://archive.ubuntu.com/ubuntu priority:1\nhttps://archive.ubuntu.com/ubuntu priority:2\nhttp://security.ubuntu.com/ubuntu priority:3\n');
});

test('supported cloud regions preserve HTTPS, indentation, metadata, trailing slashes and CRLF', () => {
  for (const host of ['ap-southeast-2.ec2', 'eu-west-1.ec2', 'us-gov-east-1.ec2', 'azure']) {
    assert.equal(useUbuntuArchive(` \thttps://${host}.archive.ubuntu.com/ubuntu/\tpriority:1\r\n`),
      ' \thttps://archive.ubuntu.com/ubuntu/\tpriority:1\r\n');
  }
});

test('unknown mirror configuration and partial URL matches fail closed', () => {
  for (const source of ['', 'http://example.com/ubuntu\n', 'http://azure.archive.ubuntu.com/ubuntu-other\n',
    'http://us-east-2.ec2.archive.ubuntu.com/ubuntu-other\n',
    'http://us-east-2.ec2.archive.ubuntu.com.example.com/ubuntu\n',
    'http://example.ec2.archive.ubuntu.com/ubuntu\n']) {
    assert.throws(() => useUbuntuArchive(source), /Expected a supported Ubuntu cloud archive/);
  }
});

test('commented archive URLs do not count as active mirror configuration', () => {
  assert.throws(() => useUbuntuArchive('# http://azure.archive.ubuntu.com/ubuntu\n# http://us-east-2.ec2.archive.ubuntu.com/ubuntu\n# https://archive.ubuntu.com/ubuntu\n'),
    /Expected a supported Ubuntu cloud archive/);
});
