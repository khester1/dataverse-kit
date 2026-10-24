import React from 'react';
import { Text } from '@fluentui/react';
import { CellRendererProps } from '../types';
import { cellClass, linkCellClass } from '../styles';

/**
 * Extended props for LookupCell with navigation support.
 */
export interface LookupCellProps<T> extends CellRendererProps<T> {
  /** Dynamics 365 base URL for navigation (e.g., 'https://myorg.crm.dynamics.com') */
  dynamicsBaseUrl?: string;
}

/**
 * Lookup cell renderer.
 * Displays lookup field values with optional click handler or Dynamics navigation.
 *
 * Navigation is enabled when:
 * - dynamicsBaseUrl is provided
 * - column.lookupTargetEntity is configured
 * - The lookup has a value (not null)
 */
export function LookupCell<T>({ item, value, column, dynamicsBaseUrl }: LookupCellProps<T>): JSX.Element {
  // For lookup fields, try to get display value from the lookup display field
  let displayValue: string;

  if (column.formatValue) {
    displayValue = column.formatValue(value, item);
  } else if (column.lookupDisplayField && typeof item === 'object' && item !== null) {
    const lookupValue = (item as Record<string, unknown>)[column.lookupDisplayField];
    displayValue = lookupValue !== null && lookupValue !== undefined
      ? String(lookupValue)
      : '-';
  } else if (typeof value === 'object' && value !== null) {
    // Try common lookup value patterns
    const lookupObj = value as Record<string, unknown>;
    displayValue = String(lookupObj.name || lookupObj.fullname || lookupObj.title || '-');
  } else {
    displayValue = value !== null && value !== undefined ? String(value) : '-';
  }

  // Extract lookup ID for navigation
  // Dynamics stores lookup IDs in different formats depending on $expand usage:
  // 1. Without $expand: _fieldname_value (e.g., _primarycontactid_value)
  // 2. With $expand: item.fieldname.entityid (e.g., item.primarycontactid.contactid)
  const fieldName = column.fieldName || column.key;
  const itemRecord = item as Record<string, unknown>;

  // Try _fieldname_value format first (non-expanded)
  const lookupIdKey = `_${fieldName}_value`;
  let lookupId = itemRecord[lookupIdKey] as string | undefined;

  // If not found, try expanded object format
  if (!lookupId && column.lookupPrimaryIdAttribute) {
    const expandedValue = itemRecord[fieldName];
    if (expandedValue && typeof expandedValue === 'object') {
      const expanded = expandedValue as Record<string, unknown>;
      lookupId = expanded[column.lookupPrimaryIdAttribute] as string | undefined;
    }
  }

  // Fallback: try common ID patterns in expanded object
  if (!lookupId) {
    const expandedValue = itemRecord[fieldName];
    if (expandedValue && typeof expandedValue === 'object') {
      const expanded = expandedValue as Record<string, unknown>;
      // Try targetentityid (e.g., contactid, accountid)
      if (column.lookupTargetEntity) {
        lookupId = expanded[`${column.lookupTargetEntity}id`] as string | undefined;
      }
      // Try generic patterns
      if (!lookupId) {
        lookupId = (expanded.id || expanded.Id) as string | undefined;
      }
    }
  }

  // Determine if navigation is available
  const canNavigate = !!(dynamicsBaseUrl && column.lookupTargetEntity && lookupId && displayValue !== '-');

  // Handle navigation to Dynamics record
  const handleNavigate = () => {
    if (canNavigate) {
      const url = `${dynamicsBaseUrl}/main.aspx?etn=${column.lookupTargetEntity}&id=${lookupId}&pagetype=entityrecord`;
      window.open(url, '_blank');
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if ((event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      if (column.onLinkClick) {
        column.onLinkClick(item);
      } else if (canNavigate) {
        handleNavigate();
      }
    }
  };

  // If there's a custom click handler, use it (priority over navigation)
  if (column.onLinkClick && displayValue !== '-') {
    const handleClick = () => {
      if (column.onLinkClick) {
        column.onLinkClick(item);
      }
    };

    return (
      <div className={cellClass}>
        <span
          className={linkCellClass}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={0}
          title={displayValue}
        >
          {displayValue}
        </span>
      </div>
    );
  }

  // If navigation is available, render as clickable link
  if (canNavigate) {
    return (
      <div className={cellClass}>
        <span
          className={linkCellClass}
          onClick={handleNavigate}
          onKeyDown={handleKeyDown}
          role="link"
          tabIndex={0}
          title={`Open ${displayValue} in Dynamics 365`}
        >
          {displayValue}
        </span>
      </div>
    );
  }

  // Default: render as blue link-colored text (lookups read as links in Dynamics
  // grids), even when no navigation/click target is wired. Empty ("-") stays muted.
  return (
    <div className={cellClass}>
      <Text
        title={displayValue !== '-' ? displayValue : undefined}
        style={displayValue !== '-' ? { color: '#0078d4' } : undefined}
      >
        {displayValue}
      </Text>
    </div>
  );
}
