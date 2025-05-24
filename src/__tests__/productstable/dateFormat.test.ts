import {
  formatDate,
  formatDisplayDate,
  formatInputDate,
  getDateFormatPattern,
  getTodayFormatted
} from '@/utils/dateFormat'

describe('formatDate', () => {
  test('should format valid Date object', () => {
    const date = new Date('2023-12-25')
    const result = formatDate(date)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  test('should format valid ISO string', () => {
    const result = formatDate('2023-12-25T10:30:00.000Z')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  test('should format date string without time', () => {
    const result = formatDate('2023-12-25')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  test('should handle null input', () => {
    const result = formatDate(null)
    expect(result).toBe('')
  })

  test('should handle undefined input', () => {
    const result = formatDate(undefined)
    expect(result).toBe('')
  })

  test('should handle empty string input', () => {
    const result = formatDate('')
    expect(result).toBe('')
  })

  test('should handle invalid date string', () => {
    const result = formatDate('invalid-date')
    expect(result).toBe('')
  })

  test('should handle invalid Date object', () => {
    const invalidDate = new Date('invalid')
    const result = formatDate(invalidDate)
    expect(result).toBe('')
  })

  test('should format leap year date', () => {
    const result = formatDate('2024-02-29')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  test('should format end of year date', () => {
    const result = formatDate('2023-12-31')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  test('should format beginning of year date', () => {
    const result = formatDate('2023-01-01')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  test('should format date with timezone information', () => {
    const result = formatDate('2023-12-25T00:00:00+02:00')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })
})

describe('formatDisplayDate', () => {
  test('should format valid Date object for display', () => {
    const date = new Date('2023-12-25')
    const result = formatDisplayDate(date)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  test('should format valid ISO string for display', () => {
    const result = formatDisplayDate('2023-12-25T10:30:00.000Z')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  test('should handle null input for display', () => {
    const result = formatDisplayDate(null)
    expect(result).toBe('')
  })

  test('should handle undefined input for display', () => {
    const result = formatDisplayDate(undefined)
    expect(result).toBe('')
  })

  test('should handle empty string input for display', () => {
    const result = formatDisplayDate('')
    expect(result).toBe('')
  })

  test('should handle invalid date for display', () => {
    const result = formatDisplayDate('invalid-date')
    expect(result).toBe('')
  })

  test('should match formatDate output', () => {
    const date = '2023-12-25'
    const formatResult = formatDate(date)
    const displayResult = formatDisplayDate(date)
    expect(displayResult).toBe(formatResult)
  })
})

describe('formatInputDate', () => {
  test('should format valid Date object for input', () => {
    const date = new Date('2023-12-25')
    const result = formatInputDate(date)
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  test('should format valid ISO string for input', () => {
    const result = formatInputDate('2023-12-25T10:30:00.000Z')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  test('should format date string for input', () => {
    const result = formatInputDate('2023-12-25')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  test('should handle null input for input', () => {
    const result = formatInputDate(null)
    expect(result).toBe('')
  })

  test('should handle undefined input for input', () => {
    const result = formatInputDate(undefined)
    expect(result).toBe('')
  })

  test('should handle empty string input for input', () => {
    const result = formatInputDate('')
    expect(result).toBe('')
  })

  test('should handle invalid date for input', () => {
    const result = formatInputDate('invalid-date')
    expect(result).toBe('')
  })

  test('should always return YYYY-MM-DD format', () => {
    const result = formatInputDate('2023-12-25')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  test('should format date with time for input', () => {
    const result = formatInputDate('2023-12-25T14:30:00.000Z')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  test('should handle leap year date for input', () => {
    const result = formatInputDate('2024-02-29')
    expect(result).toBe('2024-02-29')
  })

  test('should handle timezone offset for input', () => {
    const result = formatInputDate('2023-12-25T00:00:00+05:00')
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('getDateFormatPattern', () => {
  test('should return current date format pattern', () => {
    const result = getDateFormatPattern()
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  test('should return lowercase pattern', () => {
    const result = getDateFormatPattern()
    expect(result.toLowerCase()).toBe(result)
  })

  test('should return consistent pattern', () => {
    const result1 = getDateFormatPattern()
    const result2 = getDateFormatPattern()
    expect(result1).toBe(result2)
  })

  test('should return valid pattern format', () => {
    const result = getDateFormatPattern()
    expect(result).toMatch(/^(dd\/mm\/yyyy|mm\/dd\/yyyy|yyyy-mm-dd)$/)
  })
})

describe('getTodayFormatted', () => {
  test('should return today\'s date formatted', () => {
    const result = getTodayFormatted()
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  test('should return non-empty string', () => {
    const result = getTodayFormatted()
    expect(result.length).toBeGreaterThan(0)
  })

  test('should return consistent format with formatDate', () => {
    const today = new Date()
    const todayFormatted = getTodayFormatted()
    const manuallyFormatted = formatDate(today)
    expect(todayFormatted).toBe(manuallyFormatted)
  })

  test('should return today\'s date', () => {
    const result = getTodayFormatted()
    const today = new Date()
    const expectedToday = formatDate(today)
    expect(result).toBe(expectedToday)
  })

  test('should match date format pattern', () => {
    const result = getTodayFormatted()
    // Should match some date pattern (flexible for different formats)
    expect(result).toMatch(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/)
  })
}) 