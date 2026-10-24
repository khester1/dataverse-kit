/**
 * @khester/dynamics-utils
 *
 * Zero-dependency utilities for Dynamics 365 development.
 * Works everywhere: web resources, PCF controls, grid customizers, Node.
 */

// Types
export type {
  FieldType,
  FieldDefinition,
  FormattedValue,
  ValidationResult,
  OptionSetItem,
} from './types';

// Theme tokens
export {
  spacing,
  cssVars,
  dynamicsCeColors,
  dynamicsSpacing,
  dynamicsShadows,
  dynamicsBorderRadius,
} from './theme';

// Formatting
export {
  cleanGuid,
  formatCurrency,
  formatNumber,
  formatDate,
  formatDateTime,
  getStatusLabel,
} from './formatting';

// Export
export {
  formatValueForExport,
  generateCSV,
  generateJSON,
  downloadFile,
  exportToFile,
  generateDefaultFilename,
} from './export';
export type {
  ExportColumn,
  ExportFormat,
  FormatOptions,
} from './export';

// Import
export {
  parseCSV,
  parseJSON,
  detectFormat,
  parseFieldValue,
  mapHeadersToColumns,
  getHeaderToColumnKeyMap,
  validateImportData,
  csvRowsToRecords,
  jsonRecordsToColumnKeys,
  readFileContent,
  getFormatFromFilename,
} from './import';
export type {
  ImportColumn,
  ImportFormat,
  ImportValidationError,
  ImportResult,
  BatchCreateResult,
} from './import';

// Validation
export {
  validateRequiredFields,
  formatValidationErrors,
} from './validation';
export type {
  ValidatableField,
  FieldValidationError,
  RequiredFieldsValidationResult,
} from './validation';

// Persona
export {
  getInitials,
  getPersonaColor,
  PERSONA_COLORS,
} from './persona';

// Colors
export {
  STATUS_COLORS,
  getYIQBrightness,
  getContrastColor,
  isValidHexColor,
  normalizeHexColor,
  lightenColor,
  darkenColor,
  getStateCodeColor,
} from './colors';

// Helpers
export {
  parseQueryString,
  deepClone,
  debounce,
  isDynamicsEnvironment,
  isLocalhost,
} from './helpers';
