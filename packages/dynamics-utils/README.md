# @khester/dynamics-utils

Zero-dependency formatting, color, coercion, and import/export utilities for Dynamics 365 development.

## What it does

A grab-bag of small, pure functions for the boring-but-load-bearing parts of Dataverse UIs: formatting values (`formatCurrency`, `formatDate`, `cleanGuid`, `getStatusLabel`), deriving colors (`getContrastColor`, `lightenColor`, `getStateCodeColor`, `STATUS_COLORS`), generating personas (`getInitials`, `getPersonaColor`), and moving data in and out via CSV/JSON (`generateCSV`, `parseCSV`, `exportToFile`, `validateImportData`). It also ships a set of Dynamics-flavored theme tokens (`dynamicsSpacing`, `dynamicsCeColors`, `dynamicsShadows`) and a few generic helpers (`debounce`, `deepClone`, `parseQueryString`, `isDynamicsEnvironment`). Everything is zero-dependency and runtime-agnostic, so it works in web resources, PCF controls, grid customizers, and Node alike.

## When to use it

Reach for this package when you need framework-free helpers — value formatting, color math, or CSV/JSON import-export — that have no React or Fluent dependency. It is the shared foundation under `@khester/dynamics-cell-renderers` and `@dataverse-kit/grid-kit`. For rendering grids and detail lists use **grid-kit**; for form shells and layout containers use **surface-kit**; for ready-made cell display use **dynamics-cell-renderers**; for custom-page UI controls use **reusable-components**. Use **dynamics-utils** for the underlying primitives those components are built on.

## Install

```bash
npm install @khester/dynamics-utils
```

No peer dependencies — this package is pure TypeScript with zero runtime dependencies.

## Minimal example

```tsx
import {
  formatCurrency,
  getStatusLabel,
  getStateCodeColor,
  getInitials,
  generateCSV,
  exportToFile,
} from '@khester/dynamics-utils';

// Formatting
formatCurrency(1500000);          // "$1,500,000.00"
getStatusLabel(0);                // "Active"
getStateCodeColor(1);             // hex color for an inactive record
getInitials('Ada Lovelace');      // "AL"

// Import / export
const rows = [{ name: 'Contoso', revenue: 1500000 }];
const csv = generateCSV(rows, [
  { key: 'name', name: 'Account' },
  { key: 'revenue', name: 'Revenue' },
]);

exportToFile(rows, [
  { key: 'name', name: 'Account' },
  { key: 'revenue', name: 'Revenue' },
], 'csv', 'accounts');
```

## Key exports

| Export | Purpose |
|--------|---------|
| `formatCurrency` / `formatNumber` / `formatDate` / `formatDateTime` | Locale-aware value formatting with null-safe `'N/A'` fallbacks |
| `cleanGuid` / `getStatusLabel` | Strip `{}` from GUIDs; map a `statecode` to a label |
| `getContrastColor` / `lightenColor` / `darkenColor` / `getStateCodeColor` | Color math (YIQ contrast, lighten/darken, state-driven colors) |
| `STATUS_COLORS` / `isValidHexColor` / `normalizeHexColor` | Status color map and hex validation/normalization |
| `getInitials` / `getPersonaColor` / `PERSONA_COLORS` | Persona initials and deterministic avatar colors |
| `generateCSV` / `generateJSON` / `exportToFile` / `downloadFile` | Serialize records to CSV/JSON and trigger a download |
| `parseCSV` / `parseJSON` / `validateImportData` / `mapHeadersToColumns` | Parse and validate inbound import data |
| `dynamicsSpacing` / `dynamicsCeColors` / `dynamicsShadows` / `dynamicsBorderRadius` | Dynamics-flavored theme tokens |
| `debounce` / `deepClone` / `parseQueryString` / `isDynamicsEnvironment` | Generic runtime helpers |
