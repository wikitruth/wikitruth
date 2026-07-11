import React from 'react';
import { fireEvent, render, screen, waitFor } from '../../test-utils/render';
import apiService from '../../services/api';
import InstallPage from './InstallPage';

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    getInstallStatus: jest.fn(),
    restoreEmptyDatabase: jest.fn(),
  },
}));

const mockedApi = apiService as jest.Mocked<typeof apiService>;

describe('InstallPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedApi.getInstallStatus.mockResolvedValue({
      success: true,
      install: {
        databaseEmpty: true,
        initialized: false,
        hasAdmin: false,
        tokenConfigured: true,
        tokenRequired: true,
        backupReady: true,
        requiredCollections: ['admins', 'users', 'topics'],
        missingCollections: [],
        eligible: true,
        adminRestorePath: null,
      },
    });
  });

  it('shows the guarded restore form only when bootstrap is eligible', async () => {
    render(<InstallPage />);

    expect(await screen.findByText(/one-time empty-database restore/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /restore empty database/i })).toBeDisabled();
  });

  it('submits the token and explicit confirmation', async () => {
    mockedApi.restoreEmptyDatabase.mockResolvedValue({
      success: true,
      message: 'Bootstrap restore completed.',
    });
    render(<InstallPage />);

    fireEvent.change(await screen.findByLabelText(/bootstrap token/i), {
      target: { value: 'test-bootstrap-token-123' },
    });
    fireEvent.change(screen.getByLabelText(/type restore to confirm/i), {
      target: { value: 'RESTORE' },
    });
    fireEvent.click(screen.getByRole('button', { name: /restore empty database/i }));

    await waitFor(() => {
      expect(mockedApi.restoreEmptyDatabase).toHaveBeenCalledWith({
        bootstrapToken: 'test-bootstrap-token-123',
        confirmText: 'RESTORE',
      });
    });
    expect(await screen.findByText(/bootstrap restore completed/i)).toBeInTheDocument();
  });
});
