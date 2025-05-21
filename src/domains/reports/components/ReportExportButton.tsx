import React, { useState } from 'react';
import { Button } from '@/domains/core/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { API_URL } from '@/config/config';

interface ReportExportButtonProps {
  reportType: string;
  filters?: Record<string, any>;
}

const ReportExportButton: React.FC<ReportExportButtonProps> = ({ reportType, filters = {} }) => {
  const exportReport = (format: 'csv' | 'xlsx') => {
    try {
      // Construct the query string from filters
      const queryParams = new URLSearchParams({ ...filters, format });
      
      // Base backend URL – pulled from the central config so it works in all environments
      const backendUrl = API_URL.replace(/\/$/, ''); // trim trailing slash if present
      let fullUrl = '';
      
      if (reportType === 'completeness') {
        fullUrl = `${backendUrl}/export/completeness/?${queryParams.toString()}`;
      } else {
        // Fallback to the original paths for other report types
        let exportPath = '';
        switch (reportType) {
          case 'readiness':
            exportPath = 'api/analytics/readiness-export';
            break;
          case 'velocity':
            exportPath = 'api/analytics/enrichment-velocity-export';
            break;
          case 'localization':
            exportPath = 'api/analytics/localization-quality-export';
            break;
          case 'history':
            exportPath = 'api/analytics/change-history-export';
            break;
          default:
            console.error(`Unknown report type: ${reportType}`);
            return;
        }
        // Ensure a single leading slash on the export path
        const pathWithSlash = exportPath.startsWith('/') ? exportPath : `/${exportPath}`;
        fullUrl = `${backendUrl}${pathWithSlash}/?${queryParams.toString()}`;
      }
      
      console.log(`Exporting report to: ${fullUrl}`);
      
      // Directly open the URL in a new tab
      window.open(fullUrl);
      
      toast.success(`Export initiated. Check your downloads folder.`);
    } catch (error) {
      console.error('Error initiating export:', error);
      toast.error('Failed to start export. Please try again.');
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportReport('csv')}
        className="flex items-center"
      >
        <Download className="mr-2 h-4 w-4" />
        Export CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => exportReport('xlsx')}
        className="flex items-center"
      >
        <Download className="mr-2 h-4 w-4" />
        Export Excel
      </Button>
    </div>
  );
};

export default ReportExportButton; 