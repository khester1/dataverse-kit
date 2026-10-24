import { GROUP_PALETTE, contrastRatio, groupColor, parseHex, readableTextOn } from './colors';

describe('colours', () => {
  it.each(GROUP_PALETTE.map((c) => [c]))('palette %s carries white text at >= 4.5:1 (WCAG AA)', (c) => {
    expect(contrastRatio(c, '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(readableTextOn(c)).toBe('#ffffff');
  });

  it('groupColor is deterministic and spreads keys', () => {
    expect(groupColor('North clinic')).toBe(groupColor('North clinic'));
    const seen = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((k) => groupColor(k)));
    expect(seen.size).toBeGreaterThan(3);
  });

  it('a PALE host colour gets black text — white on Dataverse yellow is ~1.4:1', () => {
    expect(contrastRatio('#ffd700', '#ffffff')).toBeLessThan(2);
    expect(readableTextOn('#ffd700')).toBe('#000000');
  });

  it('unparseable colours defer to the theme', () => {
    expect(parseHex('var(--x)')).toBeNull();
    expect(readableTextOn('rebeccapurple')).toBeUndefined();
    expect(parseHex('#abc')).toEqual([0xaa, 0xbb, 0xcc]);
  });
});
