import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ButtonShowcase } from '@/components/ui/ButtonShowcase';

export default function ButtonDemo() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-enterprise-900">PIM Button Component Library</h1>
          <p className="text-enterprise-500 mt-1">
            Standardized button components for consistent UX across the KernLogic PIM platform
          </p>
        </div>

        <div className="grid gap-6">
          <div className="prose max-w-none">
            <p>
              Our button system follows a consistent design language with clear visual feedback 
              and accessible states. Each button variant is designed for specific use cases
              within the product information management workflow.
            </p>
            
            <h3>Usage Guidelines</h3>
            <ul>
              <li><strong>Primary buttons</strong> should be used for main actions and confirmations</li>
              <li><strong>Secondary buttons</strong> for supporting actions that aren't the main focus</li>
              <li><strong>Success buttons</strong> for positive confirmations and completions</li>
              <li><strong>Destructive buttons</strong> for actions that delete or remove data</li>
              <li><strong>Outline buttons</strong> for secondary actions that need visual separation</li>
              <li><strong>Ghost buttons</strong> for tertiary actions with minimal visual emphasis</li>
              <li><strong>Link buttons</strong> for navigation within text or tight spaces</li>
            </ul>
          </div>

          <ButtonShowcase />
        </div>
      </div>
    </DashboardLayout>
  );
} 