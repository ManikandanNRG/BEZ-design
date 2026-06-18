import React, { useState, useRef } from 'react';
import { TechPackData } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Sparkles, Upload, X, Loader2, Trash2 } from 'lucide-react';

interface OverviewTabProps {
  data: TechPackData;
  updateData: (data: Partial<TechPackData>) => void;
}

export default function OverviewTab({ data, updateData }: OverviewTabProps) {
  const [isVisionModalOpen, setIsVisionModalOpen] = useState(false);
  const [visionImage, setVisionImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    updateData({ [e.target.name]: e.target.value });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setVisionImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAutoFill = async () => {
    if (!visionImage) return;
    
    setIsAnalyzing(true);
    try {
      const response = await fetch('/api/vision-to-specs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: visionImage,
          mimeType: 'image/jpeg'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze image');
      }

      const specs = await response.json();
      
      const updates: Partial<TechPackData> = {};
      
      if (specs.materialComposition) updates.fabric = specs.materialComposition;
      if (specs.fabricWeight) updates.fabricWeight = specs.fabricWeight;
      if (specs.description) updates.description = specs.description;
      if (specs.category) updates.category = specs.category;
      
      if (specs.measurements && specs.measurements.length > 0) {
        const newMeasurements = specs.measurements.map((m: any, idx: number) => ({
          id: uuidv4(),
          srNo: String(idx + 1),
          description: m.description || '',
          tol: m.tol || '+/- 0.5',
          s: m.s || '',
          m: m.m || '',
          l: m.l || '',
          xl: m.xl || '',
          xxl: m.xxl || ''
        }));
        updates.measurements = newMeasurements;
      }
      
      if (specs.trimsAndHardware) {
         updates.trimTagline = specs.trimsAndHardware;
      }

      updateData(updates);
      setIsVisionModalOpen(false);
      setVisionImage(null);
      alert('Tech Pack successfully auto-filled from image!');
    } catch (error) {
      console.error(error);
      alert('Error analyzing image. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl relative">
      <div className="flex justify-between items-center bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
        <div>
          <h2 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
            <Sparkles size={18} className="text-indigo-600" />
            Vision AI Auto-Fill
          </h2>
          <p className="text-sm text-indigo-700/80 mt-1">Upload a garment sketch or mockup to automatically generate material specs and measurement blocks.</p>
        </div>
        <button 
          onClick={() => setIsVisionModalOpen(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
        >
          ✨ Auto-Fill Specs from Image
        </button>
      </div>

      <div>
        <h2 className="text-lg font-medium text-gray-900">General Information</h2>
        <p className="text-sm text-gray-500 mb-4">These details will populate the standard header on every page.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Brand Name</label>
          <input type="text" name="brand" value={data.brand || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm uppercase" placeholder="BUDDY ENGINEERZ" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <input type="text" name="category" value={data.category || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm uppercase" placeholder="MENSWEAR" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Date</label>
          <input type="text" name="date" value={data.date || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm uppercase" placeholder="25/05/2025" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Style No.</label>
          <input type="text" name="styleNo" value={data.styleNo || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm uppercase" placeholder="BEZ-TS-001" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Size Range</label>
          <input type="text" name="sizeRange" value={data.sizeRange || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm uppercase" placeholder="S - M - L - XL - XXL" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Version</label>
          <input type="text" name="version" value={data.version || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm uppercase" placeholder="1.0" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Style Name</label>
          <input type="text" name="styleName" value={data.styleName || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm uppercase" placeholder="BE CORE TEE" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Fit</label>
          <input type="text" name="fit" value={data.fit || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm uppercase" placeholder="REGULAR FIT" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Designer</label>
          <input type="text" name="designer" value={data.designer || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm uppercase" placeholder="BUDDY ENGINEERZ" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <input type="text" name="description" value={data.description || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm uppercase" placeholder="ROUND NECK T-SHIRT" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Fabric</label>
          <input type="text" name="fabric" value={data.fabric || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm uppercase" placeholder="100% COTTON" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Approved By</label>
          <input type="text" name="approvedBy" value={data.approvedBy || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm uppercase" placeholder="" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Season</label>
          <input type="text" name="season" value={data.season || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm uppercase" placeholder="ALL SEASON" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Fabric Weight</label>
          <input type="text" name="fabricWeight" value={data.fabricWeight || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm uppercase" placeholder="180 GSM" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Made In</label>
          <input type="text" name="madeIn" value={data.madeIn || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm uppercase" placeholder="INDIA" />
        </div>

      </div>

      {isVisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 border-none flex items-center gap-2">
                <Sparkles size={18} className="text-indigo-600" />
                Vision AI Auto-Fill
              </h3>
              <button 
                onClick={() => setIsVisionModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 flex flex-col flex-1 overflow-y-auto">
               {!visionImage ? (
                 <label className="border-2 border-dashed border-gray-300 rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition">
                    <Upload size={32} className="text-gray-400 mb-4" />
                    <span className="text-sm font-medium text-gray-600 mb-1">Click to upload image</span>
                    <span className="text-xs text-gray-400">Supported: JPG, PNG</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                 </label>
               ) : (
                 <div className="flex flex-col items-center">
                    <div className="relative w-full max-h-[300px] bg-gray-50 rounded-xl overflow-hidden border border-gray-200 mb-6 flex items-center justify-center">
                      <img src={visionImage} alt="Preview" className="max-h-[300px] object-contain" />
                      <button 
                        onClick={() => setVisionImage(null)}
                        className="absolute top-2 right-2 bg-white/80 p-2 rounded-full shadow-sm text-red-500 hover:bg-red-50"
                      >
                         <Trash2 size={16} />
                      </button>
                    </div>

                    <button
                      onClick={handleAutoFill}
                      disabled={isAnalyzing}
                      className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          Analyzing Pattern & Details...
                        </>
                      ) : (
                        <>
                          <Sparkles size={18} />
                          Generate Tech Pack Data
                        </>
                      )}
                    </button>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
