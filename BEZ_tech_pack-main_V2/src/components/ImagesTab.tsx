import React, { useState } from 'react';
import { TechPackData } from '../types';
import { ImagePlus, Trash2, Wand2, Loader2 } from 'lucide-react';

interface ImagesTabProps {
  data: TechPackData;
  updateData: (data: Partial<TechPackData>) => void;
}

export default function ImagesTab({ data, updateData }: ImagesTabProps) {
  const [generatingFields, setGeneratingFields] = useState<Record<string, boolean>>({});
  const [prompts, setPrompts] = useState<Record<string, string>>({});

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

  const generateImage = async (field: keyof TechPackData, title: string) => {
    const customPrompt = prompts[field];
    const promptValue = customPrompt || `A photorealistic 3D rendering of a ${data.styleName || 't-shirt'} in studio lighting, solid white background. View: ${title}. High quality apparel photography, flat lay, clothing design mockup.`;

    setGeneratingFields(prev => ({ ...prev, [field]: true }));
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptValue })
      });
      const result = await response.json();
      if (response.ok && result.imageUrl) {
        updateData({ [field]: result.imageUrl });
      } else {
        alert(result.error || 'Failed to generate image');
      }
    } catch (error) {
      console.error(error);
      alert('Error generating image');
    } finally {
      setGeneratingFields(prev => ({ ...prev, [field]: false }));
    }
  };

  const ImageUploader = ({ title, field, scaleField, scaleXField, scaleYField, description, aiEnabled = false }: { title: string, field: keyof TechPackData, scaleField?: keyof TechPackData, scaleXField?: keyof TechPackData, scaleYField?: keyof TechPackData, description?: string, aiEnabled?: boolean }) => {
    const isGenerating = generatingFields[field];
    const currentScale = scaleField ? (data[scaleField] as number || 0.9) : 1;
    const currentScaleX = scaleXField ? (data[scaleXField] as number || 1) : 1;
    const currentScaleY = scaleYField ? (data[scaleYField] as number || 1) : 1;

    return (
      <div className="flex flex-col space-y-2">
        <label className="block text-sm font-medium text-gray-700">{title}</label>
        {description && <p className="text-xs text-gray-500">{description}</p>}
        
        {data[field] ? (
          <div className="flex flex-col gap-2">
            <div className="relative border-2 border-gray-200 rounded-lg p-2 bg-gray-50 group flex justify-center items-center flex-1 min-h-[300px] overflow-hidden">
              <img 
                src={data[field] as string} 
                alt={title} 
                className="max-h-[400px] max-w-full object-contain transition-transform" 
                style={{ transform: `scale(${currentScale}) scaleX(${currentScaleX}) scaleY(${currentScaleY})` }} 
              />
              <button 
                onClick={() => removeImage(field)}
                className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-sm text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
              >
                <Trash2 size={16} />
              </button>
            </div>
            {scaleField && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 px-2 py-1 bg-white border border-gray-200 rounded-md shadow-sm">
                  <label className="text-[10px] uppercase font-bold text-gray-500 w-16">Size:</label>
                  <input 
                    type="range" 
                    min="0.5" 
                    max="2.5" 
                    step="0.05"
                    value={currentScale} 
                    onChange={(e) => updateData({ [scaleField]: parseFloat(e.target.value) })}
                    className="flex-1 accent-black h-1"
                  />
                  <span className="text-[10px] font-mono text-gray-500 w-8">{Math.round(currentScale * 100)}%</span>
                </div>
                {scaleXField && scaleYField && (
                  <div className="flex items-center gap-2 px-2 py-1 bg-white border border-gray-200 rounded-md shadow-sm">
                    <label className="text-[10px] uppercase font-bold text-gray-500 w-12">W:</label>
                    <input 
                      type="range" 
                      min="0.5" 
                      max="2.5" 
                      step="0.05"
                      value={currentScaleX} 
                      onChange={(e) => updateData({ [scaleXField]: parseFloat(e.target.value) })}
                      className="flex-1 accent-black h-1"
                    />
                    <span className="text-[10px] font-mono text-gray-500 w-8 mr-2">{Math.round(currentScaleX * 100)}%</span>
                    
                    <label className="text-[10px] uppercase font-bold text-gray-500 w-12">H:</label>
                    <input 
                      type="range" 
                      min="0.5" 
                      max="2.5" 
                      step="0.05"
                      value={currentScaleY} 
                      onChange={(e) => updateData({ [scaleYField]: parseFloat(e.target.value) })}
                      className="flex-1 accent-black h-1"
                    />
                    <span className="text-[10px] font-mono text-gray-500 w-8">{Math.round(currentScaleY * 100)}%</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 flex flex-col items-center justify-center flex-1 min-h-[300px]">
            {isGenerating ? (
              <div className="flex flex-col items-center text-gray-500">
                <Loader2 className="animate-spin mb-2" size={32} />
                <span className="text-sm">Generating AI Mockup...</span>
              </div>
            ) : (
              <>
                <label className="flex flex-col items-center justify-center cursor-pointer p-4 group z-20">
                  <div className="bg-gray-100 p-4 rounded-full group-hover:bg-gray-200 transition-colors mb-4">
                    <ImagePlus className="text-gray-500" size={32} />
                  </div>
                  <span className="text-sm font-medium text-gray-700 bg-white px-4 py-2 border border-gray-300 rounded-md shadow-sm group-hover:border-gray-400 transition-colors">Select Image from Computer</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleImageUpload(e, field)}
                    className="hidden" 
                  />
                </label>

                {aiEnabled && (
                  <div className="mt-6 w-full max-w-xs z-20 relative">
                    <div className="flex items-center text-xs text-gray-500 mb-2 before:flex-1 before:border-t before:border-gray-300 before:mr-2 after:flex-1 after:border-t after:border-gray-300 after:ml-2">OR</div>
                    <div className="flex flex-col gap-2">
                      <input 
                        type="text" 
                        placeholder={`Describe your ${title.toLowerCase()}...`}
                        value={prompts[field] || ''}
                        onChange={(e) => setPrompts(prev => ({ ...prev, [field]: e.target.value }))}
                        className="text-xs p-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-black focus:border-black outline-none w-full"
                      />
                      <button 
                        onClick={() => generateImage(field, title)}
                        className="flex items-center justify-center gap-2 w-full py-2 bg-black text-white rounded-md text-xs font-medium hover:bg-gray-800 transition-colors"
                      >
                        <Wand2 size={14} />
                        Generate with AI
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 max-w-4xl flex flex-col min-h-full">
      <div>
        <h2 className="text-lg font-medium text-gray-900">Artwork & Sketches</h2>
        <p className="text-sm text-gray-500 mb-4">Upload your brand logo and garment sketches. You can use AI to generate realistic 3D mockups for the body sketches.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
        <div className="md:col-span-2 max-w-md">
          <ImageUploader title="Brand Logo" field="logoImage" scaleField="logoScale" scaleXField="logoScaleX" scaleYField="logoScaleY" description="Appears in the header of the tech pack." />
        </div>
        
        <ImageUploader title="Front Body Sketch" field="frontSketch" scaleField="frontSketchScale" scaleXField="frontSketchScaleX" scaleYField="frontSketchScaleY" description="Realistic 3D mockup or flat sketch of the front." aiEnabled={true} />
        <ImageUploader title="Back Body Sketch" field="backSketch" scaleField="backSketchScale" scaleXField="backSketchScaleX" scaleYField="backSketchScaleY" description="Realistic 3D mockup or flat sketch of the back." aiEnabled={true} />
      </div>
    </div>
  );
}
