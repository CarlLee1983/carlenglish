/** Match only at a word start; a term may match the start of a longer word (eye in eyes). */
function termPattern(term: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'iu');
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
