import React from 'react';
import { render, screen } from '../../test-utils/render';
import ContentViewFilter from './ContentViewFilter';
import { fireEvent } from '@testing-library/react';

describe('ContentViewFilter', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders all three filter options', () => {
    render(<ContentViewFilter value="all" onChange={mockOnChange} />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Wiki')).toBeInTheDocument();
    expect(screen.getByText('Original')).toBeInTheDocument();
  });

  it('marks the active option with aria-pressed', () => {
    render(<ContentViewFilter value="wiki" onChange={mockOnChange} />);
    expect(screen.getByText('Wiki').closest('button')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('All').closest('button')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Original').closest('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange with the selected mode', () => {
    render(<ContentViewFilter value="all" onChange={mockOnChange} />);
    fireEvent.click(screen.getByText('Wiki'));
    expect(mockOnChange).toHaveBeenCalledWith('wiki');
  });

  it('calls onChange with "original" when Original is clicked', () => {
    render(<ContentViewFilter value="all" onChange={mockOnChange} />);
    fireEvent.click(screen.getByText('Original'));
    expect(mockOnChange).toHaveBeenCalledWith('original');
  });

  it('calls onChange with "all" when All is clicked', () => {
    render(<ContentViewFilter value="wiki" onChange={mockOnChange} />);
    fireEvent.click(screen.getByText('All'));
    expect(mockOnChange).toHaveBeenCalledWith('all');
  });
});
