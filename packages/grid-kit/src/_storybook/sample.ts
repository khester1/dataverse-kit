import type { ColumnDef } from '../types';

/** Shared demo dataset + columns for grid-kit stories. */
export interface DemoRow extends Record<string, unknown> {
  key: string;
  name: string;
  owner: string;
  status: string;
  revenue: number;
  progress: number;
  score: number;
  created: string;
  active: boolean;
}

export const demoRows: DemoRow[] = [
  { key: '1', name: 'Contoso Ltd', owner: 'Alex Park', status: 'Active', revenue: 1500000, progress: 92, score: 5, created: '2026-01-12', active: true },
  { key: '2', name: 'Fabrikam Inc', owner: 'Jordan Lee', status: 'Pending', revenue: 220000, progress: 47, score: 3, created: '2026-03-02', active: true },
  { key: '3', name: 'Adventure Works', owner: 'Sam Rivera', status: 'Inactive', revenue: 85000, progress: 18, score: 2, created: '2025-11-20', active: false },
  { key: '4', name: 'Wingtip Toys', owner: 'Casey Kim', status: 'Active', revenue: 640000, progress: 73, score: 4, created: '2026-02-15', active: true },
];

const STATUS_COLORS: Record<string, string> = {
  Active: '#107c10',
  Pending: '#f7e600',
  Inactive: '#d13438',
};

export const demoColumns: ColumnDef<DemoRow>[] = [
  { key: 'name', fieldName: 'name', name: 'Account', rendererType: 'text', editorType: 'text', minWidth: 150, isSortable: true },
  { key: 'owner', fieldName: 'owner', name: 'Owner', rendererType: 'link', editorType: 'text', minWidth: 120, isSortable: true },
  { key: 'status', fieldName: 'status', name: 'Status', rendererType: 'coloredCell', editorType: 'dropdown', minWidth: 100, isSortable: true, rendererConfig: { colorMap: STATUS_COLORS, options: [{ value: 'Active', label: 'Active' }, { value: 'Pending', label: 'Pending' }, { value: 'Inactive', label: 'Inactive' }] } },
  { key: 'revenue', fieldName: 'revenue', name: 'Revenue', rendererType: 'currency', editorType: 'number', minWidth: 120, isSortable: true, rendererConfig: { currencyCode: 'USD' } },
  { key: 'progress', fieldName: 'progress', name: 'Progress', rendererType: 'progress', editorType: 'number', minWidth: 140, isSortable: true, rendererConfig: { max: 100 } },
  { key: 'score', fieldName: 'score', name: 'Rating', rendererType: 'rating', editorType: 'number', minWidth: 120, isSortable: true, rendererConfig: { max: 5 } },
  { key: 'created', fieldName: 'created', name: 'Created', rendererType: 'date', editorType: 'date', minWidth: 120, isSortable: true },
  { key: 'active', fieldName: 'active', name: 'Active', rendererType: 'toggle', editorType: 'toggle', minWidth: 90, isSortable: true, rendererConfig: { onText: 'Yes', offText: 'No' } },
];
