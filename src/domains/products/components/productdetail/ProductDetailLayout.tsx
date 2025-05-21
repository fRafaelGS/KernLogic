import React from 'react';

interface ProductDetailLayoutProps {
  sidebar: React.ReactNode;
  content: React.ReactNode;
}

export const ProductDetailLayout: React.FC<ProductDetailLayoutProps> = ({ 
  sidebar, 
  content 
}) => {
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Info sidebar (25% width on desktop) */}
      <div className="w-full lg:w-1/4 order-2 lg:order-1">
        {sidebar}
      </div>
      
      {/* Main content (75% width on desktop) */}
      <div className="w-full lg:w-3/4 order-1 lg:order-2">
        {content}
      </div>
    </div>
  );
}; 