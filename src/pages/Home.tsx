import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { TOOL_GROUPS } from '../app/toolCatalog';
import type { ToolItem, ToolGroup } from '../app/toolCatalog';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { SeoHead } from '../components/seo/SeoHead';

// const ADS_ENABLED = import.meta.env.VITE_ADS_ENABLED === 'true';
const SITE_URL = (import.meta.env.VITE_SITE_URL as string) || 'https://filetools-eight.vercel.app';
const INITIAL_VISIBLE = 6;

/* ---------------------------------------------
   MOST USED TOOLS (6 конкретни алатки по TITLE)
----------------------------------------------*/
const POPULAR_KEYS: string[] = [
  'compress-pdf', // Compress PDF
  'merge-pdf',    // Merge PDF
  'img-compress', // Image Compressor (JPG/PNG)
  'bg-remove',    // Remove Background
  'jpg-to-pdf',   // JPG → PDF
  'mp4-compress', // Compress MP4
];

const ALL_TOOLS: ToolItem[] = Object.values(TOOL_GROUPS).flatMap((group) => group.items);

const POPULAR_TOOLS: ToolItem[] = POPULAR_KEYS
  .map((key) => ALL_TOOLS.find((item) => item.key === key))
  .filter(Boolean) as ToolItem[];

/* ------------------------------------------*/

const ToolCard = ({ item, color }: { item: ToolItem; color?: string }) => {
  const Icon = item.icon;
  const isComing = !item.implemented;

  const body = (
    <>
      <CardHeader className="flex items-start gap-3 pb-3 pt-4">
        <div
          className={
            color
              ? `p-2 rounded-xl shrink-0 bg-gradient-to-br ${color} text-white`
              : 'p-2 rounded-xl bg-zinc-50 border border-zinc-200 text-zinc-700 shrink-0'
          }
        >
          <Icon className="size-4" />
        </div>
        <div className="flex-1 space-y-1">
          <div className="font-semibold leading-tight text-[15px] text-zinc-900">
            {item.title}
          </div>
          <p className="text-[13px] text-zinc-500 leading-snug line-clamp-2">
            {item.desc}
          </p>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-4 pt-2">
        <div className="h-20 rounded-lg border border-dashed border-zinc-200 bg-zinc-50/60 grid place-items-center">
          {isComing ? (
            <button
              disabled
              className="px-3 py-1.5 rounded-md bg-zinc-200/80 text-zinc-600 text-[13px] cursor-not-allowed"
              aria-disabled
            >
              Coming soon
            </button>
          ) : (
            // NOTE: span instead of Link to avoid nested <a>
            <span
              className="inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-indigo-600 text-white text-[13px] font-medium hover:bg-indigo-700 transition-colors"
              aria-label={`Open ${item.title} tool`}
            >
              {item.title}
            </span>
          )}
        </div>
      </CardContent>
    </>
  );

  const card = (
    <Card className="h-full flex flex-col rounded-2xl border border-zinc-200 bg-white transition-colors">
      {body}
    </Card>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {isComing ? (
        card
      ) : (
        <Link to={item.to} className="block h-full" aria-label={`Open ${item.title} tool`}>
          {card}
        </Link>
      )}
    </motion.div>
  );
};

