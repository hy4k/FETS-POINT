// Session capacity validation utilities

interface CapacityValidationResult {
  isValid: boolean
  warning?: string
  error?: string
}

/**
 * Validate session capacity with warnings and errors
 * @param candidateCount - Number of candidates in session
 * @returns Validation result with warnings/errors
 */
export const validateSessionCapacity = (candidateCount: number): CapacityValidationResult => {
  // Maximum capacity is 40 candidates per session
  const MAX_CAPACITY = 40
  const WARNING_THRESHOLD = 30
  
  if (candidateCount > MAX_CAPACITY) {
    return {
      isValid: false,
      error: `Session exceeds maximum capacity of ${MAX_CAPACITY} candidates`
    }
  }
  
  if (candidateCount >= WARNING_THRESHOLD) {
    return {
      isValid: true,
      warning: `Session approaching capacity (${candidateCount}/${MAX_CAPACITY} candidates)`
    }
  }
  
  return { isValid: true }
}

/**
 * Get capacity status color class for UI
 * @param candidateCount - Number of candidates
 * @returns CSS color classes
 */
export const getCapacityStatusColor = (candidateCount: number): string => {
  if (candidateCount >= 40) return 'text-red-600 bg-red-100'
  if (candidateCount >= 30) return 'text-orange-600 bg-orange-100'
  return 'text-green-600 bg-green-100'
}

/**
 * Format capacity display text
 * @param candidateCount - Number of candidates
 * @returns Formatted display text
 */
export const formatCapacityDisplay = (candidateCount: number): string => {
  return `${candidateCount}/40 candidates`
}