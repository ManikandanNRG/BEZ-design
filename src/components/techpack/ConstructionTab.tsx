import React, { useCallback } from 'react';
import { TechPackData, SeamDetail } from '@/types/techpack';
import { PlusCircle, Trash2, Scissors, Paperclip } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface Props {
  data: TechPackData;
  updateData: (data: Partial<TechPackData>) => void;
}

const SEAM_TYPES = ['Overlock (3-Thread)', 'Overlock (4-Thread)', 'Safety Stitch (5-Thread)', 'Flatlock', 'French Seam', 'Clean Finish', 'Bound Seam', 'Hong Kong Finish'];
const STITCH_TYPES = ['Single Needle', 'Double Needle', 'Zig-Zag', 'Coverstitch (2-Needle)', 'Coverstitch (3-Needle)', 'Blind Hem'];
const STANDARD_SPI = ['8-10 SPI', '10-12 SPI', '12-14 SPI', '14-16 SPI'];

export default function ConstructionTab({ data, updateData }: Props) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        updateData({ constructionImage: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  }, [updateData]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.svg'] },
    multiple: false
  });

  const seamDetails = data.seamDetails || [];

  const addSeam = () => {
    const newSeam: SeamDetail = {
      id: Date.now().toString(),
      placement: '',
      seamType: SEAM_TYPES[0],
      stitchType: STITCH_TYPES[0],
      spi: STANDARD_SPI[1],
      notes: ''
    };
    updateData({ seamDetails: [...seamDetails, newSeam] });
  };

  const updateSeam = (id: string, updates: Partial<SeamDetail>) => {
    updateData({
      seamDetails: seamDetails.map(s => s.id === id ? { ...s, ...updates } : s)
    });
  };

  const removeSeam = (id: string) => {
    updateData({ seamDetails: seamDetails.filter(s => s.id !== id) });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Scissors className="text-gray-400" /> Pattern & Seam Construction</h2>
          <p className="text-gray-500">Define garment construction, seam types, and stitch details.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
        {/* Sketch Area */}
        <div className="flex flex-col h-full">
          <div className="font-bold text-[12px] uppercase mb-4 text-gray-500 tracking-wider">Construction Sketch</div>
          
          <div 
            {...getRootProps()} 
            className={`flex-1 border-2 border-dashed rounded-xl overflow-hidden relative group cursor-pointer transition-colors ${
              isDragActive ? 'border-black bg-gray-50' : data.constructionImage ? 'border-transparent' : 'border-gray-300 hover:border-gray-400 bg-gray-50'
            }`}
          >
            <input {...getInputProps()} />
            
            {data.constructionImage ? (
              <>
                <img src={data.constructionImage} alt="Construction Sketch" className="absolute inset-0 w-full h-full object-contain" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <p className="text-white font-medium px-4 py-2 bg-black/50 rounded-md">Click or drag to replace image</p>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-8 text-center child-pointer-events-none">
                <Paperclip size={48} className="mb-4 text-gray-300" />
                <p className="text-lg font-bold text-gray-600 mb-2">Upload Construction Sketch</p>
                <p className="text-sm">Drag & drop your flat vector or pattern sketch here to annotate seam placements.</p>
              </div>
            )}
          </div>
        </div>

        {/* Seam Details Table */}
        <div className="flex flex-col h-full max-h-full overflow-y-auto pr-2">
          <div className="flex justify-between items-center mb-4">
            <div className="font-bold text-[12px] uppercase text-gray-500 tracking-wider">Seam Callouts</div>
            <button onClick={addSeam} className="text-[12px] uppercase font-bold tracking-wider flex items-center gap-1 text-black hover:text-gray-600">
               <PlusCircle size={14} /> Add Detail
            </button>
          </div>

          <div className="space-y-4">
            {seamDetails.length === 0 ? (
              <div className="p-8 text-center bg-gray-50 border border-gray-200 rounded-xl text-gray-500 text-sm">
                No construction details added yet. Click "Add Detail" to begin.
              </div>
            ) : (
              seamDetails.map((seam, index) => (
                <div key={seam.id} className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden group">
                  <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex justify-between items-center">
                    <span className="font-bold text-xs uppercase tracking-wider text-gray-500">Callout #{index + 1}</span>
                    <button onClick={() => removeSeam(seam.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <div className="p-4 grid grid-cols-2 gap-4">
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Placement (e.g. Hem, Side Seam)</label>
                      <input 
                        type="text" 
                        value={seam.placement} 
                        onChange={(e) => updateSeam(seam.id, { placement: e.target.value })}
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:border-black focus:ring-1 focus:ring-black"
                        placeholder="Side Seam"
                      />
                    </div>
                    
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Seam Type</label>
                      <select 
                        value={seam.seamType} 
                        onChange={(e) => updateSeam(seam.id, { seamType: e.target.value })}
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:border-black focus:ring-1 focus:ring-black"
                      >
                        {SEAM_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                      </select>
                    </div>

                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Stitch Type</label>
                      <select 
                        value={seam.stitchType} 
                        onChange={(e) => updateSeam(seam.id, { stitchType: e.target.value })}
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:border-black focus:ring-1 focus:ring-black"
                      >
                        {STITCH_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                      </select>
                    </div>

                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">SPI (Stitches Per Inch)</label>
                      <select 
                        value={seam.spi} 
                        onChange={(e) => updateSeam(seam.id, { spi: e.target.value })}
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:border-black focus:ring-1 focus:ring-black"
                      >
                        {STANDARD_SPI.map(type => <option key={type} value={type}>{type}</option>)}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Construction Notes</label>
                      <input 
                        type="text" 
                        value={seam.notes} 
                        onChange={(e) => updateSeam(seam.id, { notes: e.target.value })}
                        className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:border-black focus:ring-1 focus:ring-black"
                        placeholder="e.g. Use DTM heavy duty thread, attach care label into left side seam."
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