function ShowToggleButton({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  return (
    <div className="mt-3 min-h-[48px] flex justify-center">
      <button
        onClick={onToggle}
        className="px-6 py-2 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-sm font-medium text-zinc-700 w-[240px] sm:w-[260px] transition-colors"
        aria-label={expanded ? 'Show less' : 'Show more'}
      >
        {expanded ? 'Show less' : 'Show more'}
      </button>
    </div>
  );
}

const Section = ({
  id,
  meta,
  children,
}: {
  id: string;
  meta: ToolGroup;
  children: React.ReactNode;
}) => (
  <section id={id} className="pt-8 mb-10 scroll-mt-24">
    <div className="flex items-center gap-3 mb-4">
      <div
        className={`size-9 grid place-items-center rounded-2xl bg-gradient-to-br ${meta.color} text-white`}
      >
        {React.createElement(meta.icon, { className: 'size-4' })}
      </div>
      <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-zinc-900 leading-none">
        {meta.label}
      </h2>
    </div>
    {children}
  </section>
);

export default function Home() {
  const faq = [
    {
      q: 'Are my files uploaded?',
      a: 'For most tools, processing happens in your browser using WebAssembly. Your files never leave your device. Some conversions (like DOCX→PDF) may require a server — those are clearly labeled.',
    },
    {
      q: 'Is it free?',
      a: 'Yes. Core tools are free and supported by privacy-respecting ads. Heavy/batch tasks may offer an optional Pro mode with higher limits.',
    },
    {
      q: 'Which browsers are supported?',
      a: 'Latest Chrome, Edge, Firefox, and Safari on desktop & mobile. No extensions required.',
    },
  ];

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'FileTools',
      url: `${SITE_URL}/`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
  ];

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    pdf: false,
    image: false,
    media: false,
  });

  return (
    <>
      <SeoHead
        title="Free Online PDF, Image & Video Tools — Fast, Private, No Sign-Up | FileTools"
        description="Merge, compress, convert and resize files in your browser. 100% private, no uploads required, mobile-friendly and free to use."
        path="/"
        keywords="merge pdf, compress pdf, jpg to pdf, image converter, video compressor, pdf tools, online file tools"
        jsonLd={jsonLd}
      />

      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-3xl mx-auto mb-6"
      >
        <h1 className="text-xl sm:text-3xl md:text-4xl font-semibold tracking-tight mb-4 text-zinc-900">
          Free Online PDF, Image &amp; Video Tools
        </h1>
        <p className="text-zinc-600 max-w-2xl mx-auto text-sm sm:text-base">
          Fast, free file utilities to merge, compress, convert, resize and more.{' '}
          <span className="font-medium text-zinc-700">
            Private by design — processing happens in your browser. Your files never leave your
            device.
          </span>
        </p>
<div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-[11px] sm:text-xs text-zinc-500">
  <span>No login</span>
  <span>•</span>
  <span>Drag & drop</span>
  <span>•</span>
  <span>PWA offline</span>
  <span>•</span>
  <span>Private: in-browser</span>
</div>


      </motion.section>

      {/* Most used tools */}
      {POPULAR_TOOLS.length > 0 && (
        <section className="pt-8 mt-2 mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="size-8 grid place-items-center rounded-2xl bg-indigo-500/90 text-white text-sm">
                ★
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-zinc-900 leading-none">
                Most used tools
              </h2>
            </div>
            <p className="hidden sm:block text-xs text-zinc-500">
              Quick access to the tools people use the most.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {POPULAR_TOOLS.map((item) => (
              <ToolCard key={item.key} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,1.1fr)] gap-6 mt-4 items-start">
        {/* Main content */}
        <div className="space-y-8">
          {Object.entries(TOOL_GROUPS).map(([key, group]) => {
            const showAll = expanded[key];
            const visible = showAll ? group.items : group.items.slice(0, INITIAL_VISIBLE);
            const hasMore = group.items.length > INITIAL_VISIBLE;

            return (
              <Section key={key} id={key} meta={group}>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {visible.map((it) => (
                    <ToolCard key={it.key} item={it} color={group.color} />
                  ))}
                </div>

                {hasMore && (
                  <ShowToggleButton
                    expanded={showAll}
                    onToggle={() =>
                      setExpanded((prev) => ({
                        ...prev,
                        [key]: !prev[key],
                      }))
                    }
                  />
                )}
              </Section>
            );
          })}
        </div>

        {/* Sidebar моментално исклучен */}
        {/* 
        <aside className="space-y-4">
          {ADS_ENABLED && (
            <>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-500 text-xs grid place-items-center h-28">
                Ad placeholder (336×280 / responsive)
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-500 text-xs grid place-items-center h-28">
                Ad placeholder (336×280 / responsive)
              </div>
            </>
          )}
          <Card className="rounded-2xl border border-zinc-200 bg-white">
            <CardHeader className="pb-2 pt-4">
              <div className="font-semibold text-zinc-900 text-sm">Why FileTools?</div>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 text-sm text-zinc-700 space-y-2">
                <li>Private by design — processing runs locally in your browser.</li>
                <li>No tracking of file contents. Ever.</li>
                <li>Clean UI, mobile-first, no popups.</li>
              </ul>
            </CardContent>
          </Card>
        </aside>
        */}
      </div>

      {/* FAQ / SEO */}
      <section className="pt-8 mt-10" id="faq">
        <Card className="rounded-2xl border border-zinc-200 bg-white">
          <CardHeader className="pb-2 pt-4">
            <div className="text-xl sm:text-2xl md:text-3xl font-semibold text-zinc-900 leading-none">
              Frequently Asked Questions
            </div>
          </CardHeader>
          <CardContent className="text-sm text-zinc-700 space-y-5">
            <div className="space-y-1.5">
              <div className="font-medium text-zinc-900">Are my files uploaded?</div>
              <p>
                For most tools, processing happens in your browser using WebAssembly. That means
                your files never leave your device. Some conversions (like DOCX→PDF) may require a
                server — those are clearly labeled.
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="font-medium text-zinc-900">Is it free?</div>
              <p>
                Yes. Core tools are free and supported by privacy-respecting ads. Heavy/batch tasks
                may offer an optional Pro mode with higher limits.
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="font-medium text-zinc-900">Which browsers are supported?</div>
              <p>
                Latest Chrome, Edge, Firefox, and Safari on desktop &amp; mobile. No extensions
                required.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
}