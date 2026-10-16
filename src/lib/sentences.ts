/** Match only at a word start; a term may match the start of a longer word (eye in eyes). */
function termPattern(term: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'iu');
}

/** Locate literal term occurrences with the same word-start rule used by validation. */
export function termMatches(text: string, term: string): { index: number; length: number }[] {
  const pattern = new RegExp(termPattern(term).source, 'giu');
  return Array.from(text.matchAll(pattern), (match) => ({ index: match.index, length: match[0].length }));
}

const sentenceSegmenter = new Intl.Segmenter('en', { granularity: 'sentence' });

export function textContainsTerm(text: string, term: string): boolean {
  return termPattern(term).test(text);
}

export function firstSentenceContaining(texts: readonly string[], term: string): string | null {
  const pattern = termPattern(term);
  for (const text of texts) {
    for (const { segment } of sentenceSegmenter.segment(text)) {
      if (pattern.test(segment)) return segment.trim();
    }
  }
  return null;
}
