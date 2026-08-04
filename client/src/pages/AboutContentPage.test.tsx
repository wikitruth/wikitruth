import React from 'react';
import { Route, Routes } from 'react-router';
import { render, screen } from '../test-utils/render';
import apiService from '../services/api';
import type { LegacyEntity } from '../types/legacy';
import AboutContentPage from './AboutContentPage';

jest.mock('../services/api', () => ({
  __esModule: true,
  ...jest.requireActual('../services/api'),
  default: {
    getAboutPage: jest.fn(),
  },
}));

const mockedApi = apiService as jest.Mocked<typeof apiService>;

describe('AboutContentPage', () => {
  it('renders sanitized legacy About hierarchy content', async () => {
    mockedApi.getAboutPage.mockResolvedValue({
      success: true,
      page: {
        _id: 'page-1',
        title: 'What is Wikitruth?',
        content: '<p>About the project</p><script>alert(1)</script>',
        friendlyUrl: 'what-is-wikitruth',
      } as LegacyEntity,
    });

    const { container } = render(
      <Routes>
        <Route path="/about/:id" element={<AboutContentPage />} />
      </Routes>,
      { route: '/about/what-is-wikitruth' }
    );

    expect(await screen.findByRole('heading', { name: 'What is Wikitruth?' })).toBeInTheDocument();
    expect(screen.getByText('About the project')).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
    expect(mockedApi.getAboutPage).toHaveBeenCalledWith('what-is-wikitruth');
  });
});
