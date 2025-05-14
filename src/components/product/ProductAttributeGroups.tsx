import { useState, useEffect } from 'react'
import { FamilyOverridePayload, useOverrideFamilyGroups } from '@/api/familyApi'
import type { AttributeGroup } from '@/types/attributeGroup'
import type { Product } from '@/types/product'
import type { Family } from '@/types/family'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { useToast } from '@/hooks/use-toast'
import { Info, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface ProductAttributeGroupsProps {
  product: Partial<Product> & { 
    id: number, 
    effective_attribute_groups?: AttributeGroup[], 
    family_overrides?: FamilyOverridePayload[],
    family?: Family
  }
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
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
        <div className="flex gap-2 items-center mb-2 text-amber-800">
          <AlertCircle size={20} />
          <h3 className="text-lg font-medium">No Family Assigned</h3>
        </div>
        <p className="text-amber-700">
          This product doesn't have a family assigned. Attribute groups can only be inherited from a product family.
          To use attribute groups, please assign this product to a family in the Basic Info tab.
        </p>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Attribute Groups</h3>
          <p className="text-sm text-gray-500">
            Manage which attribute groups from the '<span className="font-medium">{product.family.label}</span>' family are visible for this product.
            Groups can only be inherited from the product's family and optionally hidden or shown with overrides.
          </p>
        </div>
        
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
      
      <div className="bg-enterprise-50 border border-enterprise-200 rounded-md p-4 mb-4">
        <div className="flex items-start gap-2">
          <Info className="h-5 w-5 text-enterprise-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-enterprise-800">How Attribute Groups Work</h3>
            <p className="text-enterprise-700 text-sm mb-2">
              Attribute groups are defined by the product family and inherited by all products in that family.
              You can choose to hide specific groups for this product using the controls below.
            </p>
            <p className="text-enterprise-700 text-sm">
              These overrides only affect this specific product. The family definition remains unchanged.
            </p>
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        {effectiveGroups.length > 0 ? (
          effectiveGroups.map((group) => {
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
                            {overrideStatus === 'removed' ? 'Hidden' : 'Visible (Override)'}
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
                            {overrideStatus === 'removed' ? 'Show Group' : 'Hide Group'}
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
          })
        ) : (
          <div className="p-4 bg-gray-50 rounded-md">
            <p className="text-gray-600">
              No attribute groups are available in the '{product.family.label}' family.
              Try adding some attribute groups to the family first.
            </p>
          </div>
        )}
      </div>
    </div>
  )
} 