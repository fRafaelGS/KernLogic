import React, { createContext, useContext, ReactNode } from 'react';

// Define the interface for our feature flags
export interface FeatureFlags {
  useNewPricingUI: boolean;
  useNewPricingData: boolean;
}

// Create the context with default values (all flags off)
const FeatureFlagsContext = createContext<FeatureFlags>({
  useNewPricingUI: false,
  useNewPricingData: false,
});

// Provider props interface
interface FeatureFlagsProviderProps {
  children: ReactNode;
  // Optional override flags for testing
  overrideFlags?: Partial<FeatureFlags>;
}

export const FeatureFlagsProvider: React.FC<FeatureFlagsProviderProps> = ({ 
  children, 
  overrideFlags 
}) => {
  // Load flags from environment variables
  const flags: FeatureFlags = {
    useNewPricingUI: process.env.NEXT_PUBLIC_USE_NEW_PRICING_UI === 'true',
    useNewPricingData: process.env.NEXT_PUBLIC_USE_NEW_PRICING_DATA === 'true',
    // Apply any override flags (useful for testing)
    ...overrideFlags,
  };
  
  return (
    <FeatureFlagsContext.Provider value={flags}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};

// Custom hook to access the feature flags
export const useFeatureFlags = (): FeatureFlags => {
  const context = useContext(FeatureFlagsContext);
  if (context === undefined) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagsProvider');
  }
  return context;
}; 