# dataverse-kit

Fluent UI component kits and tooling for developers building on **Dynamics 365 / Dataverse** and
**Power Platform**: grids, form surfaces, agent chat surfaces, a calendar, design tokens and a PCF dev
harness. Every package here is published on npm, for use in model-driven apps, PCF controls, custom
pages and Power Pages sites.

The UI kits ship **Fluent UI v9** skins, and grid-kit and surface-kit also keep a v8 entry, because
model-driven PCF controls run against the v8 the platform serves. Shared logic sits in
framework-agnostic `./core` entries, so the skins never duplicate it.

| Package | What it is |
|---|---|
| [`@dataverse-kit/grid-kit`](packages/grid-kit) | Registry-driven grids for Dynamics 365: one cell-renderer registry shared by a DetailsList grid and a Grid Customizer, plus a v9 DataGrid with toolbar, filters, grouping, inline editing and export. |
| [`@dataverse-kit/surface-kit`](packages/surface-kit) | Responsive form shells, sections, tabs and overlay surfaces (dialog, panel, callout) that match Dynamics CE and host grid-kit grids. |
| [`@dataverse-kit/agent-kit`](packages/agent-kit) | Conversational and agent surfaces: message thread, composer, streaming, citations, approval cards and an app shell, behind one `IAgentService` seam with a mock for development. |
| [`@dataverse-kit/calendar-kit`](packages/calendar-kit) | A calendar on FullCalendar (MIT views), with date rules measured against a live org: the three DateTime behaviours, Web API vs form formats, and the user's time zone. |
| [`@dataverse-kit/design-tokens`](packages/design-tokens) | Dynamics 365 design tokens (colour, spacing, typography, radius, layout). Pure TypeScript, zero dependencies. |
| [`@dataverse-kit/fluent-theme`](packages/fluent-theme) | The Dynamics CE Fluent v9 themes: the classic brand ramp and the model-driven "new look" theme. |
| [`@dataverse-kit/pcf-dev-harness`](packages/pcf-dev-harness) | A dev harness for PCF controls: a sandbox shell plus a Vite proxy that streams real Dataverse data with a server-side Azure CLI token. |
| [`@khester/dynamics-cell-renderers`](packages/dynamics-cell-renderers) | Cell renderers for Dynamics grids: text, currency, date, lookup, option set, progress and editable variants. |
| [`@khester/dynamics-utils`](packages/dynamics-utils) | Zero-dependency utilities: formatting, import/export, validation and colours. |

## See them running

- **[Dataverse UI Gallery](https://gallery.kylehester.dev)**: controls and apps built on these kits,
  each with a live demo and a one-click deploy to your own org.

## Develop

Node 20 or later.

```bash
npm ci
npm run build      # builds the packages in dependency order
npm run typecheck
npm test
```

## How it's tested

Unit and component tests run on Vitest with React Testing Library. Platform behaviour (date
handling, option sets, dataset shapes) is modelled on what a live Dataverse org actually returns,
not on what the documentation describes.

## License

[MIT](LICENSE) © Kyle Hester
