import React, { useState } from 'react';
import { TechPackData } from '../types';
import { ImagePlus, Trash2, PlusCircle, X } from 'lucide-react';

interface PrintTabProps {
  data: TechPackData;
  updateData: (data: Partial<TechPackData>) => void;
}

export default function PrintTab({ data, updateData }: PrintTabProps) {
  const [newColorCode, setNewColorCode] = useState('#000000');
  const [newColorName, setNewColorName] = useState('');
  const [newPantoneCode, setNewPantoneCode] = useState('');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: keyof TechPackData) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateData({ [field]: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (field: keyof TechPackData) => {
    updateData({ [field]: undefined });
  };

  const addColor = () => {
    if (!newColorName.trim()) return;
    const colors = data.printColorsList || [];
    updateData({
      printColorsList: [...colors, { colorCode: newColorCode, colorName: newColorName, pantoneCode: newPantoneCode }]
    });
    setNewColorName('');
    setNewPantoneCode('');
  };

  const removeColor = (index: number) => {
    const colors = data.printColorsList || [];
    updateData({
      printColorsList: colors.filter((_, i) => i !== index)
    });
  };

  const ImageUploader = ({ title, field, heightClass = 'h-48' }: { title: string, field: keyof TechPackData, heightClass?: string }) => {
    const isHeightFull = heightClass.includes('h-full');
    return (
      <div className={`flex flex-col space-y-2 w-full ${isHeightFull ? 'h-full min-h-0' : ''}`}>
        <label className="block text-xs font-bold text-gray-700 uppercase shrink-0">{title}</label>
        {data[field] ? (
          <div className={`relative border-2 border-gray-200 rounded-lg p-2 bg-gray-50 group flex justify-center items-center overflow-hidden w-full ${isHeightFull ? 'flex-1 min-h-0' : heightClass}`}>
            <img src={data[field] as string} alt={title} className="max-h-full max-w-full object-contain" />
            <button 
              onClick={() => removeImage(field)}
              className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-sm text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ) : (
          <div className={`relative border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors w-full flex flex-col items-center justify-center overflow-hidden ${isHeightFull ? 'flex-1 min-h-0' : heightClass}`}>
            <ImagePlus className="text-gray-400 mb-2" size={24} />
            <span className="text-xs text-gray-500">Upload Image</span>
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => handleImageUpload(e, field)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h2 className="text-lg font-medium text-gray-900">Print Details & Artwork</h2>
        <p className="text-sm text-gray-500 mb-4">Configure placement, colors, and print specifications for the design.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column: Artwork */}
        <div className="space-y-6 flex flex-col">
          <div className="bg-gray-50 p-4 border rounded-md shadow-sm">
            <h3 className="text-sm font-bold uppercase border-b pb-2 mb-4">1. Artwork Details</h3>
            <div className="flex flex-col gap-6">
              <ImageUploader title="Front Artwork" field="artworkLogo1" heightClass="h-64" />
              <ImageUploader title="Back Artwork" field="artworkLogo2" heightClass="h-64" />
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 border rounded-md shadow-sm">
            <h3 className="text-sm font-bold uppercase border-b pb-2 mb-4">2. Logo Details</h3>
            <ImageUploader title="Logo Print (Front)" field="artworkLogo3" heightClass="h-48" />
          </div>
        </div>

        {/* Right Column: Specs, Colors, Notes, Reference */}
        <div className="space-y-6 flex flex-col">

          <div className="flex gap-4 space-y-0">
            <div className="bg-gray-50 p-4 border rounded-md shadow-sm w-[60%] shrink-0">
              <h3 className="text-sm font-bold uppercase border-b pb-2 mb-4">3. Print Specification</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <label className="block text-xs font-medium text-gray-700 uppercase">Print Type</label>
                  <input type="text" value={data.printSpecType || ''} onChange={(e) => updateData({ printSpecType: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-xs" placeholder="e.g. Screen Print" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 uppercase">Print Method</label>
                  <input type="text" value={data.printSpecMethod || ''} onChange={(e) => updateData({ printSpecMethod: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-xs" placeholder="e.g. Manual Flat Bed" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 uppercase">Ink Type</label>
                  <input type="text" value={data.printSpecInkType || ''} onChange={(e) => updateData({ printSpecInkType: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-xs" placeholder="e.g. Plastisol" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 uppercase">Ink Finish</label>
                  <input type="text" value={data.printSpecInkFinish || ''} onChange={(e) => updateData({ printSpecInkFinish: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-xs" placeholder="e.g. Matte" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 uppercase">Location</label>
                  <input type="text" value={data.printSpecLocation || ''} onChange={(e) => updateData({ printSpecLocation: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-xs" placeholder="e.g. Left Chest / Back Center" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 uppercase">Colors (#)</label>
                  <input type="text" value={data.printSpecColors || ''} onChange={(e) => updateData({ printSpecColors: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-black focus:ring-black sm:text-xs" placeholder="e.g. 2 Colors" />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-4 border rounded-md shadow-sm w-[40%] shrink-0 flex flex-col">
              <h3 className="text-sm font-bold uppercase border-b pb-2 mb-4">4. Print Colors</h3>
              <div className="flex-1 overflow-y-auto space-y-2 max-h-[220px]">
                {(data.printColorsList || []).map((c, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white p-2 rounded border shadow-sm text-xs">
                    <div className="w-6 h-6 rounded border border-gray-200 flex-shrink-0" style={{ backgroundColor: c.colorCode }}></div>
                    <div className="flex-1 w-0">
                      <div className="font-bold truncate">{c.colorName}</div>
                      <div className="text-[10px] text-gray-500 truncate">{c.pantoneCode}</div>
                    </div>
                    <button onClick={() => removeColor(i)} className="text-red-500 hover:text-red-700 flex-shrink-0"><X size={14} /></button>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-xs border-t pt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <input type="color" value={newColorCode} onChange={e => setNewColorCode(e.target.value)} className="w-8 h-8 rounded shrink-0 p-0 cursor-pointer" />
                  <input type="text" placeholder="Name (e.g. White)" value={newColorName} onChange={e => setNewColorName(e.target.value)} className="flex-1 min-w-0 p-1 border rounded" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="text" placeholder="Pantone #" value={newPantoneCode} onChange={e => setNewPantoneCode(e.target.value)} className="flex-1 min-w-0 p-1 border rounded" />
                  <button onClick={addColor} className="bg-black text-white p-1 rounded hover:bg-gray-800 shrink-0"><PlusCircle size={16} /></button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 border rounded-md shadow-sm">
            <h3 className="text-sm font-bold uppercase border-b pb-2 mb-4">5. Printing Notes</h3>
            <textarea
              value={data.printingNotes || ''}
              onChange={(e) => updateData({ printingNotes: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black text-sm resize-none"
              placeholder="1. Ensure artwork placement as per measurements....&#10;2. Maintain proper registration..."
              rows={4}
            />
          </div>

          <div className="bg-gray-50 p-4 border rounded-md shadow-sm flex-1 flex flex-col min-h-[250px]">
            <h3 className="text-sm font-bold uppercase border-b pb-2 mb-4">6. Reference (Optional)</h3>
            <div className="flex-1 min-h-[150px]">
              <ImageUploader title="Reference Image" field="printReferenceImage" heightClass="h-full" />
            </div>
          </div>

        </div>

      </div>

      {/* Bottom Section: Print Placement */}
      <div className="bg-gray-50 p-4 border rounded-md shadow-sm">
        <h3 className="text-sm font-bold uppercase border-b pb-2 mb-4">7. Print Details & Placement</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ImageUploader title="Front Placement" field="printPlacementFront" heightClass="h-80" />
          <ImageUploader title="Back Placement" field="printPlacementBack" heightClass="h-80" />
        </div>
      </div>
    </div>
  );
}
