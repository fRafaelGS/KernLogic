import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CompletenessDrilldown } from './CompletenessDrilldown';

// Mock the onOpenChange function
const mockOnOpenChange = jest.fn();

describe('CompletenessDrilldown', () => {
  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    percentage: 75,
    fieldStatus: [
      { key: 'name', label: 'Name', weight: 2, complete: true },
      { key: 'sku', label: 'SKU', weight: 2, complete: true },
      { key: 'description', label: 'Description', weight: 1.5, complete: false },
      { key: 'category', label: 'Category', weight: 1.5, complete: true },
      { key: 'brand', label: 'Brand', weight: 1, complete: false },
    ]
  };

  it('renders without crashing', () => {
    render(<CompletenessDrilldown {...defaultProps} />);
    expect(screen.getByText('Data Completeness Details')).toBeInTheDocument();
  });

  it('displays the correct completeness percentage', () => {
    render(<CompletenessDrilldown {...defaultProps} />);
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('- Fair')).toBeInTheDocument();
  });

  it('displays fields with their completion status', () => {
    render(<CompletenessDrilldown {...defaultProps} />);
    
    // Complete fields should show "Complete"
    const nameRow = screen.getByText('Name').closest('tr');
    expect(nameRow).toBeInTheDocument();
    expect(nameRow?.textContent).toContain('Complete');
    
    // Incomplete fields should show "Missing"
    const descriptionRow = screen.getByText('Description').closest('tr');
    expect(descriptionRow).toBeInTheDocument();
    expect(descriptionRow?.textContent).toContain('Missing');
  });

  it('separates standard fields from attribute fields when attributes are present', () => {
    const propsWithAttributes = {
      ...defaultProps,
      fieldStatus: [
        ...defaultProps.fieldStatus,
        { key: 'attr_1', label: 'Color', weight: 1.5, complete: true },
        { key: 'attr_2', label: 'Size', weight: 1.5, complete: false },
      ]
    };
    
    render(<CompletenessDrilldown {...propsWithAttributes} />);
    
    // Should show both standard field completeness and attribute completeness sections
    expect(screen.getByText('Field Completeness')).toBeInTheDocument();
    expect(screen.getByText('Attribute Completeness')).toBeInTheDocument();
    
    // Should show the attribute fields in their own table
    const colorRow = screen.getByText('Color').closest('tr');
    expect(colorRow).toBeInTheDocument();
    expect(colorRow?.textContent).toContain('Complete');
    
    const sizeRow = screen.getByText('Size').closest('tr');
    expect(sizeRow).toBeInTheDocument();
    expect(sizeRow?.textContent).toContain('Missing');
  });

  it('displays correct summary counts', () => {
    const propsWithAttributes = {
      ...defaultProps,
      fieldStatus: [
        ...defaultProps.fieldStatus,
        { key: 'attr_1', label: 'Color', weight: 1.5, complete: true },
        { key: 'attr_2', label: 'Size', weight: 1.5, complete: false },
      ]
    };
    
    render(<CompletenessDrilldown {...propsWithAttributes} />);
    
    // Total fields: standard(5) + attributes(2) = 7
    // Complete fields: standard(3) + attributes(1) = 4
    // Missing fields: standard(2) + attributes(1) = 3
    expect(screen.getByText('Complete fields:')).toBeInTheDocument();
    expect(screen.getByText('4 of 7')).toBeInTheDocument();
    expect(screen.getByText('Missing fields:')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    
    // Attribute specific counts
    expect(screen.getByText('Complete attributes:')).toBeInTheDocument();
    expect(screen.getByText('1 of 2')).toBeInTheDocument();
    expect(screen.getByText('Missing attributes:')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('does not show attribute section when no attributes are present', () => {
    render(<CompletenessDrilldown {...defaultProps} />);
    expect(screen.queryByText('Attribute Completeness')).not.toBeInTheDocument();
    expect(screen.queryByText('Complete attributes:')).not.toBeInTheDocument();
  });

  it('closes when close button is clicked', async () => {
    render(<CompletenessDrilldown {...defaultProps} />);
    const closeButton = screen.getByRole('button', { name: /close/i });
    await userEvent.click(closeButton);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
}); 