/**
 * Minimal fuzzy matching utilities for entity lookup
 *
 * Note: These are NOT for data inference (that's Claude's job per ADR-008).
 * These are ONLY for matching user references to existing database entities.
 */

/**
 * Simple fuzzy string matching using Levenshtein distance
 * Returns a score between 0 and 1
 */
export function fuzzyMatch(search: string, target: string): number {
  const s = search.toLowerCase().trim()
  const t = target.toLowerCase().trim()

  // Exact match
  if (s === t) return 1.0

  // Remove common suffixes/prefixes for comparison (handles "RV" vs "RV (6)")
  const cleanSearch = s.replace(/\s*\([^)]*\)\s*/g, '').trim()
  const cleanTarget = t.replace(/\s*\([^)]*\)\s*/g, '').trim()

  // Exact match after cleaning
  if (cleanSearch === cleanTarget) return 0.95

  // Substring match
  if (t.includes(s) || s.includes(t)) return 0.8

  // Levenshtein distance
  const distance = levenshteinDistance(cleanSearch, cleanTarget)
  const maxLen = Math.max(cleanSearch.length, cleanTarget.length)

  if (maxLen === 0) return 1.0

  return 1.0 - (distance / maxLen)
}

/**
 * Find all matching entities above a threshold
 */
export function findAllMatches<T>(
  search: string,
  entities: T[],
  getField: (entity: T) => string,
  threshold = 0.6
): Array<{ entity: T; score: number }> {
  return entities
    .map(entity => ({
      entity,
      score: fuzzyMatch(search, getField(entity))
    }))
    .filter(result => result.score >= threshold)
    .sort((a, b) => b.score - a.score)
}

/**
 * Find best matching entity (highest score above threshold)
 */
export function findBestMatch<T>(
  search: string,
  entities: T[],
  getField: (entity: T) => string,
  threshold = 0.6
): { entity: T; score: number } | null {
  const matches = findAllMatches(search, entities, getField, threshold)
  return matches.length > 0 ? matches[0] : null
}

/**
 * Parse Brazilian currency format to number
 * Examples: "R$ 1.500,00" → 1500.00, "R$50" → 50.00
 */
export function parseBrazilianCurrency(value: string): number {
  if (typeof value === 'number') return value

  // Remove R$, spaces, and convert
  let cleaned = value.replace(/R\$\s*/gi, '').trim()

  // Brazilian format: 1.500,00 (dot = thousands, comma = decimal)
  // Remove thousand separators (dots)
  cleaned = cleaned.replace(/\./g, '')

  // Convert decimal separator (comma to dot)
  cleaned = cleaned.replace(/,/, '.')

  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Parse natural language dates to ISO format
 * Examples: "ontem" → "2025-09-30", "15/10" → "2025-10-15"
 */
export function parseNaturalDate(input: string): string | null {
  const normalized = input.toLowerCase().trim()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Yesterday
  if (['ontem', 'yesterday'].includes(normalized)) {
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday.toISOString().split('T')[0]
  }

  // Today
  if (['hoje', 'today', 'hj'].includes(normalized)) {
    return today.toISOString().split('T')[0]
  }

  // Tomorrow
  if (['amanhã', 'amanha', 'tomorrow'].includes(normalized)) {
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  // DD/MM or DD/MM/YYYY
  const dateMatch = normalized.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/)
  if (dateMatch) {
    const day = parseInt(dateMatch[1])
    const month = parseInt(dateMatch[2]) - 1 // JS months are 0-indexed
    const year = dateMatch[3]
      ? (dateMatch[3].length === 2 ? 2000 + parseInt(dateMatch[3]) : parseInt(dateMatch[3]))
      : today.getFullYear()

    const date = new Date(year, month, day)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }
  }

  return null
}

/**
 * Levenshtein distance algorithm
 * (Minimal implementation for fuzzy matching)
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length
  const len2 = str2.length
  const matrix: number[][] = []

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  return matrix[len1][len2]
}
