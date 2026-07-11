import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../test-utils/render';
import ArgumentCreatePage from './ArgumentCreatePage';
import apiService from '../services/api';
import { useNotification } from '../context/NotificationContext';

jest.mock('../components/common/PageMeta', () => ({ __esModule: true, default: () => null }));
jest.mock('../components/Form/RichTextEditor', () => ({
  __esModule: true,
  default: ({ name, value, onChange, label }: { name: string; value: string; onChange: (name: string, html: string) => void; label: string }) => (
    <label>
      {label}
      <textarea value={value} onChange={(event) => onChange(name, event.target.value)} />
    </label>
  ),
}));
jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    createArgument: jest.fn(),
    updateArgument: jest.fn(),
    getArgumentEntry: jest.fn(),
  },
}));
jest.mock('../context/NotificationContext', () => ({ useNotification: jest.fn() }));
jest.mock('../utils/analytics', () => ({ trackEvent: jest.fn() }));

const mockedApi = apiService as jest.Mocked<typeof apiService>;
const mockedUseNotification = useNotification as jest.MockedFunction<typeof useNotification>;

describe('ArgumentCreatePage parity fields', () => {
  beforeEach(() => {
    mockedApi.createArgument.mockResolvedValue({ success: true } as never);
    mockedUseNotification.mockReturnValue({ addToast: jest.fn(), removeToast: jest.fn(), toasts: [] });
  });

  afterEach(() => jest.clearAllMocks());

  it('submits legacy type, parent relationship, reference date, tags, and ethical value', async () => {
    const user = userEvent.setup();
    render(<ArgumentCreatePage />, {
      route: '/arguments/create?topicId=507f1f77bcf86cd799439011&parentId=507f191e810c19729de860ea',
    });

    await user.type(screen.getByLabelText(/claim statement/i), 'A supported factual claim');
    await user.type(screen.getByLabelText(/supporting evidence/i), 'Detailed supporting evidence for this factual claim.');
    await user.selectOptions(screen.getByLabelText(/fact type/i), '4');
    await user.selectOptions(screen.getByLabelText(/relationship to parent/i), 'oppose');
    await user.type(screen.getByLabelText(/reference date/i), '2026-07-11T12:30');
    await user.click(screen.getByRole('checkbox', { name: /key fact/i }));
    await user.click(screen.getByRole('checkbox', { name: /contains moral/i }));
    await user.click(screen.getByRole('button', { name: /create argument/i }));

    await waitFor(() => expect(mockedApi.createArgument).toHaveBeenCalledWith(expect.objectContaining({
      topicId: '507f1f77bcf86cd799439011',
      parentId: '507f191e810c19729de860ea',
      supportsParent: false,
      referenceDate: '2026-07-11T12:30',
      typeId: 4,
      tags: '20',
      hasEthicalValue: true,
    })));
  });
});
