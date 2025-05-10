import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Check, ChevronDown, ChevronRight, Folder, FolderOpen, Plus, Search, X, Loader2 } from 'lucide-react';
import { getCategoryTree, createCategory } from '@/services/categoryService';
import { TreeNode } from '@/types/categories';
import { toast } from '../ui/use-toast';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import './../../styles/category-tree-select.css';

interface CategoryTreeSelectProps {
  selectedValue?: string | number | null;
  onChange: (nodeId: string | number) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  createNewEnabled?: boolean;
}

interface TreeNodeRowProps {
  node: TreeNode;
  depth: number;
  selectedValue: string | null;
  onToggle: (node: TreeNode) => void;
  onSelect: (node: TreeNode) => void;
}

const TreeNodeRow: React.FC<TreeNodeRowProps> = ({ 
  node, 
  depth, 
  selectedValue, 
  onToggle, 
  onSelect 
}) => {
  const isSelected = node.value === selectedValue;
  const hasChildren = node.children && node.children.length > 0;
  
  // Stop propagation for all events
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };
  
  return (
    <li onClick={stopPropagation} onMouseDown={stopPropagation}>
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
          onClick={() => onSelect(node)}
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
  createNewEnabled = true,
}) => {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
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
  useEffect(() => {
    const loadCategories = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getCategoryTree();
        setTreeData(data);
        
        // Set initial selected label if we have a selectedValue
        if (selectedValue) {
          findSelectedLabel(data, selectedValue.toString());
        }
      } catch (err) {
        setError('Failed to load categories');
        toast({
          title: 'Error',
          description: 'Failed to load category tree',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadCategories();
  }, []);
  
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

  // Create new category
  const handleCreate = async () => {
    if (typeof newCategoryName !== 'string' || !newCategoryName.trim()) {
      toast({
        title: 'Error',
        description: 'Category name cannot be empty',
        variant: 'destructive',
      });
      return;
    }
    
    setIsCreating(true);
    try {
      const newCategory = await createCategory(newCategoryName.trim());
      setTreeData(prev => [...prev, {
        label: newCategory.name,
        value: newCategory.id.toString()
      }]);
      setSelectedLabel(newCategory.name);
      onChange(newCategory.id);
      setIsOpen(false);
      setNewCategoryName('');
      toast({
        title: 'Success',
        description: `Created category "${newCategory.name}"`,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to create category',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Filter tree based on search term
  const filterTreeBySearchTerm = (nodes: TreeNode[], term: string): TreeNode[] => {
    if (!term.trim()) return nodes;
    
    const lowerTerm = term.toLowerCase();
    const clonedNodes = JSON.parse(JSON.stringify(nodes));
    return clonedNodes.filter(node => {
      const nodeMatches = node.label.toLowerCase().includes(lowerTerm);
      let childrenMatch = false;
      if (node.children && node.children.length > 0) {
        const matchingChildren = filterTreeBySearchTerm(node.children, term);
        childrenMatch = matchingChildren.length > 0;
        if (childrenMatch) {
          node.children = matchingChildren;
          node.expanded = true;
        }
      }
      return nodeMatches || childrenMatch;
    });
  };

  const filteredData = searchTerm 
    ? filterTreeBySearchTerm(treeData, searchTerm)
    : treeData;

  if (isLoading) {
    return (
      <div className={`relative w-full flex items-center border rounded-md px-3 py-2 h-10 bg-background ${className}`}>
        <div className="flex items-center text-muted-foreground">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          <span>Loading categories...</span>
        </div>
      </div>
    );
  }

  if (error && !treeData.length) {
    return (
      <div className={`relative w-full border rounded-md px-3 py-2 text-destructive ${className}`}>
        {error} <button className="underline" onClick={() => window.location.reload()}>Reload</button>
      </div>
    );
  }

  return (
    <div 
      className={`relative ${className}`}
      onClick={stopPropagation}
      onMouseDown={stopPropagation}
      onMouseUp={stopPropagation}
      onKeyDown={stopPropagation}
      onKeyUp={stopPropagation}
      data-component="category-tree-select-container"
    >
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            role="combobox" 
            className={`w-full justify-between ${isOpen ? 'ring-2 ring-ring' : ''}`}
            disabled={disabled}
            onClick={stopPropagation}
            onMouseDown={stopPropagation}
            aria-expanded={isOpen}
          >
            {selectedLabel ? (
              <span className="truncate">{selectedLabel}</span>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-72 p-0" 
          align="start"
          onMouseDown={stopPropagation}
          onClick={stopPropagation}
        >
          <div className="flex flex-col h-full max-h-80">
            {/* Search and Create Section */}
            <div className="p-2 border-b flex flex-col gap-2">
              <div className="flex items-center gap-1 relative">
                <Search className="h-4 w-4 absolute left-2.5 text-muted-foreground" />
                <Input
                  placeholder="Search categories..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={stopPropagation}
                  onKeyDown={e => {
                    stopPropagation(e);
                    // If escape, clear search
                    if (e.key === 'Escape') {
                      setSearchTerm('');
                    }
                  }}
                />
              </div>
              
              {createNewEnabled && (
                <div className="flex gap-1">
                  {isCreating ? (
                    <>
                      <Input
                        placeholder="New category name..."
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="flex-1"
                        disabled={isCreating && !newCategoryName.trim()}
                        onKeyDown={e => {
                          stopPropagation(e);
                          if (e.key === 'Enter' && newCategoryName.trim()) {
                            handleCreate();
                          } else if (e.key === 'Escape') {
                            setIsCreating(false);
                            setNewCategoryName('');
                          }
                        }}
                        onClick={stopPropagation}
                      />
                      <Button 
                        size="sm" 
                        variant="primary" 
                        disabled={!newCategoryName.trim() || isCreating}
                        onClick={e => {
                          stopPropagation(e);
                          handleCreate();
                        }}
                      >
                        {isCreating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={e => {
                          stopPropagation(e);
                          setIsCreating(false);
                          setNewCategoryName('');
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full flex items-center justify-center gap-1"
                      onClick={e => {
                        stopPropagation(e);
                        setIsCreating(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      <span>Create Category</span>
                    </Button>
                  )}
                </div>
              )}
            </div>
            {/* Tree content */}
            <div className="category-tree-list overflow-y-auto p-2 max-h-[300px]">
              {filteredData.length > 0 ? (
                <ul className="list-none tree-root">
                  {filteredData.map(node => (
                    <TreeNodeRow
                      key={node.value}
                      node={node}
                      depth={0}
                      selectedValue={selectedValue?.toString() || null}
                      onToggle={toggleNode}
                      onSelect={handleSelect}
                    />
                  ))}
                </ul>
              ) : searchTerm ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p>No categories match "{searchTerm}"</p>
                  {createNewEnabled && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => {
                        setNewCategoryName(searchTerm);
                        setSearchTerm('');
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Create "{searchTerm}"
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p>No categories available</p>
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}; 