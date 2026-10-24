import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { TextField, mergeStyles, Icon, Callout, DirectionalHint } from '@fluentui/react';
import { CellRendererProps, IReusableColumn, IApiService } from '../types';
import {
  editableCellClass,
  editableCellInputWrapperClass,
  dirtyCellIndicatorClass,
  errorCellIndicatorClass,
  cellErrorTextClass,
  lookupCellContainerClass,
  lookupDropdownItemClass,
  lookupDropdownItemActiveClass,
  lookupDropdownNoneOptionClass,
  lookupLoadingClass,
  lookupNoResultsClass,
  lookupClearButtonClass,
  lookupReadModeLinkClass,
} from '../styles';

/**
 * Lookup option for dropdown list.
 */
export interface LookupOption {
  id: string;
  name: string;
}

/**
 * Lookup value stored in edited state.
 */
export interface LookupValue {
  id: string;
  name: string;
  entitySetName?: string;
}

/**
 * Extended props for editable lookup cell.
 */
export interface EditableLookupCellProps<T> extends CellRendererProps<T> {
  /** Whether the grid is in edit mode */
  isEditMode: boolean;
  /** Whether this cell has been modified */
  isDirty: boolean;
  /** Current edited value (if different from original) */
  editedValue?: LookupValue | null;
  /** Callback when value changes */
  onValueChange: (rowKey: string, fieldName: string, value: unknown, originalValue: unknown) => void;
  /** Validation error message */
  errorMessage?: string;
  /** Callback when validation error changes */
  onValidationError?: (rowKey: string, fieldName: string, error: string | undefined) => void;
  /** API service for search queries */
  apiService?: IApiService;
  /** Dynamics 365 base URL for navigation links */
  dynamicsBaseUrl?: string;
  /**
   * Consumer-supplied search callback (fetch-free). When present it is used
   * INSTEAD of `apiService` — this is grid-kit's contract (the host owns the
   * query; the cell only renders the returned options). Falls back to
   * `column.lookupSearch` when not passed directly.
   */
  searchLookup?: (term: string) => Promise<LookupOption[]>;
}

/** Normalize a consumer search result to a `LookupOption` (accepts `{id,name}` or `{key,text}`). */
function normalizeLookupOption(o: LookupOption | { key: string; text: string }): LookupOption {
  if (o && typeof o === 'object' && 'id' in o) {
    return { id: String(o.id), name: String((o as LookupOption).name ?? '') };
  }
  const alt = o as { key?: unknown; text?: unknown };
  return { id: String(alt?.key ?? ''), name: String(alt?.text ?? '') };
}

// Styles for the search input in edit mode
const lookupFieldStyles = {
  root: {
    width: '100%',
  },
  fieldGroup: {
    height: 28,
    minHeight: 28,
    border: 'none',
    backgroundColor: 'transparent',
    selectors: {
      ':hover': {
        border: '1px solid #c8c6c4',
        backgroundColor: 'white',
      },
      ':focus-within': {
        border: '1px solid #0078d4',
        backgroundColor: 'white',
      },
    },
  },
  field: {
    fontSize: 13,
    padding: '0 28px 0 8px', // Extra padding for clear button
  },
};

const lookupFieldErrorStyles = {
  ...lookupFieldStyles,
  fieldGroup: {
    ...lookupFieldStyles.fieldGroup,
    border: '1px solid #d13438',
    selectors: {
      ':hover': {
        border: '1px solid #d13438',
        backgroundColor: 'white',
      },
      ':focus-within': {
        border: '1px solid #d13438',
        backgroundColor: 'white',
      },
    },
  },
};

const readOnlyClass = mergeStyles({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: 13,
  width: '100%',
});

/**
 * Extract the lookup display value from the item.
 * Handles various formats: OData annotations, expanded objects, formatted values.
 */
