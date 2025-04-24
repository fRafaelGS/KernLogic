import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const DocumentationPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-enterprise-900">Documentation & Help</h1>
      <p className="text-enterprise-600">
        Find guides, tutorials, and API references to help you use KernLogic effectively.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Learn the basics of setting up and using the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-2 pl-5 text-sm text-enterprise-600">
              <li>Setting up your account</li>
              <li>Navigating the dashboard</li>
              <li>Understanding core features</li>
              <li>Importing your first products</li>
            </ul>
            <Button variant="link" className="mt-4 p-0 h-auto">Read Guide</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product Management</CardTitle>
            <CardDescription>Detailed guides on managing your product catalog.</CardDescription>
          </CardHeader>
          <CardContent>
             <ul className="list-disc space-y-2 pl-5 text-sm text-enterprise-600">
              <li>Creating and editing products</li>
              <li>Bulk CSV upload process</li>
              <li>Understanding product fields</li>
              <li>Searching and filtering</li>
            </ul>
            <Button variant="link" className="mt-4 p-0 h-auto">View Details</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Reference</CardTitle>
            <CardDescription>Integrate KernLogic with your other systems.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-enterprise-600 mb-4">Access detailed information about our API endpoints, authentication methods, and request/response formats.</p>
            <Button variant="link" className="mt-4 p-0 h-auto">Explore API Docs</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
            <CardDescription>Find answers to common questions.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-enterprise-600 mb-4">Browse through common questions about billing, features, troubleshooting, and more.</p>
            <Button variant="link" className="mt-4 p-0 h-auto">Read FAQs</Button>
          </CardContent>
        </Card>
      </div>

       <Card className="bg-primary-50 border-primary-100">
        <CardHeader>
          <CardTitle>Contact Support</CardTitle>
          <CardDescription>Can't find what you're looking for?</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-enterprise-600 mb-4">
            Our support team is here to help. Reach out via email or our support portal.
          </p>
          <Button variant="secondary">Contact Us</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentationPage; 