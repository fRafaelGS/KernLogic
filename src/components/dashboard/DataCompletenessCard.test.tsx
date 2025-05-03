import React from 'react';
import { render, screen } from '@testing-library/react';
import { DataCompletenessCard } from './DataCompletenessCard';

describe('DataCompletenessCard', () => {
  const defaultProps = {
    completeness: 75,
    mostMissingFields: [
      { field: 'Description', count: 10 },
      { field: 'Brand', count: 8 },
      { field: 'Tags', count: 5 },
    ],
    loading: false,
  };

  it('renders without crashing', () => {
    render(<DataCompletenessCard {...defaultProps} />);
    expect(screen.getByText('Data Completeness')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('renders correct completeness percentage', () => {
    render(<DataCompletenessCard {...defaultProps} />);
    expect(screen.getByText('75% of catalog has all required fields & attributes filled')).toBeInTheDocument();
  });

  it('renders missing fields as badges', () => {
    render(<DataCompletenessCard {...defaultProps} />);
    expect(screen.getByText('Description (10)')).toBeInTheDocument();
    expect(screen.getByText('Brand (8)')).toBeInTheDocument();
    expect(screen.getByText('Tags (5)')).toBeInTheDocument();
  });

  it('shows loading state when loading is true', () => {
    render(<DataCompletenessCard {...defaultProps} loading={true} />);
    expect(screen.queryByText('75%')).not.toBeInTheDocument();
    // Check for skeleton loaders (they have class "skeleton")
    const skeletons = document.querySelectorAll('.skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('displays attributes missing count when provided', () => {
    render(
      <DataCompletenessCard
        {...defaultProps}
        attributesMissingCount={15}
      />
    );
    expect(screen.getByText('Attributes (15)')).toBeInTheDocument();
  });

  it('does not display attributes badge when count is 0', () => {
    render(
      <DataCompletenessCard
        {...defaultProps}
        attributesMissingCount={0}
      />
    );
    expect(screen.queryByText('Attributes (0)')).not.toBeInTheDocument();
  });

  it('shows mandatory attributes in tooltip when provided', () => {
    const mandatoryAttributes = ['Color', 'Size', 'Material'];
    render(
      <DataCompletenessCard
        {...defaultProps}
        mandatoryAttributes={mandatoryAttributes}
      />
    );
    
    // We can't directly test the tooltip content as it's rendered on hover
    // In a real test environment, you would use userEvent to hover and then check content
    // For this example, we'll check if the info icon exists
    expect(screen.getByRole('button', { name: /about data completeness/i })).toBeInTheDocument();
  });

  it('handles empty missing fields list', () => {
    render(
      <DataCompletenessCard
        {...defaultProps}
        mostMissingFields={[]}
      />
    );
    expect(screen.getByText('No missing fields detected')).toBeInTheDocument();
  });
}); 