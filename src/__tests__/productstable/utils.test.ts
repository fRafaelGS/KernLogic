import { 
  cn, 
  formatCurrency, 
  nameToInitials, 
  getCategoryName, 
  matchesCategoryFilter 
} from '@/lib/utils'

describe('cn', () => {
  test('should merge class names correctly', () => {
    const result = cn('class1', 'class2')
    expect(result).toBe('class1 class2')
  })

  test('should handle conditional classes', () => {
    const result = cn('base', true && 'conditional', false && 'hidden')
    expect(result).toBe('base conditional')
  })

  test('should handle empty inputs', () => {
    const result = cn()
    expect(result).toBe('')
  })

  test('should handle null and undefined inputs', () => {
    const result = cn('class1', null, undefined, 'class2')
    expect(result).toBe('class1 class2')
  })

  test('should handle array inputs', () => {
    const result = cn(['class1', 'class2'], 'class3')
    expect(result).toBe('class1 class2 class3')
  })

  test('should handle object inputs', () => {
    const result = cn({ 'class1': true, 'class2': false, 'class3': true })
    expect(result).toBe('class1 class3')
  })

  test('should handle complex mixed inputs', () => {
    const result = cn('base', { active: true, disabled: false }, ['extra', 'classes'])
    expect(result).toBe('base active extra classes')
  })

  test('should handle duplicate classes by keeping unique ones', () => {
    const result = cn('class1 class2', 'class2 class3')
    expect(result).toBe('class1 class2 class3')
  })
})

describe('formatCurrency', () => {
  test('should format USD currency correctly', () => {
    const result = formatCurrency(1234.56, 'USD')
    expect(result).toBe('$1,234.56')
  })

  test('should format EUR currency correctly', () => {
    const result = formatCurrency(1234.56, 'EUR')
    expect(result).toBe('€1,234.56')
  })

  test('should use USD as default currency', () => {
    const result = formatCurrency(1234.56)
    expect(result).toBe('$1,234.56')
  })

  test('should handle string amounts', () => {
    const result = formatCurrency('1234.56', 'USD')
    expect(result).toBe('$1,234.56')
  })

  test('should handle zero amount', () => {
    const result = formatCurrency(0, 'USD')
    expect(result).toBe('$0.00')
  })

  test('should handle negative amounts', () => {
    const result = formatCurrency(-1234.56, 'USD')
    expect(result).toBe('-$1,234.56')
  })

  test('should handle decimal amounts', () => {
    const result = formatCurrency(0.99, 'USD')
    expect(result).toBe('$0.99')
  })

  test('should handle large amounts', () => {
    const result = formatCurrency(1234567.89, 'USD')
    expect(result).toBe('$1,234,567.89')
  })

  test('should handle invalid string amounts', () => {
    const result = formatCurrency('invalid', 'USD')
    expect(result).toBe('USD NaN')
  })

  test('should handle invalid currency codes gracefully', () => {
    const result = formatCurrency(1234.56, 'INVALID')
    expect(result).toBe('INVALID 1234.56')
  })

  test('should handle very small amounts', () => {
    const result = formatCurrency(0.01, 'USD')
    expect(result).toBe('$0.01')
  })

  test('should handle whole numbers', () => {
    const result = formatCurrency(100, 'USD')
    expect(result).toBe('$100.00')
  })
})

describe('nameToInitials', () => {
  test('should extract initials from single name', () => {
    const result = nameToInitials('John')
    expect(result).toBe('J')
  })

  test('should extract initials from first and last name', () => {
    const result = nameToInitials('John Doe')
    expect(result).toBe('JD')
  })

  test('should extract initials from multiple names', () => {
    const result = nameToInitials('John Michael Doe')
    expect(result).toBe('JD')
  })

  test('should handle empty string', () => {
    const result = nameToInitials('')
    expect(result).toBe('U')
  })

  test('should handle whitespace only', () => {
    const result = nameToInitials('   ')
    expect(result).toBe('U')
  })

  test('should handle names with extra spaces', () => {
    const result = nameToInitials('  John   Doe  ')
    expect(result).toBe('JD')
  })

  test('should handle names with special characters', () => {
    const result = nameToInitials('Jean-Luc Picard')
    expect(result).toBe('JP')
  })

  test('should handle lowercase names', () => {
    const result = nameToInitials('john doe')
    expect(result).toBe('JD')
  })

  test('should handle single character names', () => {
    const result = nameToInitials('A B')
    expect(result).toBe('AB')
  })

  test('should handle names with middle initials', () => {
    const result = nameToInitials('John F. Kennedy')
    expect(result).toBe('JK')
  })

  test('should handle very long names', () => {
    const result = nameToInitials('Mary Elizabeth Catherine Johnson-Smith')
    expect(result).toBe('MJ')
  })
})

