import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useApplicationContext } from '../../context/ApplicationContext';

interface PageMetaProps {
  title: string;
  description?: string;
  ogImage?: string;
  ogType?: string;
  canonicalUrl?: string;
}

const PageMeta: React.FC<PageMetaProps> = ({
  title,
  description,
  ogImage,
  ogType = 'website',
  canonicalUrl,
}) => {
  const { application } = useApplicationContext();
  const appName = application?.navTitle || application?.title || application?.name || 'Wikitruth';
  const appImage = application?.logoIcon;
  const resolvedImage = ogImage || appImage;
  const fullTitle = title ? `${title} – ${appName}` : appName;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:site_name" content={appName} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:type" content={ogType} />
      {resolvedImage && <meta property="og:image" content={resolvedImage} />}
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      {resolvedImage && <meta name="twitter:image" content={resolvedImage} />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
    </Helmet>
  );
};

export default PageMeta;
