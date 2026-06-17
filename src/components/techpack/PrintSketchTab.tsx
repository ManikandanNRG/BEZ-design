import React from 'react';
import { Palette, Image as ImageIcon } from 'lucide-react';
import { TechPackData } from '@/types/techpack';
import AnnotationCanvas from './AnnotationCanvas';

interface PrintSketchTabProps {
  data: TechPackData;
  updateData: (updates: Partial<TechPackData>) => void;
}

export default function PrintSketchTab({ data, updateData }: PrintSketchTabProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold mb-6 uppercase tracking-tight">Print Design Sketch Tool</h2>
      <p className="text-sm text-gray-500 mb-6">Create a visual reference and add drawing/annotations for your print design. Upload an image and use the drawing tools to point out heights, widths, and elements like arrows or shapes.</p>

      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-4">
           <h3 className="text-sm font-bold uppercase text-gray-700">Design Canvas</h3>
           {data.printSketchBaseImage && (
               <button 
                  onClick={() => updateData({ printSketchBaseImage: undefined, printSketchImage: undefined, printSketchAnnotations: [] })}
                  className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded transition-colors font-bold uppercase"
               >
                  Clear Sketch
               </button>
           )}
        </div>
        
        {data.printSketchBaseImage ? (
           <AnnotationCanvas 
              baseImage={data.printSketchBaseImage}
              annotations={data.printSketchAnnotations || []}
              onChangeAnnotations={(anns) => updateData({ printSketchAnnotations: anns })}
              onUpdateExportImage={(dataUrl) => updateData({ printSketchImage: dataUrl })}
              onRemove={() => updateData({ printSketchBaseImage: undefined, printSketchImage: undefined, printSketchAnnotations: [] })}
           />
        ) : (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50 flex flex-col items-center justify-center hover:bg-gray-100 transition-colors relative cursor-pointer min-h-[300px]">
             <Palette className="text-gray-300 mb-4" size={48} />
             <span className="text-sm font-medium text-gray-600">Click to upload your print design / reference image</span>
             <span className="text-xs text-gray-400 mt-1">Add arrows, boxes, text and shapes easily.</span>
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
                           printSketchBaseImage: reader.result as string,
                           printSketchImage: reader.result as string,
                           printSketchAnnotations: []
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
