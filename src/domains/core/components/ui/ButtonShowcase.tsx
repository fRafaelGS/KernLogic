import React from 'react';
import { Button } from '@/domains/core/components/ui/button';
import { 
  Save, 
  Plus, 
  Edit, 
  Trash2, 
  X, 
  Download, 
  Check, 
  ExternalLink,
  ArrowRight
} from 'lucide-react';

// Row component for each button variant group
const VariantRow = ({ 
  title, 
  variant, 
  icon 
}: { 
  title: string; 
  variant: "primary" | "secondary" | "success" | "destructive" | "outline" | "ghost" | "link"; 
  icon?: React.ReactNode;
}) => {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-enterprise-700 mb-3">{title}</h3>
      <div className="flex flex-wrap items-center gap-4">
        <Button variant={variant} size="default">
          {icon && <span className="mr-1">{icon}</span>}
          {title}
        </Button>
        
        <Button variant={variant} size="sm">
          {icon && <span className="mr-1">{icon}</span>}
          Small
        </Button>
        
        <Button variant={variant} size="lg">
          {icon && <span className="mr-1">{icon}</span>}
          Large
        </Button>
        
        <Button variant={variant} isLoading>
          Loading
        </Button>
        
        <Button variant={variant} disabled>
          {icon && <span className="mr-1">{icon}</span>}
          Disabled
        </Button>
      </div>
    </div>
  );
};

export function ButtonShowcase() {
  return (
    <div className="bg-white p-6 rounded-lg border border-enterprise-200">
      <h2 className="text-xl font-semibold text-enterprise-900 mb-6">Button Component Variants</h2>
      
      <VariantRow 
        title="Primary" 
        variant="primary" 
        icon={<Save />}
      />
      
      <VariantRow 
        title="Secondary" 
        variant="secondary" 
        icon={<Edit />}
      />
      
      <VariantRow 
        title="Success" 
        variant="success" 
        icon={<Check />}
      />
      
      <VariantRow 
        title="Destructive" 
        variant="destructive" 
        icon={<Trash2 />}
      />
      
      <VariantRow 
        title="Outline" 
        variant="outline" 
        icon={<Download />}
      />
      
      <VariantRow 
        title="Ghost" 
        variant="ghost" 
        icon={<X />}
      />
      
      <VariantRow 
        title="Link" 
        variant="link" 
        icon={<ExternalLink />}
      />
      
      <div className="mt-8">
        <h3 className="text-sm font-medium text-enterprise-700 mb-3">Full-width Buttons</h3>
        <div className="space-y-3 max-w-md">
          <Button variant="primary" fullWidth={true}>
            <Plus size={16} />
            Create New Product
          </Button>
          
          <Button variant="secondary" fullWidth={true}>
            Continue to Next Step
            <ArrowRight size={16} />
          </Button>
        </div>
      </div>
      
      <div className="mt-8">
        <h3 className="text-sm font-medium text-enterprise-700 mb-3">Icon Buttons</h3>
        <div className="flex flex-wrap gap-4">
          <Button variant="primary" size="icon">
            <Plus />
          </Button>
          
          <Button variant="secondary" size="icon">
            <Edit />
          </Button>
          
          <Button variant="destructive" size="icon">
            <Trash2 />
          </Button>
          
          <Button variant="outline" size="icon-sm">
            <Save />
          </Button>
          
          <Button variant="ghost" size="icon-sm">
            <X />
          </Button>
        </div>
      </div>
    </div>
  );
} 