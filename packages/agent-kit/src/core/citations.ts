import type { AgentCitation, AgentSource } from './protocol';

export interface CitationSegment {
  kind: 'text' | 'citation';
  text: string;
  marker?: string;
  sourceId?: string;
}

/** `[1]` and the Azure OpenAI annotation form `【3:0†source】`. */
const BRACKET_MARKER = /\[(\d{1,3})\]/g;
const AOAI_MARKER = /【(\d{1,3}):\d+†[^】]*】/g;

export interface ExtractedMarker {
  marker: string;
  index: number;
  length: number;
}

/** Every citation marker in the text, in order of appearance. */
export function extractCitationMarkers(text: string): ExtractedMarker[] {
  const found: ExtractedMarker[] = [];
  for (const re of [BRACKET_MARKER, AOAI_MARKER]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      found.push({ marker: m[1], index: m.index, length: m[0].length });
    }
  }
  return found.sort((a, b) => a.index - b.index);
}

/**
 * Renumber an answer's citations to `[1]`, `[2]`… in first-appearance order, and return
 * ONLY the sources the text actually cites.
 *
 * ★★ Dropping uncited sources is the point of this function, not a side effect. A grounding
 *    panel listing twelve retrieved chunks under a two-citation answer is the defect it
 *    exists to prevent: it implies the answer rests on twelve things when it rests on two,
 *    which is exactly the kind of overstated provenance that makes a citation panel
 *    decorative rather than trustworthy.
 */
export function renumberCitations(
  text: string,
  sources: readonly AgentSource[],
): { text: string; used: AgentSource[]; citations: AgentCitation[] } {
  const markers = extractCitationMarkers(text);
  const order: string[] = [];
  for (const { marker } of markers) if (!order.includes(marker)) order.push(marker);

  const byOriginal = new Map<string, number>();
  order.forEach((marker, i) => byOriginal.set(marker, i + 1));

  const used: AgentSource[] = [];
  const citations: AgentCitation[] = [];
  for (const marker of order) {
    // Markers are 1-based positions into the ORIGINAL source list.
    const source = sources[Number(marker) - 1];
    if (!source) continue;
    used.push(source);
    citations.push({ marker: String(byOriginal.get(marker)), sourceId: source.id });
  }

  let out = '';
  let cursor = 0;
  for (const { marker, index, length } of markers) {
    out += text.slice(cursor, index);
    const renumbered = byOriginal.get(marker);
    out += renumbered === undefined ? '' : `[${renumbered}]`;
    cursor = index + length;
  }
  out += text.slice(cursor);

  return { text: out, used, citations };
}

/** Split text into runs so the renderer can put a chip where each marker was. */
export function splitTextByCitations(
  text: string,
  citations: readonly AgentCitation[],
): CitationSegment[] {
  const markers = extractCitationMarkers(text);
  if (markers.length === 0) return text ? [{ kind: 'text', text }] : [];

  const segments: CitationSegment[] = [];
  let cursor = 0;
  for (const { marker, index, length } of markers) {
    if (index > cursor) segments.push({ kind: 'text', text: text.slice(cursor, index) });
    const citation = citations.find((c) => c.marker === marker);
    segments.push({
      kind: 'citation',
      text: `[${marker}]`,
      marker,
      sourceId: citation?.sourceId,
    });
    cursor = index + length;
  }
  if (cursor < text.length) segments.push({ kind: 'text', text: text.slice(cursor) });
  return segments;
}
