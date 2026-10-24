import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * ★★ THE DECLARED-SET MANIFEST — the increment-4 gate.
 *
 * agent-kit deliberately uses some tabster-touching Fluent components (the split-by-cost
 * decision), so "zero" is the wrong bar and a bundle grep cannot help: measured, the library
 * dist never contains tabster because Fluent is an external peer, and a Storybook bundle
 * contains it even for a clean kit. See CLAUDE.md.
 *
 * What CAN be pinned is WHICH components are used and WHERE. This is that list. It is not a
 * ban — eslint enforces the bans — it is a census, so that adding a tabster-touching component
 * is a deliberate edit to this file rather than something that drifts in unnoticed.
 *
 * Each entry is justified:
 *   - Menu       reaches useArrowNavigationGroup. A menu is a real APG widget (focus trap,
 *                typeahead, Escape, roving) — 100+ LOC to rebuild, against a widget nobody has
 *                tested. Used for the rail and header overflows only.
 *   - TabList    reaches useArrowNavigationGroup. Tabster's Mover carries RTL inversion,
 *                Home/End/PageUp/PageDown, cyclic wrap, disabled-skipping and a caret guard —
 *                roughly 120-180 LOC to reproduce.
 *
 * Everything else the shell uses is measured tabster-free: Button, Avatar, Badge, Tooltip,
 * SearchBox, Text, Input, Textarea, MessageBar, Spinner, Persona, Link, Divider.
 */
const DECLARED: Record<string, readonly string[]> = {
  'shell/AppRail.tsx': ['Menu', 'MenuTrigger', 'MenuPopover', 'MenuList', 'MenuItem'],
  'shell/ConversationHeader.tsx': [
    'Menu', 'MenuTrigger', 'MenuPopover', 'MenuList', 'MenuItem', 'Tab', 'TabList',
  ],
};

/** Names that reach a tabster `get*` factory, from the measured hook map in CLAUDE.md. */
const TABSTER_TOUCHING = [
  'Accordion', 'AccordionItem', 'AccordionHeader', 'AccordionPanel',
  'Toolbar', 'ToolbarButton', 'ToolbarDivider', 'ToolbarGroup', 'ToolbarRadioButton',
  'Card', 'CardHeader', 'CardFooter', 'CardPreview',
  'Menu', 'MenuTrigger', 'MenuPopover', 'MenuList', 'MenuItem', 'MenuButton', 'SplitButton',
  'Tab', 'TabList', 'Tree', 'TreeItem', 'FlatTree', 'Table', 'DataGrid',
  'Popover', 'PopoverSurface', 'PopoverTrigger', 'Dialog', 'DialogSurface',
  'TagPicker', 'TagGroup', 'InteractionTag', 'Nav', 'NavDrawer', 'Breadcrumb', 'Carousel',
  'SwatchPicker', 'TeachingPopover', 'List', 'ListItem', 'AvatarGroup', 'AvatarGroupPopover',
  'Toaster',
];

const SRC = join(process.cwd(), 'src');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === '__tests__' || entry === '_storybook' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

/** Named imports from the Fluent v9 barrel in one file. */
function fluentImports(source: string): string[] {
  const names: string[] = [];
  const re = /import\s*\{([^}]*)\}\s*from\s*['"]@fluentui\/react-components['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    for (const raw of m[1].split(',')) {
      const name = raw.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim();
      if (name) names.push(name);
    }
  }
  return names;
}

describe('the tabster manifest', () => {
  const files = walk(SRC);

  it('scans the source tree it means to', () => {
    // Non-vacuity: a broken path would scan nothing and the census below would be empty,
    // which reads identically to "nothing uses tabster".
    expect(files.length).toBeGreaterThan(30);
    expect(files.some((f) => f.endsWith('AppRail.tsx'))).toBe(true);
  });

  it('matches the declared set EXACTLY — no additions, no stale entries', () => {
    const actual: Record<string, string[]> = {};
    for (const file of files) {
      const used = fluentImports(readFileSync(file, 'utf8')).filter((n) =>
        TABSTER_TOUCHING.includes(n),
      );
      if (used.length > 0) {
        actual[file.slice(SRC.length + 1)] = used.sort();
      }
    }
    const expected = Object.fromEntries(
      Object.entries(DECLARED).map(([k, v]) => [k, [...v].sort()]),
    );
    // Both directions: an undeclared use is a drift, and a declared-but-removed entry is a
    // stale claim that would let the next one in unnoticed.
    expect(actual).toEqual(expected);
  });

  it('confirms the in-tree replacements really are in-tree', () => {
    // If these ever appear in the census above, the split-by-cost decision has quietly reversed.
    const census = files.flatMap((f) => fluentImports(readFileSync(f, 'utf8')));
    for (const banned of ['Card', 'Toolbar', 'Accordion', 'Dialog', 'Tree', 'Table', 'DataGrid']) {
      expect(census, `${banned} should be in-tree`).not.toContain(banned);
    }
  });
});
