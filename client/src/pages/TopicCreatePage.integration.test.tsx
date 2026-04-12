import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../test-utils/render';
import TopicCreatePage from './TopicCreatePage';
import apiService from '../services/api';
import { useNotification } from '../context/NotificationContext';

jest.mock('../components/common/PageMeta', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../components/Form/RichTextEditor', () => ({
  __esModule: true,
  default: ({ name, value, onChange, label }: { name: string; value: string; onChange: (name: string, html: string) => void; label: string }) => (
    <div className="form-group">
      <label htmlFor={`mock-rte-${name}`}>{label}</label>
      <textarea
        id={`mock-rte-${name}`}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
      />
    </div>
  ),
}));

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    createTopic: jest.fn(),
  },
}));

jest.mock('../context/NotificationContext', () => ({
  useNotification: jest.fn(),
}));

jest.mock('../utils/analytics', () => ({
  trackEvent: jest.fn(),
}));

const mockedApi = apiService as jest.Mocked<typeof apiService>;
const mockedUseNotification = useNotification as jest.MockedFunction<typeof useNotification>;

describe('TopicCreatePage integration flow', () => {
  beforeEach(() => {
    mockedApi.createTopic.mockResolvedValue({ success: true } as never);
    mockedUseNotification.mockReturnValue({
      addToast: jest.fn(),
      removeToast: jest.fn(),
      toasts: [],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('submits topic creation with rich text description', async () => {
    const user = userEvent.setup();
    render(<TopicCreatePage />, { route: '/topics/create' });

    await user.type(screen.getByLabelText(/title/i), 'Climate Policy');
    await user.type(screen.getByLabelText(/description/i), 'Detailed topic description for test.');
    await user.selectOptions(screen.getByLabelText(/category/i), 'science-technology');
    await user.click(screen.getByRole('button', { name: /create topic/i }));

    await waitFor(() =>
      expect(mockedApi.createTopic).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Climate Policy',
          description: 'Detailed topic description for test.',
          category: 'science-technology',
        }),
      ),
    );
  });
});
