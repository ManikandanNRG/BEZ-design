import React from 'react';
import { TechPackData } from '../types';
import { ImagePlus, Trash2 } from 'lucide-react';

interface TrimsTabProps {
  data: TechPackData;
  updateData: (data: Partial<TechPackData>) => void;
}

export default function TrimsTab({ data, updateData }: TrimsTabProps) {
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

  const ImageUploader = ({ title, field, description }: { title: string, field: keyof TechPackData, description?: string }) => (
    <div className="flex flex-col space-y-2">
      <label className="block text-sm font-medium text-gray-700">{title}</label>
      {description && <p className="text-xs text-gray-500">{description}</p>}
      
      {data[field] ? (
        <div className="relative border-2 border-gray-200 rounded-lg p-2 bg-gray-50 group flex justify-center items-center h-48">
          <img src={data[field] as string} alt={title} className="max-h-full max-w-full object-contain" />
          <button 
            onClick={() => removeImage(field)}
            className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-sm text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ) : (
        <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors h-48 flex flex-col items-center justify-center">
          <ImagePlus className="text-gray-400 mb-2" size={24} />
          <span className="text-sm text-gray-500">Upload {title}</span>
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

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h2 className="text-lg font-medium text-gray-900">Trims, Labels & Packaging</h2>
        <p className="text-sm text-gray-500 mb-4">Upload detailed images or artwork for each trim requirement. These will be formatted onto the Trims page.</p>
      </div>

      <div>
        <h3 className="text-md font-bold mb-4 uppercase text-gray-800 border-b pb-2">1. TRIMS & LABELS</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <ImageUploader title="Main Label" field="trimMainLabel" description="Neck Label" />
          <ImageUploader title="Size Label" field="trimSizeLabel" description="Loop Fold" />
          <ImageUploader title="Wash Care Label" field="trimWashCare" />
          <ImageUploader title="Hang Tag (Front)" field="trimHangTag" />
          <ImageUploader title="Hang Tag (Back)" field="trimHangTagBack" />
          <ImageUploader title="Poly Bag" field="trimPolyBag" />
        </div>
      </div>

      <div>
        <h3 className="text-md font-bold mb-4 uppercase text-gray-800 border-b pb-2">2. ADDITIONAL PACKAGING & DETAILS</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ImageUploader title="Packing Sticker" field="trimPackingSticker" />
          <ImageUploader title="Brand Tagline" field="trimTagline" description="Optional Inner Print" />
          <ImageUploader title="Care Instructions" field="trimCare" description="Icons Reference" />
          <ImageUploader title="Thread Colors" field="trimThread" description="Main & Overlock" />
        </div>
      </div>
    </div>
  );
}
