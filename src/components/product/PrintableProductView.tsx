import React from 'react';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { format } from 'date-fns';
import { Product, AttributeGroup } from '@/types/product';
import { cn } from '@/lib/utils';

interface PrintableProductViewProps {
  product: Product;
}

const PrintableProductView: React.FC<PrintableProductViewProps> = ({ product }) => {
  const {
    name,
    sku,
    category,
    brand,
    tags,
    gtin,
    price,
    status,
    createdAt,
    updatedAt,
    description,
    dataCompleteness,
    primaryImage,
    attributeGroups,
  } = product;

  // Format dates properly
  const formattedCreatedAt = format(new Date(createdAt), 'PPP');
  const formattedUpdatedAt = format(new Date(updatedAt), 'PPP');

  // Check if there is a primary image
  const hasImage = primaryImage && primaryImage.url;

  return (
    <div className="printable-product-view p-8 max-w-[210mm] mx-auto">
      {/* Header with logo and product name */}
      <header className="flex items-center justify-between border-b pb-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8">
            {/* Logo placeholder - replace with actual logo import */}
            <div className="bg-primary h-full w-full rounded-sm flex items-center justify-center text-primary-foreground font-bold">K</div>
          </div>
          <span className="text-xl font-bold">KernLogic</span>
        </div>
        <div className="text-right">
          <h1 className="text-xl font-bold">{name}</h1>
          <p className="text-muted-foreground">SKU: {sku}</p>
        </div>
      </header>

      {/* Primary image */}
      {hasImage ? (
        <div className="flex justify-center my-6">
          <div className="relative h-[200px] w-[300px]">
            <img
              src={primaryImage.url}
              alt={name}
              className="object-contain h-full w-full"
            />
          </div>
        </div>
      ) : (
        <div className="flex justify-center my-6 border rounded-md h-[200px] w-[300px] mx-auto bg-muted">
          <div className="flex items-center justify-center h-full w-full text-muted-foreground">
            No image available
          </div>
        </div>
      )}

      {/* Core information grid */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Core Information</h2>
        <div className="grid grid-cols-2 gap-4 border rounded-lg p-4">
          <div className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">SKU</span>
              <p>{sku}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Category</span>
              <p>{category?.name || 'N/A'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Brand</span>
              <p>{brand?.name || 'N/A'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">GTIN</span>
              <p>{gtin || 'N/A'}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">Price</span>
              <p>${price?.toFixed(2) || 'N/A'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Status</span>
              <p>{status}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Created</span>
              <p>{formattedCreatedAt}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Last Modified</span>
              <p>{formattedUpdatedAt}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Tags */}
      {tags && tags.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-muted text-muted-foreground rounded-md text-sm"
              >
                {tag.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Description */}
      {description && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Description</h2>
          <div className="border rounded-lg p-4 whitespace-pre-wrap">
            {description}
          </div>
        </section>
      )}

      {/* Data Completeness */}
      {dataCompleteness && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Data Completeness</h2>
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-300",
                      dataCompleteness.score >= 80 
                        ? "bg-green-500" 
                        : dataCompleteness.score >= 50 
                          ? "bg-amber-500" 
                          : "bg-red-500"
                    )}
                    style={{ width: `${dataCompleteness.score}%` }}
                  />
                </div>
              </div>
              <span className="font-medium">{dataCompleteness.score}%</span>
            </div>

            {dataCompleteness.missingFields && dataCompleteness.missingFields.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-muted-foreground">Missing Fields:</p>
                <ul className="text-sm list-disc pl-5 mt-1">
                  {dataCompleteness.missingFields.map((field, index) => (
                    <li key={index}>{field}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Attribute groups */}
      {attributeGroups && attributeGroups.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Attributes</h2>
          <div className="space-y-4">
            {attributeGroups.map((group: AttributeGroup) => (
              group.attributes && group.attributes.length > 0 ? (
                <CollapsibleSection
                  key={group.id}
                  title={group.name}
                  defaultOpen={true}
                >
                  <div className="grid grid-cols-2 gap-4">
                    {group.attributes.map((attr) => (
                      <div key={attr.id} className="border-b pb-2 last:border-0">
                        <span className="text-sm text-muted-foreground">{attr.name}</span>
                        <p className="truncate" title={attr.value}>{attr.value || 'N/A'}</p>
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>
              ) : null
            ))}
          </div>
        </section>
      )}

      {/* Footer with page info - this will be replaced by PDF generation */}
      <footer className="mt-8 pt-4 border-t text-sm text-muted-foreground text-center">
        <p>KernLogic PIM - Product Specification</p>
      </footer>
    </div>
  );
};

export default PrintableProductView; 