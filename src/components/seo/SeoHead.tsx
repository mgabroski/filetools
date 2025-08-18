// src/components/seo/SeoHead.tsx
type Props = {
  title: string;
  description: string;
  path: string; // e.g. "/compress-pdf"
  image?: string; // e.g. "/og/og-compress.png"
  keywords?: string;
  jsonLd?: object | object[];
  type?: 'website' | 'article' | 'product' | 'webapp';
};

function abs(base: string | undefined, p: string) {
  const b = (base ?? '').replace(/\/+$/, '');
  const c = p.startsWith('/') ? p : `/${p}`;
  return `${b}${c}`;
}

export function SeoHead({
  title,
  description,
  path,
  image,
  keywords,
  jsonLd,
  type = 'website',
}: Props) {
  const base = import.meta.env.VITE_SITE_URL as string | undefined;
  const canonical = base ? abs(base, path) : path;
  const ogImage = image ? (base ? abs(base, image) : image) : undefined;

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={canonical} />

      <meta property="og:type" content={type === 'webapp' ? 'website' : type} />
      <meta property="og:site_name" content="FileTools" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      {ogImage && <meta property="og:image" content={ogImage} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}

      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(Array.isArray(jsonLd) ? jsonLd : [jsonLd]),
          }}
        />
      )}
    </>
  );
}
