import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CollapsibleSection } from './CollapsibleSection';

describe('CollapsibleSection', () => {
  it('renders with required props', () => {
    render(
      <CollapsibleSection title="Test Section">
        <p>Test content</p>
      </CollapsibleSection>
    );
    
    expect(screen.getByText('Test Section')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });
  
  it('renders with description', () => {
    render(
      <CollapsibleSection 
        title="Test Section" 
        description="This is a description"
      >
        <p>Test content</p>
      </CollapsibleSection>
    );
    
    expect(screen.getByText('This is a description')).toBeInTheDocument();
  });
  
  it('renders with actions', () => {
    render(
      <CollapsibleSection 
        title="Test Section" 
        actions={<button>Action Button</button>}
      >
        <p>Test content</p>
      </CollapsibleSection>
    );
    
    expect(screen.getByText('Action Button')).toBeInTheDocument();
  });
  
  it('starts expanded when defaultOpen=true', () => {
    render(
      <CollapsibleSection 
        title="Test Section" 
        defaultOpen={true}
      >
        <p>Test content</p>
      </CollapsibleSection>
    );
    
    expect(screen.getByText('Test content')).toBeVisible();
  });
  
  it('starts collapsed when defaultOpen=false', () => {
    render(
      <CollapsibleSection 
        title="Test Section" 
        defaultOpen={false}
      >
        <p>Test content</p>
      </CollapsibleSection>
    );
    
    // Content is in the DOM but not visible
    const content = screen.getByText('Test content');
    expect(content).toBeInTheDocument();
    expect(content).not.toBeVisible();
  });
  
  it('toggles between expanded and collapsed states', () => {
    render(
      <CollapsibleSection title="Test Section">
        <p>Test content</p>
      </CollapsibleSection>
    );
    
    // Initially expanded
    expect(screen.getByText('Test content')).toBeVisible();
    
    // Find and click the trigger button
    const button = screen.getByRole('button', { name: /collapse test section/i });
    fireEvent.click(button);
    
    // Now collapsed
    expect(screen.getByText('Test content')).not.toBeVisible();
    
    // Button text should change
    expect(screen.getByRole('button', { name: /expand test section/i })).toBeInTheDocument();
    
    // Click again
    fireEvent.click(button);
    
    // Now expanded again
    expect(screen.getByText('Test content')).toBeVisible();
  });
}); 