import {
  FileText,
  Image as ImageIcon,
  Video,
  Layers,
  Shrink,
  FileImage,
  FileDown,
  ArrowLeftRight,
  Gauge,
  Wand2,
  FileCog,
  Scissors,
  RotateCw,
  ListOrdered,
  Hash,
  Stamp,
  PenTool,
  CropIcon,
} from 'lucide-react';

export type ToolItem = {
  key: string;
  title: string;
  desc: string;
  pill: string;
  icon: React.ComponentType<{ className?: string }>;
  to: string;
  implemented?: boolean;
};

export type ToolGroup = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  items: ToolItem[];
};

export const TOOL_GROUPS: Record<'pdf' | 'image' | 'media', ToolGroup> = {
  pdf: {
    label: 'PDF Tools',
    icon: FileText,
    color: 'from-rose-500 to-fuchsia-500',
    items: [
      {
        key: 'merge-pdf',
        title: 'Merge PDF',
        desc: 'Combine PDFs into one file. Drag & drop & reorder. Private.',
        pill: 'Client-side',
        icon: Layers,
        to: '/merge-pdf',
        implemented: true,
      },
      {
        key: 'compress-pdf',
        title: 'Compress PDF',
        desc: 'Reduce PDF size online. Quality & DPI controls. Private.',
        pill: 'Lossy/Lossless',
        icon: Shrink,
        to: '/compress-pdf',
        implemented: true,
      },
      {
        key: 'pdf-to-jpg',
        title: 'PDF → JPG',
        desc: 'Export pages as images.',
        pill: 'Raster',
        icon: FileDown,
        implemented: true,
        to: '/pdf-to-jpg',
      },
      {
        key: 'split-pdf',
        title: 'Split PDF',
        desc: 'Extract selected pages by range.',
        pill: 'Batch',
        icon: Scissors,
        implemented: true,
        to: '/split-pdf',
      },
      {
        key: 'rotate-pdf',
        title: 'Rotate PDF',
        desc: 'Rotate all or selected pages by 90°, 180°, or 270°.',
        pill: 'Batch',
        icon: RotateCw,
        implemented: true,
        to: '/rotate-pdf',
      },
      {
        key: 'reorder-pdf',
        title: 'Reorder / Delete Pages',
        desc: 'Rearrange or remove pages, then export.',
        pill: 'Batch',
        icon: ListOrdered,
        implemented: true,
        to: '/reorder-pdf',
      },
      {
        key: 'page-numbers',
        title: 'Add Page Numbers',
        desc: 'Number pages (position & style).',
        pill: 'Coming soon',
        icon: Hash,
        to: '/add-page-numbers',
        implemented: false,
      },
      {
        key: 'watermark-pdf',
        title: 'Add Watermark',
        desc: 'Text or image watermark on pages.',
        pill: 'Coming soon',
        icon: Stamp,
        to: '/add-watermark',
        implemented: false,
      },
      {
        key: 'sign-pdf',
        title: 'Sign PDF',
        desc: 'Add signatures — draw, type or upload. Private & secure.',
        pill: 'Coming soon',
        icon: PenTool,
        to: '#',
        implemented: false,
      },
    ],
  },
  image: {
    label: 'Image Tools',
    icon: ImageIcon,
    color: 'from-sky-500 to-cyan-500',
    items: [
      {
        key: 'crop-resize',
        title: 'Crop & Resize',
        desc: 'Crop with aspect ratios, set output size & format.',
        pill: 'Client-side',
        icon: CropIcon,
        to: '/crop-resize',
        implemented: true,
      },
      {
        key: 'bg-remove',
        title: 'Remove Background',
        desc: 'Make background transparent (Auto or Magic Wand).',
        pill: 'PNG',
        icon: Wand2,
        to: '/bg-remove',
        implemented: true,
      },
      {
        key: 'jpg-to-pdf',
        title: 'JPG → PDF',
        desc: 'Convert images to a single PDF.',
        pill: 'Batch',
        icon: FileImage,
        to: '/jpg-to-pdf',
        implemented: true,
      },
      {
        key: 'img-convert',
        title: 'JPG ↔ PNG ↔ WebP',
        desc: 'Fast format switching.',
        pill: 'WASM',
        icon: ArrowLeftRight,
        to: '/img-convert',
        implemented: false,
      },
      {
        key: 'img-compress',
        title: 'Image Compressor',
        desc: 'Target size or quality.',
        pill: 'Batch',
        icon: Gauge,
        to: '/img-compress',
        implemented: false,
      },
      {
        key: 'img-resize',
        title: 'Resize Images',
        desc: 'Scale, fit, crop.',
        pill: 'Presets',
        icon: Wand2,
        to: '/img-resize',
        implemented: false,
      },
    ],
  },
  media: {
    label: 'Video & Audio',
    icon: Video,
    color: 'from-amber-500 to-orange-500',
    items: [
      {
        key: 'mp4-compress',
        title: 'Compress MP4',
        desc: 'Reduce for email/WhatsApp.',
        pill: 'H.264',
        icon: Shrink,
        to: '/mp4-compress',
        implemented: false,
      },
      {
        key: 'mp4-to-mp3',
        title: 'MP4 → MP3',
        desc: 'Extract audio from video.',
        pill: 'Fast',
        icon: ArrowLeftRight,
        to: '/mp4-to-mp3',
        implemented: false,
      },
      {
        key: 'audio-convert',
        title: 'Audio Converter',
        desc: 'WAV ↔ MP3 ↔ AAC.',
        pill: 'Batch',
        icon: FileCog,
        to: '/audio-convert',
        implemented: false,
      },
    ],
  },
};