describe('getCategoryName', () => {
  test('should extract name from simple object', () => {
    const category = { id: 1, name: 'Electronics' }
    const result = getCategoryName(category)
    expect(result).toBe('Electronics')
  })

  test('should extract name from array of categories', () => {
    const categories = [
      { id: 1, name: 'Root' },
      { id: 2, name: 'Electronics' },
      { id: 3, name: 'Phones' }
    ]
    const result = getCategoryName(categories)
    expect(result).toBe('Phones')
  })

  test('should handle category with children', () => {
    const category = {
      id: 1,
      name: 'Electronics',
      children: [
        { id: 2, name: 'Phones' },
        { id: 3, name: 'Laptops' }
      ]
    }
    const result = getCategoryName(category)
    expect(result).toBe('Laptops')
  })

  test('should handle nested children hierarchy', () => {
    const category = {
      id: 1,
      name: 'Root',
      children: [{
        id: 2,
        name: 'Electronics',
        children: [{
          id: 3,
          name: 'Phones'
        }]
      }]
    }
    const result = getCategoryName(category)
    expect(result).toBe('Phones')
  })

  test('should handle empty array', () => {
    const result = getCategoryName([])
    expect(result).toBe('')
  })

  test('should handle null input', () => {
    const result = getCategoryName(null)
    expect(result).toBe('')
  })

  test('should handle undefined input', () => {
    const result = getCategoryName(undefined)
    expect(result).toBe('')
  })

  test('should handle string input', () => {
    const result = getCategoryName('Electronics')
    expect(result).toBe('Electronics')
  })

  test('should handle object without name property', () => {
    const category = { id: 1, title: 'Electronics' }
    const result = getCategoryName(category)
    expect(result).toBe('')
  })

  test('should handle array with objects without names', () => {
    const categories = [{ id: 1 }, { id: 2 }]
    const result = getCategoryName(categories)
    expect(result).toBe('[object Object]')
  })

  test('should handle deeply nested hierarchy', () => {
    const category = {
      id: 1,
      name: 'Level1',
      children: [{
        id: 2,
        name: 'Level2',
        children: [{
          id: 3,
          name: 'Level3',
          children: [{
            id: 4,
            name: 'Level4'
          }]
        }]
      }]
    }
    const result = getCategoryName(category)
    expect(result).toBe('Level4')
  })

  test('should handle array with mixed valid and invalid objects', () => {
    const categories = [
      { id: 1, name: 'Valid' },
      { id: 2 },
      { id: 3, name: 'LastValid' }
    ]
    const result = getCategoryName(categories)
    expect(result).toBe('LastValid')
  })
})

describe('matchesCategoryFilter', () => {
  // Mock console.log to avoid noise in tests
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('should match uncategorized products when filter is empty string', () => {
    const result = matchesCategoryFilter(null, '')
    expect(result).toBe(true)
  })

  test('should match uncategorized products with empty array', () => {
    const result = matchesCategoryFilter([], '')
    expect(result).toBe(true)
  })

  test('should match uncategorized products with empty object', () => {
    const result = matchesCategoryFilter({}, '')
    expect(result).toBe(true)
  })

  test('should not match categorized products when filter is empty string', () => {
    const category = { name: 'Electronics' }
    const result = matchesCategoryFilter(category, '')
    expect(result).toBe(false)
  })

  test('should match exact category name', () => {
    const category = { name: 'Electronics' }
    const result = matchesCategoryFilter(category, 'Electronics')
    expect(result).toBe(true)
  })

  test('should match category in array hierarchy', () => {
    const categories = [
      { name: 'Root' },
      { name: 'Electronics' },
      { name: 'Phones' }
    ]
    const result = matchesCategoryFilter(categories, 'Electronics')
    expect(result).toBe(true)
  })

  test('should not match non-existent category', () => {
    const category = { name: 'Electronics' }
    const result = matchesCategoryFilter(category, 'Clothing')
    expect(result).toBe(false)
  })

  test('should handle category_name property', () => {
    const product = { category_name: 'Electronics' }
    const result = matchesCategoryFilter(product, 'Electronics')
    expect(result).toBe(true)
  })

  test('should handle empty category_name as uncategorized', () => {
    const product = { category_name: '' }
    const result = matchesCategoryFilter(product, '')
    expect(result).toBe(true)
  })

  test('should handle string category input', () => {
    const result = matchesCategoryFilter('Electronics', 'Electronics')
    expect(result).toBe(true)
  })

  test('should handle undefined filter value', () => {
    const category = { name: 'Electronics' }
    const result = matchesCategoryFilter(category, undefined as any)
    expect(result).toBe(false)
  })

  test('should be case sensitive', () => {
    const category = { name: 'Electronics' }
    const result = matchesCategoryFilter(category, 'electronics')
    expect(result).toBe(false)
  })

  test('should handle undefined input as uncategorized', () => {
    const result = matchesCategoryFilter(undefined, '')
    expect(result).toBe(true)
  })

  test('should handle empty string input as uncategorized', () => {
    const result = matchesCategoryFilter('', '')
    expect(result).toBe(true)
  })

  test('should match category in leaf node of hierarchy', () => {
    const categories = [
      { name: 'Root' },
      { name: 'Electronics' },
      { name: 'Phones' }
    ]
    const result = matchesCategoryFilter(categories, 'Phones')
    expect(result).toBe(true)
  })

  test('should handle product with null category_name as uncategorized', () => {
    const product = { category_name: null }
    const result = matchesCategoryFilter(product, '')
    expect(result).toBe(true)
  })
}) 