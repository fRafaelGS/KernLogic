import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as familyApi from '@/api/familyApi'
import * as attributeGroupApi from '@/api/attributeGroupApi'
import { FamilyFormPage } from './FamilyFormPage'

// Mock the API modules
jest.mock('@/api/familyApi')
jest.mock('@/api/attributeGroupApi')
// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, params?: any) => {
    if (params) {
      return `${key} ${JSON.stringify(params)}`
    }
    return key
  }})
}))

// Mock the toast component
jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn()
}))

describe('FamilyFormPage', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  
  const mockFamily = {
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
  }
  
  const mockAttributeGroups = [
    {
      id: 201,
      name: 'Technical Specs',
      description: 'Technical specifications',
      organization: 1,
      created_by: 1,
      created_at: '2023-01-01T12:00:00Z',
      updated_at: '2023-01-01T12:00:00Z'
    },
    {
      id: 202,
      name: 'Size & Material',
      description: 'Size and material information',
      organization: 1,
      created_by: 1,
      created_at: '2023-01-01T12:00:00Z',
      updated_at: '2023-01-01T12:00:00Z'
    },
    {
      id: 203,
      name: 'Care Instructions',
      description: 'Care and washing instructions',
      organization: 1,
      created_by: 1,
      created_at: '2023-01-01T12:00:00Z',
      updated_at: '2023-01-01T12:00:00Z'
    }
  ]
  
  const renderCreateComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <FamilyFormPage mode="create" />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
  
  const renderEditComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/settings/families/1/edit']}>
          <Routes>
            <Route path="/settings/families/:id/edit" element={<FamilyFormPage mode="edit" />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
  
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock the basic API responses
    jest.spyOn(attributeGroupApi, 'useAttributeGroups').mockReturnValue({
      data: mockAttributeGroups,
      isLoading: false,
      isError: false,
      error: null
    } as any)
    
    jest.spyOn(familyApi, 'useCreateFamily').mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue(mockFamily),
      isLoading: false
    } as any)
    
    jest.spyOn(familyApi, 'useAddAttributeGroupToFamily').mockReturnValue({
      mutateAsync: jest.fn().mockResolvedValue({})
    } as any)
  })
  
  test('renders create form', () => {
    renderCreateComponent()
    
    // Check if form elements are present
    expect(screen.getByLabelText(/settings.families.form.code/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/settings.families.form.label/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/settings.families.form.description/i)).toBeInTheDocument()
    expect(screen.getByText(/settings.families.form.attributeGroups/i)).toBeInTheDocument()
    expect(screen.getByText(/settings.families.addGroup/i)).toBeInTheDocument()
  })
  
  test('renders edit form with pre-filled data', async () => {
    // Mock the family API for the edit form
    jest.spyOn(familyApi, 'useFamily').mockReturnValue({
      data: mockFamily,
      isLoading: false,
      isError: false,
      error: null
    } as any)
    
    renderEditComponent()
    
    // Check if form is pre-filled
    await waitFor(() => {
      expect(screen.getByDisplayValue('electronics')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Electronics')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Electronic products')).toBeInTheDocument()
      expect(screen.getByText('Technical Specs')).toBeInTheDocument()
    })
  })
  
  test('validates required fields', async () => {
    renderCreateComponent()
    
    // Submit the form without filling required fields
    const submitButton = screen.getByText('common.save')
    fireEvent.click(submitButton)
    
    // Check for validation errors
    await waitFor(() => {
      expect(screen.getByText('Code is required')).toBeInTheDocument()
      expect(screen.getByText('Label is required')).toBeInTheDocument()
    })
  })
  
  test('allows adding and removing attribute groups', async () => {
    renderCreateComponent()
    
    // Fill required fields
    fireEvent.change(screen.getByLabelText(/settings.families.form.code/i), { 
      target: { value: 'new-family' } 
    })
    fireEvent.change(screen.getByLabelText(/settings.families.form.label/i), { 
      target: { value: 'New Family' } 
    })
    
    // Click the 'Add Group' button
    const addButton = screen.getByText(/settings.families.addGroup/i)
    fireEvent.click(addButton)
    
    // Select a group from the popover
    await waitFor(() => {
      expect(screen.getByText('Technical Specs')).toBeInTheDocument()
      fireEvent.click(screen.getByText('Technical Specs'))
    })
    
    // Verify the group is added
    expect(screen.getByText('Technical Specs')).toBeInTheDocument()
    
    // Remove the group
    const removeButton = screen.getByRole('button', { name: /common.remove/i })
    fireEvent.click(removeButton)
    
    // Verify the group is removed
    await waitFor(() => {
      expect(screen.queryByText('Technical Specs')).not.toBeInTheDocument()
    })
  })
  
  test('submits form data correctly', async () => {
    const createFamilyMock = jest.fn().mockResolvedValue({
      id: 99,
      code: 'new-family',
      label: 'New Family'
    })
    
    const addAttributeGroupMock = jest.fn().mockResolvedValue({})
    
    jest.spyOn(familyApi, 'useCreateFamily').mockReturnValue({
      mutateAsync: createFamilyMock,
      isLoading: false
    } as any)
    
    jest.spyOn(familyApi, 'useAddAttributeGroupToFamily').mockImplementation((id) => ({
      mutateAsync: addAttributeGroupMock
    }) as any)
    
    renderCreateComponent()
    
    // Fill form fields
    fireEvent.change(screen.getByLabelText(/settings.families.form.code/i), { 
      target: { value: 'new-family' } 
    })
    fireEvent.change(screen.getByLabelText(/settings.families.form.label/i), { 
      target: { value: 'New Family' } 
    })
    fireEvent.change(screen.getByLabelText(/settings.families.form.description/i), { 
      target: { value: 'This is a new product family' } 
    })
    
    // Add an attribute group
    const addButton = screen.getByText(/settings.families.addGroup/i)
    fireEvent.click(addButton)
    await waitFor(() => {
      expect(screen.getByText('Technical Specs')).toBeInTheDocument()
      fireEvent.click(screen.getByText('Technical Specs'))
    })
    
    // Submit the form
    const submitButton = screen.getByText('common.save')
    fireEvent.click(submitButton)
    
    // Check if API was called with correct data
    await waitFor(() => {
      expect(createFamilyMock).toHaveBeenCalledWith({
        code: 'new-family',
        label: 'New Family',
        description: 'This is a new product family'
      })
      
      expect(addAttributeGroupMock).toHaveBeenCalled()
    })
  })
}) 