import React, { useState } from 'react';
import { TechPackData, Colorway } from '../types';
import { PlusCircle, Trash2, Palette } from 'lucide-react';

interface Props {
  data: TechPackData;
  updateData: (data: Partial<TechPackData>) => void;
}

export default function ColorwaysTab({ data, updateData }: Props) {
  const colorways = data.colorways || [];

  const addColorway = () => {
    const newColorway: Colorway = {
      id: Date.now().toString(),
      name: `Colorway ${colorways.length + 1}`,
      primaryColor: '#000000',
    };
    updateData({ colorways: [...colorways, newColorway] });
  };

  const updateColorway = (id: string, updates: Partial<Colorway>) => {
    updateData({
      colorways: colorways.map(cw => cw.id === id ? { ...cw, ...updates } : cw)
    });
  };

  const removeColorway = (id: string) => {
    if (confirm('Remove this colorway?')) {
      updateData({
        colorways: colorways.filter(cw => cw.id !== id)
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Colorways & Variations</h2>
          <p className="text-gray-500">Define the color options for this tech pack.</p>
        </div>
        <button 
          onClick={addColorway}
          className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors"
        >
          <PlusCircle size={18} />
          Add Colorway
        </button>
      </div>

      {colorways.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-gray-500 border-2 border-dashed border-gray-300 rounded-xl p-12 bg-gray-50">
          <Palette size={48} className="mb-4 text-gray-300" />
          <p className="font-medium text-gray-700">No colorways added yet.</p>
          <p className="text-sm mt-1 mb-4">Add your first color option to start building variations.</p>
          <button 
            onClick={addColorway}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
          >
            <PlusCircle size={18} />
            Add Colorway
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {colorways.map((cw, index) => (
            <div key={cw.id} className="border border-gray-200 rounded-xl p-5 bg-white shadow-sm relative group">
              <button 
                onClick={() => removeColorway(cw.id)}
                className="absolute top-4 right-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={18} />
              </button>
              
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Colorway Name</label>
                <input 
                  type="text" 
                  value={cw.name} 
                  onChange={(e) => updateColorway(cw.id, { name: e.target.value })}
                  className="w-full border-b border-gray-300 py-1 text-lg font-bold focus:outline-none focus:border-black"
                  placeholder="e.g. Midnight Black"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Primary Color</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={cw.primaryColor || '#000000'} 
                        onChange={(e) => updateColorway(cw.id, { primaryColor: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer border border-gray-300 p-0"
                      />
                      <input 
                        type="text" 
                        value={cw.primaryColor || '#000000'} 
                        onChange={(e) => updateColorway(cw.id, { primaryColor: e.target.value })}
                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm font-mono"
                        placeholder="#HEX"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Secondary / Contrast</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={cw.secondaryColor || '#ffffff'} 
                        onChange={(e) => updateColorway(cw.id, { secondaryColor: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer border border-gray-300 p-0"
                      />
                      <input 
                        type="text" 
                        value={cw.secondaryColor || '#ffffff'} 
                        onChange={(e) => updateColorway(cw.id, { secondaryColor: e.target.value })}
                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm font-mono"
                        placeholder="#HEX (Optional)"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pantone / TPG Ref</label>
                  <input 
                    type="text" 
                    value={cw.pantoneRef || ''} 
                    onChange={(e) => updateColorway(cw.id, { pantoneRef: e.target.value })}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    placeholder="e.g. 19-4052 TCX"
                  />
                </div>
              </div>

              <div className="mt-6 flex h-16 rounded-md overflow-hidden border border-gray-200">
                <div style={{ backgroundColor: cw.primaryColor }} className="flex-[2] h-full" />
                {cw.secondaryColor && (
                  <div style={{ backgroundColor: cw.secondaryColor }} className="flex-[1] h-full border-l border-white/20" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
