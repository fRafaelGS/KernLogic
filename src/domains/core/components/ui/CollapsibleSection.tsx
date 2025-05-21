import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/domains/core/components/ui/collapsible';
import { Button } from '@/domains/core/components/ui/button';
import { cn } from '@/domains/core/lib/utils';

interface CollapsibleSectionProps {
  title: string;
  description?: string | React.ReactNode;
  defaultOpen?: boolean;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  id?: string;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  description,
  defaultOpen = true,
  actions,
  className,
  children,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const sectionId = id || `section-${title.toLowerCase().replace(/\s+/g, '-')}`;

  // Trigger layout recalculation after animation completes
  useEffect(() => {
    const handleTransitionEnd = () => {
      window.dispatchEvent(new Event('resize'));
    };

    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener('transitionend', handleTransitionEnd);
      return () => {
        contentElement.removeEventListener('transitionend', handleTransitionEnd);
      };
    }
  }, []);

  // Force layout recalculation when section is opened or closed
  useEffect(() => {
    // Small delay to allow animation to start
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 50);
    
    return () => clearTimeout(timer);
  }, [isOpen]);

  return (
    <div className={cn('border rounded-lg shadow-sm bg-card', className)}>
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="flex flex-col"
      >
        {/* Header must be inside Collapsible but we can style it separately */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex-1">
            <div className="flex items-center">
              <h3 className="text-lg font-medium" id={`${sectionId}-heading`}>
                {title}
              </h3>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="ml-2 h-8 w-8 p-0" aria-expanded={isOpen} aria-controls={sectionId}>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span className="sr-only">{isOpen ? 'Collapse' : 'Expand'} {title}</span>
                </Button>
              </CollapsibleTrigger>
            </div>
            {description && (
              <div className="text-sm text-muted-foreground mt-1">
                {description}
              </div>
            )}
          </div>
          {actions && <div className="flex items-center ml-4">{actions}</div>}
        </div>
        
        <CollapsibleContent 
          id={sectionId} 
          aria-labelledby={`${sectionId}-heading`}
          ref={contentRef}
          className="flex-1 min-h-0"
        >
          <div className="p-4 h-full overflow-auto">{children}</div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}; 