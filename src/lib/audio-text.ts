import { createHash } from 'node:crypto';

export function canonicalStoryText(sentences: { segments: { text: string }[] }[]): string {
  return sentences.map((sentence) => sentence.segments.map((segment) => segment.text).join('')).join(' ');
}

export function textSha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}
