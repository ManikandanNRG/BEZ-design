'use client';

import React from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import TechPackPDF from './TechPackPDF';
import { FileDown } from 'lucide-react';

interface PDFDownloadButtonProps {
  product: any;
  placementSpecs: any;
  pantones: any;
}

export default function PDFDownloadButton({ product, placementSpecs, pantones }: PDFDownloadButtonProps) {
  return (
    <PDFDownloadLink
      document={<TechPackPDF product={product} placementSpecs={placementSpecs} pantones={pantones} />}
      fileName={`${product.styleNo}_Tech_Pack.pdf`}
    >
      {/* @ts-ignore */}
      {({ loading }) => (
        <button className="flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-zinc-950 text-sm font-semibold px-5 py-2 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer">
          <FileDown className="w-4 h-4" /> {loading ? 'Compiling PDF...' : 'Download PDF'}
        </button>
      )}
    </PDFDownloadLink>
  );
}
