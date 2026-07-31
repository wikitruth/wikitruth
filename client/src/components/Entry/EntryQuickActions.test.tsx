import React from 'react';
import { fireEvent, render, screen, waitFor } from '../../test-utils/render';
import EntryQuickActions from './EntryQuickActions';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import apiService from '../../services/api';
import type { LegacyEntity } from '../../types/legacy';
import { useAuthPrompt } from '../../context/AuthPromptContext';

jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../context/NotificationContext', () => ({
  useNotification: jest.fn(),
}));

jest.mock('../../context/AuthPromptContext', () => ({
  useAuthPrompt: jest.fn(),
}));

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    getEntryReactions: jest.fn(),
    setEntryReaction: jest.fn(),
    createOpinion: jest.fn(),
  },
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseNotification = useNotification as jest.MockedFunction<typeof useNotification>;
const mockUseAuthPrompt = useAuthPrompt as jest.MockedFunction<typeof useAuthPrompt>;
const mockedApiService = apiService as jest.Mocked<typeof apiService>;
const requestSignIn = jest.fn();

function makeEntry(overrides: Partial<LegacyEntity> = {}): LegacyEntity {
  return {
    _id: 'entry-1',
    id: 'entry-1',
    friendlyUrl: 'entry-1',
    title: 'Entry One',
    subtitle: '',
    description: '',
    content: '',
    contentPreview: '',
    source: '',
    ownerId: '',
    ownerType: '',
    questionId: '',
    topicId: '',
    references: '',
    parentId: null,
    private: false,
    issueType: 0,
    editDate: new Date().toISOString(),
    createDate: new Date().toISOString(),
    editorUsername: '',
    username: '',
    email: '',
    createUserId: '',
    roleType: 0,
    file: {
      type: '',
      name: '',
    },
    ...overrides,
  };
}

describe('EntryQuickActions reactions', () => {
  const addToast = jest.fn();

  beforeEach(() => {
    addToast.mockReset();
    requestSignIn.mockReset();
    mockedApiService.getEntryReactions.mockReset();
    mockedApiService.setEntryReaction.mockReset();
    mockedApiService.createOpinion.mockReset();

    mockUseNotification.mockReturnValue({
      addToast,
      removeToast: jest.fn(),
      toasts: [],
    });
    mockUseAuthPrompt.mockReturnValue({ requestSignIn });

    mockUseAuth.mockReturnValue({
      user: {
        _id: 'user-1',
        username: 'demo',
        roles: {},
      },
      isAuthenticated: true,
      isLoading: false,
      activeRole: 'contributor',
      setActiveRole: jest.fn(),
      availableRoles: ['contributor'],
      login: jest.fn(),
      signup: jest.fn(),
      logout: jest.fn(),
      updateUser: jest.fn(),
    });

    mockedApiService.getEntryReactions.mockResolvedValue({
      success: true,
      counts: {
        exposure: { expose: 2, bury: 1 },
        vote: { upvote: 0, downvote: 0 },
        value: { good: 3, bad: 0 },
      },
      myReactions: {
        exposure: 'expose',
        vote: null,
        value: 'good',
      },
    });
    mockedApiService.setEntryReaction.mockResolvedValue({
      success: true,
      action: 'cleared',
      counts: {
        exposure: { expose: 1, bury: 1 },
        vote: { upvote: 0, downvote: 0 },
        value: { good: 3, bad: 0 },
      },
      myReactions: {
        exposure: null,
        vote: null,
        value: 'good',
      },
    });
    mockedApiService.createOpinion.mockResolvedValue({ success: true, opinion: makeEntry({ _id: 'opinion-1' }) });
  });

  it('loads and submits reactions through the API service', async () => {
    render(<EntryQuickActions entry={makeEntry()} objectName="topic" hasValue={true} />);

    await waitFor(() => {
      expect(mockedApiService.getEntryReactions).toHaveBeenCalledWith({
        id: 'entry-1',
        objectName: 'topic',
      });
    });

    fireEvent.click(screen.getByRole('link', { name: /Expose/i }));

    await waitFor(() => {
      expect(mockedApiService.setEntryReaction).toHaveBeenCalledWith({
        id: 'entry-1',
        objectName: 'topic',
        channel: 'exposure',
        value: 'expose',
      });
    });

    expect(addToast).toHaveBeenCalledWith('success', expect.stringMatching(/removed/i));
  });

  it('requires authentication before allowing reactions', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      activeRole: 'reader',
      setActiveRole: jest.fn(),
      availableRoles: ['reader'],
      login: jest.fn(),
      signup: jest.fn(),
      logout: jest.fn(),
      updateUser: jest.fn(),
    });

    render(<EntryQuickActions entry={makeEntry()} objectName="topic" />);
    await waitFor(() => expect(mockedApiService.getEntryReactions).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('link', { name: /Bury/i }));

    expect(mockedApiService.setEntryReaction).not.toHaveBeenCalled();
    expect(requestSignIn).toHaveBeenCalledWith({ intent: 'react' });
    expect(addToast).not.toHaveBeenCalledWith('warning', expect.stringMatching(/sign in/i));
  });

  it('sends signed-out quick contributions to the full form after contextual sign in', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      activeRole: 'reader',
      setActiveRole: jest.fn(),
      availableRoles: ['reader'],
      login: jest.fn(),
      signup: jest.fn(),
      logout: jest.fn(),
      updateUser: jest.fn(),
    });

    render(<EntryQuickActions entry={makeEntry()} objectName="topic" />);
    await waitFor(() => expect(mockedApiService.getEntryReactions).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('link', { name: /^Reply$/i }));
    fireEvent.click(screen.getByRole('button', { name: /Quick Contribution/i }));

    expect(requestSignIn).toHaveBeenCalledWith({
      intent: 'contribute',
      returnUrl: '/opinions/create?parentId=entry-1&parentType=topic',
    });
    expect(screen.queryByLabelText('Purpose')).not.toBeInTheDocument();
  });

  it('shows good and bad controls only for value entries', async () => {
    const { rerender } = render(<EntryQuickActions entry={makeEntry()} objectName="topic" hasValue={false} />);
    await waitFor(() => expect(mockedApiService.getEntryReactions).toHaveBeenCalled());

    expect(screen.queryByRole('link', { name: /Good/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Bad/i })).not.toBeInTheDocument();

    rerender(<EntryQuickActions entry={makeEntry()} objectName="topic" hasValue={true} />);
    expect(await screen.findByRole('link', { name: /Good/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Bad/i })).toBeInTheDocument();
  });

  it('submits an inline classified comment through the screened opinion API', async () => {
    render(<EntryQuickActions entry={makeEntry()} objectName="topic" />);
    await waitFor(() => expect(mockedApiService.getEntryReactions).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('link', { name: /^Reply$/i }));
    fireEvent.click(screen.getByRole('button', { name: /Quick Contribution/i }));
    fireEvent.change(screen.getByLabelText('Purpose'), { target: { value: 'objection' } });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Counterpoint' } });
    fireEvent.change(screen.getByLabelText('Details'), { target: { value: 'The evidence supports a different interpretation.' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit for screening/i }));

    await waitFor(() => expect(mockedApiService.createOpinion).toHaveBeenCalledWith(expect.objectContaining({
      parentId: 'entry-1', parentType: 'topic', classification: 'objection',
    })));
    expect(addToast).toHaveBeenCalledWith('success', expect.stringMatching(/submitted for screening/i));
  });
});
