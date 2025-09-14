// Utility functions for fuzzy matching and text similarity

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .trim()
}

export function calculateSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeText(str1)
  const norm2 = normalizeText(str2)

  if (norm1 === norm2) return 1.0
  if (norm1.length === 0 || norm2.length === 0) return 0

  // Check if one is contained in the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return Math.max(norm2.length / norm1.length, norm1.length / norm2.length) * 0.9
  }

  // Simple Levenshtein-based similarity
  const matrix = Array(norm2.length + 1).fill(null).map(() => Array(norm1.length + 1).fill(null))

  for (let i = 0; i <= norm1.length; i++) matrix[0][i] = i
  for (let j = 0; j <= norm2.length; j++) matrix[j][0] = j

  for (let j = 1; j <= norm2.length; j++) {
    for (let i = 1; i <= norm1.length; i++) {
      const cost = norm1[i - 1] === norm2[j - 1] ? 0 : 1
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + cost // substitution
      )
    }
  }

  const distance = matrix[norm2.length][norm1.length]
  const maxLength = Math.max(norm1.length, norm2.length)
  return (maxLength - distance) / maxLength
}

export function findBestMatches(
  query: string,
  candidates: string[],
  threshold: number = 0.6,
  maxResults: number = 5
): Array<{ text: string; similarity: number }> {
  const matches = candidates
    .map(candidate => ({
      text: candidate,
      similarity: calculateSimilarity(query, candidate)
    }))
    .filter(match => match.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxResults)

  return matches
}

export function findContractMatches(
  query: string,
  contracts: Array<{ id: string; clientName: string; projectName: string; category?: string }>,
  threshold: number = 0.5
): Array<{ contract: any; similarity: number; matchField: string }> {
  const matches: Array<{ contract: any; similarity: number; matchField: string }> = []

  for (const contract of contracts) {
    // Check client name
    const clientSim = calculateSimilarity(query, contract.clientName)
    if (clientSim >= threshold) {
      matches.push({ contract, similarity: clientSim, matchField: 'cliente' })
    }

    // Check project name
    const projectSim = calculateSimilarity(query, contract.projectName)
    if (projectSim >= threshold) {
      matches.push({ contract, similarity: projectSim, matchField: 'projeto' })
    }

    // Check category if exists
    if (contract.category) {
      const categorySim = calculateSimilarity(query, contract.category)
      if (categorySim >= threshold) {
        matches.push({ contract, similarity: categorySim, matchField: 'categoria' })
      }
    }
  }

  return matches
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5) // Top 5 matches
}