// src/app/toolCatalog.ts
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
  color: string; // tailwind gradient classes
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
        pill: '',
        icon: FileDown,
        implemented: true,
        to: '/pdf-to-jpg',
      },
      {
        key: 'split-pdf',
        title: 'Split PDF',
        desc: 'Extract selected pages by range.',
        pill: '',
        icon: Scissors,
        implemented: true,
        to: '/split-pdf',
      },
      {
        key: 'rotate-pdf',
        title: 'Rotate PDF',
        desc: 'Rotate all or selected pages by 90°, 180°, or 270°.',
        pill: '',
        icon: RotateCw,
        implemented: true,
        to: '/rotate-pdf',
      },
    ],
  },
  image: {
    label: 'Image Tools',
    icon: ImageIcon,
    color: 'from-sky-500 to-cyan-500',
    items: [
      {
        key: 'jpg-to-pdf',
        title: 'JPG → PDF',
        desc: 'Convert images to a single PDF.',
        pill: 'Batch',
        icon: FileImage,
        to: '/jpg-to-pdf',
        implemented: false,
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
