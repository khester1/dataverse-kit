/**
 * Shared type definitions for Dynamics 365 UI development.
 * Zero-dependency — usable in web resources, PCF controls, grid customizers, Node.
 */

// ============================================================================
// Field Types and Metadata
// ============================================================================

/**
 * Supported field types for rendering.
 */
export type FieldType =
  | 'string'
  | 'number'
  | 'currency'
  | 'decimal'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'email'
  | 'phone'
  | 'url'
  | 'lookup'
  | 'optionset'
  | 'multioptionset'
  | 'state'
  | 'status';

/**
 * Field definition with display metadata.
 * Used by generic components to render fields without entity-specific logic.
 */
export interface FieldDefinition {
  /** Logical name of the field (e.g., 'name', 'emailaddress1') */
  logicalName: string;
  /** Display label for the field */
  label: string;
  /** Field type for formatting and rendering */
  type: FieldType;
  /** Section this field belongs to (e.g., 'general', 'contact', 'address') */
  section: string;
  /** Whether this field is required */
  required?: boolean;
  /** Help text or tooltip */
  helpText?: string;
  /** Column span in a 2-column layout (default: 1) */
  span?: number;
  /** Whether the field is read-only */
  readOnly?: boolean;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Result of model validation.
 */
export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;
  /** Error messages if validation failed */
  errors: string[];
}

/**
 * Formatted field value with display text and raw value.
 */
export interface FormattedValue {
  /** Raw value from the record */
  raw: unknown;
  /** Formatted string for display */
  display: string;
  /** Whether the value is empty/null */
  isEmpty: boolean;
}

/**
 * Option set item for dropdowns.
 */
export interface OptionSetItem {
  value: number;
  label: string;
}
