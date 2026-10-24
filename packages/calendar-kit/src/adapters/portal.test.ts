import { vi } from 'vitest';
import { DateTimeBehavior as B } from '../dataverse/dates';
import { createPortalSource } from './portal';
import { RANGE, ROWS } from '../__tests__/webapi-fixture';
import { pacific2026 } from '../__tests__/zones';

const map = { start: 'dvk_start', end: 'dvk_end', title: 'dvk_name', group: '_dvk_locationid_value' };
const behaviors = { dvk_start: B.UserLocal, dvk_end: B.UserLocal };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('createPortalSource', () => {
  it('GETs /_api/<entitySet> with $select/$filter/$orderby, same-origin, formatted values requested', async () => {
    const fetch = vi.fn(async () => json({ value: [ROWS[0]] }));
    const src = createPortalSource({ entitySet: 'dvk_slots', idColumn: 'dvk_slotid', map, behaviors, zone: pacific2026, filter: 'statuscode eq 1', fetch });
    const events = await src.load(RANGE);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    const u = new URL(url, 'https://site.example');
    expect(u.pathname).toBe('/_api/dvk_slots');
    expect(u.searchParams.get('$select')).toBe('dvk_slotid,dvk_start,dvk_end,dvk_name,_dvk_locationid_value');
    expect(u.searchParams.get('$filter')?.startsWith('(statuscode eq 1) and (dvk_start lt ')).toBe(true);
    expect(u.searchParams.get('$orderby')).toBe('dvk_start asc');
    expect(init.method).toBe('GET');
    expect(init.credentials).toBe('same-origin');
    const h = init.headers as Record<string, string>;
    expect(h.Prefer).toContain('OData.Community.Display.V1.FormattedValue');
    expect(h).not.toHaveProperty('__RequestVerificationToken'); // a GET needs none
    expect(events[0]).toMatchObject({ id: 'a1', resourceId: 'North clinic' });
  });

  it('follows @odata.nextLink verbatim', async () => {
    const urls: string[] = [];
    const pages = [
      json({ value: [ROWS[0]], '@odata.nextLink': 'https://site.example/_api/dvk_slots?$skiptoken=X' }),
      json({ value: [{ ...ROWS[0], dvk_slotid: 'a2' }] }),
    ];
    const src = createPortalSource({
      entitySet: 'dvk_slots', idColumn: 'dvk_slotid', map, behaviors,
      fetch: (async (u: string) => (urls.push(u), pages[urls.length - 1])) as unknown as typeof fetch,
    });
    expect((await src.load(RANGE)).map((e) => e.id)).toEqual(['a1', 'a2']);
    expect(urls[1]).toBe('https://site.example/_api/dvk_slots?$skiptoken=X');
  });

  it('a 403 names the portal configuration, and carries the platform message', async () => {
    const fetch = vi.fn(async () => json({ error: { code: '90040120', message: 'You don’t have permission to read dvk_slot' } }, 403));
    const src = createPortalSource({ entitySet: 'dvk_slots', idColumn: 'dvk_slotid', map, fetch });
    await expect(src.load(RANGE)).rejects.toThrow(/403: You don’t have permission.*table permission.*Webapi\/<table>\/enabled/);
  });

  it('is READ-ONLY: no update, no create — picking goes to onPick', () => {
    const onPick = vi.fn();
    const src = createPortalSource({ entitySet: 's', idColumn: 'id', map, onPick, fetch: vi.fn() });
    expect(src.capabilities).toEqual({ update: false, create: false, open: true });
    expect(src.update).toBeUndefined();
    src.open!({ id: 'a1', title: 't', start: '2026-09-28' });
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 'a1' }));
  });

  it('honours a custom baseUrl (trailing slash tolerated)', async () => {
    const fetch = vi.fn(async () => json({ value: [] }));
    await createPortalSource({ entitySet: 's', idColumn: 'id', map, baseUrl: '/fr-FR/_api/', fetch }).load(RANGE);
    expect((fetch.mock.calls[0] as unknown as [string])[0].startsWith('/fr-FR/_api/s?')).toBe(true);
  });
});
