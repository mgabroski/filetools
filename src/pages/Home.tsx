import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { TOOL_GROUPS } from '../app/toolCatalog';
import type { ToolItem, ToolGroup } from '../app/toolCatalog';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { SeoHead } from '../components/seo/SeoHead';

const ADS_ENABLED = import.meta.env.VITE_ADS_ENABLED === 'true';
const SITE_URL = (import.meta.env.VITE_SITE_URL as string) || 'https://filetools-eight.vercel.app';
const INITIAL_VISIBLE = 6;

const ToolCard = ({ item }: { item: ToolItem }) => {
  const Icon = item.icon;
  const isComing = !item.implemented;

  const body = (
    <>
      <CardHeader className="flex items-start gap-2 h-24 py-3">
        <div className="p-1.5 rounded-lg bg-zinc-50 border border-zinc-100 shrink-0">
          <Icon className="size-4" />
        </div>
        <div className="flex-1">
          <div className="font-semibold leading-tight text-[15px]">{item.title}</div>
          <p className="text-[13px] text-zinc-500 leading-snug max-h-[36px] overflow-hidden">
            {item.desc}
          </p>
        </div>
      </CardHeader>

      <CardContent className="flex-1 py-3">
        <div className="h-20 border border-dashed border-zinc-300 rounded-lg p-3 grid place-items-center">
          {isComing ? (
            <button
              disabled
              className="px-3 py-1.5 rounded-md bg-zinc-200 text-zinc-600 text-[13px] cursor-not-allowed"
              aria-disabled
            >
              Coming soon
            </button>
          ) : (
            <Link
              to={item.to}
              className="inline-block px-3 py-1.5 rounded-md bg-black text-white text-[13px]"
              aria-label={`Open ${item.title} tool`}
            >
              {item.title}
            </Link>
          )}
        </div>
      </CardContent>
    </>
  );

  const card = (
    <Card className="h-full flex flex-col hover:shadow-md transition-shadow">{body}</Card>
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
        <Link to={item.to} className="block h-full">
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
        className="px-6 py-2 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-sm font-medium shadow-sm w-[240px] sm:w-[280px]"
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
  <section id={id} className="mb-8 scroll-mt-24">
    <div className="flex items-center gap-2 mb-3">
      <div
        className={`size-8 grid place-items-center rounded-xl bg-gradient-to-br ${meta.color} text-white`}
      >
        {React.createElement(meta.icon, { className: 'size-4' })}
      </div>
      <h2 className="text-xl font-semibold">{meta.label}</h2>
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
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
          Free Online PDF, Image &amp; Video Tools
        </h1>
        <p className="text-zinc-600 max-w-2xl mx-auto">
          Fast, free file utilities to merge, compress, convert, resize and more.{' '}
          <span className="font-medium">
            Private by design — all processing happens in your browser. Your files never leave your
            device.
          </span>
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-600">
          <span className="px-2 py-1 rounded-full bg-zinc-100">No login</span>
          <span className="px-2 py-1 rounded-full bg-zinc-100">Drag &amp; drop</span>
          <span className="px-2 py-1 rounded-full bg-zinc-100">PWA offline</span>
          <span className="px-2 py-1 rounded-full bg-zinc-100">Private: in-browser</span>
        </div>
      </motion.div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mt-6">
        {/* Main content */}
        <div className="lg:col-span-3 space-y-8">
          {Object.entries(TOOL_GROUPS).map(([key, group]) => {
            const showAll = expanded[key];
            const visible = showAll ? group.items : group.items.slice(0, INITIAL_VISIBLE);
            const hasMore = group.items.length > INITIAL_VISIBLE;

            return (
              <Section key={key} id={key} meta={group}>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {visible.map((it) => (
                    <ToolCard key={it.key} item={it} />
                  ))}
                </div>

                {hasMore && (
                  <ShowToggleButton
                    expanded={showAll}
                    onToggle={() => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))}
                  />
                )}
              </Section>
            );
          })}
        </div>

        {/* Sidebar (ads hidden unless enabled) */}
        <div className="space-y-4">
          {ADS_ENABLED && (
            <>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-500 text-xs grid place-items-center h-28">
                Ad placeholder (336×280 / responsive)
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-500 text-xs grid place-items-center h-28">
                Ad placeholder (336×280 / responsive)
              </div>
            </>
          )}
          <Card>
            <CardHeader>
              <div className="font-semibold">Why FileTools?</div>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 text-sm text-zinc-700 space-y-2">
                <li>Private by design — processing runs locally in your browser.</li>
                <li>No tracking of file contents. Ever.</li>
                <li>Clean UI, mobile-first, no popups.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* FAQ / SEO */}
      <div className="mt-10">
        <Card>
          <CardHeader>
            <div className="text-lg font-semibold">Frequently Asked Questions</div>
          </CardHeader>
          <CardContent className="text-sm text-zinc-700 space-y-4">
            <div>
              <div className="font-medium">Are my files uploaded?</div>
              <p>
                For most tools, processing happens in your browser using WebAssembly. That means
                your files never leave your device. Some conversions (like DOCX→PDF) may require a
                server — those are clearly labeled.
              </p>
            </div>
            <div>
              <div className="font-medium">Is it free?</div>
              <p>
                Yes. Core tools are free and supported by privacy-respecting ads. Heavy/batch tasks
                may offer an optional Pro mode with higher limits.
              </p>
            </div>
            <div>
              <div className="font-medium">Which browsers are supported?</div>
              <p>
                Latest Chrome, Edge, Firefox, and Safari on desktop &amp; mobile. No extensions
                required.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
