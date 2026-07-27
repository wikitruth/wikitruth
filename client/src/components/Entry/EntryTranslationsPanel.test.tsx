import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '../../test-utils/render';
import { useAuth } from '../../context/AuthContext';
import translationsApi from '../../services/api/translations';
import EntryTranslationsPanel from './EntryTranslationsPanel';

jest.mock('../../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../../services/api/translations', () => ({ __esModule: true, default: { list: jest.fn(), submit: jest.fn(), review: jest.fn() } }));

const mockedAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockedApi = translationsApi as jest.Mocked<typeof translationsApi>;

describe('EntryTranslationsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAuth.mockReturnValue({ user: null } as ReturnType<typeof useAuth>);
    mockedApi.list.mockResolvedValue({ success: true, currentRevision: { id: 'r2', number: 2 }, translations: [{
      _id: 't1', objectName: 'topic', objectId: 'entry-1', locale: 'fil', title: 'Pamagat', content: '<p>Salin ng nilalaman.</p>',
      sourceRevisionId: 'r2', sourceRevisionNumber: 2, status: 'published', createUsername: 'translator',
    }] });
  });

  it('lets readers switch to a reviewed revision-linked language variant', async () => {
    const user = userEvent.setup();
    render(<EntryTranslationsPanel objectName="topic" objectId="entry-1" originalTitle="Title" originalContent="Content" />);
    await screen.findByRole('option', { name: 'fil' });
    await user.selectOptions(screen.getByLabelText('Read this entry in'), 't1');
    expect(screen.getByRole('heading', { name: 'Pamagat' })).toBeInTheDocument();
    expect(screen.getByText(/revision 2 by translator/i)).toBeInTheDocument();
  });

  it('submits contributor translations for review', async () => {
    mockedAuth.mockReturnValue({ user: { _id: 'u1', username: 'translator', roles: {} } } as ReturnType<typeof useAuth>);
    mockedApi.submit.mockResolvedValue({ success: true, translation: {} as never });
    const user = userEvent.setup();
    render(<EntryTranslationsPanel objectName="topic" objectId="entry-1" originalTitle="Title" originalContent="Original content" />);
    await user.click(await screen.findByRole('button', { name: /Contribute translation/i }));
    await user.type(screen.getByLabelText('Locale'), 'es');
    await user.clear(screen.getByLabelText('Translated title')); await user.type(screen.getByLabelText('Translated title'), 'Titulo');
    await user.clear(screen.getByLabelText('Translated content')); await user.type(screen.getByLabelText('Translated content'), 'Contenido suficientemente largo.');
    await user.click(screen.getByRole('button', { name: /Submit for review/i }));
    await waitFor(() => expect(mockedApi.submit).toHaveBeenCalledWith('topic', 'entry-1', expect.objectContaining({ locale: 'es' })));
  });
});
