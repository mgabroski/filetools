// src/app/routes.tsx
import { createBrowserRouter } from 'react-router-dom';
import App from '../App';
import Home from '../pages/Home';
import MergePdfPage from '../features/pdf/merge/MergePdfPage';
import CompressPdfPage from '../features/pdf/compress/CompressPdfPage';
import PdfToJpgPage from '../features/pdf/pdf-to-jpg/PdfToJpgPage';
import SplitPdfPage from '../features/pdf/split/SplitPdfPage';
import RotatePdfPage from '../features/pdf/rotate/RotatePdfPage';
import ReorderPdfPage from '../features/pdf/reorder/ReorderPdfPage';
import CropResizePage from '../features/image/crop-resize/CropResizePage';
import AutoBgRemovePage from '../features/image/bg-remove/AutoBgRemovePage';
import JpgToPdfPage from '../features/image/jpg-to-pdf/JpgToPdfPage';
import ImageCompressorPage from '../features/image/compress/ImageCompressorPage';
import CollageMakerPage from '../features/image/collage/CollageMakerPage';
import AnnotatePage from '../features/image/annotate/AnnotatePage';
import AboutPage from '../pages/AboutPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: "/about", element: <AboutPage /> },
      // PDF Tools
      { path: 'merge-pdf', element: <MergePdfPage /> },
      { path: 'compress-pdf', element: <CompressPdfPage /> },
      { path: '/pdf-to-jpg', element: <PdfToJpgPage /> },
      { path: '/split-pdf', element: <SplitPdfPage /> },
      { path: '/rotate-pdf', element: <RotatePdfPage /> },
      { path: '/reorder-pdf', element: <ReorderPdfPage /> },

      //Image Tools
      { path: '/crop-resize', element: <CropResizePage /> },
      { path: '/bg-remove', element: <AutoBgRemovePage /> },
      { path: '/jpg-to-pdf', element: <JpgToPdfPage /> },
      { path: '/compress-image', element: <ImageCompressorPage /> },
      { path: '/collage', element: <CollageMakerPage /> },
      { path: '/annotate', element: <AnnotatePage /> },
    ],
  },
]);
