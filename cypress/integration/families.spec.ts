describe('Family Management', () => {
  beforeEach(() => {
    // Mock user login and authentication
    cy.intercept('POST', '/api/token/', {
      statusCode: 200,
      body: {
        access: 'mock-access-token',
        refresh: 'mock-refresh-token'
      }
    }).as('login')
    
    // Mock getting attribute groups
    cy.intercept('GET', '/api/attribute-groups/', {
      statusCode: 200,
      body: [
        {
          id: 1,
          name: 'Technical Specs',
          description: 'Technical specifications',
          organization: 1,
          created_by: 1,
          created_at: '2023-01-01T12:00:00Z',
          updated_at: '2023-01-01T12:00:00Z'
        },
        {
          id: 2,
          name: 'Size & Material',
          description: 'Size and material information',
          organization: 1,
          created_by: 1,
          created_at: '2023-01-01T12:00:00Z',
          updated_at: '2023-01-01T12:00:00Z'
        }
      ]
    }).as('getAttributeGroups')
    
    // Login and visit the families page
    cy.visit('/login')
    cy.get('input[name="email"]').type('admin@example.com')
    cy.get('input[name="password"]').type('password')
    cy.get('button[type="submit"]').click()
    cy.wait('@login')
    
    // Intercept initial families list
    cy.intercept('GET', '/api/families/', {
      statusCode: 200,
      body: []
    }).as('getFamilies')
    
    cy.visit('/app/settings/families')
    cy.wait('@getFamilies')
  })
  
  it('should create, edit, view, and delete a family', () => {
    // Create a new family
    cy.intercept('POST', '/api/families/', {
      statusCode: 201,
      body: {
        id: 1,
        code: 'test-family',
        label: 'Test Family',
        description: 'This is a test family',
        created_by: 1,
        created_at: '2023-01-01T12:00:00Z',
        updated_at: '2023-01-01T12:00:00Z',
        attribute_groups: []
      }
    }).as('createFamily')
    
    cy.intercept('POST', '/api/families/1/attribute-groups/', {
      statusCode: 201,
      body: {
        id: 101,
        family: 1,
        attribute_group: 1,
        attribute_group_object: {
          id: 1,
          name: 'Technical Specs'
        },
        required: true,
        order: 0
      }
    }).as('addAttributeGroup1')
    
    cy.intercept('POST', '/api/families/1/attribute-groups/', {
      statusCode: 201,
      body: {
        id: 102,
        family: 1,
        attribute_group: 2,
        attribute_group_object: {
          id: 2,
          name: 'Size & Material'
        },
        required: false,
        order: 1
      }
    }).as('addAttributeGroup2')
    
    // Click on create family button
    cy.contains('button', 'New Family').click()
    cy.url().should('include', '/app/settings/families/new')
    cy.wait('@getAttributeGroups')
    
    // Fill form
    cy.get('input#code').type('test-family')
    cy.get('input#label').type('Test Family')
    cy.get('textarea#description').type('This is a test family')
    
    // Add attribute groups
    cy.contains('button', 'Add Group').click()
    cy.contains('button', 'Technical Specs').click()
    
    // Make it required
    cy.get('input[id^="attributeGroups.0.required"]').click({force: true})
    
    // Add another group
    cy.contains('button', 'Add Group').click()
    cy.contains('button', 'Size & Material').click()
    
    // Submit form
    cy.contains('button', 'Save').click()
    cy.wait('@createFamily')
    cy.wait('@addAttributeGroup1')
    cy.wait('@addAttributeGroup2')
    
    // We should be back on the list page
    cy.url().should('include', '/app/settings/families')
    
    // Mock the updated family list
    cy.intercept('GET', '/api/families/', {
      statusCode: 200,
      body: [
        {
          id: 1,
          code: 'test-family',
          label: 'Test Family',
          description: 'This is a test family',
          created_by: 1,
          created_at: '2023-01-01T12:00:00Z',
          updated_at: '2023-01-01T12:00:00Z',
          attribute_groups: [
            {
              id: 101,
              family: 1,
              attribute_group: 1,
              attribute_group_object: {
                id: 1,
                name: 'Technical Specs'
              },
              required: true,
              order: 0
            },
            {
              id: 102,
              family: 1,
              attribute_group: 2,
              attribute_group_object: {
                id: 2,
                name: 'Size & Material'
              },
              required: false,
              order: 1
            }
          ]
        }
      ]
    }).as('getUpdatedFamilies')
    
    // Refresh to load the new list
    cy.visit('/app/settings/families')
    cy.wait('@getUpdatedFamilies')
    
    // Check if our created family is in the list
    cy.contains('test-family').should('be.visible')
    cy.contains('Test Family').should('be.visible')
    
    // View the family details
    cy.intercept('GET', '/api/families/1/', {
      statusCode: 200,
      body: {
        id: 1,
        code: 'test-family',
        label: 'Test Family',
        description: 'This is a test family',
        created_by: 1,
        created_at: '2023-01-01T12:00:00Z',
        updated_at: '2023-01-01T12:00:00Z',
        attribute_groups: [
          {
            id: 101,
            family: 1,
            attribute_group: 1,
            attribute_group_object: {
              id: 1,
              name: 'Technical Specs'
            },
            required: true,
            order: 0
          },
          {
            id: 102,
            family: 1,
            attribute_group: 2,
            attribute_group_object: {
              id: 2,
              name: 'Size & Material'
            },
            required: false,
            order: 1
          }
        ]
      }
    }).as('getFamily')
    
    cy.get(`[aria-label="View"]`).first().click()
    cy.wait('@getFamily')
    cy.url().should('include', '/app/settings/families/1')
    
    // Check family details
    cy.contains('Test Family').should('be.visible')
    cy.contains('test-family').should('be.visible')
    cy.contains('This is a test family').should('be.visible')
    cy.contains('Technical Specs').should('be.visible')
    cy.contains('Size & Material').should('be.visible')
    
    // Edit the family
    cy.intercept('PATCH', '/api/families/1/', {
      statusCode: 200,
      body: {
        id: 1,
        code: 'test-family',
        label: 'Updated Family',
        description: 'This is an updated test family',
        created_by: 1,
        created_at: '2023-01-01T12:00:00Z',
        updated_at: '2023-01-02T12:00:00Z',
        attribute_groups: [
          {
            id: 101,
            family: 1,
            attribute_group: 1,
            attribute_group_object: {
              id: 1,
              name: 'Technical Specs'
            },
            required: true,
            order: 0
          },
          {
            id: 102,
            family: 1,
            attribute_group: 2,
            attribute_group_object: {
              id: 2,
              name: 'Size & Material'
            },
            required: true, // Changed to required
            order: 1
          }
        ]
      }
    }).as('updateFamily')
    
    cy.contains('button', 'Edit').click()
    cy.url().should('include', '/app/settings/families/1/edit')
    
    // Update the form
    cy.get('input#label').clear().type('Updated Family')
    cy.get('textarea#description').clear().type('This is an updated test family')
    
    // Make the second group required
    cy.get('input[id^="attributeGroups.1.required"]').click({force: true})
    
    // Submit form
    cy.contains('button', 'Save').click()
    cy.wait('@updateFamily')
    
    // Delete the family
    cy.intercept('DELETE', '/api/families/1/', {
      statusCode: 204,
      body: null
    }).as('deleteFamily')
    
    // Mock the empty family list after deletion
    cy.intercept('GET', '/api/families/', {
      statusCode: 200,
      body: []
    }).as('getEmptyFamilies')
    
    cy.visit('/app/settings/families')
    cy.wait('@getUpdatedFamilies')
    
    // Click delete
    cy.get(`[aria-label="Delete"]`).first().click()
    
    // Confirm deletion
    cy.contains('button', 'Delete').click()
    cy.wait('@deleteFamily')
    
    // Verify family is gone
    cy.reload()
    cy.wait('@getEmptyFamilies')
    cy.contains('test-family').should('not.exist')
  })
  
  it('should handle validation errors', () => {
    // Create a new family
    cy.intercept('POST', '/api/families/', {
      statusCode: 400,
      body: {
        code: ['A family with this code already exists.']
      }
    }).as('createFamilyError')
    
    // Navigate to create page
    cy.contains('button', 'New Family').click()
    cy.url().should('include', '/app/settings/families/new')
    cy.wait('@getAttributeGroups')
    
    // Fill form with duplicate code
    cy.get('input#code').type('existing-family')
    cy.get('input#label').type('Test Family')
    
    // Add attribute group
    cy.contains('button', 'Add Group').click()
    cy.contains('button', 'Technical Specs').click()
    
    // Submit form
    cy.contains('button', 'Save').click()
    cy.wait('@createFamilyError')
    
    // Check for error message
    cy.contains('A family with this code already exists').should('be.visible')
  })
}) 