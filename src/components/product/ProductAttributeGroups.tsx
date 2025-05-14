import { useState, useEffect } from 'react'
import { FamilyOverridePayload, useOverrideFamilyGroups } from '@/api/familyApi'
import type { AttributeGroup } from '@/types/attributeGroup'
import type { Product } from '@/types/product'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { useToast } from '@/hooks/use-toast'

interface ProductAttributeGroupsProps {
  product: Partial<Product> & { id: number, effective_attribute_groups?: AttributeGroup[], family_overrides?: FamilyOverridePayload[] }
  onGroupsChange?: () => void
}

export function ProductAttributeGroups({ product, onGroupsChange }: ProductAttributeGroupsProps) {
  // States
  const [effectiveGroups, setEffectiveGroups] = useState<AttributeGroup[]>(
    product.effective_attribute_groups || []
  )
  const [overrides, setOverrides] = useState<FamilyOverridePayload[]>([])
  const [isChanged, setIsChanged] = useState(false)
  
  // Toast hook
  const { toast } = useToast()
  
  // Initialize overrides from the product data
  useEffect(() => {
    if (product.family_overrides) {
      setOverrides(product.family_overrides)
    }
    setEffectiveGroups(product.effective_attribute_groups || [])
  }, [product])
  
  // Mutation hook for saving overrides
  const overrideMutation = useOverrideFamilyGroups(product.id)
  
  // Toggle an attribute group override
  const toggleGroup = (groupId: number) => {
    // Check if we already have an override for this group
    const existingIndex = overrides.findIndex(o => o.attribute_group === groupId)
    
    let newOverrides = [...overrides]
    
    if (existingIndex >= 0) {
      // If the override exists, toggle its 'removed' status
      newOverrides[existingIndex] = {
        ...newOverrides[existingIndex],
        removed: !newOverrides[existingIndex].removed
      }
    } else {
      // If no override exists, create a new one (default to removing)
      newOverrides.push({
        attribute_group: groupId,
        removed: true
      })
    }
    
    setOverrides(newOverrides)
    setIsChanged(true)
  }
  
  // Clear an override
  const clearOverride = (groupId: number) => {
    setOverrides(overrides.filter(o => o.attribute_group !== groupId))
    setIsChanged(true)
  }
  
  // Get the override status for a group
  const getOverrideStatus = (groupId: number) => {
    const override = overrides.find(o => o.attribute_group === groupId)
    if (!override) return null
    return override.removed ? 'removed' : 'added'
  }
  
  // Save the overrides
  const saveOverrides = async () => {
    try {
      await overrideMutation.mutateAsync(overrides)
      toast({
        title: 'Success',
        description: 'Attribute group overrides saved successfully',
        variant: 'default'
      })
      setIsChanged(false)
      if (onGroupsChange) onGroupsChange()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save attribute group overrides',
        variant: 'destructive'
      })
    }
  }
  
  // Reset overrides to the original state
  const resetOverrides = () => {
    setOverrides(product.family_overrides || [])
    setIsChanged(false)
  }
  
  if (!product.family) {
    return (
      <div className="p-4 bg-gray-50 rounded-md">
        <p className="text-gray-600">This product doesn't belong to a family. Assign it to a family to manage attribute groups.</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Attribute Groups</h3>
        
        {isChanged && (
          <div className="space-x-2">
            <Button variant="outline" onClick={resetOverrides}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={saveOverrides}
              disabled={overrideMutation.isPending}
            >
              {overrideMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>
      
      <div className="space-y-2">
        {effectiveGroups.map((group) => {
          const overrideStatus = getOverrideStatus(group.id)
          
          return (
            <div key={group.id} className={`${overrideStatus === 'removed' ? 'opacity-60' : ''}`}>
              <Accordion type="single" collapsible>
                <AccordionItem value={`group-${group.id}`}>
                  <div className="flex justify-between items-center">
                    <AccordionTrigger>{group.name}</AccordionTrigger>
                    <div className="flex items-center px-4">
                      {overrideStatus && (
                        <span className={`text-xs px-2 py-1 rounded-full mr-2 ${
                          overrideStatus === 'removed' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {overrideStatus === 'removed' ? 'Removed' : 'Added'}
                        </span>
                      )}
                      <div className="space-x-2">
                        {overrideStatus ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => clearOverride(group.id)}
                          >
                            Reset to Default
                          </Button>
                        ) : null}
                        <Button
                          variant={overrideStatus === 'removed' ? 'success' : 'destructive'}
                          size="sm"
                          onClick={() => toggleGroup(group.id)}
                        >
                          {overrideStatus === 'removed' ? 'Restore Group' : 'Remove Group'}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <AccordionContent>
                    <div className="p-4">
                      <p className="text-sm text-gray-600">{group.description || 'No description provided.'}</p>
                      
                      <div className="mt-4">
                        <p className="text-xs text-gray-500">Contains {group.attributes?.length || 0} attributes</p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          )
        })}
        
        {effectiveGroups.length === 0 && (
          <div className="p-4 bg-gray-50 rounded-md">
            <p className="text-gray-600">No attribute groups available for this product.</p>
          </div>
        )}
      </div>
    </div>
  )
} 