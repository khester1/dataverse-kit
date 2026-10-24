import { describe, it, expect } from 'vitest';
import { MockAgentService, immediateScheduler } from '../MockAgentService';
import { mockScenarios, type MockScenarioName } from '../scenarios';
import type { AgentEvent, AgentRunStatus, AgentTurn } from '../../core/protocol';

const turn = (text = 'hello'): AgentTurn => ({ text, history: [] });

async function drain(
  service: MockAgentService,
  t: AgentTurn = turn(),
): Promise<AgentEvent[]> {
  const out: AgentEvent[] = [];
  for await (const e of service.send(t)) out.push(e);
  return out;
}

const svc = (scenario: MockScenarioName, extra = {}) =>
  new MockAgentService({ scenario, scheduler: immediateScheduler, firstTokenMs: 0, chunkMs: 0, ...extra });

describe('MockAgentService', () => {
  it('emits exactly one turn_end, for every scenario', async () => {
    const names = Object.keys(mockScenarios) as MockScenarioName[];
    expect(names.length).toBeGreaterThan(5); // non-vacuity

    for (const name of names) {
      if (name === 'throws') continue; // covered separately
      const events = await drain(svc(name));
      const terminals = events.filter((e) => e.type === 'turn_end');
      expect(terminals, `scenario ${name}`).toHaveLength(1);
      expect(events[0].type, `scenario ${name}`).toBe('turn_start');
      expect(events[events.length - 1].type, `scenario ${name}`).toBe('turn_end');
    }
  });

  // ★ A mock that cannot REACH a state is a state nothing downstream is ever tested against.
  it('can produce every AgentRunStatus', async () => {
    const wanted: AgentRunStatus[] = [
      'succeeded', 'blocked', 'refused', 'error', 'notProvisioned', 'cancelled',
    ];
    const produced = new Set<AgentRunStatus>();

    for (const name of Object.keys(mockScenarios) as MockScenarioName[]) {
      if (name === 'throws') continue;
      const t = turn();
      if (name === 'cancelled') (t as { cancelSignal?: AbortSignal }).cancelSignal = AbortSignal.abort();
      const events = await drain(svc(name), t);
      const last = events[events.length - 1];
      if (last.type === 'turn_end') produced.add(last.result.status);
    }
    for (const w of wanted) expect([...produced], `missing ${w}`).toContain(w);
  });

  it('honours a pre-aborted signal immediately', async () => {
    const events = await drain(svc('longAnswer'), { ...turn(), cancelSignal: AbortSignal.abort() });
    expect(events).toHaveLength(2);
    const last = events[1];
    if (last.type !== 'turn_end') throw new Error('unreachable');
    expect(last.result.status).toBe('cancelled');
  });

  it('stops mid-stream when the signal aborts, keeping the text so far', async () => {
    const controller = new AbortController();
    const service = svc('longAnswer');
    const seen: AgentEvent[] = [];
    for await (const e of service.send({ ...turn(), cancelSignal: controller.signal })) {
      seen.push(e);
      if (seen.filter((x) => x.type === 'text_delta').length === 5) controller.abort();
    }
    const last = seen[seen.length - 1];
    if (last.type !== 'turn_end') throw new Error('unreachable');
    expect(last.result.status).toBe('cancelled');
    expect(last.result.text.length).toBeGreaterThan(0);
  });

  // ★ The failure channel an AsyncIterable has and a Promise does not.
  it('can throw mid-stream, so a consumer can be tested against it', async () => {
    await expect(drain(svc('throws'))).rejects.toThrow(/exploded mid-stream/);
  });

  it('selects a scenario from a slash prompt, so one story can walk every state', async () => {
    const events = await drain(svc('happy'), turn('/blocked'));
    const last = events[events.length - 1];
    if (last.type !== 'turn_end') throw new Error('unreachable');
    expect(last.result.status).toBe('blocked');
    expect(last.result.guarded).toBe(true);
  });

  // ★ The seed is a CONSTRUCTOR ARGUMENT, not module state: tsup runs splitting:false, so a
  //   module-level counter is physically duplicated per entry and two importers would get
  //   two independent sequences.
  it('is deterministic for a given seed and differs across seeds', async () => {
    const idOf = async (seed: number) => {
      const events = await drain(svc('happy', { seed }));
      return events[0].type === 'turn_start' ? events[0].messageId : '';
    };
    expect(await idOf(7)).toBe(await idOf(7));
    expect(await idOf(7)).not.toBe(await idOf(8));
  });

  it('reports notProvisioned from isAvailable, and still yields a well-formed turn', async () => {
    const service = svc('notProvisioned');
    const availability = await service.isAvailable();
    expect(availability).toMatchObject({ available: false, status: 'notProvisioned' });
    const events = await drain(service);
    expect(events[events.length - 1].type).toBe('turn_end');
  });

  it('emits five sources but an answer citing two — the grounded fixture', async () => {
    const events = await drain(svc('grounded'));
    const sources = events.find((e) => e.type === 'sources');
    expect(sources?.type === 'sources' && sources.sources).toHaveLength(5);
    const text = events.filter((e) => e.type === 'text_delta').map((e) => (e.type === 'text_delta' ? e.text : '')).join('');
    expect(text).toMatch(/\[3\]/);
    expect(text).toMatch(/\[1\]/);
    expect(text).not.toMatch(/\[5\]/);
  });
});
