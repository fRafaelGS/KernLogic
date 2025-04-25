import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DownloadCloud, UserPlus, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QuickActionsProps {
  className?: string;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ className }) => {
  const navigate = useNavigate();
  
  return (
    <Card className={`bg-white border-enterprise-200 shadow-sm ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-enterprise-900">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
        <Button 
          variant="outline"
          className="flex justify-start items-center h-auto py-3 border-enterprise-200"
          onClick={() => navigate('/app/upload')}
        >
          <div className="h-8 w-8 rounded-full bg-primary-50 flex items-center justify-center mr-3">
            <DownloadCloud className="h-4 w-4 text-primary-600" />
          </div>
          <span className="text-enterprise-800 font-medium">Import CSV</span>
        </Button>
        
        <Button 
          variant="outline"
          className="flex justify-start items-center h-auto py-3 border-enterprise-200"
          onClick={() => navigate('/app/team/invite')}
        >
          <div className="h-8 w-8 rounded-full bg-success-50 flex items-center justify-center mr-3">
            <UserPlus className="h-4 w-4 text-success-600" />
          </div>
          <span className="text-enterprise-800 font-medium">Invite Teammate</span>
        </Button>
        
        <Button 
          variant="outline"
          className="flex justify-start items-center h-auto py-3 border-enterprise-200"
          onClick={() => navigate('/app/documentation')}
        >
          <div className="h-8 w-8 rounded-full bg-info-50 flex items-center justify-center mr-3">
            <FileText className="h-4 w-4 text-info-600" />
          </div>
          <span className="text-enterprise-800 font-medium">View Docs</span>
        </Button>
      </CardContent>
    </Card>
  );
}; 