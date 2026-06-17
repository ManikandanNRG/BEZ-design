/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import OverviewTab from './components/OverviewTab';
import ImagesTab from './components/ImagesTab';
import BomTab from './components/BomTab';
import MeasurementsTab from './components/MeasurementsTab';
import GuideTab from './components/GuideTab';
import ExportTab from './components/ExportTab';
import TrimsTab from './components/TrimsTab';
import PrintTab from './components/PrintTab';
import PrintSketchTab from './components/PrintSketchTab';
import MockupGeneratorTab from './components/MockupGeneratorTab';
import ColorwaysTab from './components/ColorwaysTab';
import CostingTab from './components/CostingTab';
import ConstructionTab from './components/ConstructionTab';
import ThreeDPreviewTab from './components/ThreeDPreviewTab';
import { initialTechPack, TechPackData } from './types';
import { Ruler, Image as ImageIcon, Tags, Printer, Menu, X, Save, FileText, Scissors, Droplet, Compass, Layers, Palette, Columns, Calculator, View } from 'lucide-react';

type TabId = 'overview' | 'images' | 'print' | 'print-sketch' | 'mockup' | 'colorways' | '3d-preview' | 'construction' | 'trims' | 'bom' | 'measurements' | 'guide' | 'costing' | 'export';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('mockup');
  const [techPack, setTechPack] = useState<TechPackData>(initialTechPack);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | ''>('');

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load from template/local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('techPackData');
    if (saved) {
      try {
        let parsed = JSON.parse(saved);
        // Clear broken SVG logos if present to restore default text
        if (parsed.logoImage && parsed.logoImage.includes('PHN2ZyB4bWxuc')) {
          delete parsed.logoImage;
        }
        setTechPack({ ...initialTechPack, ...parsed });
      } catch (e) {
        console.error("Local storage parse failed", e);
      }
    }
  }, []);

  // Save to local storage on change
  const handleUpdate = useCallback((partialData: Partial<TechPackData>) => {
    setTechPack(prev => ({ ...prev, ...partialData }));
    
    setSaveStatus('saving');
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(() => {
      setTechPack(currentData => {
        try {
          localStorage.setItem('techPackData', JSON.stringify(currentData));
        } catch (error) {
          console.warn('Could not save to localStorage (quota exceeded or disabled):', error);
        }
        return currentData;
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 2000);
    }, 500);
  }, []);

  const clearData = () => {
    if (window.confirm("Are you sure you want to clear all data and start a new tech pack?")) {
      setTechPack(initialTechPack);
      localStorage.removeItem('techPackData');
    }
  };

  const tabs = [
    { id: 'mockup', name: 'Mockup Generator', icon: Layers },
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
      <div className="md:hidden flex items-center justify-between bg-black text-white p-4 no-print">
        <h1 className="text-xl font-semibold tracking-tight">TechPack<span className="font-light text-gray-400">Gen</span></h1>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 -mr-2">
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        ${mobileMenuOpen ? 'flex' : 'hidden'} md:flex 
        flex-col w-full md:w-64 bg-white border-r border-gray-200 no-print 
        h-auto md:min-h-screen sticky top-0 z-10
      `}>
        <div className="p-6 hidden md:block">
          <h1 className="text-2xl font-semibold tracking-tight uppercase">TechPack<br/><span className="text-gray-400 font-normal">Generator</span></h1>
        </div>
        
        <nav className="flex-1 px-4 pb-4 space-y-1">
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

        <div className="p-4 border-t border-gray-200 text-xs text-gray-500">
          <div className="flex items-center justify-between mb-4">
            <span>Status:</span>
            <span className="flex items-center gap-1 font-medium bg-gray-100 px-2 py-0.5 rounded text-gray-700">
               {saveStatus === 'saved' && <><Save size={12}/> Saved</>}
               {saveStatus === 'saving' && <span className="animate-pulse">Saving...</span>}
               {saveStatus === '' && 'Local Draft'}
            </span>
          </div>
          <button 
            onClick={clearData}
            className="w-full text-left text-red-500 hover:text-red-600 transition-colors py-1 font-medium"
          >
            Start New Tech Pack
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto print:p-0 print:overflow-visible bg-gray-100 min-h-screen">
        <div className="mx-auto max-w-5xl h-full bg-white p-6 md:p-8 rounded-xl shadow-sm print:bg-transparent print:shadow-none print:p-0"> 
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
