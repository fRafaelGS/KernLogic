/**
 * KernLogic Configuration
 * Centralized configuration for the KernLogic frontend application
 */

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Dashboard Configuration
export const config = {
  api: {
    baseUrl: API_BASE_URL,
    timeout: 30000, // milliseconds
    retryAttempts: 3
  },
  dashboard: {
    cacheTTL: 30 * 1000, // milliseconds
    staleTimes: {
      summary: 5 * 60 * 1000, // 5 min
      activity: 2 * 60 * 1000, // 2 min
      incompleteProducts: 3 * 60 * 1000 // 3 min
    },
    display: {
      recentProductsCount: 5,
      defaultCurrency: 'USD',
      chartColors: {
        primary: '#4f46e5',
        secondary: '#10b981',
        danger: '#ef4444'
      }
    }
  },
  team: {
    staleTimes: {
      members: 5 * 60 * 1000, // 5 min
      roles: 5 * 60 * 1000, // 5 min
      activity: 5 * 60 * 1000 // 5 min
    },
    pagination: {
      defaultPageSize: 10,
      maxPageSize: 50
    },
    display: {
      pageTitle: 'Team Management',
      pageDescription: 'Manage team members and permissions.',
      tableColumns: [
        { name: 'Member', width: '35%' },
        { name: 'Role', width: '10%' },
        { name: 'Last Action', width: '25%' },
        { name: 'Last Activity', width: '20%' },
        { name: 'Actions', width: '10%', align: 'right' }
      ],
      tabs: [
        { value: 'all', label: 'All Members' },
        { value: 'active', label: 'Active' },
        { value: 'pending', label: 'Pending' }
      ],
      emptyState: {
        title: 'No team members found',
        description: 'Try changing your search or filter criteria, or invite someone new.'
      }
    }
  },
  settings: {
    display: {
      pageTitle: 'Settings',
      pageDescription: 'Manage your account, security, and notification preferences.',
      tabs: [
        { value: 'profile', label: 'Profile' },
        { value: 'security', label: 'Security' },
        { value: 'notifications', label: 'Notifications' },
        { value: 'organization', label: 'Organization' },
        { value: 'api', label: 'API Keys' },
        { value: 'attributes', label: 'Attributes' },
        { value: 'families', label: 'Families' }
      ],
      profile: {
        title: 'Profile Information',
        description: 'Update your personal details.',
        nameLabel: 'Full Name',
        emailLabel: 'Email Address',
        updateButton: 'Update Profile',
        savingLabel: 'Saving...',
        successMessage: 'Profile updated successfully!'
      },
      security: {
        title: 'Password Management',
        description: 'Change your account password.',
        currentPasswordLabel: 'Current Password',
        newPasswordLabel: 'New Password',
        confirmPasswordLabel: 'Confirm New Password',
        updateButton: 'Change Password',
        savingLabel: 'Saving...',
        successMessage: 'Password changed successfully!'
      },
      notifications: {
        title: 'Notification Preferences',
        description: 'Manage how you receive notifications.',
        emailNotificationsTitle: 'Email Notifications',
        emailNotificationsDescription: 'Receive notifications via email.',
        updateButton: 'Save Preferences',
        savingLabel: 'Saving...',
        successMessage: 'Notification preferences saved!'
      },
      organization: {
        title: 'Organization Settings',
        description: 'Configure your organization-wide settings and defaults',
        nameLabel: 'Organization Name',
        defaultLocaleLabel: 'Default Locale',
        defaultChannelLabel: 'Default Sales Channel',
        addNewButton: '+ Add New',
        localeDescription: 'The default locale will be used when no locale is specified',
        channelDescription: 'The default channel will be used for prices and other channel-specific data',
        updateButton: 'Save Settings',
        savingLabel: 'Saving...',
        successMessage: 'Organization settings updated successfully'
      },
      api: {
        title: 'API Keys',
        description: 'Manage API keys for integrations. (Placeholder)',
        placeholderText: 'Generate and manage API keys to connect KernLogic with other applications.',
        comingSoonText: 'API Key management coming soon.',
        generateButton: 'Generate New Key'
      },
      attributes: {
        title: 'Product Attributes',
        description: 'Manage product attributes (Admin only)',
        placeholderText: 'View and manage product attributes that can be assigned to your products.',
        manageAttributesButton: 'Manage Attributes',
        manageAttributeGroupsButton: 'Manage Attribute Groups',
        attributeDescription: 'Define custom attributes like colors, sizes, materials, and more for your products.',
        loadAttributesButton: 'Load Attributes',
        loadingLabel: 'Loading...',
        noAttributesText: 'No attributes loaded yet. Click the button above to load them.'
      },
      families: {
        title: 'Product Families',
        description: 'Manage product families and their attributes',
        table: {
          columns: [
            { key: 'code', label: 'Code' },
            { key: 'label', label: 'Label' },
            { key: 'attributeGroups', label: 'Attribute Groups' },
            { key: 'createdAt', label: 'Created At' },
            { key: 'actions', label: 'Actions', align: 'right' }
          ],
          emptyState: {
            noResults: 'No results found',
            noData: 'No families found.'
          },
          searchPlaceholder: 'Search families...',
          paginationPrefix: 'Showing',
          paginationOf: 'of',
          pageText: 'Page',
          previousButton: 'Previous',
          nextButton: 'Next'
        },
        actions: {
          create: 'Create New Family',
          view: 'View',
          edit: 'Edit',
          delete: 'Delete'
        },
        messages: {
          error: 'Error',
          unknownError: 'An unknown error occurred',
          deleteConfirm: 'Are you sure you want to delete the family "{{code}}"?',
          cancel: 'Cancel'
        },
        pagination: {
          pageSize: 25,
          skeletonRows: 5
        }
      },
      attributesPage: {
        title: 'Product Attributes',
        description: 'Manage product attributes for your catalog',
        table: {
          columns: [
            { key: 'code', label: 'Code' },
            { key: 'label', label: 'Label' },
            { key: 'type', label: 'Type' },
            { key: 'localisable', label: 'Localisable' },
            { key: 'scopable', label: 'Scopable' },
            { key: 'actions', label: 'Actions', align: 'right' }
          ],
          emptyState: {
            noResults: 'No attributes found',
            noData: 'No attributes have been created yet.'
          },
          skeletonRows: 5
        },
        form: {
          labels: {
            addAttribute: 'Add Attribute',
            editAttribute: 'Edit Attribute',
            code: 'Code',
            label: 'Label',
            dataType: 'Data Type',
            isLocalisable: 'Localisable',
            isScopable: 'Scopable',
            addNew: 'Add New Attribute',
            codePlaceholder: 'e.g., color, size, weight',
            labelPlaceholder: 'e.g., Color, Size, Weight',
            save: 'Save',
            saving: 'Saving...',
            cancel: 'Cancel',
            delete: 'Delete',
            confirmDelete: 'Confirm Delete',
            currencies: 'Currencies',
            units: 'Units',
            options: 'Options',
            addOption: 'Add Option',
            customUnits: 'Custom units (comma separated)'
          },
          tooltips: {
            localisable: 'Localisable attributes can have different values for each locale',
            scopable: 'Scopable attributes can have different values for each channel',
            coreAttribute: 'Core attributes cannot be modified',
            inUseAttribute: 'This attribute is in use by products'
          },
          deleteWarning: 'Are you sure you want to delete this attribute? This action cannot be undone.',
          errors: {
            required: 'This field is required',
            codeExists: 'An attribute with this code already exists',
            minLength: 'Code must be at least 2 characters',
            alphanumeric: 'Code can only contain letters, numbers, and underscores',
            serverError: 'Server error occurred. Please try again.'
          }
        },
        dataTypes: [
          { value: 'text', label: 'Text' },
          { value: 'textarea', label: 'Text Area' },
          { value: 'number', label: 'Number' },
          { value: 'date', label: 'Date' },
          { value: 'boolean', label: 'Yes/No' },
          { value: 'select', label: 'Single Select' },
          { value: 'multiselect', label: 'Multi Select' },
          { value: 'price', label: 'Price' },
          { value: 'file', label: 'File' },
          { value: 'image', label: 'Image' },
          { value: 'measurement', label: 'Measurement' }
        ],
        messages: {
          success: {
            create: 'Attribute created successfully',
            update: 'Attribute updated successfully',
            delete: 'Attribute deleted successfully'
          },
          error: {
            create: 'Failed to create attribute',
            update: 'Failed to update attribute',
            delete: 'Failed to delete attribute',
            load: 'Failed to load attributes'
          }
        }
      },
      attributeGroupsPage: {
        title: 'Attribute Groups',
        description: 'Organize attributes into logical groups',
        table: {
          columns: [
            { key: 'name', label: 'Name' },
            { key: 'attributeCount', label: 'Attributes' },
            { key: 'actions', label: 'Actions', align: 'right' }
          ],
          emptyState: {
            noResults: 'No attribute groups found',
            noData: 'No attribute groups have been created yet.'
          },
          skeletonRows: 3
        },
        form: {
          labels: {
            addGroup: 'Add Attribute Group',
            editGroup: 'Edit Attribute Group',
            name: 'Group Name',
            attributes: 'Attributes',
            addNew: 'Add New Group',
            namePlaceholder: 'e.g., Technical, Marketing, Design',
            save: 'Save',
            saving: 'Saving...',
            cancel: 'Cancel',
            delete: 'Delete',
            confirmDelete: 'Confirm Delete',
            selectAttribute: 'Select Attribute',
            addAttribute: 'Add Attribute'
          },
          deleteWarning: 'Are you sure you want to delete this attribute group? This action cannot be undone.',
          errors: {
            required: 'Group name is required',
            nameExists: 'An attribute group with this name already exists',
            minLength: 'Name must be at least 2 characters',
            serverError: 'Server error occurred. Please try again.'
          }
        },
        messages: {
          success: {
            create: 'Attribute group created successfully',
            update: 'Attribute group updated successfully',
            delete: 'Attribute group deleted successfully',
            reorder: 'Attributes reordered successfully'
          },
          error: {
            create: 'Failed to create attribute group',
            update: 'Failed to update attribute group',
            delete: 'Failed to delete attribute group',
            load: 'Failed to load attribute groups',
            reorder: 'Failed to reorder attributes'
          }
        }
      },
      addLocaleModal: {
        title: 'Add New Locale',
        description: 'Enter a locale code and display name.',
        codeLabel: 'Locale Code',
        codePlaceholder: 'e.g., en_US, fr_FR',
        nameLabel: 'Display Name',
        namePlaceholder: 'e.g., English (US), French (France)',
        cancelButton: 'Cancel',
        addButton: 'Add Locale',
        savingLabel: 'Adding...'
      },
      addChannelModal: {
        title: 'Add New Channel',
        description: 'Enter the code, name, and description for the new channel.',
        codeLabel: 'Code',
        nameLabel: 'Name',
        descriptionLabel: 'Description',
        cancelButton: 'Cancel',
        addButton: 'Add Channel',
        savingLabel: 'Adding...'
      }
    },
    errors: {
      profileUpdate: 'Failed to update profile',
      passwordChange: 'Failed to change password',
      channelCreate: 'Failed to create channel',
      localeCreate: 'Failed to create locale',
      loadOrganization: 'Error loading organization settings. Please try again later.'
    }
  },
  imports: {
    staleTimes: {
      fieldSchema: 5 * 60 * 1000, // 5 min
      importStatus: 10 * 1000, // 10 seconds - for polling
    },
    display: {
      importModes: [
        {
          value: 'products',
          label: 'Products only',
          description: 'Import product data without modifying your attribute structure',
          isRecommended: true
        },
        {
          value: 'structure',
          label: 'Structure only',
          description: 'Import attribute groups, attributes, and product families',
          tooltip: 'This will import attribute groups, attributes, and/or product families without product data'
        }
      ],
      importModeStep: {
        title: 'Choose Import Mode',
        subtitle: 'Select how you want to import your data',
        continueButton: 'Continue'
      },
      uploadErrors: {
        noFileSelected: 'No file selected',
        pleaseSelectFile: 'Please select a file first.',
        errorStartingImport: 'Error starting import',
        errorStartingImportDesc: 'There was an error starting the import process. Please try again.'
      },
      titles: {
        products: 'Import Products',
        structure: 'Import Structure',
        default: 'Import Wizard'
      },
      descriptions: {
        products: 'Upload a CSV or Excel file to import products in bulk.',
        structure: 'Import attribute groups, attributes, and product families.',
        default: 'Select an import mode to begin.'
      },
      structureTypes: [
        { value: 'attribute_groups', label: 'Attribute Groups', description: 'Import attribute groups that organize related attributes' },
        { value: 'attributes', label: 'Attributes', description: 'Import product attributes like color, size, material, etc.' },
        { value: 'families', label: 'Product Families', description: 'Import product families that define which attributes products should have' }
      ],
      duplicateStrategies: [
        { value: 'overwrite', label: 'Overwrite existing products', description: 'Update existing products with the data from your import file' },
        { value: 'skip', label: 'Skip existing products', description: 'Only import new products and leave existing ones unchanged' }
      ],
      uploadInstructions: {
        title: 'Choose a CSV or Excel file to import',
        subtitle: 'Supported formats: CSV, Excel (.xlsx, .xls)',
        selectButtonLabel: 'Select File',
        structureTypeRequired: 'Please select a structure type above before uploading a file'
      },
      steps: [
        { value: 'upload', label: '1. Upload File' },
        { value: 'mapping', label: '2. Map Columns' },
        { value: 'progress', label: '3. Import Progress' }
      ]
    },
    defaults: {
      duplicateStrategy: 'overwrite',
      previewRows: 5,
      maxFileSize: 5 * 1024 * 1024, // 5MB
      acceptedFileTypes: ['.csv', '.xlsx', '.xls'],
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif']
    }
  },
  reports: {
    staleTimes: {
      themes: 15 * 60 * 1000, // 15 min
      completeness: 5 * 60 * 1000, // 5 min
      localization: 10 * 60 * 1000, // 10 min
      changeHistory: 5 * 60 * 1000 // 5 min
    },
    display: {
      chartColors: ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A4DE6C', '#8884D8'],
      defaultChartHeight: 300,
      attributeChartRowHeight: 40,
      defaultMaxItems: 10
    },
    definitions: [
      {
        slug: 'completeness',
        name: 'Data Completeness',
        description: 'Analyze the completeness of your product data across all fields and categories.'
      },
      {
        slug: 'localization', 
        name: 'Localization Coverage',
        description: 'Monitor the translation coverage and quality across different locales.'
      },
      {
        slug: 'history',
        name: 'Change History',
        description: 'View the history of changes to products and their attributes over time.'
      },
      {
        slug: 'attributes',
        name: 'Attribute Insights',
        description: 'Analyze attribute usage patterns and distribution across your product catalog.'
      }
    ]
  },
  debug: {
    enableLogs: import.meta.env.DEV === true,
    logNetworkRequests: import.meta.env.DEV === true
  }
}

