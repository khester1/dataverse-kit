/**
 * Form validation utilities.
 */

/**
 * Field definition for validation.
 * Minimal interface - consumers can extend with their own properties.
 */
export interface ValidatableField {
  logicalName: string;
  label: string;
  required?: boolean;
}

/**
 * Validation error for a specific field.
 */
export interface FieldValidationError {
  fieldName: string;
  fieldLabel: string;
  message: string;
}

/**
 * Result of validating required fields.
 */
export interface RequiredFieldsValidationResult {
  isValid: boolean;
  errors: FieldValidationError[];
}

/**
 * Check if a value is empty (null, undefined, or empty string).
 */
function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  return false;
}

/**
 * Validate that all required fields have values.
 */
export function validateRequiredFields(
  fields: ValidatableField[],
  data: Record<string, unknown>
): RequiredFieldsValidationResult {
  const errors: FieldValidationError[] = [];

  for (const field of fields) {
    if (field.required) {
      const value = data[field.logicalName];
      if (isEmptyValue(value)) {
        errors.push({
          fieldName: field.logicalName,
          fieldLabel: field.label,
          message: `${field.label} is required`,
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Format validation errors into a user-friendly message.
 */
export function formatValidationErrors(errors: FieldValidationError[]): string {
  if (errors.length === 0) return '';
  if (errors.length === 1) return errors[0].message;
  return `Please fill in the following required fields: ${errors.map(e => e.fieldLabel).join(', ')}`;
}
