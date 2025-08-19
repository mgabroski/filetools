// src/app/routes.tsx
import { createBrowserRouter } from 'react-router-dom';
import App from '../App';
import Home from '../pages/Home';
import MergePdfPage from '../features/pdf/merge/MergePdfPage';
import CompressPdfPage from '../features/pdf/compress/CompressPdfPage';
import PdfToJpgPage from '../features/pdf/pdf-to-jpg/PdfToJpgPage';
import SplitPdfPage from '../features/pdf/split/SplitPdfPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'merge-pdf', element: <MergePdfPage /> },
      { path: 'compress-pdf', element: <CompressPdfPage /> },
      { path: '/pdf-to-jpg', element: <PdfToJpgPage /> },
      { path: '/split-pdf', element: <SplitPdfPage /> },
    ],
  },
]);
