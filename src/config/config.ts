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
      attributeComponents: {
        localeChannelSelector: {
          localeLabel: 'Language',
          localeChangeTooltip: 'Change display language',
          allLocalesOption: 'All locales',
          defaultLocaleOption: 'Default locale',
          channelLabel: 'Channel',
          channelChangeTooltip: 'Change sales channel',
          allChannelsOption: 'All channels',
          defaultChannelOption: 'Default channel'
        },
        attributeValueRow: {
          tooltips: {
            edit: 'Edit this attribute value',
            delete: 'Remove this attribute from the product',
            deleteWarning: 'Remove this attribute from the group. This will not delete the attribute itself.',
            localisable: 'This attribute can have different values per language',
            nonLocalisable: 'This attribute has the same value in all languages',
            scopable: 'This attribute can have different values per sales channel',
            nonScopable: 'This attribute has the same value in all sales channels'
          },
          placeholders: {
            text: 'Enter text (press Enter to save)',
            number: 'Enter number (press Enter to save)',
            selectDate: 'Select date',
            url: 'Enter URL (press Enter to save)',
            email: 'Enter email (press Enter to save)',
            phone: 'Enter phone (press Enter to save)'
          },
          labels: {
            boolean: {
              yes: 'Yes',
              no: 'No'
            },
            dataTypes: {
              text: 'Text',
              number: 'Number',
              date: 'Date',
              boolean: 'Boolean',
              select: 'Select',
              multiselect: 'Multiselect',
              price: 'Price',
              measurement: 'Measurement',
              media: 'Media',
              rich_text: 'Rich Text',
              url: 'URL',
              email: 'Email',
              phone: 'Phone'
            }
          },
          buttons: {
            save: 'Save',
            cancel: 'Cancel',
            edit: 'Edit',
            delete: 'Delete',
            browse: 'Browse'
          }
        },
        addAttributeModal: {
          title: 'Add Attribute',
          description: 'Select an attribute to add to this product',
          searchPlaceholder: 'Search attributes',
          noResults: 'No attributes found matching your criteria',
          filterLabel: 'Filter by',
          filterOptions: {
            all: 'All attributes',
            unused: 'Unused attributes only'
          },
          attributeDetailsSectionTitle: 'Attribute Details',
          attributeDetailsSectionDesc: 'Configure the new attribute',
          localeChannelSectionTitle: 'Language & Channel',
          localeChannelSectionDesc: 'Set specific locale and channel for this attribute value (optional)',
          buttons: {
            add: 'Add Attribute',
            cancel: 'Cancel',
            addAnother: 'Add & Add Another'
          },
          success: 'Attribute added successfully',
          error: 'Failed to add attribute',
          attributes: 'attributes',
          attribute: 'attribute'
        },
        productAttributesPanel: {
          title: 'Attributes',
          emptyState: {
            title: 'No attributes found',
            description: 'No attributes have been added to this product yet',
            addButton: 'Add Attribute'
          },
          noGroupsState: {
            title: 'No attribute groups found',
            description: 'Your product is associated with a family, but this family doesn\'t have any attribute groups configured yet.',
            configureButton: 'Configure Family Attribute Groups',
            tip: 'You need to add attribute groups to the family to manage product attributes effectively.'
          },
          attributeGroups: {
            addTooltip: 'Add all attributes from this group to product',
            addSuccess: 'Added group to product',
            addError: 'Failed to add group',
            removeSuccess: 'Removed group from product',
            removeError: 'Failed to remove group',
            allGroupsAdded: 'All attribute groups are already added to this product.',
            noAttributesInGroup: 'No attributes found in this group to delete'
          },
          buttons: {
            addAttribute: 'Add Attribute',
            addAttributeGroup: 'Add Attribute Group',
            expandAll: 'Expand All',
            collapseAll: 'Collapse All',
            deleteGroup: 'Delete Group'
          },
          loadError: 'Unable to load attributes',
          saveError: 'Failed to save attribute',
          validation: {
            email: 'Invalid email address',
            phone: 'Invalid phone number',
            date: 'Invalid date format (YYYY-MM-DD)',
            url: 'Invalid URL format'
          },
          addAttributeModal: {
            title: 'Add Attribute',
            description: 'Select an attribute to add to this product. You can set its value after adding.',
            success: 'Attribute added. Use the edit button to set its value.',
            error: 'Failed to add attribute',
            buttons: {
              add: 'Add',
              cancel: 'Cancel'
            }
          },
          deleteGroupModal: {
            title: 'Delete Attribute Group',
            warning: 'Warning: This will remove all attributes in the selected group from this product. The group itself will remain available for other products.',
            selectLabel: 'Select Group to Delete',
            selectPlaceholder: 'Choose a group...',
            aboutToDelete: 'You are about to delete:',
            allAttributesIn: 'All',
            attributesIn: 'attributes in group',
            actionDescription: 'This action only removes these attributes from the current product. The attributes and group definition will still be available for other products.',
            buttons: {
              confirm: 'Confirm Delete',
              deleting: 'Deleting...',
              cancel: 'Cancel'
            }
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
  productsTable: {
    display: {
      pageTitle: 'Products',
      searchPlaceholder: 'Search products...',
      filterSectionTitle: 'Filters',
      filterPlaceholder: 'Filter…',
      columns: {
        name: 'Name',
        sku: 'SKU',
        brand: 'Brand',
        barcode: 'Barcode',
        category: 'Category',
        price: 'Price',
        is_active: 'Status',
        created_at: 'Created',
        updated_at: 'Updated',
        tags: 'Tags',
        actions: 'Actions',
        family: 'Family'
      },
      selectors: {
        category: {
          placeholder: 'Filter category',
          allCategories: 'All Categories',
          uncategorized: 'Uncategorized', 
          noCategories: 'No categories available'
        },
        status: {
          placeholder: 'Status',
          all: 'All',
          active: 'Active',
          inactive: 'Inactive'
        },
        tags: {
          buttonLabel: 'Filter Tags',
          selectedCount: '{{count}} Selected',
          noTags: 'No tags available'
        },
        price: {
          buttonLabel: 'Price Range',
          minLabel: 'Min',
          maxLabel: 'Max',
          resetButton: 'Reset'
        },
        date: {
          buttonLabel: 'Date Range',
          fromLabel: 'From',
          toLabel: 'To',
          resetButton: 'Reset'
        }
      },
      buttons: {
        refresh: 'Refresh',
        addProduct: 'Add Product',
        manageCategories: 'Manage Categories',
        expandAll: 'Expand All',
        collapseAll: 'Collapse All',
        bulkActions: 'Bulk Actions',
        bulkDelete: 'Delete Selected',
        bulkActivate: 'Activate Selected',
        bulkDeactivate: 'Deactivate Selected',
        bulkExport: 'Export Selected',
        bulkCategory: 'Assign Category',
        bulkTags: 'Manage Tags',
        viewOptions: 'View Options',
        list: 'List View',
        grid: 'Grid View',
        resetFilters: 'Reset Filters',
        loadMore: 'Load more products',
        loadingMore: 'Loading more...'
      },
      actionLabels: {
        edit: 'Edit',
        delete: 'Delete',
        view: 'View',
        duplicate: 'Duplicate'
      },
      tableView: {
        columnVisibility: {
          title: 'Column Visibility',
          toggle: 'Toggle columns'
        },
        paginationInfo: 'Showing {{start}}-{{end}} of {{total}}',
        previousPage: 'Previous',
        nextPage: 'Next',
        rowsPerPage: 'Rows per page:',
        expandRow: 'Expand row',
        collapseRow: 'Collapse row',
        tableSummary: 'Product catalog table',
        sortAscending: 'Sort ascending',
        sortDescending: 'Sort descending',
        showOptions: 'Show column options',
        menuLabel: 'Table column menu'
      },
      emptyState: {
        title: 'No products found',
        description: 'Try changing your search or filter criteria, or add a new product.',
        addProductButton: 'Add Product'
      },
      loadingState: {
        loadingText: 'Loading products...'
      },
      pagination: {
        previous: 'Previous',
        next: 'Next',
        pageLabel: 'Page',
        of: 'of',
        rowsPerPage: 'Rows per page:',
        gotoPage: 'Go to page'
      },
      refreshStatus: {
        refreshing: 'Refreshing products',
        refreshComplete: 'Products refreshed',
        refreshFailed: 'Failed to refresh products'
      }
    },
    messages: {
      success: {
        delete: 'Product deleted successfully',
        bulkDelete: '{{count}} products deleted successfully',
        bulkActivate: '{{count}} products activated successfully',
        bulkDeactivate: '{{count}} products deactivated successfully',
        tagCreated: 'Tag "{{name}}" created'
      },
      error: {
        delete: 'Failed to delete product',
        bulkDelete: 'Failed to delete products',
        bulkActivate: 'Failed to activate products',
        bulkDeactivate: 'Failed to deactivate products',
        loadProducts: 'Could not load products',
        loadCategories: 'Error fetching categories',
        tagCreation: 'Failed to create tag',
        updateProduct: 'Failed to update product',
        invalidValue: 'Invalid value'
      },
      confirmation: {
        delete: 'Are you sure you want to delete this product?',
        bulkDelete: 'Are you sure you want to delete these {{count}} products?',
        activate: 'Are you sure you want to activate these {{count}} products?',
        deactivate: 'Are you sure you want to deactivate these {{count}} products?'
      },
      refresh: 'Refreshing products',
      refreshSuccess: 'Products refreshed successfully',
      refreshError: 'Failed to refresh products',
      loadMoreError: 'Failed to load more products'
    },
    statusLabels: {
      active: 'Active',
      inactive: 'Inactive'
    },
    tooltips: {
      edit: 'Edit product',
      delete: 'Delete product',
      expandRow: 'Show more details',
      collapseRow: 'Hide details',
      search: 'Search products by name, SKU, or description',
      filter: 'Filter products',
      refresh: 'Reload products',
      bulkActions: 'Perform actions on selected products',
      clearSearch: 'Clear search',
      clearFilters: 'Clear all filters'
    },
    modals: {
      bulkTags: {
        title: 'Manage Tags for Selected Products',
        description: 'Add or remove tags for {{count}} selected products',
        addTagsLabel: 'Add Tags',
        removeTagsLabel: 'Remove Tags',
        noTagsSelected: 'No tags selected',
        searchPlaceholder: 'Search tags...',
        createNewTag: 'Create new tag: {{name}}',
        buttons: {
          apply: 'Apply Changes',
          cancel: 'Cancel'
        }
      },
      bulkCategory: {
        title: 'Assign Category to Selected Products',
        description: 'Choose a category for {{count}} selected products',
        categoryLabel: 'Category',
        searchPlaceholder: 'Search categories...',
        buttons: {
          apply: 'Apply Category',
          cancel: 'Cancel'
        }
      }
    }
  },
  productDetailTabs: {
    tabs: {
      overview: 'Overview',
      attributes: 'Attributes',
      assets: 'Assets',
      history: 'History',
      price: 'Price'
    },
    overview: {
      productInfo: {
        title: 'Product Information',
        description: 'Details and specifications'
      },
      productCompleteness: {
        title: 'Data Completeness',
        description: 'Track the status of required product data',
        viewDetails: 'View Details',
        missingFieldsLabel: 'Missing Fields',
        criticalFields: 'Critical',
        recommendedFields: 'Recommended',
        optionalFields: 'Optional',
        noDetailsTracked: 'No specific field completeness details are tracked for this product.'
      },
      media: {
        title: 'Media',
        description: 'Product images and photos',
        noImagesAvailable: 'No images available yet',
        addImages: 'Add Images',
        viewAllImages: 'View All Images',
        primaryBadge: 'Primary'
      },
      relatedProducts: {
        title: 'Related Products',
        description: 'Products often purchased together',
        noRelatedProducts: 'No related products found'
      }
    },
    attributes: {
      title: 'Attributes',
      noAttributesFound: 'No attributes found for this product.',
      addAttribute: 'Add Attribute',
      loading: 'Loading attributes...',
      searchPlaceholder: 'Search attributes...',
      addNew: 'Add New',
      createNew: 'Create New Attribute',
      save: 'Save',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      confirmDelete: 'Are you sure you want to delete this attribute?',
      groupAttributes: {
        addAll: 'Add All',
        allAttributesAdded: 'All attributes from this group have been added to the product.'
      },
      attributeTypes: {
        text: 'Text',
        number: 'Number',
        boolean: 'Yes/No',
        select: 'Select',
        multiselect: 'Multi-select',
        date: 'Date',
        rich_text: 'Rich Text',
        price: 'Price',
        media: 'Media',
        measurement: 'Measurement',
        url: 'URL',
        email: 'Email',
        phone: 'Phone'
      },
      validation: {
        required: 'This field is required',
        numberFormat: 'Must be a valid number',
        emailFormat: 'Must be a valid email address',
        urlFormat: 'Must be a valid URL',
        phoneFormat: 'Must be a valid phone number',
        dateFormat: 'Must be a valid date'
      },
      createAttribute: {
        title: 'Create New Attribute',
        nameLabel: 'Attribute Name',
        namePlaceholder: 'Enter attribute name',
        typeLabel: 'Data Type',
        groupLabel: 'Attribute Group',
        groupPlaceholder: 'Select or create a group',
        createNewGroup: 'Create new group',
        mandatoryLabel: 'Is Mandatory',
        optionsLabel: 'Options (for select/multiselect)',
        addOption: 'Add Option',
        optionPlaceholder: 'Enter option value',
        validationRuleLabel: 'Validation Rule (optional)',
        validationPlaceholder: 'e.g., min:0,max:100',
        createButton: 'Create Attribute',
        cancelButton: 'Cancel',
        success: 'Attribute created successfully',
        error: 'Failed to create attribute'
      }
    },
    assets: {
      title: 'Assets',
      noAssetsFound: 'No assets found for this product.',
      addAsset: 'Add Asset',
      uploadingAsset: 'Uploading...',
      dragDropText: 'Drag and drop assets here or click to browse',
      primaryAsset: 'Set as primary',
      deleteAsset: 'Delete asset',
      deleteConfirm: 'Are you sure you want to delete this asset?',
      assetTypes: {
        image: 'Image',
        document: 'Document',
        video: 'Video',
        other: 'Other'
      }
    },
    history: {
      title: 'History',
      noHistoryFound: 'No history records found for this product.',
      activityTypes: {
        create: 'created this product',
        update: 'updated this product',
        asset_add: 'added assets',
        status_change: 'changed status',
        default: 'modified this product'
      }
    },
    price: {
      title: 'Price',
      loading: 'Loading price information...',
      noPricesFound: 'No prices have been set for this product.',
      addPrice: 'Add Price',
      currencyLabel: 'Currency',
      amountLabel: 'Amount',
      channelLabel: 'Channel',
      savePrice: 'Save Price',
      cancelEdit: 'Cancel',
      editPrice: 'Edit Price',
      deletePrice: 'Delete Price',
      deleteConfirm: 'Are you sure you want to delete this price?'
    },
    messages: {
      success: {
        attributeSaved: 'Attribute saved successfully',
        attributeDeleted: 'Attribute deleted successfully',
        assetAdded: 'Asset added successfully',
        assetDeleted: 'Asset deleted successfully',
        priceSaved: 'Price saved successfully',
        priceDeleted: 'Price deleted successfully'
      },
      error: {
        attributeSave: 'Failed to save attribute',
        attributeDelete: 'Failed to delete attribute',
        assetAdd: 'Failed to add asset',
        assetDelete: 'Failed to delete asset',
        priceSave: 'Failed to save price',
        priceDelete: 'Failed to delete price',
        loadAttributes: 'Failed to load attributes',
        loadAssets: 'Failed to load assets',
        loadActivity: 'Failed to load activity history',
        loadPrices: 'Failed to load prices'
      }
    }
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
