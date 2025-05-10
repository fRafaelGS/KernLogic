import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Check, ChevronDown, ChevronRight, Folder, FolderOpen, Plus, Search, X, Loader2 } from 'lucide-react';
import { getCategoryTree, createCategory } from '@/services/categoryService';
import { TreeNode } from '@/types/categories';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import * as Popover from '@radix-ui/react-popover';
import { useDebounce } from '@/hooks/useDebounce';
import './../../styles/category-tree-select.css';

interface CategoryTreeSelectProps {
  selectedValue?: string | number | null;
  onChange: (nodeId: string | number) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  allowSelectParent?: boolean;
  parentCategory?: number | null;
  onCreate?: (name: string) => Promise<void> | void;
}

interface TreeNodeRowProps {
  node: TreeNode;
  depth: number;
  selectedValue: string | null;
  onToggle: (node: TreeNode) => void;
  onSelect: (node: TreeNode) => void;
  allowSelectParent?: boolean;
}

const TreeNodeRow: React.FC<TreeNodeRowProps> = ({ 
  node, 
  depth, 
  selectedValue, 
  onToggle, 
  onSelect,
  allowSelectParent = true
}) => {
  const isSelected = node.value === selectedValue;
  const hasChildren = node.children && node.children.length > 0;
  
  // Stop propagation for all events
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  
  return (
    <li data-node-label={node.label}>
      <div 
        className={`
          flex items-center py-1.5 px-2 rounded-md
          ${isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}
        `}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {hasChildren ? (
          <button 
            type="button"
            onClick={e => { e.stopPropagation(); onToggle(node); }}
            className="p-0.5 mr-1.5 rounded-sm hover:bg-muted flex items-center justify-center"
            aria-label={node.expanded ? "Collapse" : "Expand"}
          >
            <ChevronRight 
              className={`h-4 w-4 transition-transform ${node.expanded ? 'rotate-90' : ''}`} 
            />
          </button>
        ) : (
          <span className="ml-6"></span>
        )}
        
        <button
          className="flex-1 text-left flex items-center"
          onClick={e => { e.stopPropagation(); onSelect(node); }}
          disabled={!allowSelectParent && hasChildren}
          aria-disabled={!allowSelectParent && hasChildren}
        >
          {hasChildren ? (
            node.expanded ? (
              <FolderOpen size={16} className="mr-1.5 opacity-70" />
            ) : (
              <Folder size={16} className="mr-1.5 opacity-70" />
            )
          ) : (
            <Folder size={16} className="mr-1.5 opacity-70" />
          )}
          <span className="truncate">{node.label}</span>
        </button>
        
        {isSelected && (
          <Check size={16} className="ml-1 text-primary" />
        )}
      </div>
      
      {hasChildren && node.expanded && (
        <ul className="list-none">
          {node.children.map(childNode => (
            <TreeNodeRow
              key={childNode.value}
              node={childNode}
              depth={depth + 1}
              selectedValue={selectedValue}
              onToggle={onToggle}
              onSelect={onSelect}
              allowSelectParent={allowSelectParent}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

export const CategoryTreeSelect: React.FC<CategoryTreeSelectProps> = ({
  selectedValue,
  onChange,
  className = '',
  placeholder = 'Select category...',
  disabled = false,
  allowSelectParent = true,
  parentCategory = null,
  onCreate,
}) => {
  const { toast } = useToast();
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Selected category display name
  const [selectedLabel, setSelectedLabel] = useState<string>('');
  
  // Use a ref to check if mounted to avoid memory leaks
  const componentMounted = useRef(true);
  
  useEffect(() => {
    // Cleanup function
    return () => {
      componentMounted.current = false;
    };
  }, []);

  // Event handler to stop propagation for all mouse and keyboard events
  const stopPropagation = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
  }, []);

  // Load tree data on component mount
  const loadCategories = useCallback(async () => {
    if (!componentMounted.current) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCategoryTree();
      if (componentMounted.current) {
        setTreeData(data);
        
        // Set initial selected label if we have a selectedValue
        if (selectedValue) {
          findSelectedLabel(data, selectedValue.toString());
        }
      }
    } catch (err) {
      if (componentMounted.current) {
        setError('Failed to load categories');
        toast({
          title: 'Error',
          description: 'Failed to load category tree',
          variant: 'destructive',
        });
      }
    } finally {
      if (componentMounted.current) {
        setIsLoading(false);
      }
    }
  }, [selectedValue, toast]);
  
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);
  
  // Find and set the label for the selected value
  const findSelectedLabel = (nodes: TreeNode[], valueToFind: string) => {
    const findNode = (nodeList: TreeNode[]): string | null => {
      for (const node of nodeList) {
        if (node.value === valueToFind) {
          setSelectedLabel(node.label);
          return node.label;
        }
        if (node.children) {
          const result = findNode(node.children);
          if (result) return result;
        }
      }
      return null;
    };
    
    return findNode(nodes);
  };

  // Find a leaf node by name (for after create)
  const findLeafByName = (nodes: TreeNode[], nameToFind: string): TreeNode | null => {
    for (const node of nodes) {
      if (node.label.toLowerCase() === nameToFind.toLowerCase()) {
        return node;
      }
      
      if (node.children && node.children.length > 0) {
        const result = findLeafByName(node.children, nameToFind);
        if (result) return result;
      }
    }
    return null;
  };

  // Toggle node expanded state
  const toggleNode = (targetNode: TreeNode) => {
    const toggleNodeInTree = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map(node => {
        if (node.value === targetNode.value) {
          // Toggle the expanded state
          return { ...node, expanded: !node.expanded };
        }
        
        // Recursively process children
        if (node.children && node.children.length > 0) {
          return {
            ...node,
            children: toggleNodeInTree(node.children)
          };
        }
        
        return node;
      });
    };
    
    setTreeData(toggleNodeInTree(treeData));
  };

  // Handle node selection
  const handleSelect = (node: TreeNode) => {
    setSelectedLabel(node.label);
    const numericValue = !isNaN(Number(node.value)) 
      ? Number(node.value) 
      : node.value;
    onChange(numericValue);
    setIsOpen(false);
  };

  // Filter tree based on search term
  const filterTreeBySearchTerm = useCallback((nodes: TreeNode[], term: string): TreeNode[] => {
    if (!term.trim()) return nodes;
    
    const lowerTerm = term.toLowerCase();
    // Deep clone to avoid modifying original data
    const clonedNodes = JSON.parse(JSON.stringify(nodes));
    
    return clonedNodes.filter((node: TreeNode) => {
      const nodeMatches = node.label.toLowerCase().includes(lowerTerm);
      let childrenMatch = false;
      
      if (node.children && node.children.length > 0) {
        const matchingChildren = filterTreeBySearchTerm(node.children, term);
        childrenMatch = matchingChildren.length > 0;
        
        if (childrenMatch) {
          node.children = matchingChildren;
          node.expanded = true; // Auto-expand when matches are found
        }
      }
      
      return nodeMatches || childrenMatch;
    });
  }, []);

  // Get filtered data based on search term
  const filteredData = React.useMemo(() => 
    debouncedSearchTerm 
      ? filterTreeBySearchTerm(treeData, debouncedSearchTerm)
      : treeData
  , [debouncedSearchTerm, treeData, filterTreeBySearchTerm]);

  // Render loading state
  if (isLoading && !treeData.length) {
    return (
      <div className={`relative w-full flex items-center border rounded-md px-3 py-2 h-10 bg-background ${className}`}>
        <div className="flex items-center text-muted-foreground">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          <span>Loading categories...</span>
        </div>
      </div>
    );
  }

  // Render error state
  if (error && !treeData.length) {
    return (
      <div className={`relative w-full border rounded-md px-3 py-2 text-destructive ${className}`}>
        {error} <button className="underline" onClick={loadCategories}>Retry</button>
      </div>
    );
  }

  // Render main component
  return (
    <div 
      className={`relative ${className}`}
      data-component="category-tree-select-container"
      data-testid="category-tree-select"
    >
      <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
        <Popover.Trigger asChild>
          <Button 
            variant="outline" 
            role="combobox" 
            className={`w-full justify-between ${isOpen ? 'ring-2 ring-ring' : ''}`}
            disabled={disabled}
            onClick={stopPropagation}
            onMouseDown={stopPropagation}
            aria-expanded={isOpen}
            data-testid="category-select-trigger"
          >
            {selectedLabel ? (
              <span className="truncate">{selectedLabel}</span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            side="bottom"
            align="start"
            sideOffset={8}
            collisionPadding={16}
            avoidCollisions
            className="
              bg-white rounded-lg shadow-lg z-[1000]
              min-w-[300px] max-w-[90vw]
              max-h-[var(--radix-popper-available-height)] overflow-auto
              flex flex-col
            "
            data-testid="category-popover"
          >
            <div className="flex flex-col h-full">
              {/* 1) Sticky search header */}
              <div className="sticky top-0 z-20 bg-background border-b px-3 py-2 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search categories…"
                    className="pl-10 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onClick={stopPropagation}
                    onKeyDown={e => {
                      stopPropagation(e);
                      if (e.key === 'Escape') {
                        setSearchTerm('');
                      }
                    }}
                    data-testid="category-search-input"
                  />
                </div>
              </div>

              {/* 2) Tree list fills remaining space */}
              <div className="flex-1 overflow-y-auto p-2 overscroll-contain">
                {filteredData.length > 0 ? (
                  <ul className="list-none" data-testid="category-tree">
                    {filteredData.map(node => (
                      <TreeNodeRow
                        key={node.value}
                        node={node}
                        depth={0}
                        selectedValue={selectedValue?.toString() || null}
                        onToggle={toggleNode}
                        onSelect={handleSelect}
                        allowSelectParent={allowSelectParent}
                      />
                    ))}
                  </ul>
                ) : searchTerm ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>No categories match "{searchTerm}"</p>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>No categories available</p>
                  </div>
                )}
              </div>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}; 