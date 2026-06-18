import React, { useState, useCallback } from 'react';
import { TechPackData } from '../types';
import { Sparkles, Upload, ArrowRight, Loader2, Image as ImageIcon, Download, Settings } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface Props {
  data: TechPackData;
  updateData: (data: Partial<TechPackData>) => void;
}

export default function VirtualTryOnTab({ data, updateData }: Props) {
  const [flatImage, setFlatImage] = useState<string | null>(null);
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedModel, setGeneratedModel] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('A professional fashion model wearing this exact garment in a high-end streetwear editorial photoshoot. Walking down a city street, realistic, 4k, hyper-detailed.');
  const [provider, setProvider] = useState<'gemini' | 'huggingface'>('huggingface');

  const onDropFlat = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setFlatImage(reader.result as string);
        setGeneratedModel(null);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const onDropPerson = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPersonImage(reader.result as string);
        setGeneratedModel(null);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps: getFlatRoot, getInputProps: getFlatInput, isDragActive: flatDrag } = useDropzone({
    onDrop: onDropFlat, accept: { 'image/*': ['.jpeg', '.jpg', '.png'] }, multiple: false
  });

  const { getRootProps: getPersonRoot, getInputProps: getPersonInput, isDragActive: personDrag } = useDropzone({
    onDrop: onDropPerson, accept: { 'image/*': ['.jpeg', '.jpg', '.png'] }, multiple: false
  });

  const handleGenerate = async () => {
    if (!flatImage) return;
    
    setIsGenerating(true);
    setGeneratedModel(null);

    try {
      const flatMimeTypeMatch = flatImage.match(/^data:(image\/[a-zA-Z]+);base64,/);
      const mimeType = flatMimeTypeMatch ? flatMimeTypeMatch[1] : 'image/jpeg';

      const response = await fetch('/api/generate-try-on', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageBase64: flatImage,
          personImageBase64: personImage,
          mimeType,
          prompt,
          provider
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate try-on image');
      }

      const responseData = await response.json();
      setGeneratedModel(responseData.imageUrl);
      
    } catch (error: any) {
      console.error(error);
      alert(`Generation failed: ${error.message}\n\nTip: You can select "Hugging Face (Free IDM-VTON)" from the dropdown to run without quota limits!`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedModel) return;
    const a = document.createElement('a');
    a.href = generatedModel;
    a.download = `virtual-tryon-${Date.now()}.jpg`;
    a.click();
  };

  const handleSaveToArtworks = () => {
    if (!generatedModel) return;
    updateData({ frontSketch: generatedModel, frontSketchScale: 100 });
    alert('Saved to General Artwork & Sketches!');
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="text-indigo-500" /> AI Virtual Try-On
          </h2>
          <p className="text-gray-500 mt-1">
            Upload flat-lay imagery and let AI automatically fit it onto a realistic fashion model.
          </p>
        </div>
        
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg p-1 bg-gray-50">
          <Settings size={16} className="text-gray-400 ml-2" />
          <select 
             value={provider} 
             onChange={(e) => setProvider(e.target.value as any)}
             className="bg-transparent border-none focus:ring-0 text-sm font-medium pr-8"
          >
             <option value="gemini">Gemini (Free Tier)</option>
             <option value="huggingface">Hugging Face (IDM-VTON)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full min-h-[500px]">
        {/* Left Side: Input */}
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col h-[280px]">
               <div className="font-bold text-[10px] uppercase text-gray-500 tracking-wider mb-2 border-b border-gray-200 pb-2">1. Upload Flat Garment (Required)</div>
               
               <div 
                 {...getFlatRoot()} 
                 className={`flex-1 border-2 border-dashed rounded-xl overflow-hidden relative group cursor-pointer transition-colors flex items-center justify-center bg-white ${
                   flatDrag ? 'border-indigo-500 bg-indigo-50' : flatImage ? 'border-gray-300' : 'border-gray-300 hover:border-gray-400'
                 }`}
               >
                 <input {...getFlatInput()} />
                 {flatImage ? (
                   <>
                     <img src={flatImage} alt="Flat Garment" className="w-full h-full object-contain p-2 drop-shadow-md" />
                     <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-center p-2">
                        <p className="text-white text-xs font-medium bg-black/50 rounded-md p-1">Replace</p>
                     </div>
                   </>
                 ) : (
                   <div className="text-center p-2 child-pointer-events-none">
                     <Upload size={24} className="mx-auto text-gray-300 mb-2" />
                     <p className="text-xs font-bold text-gray-600 mb-1">Garment</p>
                   </div>
                 )}
               </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col h-[280px]">
               <div className="font-bold text-[10px] uppercase text-gray-500 tracking-wider mb-2 border-b border-gray-200 pb-2">2. Upload Model Image (Hugging Face)</div>
               
               <div 
                 {...getPersonRoot()} 
                 className={`flex-1 border-2 border-dashed rounded-xl overflow-hidden relative group cursor-pointer transition-colors flex items-center justify-center bg-white ${
                   personDrag ? 'border-indigo-500 bg-indigo-50' : personImage ? 'border-gray-300' : 'border-gray-300 hover:border-gray-400'
                 }`}
               >
                 <input {...getPersonInput()} />
                 {personImage ? (
                   <>
                     <img src={personImage} alt="Person Model" className="w-full h-full object-cover" />
                     <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-center p-2">
                        <p className="text-white text-xs font-medium bg-black/50 rounded-md p-1">Replace</p>
                     </div>
                   </>
                 ) : (
                   <div className="text-center p-2 child-pointer-events-none">
                     <Upload size={24} className="mx-auto text-gray-300 mb-2" />
                     <p className="text-xs font-bold text-gray-600 mb-1">Person</p>
                     <p className="text-[9px] text-gray-400">Optional. Required for Hugging Face option.</p>
                   </div>
                 )}
               </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
               <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">3. Custom Style Prompt (Gemini Only)</label>
               <textarea 
                 value={prompt}
                 onChange={(e) => setPrompt(e.target.value)}
                 className="w-full border border-gray-300 rounded p-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 min-h-[60px]"
                 placeholder="Describe the model setting..."
               />
            </div>

            <button 
              onClick={handleGenerate}
              disabled={!flatImage || isGenerating}
              className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-lg uppercase tracking-wider transition-all shadow-md ${
                !flatImage ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' : 
                isGenerating ? 'bg-indigo-400 text-white cursor-wait' : 
                'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-lg'
              }`}
            >
              {isGenerating ? (
                <><Loader2 className="animate-spin" /> Generating AI Model...</>
              ) : (
                <>Generate Try-On <ArrowRight /></>
              )}
            </button>
          </div>
        </div>

        {/* Right Side: Output */}
        <div className="flex flex-col">
          <div className="bg-gray-100 border border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center h-full min-h-[600px] relative overflow-hidden group">
             
             {generatedModel ? (
                <>
                  <img src={generatedModel} alt="Generated Try-On" className="w-full h-full object-contain drop-shadow-xl" />
                  
                  <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button 
                       onClick={handleSaveToArtworks}
                       className="px-4 py-2 bg-white/90 backdrop-blur border border-gray-200 text-black rounded-lg flex items-center gap-2 hover:bg-gray-50 shadow-sm font-bold text-sm"
                     >
                        <ImageIcon size={16} /> Save
                     </button>
                     <button 
                       onClick={handleDownload}
                       className="px-4 py-2 bg-black/90 backdrop-blur text-white rounded-lg flex items-center gap-2 hover:bg-black shadow-sm font-bold text-sm"
                     >
                        <Download size={16} /> Download
                     </button>
                  </div>
                </>
             ) : (
                <div className="text-center p-8 max-w-sm">
                   <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-gray-200 text-indigo-200">
                      <Sparkles size={48} />
                   </div>
                   <h3 className="text-xl font-bold text-gray-400 mb-2">Awaiting Image</h3>
                   <p className="text-gray-500 text-sm">Upload a flat image on the left and click generate to visualize your product on a real model.</p>
                </div>
             )}

             {isGenerating && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10">
                   <div className="bg-white p-6 rounded-2xl shadow-2xl border border-gray-100 text-center max-w-xs w-full">
                       <Loader2 size={40} className="animate-spin text-indigo-500 mx-auto mb-4" />
                       <div className="font-bold text-lg mb-1">Stitching it together...</div>
                       <div className="text-xs text-gray-500">The AI is analyzing the flat pattern and mapping it onto a 3D figure. This takes about 10-30 seconds depending on the provider.</div>
                   </div>
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
