import { createHash } from 'node:crypto';

export function canonicalSentenceText(sentence: { segments: { text: string }[] }): string {
  return sentence.segments.map((segment) => segment.text).join('');
}

export function textSha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}
