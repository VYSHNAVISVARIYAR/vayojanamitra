import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEOHead = ({ 
  title, 
  description, 
  keywords, 
  ogImage, 
  ogUrl, 
  canonicalUrl,
  noIndex = false,
  schema 
}) => {
  const siteTitle = 'VayoJanaMitra - Welfare Schemes for Senior Citizens';
  const siteDescription = 'Discover government welfare schemes, pensions, and benefits for senior citizens in Kerala. Get personalized recommendations and expert guidance.';
  const siteUrl = 'https://vayojanamitra.kerala.gov.in';
  
  const finalTitle = title ? `${title} | ${siteTitle}` : siteTitle;
  const finalDescription = description || siteDescription;
  const finalUrl = ogUrl || canonicalUrl || siteUrl;
  const finalImage = ogImage || `${siteUrl}/og-image.jpg`;
  
  const defaultKeywords = [
    'welfare schemes',
    'senior citizens',
    'pension schemes',
    'kerala government',
    'elderly benefits',
    'social security',
    'financial assistance',
    'healthcare schemes',
    'government benefits'
  ];
  
  const finalKeywords = keywords 
    ? `${keywords}, ${defaultKeywords.join(', ')}`
    : defaultKeywords.join(', ');

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{finalTitle}</title>
      <meta name="description" content={finalDescription} />
      <meta name="keywords" content={finalKeywords} />
      <meta name="author" content="Government of Kerala" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="robots" content={noIndex ? 'noindex,nofollow' : 'index,follow'} />
      
      {/* Canonical URL */}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="VayoJanaMitra" />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:image" content={finalImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="VayoJanaMitra - Senior Citizen Welfare Schemes" />
      <meta property="og:url" content={finalUrl} />
      <meta property="og:locale" content="en_IN" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@KeralaGovt" />
      <meta name="twitter:creator" content="@KeralaGovt" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={finalImage} />
      <meta name="twitter:image:alt" content="VayoJanaMitra - Senior Citizen Welfare Schemes" />
      
      {/* Additional Meta Tags */}
      <meta name="theme-color" content="#2563eb" />
      <meta name="msapplication-TileColor" content="#2563eb" />
      <meta name="application-name" content="VayoJanaMitra" />
      <meta name="apple-mobile-web-app-title" content="VayoJanaMitra" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      
      {/* Favicon */}
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      <link rel="icon" type="image/png" href="/favicon.png" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      
      {/* Structured Data */}
      {schema && (
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      )}
      
      {/* Default Organization Schema */}
      {!schema && (
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "GovernmentOrganization",
            "name": "VayoJanaMitra",
            "url": siteUrl,
            "logo": `${siteUrl}/logo.png`,
            "description": siteDescription,
            "address": {
              "@type": "PostalAddress",
              "addressCountry": "IN",
              "addressRegion": "Kerala",
              "addressLocality": "Thiruvananthapuram"
            },
            "contactPoint": {
              "@type": "ContactPoint",
              "telephone": "+91-471-XXXXXXX",
              "contactType": "customer service",
              "availableLanguage": ["English", "Malayalam", "Hindi"]
            }
          })}
        </script>
      )}
    </Helmet>
  );
};

export default SEOHead;
