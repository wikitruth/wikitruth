import React from 'react';
import { render, screen } from '../../test-utils/render';
import ContentViewFilter from './ContentViewFilter';
import { fireEvent } from '@testing-library/react';

describe('ContentViewFilter', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders explicit review-state filter options', () => {
    render(<ContentViewFilter value="all" onChange={mockOnChange} />);
    expect(screen.getByText('All states')).toBeInTheDocument();
    expect(screen.getByText('Accepted')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('shows the account default when no page override is active', () => {
    render(<ContentViewFilter value="default" defaultLabel="Accepted + pending" onChange={mockOnChange} />);
    expect(screen.getByText(/Using your default:/)).toBeInTheDocument();
    expect(screen.getByText('Accepted + pending')).toBeInTheDocument();
  });

  it('clears a page override without changing the account default', () => {
    render(<ContentViewFilter value="archived" defaultLabel="Accepted only" onChange={mockOnChange} />);
    fireEvent.click(screen.getByText(/Use my default/));
    expect(mockOnChange).toHaveBeenCalledWith('default');
  });

  it('marks the active option with aria-pressed', () => {
    render(<ContentViewFilter value="wiki" onChange={mockOnChange} />);
    expect(screen.getByText('Accepted').closest('button')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('All states').closest('button')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Pending').closest('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange with the selected mode', () => {
    render(<ContentViewFilter value="all" onChange={mockOnChange} />);
    fireEvent.click(screen.getByText('Accepted'));
    expect(mockOnChange).toHaveBeenCalledWith('wiki');
  });

  it('calls onChange with "original" when Original is clicked', () => {
    render(<ContentViewFilter value="all" onChange={mockOnChange} />);
    fireEvent.click(screen.getByText('Pending'));
    expect(mockOnChange).toHaveBeenCalledWith('original');
  });

  it('calls onChange with "archived" when Archived is clicked', () => {
    render(<ContentViewFilter value="wiki" onChange={mockOnChange} />);
    fireEvent.click(screen.getByText('Archived'));
    expect(mockOnChange).toHaveBeenCalledWith('archived');
  });

  it('calls onChange with "all" when All states is clicked', () => {
    render(<ContentViewFilter value="wiki" onChange={mockOnChange} />);
    fireEvent.click(screen.getByText('All states'));
    expect(mockOnChange).toHaveBeenCalledWith('all');
  });
});
