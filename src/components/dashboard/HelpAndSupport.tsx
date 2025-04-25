import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HelpCircle, MessageSquare, ExternalLink } from 'lucide-react';

interface HelpAndSupportProps {
  className?: string;
}

export const HelpAndSupport: React.FC<HelpAndSupportProps> = ({ className }) => {
  return (
    <Card className={`bg-white border-enterprise-200 shadow-sm ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-enterprise-900">Help & Support</CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <Button 
          variant="ghost" 
          className="flex justify-start items-center w-full h-auto py-2 hover:bg-enterprise-50 hover:text-enterprise-900"
          onClick={() => window.open('https://docs.kernlogic.com', '_blank')}
        >
          <HelpCircle className="h-4 w-4 mr-2" />
          <span>Knowledge Base</span>
          <ExternalLink className="h-3 w-3 ml-auto" />
        </Button>
        
        <Button 
          variant="ghost"
          className="flex justify-start items-center w-full h-auto py-2 hover:bg-enterprise-50 hover:text-enterprise-900"
          onClick={() => window.open('https://support.kernlogic.com', '_blank')}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          <span>Contact Support</span>
          <ExternalLink className="h-3 w-3 ml-auto" />
        </Button>
      </CardContent>
    </Card>
  );
}; 