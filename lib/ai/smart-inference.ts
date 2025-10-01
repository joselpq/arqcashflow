/**
 * Smart Inference Utilities for AI Command Agent
 *
 * Provides intelligent data inference, fuzzy matching, and natural language parsing
 * to reduce user input friction and improve the command experience.
 */

/**
 * Parse natural language dates into ISO date strings
 */
export function parseNaturalDate(input: string): string | null {
  const normalized = input.toLowerCase().trim()
  const today = new Date()

  // Reset time to start of day for consistent comparisons
  today.setHours(0, 0, 0, 0)

  // Ontem (yesterday)
  if (['ontem', 'yesterday'].includes(normalized)) {
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday.toISOString().split('T')[0]
  }

  // Hoje (today)
  if (['hoje', 'today', 'hj'].includes(normalized)) {
    return today.toISOString().split('T')[0]
  }

  // Amanhã (tomorrow)
  if (['amanhã', 'amanha', 'tomorrow'].includes(normalized)) {
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  // Próxima semana (next week) - Monday of next week
  if (normalized.includes('próxima semana') || normalized.includes('proxima semana') || normalized.includes('next week')) {
    const nextWeek = new Date(today)
    const daysUntilMonday = (8 - today.getDay()) % 7 || 7
    nextWeek.setDate(nextWeek.getDate() + daysUntilMonday)
    return nextWeek.toISOString().split('T')[0]
  }

  // Próximo mês (next month) - First day of next month
  if (normalized.includes('próximo mês') || normalized.includes('proximo mes') || normalized.includes('next month')) {
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
    return nextMonth.toISOString().split('T')[0]
  }

  // DD/MM or DD/MM/YYYY format
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
 * Infer expense category from keywords
 */
export function inferExpenseCategory(description: string): string | null {
  const normalized = description.toLowerCase()

  // Transportation
  if (/gasolina|combustível|uber|taxi|ônibus|metrô|transporte|viagem|pedágio|estacionamento/.test(normalized)) {
    return 'transport'
  }

  // Food/Meals
  if (/almoço|jantar|café|restaurante|comida|alimentação|lanche|refeição/.test(normalized)) {
    return 'meals'
  }

  // Office/Materials
  if (/escritório|papelaria|material|caneta|papel|impressora|toner|office/.test(normalized)) {
    return 'office'
  }

  // Software/Technology
  if (/software|saas|assinatura|licença|app|cloud|hosting|domínio/.test(normalized)) {
    return 'software'
  }

  // Utilities
  if (/luz|água|internet|telefone|celular|energia|conta/.test(normalized)) {
    return 'utilities'
  }

  // Rent
  if (/aluguel|rent|locação/.test(normalized)) {
    return 'rent'
  }

  // Marketing
  if (/marketing|publicidade|anúncio|google ads|facebook|instagram|propaganda/.test(normalized)) {
    return 'marketing'
  }

  // Professional Services
  if (/contador|advogado|consultoria|consultor|serviço profissional/.test(normalized)) {
    return 'professional-services'
  }

  // Materials (construction/project)
  if (/material de construção|cimento|tinta|madeira|ferragem|tijolo/.test(normalized)) {
    return 'materials'
  }

  // Labor
  if (/mão de obra|pedreiro|pintor|eletricista|encanador|operário/.test(normalized)) {
    return 'labor'
  }

  // Equipment
  if (/equipamento|ferramenta|máquina|betoneira|andaime/.test(normalized)) {
    return 'equipment'
  }

  return null
}

/**
 * Fuzzy string matching for entity names
 * Returns a score between 0 and 1
 */
export function fuzzyMatch(search: string, target: string): number {
  const s = search.toLowerCase().trim()
  const t = target.toLowerCase().trim()

  // Exact match
  if (s === t) return 1.0

  // Contains match
  if (t.includes(s)) {
    return 0.8 + (s.length / t.length) * 0.2
  }

  // Levenshtein distance-based similarity
  const distance = levenshteinDistance(s, t)
  const maxLen = Math.max(s.length, t.length)
  const similarity = 1 - (distance / maxLen)

  return Math.max(0, similarity)
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(s1: string, s2: string): number {
  const len1 = s1.length
  const len2 = s2.length
  const matrix: number[][] = []

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }

  // Calculate distances
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      )
    }
  }

  return matrix[len1][len2]
}

/**
 * Find best matching entity from a list
 */
export function findBestMatch<T>(
  search: string,
  entities: T[],
  getMatchField: (entity: T) => string,
  threshold: number = 0.6
): { entity: T; score: number } | null {
  let bestMatch: { entity: T; score: number } | null = null

  for (const entity of entities) {
    const fieldValue = getMatchField(entity)
    const score = fuzzyMatch(search, fieldValue)

    if (score >= threshold && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { entity, score }
    }
  }

  return bestMatch
}

/**
 * Find all matching entities above threshold
 */
export function findAllMatches<T>(
  search: string,
  entities: T[],
  getMatchField: (entity: T) => string,
  threshold: number = 0.6
): Array<{ entity: T; score: number }> {
  const matches: Array<{ entity: T; score: number }> = []

  for (const entity of entities) {
    const fieldValue = getMatchField(entity)
    const score = fuzzyMatch(search, fieldValue)

    if (score >= threshold) {
      matches.push({ entity, score })
    }
  }

  // Sort by score descending
  return matches.sort((a, b) => b.score - a.score)
}

/**
 * Parse Brazilian currency amounts
 */
export function parseBrazilianCurrency(input: string): number | null {
  // Remove currency symbols and normalize
  let normalized = input
    .replace(/R\$\s*/gi, '')
    .replace(/\./g, '') // Remove thousand separators
    .replace(/,/g, '.') // Convert decimal comma to dot
    .trim()

  // Handle written numbers (basic)
  const writtenNumbers: Record<string, number> = {
    'zero': 0, 'um': 1, 'dois': 2, 'três': 3, 'tres': 3,
    'quatro': 4, 'cinco': 5, 'seis': 6, 'sete': 7,
    'oito': 8, 'nove': 9, 'dez': 10, 'vinte': 20,
    'trinta': 30, 'quarenta': 40, 'cinquenta': 50,
    'cem': 100, 'duzentos': 200, 'mil': 1000
  }

  const lowerInput = input.toLowerCase()
  for (const [word, value] of Object.entries(writtenNumbers)) {
    if (lowerInput.includes(word)) {
      return value
    }
  }

  // Parse as float
  const amount = parseFloat(normalized)
  return isNaN(amount) ? null : amount
}

/**
 * Infer receivable type/category from description
 */
export function inferReceivableCategory(description: string): string | null {
  const normalized = description.toLowerCase()

  if (/rt|responsabilidade técnica|responsabilidade tecnica/.test(normalized)) {
    return 'rt'
  }

  if (/projeto|design|desenho/.test(normalized)) {
    return 'design'
  }

  if (/obra|execução|execucao|construção|construcao/.test(normalized)) {
    return 'construction'
  }

  if (/consultoria|assessoria/.test(normalized)) {
    return 'consulting'
  }

  if (/milestone|parcela|etapa/.test(normalized)) {
    return 'milestone'
  }

  return null
}
