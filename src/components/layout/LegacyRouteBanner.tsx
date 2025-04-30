import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

// Extend the Window interface to include our custom property
declare global {
  interface Window {
    showLegacyRouteWarning?: () => void;
  }
}

interface LegacyRouteBannerProps {
  className?: string;
}

/**
 * A banner that appears when a legacy API route is used.
 * This helps developers identify when non-versioned API paths are being accessed.
 */
const LegacyRouteBanner: React.FC<LegacyRouteBannerProps> = ({ className = '' }) => {
  const [showBanner, setShowBanner] = useState(false);
  
  // Listen for custom event triggered by the axios interceptor
  useEffect(() => {
    const handleLegacyRoute = () => {
      setShowBanner(true);
      
      // Hide the banner after a while
      setTimeout(() => {
        setShowBanner(false);
      }, 5000);
    };
    
    // Create a custom event we can listen for
    window.addEventListener('legacy-route-detected', handleLegacyRoute);
    
    // Expose a global function that the axios interceptor can call
    window.showLegacyRouteWarning = handleLegacyRoute;
    
    return () => {
      window.removeEventListener('legacy-route-detected', handleLegacyRoute);
      window.showLegacyRouteWarning = undefined;
    };
  }, []);
  
  if (!showBanner) return null;
  
  return (
    <div className={`fixed bottom-4 right-4 bg-amber-100 border border-amber-300 text-amber-800 px-4 py-2 rounded-md shadow-md flex items-center space-x-2 z-50 ${className}`}>
      <AlertTriangle size={18} className="text-amber-500" />
      <span className="text-sm font-medium">
        Legacy API route detected. Please update to use versioned endpoints.
      </span>
      <button 
        onClick={() => setShowBanner(false)}
        className="ml-2 text-amber-700 hover:text-amber-900"
        aria-label="Dismiss"
      >
        &times;
      </button>
    </div>
  );
};

export default LegacyRouteBanner; 