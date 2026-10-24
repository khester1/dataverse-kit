/**
 * ★ PROVE THE STIMULUS LANDED. `npm test` reruns the suite under three TZ values; if the TZ
 *   variable did not actually reach the process, all three runs would be the same run and the
 *   zone-independence claim would be vacuous. This asserts the runner's zone is the one asked for.
 */
describe('process time zone (test-in-zones stimulus)', () => {
  it('matches the TZ the runner set', () => {
    const tz = process.env.TZ;
    if (!tz) return; // a bare `vitest` run is allowed; `npm test` always sets it
    const jan = new Date(Date.UTC(2026, 0, 15, 12)).getTimezoneOffset();
    const expected: Record<string, number> = { UTC: 0, 'America/Los_Angeles': 480, 'Pacific/Auckland': -780 };
    expect(tz in expected).toBe(true);
    expect(jan).toBe(expected[tz]);
  });
});
