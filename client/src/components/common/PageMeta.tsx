import React from 'react';
import { Helmet } from 'react-helmet-async';
import { APP_NAME } from '../../utils/constants';

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
  const fullTitle = title ? `${title} – ${APP_NAME}` : APP_NAME;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:type" content={ogType} />
      {ogImage && <meta property="og:image" content={ogImage} />}
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      {ogImage && <meta name="twitter:image" content={ogImage} />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
    </Helmet>
  );
};

export default PageMeta;
