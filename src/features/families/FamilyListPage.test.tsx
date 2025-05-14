import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as familyApi from '@/api/familyApi'
import { FamilyListPage } from './FamilyListPage'

// Mock the familyApi module
jest.mock('@/api/familyApi')
// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, params?: any) => {
    if (params) {
      return `${key} ${JSON.stringify(params)}`
    }
    return key
  }})
}))

describe('FamilyListPage', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  
  const mockFamilies = [
    {
      id: 1,
      code: 'electronics',
      label: 'Electronics',
      description: 'Electronic products',
      created_by: 1,
      created_at: '2023-01-01T12:00:00Z',
      updated_at: '2023-01-01T12:00:00Z',
      attribute_groups: [
        {
          id: 101,
          family: 1,
          attribute_group: 201,
          attribute_group_object: {
            id: 201,
            name: 'Technical Specs'
          },
          required: true,
          order: 0
        }
      ]
    },
    {
      id: 2,
      code: 'clothing',
      label: 'Clothing',
      description: 'Clothing products',
      created_by: 1,
      created_at: '2023-01-02T12:00:00Z',
      updated_at: '2023-01-02T12:00:00Z',
      attribute_groups: [
        {
          id: 102,
          family: 2,
          attribute_group: 202,
          attribute_group_object: {
            id: 202,
            name: 'Size & Material'
          },
          required: true,
          order: 0
        },
        {
          id: 103,
          family: 2,
          attribute_group: 203,
          attribute_group_object: {
            id: 203,
            name: 'Care Instructions'
          },
          required: false,
          order: 1
        }
      ]
    }
  ]
  
  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FamilyListPage />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
  
  beforeEach(() => {
    jest.clearAllMocks()
  })
  
  test('renders loading state initially', () => {
    // Mock the API to return loading state
    jest.spyOn(familyApi, 'useFamilies').mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: jest.fn()
    } as any)
    
    renderComponent()
    
    // Check for skeleton loaders
    const skeletons = screen.getAllByTestId('skeleton-loader')
    expect(skeletons.length).toBeGreaterThan(0)
  })
  
  test('renders families when data is loaded', async () => {
    // Mock the API to return data
    jest.spyOn(familyApi, 'useFamilies').mockReturnValue({
      data: mockFamilies,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn()
    } as any)
    
    renderComponent()
    
    // Check if family data is displayed
    expect(screen.getByText('electronics')).toBeInTheDocument()
    expect(screen.getByText('Electronics')).toBeInTheDocument()
    expect(screen.getByText('clothing')).toBeInTheDocument()
    expect(screen.getByText('Clothing')).toBeInTheDocument()
  })
  
  test('renders empty state when no families exist', () => {
    // Mock the API to return empty data
    jest.spyOn(familyApi, 'useFamilies').mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn()
    } as any)
    
    renderComponent()
    
    // Check for the empty state message
    expect(screen.getByText('settings.families.noFamilies')).toBeInTheDocument()
  })
  
  test('displays error message when API call fails', () => {
    // Mock the API to return an error
    jest.spyOn(familyApi, 'useFamilies').mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Failed to fetch families'),
      refetch: jest.fn()
    } as any)
    
    renderComponent()
    
    // Check for the error message
    expect(screen.getByText('common.error')).toBeInTheDocument()
    expect(screen.getByText('Failed to fetch families')).toBeInTheDocument()
  })
  
  test('filters families based on search term', async () => {
    // Mock the API to return data
    jest.spyOn(familyApi, 'useFamilies').mockReturnValue({
      data: mockFamilies,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn()
    } as any)
    
    renderComponent()
    
    // Type in the search box
    const searchInput = screen.getByPlaceholderText('common.search')
    fireEvent.change(searchInput, { target: { value: 'cloth' } })
    
    // After filtering, only "Clothing" should be visible
    expect(screen.getByText('clothing')).toBeInTheDocument()
    expect(screen.getByText('Clothing')).toBeInTheDocument()
    expect(screen.queryByText('electronics')).not.toBeInTheDocument()
  })
  
  test('shows delete confirmation dialog when delete button is clicked', () => {
    // Mock the APIs
    jest.spyOn(familyApi, 'useFamilies').mockReturnValue({
      data: mockFamilies,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn()
    } as any)
    
    jest.spyOn(familyApi, 'useDeleteFamily').mockReturnValue({
      mutateAsync: jest.fn(),
      isLoading: false
    } as any)
    
    renderComponent()
    
    // Click the delete button for the first family
    const deleteButtons = screen.getAllByRole('button', { name: /common.delete/i })
    fireEvent.click(deleteButtons[0])
    
    // Check if confirmation dialog appears
    expect(screen.getByText('common.delete')).toBeInTheDocument()
  })
}) 