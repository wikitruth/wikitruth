import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import Breadcrumb from '../components/common/Breadcrumb';
import PageMeta from '../components/common/PageMeta';
import LoadingSpinner from '../components/LoadingSpinner';
import apiService, { ApiRequestError } from '../services/api';
import type { LegacyEntity } from '../types/legacy';
import { sanitizeHtml } from '../utils/sanitizeHtml';

const AboutContentPage: React.FC = () => {
  const { id = '' } = useParams();
  const [page, setPage] = useState<LegacyEntity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    void apiService.getAboutPage(id)
      .then((result) => {
        if (mounted) setPage(result.page || null);
      })
      .catch((loadError) => {
        if (!mounted) return;
        setError(loadError instanceof ApiRequestError && loadError.status === 404
          ? 'About page not found.'
          : loadError instanceof Error ? loadError.message : 'Unable to load this About page.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return <LoadingSpinner message="Loading About page..." />;
  }

  if (!page || error) {
    return (
      <div className="alert alert-warning" role="alert">
        {error || 'About page not found.'}
      </div>
    );
  }

  return (
    <div>
      <PageMeta title={String(page.title || 'About')} description={`About ${String(page.title || 'Wikitruth')}`} />
      <Breadcrumb items={[
        { title: 'Home', url: '/' },
        { title: 'About', url: '/about' },
        { title: String(page.title || 'Page'), active: true },
      ]} />
      <h1 className="page-header wt-header">{String(page.title || 'About')}</h1>
      <div
        className="text-body"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(String(page.content || '')) }}
      />
    </div>
  );
};

export default AboutContentPage;
