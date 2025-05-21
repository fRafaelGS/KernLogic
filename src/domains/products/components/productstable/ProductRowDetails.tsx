import React, { useMemo } from "react";
import { Product, ProductAttribute } from "@/services/productService";
import { Badge } from "@/domains/core/components/ui/badge";
import { cn } from "@/domains/core/lib/utils";
import { TableRow, TableCell } from "@/domains/core/components/ui/table";
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react'
import { format } from 'date-fns'

interface ProductRowDetailsProps {
  product: Product & { attributes?: ProductAttribute[] };
  zebra: boolean;
  locale: string;
  channel: string;
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

// Format attribute value for display (enterprise-grade, handles objects, booleans, etc.)
function formatAttributeValue(value: any): React.ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span className="text-slate-400 italic">No value</span>
  }
  if (typeof value === 'boolean') {
    return value ? (
      <Badge variant="outline" className="bg-green-50 text-green-600 border-green-100"><Check className="h-3 w-3 mr-1" />Yes</Badge>
    ) : (
      <Badge variant="outline" className="bg-red-50 text-red-600 border-red-100"><X className="h-3 w-3 mr-1" />No</Badge>
    )
  }
  if (typeof value === 'object') {
    // Price: { amount, currency }
    if ('amount' in value && 'currency' in value) {
      return `${value.amount} ${value.currency}`
    }
    // Measurement: { amount, unit }
    if ('amount' in value && 'unit' in value) {
      return `${value.amount} ${value.unit || ''}`
    }
    // Media: { asset_id }
    if ('asset_id' in value) {
      return `Asset #${value.asset_id}`
    }
    // Fallback: JSON stringify
    return JSON.stringify(value)
  }
  // Date (ISO string)
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    try {
      return format(new Date(value), 'yyyy-MM-dd')
    } catch { /* ignore */ }
  }
  // URL/email/phone
  if (typeof value === 'string' && (value.startsWith('http') || value.includes('@'))) {
    return <a href={value.startsWith('http') ? value : `mailto:${value}`} target="_blank" rel="noopener noreferrer" className="text-primary underline">{value}</a>
  }
  // Rich text (basic)
  if (typeof value === 'string' && /<[^>]+>/.test(value)) {
    return <span dangerouslySetInnerHTML={{ __html: value }} />
  }
  // Default: string
  return String(value)
}

const ProductRowDetails: React.FC<ProductRowDetailsProps> = ({ product, zebra, locale, channel }) => {
  // Debug: log the raw attributes prop for this product
  console.log('[ProductRowDetails] attributes for product', product.id, product.attributes)

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
            .filter((item: any) => item.value !== undefined && item.value !== null)
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
              value: attr.value,
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
          
          // Determine attribute value (keep raw value, not string)
          let attrValue: any = undefined;
          if (attr.value !== undefined) {
            attrValue = attr.value;
          } else if (attr.display_value !== undefined) {
            attrValue = attr.display_value;
          } else if (label !== 'Unnamed' && attr[label] !== undefined && typeof attr[label] !== 'object') {
            attrValue = attr[label];
          } else {
            const valueKeys = Object.keys(attr).filter(key => 
              typeof attr[key] !== 'object' && 
              !['id', 'name', 'attribute_name', 'key', 'label', 'group', 'attribute_group'].includes(key));
            
            if (valueKeys.length > 0) {
              attrValue = attr[valueKeys[0]];
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
      <motion.tr
        layout
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.25 }}
        className={cn(
          "border-b",
          zebra ? "bg-slate-50" : "bg-white"
        )}
      >
        <TableCell colSpan={999} className="p-4 text-center text-sm text-gray-500">
          No attributes available for this product.
        </TableCell>
      </motion.tr>
    );
  }

  return (
    <motion.tr
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className={cn(
        "border-b",
        zebra ? "bg-slate-50/60" : "bg-white/60"
      )}
    >
      <TableCell colSpan={999} className="p-2">
        <div className="rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-3">
            <h3 className="text-sm font-medium mb-2">Product Attributes</h3>
            
            <div className="grid gap-2 grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
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
                          <span className="inline-block rounded-full bg-slate-200 px-1 py-0.5 text-[10px] font-normal text-slate-700">
                            {loc}
                          </span>
                        )}
                        {ch && (
                          <span className="inline-block rounded-full bg-slate-200 px-1 py-0.5 text-[10px] font-normal text-slate-700">
                            {ch}
                          </span>
                        )}
                      </h4>
                    );
                  })()}

                  <dl className="space-y-1">
                    {group.attributes
                      .map(attr => (
                        <div key={attr.id} className="grid grid-cols-2 text-xs">
                          <dt className="text-slate-700 font-medium truncate">{attr.name}:</dt>
                          <dd className="text-slate-900 truncate pl-1">
                            {formatAttributeValue(attr.value)}
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
    </motion.tr>
  );
};

export default ProductRowDetails; 