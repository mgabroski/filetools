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

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
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
    ],
  },
]);
