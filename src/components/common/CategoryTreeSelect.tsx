import React, { useEffect, useState } from 'react';
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

// A recursive component for each tree node
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
  
  return (
    <li>
      <div 
        className={`
          flex items-center py-1.5 px-2 rounded-md
          ${isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}
        `}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {hasChildren ? (
          <button 
            onClick={() => onToggle(node)}
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
    
    // Convert to number if it's a numeric string
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
      // Add the new category to the tree
      setTreeData(prev => [...prev, {
        label: newCategory.name,
        value: newCategory.id.toString()
      }]);
      // Select the newly created category
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
    
    // Clone the nodes to avoid mutating the original
    const clonedNodes = JSON.parse(JSON.stringify(nodes));
    
    return clonedNodes.filter(node => {
      // Check if this node matches
      const nodeMatches = node.label.toLowerCase().includes(lowerTerm);
      
      // Check if any children match
      let childrenMatch = false;
      if (node.children && node.children.length > 0) {
        const matchingChildren = filterTreeBySearchTerm(node.children, term);
        childrenMatch = matchingChildren.length > 0;
        
        // If children match but node doesn't, replace children with only matching ones
        if (childrenMatch) {
          node.children = matchingChildren;
          // Auto-expand when filtering
          node.expanded = true;
        }
      }
      
      return nodeMatches || childrenMatch;
    });
  };

  // Get filtered data based on search term
  const filteredData = searchTerm 
    ? filterTreeBySearchTerm(treeData, searchTerm)
    : treeData;

  // Custom dropdown UI
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
    <div className="category-tree-select">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className={`w-full justify-between ${selectedLabel ? 'text-foreground' : 'text-muted-foreground'} ${className}`}
            disabled={disabled}
          >
            <div className="flex items-center truncate">
              {selectedLabel ? (
                <>
                  <FolderOpen size={18} className="mr-2 text-primary" />
                  <span className="truncate font-medium">{selectedLabel}</span>
                </>
              ) : (
                <span>{placeholder}</span>
              )}
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-70" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <div className="category-tree-content">
            {/* Search bar */}
            <div className="category-tree-search flex items-center border-b p-2 sticky top-0 bg-background z-10">
              <Search className="h-4 w-4 text-muted-foreground mr-2" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search categories..."
                className="h-8 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 ml-1"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="h-3 w-3" />
                </Button>
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
            
            {/* Create category section */}
            {createNewEnabled && (
              <div className="category-tree-create border-t p-2 bg-muted/30">
                <div className="flex space-x-2">
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="New category name..."
                    className="h-8"
                  />
                  <Button 
                    size="sm" 
                    disabled={!newCategoryName.trim() || isCreating}
                    onClick={handleCreate}
                    className="h-8"
                  >
                    {isCreating ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Plus className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}; 