function extractLookupDisplayValue<T>(
  item: T,
  column: IReusableColumn<T>,
  value: unknown
): string {
  const fieldName = column.fieldName || column.key;

  // 1. Check for custom format function
  if (column.formatValue) {
    const formatted = column.formatValue(value, item);
    if (formatted && formatted !== '') return formatted;
  }

  // 2. Check for OData formatted value annotation on lookup
  const formattedKey = `_${fieldName}_value@OData.Community.Display.V1.FormattedValue`;
  const itemRecord = item as Record<string, unknown>;
  if (itemRecord[formattedKey] !== undefined) {
    return String(itemRecord[formattedKey]);
  }

  // 3. Check for lookupDisplayField on the item
  if (column.lookupDisplayField && itemRecord[column.lookupDisplayField] !== undefined) {
    return String(itemRecord[column.lookupDisplayField]);
  }

  // 4. Check for expanded lookup object
  if (value && typeof value === 'object') {
    const expanded = value as Record<string, unknown>;
    // Try common display field patterns
    if (expanded.fullname) return String(expanded.fullname);
    if (expanded.name) return String(expanded.name);
    if (expanded.title) return String(expanded.title);
  }

  return '';
}

/**
 * Extract the lookup ID value from the item.
 */
function extractLookupId<T>(
  item: T,
  column: IReusableColumn<T>,
  value: unknown
): string | null {
  const fieldName = column.fieldName || column.key;
  const itemRecord = item as Record<string, unknown>;

  // Check for _fieldname_value format (OData lookup reference)
  const lookupValueKey = `_${fieldName}_value`;
  if (itemRecord[lookupValueKey]) {
    return String(itemRecord[lookupValueKey]);
  }

  // Check expanded object
  if (value && typeof value === 'object') {
    const expanded = value as Record<string, unknown>;
    // Try to find the ID from expanded lookup
    const idField = column.lookupPrimaryIdAttribute || 'id';
    if (expanded[idField]) return String(expanded[idField]);
    // Check for common ID patterns
    if (expanded.contactid) return String(expanded.contactid);
    if (expanded.accountid) return String(expanded.accountid);
    if (expanded.systemuserid) return String(expanded.systemuserid);
  }

  return null;
}

/**
 * Editable lookup cell renderer.
 * Displays as a clickable link in read mode, as a searchable dropdown in edit mode.
 * Shows blue indicator when dirty, red indicator when has validation error.
 */
