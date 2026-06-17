import React from 'react';
import { Shirt } from 'lucide-react';
import { TechPackData } from '@/types/techpack';
import AnnotationCanvas from './AnnotationCanvas';

interface GuideTabProps {
  data: TechPackData;
  updateData: (updates: Partial<TechPackData>) => void;
}

const DEFAULT_SHIRT_SVG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAwIDYwMCI+CiAgPGcgaWQ9ImZyb250IiBmaWxsPSJub25lIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+CiAgICA8cGF0aCBkPSJNIDIzMCAxNTAgUSAzMDAgMjAwIDM3MCAxNTAiLz4KICAgIDxwYXRoIGQ9Ik0gMjMwIDE1MCBDIDIzMCAxMzAgMzcwIDEzMCAzNzAgMTUwIi8+CiAgICA8cGF0aCBkPSJNIDIzMCAxNTAgTCAxNTAgMTgwIEwgMTAwIDMwMCBMIDE3MCAzMzAgTCAyMTAgMjMwIi8+CiAgICA8cGF0aCBkPSJNIDM3MCAxNTAgTCA0NTAgMTgwIEwgNTAwIDMwMCBMIDQzMCAzMzAgTCAzOTAgMjMwIi8+CiAgICA8cGF0aCBkPSJNIDIxMCAyMzAgTCAyMjAgNTAwIEwgMzgwIDUwMCBMIDM5MCAyMzAiLz4KICAgIDxwYXRoIGQ9Ik0gMjIwIDQ4MCBMIDM4MCA0ODAiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWRhc2hhcnJheT0iNiw0Ii8+CiAgICA8cGF0aCBkPSJNIDEyMCAzMTAgTCAxNjAgMzI1IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1kYXNoYXJyYXk9IjYsNCIvPgogICAgPHBhdGggZD0iTSA0NDAgMzI1IEwgNDgwIDMxMCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtZGFzaGFycmF5PSI2LDQiLz4KICAgIDx0ZXh0IHg9IjMwMCIgeT0iNTUwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIyNCIgZmlsbD0iIzY2NiIgc3Ryb2tlPSJub25lIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5GUk9OVDwvdGV4dD4KICA8L2c+CiAgPGcgaWQ9ImJhY2siIHRyYW5zZm9ybT0idHJhbnNsYXRlKDQ1MCwwKSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPgogICAgPHBhdGggZD0iTSAyMzAgMTUwIFEgMzAwIDE2MCAzNzAgMTUwIi8+CiAgICA8cGF0aCBkPSJNIDIzMCAxNTAgQyAyMzAgMTMwIDM3MCAxMzAgMzcwIDE1MCIvPgogICAgPHBhdGggZD0iTSAyMzAgMTUwIEwgMTUwIDE4MCBMIDEwMCAzMDAgTCAxNzAgMzMwIEwgMjEwIDIzMCIvPgogICAgPHBhdGggZD0iTSAzNzAgMTUwIEwgNDUwIDE4MCBMIDUwMCAzMDAgTCA0MzAgMzMwIEwgMzkwIDIzMCIvPgogICAgPHBhdGggZD0iTSAyMTAgMjMwIEwgMjIwIDUwMCBMIDM4MCA1MDAgTCAzOTAgMjMwIi8+CiAgICA8cGF0aCBkPSJNIDIyMCA0ODAgTCAzODAgNDgwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1kYXNoYXJyYXk9IjYsNCIvPgogICAgPHBhdGggZD0iTSAxMjAgMzEwIEwgMTYwIDMyNSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtZGFzaGFycmF5PSI2LDQiLz4KICAgIDxwYXRoIGQ9Ik0gNDQwIDMyNSBMIDQ4MCAzMTAiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWRhc2hhcnJheT0iNiw0Ii8+CiAgICA8dGV4dCB4PSIzMDAiIHk9IjU1MCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiM2NjYiIHN0cm9rZT0ibm9uZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+QkFDSzwvdGV4dD4KICA8L2c+Cjwvc3ZnPg==';

export default function GuideTab({ data, updateData }: GuideTabProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold mb-6 uppercase tracking-tight">Measurement Guide</h2>
      <p className="text-sm text-gray-500 mb-6">Create a visual reference for how to measure the garment. Upload an image or use the generic garment guide to annotate specific measurement points.</p>

      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-4">
           <h3 className="text-sm font-bold uppercase text-gray-700">Guide Canvas</h3>
           {!data.measurementGuideBaseImage && (
               <button 
                  onClick={() => updateData({ measurementGuideBaseImage: DEFAULT_SHIRT_SVG, measurementAnnotations: [] })}
                  className="text-xs bg-black text-white hover:bg-gray-800 px-3 py-1.5 rounded flex items-center gap-2 font-medium transition-colors"
               >
                  <Shirt size={14} /> Load Generic Garment
               </button>
           )}
        </div>
        {data.measurementGuideBaseImage ? (
           <AnnotationCanvas 
              baseImage={data.measurementGuideBaseImage}
              annotations={data.measurementAnnotations || []}
              onChangeAnnotations={(anns) => updateData({ measurementAnnotations: anns })}
              onUpdateExportImage={(dataUrl) => updateData({ measurementGuideImage: dataUrl })}
              onRemove={() => updateData({ measurementGuideBaseImage: undefined, measurementGuideImage: undefined, measurementAnnotations: [] })}
           />
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50 flex flex-col items-center justify-center hover:bg-gray-100 transition-colors relative cursor-pointer min-h-[300px]">
             <Shirt className="text-gray-300 mb-4" size={48} />
             <span className="text-sm font-medium text-gray-600">Click to upload your own outline image</span>
             <span className="text-xs text-gray-400 mt-1">or use the generic button above</span>
             <input 
               type="file" 
               accept="image/*"
               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
               onChange={(e) => {
                 const file = e.target.files?.[0];
                 if (file) {
                   const reader = new FileReader();
                   reader.onloadend = () => {
                       updateData({ 
                           measurementGuideBaseImage: reader.result as string,
                           measurementGuideImage: reader.result as string,
                           measurementAnnotations: []
                       });
                   };
                   reader.readAsDataURL(file);
                 }
               }}
             />
          </div>
        )}
      </div>
    </div>
  );
}
