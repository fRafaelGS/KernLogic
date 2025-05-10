import { 
  transformCategoryToTreeNode, 
  findNodeById, 
  getBreadcrumbPath 
} from '@/services/categoryService';
import { Category, TreeNode } from '@/types/categories';

describe('Category Tree Utilities', () => {
  // Sample test data
  const sampleCategory: Category = {
    id: 1,
    name: 'Electronics',
    children: [
      {
        id: 2,
        name: 'Computers',
        children: [
          { id: 3, name: 'Laptops', children: [] }
        ]
      },
      {
        id: 4,
        name: 'Phones',
        children: []
      }
    ]
  };

  // Sample tree nodes for testing search and breadcrumb functions
  const sampleTreeNodes: TreeNode[] = [
    {
      label: 'Electronics',
      value: '1',
      children: [
        {
          label: 'Computers',
          value: '2',
          children: [
            {
              label: 'Laptops',
              value: '3',
            }
          ]
        },
        {
          label: 'Phones',
          value: '4',
        }
      ]
    },
    {
      label: 'Clothing',
      value: '5',
      children: [
        {
          label: 'Men',
          value: '6',
        },
        {
          label: 'Women',
          value: '7',
        }
      ]
    }
  ];

  test('transformCategoryToTreeNode converts to correct format', () => {
    const result = transformCategoryToTreeNode(sampleCategory);
    
    expect(result).toEqual({
      label: 'Electronics',
      value: '1',
      children: [
        {
          label: 'Computers',
          value: '2',
          children: [
            {
              label: 'Laptops',
              value: '3',
              children: undefined,
              expanded: false
            }
          ],
          expanded: false
        },
        {
          label: 'Phones',
          value: '4',
          children: undefined,
          expanded: false
        }
      ],
      expanded: false
    });
  });

  test('findNodeById finds a node by ID', () => {
    // Find a top-level node
    let found = findNodeById(sampleTreeNodes, '1');
    expect(found).toEqual(sampleTreeNodes[0]);

    // Find a deeply nested node
    found = findNodeById(sampleTreeNodes, '3');
    expect(found).toEqual(sampleTreeNodes[0].children![0].children![0]);

    // Find a node in another branch
    found = findNodeById(sampleTreeNodes, '7');
    expect(found).toEqual(sampleTreeNodes[1].children![1]);

    // Try to find a non-existent node
    found = findNodeById(sampleTreeNodes, '999');
    expect(found).toBeNull();
  });

  test('getBreadcrumbPath returns correct path string', () => {
    // Path to a top-level node
    let path = getBreadcrumbPath(sampleTreeNodes, '1');
    expect(path).toBe('Electronics');

    // Path to a nested node
    path = getBreadcrumbPath(sampleTreeNodes, '3');
    expect(path).toBe('Electronics > Computers > Laptops');

    // Path to a non-existent node
    path = getBreadcrumbPath(sampleTreeNodes, '999');
    expect(path).toBe('Uncategorized');
  });
}); 