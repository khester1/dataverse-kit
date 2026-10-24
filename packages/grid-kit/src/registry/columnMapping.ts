/**
 * Bridges a grid-kit `ColumnDef` to the canonical library's `IReusableColumn`
 * (the prop shape every @khester/dynamics-cell-renderers component reads its
 * config off). This is the single place renderer config is mapped.
 */
import type { IReusableColumn, ListFieldType } from '@khester/dynamics-cell-renderers';
import type { CellRendererType, ColumnDef } from '../types';

/** grid-kit renderer type → canonical library field type. */
const RENDERER_TO_FIELDTYPE: Record<CellRendererType, ListFieldType> = {
  text: 'text',
  link: 'link',
  lookup: 'lookup',
  optionset: 'optionset',
  currency: 'currency',
  number: 'number',
  date: 'date',
  datetime: 'datetime',
  boolean: 'toggle',
  toggle: 'toggle',
  icon: 'icon',
  progress: 'progressBar',
  coloredCell: 'coloredCell',
  rating: 'rating',
  composite: 'composite',
  // 'fileDrop' is grid-kit-native (FileDropCell) and never goes through the
  // canonical-lib wrapper, so this entry is just to satisfy the exhaustive map.
  fileDrop: 'text',
};

export function rendererToFieldType(type: CellRendererType | string): ListFieldType {
  return (RENDERER_TO_FIELDTYPE as Record<string, ListFieldType>)[type] ?? 'text';
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Map a grid-kit column (renderer type + config bag) onto an IReusableColumn.
 * `rendererConfig` keys accept both a short form (`max`, `color`) and the
 * canonical IReusableColumn name (`progressMax`, `progressColor`).
 */
export function toReusableColumn<T>(column: ColumnDef<T>): IReusableColumn<T> {
  const c = (column.rendererConfig ?? {}) as Record<string, any>;
  const base: IReusableColumn<T> = {
    key: column.key,
    name: column.name,
    fieldName: column.fieldName,
    minWidth: column.minWidth ?? 100,
    maxWidth: column.maxWidth,
    isResizable: column.isResizable ?? true,
    fieldType: rendererToFieldType(column.rendererType),
    editable: !!column.editorType && column.editorType !== 'none' && !column.isLocked,
    onLinkClick: column.onLinkClick,
    validate: column.validate,
  };

  switch (column.rendererType) {
    case 'currency':
      base.currencyCode = c.currencyCode;
      base.locale = c.locale;
      break;
    case 'number':
      base.locale = c.locale;
      break;
    case 'progress':
      base.progressMax = c.max ?? c.progressMax;
      base.progressColor = c.color ?? c.progressColor;
      base.showProgressLabel = c.showLabel ?? c.showProgressLabel;
      break;
    case 'coloredCell':
      base.colorMap = c.colorMap;
      base.getBackgroundColor = c.getBackgroundColor;
      // A coloredCell can opt into inline editing via a fixed option list (edited
      // through EditableOptionSetCell); the read still renders the colored badge.
      base.optionSetOptions = c.options ?? c.optionSetOptions;
      break;
    case 'optionset':
      base.optionSetOptions = c.options ?? c.optionSetOptions;
      base.colorMap = c.colorMap;
      base.optionSetMultiSelect = c.multiSelect ?? c.optionSetMultiSelect;
      break;
    case 'rating':
      base.ratingMax = c.max ?? c.ratingMax;
      base.ratingColor = c.color ?? c.ratingColor;
      base.ratingAllowHalf = c.allowHalf ?? c.ratingAllowHalf;
      base.ratingStyle = c.style ?? c.ratingStyle;
      base.ratingFaceCount = c.faceCount ?? c.ratingFaceCount;
      base.ratingUseSentimentColor = c.useSentimentColor ?? c.ratingUseSentimentColor;
      break;
    case 'composite':
      base.compositeSlots = c.slots ?? c.compositeSlots;
      base.compositeLayout = c.layout ?? c.compositeLayout;
      base.compositeGap = c.gap ?? c.compositeGap;
      break;
    case 'icon':
      base.iconName = c.iconName;
      base.iconTitle = c.iconTitle;
      base.onIconClick = (c.onIconClick as any) ?? (column.onLinkClick as any);
      break;
    case 'toggle':
    case 'boolean':
      base.toggleOnText = c.onText ?? c.toggleOnText;
      base.toggleOffText = c.offText ?? c.toggleOffText;
      base.onToggleChange = c.onToggleChange;
      break;
    case 'lookup':
      base.lookupDisplayField = c.displayField ?? c.lookupDisplayField;
      base.lookupEntitySetName = c.entitySetName ?? c.lookupEntitySetName;
      base.lookupSearchField = c.searchField ?? c.lookupSearchField;
      base.lookupTargetEntity = c.targetEntity ?? c.lookupTargetEntity;
      base.lookupPrimaryIdAttribute = c.primaryIdAttribute ?? c.lookupPrimaryIdAttribute;
      base.lookupFilter = c.filter ?? c.lookupFilter;
      base.lookupSelectFields = c.selectFields ?? c.lookupSelectFields;
      base.lookupSearch = c.searchLookup ?? c.lookupSearch;
      break;
    case 'link':
      base.openInNewTab = c.openInNewTab;
      base.isRecordLink = c.isRecordLink;
      base.recordEntityLogicalName = c.recordEntityLogicalName;
      break;
    case 'text':
    default:
      break;
  }

  if (c.formatValue && !base.formatValue) base.formatValue = c.formatValue as any;
  return base;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
