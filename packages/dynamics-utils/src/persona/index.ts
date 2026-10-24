/**
 * Persona utilities for generating initials and consistent colors.
 */

const PERSONA_COLORS = [
  '#0078d4', '#00bcf2', '#008272', '#107c10',
  '#5c2d91', '#b4009e', '#e3008c', '#d83b01',
  '#ca5010', '#986f0b', '#498205', '#038387',
];

/**
 * Extract initials from a display name.
 * Returns first letter of first two words, or first two letters of single word.
 */
export function getInitials(name: string): string {
  if (!name) return '?';
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return words[0].substring(0, 2).toUpperCase();
}

/**
 * Get a consistent color for a persona based on name hash.
 * Same name always produces the same color.
 */
export function getPersonaColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return PERSONA_COLORS[Math.abs(hash) % PERSONA_COLORS.length];
}

export { PERSONA_COLORS };
