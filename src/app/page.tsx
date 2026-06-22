'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import OverviewTab from '@/components/techpack/OverviewTab';
import ImagesTab from '@/components/techpack/ImagesTab';
import BomTab from '@/components/techpack/BomTab';
import MeasurementsTab from '@/components/techpack/MeasurementsTab';
import GuideTab from '@/components/techpack/GuideTab';
import ExportTab from '@/components/techpack/ExportTab';
import TrimsTab from '@/components/techpack/TrimsTab';
import PrintTab from '@/components/techpack/PrintTab';
import PrintSketchTab from '@/components/techpack/PrintSketchTab';
import MockupGeneratorTab from '@/components/techpack/MockupGeneratorTab';
import ColorwaysTab from '@/components/techpack/ColorwaysTab';
import CostingTab from '@/components/techpack/CostingTab';
import ConstructionTab from '@/components/techpack/ConstructionTab';
import ThreeDPreviewTab from '@/components/techpack/ThreeDPreviewTab';
import VirtualTryOnTab from '@/components/techpack/VirtualTryOnTab';
import PatternMakingTab from '@/components/techpack/PatternMakingTab';
import { initialTechPack, TechPackData } from '@/types/techpack';
import { Ruler, Image as ImageIcon, Tags, Printer, Menu, X, Save, FileText, Scissors, Droplet, Compass, Layers, Palette, Columns, Calculator, View, Home } from 'lucide-react';

type TabId = 'virtual-tryon' | 'pattern-making' | 'overview' | 'images' | 'print' | 'print-sketch' | 'mockup' | 'colorways' | '3d-preview' | 'construction' | 'trims' | 'bom' | 'measurements' | 'guide' | 'costing' | 'export';

function TechPackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dbId = searchParams.get('id');

  const [activeTab, setActiveTab] = useState<TabId>('mockup');
  const [techPack, setTechPack] = useState<TechPackData>(initialTechPack);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | ''>('');
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load from DB if ID is present, else load from local storage
  useEffect(() => {
    async function loadData() {
      // Fetch available products
      try {
        const prodRes = await fetch('/api/products');
        if (prodRes.ok) {
          const prods = await prodRes.json();
          setProducts(prods);
        }
      } catch (e) { console.error('Failed to load products', e); }

      if (dbId) {
        // Load from DB
        try {
          const res = await fetch(`/api/techpacks/${dbId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.productId) setSelectedProductId(data.productId);
            if (data.jsonData) {
              const parsed = JSON.parse(data.jsonData);
              if (parsed.logoImage && parsed.logoImage.includes('PHN2ZyB4bWxuc')) {
                delete parsed.logoImage;
              }
              setTechPack({ ...initialTechPack, ...parsed });
            }
          }
        } catch (e) {
          console.error("DB load failed", e);
        }
      } else {
        // Load from local storage
        const saved = localStorage.getItem('techPackData');
        if (saved) {
          try {
            let parsed = JSON.parse(saved);
            if (parsed.logoImage && parsed.logoImage.includes('PHN2ZyB4bWxuc')) {
              delete parsed.logoImage;
            }
            setTechPack({ ...initialTechPack, ...parsed });
          } catch (e) {
            console.error("Local storage parse failed", e);
          }
        }
      }
    }
    loadData();
  }, [dbId]);

  // Handle Product Selection
  const handleProductSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pid = e.target.value;
    setSelectedProductId(pid);
    
    if (pid) {
      const prod = products.find(p => p.id === pid);
      if (prod) {
        // Auto-fill template info
        setTechPack(prev => ({
          ...prev,
          styleNo: prod.styleNo || prev.styleNo,
          styleName: prod.styleName || prev.styleName,
          season: prod.season || prev.season,
          brand: prod.metaBrand || prev.brand,
          fabric: prod.template?.fabricType || prev.fabric,
          fabricWeight: prod.template?.gsm ? `${prod.template.gsm} GSM` : prev.fabricWeight,
        }));
      }
    }
  };

  // Save to local storage on change
  const handleUpdate = useCallback((partialData: Partial<TechPackData>) => {
    setTechPack(prev => ({ ...prev, ...partialData }));
    
    setSaveStatus('saving');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(() => {
      setTechPack(currentData => {
        try {
          if (!dbId) localStorage.setItem('techPackData', JSON.stringify(currentData));
        } catch (error) {
          console.warn('Could not save to localStorage', error);
        }
        return currentData;
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 2000);
    }, 500);
  }, [dbId]);

  const clearData = () => {
    if (window.confirm("Are you sure you want to clear all data and start a new tech pack?")) {
      setTechPack(initialTechPack);
      localStorage.removeItem('techPackData');
      router.push('/'); // remove dbId
    }
  };

  const saveToDatabase = async () => {
    setSaveStatus('saving');
    try {
      const payload = {
        productId: selectedProductId || null,
        version: '1.0',
        jsonData: JSON.stringify(techPack)
      };

      let res;
      if (dbId) {
        res = await fetch(`/api/techpacks/${dbId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/api/techpacks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        const data = await res.json();
        setSaveStatus('saved');
        if (!dbId && data.id) {
          router.push(`/?id=${data.id}`);
        }
      } else {
        alert("Failed to save to database.");
        setSaveStatus('');
      }
    } catch (error) {
      console.error(error);
      alert("Error saving to database.");
      setSaveStatus('');
    }
  };

  const tabs = [
    { id: 'virtual-tryon', name: 'AI Virtual Try-On', icon: ImageIcon },
    { id: 'mockup', name: 'Mockup Generator', icon: Layers },
    { id: 'pattern-making', name: '2D/3D CAD Pattern', icon: Scissors },
    { id: '3d-preview', name: '3D Preview', icon: View },
    { id: 'colorways', name: 'Colorways', icon: Columns },
    { id: 'overview', name: 'General Info', icon: Tags },
    { id: 'images', name: 'Artwork & Sketches', icon: ImageIcon },
    { id: 'construction', name: 'Pattern & Seams', icon: Scissors },
    { id: 'print', name: 'Print Details', icon: Droplet },
    { id: 'print-sketch', name: 'Design Sketch', icon: Palette },
    { id: 'trims', name: 'Trims & Labels', icon: Layers },
    { id: 'measurements', name: 'Measurements', icon: Ruler },
    { id: 'guide', name: 'Meas. Guide', icon: Compass },
    { id: 'bom', name: 'BOM / Notes (Opt)', icon: FileText },
    { id: 'costing', name: 'Cost Estimator', icon: Calculator },
    { id: 'export', name: 'Preview & Export', icon: Printer },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col md:flex-row">
      {/* Mobile Header (No Print) */}
      <div className="md:hidden flex items-center justify-between bg-black text-white p-4 print:hidden">
        <h1 className="text-xl font-semibold tracking-tight">TechPack<span className="font-light text-gray-400">Gen</span></h1>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 -mr-2">
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        ${mobileMenuOpen ? 'flex' : 'hidden'} md:flex 
        flex-col w-full md:w-64 bg-white border-r border-gray-200 print:hidden 
        h-screen sticky top-0 z-10
      `}>
        <div className="p-6 hidden md:block border-b border-gray-100">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-black mb-4 transition-colors">
            <Home size={16} /> Dashboard
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight uppercase">TechPack<br/><span className="text-gray-400 font-normal">Generator</span></h1>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors
                  ${isActive 
                    ? 'bg-black text-white' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-black'
                  }
                `}
              >
                <Icon size={18} className={isActive ? 'text-gray-300' : 'text-gray-400'} />
                {tab.name}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 text-xs text-gray-500 bg-gray-50">
          <div className="mb-4">
            <label className="block font-medium text-gray-700 mb-1">Link to Product</label>
            <select 
              className="w-full p-2 rounded border border-gray-300 bg-white"
              value={selectedProductId}
              onChange={handleProductSelect}
            >
              <option value="">-- No Product Selected --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.styleNo} - {p.styleName}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between mb-4">
            <span>Status:</span>
            <span className="flex items-center gap-1 font-medium bg-gray-200 px-2 py-0.5 rounded text-gray-700">
               {saveStatus === 'saved' && <><Save size={12}/> Saved</>}
               {saveStatus === 'saving' && <span className="animate-pulse">Saving...</span>}
               {saveStatus === '' && (dbId ? 'DB Record' : 'Local Draft')}
            </span>
          </div>
          <button 
            onClick={saveToDatabase}
            className="w-full text-center bg-black text-white rounded-md py-2 mb-2 font-medium hover:bg-gray-800 transition-colors"
          >
            {dbId ? 'Update Database' : 'Save to Database'}
          </button>
          <button 
            onClick={clearData}
            className="w-full text-center text-red-500 hover:text-red-600 border border-red-200 rounded-md py-1.5 font-medium transition-colors bg-white"
          >
            Start New Tech Pack
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto print:p-0 print:overflow-visible print:w-auto bg-gray-100 min-h-screen">
        <div className="mx-auto w-full max-w-[1800px] h-full bg-white p-6 md:p-8 rounded-xl shadow-sm print:max-w-none print:w-auto print:bg-transparent print:shadow-none print:p-0"> 
          {activeTab === 'virtual-tryon' && <VirtualTryOnTab data={techPack} updateData={handleUpdate} />}
          {activeTab === 'pattern-making' && <PatternMakingTab data={techPack} updateData={handleUpdate} />}
          {activeTab === 'mockup' && <MockupGeneratorTab data={techPack} updateData={handleUpdate} />}
          {activeTab === '3d-preview' && <ThreeDPreviewTab data={techPack} updateData={handleUpdate} />}
          {activeTab === 'colorways' && <ColorwaysTab data={techPack} updateData={handleUpdate} />}
          {activeTab === 'overview' && <OverviewTab data={techPack} updateData={handleUpdate} />}
          {activeTab === 'images' && <ImagesTab data={techPack} updateData={handleUpdate} />}
          {activeTab === 'construction' && <ConstructionTab data={techPack} updateData={handleUpdate} />}
          {activeTab === 'print' && <PrintTab data={techPack} updateData={handleUpdate} />}
          {activeTab === 'print-sketch' && <PrintSketchTab data={techPack} updateData={handleUpdate} />}
          {activeTab === 'trims' && <TrimsTab data={techPack} updateData={handleUpdate} />}
          {activeTab === 'bom' && <BomTab data={techPack} updateData={handleUpdate} />}
          {activeTab === 'measurements' && <MeasurementsTab data={techPack} updateData={handleUpdate} />}
          {activeTab === 'guide' && <GuideTab data={techPack} updateData={handleUpdate} />}
          {activeTab === 'costing' && <CostingTab data={techPack} updateData={handleUpdate} />}
          {activeTab === 'export' && <ExportTab data={techPack} />}
        </div>
      </main>
    </div>
  );
}

export default function TechPackGenerator() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading Tech Pack Generator...</div>}>
      <TechPackContent />
    </Suspense>
  );
}
