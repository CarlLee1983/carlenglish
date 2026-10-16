import type { ClassicAnnotation } from './classics.ts';
import { termMatches } from './sentences.ts';

export interface ClassicTextSegment { text: string; annotationIndex?: number; overlappingAnnotationIndices?: number[] }

/** Keep every annotation at its first occurrence, sharing a position when terms overlap. */
export function annotationSegments(paragraphs: readonly string[], annotations: readonly ClassicAnnotation[]): ClassicTextSegment[][] {
  const candidates = paragraphs.flatMap((paragraph, paragraphIndex) => annotations.flatMap((annotation, annotationIndex) =>
    termMatches(paragraph, annotation.english).map(({ index, length }) => ({ paragraphIndex, annotationIndex, index, length }))));
  candidates.sort((a, b) => a.paragraphIndex - b.paragraphIndex || a.index - b.index || b.length - a.length || a.annotationIndex - b.annotationIndex);
  const chosen: (typeof candidates[number] & { overlappingAnnotationIndices: number[] })[] = [];
  const used = new Set<number>();
  for (const candidate of candidates) {
    if (used.has(candidate.annotationIndex)) continue;
    used.add(candidate.annotationIndex);
    const overlap = chosen.find((other) => other.paragraphIndex === candidate.paragraphIndex && candidate.index < other.index + other.length && other.index < candidate.index + candidate.length);
    if (overlap) overlap.overlappingAnnotationIndices.push(candidate.annotationIndex);
    else chosen.push({ ...candidate, overlappingAnnotationIndices: [] });
  }
  return paragraphs.map((paragraph, paragraphIndex) => {
    const segments: ClassicTextSegment[] = [];
    let from = 0;
    for (const { index, length, annotationIndex, overlappingAnnotationIndices } of chosen.filter((item) => item.paragraphIndex === paragraphIndex)) {
      if (index > from) segments.push({ text: paragraph.slice(from, index) });
      segments.push({ text: paragraph.slice(index, index + length), annotationIndex, overlappingAnnotationIndices });
      from = index + length;
    }
    if (from < paragraph.length || segments.length === 0) segments.push({ text: paragraph.slice(from) });
    return segments;
  });
}