// API endpoints configuration
export const API_ENDPOINTS = {
  auth: {
    login: '/api/token/',
    refresh: '/api/token/refresh/',
    user: '/api/users/me/',
    register: '/api/register/',
    logout: '/api/auth/logout/'
  },
  orgs: {
    memberships: (orgId: string) => `/api/orgs/${orgId}/memberships/`,
    roles: (orgId: string) => `/api/orgs/${orgId}/roles/`,
    invitations: (orgId: string) => `/api/orgs/${orgId}/invitations/`
  },
  products: {
    list: '/api/products/',
    create: '/api/products/',
    update: (id: number) => `/api/products/${id}/`,
    delete: (id: number) => `/api/products/${id}/`,
    categories: '/api/categories/',
    stats: '/api/products/stats/'
  },
  categories: {
    list: '/api/categories/',
    create: '/api/categories/',
    update: (id: number) => `/api/categories/${id}/`,
    delete: (id: number) => `/api/categories/${id}/`,
    tree: '/api/categories/?as_tree=true',
    move: '/api/categories/move/',
    products: (id: number) => `/api/categories/${id}/products/`
  },
  families: {
    list: '/api/families/',
    create: '/api/families/',
    update: (id: number) => `/api/families/${id}/`,
    delete: (id: number) => `/api/families/${id}/`,
    attributeGroups: (id: number) => `/api/families/${id}/attribute-groups/`
  },
  analytics: {
    locales: '/api/analytics/locales/',
    channels: '/api/analytics/channels/',
    completeness: '/api/analytics/completeness/',
    readiness: '/api/analytics/readiness/',
    enrichmentVelocity: '/api/analytics/enrichment-velocity/',
    localizationQuality: '/api/analytics/localization-quality/',
    changeHistory: '/api/analytics/change-history/',
    families: '/api/analytics/families/'
  },
  dashboard: '/api/dashboard',
  team: {
    activity: '/api/dashboard/activity/',
    history: '/api/team/history/'
  },
  imports: {
    create: '/api/imports/',
    attributeGroups: '/api/attribute-groups-import/',
    attributes: '/api/attributes-import/',
    families: '/api/families-import/',
    details: (id: number) => `/api/imports/${id}/`,
    fieldSchema: '/api/imports/field-schema/',
    fieldSchemaV2: '/api/imports/field-schema/?v=2',
    attributeGroupsSchema: '/api/imports/attribute-groups-schema/',
    attributesSchema: '/api/imports/attributes-schema/',
    familiesSchema: '/api/imports/families-schema/',
    familyAttributes: (familyCode: string) => `/api/families/${familyCode}/attributes/`
  },
  reports: {
    themes: '/api/reports/themes/'
  }
}

// Export a unified config object that includes API endpoints
export default {
  ...config,
  apiEndpoints: API_ENDPOINTS
}
