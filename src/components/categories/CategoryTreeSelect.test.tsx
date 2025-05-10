import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CategoryTreeSelect } from './CategoryTreeSelect';
import * as categoryService from '@/services/categoryService';

jest.mock('@/services/categoryService');

const mockCategories = [
  {
    label: 'Root',
    value: '1',
    children: [
      {
        label: 'Child A',
        value: '2',
        children: [],
      },
      {
        label: 'Child B',
        value: '3',
        children: [
          {
            label: 'Leaf',
            value: '4',
            children: [],
          },
        ],
      },
    ],
  },
];

describe('CategoryTreeSelect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state', async () => {
    (categoryService.getCategoryTree as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(<CategoryTreeSelect selectedValue={null} onChange={jest.fn()} />);
    expect(screen.getByText(/loading categories/i)).toBeInTheDocument();
  });

  it('renders error state', async () => {
    (categoryService.getCategoryTree as jest.Mock).mockRejectedValue(new Error('API error'));
    render(<CategoryTreeSelect selectedValue={null} onChange={jest.fn()} />);
    await waitFor(() => expect(screen.getByText(/failed to load category tree/i)).toBeInTheDocument());
  });

  it('renders tree and allows selection', async () => {
    (categoryService.getCategoryTree as jest.Mock).mockResolvedValue(mockCategories);
    const onChange = jest.fn();
    render(<CategoryTreeSelect selectedValue={null} onChange={onChange} />);
    await waitFor(() => expect(screen.getByText('Root')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('Child A'));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('filters tree by search', async () => {
    (categoryService.getCategoryTree as jest.Mock).mockResolvedValue(mockCategories);
    render(<CategoryTreeSelect selectedValue={null} onChange={jest.fn()} />);
    await waitFor(() => expect(screen.getByText('Root')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.change(screen.getByPlaceholderText(/search categories/i), { target: { value: 'Leaf' } });
    expect(screen.getByText('Leaf')).toBeInTheDocument();
    expect(screen.queryByText('Child A')).not.toBeInTheDocument();
  });

  it('allows creating a new category', async () => {
    (categoryService.getCategoryTree as jest.Mock).mockResolvedValue(mockCategories);
    (categoryService.createCategory as jest.Mock).mockResolvedValue({ id: 99, name: 'NewCat' });
    const onChange = jest.fn();
    render(<CategoryTreeSelect selectedValue={null} onChange={onChange} />);
    await waitFor(() => expect(screen.getByText('Root')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.change(screen.getByPlaceholderText(/search categories/i), { target: { value: 'NewCat' } });
    fireEvent.click(screen.getByText(/create "NewCat"/i));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(99));
  });
}); 