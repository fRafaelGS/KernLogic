import React, { useMemo } from "react";
import { Product, ProductAttribute } from "@/services/productService";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TableRow, TableCell } from "@/components/ui/table";

interface ProductRowDetailsProps {
  product: Product & { attributes?: ProductAttribute[] };
  zebra: boolean;
}

interface Attribute {
  id: string | number;
  name: string;
  value: string;
  group?: string;
}

interface AttributeGroup {
  name: string;
  attributes: Attribute[];
}

const ProductRowDetails: React.FC<ProductRowDetailsProps> = ({ product, zebra }) => {
  // Process and organize attributes into groups
  const attributeGroups = useMemo(() => {
    if (!product.attributes || !Array.isArray(product.attributes) || product.attributes.length === 0) {
      console.log("No attributes to display for product:", product.id);
      return [];
    }

    console.log("Processing attributes for product:", product.id, product.attributes);
    
    // Check if we have a nested group structure from the API
    // The API returns: [{ id: 1, name: "tech", items: [{...attributes}] }]
    if (product.attributes.length > 0 && 
        typeof product.attributes[0] === 'object' && 
        'name' in product.attributes[0] && 
        'items' in product.attributes[0]) {
      
      console.log("Detected nested group structure in attributes");
      
      // We have groups directly from the API
      return product.attributes.map((group: any) => {
        return {
          name: group.name,
          attributes: (group.items || [])
            // Filter out items without values
            .filter((item: any) => item.value !== undefined && item.value !== null && item.value !== '')
            .map((item: any) => {
              // Extract attribute info from each item
              const attrName = item.attribute_label || 
                              (typeof item.attribute === 'object' ? item.attribute.label : `Attribute ${item.attribute}`);
              
              return {
                id: item.id || `group-${group.id}-attr-${item.attribute}`,
                name: attrName,
                value: item.value || '',
                group: group.name,
                locale: item.locale,
                channel: item.channel
              };
            }).filter((attr: Attribute) => attr.name)
        };
      });
    }
    
    // If we don't have a nested structure, fall back to the previous approach
    console.log("Falling back to attribute-level group extraction");

    // First, normalize attributes to handle different possible formats
    const normalizedAttributes: Attribute[] = product.attributes
      // 1️⃣ ignore items without a usable value
      .filter((attr: any) =>
        typeof attr === 'string' ? attr.trim() !== '' : attr?.value !== undefined && attr?.value !== null && attr?.value !== '' || attr?.display_value
      )
      .map((attr: any, index: number) => {
        console.log(`[ProductRowDetails] Processing attribute for product ${product.id}:`, attr);
        
        if (typeof attr === 'string') {
          return { id: `str-attr-${index}`, name: attr, value: attr, group: '' };
        } else {
          // Special case for simple numeric value attributes
          if (Object.keys(attr).length === 1 && Object.keys(attr)[0] === 'value' && typeof attr.value !== 'object') {
            return {
              id: `value-attr-${index}`,
              name: 'Value',
              value: String(attr.value),
              group: ''
            };
          }
          
          // Determine attribute name (in priority order)
          const label =
            attr.attribute_label ||      // API field
            attr.label ||                // optional field
            attr.attribute_code ||       // fallback field
            attr.name ||                 // legacy field
            attr.attribute_name ||       // another possible field
            attr.key ||                  // another possible field
            'Unnamed';
          
          // Determine attribute value
          let attrValue = '';
          if (attr.value !== undefined) {
            attrValue = String(attr.value);
          } else if (attr.display_value !== undefined) {
            attrValue = String(attr.display_value);
          } else if (label !== 'Unnamed' && attr[label] !== undefined && typeof attr[label] !== 'object') {
            attrValue = String(attr[label]);
          } else {
            const valueKeys = Object.keys(attr).filter(key => 
              typeof attr[key] !== 'object' && 
              !['id', 'name', 'attribute_name', 'key', 'label', 'group', 'attribute_group'].includes(key));
            
            if (valueKeys.length > 0) {
              attrValue = String(attr[valueKeys[0]]);
            }
          }
          
          // Use the actual group name from the attribute data
          let groupName = '';
          
          if (attr.group_name) {
            groupName = attr.group_name;
          } 
          else if (attr.group) {
            groupName = attr.group;
          } 
          else if (attr.attribute_group) {
            groupName = attr.attribute_group;
          }
          else if (attr.groupName) {
            groupName = attr.groupName;
          }
          else if (attr.category) {
            groupName = attr.category;
          }
          
          // If we still don't have a group, check other indicators
          if (!groupName && attr.attribute_type) {
            if (['size', 'weight', 'dimensions', 'tech'].includes(attr.attribute_type)) {
              groupName = attr.attribute_type.charAt(0).toUpperCase() + attr.attribute_type.slice(1);
            }
          }
          
          if (!groupName && attr.attribute_code) {
            if (attr.attribute_code === 'tech' || attr.attribute_code.includes('tech')) {
              groupName = 'tech';
            }
          }
          
          return {
            id: attr.id || `attr-${index}-${Math.random().toString(36).substring(2, 9)}`,
            name: label === 'attribute' ? (attr.attribute_label || attr.attribute_code || 'Attribute') : label,
            value: attrValue,
            group: groupName,
            locale: attr.locale,
            channel: attr.channel
          };
        }
      });
    
    console.log(`[ProductRowDetails] Normalized attributes for product ${product.id}:`, normalizedAttributes);

    // Group attributes by their group property
    const groups: Record<string, Attribute[]> = {};
    
    normalizedAttributes.forEach(attr => {
      const groupName = attr.group || 'Uncategorized';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(attr);
    });

    // Sort the groups and attributes within each group
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, attributes]) => ({
        name,
        attributes: attributes.sort((a, b) => 
          a.name.localeCompare(b.name)
        )
      }));
  }, [product.attributes]);

  // If no attributes, render a simple message
  if (attributeGroups.length === 0) {
    return (
      <TableRow className={cn(
        "border-b",
        zebra ? "bg-slate-50" : "bg-white"
      )}>
        <TableCell colSpan={999} className="p-4 text-center text-sm text-gray-500">
          No attributes available for this product.
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow className={cn(
      "border-b",
      zebra ? "bg-slate-50/60" : "bg-white/60"
    )}>
      <TableCell colSpan={999} className="p-2">
        <div className="rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-3">
            <h3 className="text-sm font-medium mb-2">Product Attributes</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {attributeGroups.map((group) => (
                <div
                  key={group.name}
                  className="rounded-md border border-slate-200 p-2 bg-white hover:bg-slate-50 transition-colors"
                >
                  {/* group name + locale / channel badges */}
                  {(() => {
                    const first = group.attributes[0] as any;          // safe: group has ≥1 attr
                    const loc   = first?.locale;
                    const ch    = first?.channel;

                    return (
                      <h4 className="text-xs font-medium text-slate-700 mb-1 pt-1 border-t border-slate-200 flex items-center gap-1">
                        {group.name}
                        {loc && (
                          <span className="inline-block rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-normal text-slate-700">
                            {loc}
                          </span>
                        )}
                        {ch && (
                          <span className="inline-block rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-normal text-slate-700">
                            {ch}
                          </span>
                        )}
                      </h4>
                    );
                  })()}

                  <dl className="space-y-1">
                    {group.attributes
                      .filter(a => a.value && String(a.value).trim() !== '')
                      .map(attr => (
                      <div key={attr.id} className="grid grid-cols-2 text-xs">
                        <dt className="text-slate-700 font-medium truncate">{attr.name}:</dt>
                        <dd className="text-slate-900 truncate pl-1">
                          {attr.value || (
                            <span className="text-slate-400 italic">No value</span>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>

              ))}
            </div>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default ProductRowDetails; 