import React from 'react';
import AdminDashboard from './AdminDashboard';
import UsersList from './Users/UsersList';
import { render, screen } from '../../test-utils/render';

describe('Admin pages', () => {
  it('renders admin dashboard', () => {
    render(<AdminDashboard />);
    expect(screen.getByRole('heading', { name: /admin dashboard/i })).toBeInTheDocument();
  });

  it('renders users list page', () => {
    render(<UsersList />);
    expect(screen.getByRole('heading', { name: /users/i })).toBeInTheDocument();
  });
});
