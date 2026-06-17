'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Layers,
  Palette,
  LayoutGrid,
  FileDown,
  FileCode,
  FolderOpen,
  Plus,
  ArrowRight,
  TrendingUp,
  Cpu,
  Scissors,
  CheckCircle,
  Eye,
  Settings,
  ChevronRight,
  Upload,
  RefreshCw,
  Sliders,
  ChevronLeft,
  X
} from 'lucide-react';
import CanvasEditor from '@/components/CanvasEditor';
import { findNearestPantone, extractDominantColorsFromImage, PantoneMatch } from '@/lib/pantone';
import { generateTechPackPPTX } from '@/lib/pptxGenerator';

// Safely load client-only PDF download button to avoid turbopack/SSR errors
const PDFDownloadButton = dynamic(
  () => import('@/components/PDFDownloadButton'),
  { ssr: false }
);

export default function AppDashboard() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'templates' | 'artworks' | 'products' | 'generator'>('dashboard');

  // Database lists
  const [templates, setTemplates] = useState<any[]>([]);
  const [artworks, setArtworks] = useState<any[]>([]);
  const [labels, setLabels] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [techPacks, setTechPacks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active items for editing
  const [activeProduct, setActiveProduct] = useState<any | null>(null);
  const [isPreviewingTechPack, setIsPreviewingTechPack] = useState<any | null>(null);
  const [previewPage, setPreviewPage] = useState(1);

  // 19 standard points matching reference PDF size sheet
  const standardPoints = [
    { num: 1, desc: 'Neck width from seam to seam', key: 'neckWidth', baseRatio: 1.0, tol: '1/8' },
    { num: 2, desc: 'Front neck drop from HPS to neck seam', key: 'neckWidth', baseRatio: 0.6, tol: '1/8' },
    { num: 3, desc: 'Back neck drop from HPS to neck seam', key: 'neckWidth', baseRatio: 0.17, tol: '0' },
    { num: 4, desc: 'Neck rib height', key: 'custom', baseVal: 0.5, tol: '0' },
    { num: 5, desc: 'Shoulder width seam to seam', key: 'shoulderWidth', baseRatio: 1.0, tol: '1/4' },
    { num: 6, desc: 'Shoulder Slope', key: 'custom', baseVal: 2.5, tol: '0' },
    { num: 7, desc: 'Chest 1" below from Armhole', key: 'chestWidth', baseRatio: 2.0, tol: '1/2' },
    { num: 8, desc: 'Bottom Sweep at straight edge', key: 'bottomWidth', baseRatio: 2.0, tol: '1/2' },
    { num: 9, desc: 'Armhole straight', key: 'sleeveOpening', baseRatio: 1.25, tol: '1/4' },
    { num: 10, desc: 'Sleeve length from shoulder seam', key: 'sleeveLength', baseRatio: 1.0, tol: '1/8' },
    { num: 11, desc: 'Sleeve underarm length', key: 'sleeveLength', baseRatio: 0.68, tol: '1/8' },
    { num: 12, desc: 'Biceps 1" Below Arm hole', key: 'sleeveOpening', baseRatio: 2.14, tol: '1/4' },
    { num: 13, desc: 'Sleeve opening at edge', key: 'sleeveOpening', baseRatio: 2.0, tol: '1/4' },
    { num: 14, desc: 'Front length from HPS', key: 'bodyLength', baseRatio: 1.0, tol: '1/4' },
    { num: 15, desc: 'Moon patch width', key: 'neckWidth', baseRatio: 1.1, tol: '1/8' },
    { num: 16, desc: 'Back moon patch height at CB', key: 'custom', baseVal: 4.0, tol: '1/8' },
    { num: 17, desc: 'Chest logo vertical from HPS', key: 'custom', baseVal: 7.75, tol: '1/8' },
    { num: 18, desc: 'Chest logo horizontal from CF', key: 'custom', baseVal: 3.25, tol: '1/8' },
    { num: 19, desc: 'Bottom Tail height', key: 'custom', baseVal: 2.0, tol: '0' }
  ];

  const formatFraction = (val: number): string => {
    if (val === 0) return '0';
    const integer = Math.floor(val);
    const remainder = val - integer;
    if (remainder < 0.05) return `${integer}`;
    if (Math.abs(remainder - 0.125) < 0.05) return integer > 0 ? `${integer} 1/8` : '1/8';
    if (Math.abs(remainder - 0.25) < 0.05) return integer > 0 ? `${integer} 1/4` : '1/4';
    if (Math.abs(remainder - 0.375) < 0.05) return integer > 0 ? `${integer} 3/8` : '3/8';
    if (Math.abs(remainder - 0.5) < 0.05) return integer > 0 ? `${integer} 1/2` : '1/2';
    if (Math.abs(remainder - 0.625) < 0.05) return integer > 0 ? `${integer} 5/8` : '5/8';
    if (Math.abs(remainder - 0.75) < 0.05) return integer > 0 ? `${integer} 3/4` : '3/4';
    if (Math.abs(remainder - 0.875) < 0.05) return integer > 0 ? `${integer} 7/8` : '7/8';
    return `${val.toFixed(2)}`;
  };

  const getGradedValue = (prod: any, sizeCode: string, point: any) => {
    const list = prod?.template?.measurements || [];
    const sizeItem = list.find((m: any) => m.size === sizeCode);
    if (!sizeItem) return 'N/A';
    if (point.key === 'custom') {
      let val = point.baseVal || 0;
      if (sizeCode === 'S') val -= 0.125;
      if (sizeCode === 'L') val += 0.125;
      if (sizeCode === 'XL') val += 0.25;
      if (sizeCode === 'XXL') val += 0.375;
      return formatFraction(val);
    }
    const baseVal = sizeItem[point.key] || 0;
    return formatFraction(baseVal * (point.baseRatio ?? 1.0));
  };

  // Template creation form state
  const [templateForm, setTemplateForm] = useState({
    name: '',
    category: 'T-Shirt',
    fabricType: '',
    gsm: 240,
    fitType: 'Oversized',
    defaultPackaging: 'Individual frosted zip-lock polybag.',
    defaultLabels: 'Main neck woven loop tag + satin wash care label.',
    measurements: {
      S: { neckWidth: 7.0, chestWidth: 22.0, bodyLength: 28.0, shoulderWidth: 20.0, sleeveLength: 8.5, sleeveOpening: 7.5, bottomWidth: 22.0, tolerance: 0.5 },
      M: { neckWidth: 7.25, chestWidth: 24.0, bodyLength: 29.0, shoulderWidth: 21.0, sleeveLength: 9.0, sleeveOpening: 8.0, bottomWidth: 24.0, tolerance: 0.5 },
      L: { neckWidth: 7.5, chestWidth: 26.0, bodyLength: 30.0, shoulderWidth: 22.0, sleeveLength: 9.5, sleeveOpening: 8.5, bottomWidth: 26.0, tolerance: 0.5 },
      XL: { neckWidth: 7.75, chestWidth: 28.0, bodyLength: 31.0, shoulderWidth: 23.0, sleeveLength: 10.0, sleeveOpening: 9.0, bottomWidth: 28.0, tolerance: 0.5 },
      XXL: { neckWidth: 8.0, chestWidth: 30.0, bodyLength: 32.0, shoulderWidth: 24.0, sleeveLength: 10.5, sleeveOpening: 9.5, bottomWidth: 30.0, tolerance: 0.5 }
    }
  });

  // Artwork creation form state
  const [artworkForm, setArtworkForm] = useState({
    name: '',
    category: 'FRONT',
    fileUrl: '',
    extractedPantones: [] as PantoneMatch[]
  });

  // Product creation form state
  const [productForm, setProductForm] = useState({
    id: '',
    styleNo: '',
    styleName: '',
    color: 'Black',
    templateId: '',
    artworkId: '',
    printType: 'SCREEN_PRINT',
    status: 'DRAFT',
    season: 'Summer 2026',
    placementSpecs: null as any,
    useCustomHeaders: false,
    metaBrand: '',
    metaSizeRange: '',
    metaVersion: '',
    metaDesigner: '',
    metaApprovedBy: '',
    metaMadeIn: ''
  });

  // Load database items on mount
  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      const [tRes, aRes, lRes, pRes, tpRes] = await Promise.all([
        fetch('/api/templates'),
        fetch('/api/artworks'),
        fetch('/api/labels'),
        fetch('/api/products'),
        fetch('/api/techpacks')
      ]);

      const [tData, aData, lData, pData, tpData] = await Promise.all([
        tRes.json(),
        aRes.json(),
        lRes.json(),
        pRes.json(),
        tpRes.json()
      ]);

      setTemplates(tData || []);
      setArtworks(aData || []);
      setLabels(lData || []);
      setProducts(pData || []);
      setTechPacks(tpData || []);
    } catch (e) {
      console.error('Error fetching database:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Sizing Auto-Grading Rules
  const handleAutoGrade = () => {
    const base = templateForm.measurements.M;
    setTemplateForm({
      ...templateForm,
      measurements: {
        S: {
          neckWidth: Math.max(5, base.neckWidth - 0.25),
          chestWidth: base.chestWidth - 2.0,
          bodyLength: base.bodyLength - 1.0,
          shoulderWidth: base.shoulderWidth - 1.0,
          sleeveLength: Math.max(1, base.sleeveLength - 0.5),
          sleeveOpening: Math.max(1, base.sleeveOpening - 0.5),
          bottomWidth: base.bottomWidth - 2.0,
          tolerance: base.tolerance
        },
        M: base,
        L: {
          neckWidth: base.neckWidth + 0.25,
          chestWidth: base.chestWidth + 2.0,
          bodyLength: base.bodyLength + 1.0,
          shoulderWidth: base.shoulderWidth + 1.0,
          sleeveLength: base.sleeveLength + 0.5,
          sleeveOpening: base.sleeveOpening + 0.5,
          bottomWidth: base.bottomWidth + 2.0,
          tolerance: base.tolerance
        },
        XL: {
          neckWidth: base.neckWidth + 0.5,
          chestWidth: base.chestWidth + 4.0,
          bodyLength: base.bodyLength + 2.0,
          shoulderWidth: base.shoulderWidth + 2.0,
          sleeveLength: base.sleeveLength + 1.0,
          sleeveOpening: base.sleeveOpening + 1.0,
          bottomWidth: base.bottomWidth + 4.0,
          tolerance: base.tolerance
        },
        XXL: {
          neckWidth: base.neckWidth + 0.75,
          chestWidth: base.chestWidth + 6.0,
          bodyLength: base.bodyLength + 3.0,
          shoulderWidth: base.shoulderWidth + 3.0,
          sleeveLength: base.sleeveLength + 1.5,
          sleeveOpening: base.sleeveOpening + 1.5,
          bottomWidth: base.bottomWidth + 6.0,
          tolerance: base.tolerance
        }
      }
    });
  };

  // Mock Artwork upload selection & color extractor
  const handleArtworkFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    
    const img = new Image();
    img.src = objectUrl;
    img.onload = async () => {
      const colors = await extractDominantColorsFromImage(img);
      setArtworkForm({
        ...artworkForm,
        fileUrl: objectUrl,
        extractedPantones: colors
      });
    };
  };

  // Save Garment Template to DB
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const measurementsArray = Object.entries(templateForm.measurements).map(([size, specs]) => ({
        size,
        ...specs
      }));

      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...templateForm,
          measurements: measurementsArray
        })
      });

      if (res.ok) {
        fetchAllData();
        setTemplateForm({
          name: '',
          category: 'T-Shirt',
          fabricType: '',
          gsm: 240,
          fitType: 'Oversized',
          defaultPackaging: 'Individual frosted zip-lock polybag.',
          defaultLabels: 'Main neck woven loop tag + satin wash care label.',
          measurements: {
            S: { neckWidth: 7.0, chestWidth: 22.0, bodyLength: 28.0, shoulderWidth: 20.0, sleeveLength: 8.5, sleeveOpening: 7.5, bottomWidth: 22.0, tolerance: 0.5 },
            M: { neckWidth: 7.25, chestWidth: 24.0, bodyLength: 29.0, shoulderWidth: 21.0, sleeveLength: 9.0, sleeveOpening: 8.0, bottomWidth: 24.0, tolerance: 0.5 },
            L: { neckWidth: 7.5, chestWidth: 26.0, bodyLength: 30.0, shoulderWidth: 22.0, sleeveLength: 9.5, sleeveOpening: 8.5, bottomWidth: 26.0, tolerance: 0.5 },
            XL: { neckWidth: 7.75, chestWidth: 28.0, bodyLength: 31.0, shoulderWidth: 23.0, sleeveLength: 10.0, sleeveOpening: 9.0, bottomWidth: 28.0, tolerance: 0.5 },
            XXL: { neckWidth: 8.0, chestWidth: 30.0, bodyLength: 32.0, shoulderWidth: 24.0, sleeveLength: 10.5, sleeveOpening: 9.5, bottomWidth: 30.0, tolerance: 0.5 }
          }
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Save Artwork to DB
  const handleSaveArtwork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artworkForm.name || !artworkForm.fileUrl) return;

    try {
      const res = await fetch('/api/artworks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(artworkForm)
      });

      if (res.ok) {
        fetchAllData();
        setArtworkForm({
          name: '',
          category: 'FRONT',
          fileUrl: '',
          extractedPantones: []
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Create Product & Save to DB
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        styleNo: productForm.styleNo,
        styleName: productForm.styleName,
        color: productForm.color,
        templateId: productForm.templateId,
        artworkId: productForm.artworkId || null,
        printType: productForm.printType,
        season: productForm.season,
        metaBrand: productForm.useCustomHeaders ? productForm.metaBrand : null,
        metaSizeRange: productForm.useCustomHeaders ? productForm.metaSizeRange : null,
        metaVersion: productForm.useCustomHeaders ? productForm.metaVersion : null,
        metaDesigner: productForm.useCustomHeaders ? productForm.metaDesigner : null,
        metaApprovedBy: productForm.useCustomHeaders ? productForm.metaApprovedBy : null,
        metaMadeIn: productForm.useCustomHeaders ? productForm.metaMadeIn : null,
      };

      if (productForm.placementSpecs) {
        payload.printSpecs = [{
          placement: productForm.placementSpecs.placement,
          width: productForm.placementSpecs.width,
          height: productForm.placementSpecs.height,
          printType: productForm.printType,
          pantoneColors: artworks.find(a => a.id === productForm.artworkId)?.name || 'Custom Pantone',
          specialNotes: `Offsets: HPS Y = ${productForm.placementSpecs.offsetFromHps} cm, CF X = ${productForm.placementSpecs.offsetFromCf} cm`
        }];
        
        payload.mockups = [{
          type: productForm.placementSpecs.placement.toUpperCase().includes('BACK') ? 'BACK' : 'FRONT',
          fileUrl: productForm.placementSpecs.mockupDataUrl
        }];
      }

      if (productForm.id) {
        payload.id = productForm.id;
      }

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        fetchAllData();
        setActiveProduct(null);
        setProductForm({
          id: '',
          styleNo: '',
          styleName: '',
          color: 'Black',
          templateId: '',
          artworkId: '',
          printType: 'SCREEN_PRINT',
          status: 'DRAFT',
          season: 'Summer 2026',
          placementSpecs: null,
          useCustomHeaders: false,
          metaBrand: '',
          metaSizeRange: '',
          metaVersion: '',
          metaDesigner: '',
          metaApprovedBy: '',
          metaMadeIn: ''
        });
        setActiveTab('dashboard');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to save product');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Setup product editor context
  const handleEditProduct = (prod: any) => {
    setActiveProduct(prod);
    setProductForm({
      id: prod.id,
      styleNo: prod.styleNo,
      styleName: prod.styleName,
      color: prod.color,
      templateId: prod.templateId,
      artworkId: prod.artworkId || '',
      printType: prod.printType,
      status: prod.status,
      season: prod.season || 'Summer 2026',
      placementSpecs: prod.printSpecs?.[0] ? {
        placement: prod.printSpecs[0].placement,
        width: prod.printSpecs[0].width,
        height: prod.printSpecs[0].height,
        offsetFromHps: parseFloat(prod.printSpecs[0].specialNotes?.match(/HPS Y = ([\d.]+) cm/)?.[1] || '7.75'),
        offsetFromCf: parseFloat(prod.printSpecs[0].specialNotes?.match(/CF X = ([\d.]+) cm/)?.[1] || '3.25'),
        mockupDataUrl: prod.mockups?.[0]?.fileUrl || ''
      } : null,
      useCustomHeaders: !!(prod.metaBrand || prod.metaSizeRange || prod.metaVersion || prod.metaDesigner || prod.metaApprovedBy || prod.metaMadeIn),
      metaBrand: prod.metaBrand || '',
      metaSizeRange: prod.metaSizeRange || '',
      metaVersion: prod.metaVersion || '',
      metaDesigner: prod.metaDesigner || '',
      metaApprovedBy: prod.metaApprovedBy || '',
      metaMadeIn: prod.metaMadeIn || ''
    });
    setActiveTab('generator');
  };

  // Trigger browser PPTX download
  const handleDownloadPPTX = async (prod: any) => {
    const pantonePalette = [
      { name: 'Pantone Black 6 C', hex: '#111111' },
      { name: 'Pantone White C', hex: '#FFFFFF' }
    ];

    const specs = prod.printSpecs?.[0] ? {
      placement: prod.printSpecs[0].placement,
      width: prod.printSpecs[0].width,
      height: prod.printSpecs[0].height,
      offsetFromHps: parseFloat(prod.printSpecs[0].specialNotes?.match(/HPS Y = ([\d.-]+)/)?.[1] || '0'),
      offsetFromCf: parseFloat(prod.printSpecs[0].specialNotes?.match(/CF X = ([\d.-]+)/)?.[1] || '0'),
      mockupDataUrl: prod.mockups?.[0]?.fileUrl || ''
    } : null;

    await generateTechPackPPTX(prod, specs, pantonePalette);

    await fetch('/api/techpacks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: prod.id,
        version: '1.0',
        notes: 'Exported slide deck PPTX'
      })
    });
    fetchAllData();
  };

  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="flex flex-1 bg-zinc-950 text-zinc-100 min-h-screen font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-zinc-900/60 backdrop-blur-md border-r border-zinc-800 flex flex-col justify-between p-6">
        <div>
          {/* Logo / Brand */}
          <div className="flex items-center mb-10 select-none">
            <img src="/logo.png" className="w-44 h-auto object-contain" alt="Buddy Engineerz Logo" />
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => { setActiveTab('dashboard'); setIsPreviewingTechPack(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-gradient-to-r from-zinc-800 to-zinc-800/60 text-white border-l-4 border-rose-500 pl-3 shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
              }`}
            >
              <LayoutGrid className="w-4 h-4" /> Dashboard
            </button>

            <button
              onClick={() => { setActiveTab('templates'); setIsPreviewingTechPack(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'templates'
                  ? 'bg-gradient-to-r from-zinc-800 to-zinc-800/60 text-white border-l-4 border-rose-500 pl-3 shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
              }`}
            >
              <Scissors className="w-4 h-4" /> Garment Templates
            </button>

            <button
              onClick={() => { setActiveTab('artworks'); setIsPreviewingTechPack(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'artworks'
                  ? 'bg-gradient-to-r from-zinc-800 to-zinc-800/60 text-white border-l-4 border-rose-500 pl-3 shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
              }`}
            >
              <Palette className="w-4 h-4" /> Graphic Assets
            </button>

            <button
              onClick={() => { setActiveTab('generator'); setIsPreviewingTechPack(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'generator'
                  ? 'bg-gradient-to-r from-zinc-800 to-zinc-800/60 text-white border-l-4 border-rose-500 pl-3 shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
              }`}
            >
              <Layers className="w-4 h-4" /> Tech Pack Builder
            </button>
          </nav>
        </div>

        {/* Footer info */}
        <div className="border-t border-zinc-800 pt-4 flex flex-col gap-1.5 text-xs text-zinc-500">
          <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Database: Local SQLite</div>
          <div className="text-[10px] font-mono">Vercel & Supabase Ready</div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-8 overflow-y-auto max-h-screen">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-zinc-500" />
          </div>
        ) : isPreviewingTechPack ? (
          /* Tech pack Preview */
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
              <div>
                <button
                  onClick={() => setIsPreviewingTechPack(null)}
                  className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm font-medium mb-1 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" /> Back to Dashboard
                </button>
                <h2 className="text-xl font-bold text-white">
                  Tech Pack Preview: {isPreviewingTechPack.styleNo} - {isPreviewingTechPack.styleName}
                </h2>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => handleDownloadPPTX(isPreviewingTechPack)}
                  className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all border border-zinc-700 cursor-pointer"
                >
                  <FileCode className="w-4 h-4 text-orange-400" /> Download PPTX
                </button>

                <PDFDownloadButton
                  product={isPreviewingTechPack}
                  placementSpecs={
                    isPreviewingTechPack.printSpecs?.[0] ? {
                      placement: isPreviewingTechPack.printSpecs[0].placement,
                      width: isPreviewingTechPack.printSpecs[0].width,
                      height: isPreviewingTechPack.printSpecs[0].height,
                      offsetFromHps: parseFloat(isPreviewingTechPack.printSpecs[0].specialNotes?.match(/HPS Y = ([\d.-]+)/)?.[1] || '0'),
                      offsetFromCf: parseFloat(isPreviewingTechPack.printSpecs[0].specialNotes?.match(/CF X = ([\d.-]+)/)?.[1] || '0'),
                      mockupDataUrl: isPreviewingTechPack.mockups?.[0]?.fileUrl || ''
                    } : null
                  }
                  pantones={[
                    { name: 'Pantone Black 6 C', hex: '#111111' },
                    { name: 'Pantone White C', hex: '#FFFFFF' }
                  ]}
                />
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 rounded-2xl p-6 relative">
              <button 
                onClick={() => setPreviewPage(prev => Math.max(1, prev - 1))}
                className="absolute left-4 p-3 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-white border border-zinc-700 disabled:opacity-30 disabled:pointer-events-none transition-all z-10"
                disabled={previewPage === 1}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button 
                onClick={() => setPreviewPage(prev => Math.min(5, prev + 1))}
                className="absolute right-4 p-3 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-white border border-zinc-700 disabled:opacity-30 disabled:pointer-events-none transition-all z-10"
                disabled={previewPage === 5}
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              <div className="w-[842px] h-[595px] bg-white text-zinc-900 shadow-2xl rounded-xl p-6 flex flex-col justify-between font-sans border border-zinc-200 overflow-y-auto">
                {/* Header Grid — fixed height matches 5 data rows exactly */}
                 <div className="w-full flex border-2 border-black mb-4 h-[110px] overflow-hidden">
                    {/* Brand Block — logo fills the maximum area of the fixed cell */}
                    <div className="w-[28%] border-r-2 border-black flex items-center justify-center bg-white select-none p-2">
                      <img src="/logo.png" className="w-full h-full object-contain" alt="Buddy Engineerz Logo" />
                    </div>
                   {/* Data Blocks */}
                   <div className="w-[72%] flex flex-col text-[7.5px] font-bold bg-white">
                     {/* Row 1 */}
                     <div className="w-full flex items-stretch border-b border-zinc-300 flex-1">
                       <div className="w-[13%] bg-zinc-100 p-1 border-r border-zinc-300 flex items-center text-[7px] text-zinc-700">BRAND</div>
                       <div className="w-[20%] p-1 border-r border-black flex items-center text-[8px] text-zinc-900 leading-tight">{isPreviewingTechPack.metaBrand || 'BUDDY ENGINEERZ'}</div>
                       <div className="w-[15%] bg-zinc-100 p-1 border-r border-zinc-300 flex items-center text-[7px] text-zinc-700">CATEGORY</div>
                       <div className="w-[22%] p-1 border-r border-black flex items-center text-[8px] text-zinc-900 leading-tight">{isPreviewingTechPack.template?.category === 'Hoodie' ? 'MENSWEAR / OUTERWEAR' : 'MENSWEAR / ATHLETIC'}</div>
                       <div className="w-[12%] bg-zinc-100 p-1 border-r border-zinc-300 flex items-center text-[7px] text-zinc-700">DATE</div>
                       <div className="w-[18%] p-1 flex items-center text-[8px] text-zinc-900 leading-tight">{dateStr}</div>
                     </div>
                     {/* Row 2 */}
                     <div className="w-full flex items-stretch border-b border-zinc-300 flex-1">
                       <div className="w-[13%] bg-zinc-100 p-1 border-r border-zinc-300 flex items-center text-[7px] text-zinc-700">STYLE NO.</div>
                       <div className="w-[20%] p-1 border-r border-black flex items-center text-[8px] text-red-600 leading-tight font-bold">{isPreviewingTechPack.styleNo}</div>
                       <div className="w-[15%] bg-zinc-100 p-1 border-r border-zinc-300 flex items-center text-[7px] text-zinc-700">SIZE RANGE</div>
                       <div className="w-[22%] p-1 border-r border-black flex items-center text-[8px] text-zinc-900 leading-tight">{isPreviewingTechPack.metaSizeRange || 'S - M - L - XL - XXL'}</div>
                       <div className="w-[12%] bg-zinc-100 p-1 border-r border-zinc-300 flex items-center text-[7px] text-zinc-700">VERSION</div>
                       <div className="w-[18%] p-1 flex items-center text-[8px] text-zinc-900 leading-tight">{isPreviewingTechPack.metaVersion || '1.0'}</div>
                     </div>
                     {/* Row 3 */}
                     <div className="w-full flex items-stretch border-b border-zinc-300 flex-1">
                       <div className="w-[13%] bg-zinc-100 p-1 border-r border-zinc-300 flex items-center text-[7px] text-zinc-700">STYLE NAME</div>
                       <div className="w-[20%] p-1 border-r border-black flex items-center text-[8px] text-zinc-900 leading-tight">{isPreviewingTechPack.styleName}</div>
                       <div className="w-[15%] bg-zinc-100 p-1 border-r border-zinc-300 flex items-center text-[7px] text-zinc-700">FIT</div>
                       <div className="w-[22%] p-1 border-r border-black flex items-center text-[8px] text-zinc-900 leading-tight">{isPreviewingTechPack.template?.fitType || 'REGULAR FIT'}</div>
                       <div className="w-[12%] bg-zinc-100 p-1 border-r border-zinc-300 flex items-center text-[7px] text-zinc-700">DESIGNER</div>
                       <div className="w-[18%] p-1 flex items-center text-[8px] text-zinc-900 leading-tight">{isPreviewingTechPack.metaDesigner || 'BUDDY ENGINEERZ'}</div>
                     </div>
                     {/* Row 4 */}
                     <div className="w-full flex items-stretch border-b border-zinc-300 flex-1">
                       <div className="w-[13%] bg-zinc-100 p-1 border-r border-zinc-300 flex items-center text-[7px] text-zinc-700">DESCRIPTION</div>
                       <div className="w-[20%] p-1 border-r border-black flex items-center text-[8px] text-zinc-900 leading-tight">{isPreviewingTechPack.template?.category === 'Hoodie' ? 'HEAVY HOODED SWEATSHIRT' : 'ROUND NECK T-SHIRT'}</div>
                       <div className="w-[15%] bg-zinc-100 p-1 border-r border-zinc-300 flex items-center text-[7px] text-zinc-700">FABRIC</div>
                       <div className="w-[22%] p-1 border-r border-black flex items-center text-[8px] text-zinc-900 leading-tight">{isPreviewingTechPack.template?.fabricType || '100% COTTON'}</div>
                       <div className="w-[12%] bg-zinc-100 p-1 border-r border-zinc-300 flex items-center text-[7px] text-zinc-700">APPROVED BY</div>
                       <div className="w-[18%] p-1 flex items-center text-[8px] text-zinc-900 leading-tight">{isPreviewingTechPack.metaApprovedBy || '_______________'}</div>
                     </div>
                     {/* Row 5 */}
                     <div className="w-full flex items-stretch flex-1">
                       <div className="w-[13%] bg-zinc-100 p-1 border-r border-zinc-300 flex items-center text-[7px] text-zinc-700">SEASON</div>
                       <div className="w-[20%] p-1 border-r border-black flex items-center text-[8px] text-zinc-900 leading-tight">{isPreviewingTechPack.season || 'ALL SEASON'}</div>
                       <div className="w-[15%] bg-zinc-100 p-1 border-r border-zinc-300 flex items-center text-[7px] text-zinc-700">FABRIC WEIGHT</div>
                       <div className="w-[22%] p-1 border-r border-black flex items-center text-[8px] text-zinc-900 leading-tight">{isPreviewingTechPack.template?.gsm || 180} GSM</div>
                       <div className="w-[12%] bg-zinc-100 p-1 border-r border-zinc-300 flex items-center text-[7px] text-zinc-700">MADE IN</div>
                       <div className="w-[18%] p-1 flex items-center text-[8px] text-zinc-900 leading-tight">{isPreviewingTechPack.metaMadeIn || 'INDIA'}</div>
                     </div>
                   </div>
                 </div>

                <div className="flex-1 py-1">
                  {/* Page 1 Overview */}
                  {previewPage === 1 && (
                    <div className="flex flex-col h-full justify-between">
                      <div className="text-[9px] font-bold bg-black text-white px-2 py-1 uppercase mb-2">PAGE 1: PRODUCT OVERVIEW & BLANKS</div>
                      <div className="flex-1 flex justify-around items-center gap-6 py-4">
                        {/* Black garment realistic SVG mockup */}
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Black Garment</span>
                          <div className="relative">
                            <svg viewBox="0 0 220 250" className="w-48 h-56" xmlns="http://www.w3.org/2000/svg">
                              {/* T-shirt body */}
                              <path d="M60,10 L10,60 L35,70 L35,240 L185,240 L185,70 L210,60 L160,10 C155,25 145,35 110,38 C75,35 65,25 60,10 Z" fill="#1a1a1a" stroke="#333" strokeWidth="1.5"/>
                              {/* Collar */}
                              <path d="M85,10 Q110,32 135,10" fill="none" stroke="#2a2a2a" strokeWidth="2"/>
                              {/* Sleeve seams */}
                              <line x1="35" y1="70" x2="60" y2="80" stroke="#2d2d2d" strokeWidth="1"/>
                              <line x1="185" y1="70" x2="160" y2="80" stroke="#2d2d2d" strokeWidth="1"/>
                              {/* Fold highlights */}
                              <path d="M50,120 Q55,150 52,200" fill="none" stroke="#2a2a2a" strokeWidth="0.8" opacity="0.7"/>
                              <path d="M170,120 Q165,150 168,200" fill="none" stroke="#2a2a2a" strokeWidth="0.8" opacity="0.7"/>
                              {/* Logo/artwork on left chest */}
                              <image href={isPreviewingTechPack.artwork?.fileUrl || '/logo.png'} x="72" y="70" width="45" height="45" opacity="0.9" />
                            </svg>
                          </div>
                          <span className="text-[7px] text-zinc-400 font-mono">LEFT CHEST PRINT</span>
                        </div>
                        {/* White garment realistic SVG mockup */}
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">White Garment</span>
                          <div className="relative">
                            <svg viewBox="0 0 220 250" className="w-48 h-56" xmlns="http://www.w3.org/2000/svg">
                              {/* T-shirt body */}
                              <path d="M60,10 L10,60 L35,70 L35,240 L185,240 L185,70 L210,60 L160,10 C155,25 145,35 110,38 C75,35 65,25 60,10 Z" fill="#f5f5f5" stroke="#bbb" strokeWidth="1.5"/>
                              {/* Collar */}
                              <path d="M85,10 Q110,32 135,10" fill="none" stroke="#ccc" strokeWidth="2"/>
                              {/* Sleeve seams */}
                              <line x1="35" y1="70" x2="60" y2="80" stroke="#ddd" strokeWidth="1"/>
                              <line x1="185" y1="70" x2="160" y2="80" stroke="#ddd" strokeWidth="1"/>
                              {/* Fold highlights */}
                              <path d="M50,120 Q55,150 52,200" fill="none" stroke="#ddd" strokeWidth="0.8" opacity="0.7"/>
                              <path d="M170,120 Q165,150 168,200" fill="none" stroke="#ddd" strokeWidth="0.8" opacity="0.7"/>
                              {/* Light shadow on hem */}
                              <path d="M35,230 L185,230" fill="none" stroke="#ccc" strokeWidth="1"/>
                              {/* Logo/artwork on left chest */}
                              <image href={isPreviewingTechPack.artwork?.fileUrl || '/logo.png'} x="72" y="70" width="45" height="45" opacity="0.9" />
                            </svg>
                          </div>
                          <span className="text-[7px] text-zinc-400 font-mono">LEFT CHEST PRINT</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Page 2: White garment specs */}
                  {previewPage === 2 && (
                    <div className="grid grid-cols-3 gap-4 h-full">
                      <div className="col-span-2 flex flex-col justify-between">
                        <div className="text-[9px] font-bold bg-black text-white px-2 py-1 uppercase mb-2">1. PRINT DETAILS & PLACEMENT (WHITE GARMENT)</div>
                        <div className="flex-1 border border-zinc-200 bg-zinc-50 p-4 rounded-lg flex justify-around items-center">
                          <div className="flex flex-col items-center">
                            <span className="text-[7px] font-bold text-zinc-500 mb-1">FRONT (LEFT CHEST)</span>
                            <div className="w-32 h-36 bg-white border border-zinc-200 rounded relative flex items-center justify-center">
                              {isPreviewingTechPack.mockups?.[0]?.fileUrl ? (
                                <img src={isPreviewingTechPack.mockups[0].fileUrl} className="max-h-full object-contain" />
                              ) : (
                                <span className="text-zinc-300 text-[8px]">No front mockup</span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-[7px] font-bold text-zinc-500 mb-1">BACK (CENTER)</span>
                            <div className="w-32 h-36 bg-white border border-zinc-200 rounded relative flex items-center justify-center">
                              {isPreviewingTechPack.artwork?.fileUrl ? (
                                <img src={isPreviewingTechPack.artwork.fileUrl} className="w-16 h-16 object-contain" />
                              ) : (
                                <span className="text-zinc-300 text-[8px]">No back logo</span>
                              )}
                              <div className="absolute top-2 bottom-2 left-1/2 w-[1px] border-l border-dashed border-red-500 opacity-50" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-span-1 space-y-3">
                        <div>
                          <div className="text-[9px] font-bold bg-black text-white px-2 py-1 uppercase mb-1">2. Print Spec</div>
                          <div className="border border-zinc-200 p-2 rounded text-[8px] bg-zinc-50 space-y-1">
                            <div>METHOD: <span className="font-bold">{isPreviewingTechPack.printType}</span></div>
                            <div>INK: <span className="font-bold">PLASTISOL INK (MATTE)</span></div>
                            <div>LOCATION: <span className="font-bold">CHEST & BACK</span></div>
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] font-bold bg-black text-white px-2 py-1 uppercase mb-1">3. Colors</div>
                          <div className="border border-zinc-200 p-2 rounded text-[8px] bg-zinc-50 space-y-1">
                            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-black border border-zinc-300 rounded" /> PANTONE BLACK C</div>
                            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-red-600 border border-zinc-300 rounded" /> PANTONE 185 C</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Page 3: Black garment specs */}
                  {previewPage === 3 && (
                    <div className="grid grid-cols-3 gap-4 h-full">
                      <div className="col-span-2 flex flex-col justify-between">
                        <div className="text-[9px] font-bold bg-black text-white px-2 py-1 uppercase mb-2">1. PRINT DETAILS & PLACEMENT (BLACK GARMENT)</div>
                        <div className="flex-1 border border-zinc-800 bg-zinc-900 p-4 rounded-lg flex justify-around items-center">
                          <div className="flex flex-col items-center">
                            <span className="text-[7px] font-bold text-zinc-400 mb-1">FRONT (LEFT CHEST)</span>
                            <div className="w-32 h-36 bg-zinc-950 border border-zinc-800 rounded relative flex items-center justify-center">
                              {isPreviewingTechPack.mockups?.[0]?.fileUrl ? (
                                <img src={isPreviewingTechPack.mockups[0].fileUrl} className="max-h-full object-contain invert" />
                              ) : (
                                <span className="text-zinc-600 text-[8px]">No front mockup</span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-center">
                            <span className="text-[7px] font-bold text-zinc-400 mb-1">BACK (CENTER)</span>
                            <div className="w-32 h-36 bg-zinc-950 border border-zinc-800 rounded relative flex items-center justify-center">
                              {isPreviewingTechPack.artwork?.fileUrl ? (
                                <img src={isPreviewingTechPack.artwork.fileUrl} className="w-16 h-16 object-contain" />
                              ) : (
                                <span className="text-zinc-600 text-[8px]">No back logo</span>
                              )}
                              <div className="absolute top-2 bottom-2 left-1/2 w-[1px] border-l border-dashed border-red-500 opacity-50" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="col-span-1 space-y-3">
                        <div>
                          <div className="text-[9px] font-bold bg-black text-white px-2 py-1 uppercase mb-1">2. Print Spec</div>
                          <div className="border border-zinc-200 p-2 rounded text-[8px] bg-zinc-50 space-y-1">
                            <div>METHOD: <span className="font-bold">{isPreviewingTechPack.printType}</span></div>
                            <div>INK: <span className="font-bold">DISCHARGE PLASTISOL</span></div>
                            <div>LOCATION: <span className="font-bold">CHEST & BACK</span></div>
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] font-bold bg-black text-white px-2 py-1 uppercase mb-1">3. Colors</div>
                          <div className="border border-zinc-200 p-2 rounded text-[8px] bg-zinc-50 space-y-1">
                            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-white border border-zinc-300 rounded" /> PANTONE WHITE C</div>
                            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-red-600 border border-zinc-300 rounded" /> PANTONE 185 C</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Page 4: Trims & labels */}
                  {previewPage === 4 && (
                    <div className="flex flex-col h-full justify-between">
                      <div className="text-[9px] font-bold bg-black text-white px-2 py-1 uppercase mb-2">1. TRIMS & LABELS SPECIFICATIONS</div>
                      <div className="grid grid-cols-5 gap-2 flex-1 items-stretch">
                        {/* Woven label */}
                        <div className="border border-zinc-200 p-2 rounded bg-zinc-50 text-[7px] flex flex-col justify-between">
                          <div>
                            <div className="font-bold border-b border-zinc-200 pb-1 mb-1 text-center bg-zinc-100 rounded">A. MAIN NECK LABEL</div>
                            <div className="text-[6px] text-zinc-500 mb-1">WOVEN DAMASK LOOP</div>
                            <div>SIZE: 6x4 CM</div>
                          </div>
                          <div className="text-[6px] text-zinc-400">Position: Sewn inside collar seam center.</div>
                        </div>
                        {/* Care label */}
                        <div className="border border-zinc-200 p-2 rounded bg-zinc-50 text-[7px] flex flex-col justify-between">
                          <div>
                            <div className="font-bold border-b border-zinc-200 pb-1 mb-1 text-center bg-zinc-100 rounded">B. WASH CARE LABEL</div>
                            <div className="text-[6px] text-zinc-500 mb-1">SOFT WHITE SATIN</div>
                            <div>SIZE: 3x8 CM</div>
                          </div>
                          <div className="text-[6px] text-zinc-400">Position: Left side seam, 10cm from hem.</div>
                        </div>
                        {/* Size loop */}
                        <div className="border border-zinc-200 p-2 rounded bg-zinc-50 text-[7px] flex flex-col justify-between">
                          <div>
                            <div className="font-bold border-b border-zinc-200 pb-1 mb-1 text-center bg-zinc-100 rounded">C. SIZE LABEL</div>
                            <div className="text-[6px] text-zinc-500 mb-1">BLACK WOVEN LOOP</div>
                            <div>SIZE: 1x4 CM</div>
                          </div>
                          <div className="text-[6px] text-zinc-400">Contains size letter (S/M/L/XL/XXL).</div>
                        </div>
                        {/* Hang tag */}
                        <div className="border border-zinc-200 p-2 rounded bg-zinc-50 text-[7px] flex flex-col justify-between">
                          <div>
                            <div className="font-bold border-b border-zinc-200 pb-1 mb-1 text-center bg-zinc-100 rounded">D. HANG TAG</div>
                            <div className="text-[6px] text-zinc-500 mb-1">300GSM ART CARD</div>
                            <div>SIZE: 9x14 CM</div>
                          </div>
                          <div className="text-[6px] text-zinc-400">Attached via gold safety pin.</div>
                        </div>
                        {/* Poly bag */}
                        <div className="border border-zinc-200 p-2 rounded bg-zinc-50 text-[7px] flex flex-col justify-between">
                          <div>
                            <div className="font-bold border-b border-zinc-200 pb-1 mb-1 text-center bg-zinc-100 rounded">E. POLY BAG</div>
                            <div className="text-[6px] text-zinc-500 mb-1">FROSTED LDPE SLIDER</div>
                            <div>SIZE: 30x40 CM</div>
                          </div>
                          <div className="text-[6px] text-zinc-400">Thickness: 50 micron with air vents.</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Page 5: Size specifications */}
                  {previewPage === 5 && (
                    <div className="flex flex-col h-full justify-between">
                      <div className="text-[9px] font-bold bg-black text-white px-2 py-1 uppercase mb-2">1. MEASUREMENT SHEET (ALL DIMENSIONS IN INCHES)</div>
                      <div className="flex-1 overflow-y-auto max-h-[220px] border border-black rounded">
                        <table className="w-full text-[7.5px] border-collapse">
                          <thead>
                            <tr className="bg-black text-white font-bold h-6">
                              <th className="p-1 border border-black text-left">Description Point</th>
                              <th className="p-1 border border-black text-center w-12">Tol (+/-)</th>
                              <th className="p-1 border border-black text-center w-10">S</th>
                              <th className="p-1 border border-black text-center w-10">M</th>
                              <th className="p-1 border border-black text-center w-10">L</th>
                              <th className="p-1 border border-black text-center w-10">XL</th>
                              <th className="p-1 border border-black text-center w-10">XXL</th>
                            </tr>
                          </thead>
                          <tbody>
                            {standardPoints.map((point, idx) => (
                              <tr key={idx} className={`h-5 border-b border-zinc-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50'}`}>
                                <td className="p-1 font-bold pl-2">{point.num}. {point.desc}</td>
                                <td className="p-1 text-center border-l border-zinc-200">{point.tol}"</td>
                                <td className="p-1 text-center border-l border-zinc-200">{getGradedValue(isPreviewingTechPack, 'S', point)}"</td>
                                <td className="p-1 text-center border-l border-zinc-200">{getGradedValue(isPreviewingTechPack, 'M', point)}"</td>
                                <td className="p-1 text-center border-l border-zinc-200">{getGradedValue(isPreviewingTechPack, 'L', point)}"</td>
                                <td className="p-1 text-center border-l border-zinc-200">{getGradedValue(isPreviewingTechPack, 'XL', point)}"</td>
                                <td className="p-1 text-center border-l border-zinc-200">{getGradedValue(isPreviewingTechPack, 'XXL', point)}"</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-between border-t border-zinc-200 pt-2 text-[8px] text-zinc-400 font-mono">
                  <span>Buddy Engineerz Tech Pack System v1.0</span>
                  <span>Confidential Production Specification Sheet</span>
                </div>
              </div>

              <div className="flex gap-2 mt-4 z-10">
                {[1, 2, 3, 4, 5].map(p => (
                  <button
                    key={p}
                    onClick={() => setPreviewPage(p)}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${previewPage === p ? 'bg-rose-500 w-5' : 'bg-zinc-700 hover:bg-zinc-600'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>
            {activeTab === 'dashboard' && (
              <div className="space-y-8 animate-fade-in">
                <div className="p-8 rounded-3xl bg-gradient-to-r from-rose-500/20 via-amber-500/10 to-transparent border border-rose-500/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Garment Production Automated</h2>
                    <p className="text-zinc-400 text-sm max-w-xl">
                      Welcome to Buddy Engineerz Tech Pack Generator. Load base templates, calibrate artwork placements visually, and export specification files in under 3 minutes.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('generator')}
                    className="flex items-center gap-2 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-zinc-950 text-sm font-bold py-2.5 px-5 rounded-2xl shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
                  >
                    Create New Style <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between h-32">
                    <span className="text-zinc-500 text-xs font-mono">BASE FITS</span>
                    <div className="flex items-baseline justify-between mt-2">
                      <span className="text-2xl font-bold text-white">{templates.length}</span>
                      <span className="text-[10px] text-emerald-500 flex items-center gap-1 font-mono"><TrendingUp className="w-3 h-3"/> Standard</span>
                    </div>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between h-32">
                    <span className="text-zinc-500 text-xs font-mono">ARTWORK ASSETS</span>
                    <div className="flex items-baseline justify-between mt-2">
                      <span className="text-2xl font-bold text-white">{artworks.length}</span>
                      <span className="text-[10px] text-rose-500 flex items-center gap-1 font-mono"><Palette className="w-3 h-3"/> Active</span>
                    </div>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between h-32">
                    <span className="text-zinc-500 text-xs font-mono">STYLES CREATED</span>
                    <div className="flex items-baseline justify-between mt-2">
                      <span className="text-2xl font-bold text-white">{products.length}</span>
                      <span className="text-[10px] text-amber-500 flex items-center gap-1 font-mono"><Layers className="w-3 h-3"/> In-app</span>
                    </div>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex flex-col justify-between h-32">
                    <span className="text-zinc-500 text-xs font-mono">TECH PACK EXPORTS</span>
                    <div className="flex items-baseline justify-between mt-2">
                      <span className="text-2xl font-bold text-white">{techPacks.length}</span>
                      <span className="text-[10px] text-emerald-500 flex items-center gap-1 font-mono"><FileDown className="w-3 h-3"/> PDF/PPTX</span>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-rose-500" /> Recent Styles & Production Sheets
                  </h3>

                  {products.length === 0 ? (
                    <div className="text-center py-10 text-zinc-500 text-sm">
                      No products created yet. Head over to the Builder tab to compile your first style!
                    </div>
                  ) : (
                    <div className="divide-y divide-zinc-800">
                      {products.map((prod) => (
                        <div key={prod.id} className="py-4 flex items-center justify-between hover:bg-zinc-800/10 px-2 rounded-xl transition-all">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                                {prod.styleNo}
                              </span>
                              <strong className="text-sm font-semibold text-white">{prod.styleName}</strong>
                            </div>
                            <div className="text-xs text-zinc-500 mt-1 flex items-center gap-2">
                              <span>Color: {prod.color}</span>
                              <span>•</span>
                              <span>Fit: {prod.template?.name}</span>
                              <span>•</span>
                              <span>Season: {prod.season || 'Core'}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setIsPreviewingTechPack(prod)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-zinc-700 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" /> Preview Pack
                            </button>
                            <button
                              onClick={() => handleEditProduct(prod)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium border border-rose-500/20 cursor-pointer"
                            >
                              <Settings className="w-3.5 h-3.5" /> Edit Coordinates
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sizing templates tab */}
            {activeTab === 'templates' && (
              <div className="grid lg:grid-cols-3 gap-8 animate-fade-in">
                <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 h-fit">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Scissors className="w-5 h-5 text-rose-500" /> Create Garment template
                  </h3>
                  <form onSubmit={handleSaveTemplate} className="space-y-4">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1 font-medium">Template Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Heavyweight Boxy Hoodie"
                        value={templateForm.name}
                        onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1 font-medium">Category</label>
                        <select
                          value={templateForm.category}
                          onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                        >
                          <option>T-Shirt</option>
                          <option>Hoodie</option>
                          <option>Sweatshirt</option>
                          <option>Polo</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1 font-medium">Fit Profile</label>
                        <input
                          type="text"
                          placeholder="e.g. Oversized Drop-Shoulder"
                          value={templateForm.fitType}
                          onChange={(e) => setTemplateForm({ ...templateForm, fitType: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1 font-medium">Fabric Type</label>
                        <input
                          type="text"
                          placeholder="e.g. 100% Cotton French Terry"
                          value={templateForm.fabricType}
                          onChange={(e) => setTemplateForm({ ...templateForm, fabricType: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1 font-medium">GSM Weight</label>
                        <input
                          type="number"
                          value={templateForm.gsm}
                          onChange={(e) => setTemplateForm({ ...templateForm, gsm: parseInt(e.target.value) })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div className="border-t border-zinc-800 pt-4 mt-6">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-white uppercase">Size Chart Calibration (Inches)</span>
                        <button
                          type="button"
                          onClick={handleAutoGrade}
                          className="flex items-center gap-1 text-[11px] font-mono text-amber-400 hover:text-amber-300 underline"
                        >
                          <Sliders className="w-3.5 h-3.5" /> Auto-Grade S-XXL from M
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl">
                          <span className="text-xs font-bold text-rose-500 font-mono">BASE SIZE (Medium - M)</span>
                          <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                            <div>
                              <span className="text-[10px] text-zinc-500">Chest Width</span>
                              <input
                                type="number"
                                step="0.1"
                                value={templateForm.measurements.M.chestWidth}
                                onChange={(e) => setTemplateForm({
                                  ...templateForm,
                                  measurements: {
                                    ...templateForm.measurements,
                                    M: { ...templateForm.measurements.M, chestWidth: parseFloat(e.target.value) }
                                  }
                                })}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded px-1.5 py-1 text-center"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-zinc-500">Body Length</span>
                              <input
                                type="number"
                                step="0.1"
                                value={templateForm.measurements.M.bodyLength}
                                onChange={(e) => setTemplateForm({
                                  ...templateForm,
                                  measurements: {
                                    ...templateForm.measurements,
                                    M: { ...templateForm.measurements.M, bodyLength: parseFloat(e.target.value) }
                                  }
                                })}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded px-1.5 py-1 text-center"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-zinc-500">Shoulder</span>
                              <input
                                type="number"
                                step="0.1"
                                value={templateForm.measurements.M.shoulderWidth}
                                onChange={(e) => setTemplateForm({
                                  ...templateForm,
                                  measurements: {
                                    ...templateForm.measurements,
                                    M: { ...templateForm.measurements.M, shoulderWidth: parseFloat(e.target.value) }
                                  }
                                })}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded px-1.5 py-1 text-center"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-amber-500 text-zinc-950 font-bold py-2.5 rounded-xl mt-6 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Save Template Fit
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <h3 className="text-lg font-bold text-white mb-2">Active Garment Library</h3>
                  {templates.map((tpl) => (
                    <div key={tpl.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="text-base font-bold text-white">{tpl.name}</h4>
                          <div className="text-xs text-zinc-400 font-mono mt-1">
                            {tpl.category} • {tpl.fitType} • {tpl.fabricType} ({tpl.gsm} GSM)
                          </div>
                        </div>
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                          {tpl.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-5 gap-2 border-t border-zinc-800 pt-4 text-center">
                        {tpl.measurements?.map((m: any) => (
                          <div key={m.id} className="bg-zinc-950 border border-zinc-800/40 p-2.5 rounded-xl text-xs">
                            <span className="font-bold text-rose-400 block mb-1 font-mono">{m.size}</span>
                            <div className="text-[10px] text-zinc-500 space-y-1">
                              <div>Chest: <strong className="text-zinc-300">{m.chestWidth}"</strong></div>
                              <div>Length: <strong className="text-zinc-300">{m.bodyLength}"</strong></div>
                              <div>Shoulder: <strong className="text-zinc-300">{m.shoulderWidth}"</strong></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Artworks tab */}
            {activeTab === 'artworks' && (
              <div className="grid lg:grid-cols-3 gap-8 animate-fade-in">
                <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 h-fit">
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Palette className="w-5 h-5 text-rose-500" /> Upload Print Artwork
                  </h3>
                  <form onSubmit={handleSaveArtwork} className="space-y-4">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1 font-medium">Artwork Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Back Logo Print"
                        value={artworkForm.name}
                        onChange={(e) => setArtworkForm({ ...artworkForm, name: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-zinc-400 mb-1 font-medium">Placement Category</label>
                      <select
                        value={artworkForm.category}
                        onChange={(e) => setArtworkForm({ ...artworkForm, category: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                      >
                        <option value="FRONT">FRONT PRINT</option>
                        <option value="BACK">BACK PRINT</option>
                        <option value="SLEEVE">SLEEVE EMBROIDERY</option>
                        <option value="CHEST_LOGO">LEFT CHEST LOGO</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Upload Image (PNG/SVG)</label>
                      <div className="relative border-2 border-dashed border-zinc-850 hover:border-zinc-700 bg-zinc-950 rounded-2xl h-36 flex flex-col items-center justify-center p-4 transition-all">
                        {artworkForm.fileUrl ? (
                          <div className="relative w-full h-full flex items-center justify-center">
                            <img src={artworkForm.fileUrl} className="max-h-full object-contain" />
                            <button
                              type="button"
                              onClick={() => setArtworkForm({ ...artworkForm, fileUrl: '', extractedPantones: [] })}
                              className="absolute top-1 right-1 p-1 bg-red-500 rounded-full hover:bg-red-400 text-white"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 text-zinc-500 mb-2" />
                            <span className="text-[11px] text-zinc-400">Click to select files</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleArtworkFileChange}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                          </>
                        )}
                      </div>
                    </div>

                    {artworkForm.extractedPantones.length > 0 && (
                      <div className="border-t border-zinc-800 pt-4 mt-4">
                        <span className="text-xs font-bold text-white uppercase block mb-3">Dominant Pantone Matches</span>
                        <div className="space-y-2">
                          {artworkForm.extractedPantones.map((c, i) => (
                            <div key={i} className="flex items-center justify-between text-xs bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                              <div className="flex items-center gap-2">
                                <span className="w-3.5 h-3.5 rounded border border-zinc-700" style={{ backgroundColor: c.hex }} />
                                <span className="font-semibold text-zinc-200">{c.name}</span>
                              </div>
                              <span className="text-[10px] font-mono text-zinc-500">{c.hex}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-amber-500 text-zinc-950 font-bold py-2.5 rounded-xl mt-6 cursor-pointer"
                      disabled={!artworkForm.fileUrl}
                    >
                      <Plus className="w-4 h-4" /> Save to Design Library
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <h3 className="text-lg font-bold text-white mb-2">Design Asset Library</h3>
                  {artworks.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-3xl text-sm">
                      Upload your first logo/print design to build asset catalogs.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {artworks.map((art) => (
                        <div key={art.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 flex flex-col justify-between">
                          <div className="border border-zinc-800 rounded-xl bg-zinc-950 h-32 flex items-center justify-center p-3 relative overflow-hidden mb-4">
                            <img src={art.fileUrl} className="max-h-full object-contain" />
                            <span className="absolute bottom-2 left-2 text-[10px] bg-zinc-850 px-2 py-0.5 rounded text-zinc-400 font-mono">
                              {art.category}
                            </span>
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-white truncate">{art.name}</h4>
                            <p className="text-[10px] text-zinc-500 mt-1 font-mono">Added: {new Date(art.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Builder/Generator tab */}
            {activeTab === 'generator' && (
              <div className="space-y-8 animate-fade-in">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                  <h2 className="text-xl font-bold text-white">
                    {productForm.id ? 'Edit Style Specifications' : 'Compile New Product Style'}
                  </h2>
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className="text-zinc-500 hover:text-white text-xs border border-zinc-800 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <form onSubmit={handleSaveProduct} className="grid lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4 h-fit">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">1. Product Identity</h3>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1 font-medium">Style Code</label>
                        <input
                          type="text"
                          placeholder="BEZ-TS-005"
                          value={productForm.styleNo}
                          onChange={(e) => setProductForm({ ...productForm, styleNo: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1 font-medium">Style Name</label>
                        <input
                          type="text"
                          placeholder="Eat Sleep Code Repeat"
                          value={productForm.styleName}
                          onChange={(e) => setProductForm({ ...productForm, styleName: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1 font-medium">Garment Color</label>
                        <input
                          type="text"
                          value={productForm.color}
                          onChange={(e) => setProductForm({ ...productForm, color: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1 font-medium">Season</label>
                        <input
                          type="text"
                          value={productForm.season}
                          onChange={(e) => setProductForm({ ...productForm, season: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-zinc-400 mb-1 font-medium">Select Base Fit Profile</label>
                      <select
                        value={productForm.templateId}
                        onChange={(e) => setProductForm({ ...productForm, templateId: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                        required
                      >
                        <option value="">-- Choose template profile --</option>
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>{t.name} ({t.fitType})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-zinc-400 mb-1 font-medium">Select Print Graphic</label>
                      <select
                        value={productForm.artworkId}
                        onChange={(e) => setProductForm({ ...productForm, artworkId: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                      >
                        <option value="">-- Choose graphic design --</option>
                        {artworks.map(a => (
                          <option key={a.id} value={a.id}>{a.name} ({a.category})</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1 font-medium">Printing Technique</label>
                        <select
                          value={productForm.printType}
                          onChange={(e) => setProductForm({ ...productForm, printType: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                        >
                          <option value="SCREEN_PRINT">SCREEN PRINT</option>
                          <option value="DTF">DTF PRINT</option>
                          <option value="PUFF_PRINT">PUFF PRINT (3D)</option>
                          <option value="EMBROIDERY">EMBROIDERY</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1 font-medium">Product Status</label>
                        <select
                          value={productForm.status}
                          onChange={(e) => setProductForm({ ...productForm, status: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none"
                        >
                          <option value="DRAFT">DRAFT</option>
                          <option value="APPROVED">APPROVED</option>
                          <option value="IN_PRODUCTION">IN PRODUCTION</option>
                        </select>
                      </div>
                    </div>

                    {/* Custom Meta Fields Section */}
                    <div className="border-t border-zinc-800 pt-4 mt-6">
                      <div className="flex items-center gap-2 mb-4">
                        <input
                          type="checkbox"
                          id="useCustomHeaders"
                          checked={productForm.useCustomHeaders}
                          onChange={(e) => setProductForm({ ...productForm, useCustomHeaders: e.target.checked })}
                          className="w-4 h-4 rounded border-zinc-800 bg-zinc-950 text-rose-500 focus:ring-rose-500 focus:ring-offset-zinc-900 cursor-pointer"
                        />
                        <label htmlFor="useCustomHeaders" className="text-xs font-bold text-zinc-300 uppercase tracking-wider cursor-pointer">
                          Override Default Header Values
                        </label>
                      </div>

                      {productForm.useCustomHeaders && (
                        <div className="space-y-3 p-3 bg-zinc-950/50 border border-zinc-800/50 rounded-xl mb-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] text-zinc-500 mb-1 font-medium">Brand</label>
                              <input
                                type="text"
                                placeholder="BUDDY ENGINEERZ"
                                value={productForm.metaBrand}
                                onChange={(e) => setProductForm({ ...productForm, metaBrand: e.target.value })}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-zinc-500 mb-1 font-medium">Size Range</label>
                              <input
                                type="text"
                                placeholder="S - M - L - XL - XXL"
                                value={productForm.metaSizeRange}
                                onChange={(e) => setProductForm({ ...productForm, metaSizeRange: e.target.value })}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-zinc-500 mb-1 font-medium">Version</label>
                              <input
                                type="text"
                                placeholder="1.0"
                                value={productForm.metaVersion}
                                onChange={(e) => setProductForm({ ...productForm, metaVersion: e.target.value })}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-zinc-500 mb-1 font-medium">Designer</label>
                              <input
                                type="text"
                                placeholder="BUDDY ENGINEERZ"
                                value={productForm.metaDesigner}
                                onChange={(e) => setProductForm({ ...productForm, metaDesigner: e.target.value })}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-zinc-500 mb-1 font-medium">Approved By</label>
                              <input
                                type="text"
                                placeholder="_______________"
                                value={productForm.metaApprovedBy}
                                onChange={(e) => setProductForm({ ...productForm, metaApprovedBy: e.target.value })}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-zinc-500 mb-1 font-medium">Made In</label>
                              <input
                                type="text"
                                placeholder="INDIA"
                                value={productForm.metaMadeIn}
                                onChange={(e) => setProductForm({ ...productForm, metaMadeIn: e.target.value })}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-zinc-950 font-bold py-2.5 rounded-xl shadow-lg mt-6 cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" /> Save Style Specs
                    </button>
                  </div>

                  <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">2. Interactive Print Placement Editor</h3>
                    
                    {productForm.templateId ? (
                      <CanvasEditor
                        key={`${productForm.templateId}-${productForm.artworkId}-${productForm.color}`}
                        artworkUrl={artworks.find(a => a.id === productForm.artworkId)?.fileUrl || null}
                        artworkCategory={artworks.find(a => a.id === productForm.artworkId)?.category || 'FRONT'}
                        garmentCategory={templates.find(t => t.id === productForm.templateId)?.category || 'T-Shirt'}
                        garmentColor={productForm.color}
                        onSave={(specs) => {
                          setProductForm({ ...productForm, placementSpecs: specs });
                          alert('Placement Coordinates locked successfully!');
                        }}
                      />
                    ) : (
                      <div className="h-[450px] bg-zinc-900 border border-zinc-800 border-dashed rounded-3xl flex items-center justify-center text-zinc-500 text-sm p-8 text-center max-w-2xl">
                        Select a base fit profile in Step 1 to load the garment canvas editor.
                      </div>
                    )}
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
