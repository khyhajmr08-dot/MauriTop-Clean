import React from 'react';
import { Helmet } from 'react-helmet-async';
import { getHomepageCombinedSchema, SITE_URL, SITE_NAME, SITE_IMAGE } from '../lib/structuredData';

export interface SEOProps {
  title?: string;
  description?: string;
  ogDescription?: string;
  twitterDescription?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  lang?: string;
  structuredData?: object;
  noindex?: boolean;
}

export const DEFAULT_TITLE = "موري توب | شحن الألعاب والخدمات الرقمية في موريتانيا - MAURITOP";
export const DEFAULT_DESCRIPTION = "منصة موري توب (MAURITOP) لشحن الألعاب والبطاقات والاشتراكات الرقمية المتاحة في موريتانيا بعملة الأوقية (MRU) مع خيارات الدفع الوطنية وتتبع فوري للطلبات.";
export const DEFAULT_KEYWORDS = "شحن ألعاب موريتانيا, موري توب, MAURITOP, شحن فري فاير بنكيلي, شدات ببجي موريتانيا, بطاقات رقمية, اشتراكات رقمية, بنكيلي, سداد, غزة باي, MRU, نواكشوط";
export const DEFAULT_OG_DESCRIPTION = "شحن الألعاب والبطاقات والاشتراكات الرقمية المتاحة في موريتانيا بعملة MRU عبر خيارات الدفع الوطنية.";
export const DEFAULT_TWITTER_DESCRIPTION = "شحن الألعاب والخدمات الرقمية المتاحة في موريتانيا بعملة MRU.";

const SEO: React.FC<SEOProps> = ({ 
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  ogDescription,
  twitterDescription,
  keywords = DEFAULT_KEYWORDS,
  image = "/og-image.jpg",
  url,
  type = "website",
  lang = "ar",
  structuredData,
  noindex = false
}) => {
  // Normalize canonical URL to always be clean HTTPS on mauritop.com
  const currentUrl = React.useMemo(() => {
    if (url) {
      return url.startsWith('http') ? url : `${SITE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
    }
    if (typeof window !== 'undefined') {
      const cleanPath = window.location.pathname === '/' ? '' : window.location.pathname.replace(/\/+$/, '');
      return `${SITE_URL}${cleanPath || '/'}`;
    }
    return `${SITE_URL}/`;
  }, [url]);

  const fullTitle = title === DEFAULT_TITLE ? title : (title.includes('موري توب') || title.includes('MauriTop') || title.includes('MAURITOP') ? title : `${title} | MAURITOP`);
  const fullImageUrl = image.startsWith('http') ? image : `${SITE_URL}${image.startsWith('/') ? '' : '/'}${image}`;
  const effectiveOgDescription = ogDescription || (description === DEFAULT_DESCRIPTION ? DEFAULT_OG_DESCRIPTION : description);
  const effectiveTwitterDescription = twitterDescription || (description === DEFAULT_DESCRIPTION ? DEFAULT_TWITTER_DESCRIPTION : description);

  // Use passed custom structuredData or combined homepage graph
  const jsonLd = structuredData || getHomepageCombinedSchema();

  return (
    <Helmet>
      <html lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'} />
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="robots" content={noindex ? "noindex, nofollow" : "index,follow,max-image-preview:large"} />
      <meta name="googlebot" content={noindex ? "noindex, nofollow" : "index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1"} />
      
      {/* Content Language & Hreflang (Minimal SPA implementation) */}
      <meta httpEquiv="Content-Language" content={lang === 'fr' ? 'fr' : 'ar'} />
      {!noindex && <link rel="alternate" href={currentUrl} hrefLang={lang === 'fr' ? 'fr' : 'ar'} />}
      {!noindex && <link rel="alternate" href={currentUrl} hrefLang="x-default" />}
      
      <link rel="canonical" href={currentUrl} />
      <link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml" />
      
      {/* Local & Geographic SEO for Mauritania */}
      <meta name="geo.region" content="MR" />
      <meta name="geo.placename" content="Nouakchott" />
      <meta name="geo.position" content="18.073538;-15.958237" />
      <meta name="ICBM" content="18.073538, -15.958237" />

      {/* Open Graph / Facebook / WhatsApp */}
      <meta property="og:locale" content={lang === 'fr' ? 'fr_MR' : 'ar_MR'} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={effectiveOgDescription} />
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@mauritop" />
      <meta name="twitter:url" content={currentUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={effectiveTwitterDescription} />
      <meta name="twitter:image" content={fullImageUrl} />

      {/* Structured Data JSON-LD (Search Crawlers Schema) */}
      <script type="application/ld+json">
        {JSON.stringify(jsonLd)}
      </script>
    </Helmet>
  );
};

export default SEO;
