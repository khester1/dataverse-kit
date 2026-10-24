import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import userEvent from '@testing-library/user-event';
import { CitationList, ProviderAttribution, GroundingPanel, AnswerWithCitations, SourceCard } from '..';
import { renderWithKit, expectNoAxeViolations } from '../../conversation/__tests__/testUtils';
import type { AgentSource } from '../../core';

const sources: AgentSource[] = [
  { id: 's1', title: 'Contoso Ltd', kind: 'dataverse', recordId: 'r1', snippet: 'Revenue £4.2m' },
  { id: 's2', title: 'Case 4417', kind: 'dataverse', recordId: 'r2' },
  { id: 's3', title: 'KB-208 credit policy', kind: 'knowledge', snippet: 'Over £5,000 needs approval', score: 0.82 },
  { id: 's4', title: 'Statement-Mar.pdf', kind: 'document' },
  { id: 's5', title: 'Companies House', kind: 'web' },
];

// Cites [3] then [1]. Out of order, and three of five never referenced.
const ANSWER = 'Policy says approval [3], and this one is £6,200 [1].';

describe('CitationList', () => {
  // ★★ THE ROW THE COMPONENT EXISTS FOR. A retriever returns five chunks; the answer rests on
  //    two. Listing all five implies provenance the answer does not have — the thing that
  //    makes a citation panel decorative rather than trustworthy. A fixture where every source
  //    is cited cannot tell a correct implementation from one that lists everything.
  it('shows only the CITED sources, renumbered in first-appearance order', async () => {
    const user = userEvent.setup();
    const { getByRole, queryByText, getByText } = renderWithKit(
      <CitationList text={ANSWER} sources={sources} defaultOpen />,
    );
    expect(getByRole('button', { name: /2 sources/ })).toBeTruthy();

    expect(getByText('KB-208 credit policy')).toBeTruthy(); // cited as [3] -> renumbered [1]
    expect(getByText('Contoso Ltd')).toBeTruthy(); // cited as [1] -> renumbered [2]
    expect(queryByText('Case 4417')).toBeNull();
    expect(queryByText('Statement-Mar.pdf')).toBeNull();
    expect(queryByText('Companies House')).toBeNull();

    const markers = [...getByRole('region').querySelectorAll('li')].map(
      (li) => li.textContent?.match(/\[(\d)\]/)?.[1],
    );
    expect(markers).toEqual(['1', '2']);
    await user.click(getByRole('button', { name: /2 sources/ }));
  });

  it('renders nothing when the answer cites nothing', () => {
    const { container } = renderWithKit(<CitationList text="No citations here." sources={sources} />);
    expect(container.textContent).toBe('');
  });
});

describe('SourceCard', () => {
  // ★ A retriever that reports no score and one that reports 0 mean different things.
  it('distinguishes "not reported" from a real relevance', () => {
    const { getByText, rerender } = renderWithKit(<SourceCard source={sources[1]} />);
    expect(getByText(/not reported/i)).toBeTruthy();

    rerender(<SourceCard source={sources[2]} />);
    expect(getByText(/Relevance 82%/)).toBeTruthy();
  });

  it('raises a callback rather than navigating itself', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    const { getByRole } = renderWithKit(<SourceCard source={sources[0]} onOpen={onOpen} />);
    await user.click(getByRole('button', { name: /open record/i }));
    expect(onOpen).toHaveBeenCalledWith(sources[0]);
  });
});

describe('ProviderAttribution', () => {
  /**
   * ★★ BOTH DIRECTIONS, IN USER-VISIBLE TEXT.
   *
   * `guarded` means the provider WITHHELD its answer and substituted safe text. Attributing
   * that substitute to the model as if it were the model's words is the misattribution this
   * component prevents — so the difference has to be words a reader sees. Asserting only the
   * guarded case would pass a component that ALWAYS shows the warning; asserting only the
   * unguarded case would pass one that never does.
   */
  it('says the answer was withheld when guarded', () => {
    const { container } = renderWithKit(<ProviderAttribution provider="foundry" model="gpt-4.1" guarded />);
    expect(container.textContent).toMatch(/withheld|replaced|safe text/i);
    expect(container.textContent).not.toMatch(/^Answered by/);
  });

  it('attributes normally when NOT guarded', () => {
    const { container } = renderWithKit(<ProviderAttribution provider="foundry" model="gpt-4.1" />);
    expect(container.textContent).toMatch(/Answered by foundry/);
    expect(container.textContent).not.toMatch(/withheld|replaced|safe text/i);
  });

  it('renders nothing with nothing to attribute', () => {
    const { container } = renderWithKit(<ProviderAttribution />);
    expect(container.textContent).toBe('');
  });
});

describe('GroundingPanel', () => {
  it('shows the facts the host supplied, and says they are not the model output', async () => {
    const user = userEvent.setup();
    const { getByRole, getByText } = renderWithKit(
      <GroundingPanel grounding={{ accountId: 'contoso', openCases: 3 }} defaultOpen />,
    );
    expect(getByText('accountId')).toBeTruthy();
    expect(getByText('contoso')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
    expect(getByText(/supplied by the app, not produced by the model/i)).toBeTruthy();
    await user.click(getByRole('button'));
  });

  it('renders nothing when there is no grounding', () => {
    const { container } = renderWithKit(<GroundingPanel grounding={{}} />);
    expect(container.textContent).toBe('');
  });
});

describe('AnswerWithCitations', () => {
  it('puts a chip where each marker was, keeping the surrounding text', () => {
    const { container } = renderWithKit(
      <AnswerWithCitations
        text="See [1] for detail."
        citations={[{ marker: '1', sourceId: 's1' }]}
        sources={sources}
        onOpenSource={() => {}}
      />,
    );
    expect(container.textContent).toContain('See ');
    expect(container.textContent).toContain('for detail.');
    expect(container.querySelector('button')?.getAttribute('aria-label')).toMatch(/Source 1: Contoso/);
  });
});

describe('axe', () => {
  it('the grounding family is clean', async () => {
    const { container } = renderWithKit(
      <div>
        <CitationList text={ANSWER} sources={sources} defaultOpen />
        <GroundingPanel grounding={{ accountId: 'contoso' }} defaultOpen />
        <ProviderAttribution provider="foundry" guarded />
        <AnswerWithCitations text="See [1]." citations={[{ marker: '1', sourceId: 's1' }]} sources={sources} onOpenSource={() => {}} />
      </div>,
    );
    await expectNoAxeViolations(container);
  });
});