export function EditableLookupCell<T extends { key: string }>({
  item,
  column,
  value,
  itemKey,
  isEditMode,
  isDirty,
  editedValue,
  onValueChange,
  errorMessage,
  onValidationError,
  apiService,
  dynamicsBaseUrl,
  searchLookup,
}: EditableLookupCellProps<T>): JSX.Element {
  const fieldName = column.fieldName || column.key;

  // Prefer the consumer search callback (direct prop or column config) over apiService.
  const search = searchLookup ?? column.lookupSearch;

  // Extract current lookup value
  const originalDisplayValue = extractLookupDisplayValue(item, column, value);
  const originalId = extractLookupId(item, column, value);

  // Current value (edited or original)
  const currentValue = useMemo<LookupValue | null>(() => {
    if (editedValue !== undefined) {
      return editedValue;
    }
    if (originalId && originalDisplayValue) {
      return { id: originalId, name: originalDisplayValue };
    }
    return null;
  }, [editedValue, originalId, originalDisplayValue]);

  // Local state
  // Initialize with original display value to ensure it shows immediately
  const initialDisplayValue = currentValue?.name || originalDisplayValue || '';
  const [searchText, setSearchText] = useState(initialDisplayValue);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<LookupOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [hasSearched, setHasSearched] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<number | null>(null);

  // Sync search text when edited value changes OR when initial value is available
  useEffect(() => {
    const displayValue = currentValue?.name || originalDisplayValue || '';
    setSearchText(displayValue);
  }, [currentValue, originalDisplayValue]);

  // Handle Callout dismiss
  const handleCalloutDismiss = useCallback(() => {
    setIsDropdownOpen(false);
  }, []);

  // Execute the search API call
  const executeSearchQuery = useCallback(
    async (query: string, useContains: boolean): Promise<LookupOption[]> => {
      const searchField = column.lookupSearchField || 'name';
      const primaryIdAttr = column.lookupPrimaryIdAttribute || `${column.lookupTargetEntity}id`;
      const additionalFields = column.lookupSelectFields || '';

      // Build select fields
      const selectFields = [primaryIdAttr, searchField];
      if (additionalFields) {
        additionalFields.split(',').forEach(f => {
          const trimmed = f.trim();
          if (trimmed && !selectFields.includes(trimmed)) {
            selectFields.push(trimmed);
          }
        });
      }

      // Build OData query
      let options = `?$select=${selectFields.join(',')}&$top=15&$orderby=${searchField} asc`;

      // Build filter conditions
      const filterConditions: string[] = [];

      // Add search filter if query is provided
      if (query.trim()) {
        const escapedQuery = query.replace(/'/g, "''");
        // Use contains for more flexible matching (finds "Nancy" anywhere in the name)
        // startswith is faster but less flexible
        if (useContains) {
          filterConditions.push(`contains(${searchField}, '${escapedQuery}')`);
        } else {
          filterConditions.push(`startswith(${searchField}, '${escapedQuery}')`);
        }
      }

      // Add custom filter from column config (e.g., "statecode eq 0" for active only)
      if (column.lookupFilter) {
        filterConditions.push(`(${column.lookupFilter})`);
      }

      // Combine filters with 'and'
      if (filterConditions.length > 0) {
        options += `&$filter=${filterConditions.join(' and ')}`;
      }

      const result = await apiService!.retrieveMultipleRecords<Record<string, unknown>>(
        column.lookupEntitySetName!,
        options
      );

      return result.value.map((record) => ({
        id: String(record[primaryIdAttr]),
        name: String(record[searchField] || ''),
      }));
    },
    [apiService, column.lookupEntitySetName, column.lookupSearchField, column.lookupPrimaryIdAttribute, column.lookupTargetEntity, column.lookupFilter, column.lookupSelectFields]
  );

  // Search for lookup records
  const performSearch = useCallback(
    async (query: string): Promise<void> => {
      // Fetch-free path: a consumer-supplied search callback (grid-kit's contract).
      // The consumer owns any startswith/contains fallback server-side.
      if (search) {
        setIsSearching(true);
        setHasSearched(true);
        try {
          const raw = await search(query);
          setSearchResults(raw.map(normalizeLookupOption));
          setActiveIndex(-1);
        } catch (err) {
          console.error('[EditableLookupCell] searchLookup error:', err);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
        return;
      }

      // apiService path (unchanged).
      if (!apiService || !column.lookupEntitySetName) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      setHasSearched(true);

      try {
        // First try with startswith (faster)
        let results = await executeSearchQuery(query, false);

        // If no results and we have a search query, try with contains (more flexible)
        if (results.length === 0 && query.trim()) {
          results = await executeSearchQuery(query, true);
        }

        setSearchResults(results);
        setActiveIndex(-1);
      } catch (err) {
        console.error('[EditableLookupCell] Search error:', err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [search, apiService, column.lookupEntitySetName, executeSearchQuery]
  );

  // Debounced search
  const debouncedSearch = useCallback(
    (query: string) => {
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = window.setTimeout(() => {
        performSearch(query);
      }, 300);
    },
    [performSearch]
  );

  // Handle input change
  const handleInputChange = useCallback(
    (_: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) => {
      const val = newValue ?? '';
      setSearchText(val);

      // Open dropdown and trigger search
      setIsDropdownOpen(true);
      debouncedSearch(val);
    },
    [debouncedSearch]
  );

  // Handle input focus - always load initial options
  const handleFocus = useCallback(() => {
    setIsDropdownOpen(true);
    // Always do an empty search on focus to populate with available options
    // This ensures users see options even if there's a current value
    if (!hasSearched || searchResults.length === 0) {
      // Search with empty string to get initial list of all options
      performSearch('');
    }
  }, [hasSearched, performSearch, searchResults.length]);

  // Handle selection of a lookup option
  const handleSelect = useCallback(
    (option: LookupOption | null) => {
      setIsDropdownOpen(false);

      if (option === null) {
        // Clear selection
        setSearchText('');
        onValueChange(itemKey, fieldName, null, value);
      } else {
        // Set new selection
        setSearchText(option.name);
        const newValue: LookupValue = {
          id: option.id,
          name: option.name,
          entitySetName: column.lookupEntitySetName,
        };
        onValueChange(itemKey, fieldName, newValue, value);
      }

      // Clear any validation errors
      if (onValidationError) {
        onValidationError(itemKey, fieldName, undefined);
      }
    },
    [itemKey, fieldName, value, column.lookupEntitySetName, onValueChange, onValidationError]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isDropdownOpen) {
        if (event.key === 'ArrowDown' || event.key === 'Enter') {
          setIsDropdownOpen(true);
          if (!hasSearched) {
            performSearch(searchText);
          }
        }
        return;
      }

      // Total items: 1 (None option) + searchResults.length
      const totalItems = searchResults.length + 1;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setActiveIndex((prev) => (prev < totalItems - 1 ? prev + 1 : prev));
          break;
        case 'ArrowUp':
          event.preventDefault();
          setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
          break;
        case 'Enter':
          event.preventDefault();
          if (activeIndex === 0) {
            // None option selected
            handleSelect(null);
          } else if (activeIndex > 0 && activeIndex <= searchResults.length) {
            // Regular option selected
            handleSelect(searchResults[activeIndex - 1]);
          } else if (searchResults.length === 1) {
            // Auto-select single result
            handleSelect(searchResults[0]);
          }
          break;
        case 'Tab':
          // Select active or first result on tab
          if (activeIndex === 0) {
            handleSelect(null);
          } else if (activeIndex > 0 && activeIndex <= searchResults.length) {
            handleSelect(searchResults[activeIndex - 1]);
          } else if (searchResults.length > 0) {
            handleSelect(searchResults[0]);
          }
          setIsDropdownOpen(false);
          break;
        case 'Escape':
          event.preventDefault();
          setIsDropdownOpen(false);
          setSearchText(currentValue?.name || '');
          break;
      }
    },
    [isDropdownOpen, activeIndex, searchResults, hasSearched, performSearch, searchText, handleSelect, currentValue]
  );

  // Handle clear button click
  const handleClear = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      handleSelect(null);
    },
    [handleSelect]
  );

  // Handle click on read-mode link (open in Dynamics)
  const handleLinkClick = useCallback(() => {
    if (!dynamicsBaseUrl || !currentValue?.id || !column.lookupTargetEntity) return;

    const url = `${dynamicsBaseUrl}/main.aspx?etn=${column.lookupTargetEntity}&id=${currentValue.id}&pagetype=entityrecord`;
    window.open(url, '_blank');
  }, [dynamicsBaseUrl, currentValue, column.lookupTargetEntity]);

  // Handle link keydown for accessibility
  const handleLinkKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleLinkClick();
      }
    },
    [handleLinkClick]
  );

  // ============================================================================
  // Read Mode Rendering
  // ============================================================================
  if (!isEditMode) {
    const displayValue = currentValue?.name || originalDisplayValue || '-';

    // Consumer-supplied click handler (e.g. grid-kit navigation) wins over the
    // built-in dynamicsBaseUrl link — keeps read-mode parity with LookupCell.
    if (column.onLinkClick && displayValue !== '-') {
      const onClick = (): void => column.onLinkClick!(item);
      return (
        <div className={editableCellClass}>
          <span
            className={lookupReadModeLinkClass}
            onClick={onClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }}
            role="button"
            tabIndex={0}
            title={displayValue}
          >
            {displayValue}
          </span>
        </div>
      );
    }

    // If we have a link and a valid lookup, show as clickable link
    if (dynamicsBaseUrl && column.lookupTargetEntity && currentValue?.id && displayValue !== '-') {
      return (
        <div className={editableCellClass}>
          <span
            className={lookupReadModeLinkClass}
            onClick={handleLinkClick}
            onKeyDown={handleLinkKeyDown}
            role="button"
            tabIndex={0}
            title={`Open ${displayValue} in Dynamics 365`}
          >
            {displayValue}
          </span>
        </div>
      );
    }

    // Plain text display — blue link-colored (a lookup reads as a link in Dynamics
    // grids) even with no navigation wired; empty ("-") stays muted.
    return (
      <div className={editableCellClass}>
        <span
          className={readOnlyClass}
          style={displayValue !== '-' ? { color: '#0078d4' } : undefined}
          title={displayValue !== '-' ? displayValue : undefined}
        >
          {displayValue}
        </span>
      </div>
    );
  }

  // ============================================================================
  // Edit Mode Rendering
  // ============================================================================

  // Determine indicator class
  let indicatorClass = '';
  if (errorMessage) {
    indicatorClass = errorCellIndicatorClass;
  } else if (isDirty) {
    indicatorClass = dirtyCellIndicatorClass;
  }

  const wrapperClass = mergeStyles(editableCellInputWrapperClass, indicatorClass);

  // Callout styles
  const calloutStyles = {
    root: {
      padding: 0,
      boxShadow: '0 3px 6px rgba(0, 0, 0, 0.16)',
    },
    calloutMain: {
      padding: 0,
      maxHeight: 200,
      overflowY: 'auto' as const,
      minWidth: 200,
    },
  };

  return (
    <div className={editableCellClass}>
      <div className={wrapperClass}>
        <div className={lookupCellContainerClass} ref={containerRef}>
          <TextField
            componentRef={inputRef as React.RefObject<any>}
            value={searchText}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            borderless
            styles={errorMessage ? lookupFieldErrorStyles : lookupFieldStyles}
            ariaLabel={`${column.name} lookup for ${item.key}`}
            placeholder={originalDisplayValue || "Search..."}
            autoComplete="off"
          />

          {/* Clear button */}
          {searchText && (
            <button
              className={lookupClearButtonClass}
              onClick={handleClear}
              type="button"
              aria-label="Clear selection"
              tabIndex={-1}
            >
              <Icon iconName="Cancel" style={{ fontSize: 10 }} />
            </button>
          )}
        </div>

        {/* Dropdown Callout - renders in portal to avoid overflow clipping */}
        {isDropdownOpen && containerRef.current && (
          <Callout
            target={containerRef.current}
            onDismiss={handleCalloutDismiss}
            isBeakVisible={false}
            directionalHint={DirectionalHint.bottomLeftEdge}
            styles={calloutStyles}
            calloutMaxHeight={200}
            setInitialFocus={false}
          >
            {/* None option (clear selection) */}
            <div
              className={mergeStyles(
                lookupDropdownNoneOptionClass,
                activeIndex === 0 ? lookupDropdownItemActiveClass : ''
              )}
              onClick={() => handleSelect(null)}
              role="option"
              aria-selected={activeIndex === 0}
            >
              (None)
            </div>

            {/* Loading state */}
            {isSearching && (
              <div className={lookupLoadingClass}>Searching...</div>
            )}

            {/* Search results */}
            {!isSearching && searchResults.length > 0 && searchResults.map((option, index) => (
              <div
                key={option.id}
                className={mergeStyles(
                  lookupDropdownItemClass,
                  activeIndex === index + 1 ? lookupDropdownItemActiveClass : ''
                )}
                onClick={() => handleSelect(option)}
                role="option"
                aria-selected={activeIndex === index + 1}
              >
                {option.name}
              </div>
            ))}

            {/* No results */}
            {!isSearching && hasSearched && searchResults.length === 0 && (
              <div className={lookupNoResultsClass}>No results found</div>
            )}
          </Callout>
        )}

        {errorMessage && (
          <span className={cellErrorTextClass} title={errorMessage}>
            {errorMessage}
          </span>
        )}
      </div>
    </div>
  );
}
