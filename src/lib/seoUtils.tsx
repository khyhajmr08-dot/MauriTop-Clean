import React from 'react';
import SEO from '../components/SEO';

interface SEOMetaProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  twitterCard?: string;
  structuredData?: object;
}

export function generateDynamicSEOTags({
  title,
  description,
  keywords,
  image,
  url,
  type = "website",
  structuredData
}: SEOMetaProps) {
  return (
    <SEO
      title={title}
      description={description}
      keywords={keywords}
      image={image}
      url={url}
      type={type}
      structuredData={structuredData}
    />
  );
}
