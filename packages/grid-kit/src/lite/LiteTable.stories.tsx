import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FluentProvider, makeStyles, tokens, Badge, Button, Input } from '@fluentui/react-components';
import { LiteTable } from './LiteTable';
import type { LiteColumn, LiteRow } from './types';
import { dynamicsV9Theme } from '../v9/theme';
import { demoRows } from '../_storybook/sample';

/**
 * `LiteTable` — the semantic-table host.
 *
 * ★★★ THESE STORIES EXIST TO SHOW IT IS NOT A LESSER `<DataGrid>`. Three gallery controls
 * (`choice-grid`, `ordering-grid`, `inline-create-grid`) hand-rolled this table deliberately, to
 * keep Fluent v9's `DataGrid` (`react-table`) — and the tabster singleton hazard it drags — out of
 * a control that only needs rows and cells. Each story below is one of the shapes they built.
 */
const useStyles = makeStyles({
  table: { width: '100%', borderCollapse: 'collapse', fontSize: tokens.fontSizeBase300 },
  th: {
    textAlign: 'left', padding: '6px 10px', fontWeight: tokens.fontWeightSemibold,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`, color: tokens.colorNeutralForeground2,
  },
  td: { padding: '6px 10px', borderBottom: `1px solid ${tokens.colorNeutralStroke2}` },
  handle: { width: '32px', textAlign: 'center', cursor: 'grab' },
  draft: { backgroundColor: tokens.colorNeutralBackground2 },
});

const columns: LiteColumn[] = [
  { name: 'name', displayName: 'Account', isPrimary: true },
  { name: 'owner', displayName: 'Owner' },
  { name: 'status', displayName: 'Status' },
];

const rows: LiteRow[] = demoRows.slice(0, 5).map((r) => ({
  id: r.key,
  cells: { name: String(r.name), owner: String(r.owner), status: String(r.status) },
}));

/**
 * ★★★ EVERY STORY BODY IS A NAMED COMPONENT, NOT AN INLINE `render` ARROW, AND THAT IS A RULE
 * RATHER THAN A STYLE. A Storybook `render` is an ordinary function, so hooks called inside it
 * break the Rules of Hooks — `useStyles` and `React.useState` here — and `react-hooks/rules-of-hooks`
 * is correct to refuse it. These stories shipped that way and the lint was RED from the day the
 * file landed; nothing noticed because no CI job ran eslint in this repo at all.
 * ★★ Hoisting the body into a `*Demo` component is the documented Storybook answer: the component
 * is what React renders, so its hooks are in a component, and `render: () => <XDemo />` stays a
 * plain function.
 */
const meta: Meta = {
  title: 'Grid Kit Lite/LiteTable',
  parameters: { layout: 'padded' },
  decorators: [(Story) => <FluentProvider theme={dynamicsV9Theme}><Story /></FluentProvider>],
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj;

/** The default: a semantic table, text cells, no interaction. */
const BasicDemo: React.FC = () => {
  const s = useStyles();
  return <LiteTable columns={columns} rows={rows} classes={{ table: s.table, th: s.th, td: s.td }} ariaLabel="Accounts" />;
};
export const Basic: Story = { render: () => <BasicDemo /> };

/**
 * ★★ `onOpen` is what makes the primary column a link. WITHOUT it the same column renders as plain
 * text — the pair matters, because a control with no open affordance should not show a dead link.
 * Compare this story with `Basic` above: same columns, same `isPrimary`, different affordance.
 */
const PrimaryOpensRecordDemo: React.FC = () => {
  const s = useStyles();
  const [opened, setOpened] = React.useState<string | null>(null);
  return (
    <>
      <LiteTable columns={columns} rows={rows} onOpen={setOpened}
        classes={{ table: s.table, th: s.th, td: s.td }} />
      <p>{opened ? `Opened record: ${opened}` : 'Click an account name.'}</p>
    </>
  );
};
export const PrimaryOpensRecord: Story = { render: () => <PrimaryOpensRecordDemo /> };

/**
 * ★★★★ THE BUG THIS HOST FIXES FOR ITS CONSUMERS. A Dataverse view can carry the same column
 * twice — once plain, once through a property-set — and `choice-grid` found that keying cells by
 * column name alone gave React two children with one key, so **both copies reacted to one
 * interaction** (both opened a listbox over the same record). `LiteTable` always keys by position
 * as well as name. Click either Status cell: only that one responds.
 */
const DuplicateColumnNamesDemo: React.FC = () => {
  const s = useStyles();
  const [hits, setHits] = React.useState<string[]>([]);
  const dupes: LiteColumn[] = [
    { name: 'name', displayName: 'Account', isPrimary: true },
    { name: 'status', displayName: 'Status' },
    { name: 'status', displayName: 'Status (again)' },
  ];
  return (
    <>
      <LiteTable
        columns={dupes} rows={rows} classes={{ table: s.table, th: s.th, td: s.td }}
        /* ★ `index` is deliberately not destructured — the host keys by it, this demo does not
           need it, and an unused binding is a lint error rather than documentation. */
        renderCell={({ column, text }) =>
          column.name === 'status'
            ? <Button size="small" onClick={() => setHits((h) => [...h, `${column.displayName}`])}>{text}</Button>
            : text}
      />
      <p>{hits.length ? `Clicked: ${hits.join(', ')}` : 'Click a Status cell — only one should register.'}</p>
    </>
  );
};
export const DuplicateColumnNames: Story = { render: () => <DuplicateColumnNamesDemo /> };

/**
 * `ordering-grid`'s shape: a leading handle column plus `rowProps` carrying the drag handlers.
 * ★ Both halves of `leading` are required together so the header and body cannot drift apart.
 */
const LeadingHandleColumnDemo: React.FC = () => {
  const s = useStyles();
  const [dragging, setDragging] = React.useState<string | null>(null);
  return (
    <LiteTable
      columns={columns} rows={rows}
      classes={{ table: s.table, th: s.th, td: s.td }}
      leading={{
        header: <span aria-hidden="true" />,
        cell: (row) => <span aria-label={`Move ${row.cells.name}`}>⠿</span>,
        headerClassName: s.handle,
        cellClassName: s.handle,
      }}
      rowProps={(row) => ({
        draggable: true,
        onDragStart: () => setDragging(row.id),
        onDragEnd: () => setDragging(null),
        style: dragging === row.id ? { opacity: 0.5 } : undefined,
      })}
    />
  );
};
export const LeadingHandleColumn: Story = { render: () => <LeadingHandleColumnDemo /> };

/** `inline-create-grid`'s shape: a draft row appended inside `<tbody>` via `footerRow`. */
const DraftRowDemo: React.FC = () => {
  const s = useStyles();
  return (
    <LiteTable
      columns={columns} rows={rows}
      classes={{ table: s.table, th: s.th, td: s.td }}
      footerRow={
        <tr className={s.draft}>
          {columns.map((c) => (
            <td key={c.name} className={s.td}><Input size="small" placeholder={c.displayName} /></td>
          ))}
        </tr>
      }
    />
  );
};
export const DraftRow: Story = { render: () => <DraftRowDemo /> };

/**
 * `choice-grid`'s shape: `renderCell` replaces the body entirely, here with coloured badges.
 * ★ The host resolves `text` for you, so a custom cell that only needs the display string does not
 *   have to reach back into the row.
 */
const CustomCellsDemo: React.FC = () => {
  const s = useStyles();
  const colour = (v: string) => (v === 'Active' ? 'success' : v === 'Pending' ? 'warning' : 'informative');
  return (
    <LiteTable
      columns={columns} rows={rows}
      classes={{ table: s.table, th: s.th, td: s.td }}
      renderCell={({ column, text }) =>
        column.name === 'status' ? <Badge appearance="filled" color={colour(text)}>{text}</Badge> : text}
    />
  );
};
export const CustomCells: Story = { render: () => <CustomCellsDemo /> };
