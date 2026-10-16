import assert from 'node:assert/strict';
import test from 'node:test';
import { firstSentenceContaining } from '../src/lib/sentences.ts';

test('finds the first sentence containing a term', () => {
  assert.equal(
    firstSentenceContaining(['The mayor spoke first. Then the director arrived late.', 'The director left early.'], 'director'),
    'Then the director arrived late.',
  );
});

test('rejects a term that spans two sentences', () => {
  assert.equal(firstSentenceContaining(['Yesterday Mr. Lee arrived late.'], 'Mr. Lee'), null);
});

test('returns null when the term does not appear', () => {
  assert.equal(firstSentenceContaining(['Her eyes were tired.'], 'telescope'), null);
});
