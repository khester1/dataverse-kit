import { describe, it, expect } from 'vitest';
import { renumberCitations, splitTextByCitations, extractCitationMarkers } from '../citations';
import type { AgentSource } from '../protocol';

const sources: AgentSource[] = [
  { id: 's1', title: 'One', kind: 'dataverse' },
  { id: 's2', title: 'Two', kind: 'dataverse' },
  { id: 's3', title: 'Three', kind: 'knowledge' },
  { id: 's4', title: 'Four', kind: 'document' },
  { id: 's5', title: 'Five', kind: 'web' },
];

describe('renumberCitations', () => {
  // ★★ FIVE sources in, TWO cited, out of order. This is the case the function exists for:
  //    a grounding panel listing everything the retriever returned implies the answer rests
  //    on twelve things when it rests on two. A fixture where every source is cited cannot
  //    tell a correct implementation from one that lists everything it was handed.
  it('drops uncited sources and renumbers in first-appearance order', () => {
    const { text, used, citations } = renumberCitations(
      'Policy says approval [3], and this one is £6,200 [1].',
      sources,
    );

    expect(used).toHaveLength(2);
    expect(used.map((s) => s.id)).toEqual(['s3', 's1']);
    expect(text).toBe('Policy says approval [1], and this one is £6,200 [2].');
    expect(citations).toEqual([
      { marker: '1', sourceId: 's3' },
      { marker: '2', sourceId: 's1' },
    ]);
  });

  it('keeps a repeated marker as ONE source and one number', () => {
    const { text, used } = renumberCitations('See [2]. As [2] says, yes.', sources);
    expect(used.map((s) => s.id)).toEqual(['s2']);
    expect(text).toBe('See [1]. As [1] says, yes.');
  });

  it('returns nothing used when the text cites nothing', () => {
    const { used, text } = renumberCitations('No citations here.', sources);
    expect(used).toEqual([]);
    expect(text).toBe('No citations here.');
  });

  it('reads the Azure OpenAI annotation form too', () => {
    // The shape AOAI actually emits, not the bracket form the docs show.
    expect(extractCitationMarkers('Yes【2:0†source】indeed.').map((m) => m.marker)).toEqual(['2']);
  });
});

describe('splitTextByCitations', () => {
  it('splits into text and citation runs the renderer can map', () => {
    const segments = splitTextByCitations('A [1] B', [{ marker: '1', sourceId: 's1' }]);
    expect(segments).toHaveLength(3);
    expect(segments.map((s) => s.kind)).toEqual(['text', 'citation', 'text']);
    expect(segments[1]).toMatchObject({ marker: '1', sourceId: 's1' });
  });

  it('returns a single run when there are no markers', () => {
    expect(splitTextByCitations('plain', [])).toEqual([{ kind: 'text', text: 'plain' }]);
  });
});
