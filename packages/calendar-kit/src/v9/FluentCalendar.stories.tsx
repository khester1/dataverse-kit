import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { FluentCalendar } from './FluentCalendar';
import { CalendarView } from '../view/CalendarView';
import { createFakeDataSource, createSampleEvents } from '../fake';
import { browserZone, fixedZone, toDate } from '../core/datetime';
import type { CalendarEvent, CalendarEventChange, SlotSelection } from '../core/types';

/**
 * ★ Stories use `render()` and plain-value args only. JSX inside `args` crashes Storybook's
 *   `safeSortObject` (a known trap in this repo's other Storybooks).
 */
const today = toDate(new Date(), browserZone);

/** Sample events plus a fake source over the SAME array, created once. */
function useFakeSource(seed: number, failWhen?: (e: CalendarEvent) => boolean) {
  const [source] = React.useState(() => {
    const events = createSampleEvents({ anchor: today, zone: browserZone, seed });
    return createFakeDataSource(events, { latencyMs: 600, failIds: failWhen ? events.filter(failWhen).map((e) => e.id) : [] });
  });
  const [events, setEvents] = React.useState(() => [...source.events]);
  const save = React.useCallback(
    async (c: CalendarEventChange) => {
      await source.update!(c);
      setEvents([...source.events]);
    },
    [source]
  );
  return { events, save };
}

type DemoProps = React.ComponentProps<typeof FluentCalendar>;

function SchedulerDemo(args: DemoProps) {
  const { events, save } = useFakeSource(42);
  const [log, setLog] = React.useState<string[]>([]);
  const note = (line: string) => setLog((l) => [line, ...l].slice(0, 5));
  return (
    <>
      <FluentCalendar
        {...args}
        events={events}
        businessHours={[{ daysOfWeek: [1, 2, 3, 4, 5], startTime: '08:00', endTime: '18:00' }]}
        onEventChange={async (c) => {
          await save(c);
          note(`saved ${c.event.title}: ${c.start}`);
        }}
        onSelectRange={(s: SlotSelection) => note(`quick create ${s.start} → ${s.end}${s.allDay ? ' (all day)' : ''}`)}
        onEventClick={(e) => note(`open ${e.id} ${e.title}`)}
      />
      <pre style={{ fontSize: 12 }}>{log.join('\n')}</pre>
    </>
  );
}

function RollbackDemo(args: DemoProps) {
  const { events, save } = useFakeSource(42, () => true);
  return <FluentCalendar {...args} events={events} onEventChange={save} />;
}

function ReadOnlyDemo(args: DemoProps) {
  const { events } = useFakeSource(7);
  return <FluentCalendar {...args} events={events} />;
}

function SideBySideDemo(args: DemoProps) {
  const { events } = useFakeSource(3);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <div>
        <strong>CalendarView (no Fluent)</strong>
        <CalendarView {...args} events={events} />
      </div>
      <div>
        <strong>FluentCalendar (v9 tokens)</strong>
        <FluentCalendar {...args} events={events} />
      </div>
    </div>
  );
}

const meta: Meta<typeof FluentCalendar> = {
  title: 'Calendar/FluentCalendar',
  component: FluentCalendar,
  args: { view: 'week', editable: true },
  argTypes: {
    view: { control: 'inline-radio', options: ['month', 'week', 'workWeek', 'day', 'list'] },
  },
};
export default meta;
type Story = StoryObj<typeof FluentCalendar>;

/** Drag and resize save through a fake source with latency; the event stays put while it saves. */
export const Scheduler: Story = { render: (args) => <SchedulerDemo {...args} /> };

/** EVERY save fails here: a dropped event waits (the save is in flight), then snaps back with a message. */
export const SaveFailsAndRollsBack: Story = { render: (args) => <RollbackDemo {...args} /> };

/** `editable` off (the default): nothing drags, clicks still open. */
export const ReadOnly: Story = {
  args: { editable: false, view: 'month' },
  render: (args) => <ReadOnlyDemo {...args} />,
};

/**
 * ★ The same five events, seen by users in three Dynamics time zones. The blue instants move;
 *   the purple FLOATING 09:00 does not. (Measured on an org: without a user zone, a Tokyo user
 *   in a Pacific browser saw Monday 9:00 where the grid beside it said Tuesday 1:00.)
 */
export const UserTimeZones: Story = {
  args: { view: 'list', editable: false },
  render: (args) => {
    const events: CalendarEvent[] = [
      { id: 'i', title: 'Instant 17:00Z', start: `${today}T17:00:00Z`, end: `${today}T18:00:00Z`, color: '#0f6cbd' },
      { id: 'f', title: 'Floating 09:00', start: `${today}T09:00:00`, end: `${today}T10:00:00`, color: '#5c2e91' },
    ];
    const zones: [string, number][] = [['Pacific (−7)', -420], ['UTC', 0], ['Tokyo (+9)', 540]];
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {zones.map(([label, minutes]) => (
          <div key={label}>
            <strong>{label}</strong>
            <FluentCalendar {...args} views={['list']} events={events} zone={fixedZone(minutes)} initialDate={today} />
          </div>
        ))}
      </div>
    );
  },
};

/** The Fluent-free root entry (for Power Pages) next to the v9 one. Same events, same API. */
export const FluentFreeVsV9: Story = {
  args: { view: 'month', editable: false },
  render: (args) => <SideBySideDemo {...args} />,
};
