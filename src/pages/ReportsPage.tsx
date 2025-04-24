import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const ReportsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-enterprise-900">Reports & Analytics</h1>
      <p className="text-enterprise-600">
        Gain insights into your product performance and inventory health. (Analytics coming soon)
      </p>
      
      <Card>
        <CardHeader>
          <CardTitle>Key Metrics Overview</CardTitle>
          <CardDescription>Placeholder for key performance indicators and charts.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64 text-enterprise-400">
          [Chart/KPI Visualization Placeholder]
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Valuation</CardTitle>
          <CardDescription>Placeholder for inventory value trends.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64 text-enterprise-400">
          [Chart Placeholder]
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsPage; 