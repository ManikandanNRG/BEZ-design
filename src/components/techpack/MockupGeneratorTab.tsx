import React, { useState, useRef, useEffect } from 'react';
import { TechPackData, MockupData } from '@/types/techpack';
import { Download, Upload, Trash2, Plus, Move, Image as ImageIcon } from 'lucide-react';
import { ChromePicker } from 'react-color';
import html2canvas from 'html2canvas';

interface MockupGeneratorTabProps {
  data: TechPackData;
  updateData: (data: Partial<TechPackData>) => void;
}

function TintedApparel({ imageUrl, color, className, style }: { imageUrl: string, color: string, className?: string, style?: React.CSSProperties }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(true);

  useEffect(() => {
    setIsProcessing(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width || 500;
        canvas.height = img.height || 500;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Draw the original image identically
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Extract RGB from color hex correctly
        let r = 255, g = 255, b = 255;
        if (color && color.startsWith('#')) {
          const hex = color.replace('#', '');
          if (hex.length === 6) {
             r = parseInt(hex.substring(0, 2), 16);
             g = parseInt(hex.substring(2, 4), 16);
             b = parseInt(hex.substring(4, 6), 16);
          }
        }
        
        // 1. Determine if this is an old Github image (which needs forced opacity)
        const isClassic = imageUrl.includes('githubusercontent');

        // 2. Flood fill to make the white background transparent (handle opaque-white mockup images)
        const width = canvas.width;
        const height = canvas.height;
        const visited = new Uint8Array(width * height);
        const stack: number[] = [];
        // Only floodfill from corners if they actually ARE background colored!
        const isBg = (idx: number) => {
           // ONLY perfect or near-perfect white background (prevent leaking into off-white shirt bodies)
           return data[idx+3] > 250 && data[idx] > 252 && data[idx+1] > 252 && data[idx+2] > 252;
        };
        
        if (isBg(0)) stack.push(0);
        if (isBg((width - 1) * 4)) stack.push(width - 1);
        if (isBg((height - 1) * width * 4)) stack.push((height - 1) * width);
        if (isBg((height * width - 1) * 4)) stack.push(height * width - 1);
        
        while(stack.length > 0) {
           const pos = stack.pop()!;
           if(visited[pos]) continue;
           visited[pos] = 1;
           
           const idx = pos * 4;
           data[idx+3] = 0; // make transparent
           
           const x = pos % width;
           const y = Math.floor(pos / width);
           
           if (x > 0 && !visited[pos - 1] && isBg((pos - 1) * 4)) stack.push(pos - 1);
           if (x < width - 1 && !visited[pos + 1] && isBg((pos + 1) * 4)) stack.push(pos + 1);
           if (y > 0 && !visited[pos - width] && isBg((pos - width) * 4)) stack.push(pos - width);
           if (y < height - 1 && !visited[pos + width] && isBg((pos + width) * 4)) stack.push(pos + width);
        }

        // 1.5. Clean isolated noise dots in the background that survived flood fill
        const isolatedDots = [];
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const pos = y * width + x;
                if (!visited[pos]) { // If it is FOREGROUND
                    let bgNeighbors = 0;
                    if (visited[pos - 1]) bgNeighbors++;
                    if (visited[pos + 1]) bgNeighbors++;
                    if (visited[pos - width]) bgNeighbors++;
                    if (visited[pos + width]) bgNeighbors++;
                    
                    if (bgNeighbors >= 3) {
                        isolatedDots.push(pos);
                    }
                }
            }
        }
        for (let i = 0; i < isolatedDots.length; i++) {
             visited[isolatedDots[i]] = 1; // Mark as background
             data[isolatedDots[i] * 4 + 3] = 0; // Transparent
        }
        
        // 2. Dilate the foreground by 1 pixel to close physical gaps between layered images
        const foregroundPixels = [];
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const pos = y * width + x;
                // If it is background (visited), but neighbors a foreground (unvisited)
                if (visited[pos]) {
                    if (!visited[pos - 1] || !visited[pos + 1] || !visited[pos - width] || !visited[pos + width]) {
                        foregroundPixels.push(pos);
                    }
                }
            }
        }
        
        // Apply dilation by inheriting from nearest foreground pixel
        for (let i = 0; i < foregroundPixels.length; i++) {
            const pos = foregroundPixels[i];
            visited[pos] = 0; // Make it foreground
            data[pos*4+3] = 255; // Make it opaque
            
            // Inherit color from the first found foreground neighbor
            let nPos = pos;
            if (!visited[pos - 1]) nPos = pos - 1;
            else if (!visited[pos + 1]) nPos = pos + 1;
            else if (!visited[pos - width]) nPos = pos - width;
            else if (!visited[pos + width]) nPos = pos + width;
            
            data[pos*4] = data[nPos*4];
            data[pos*4+1] = data[nPos*4+1];
            data[pos*4+2] = data[nPos*4+2];
        }

        // Dilate a second time for a slightly thicker overlap
        const foregroundPixels2 = [];
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const pos = y * width + x;
                if (visited[pos]) {
                    if (!visited[pos - 1] || !visited[pos + 1] || !visited[pos - width] || !visited[pos + width]) {
                        foregroundPixels2.push(pos);
                    }
                }
            }
        }
        for (let i = 0; i < foregroundPixels2.length; i++) {
            const pos = foregroundPixels2[i];
            visited[pos] = 0;
            data[pos*4+3] = 255;
            let nPos = pos;
            if (!visited[pos - 1]) nPos = pos - 1;
            else if (!visited[pos + 1]) nPos = pos + 1;
            else if (!visited[pos - width]) nPos = pos - width;
            else if (!visited[pos + width]) nPos = pos + width;
            
            data[pos*4] = data[nPos*4];
            data[pos*4+1] = data[nPos*4+1];
            data[pos*4+2] = data[nPos*4+2];
        }

        // 3. Composite the remaining transparent/grayscale pixels OVER the target color
        for (let i = 0; i < data.length; i += 4) {
           if (data[i+3] > 0) {
              const pr = data[i];
              const pg = data[i+1];
              const pb = data[i+2];
              const a = data[i+3] / 255;
              
              const max = Math.max(pr, pg, pb);
              const min = Math.min(pr, pg, pb);
              const isGrayscale = (max - min) < 60; // Tolerate large JPEG chroma artifacts
              
              if (isGrayscale) {
                  // Multiply the visual brightness with the target solid color
                  const flatBrightness = (pr / 255) * a + 1 * (1 - a);
                  data[i] = Math.round(flatBrightness * r);
                  data[i+1] = Math.round(flatBrightness * g);
                  data[i+2] = Math.round(flatBrightness * b);
              } else {
                  // Preserve colorful prints/labels
                  data[i] = Math.round(pr * a + r * (1 - a));
                  data[i+1] = Math.round(pg * a + g * (1 - a));
                  data[i+2] = Math.round(pb * a + b * (1 - a));
              }
              
              // Only make classic mockups fully opaque to avoid jagged edges on new mockups
              if (isClassic) {
                  data[i+3] = 255;
              }
           }
        }
        
        ctx.putImageData(imageData, 0, 0);
        setDataUrl(canvas.toDataURL('image/png'));
      } catch (err) {
        console.error('Canvas tinting failed', err);
        setDataUrl(imageUrl); // Fallback
      } finally {
        setIsProcessing(false);
      }
    };
    img.onerror = (e) => {
      console.error('Failed to load image for tinting', e);
      setDataUrl(imageUrl); // Fallback to untinted
      setIsProcessing(false);
    };
    // Append a cachebuster to ensure crossOrigin isn't blocked by cached version without CORS headers
    img.src = imageUrl + '?t=' + new Date().getTime();
  }, [imageUrl, color]);

  return (
    <>
      {isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-10">
           <div className="text-gray-500 font-medium text-sm flex items-center gap-2">
             <div className="w-4 h-4 border-2 border-gray-400 border-t-black rounded-full animate-spin"></div>
             Loading Base Image...
           </div>
        </div>
      )}
      <img src={dataUrl || imageUrl} className={`${className} ${isProcessing ? 'opacity-0' : 'opacity-100'}`} style={style} alt="Apparel" />
    </>
  );
}

const APPAREL_TYPES = [
  // Github types
  { id: 'tshirt_front', name: 'T-Shirt (Front)', url: 'https://raw.githubusercontent.com/luciferreeves/TShirtDesigner/master/old/img/crew_front.png' },
  { id: 'tshirt_back', name: 'T-Shirt (Back)', url: 'https://raw.githubusercontent.com/luciferreeves/TShirtDesigner/master/old/img/crew_back.png' },
  { id: 'longsleeve_front', name: 'Long Sleeve (Front)', url: 'https://raw.githubusercontent.com/luciferreeves/TShirtDesigner/master/old/img/mens_longsleeve_front.png' },
  { id: 'longsleeve_back', name: 'Long Sleeve (Back)', url: 'https://raw.githubusercontent.com/luciferreeves/TShirtDesigner/master/old/img/mens_longsleeve_back.png' },
  { id: 'hoodie_front', name: 'Hoodie (Front)', url: 'https://raw.githubusercontent.com/luciferreeves/TShirtDesigner/master/old/img/mens_hoodie_front.png' },
  { id: 'hoodie_back', name: 'Hoodie (Back)', url: 'https://raw.githubusercontent.com/luciferreeves/TShirtDesigner/master/old/img/mens_hoodie_back.png' },
  // Custom uploaded types
  { id: 'bez_round_neck_front', name: 'Round Neck Half Sleeve (Front)', url: '/bez_front.png' },
  { id: 'bez_round_neck_back', name: 'Round Neck Half Sleeve (Back)', url: '/bez_back.png' },
  { id: 'bez_round_neck_side', name: 'Round Neck Half Sleeve (Side)', url: '/bez_side.png' },
  { id: 'collar_tshirt_front', name: 'Collar T-Shirt (Front)', url: '/collar_tshirt_front.png' },
  { id: 'collar_tshirt_back', name: 'Collar T-Shirt (Back)', url: '/collar_tshirt_back.png' },
  { id: 'collar_tshirt_side', name: 'Collar T-Shirt (Side)', url: '/collar_tshirt_side.png' },
  { id: 'round_neck_full_sleeve_front', name: 'Round Neck Full Sleeve (Front)', url: '/round_neck_full_sleeve_front.png' },
  { id: 'round_neck_full_sleeve_back', name: 'Round Neck Full Sleeve (Back)', url: '/round_neck_full_sleeve_back.png' },
  { id: 'round_neck_full_sleeve_side', name: 'Round Neck Full Sleeve (Side)', url: '/round_neck_full_sleeve_side.png' },
  { id: 'bez_hoodie_front', name: 'BEZ Hoodie (Front)', url: '/bez_hoodie_front.png' },
  { id: 'bez_hoodie_back', name: 'BEZ Hoodie (Back)', url: '/bez_hoodie_back.png' },
  { id: 'bez_henley_front', name: 'Henley (Front)', url: '/bez_henley_front.png' },
  { id: 'bez_henley_back', name: 'Henley (Back)', url: '/bez_henley_back.png' },
  { id: 'bez_raglan_half_sleeve_front', name: 'Raglan Half Sleeve (Front)', url: '/bez_raglan_half_sleeve_front.png' },
  { id: 'bez_raglan_half_sleeve_back', name: 'Raglan Half Sleeve (Back)', url: '/bez_raglan_half_sleeve_back.png' },
  { id: 'bez_raglan_full_sleeve_front', name: 'Raglan Full Sleeve (Front)', url: '/bez_raglan_full_sleeve_front.png' },
  { id: 'bez_raglan_full_sleeve_back', name: 'Raglan Full Sleeve (Back)', url: '/bez_raglan_full_sleeve_back.png' },
  { id: 'bez_raglan_layered_full_front', name: 'Raglan Full Sleeve Layered (Front)', url: '/raglan_body.png.png', layerUrl: '/raglan_sleeves1.png.png' },
  { id: 'bez_raglan_layered_full_back', name: 'Raglan Full Sleeve Layered (Back)', url: '/raglan_back_body.png', layerUrl: '/raglan_sleeves1.png.png' },
  { id: 'bez_raglan_layered_half_front', name: 'Raglan Half Sleeve Layered (Front)', url: '/raglan_body.png.png', layerUrl: '/raglan_half_sleeve.png' },
  { id: 'bez_raglan_layered_half_back', name: 'Raglan Half Sleeve Layered (Back)', url: '/raglan_back_body.png', layerUrl: '/raglan_half_sleeve.png' },
];

const COLORS = [
  '#ffffff', '#f8f9fa', '#e9ecef', '#dee2e6', '#ced4da', '#adb5bd', '#6c757d', '#495057', '#343a40', '#212529', '#000000',
  '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b',
  '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412',
  '#facc15', '#eab308', '#ca8a04', '#a16207', '#854d0e',
  '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534',
  '#2dd4bf', '#14b8a6', '#0d9488', '#0f766e', '#115e59',
  '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af',
  '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6',
  '#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d'
];

export default function MockupGeneratorTab({ data, updateData }: MockupGeneratorTabProps) {
  const mockups = data.mockups || [];
  const printRef = useRef<HTMLDivElement>(null);
  
  const [activeMockupIdx, setActiveMockupIdx] = useState<number>(0);
  
  const addMockup = () => {
    const newMockup: MockupData = {
      type: 'tshirt_front',
      color: '#ffffff',
      designSize: 50,
      designX: 50,
      designY: 30,
    };
    updateData({ mockups: [...mockups, newMockup] });
    setActiveMockupIdx(mockups.length);
  };

  useEffect(() => {
    if (mockups.length === 0) {
      addMockup();
    }
  }, [mockups.length]);

  const activeMockup = mockups[activeMockupIdx];

  const updateActiveMockup = (updates: Partial<MockupData>) => {
    const newMockups = [...mockups];
    newMockups[activeMockupIdx] = { ...newMockups[activeMockupIdx], ...updates };
    updateData({ mockups: newMockups });
  };

  const removeMockup = (idx: number) => {
    const newMockups = mockups.filter((_, i) => i !== idx);
    updateData({ mockups: newMockups });
    if (activeMockupIdx >= newMockups.length) {
      setActiveMockupIdx(Math.max(0, newMockups.length - 1));
    }
  };

  if (!activeMockup) return <div className="p-8 text-center text-gray-500">Loading mockup generator...</div>;

  const currentApparel = APPAREL_TYPES.find(a => a.id === activeMockup.type) || APPAREL_TYPES[0];

  const handleDesignUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateActiveMockup({ design: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownload = async () => {
    if (!printRef.current) return;
    const canvas = await html2canvas(printRef.current, { backgroundColor: null, useCORS: true, scale: 3 });
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `mockup-${currentApparel.id}.png`;
    a.click();
  };

  const handleSaveToTechPack = async () => {
    if (!printRef.current) return;
    const canvas = await html2canvas(printRef.current, { backgroundColor: null, useCORS: true, scale: 3 });
    const url = canvas.toDataURL('image/png');
    // If it's a front mockup, save to frontSketch, else backSketch
    if (activeMockup.type.includes('front')) {
        updateData({ frontSketch: url, frontSketchScale: 100 });
    } else {
        updateData({ backSketch: url, backSketchScale: 100 });
    }
    alert('Saved to General Artwork & Sketches!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <div>
            <h2 className="text-xl font-bold font-sans">Product Mockup Generator</h2>
            <p className="text-gray-500 text-sm mt-1">Create colored visual mockups and experiment with print placements.</p>
         </div>
         <div className="flex gap-2">
           <button 
             onClick={handleSaveToTechPack}
             className="px-4 py-2 border border-blue-200 text-blue-700 bg-blue-50 rounded-lg flex items-center gap-2 hover:bg-blue-100 transition font-bold text-sm"
           >
              <ImageIcon size={16} /> Save to Artworks
           </button>
           <button 
             onClick={handleDownload}
             className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition font-bold text-sm"
           >
              <Download size={16} /> Download
           </button>
           <button 
             onClick={addMockup}
             className="px-4 py-2 bg-black text-white rounded-lg flex items-center gap-2 hover:bg-gray-800 transition font-bold text-sm"
           >
              <Plus size={16} /> Add Mockup
           </button>
         </div>
      </div>

      {mockups.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {mockups.map((m, idx) => (
            <button
              key={idx}
              onClick={() => setActiveMockupIdx(idx)}
              className={`px-4 py-2 border rounded-md whitespace-nowrap text-sm ${activeMockupIdx === idx ? 'border-black bg-gray-50 font-bold' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              Mockup {idx + 1}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Left Toolbar */}
        <div className="w-full md:w-72 flex flex-col space-y-6 shrink-0 md:h-[calc(100vh-80px)] overflow-y-auto md:sticky md:top-8 pb-4 pr-2" style={{ scrollbarWidth: 'thin' }}>
           
           {/* Apparel Selection */}
           <div className="space-y-3">
             <label className="text-sm font-bold uppercase text-gray-600">Product Style</label>
             <select
                 value={activeMockup.type}
                 onChange={(e) => updateActiveMockup({ type: e.target.value })}
                 className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-black focus:border-black sm:text-sm bg-white cursor-pointer"
             >
                 <optgroup label="T-Shirts">
                    {APPAREL_TYPES.filter(a => a.id.includes('tshirt_') && !a.id.includes('collar')).map((apparel) => (
                        <option key={apparel.id} value={apparel.id}>{apparel.name}</option>
                    ))}
                 </optgroup>
                 <optgroup label="Long Sleeves">
                    {APPAREL_TYPES.filter(a => a.id.includes('longsleeve_')).map((apparel) => (
                        <option key={apparel.id} value={apparel.id}>{apparel.name}</option>
                    ))}
                 </optgroup>
                 <optgroup label="Hoodies">
                    {APPAREL_TYPES.filter(a => a.id.includes('hoodie_')).map((apparel) => (
                        <option key={apparel.id} value={apparel.id}>{apparel.name}</option>
                    ))}
                 </optgroup>
                 <optgroup label="BEZ: Round Neck Half Sleeve">
                    {APPAREL_TYPES.filter(a => a.id.includes('bez_round_neck')).map((apparel) => (
                        <option key={apparel.id} value={apparel.id}>{apparel.name.replace('Round Neck Half Sleeve ', '')}</option>
                    ))}
                 </optgroup>
                 <optgroup label="BEZ: Collar T-Shirt">
                    {APPAREL_TYPES.filter(a => a.id.includes('collar_tshirt')).map((apparel) => (
                        <option key={apparel.id} value={apparel.id}>{apparel.name.replace('Collar T-Shirt ', '')}</option>
                    ))}
                 </optgroup>
                 <optgroup label="BEZ: Round Neck Full Sleeve">
                    {APPAREL_TYPES.filter(a => a.id.includes('round_neck_full_sleeve')).map((apparel) => (
                        <option key={apparel.id} value={apparel.id}>{apparel.name.replace('Round Neck Full Sleeve ', '')}</option>
                    ))}
                 </optgroup>
                 <optgroup label="BEZ: Hoodie">
                    {APPAREL_TYPES.filter(a => a.id === 'bez_hoodie_front' || a.id === 'bez_hoodie_back').map((apparel) => (
                        <option key={apparel.id} value={apparel.id}>{apparel.name.replace('BEZ Hoodie ', '')}</option>
                    ))}
                 </optgroup>
                 <optgroup label="BEZ: Henley">
                    {APPAREL_TYPES.filter(a => a.id.includes('bez_henley')).map((apparel) => (
                        <option key={apparel.id} value={apparel.id}>{apparel.name.replace('Henley ', '')}</option>
                    ))}
                 </optgroup>
                 <optgroup label="BEZ: Raglan Half Sleeve">
                    {APPAREL_TYPES.filter(a => a.id.includes('bez_raglan_half_sleeve')).map((apparel) => (
                        <option key={apparel.id} value={apparel.id}>{apparel.name.replace('Raglan Half Sleeve ', '')}</option>
                    ))}
                 </optgroup>
                 <optgroup label="BEZ: Raglan Full Sleeve">
                    {APPAREL_TYPES.filter(a => a.id.includes('bez_raglan_full_sleeve')).map((apparel) => (
                        <option key={apparel.id} value={apparel.id}>{apparel.name.replace('Raglan Full Sleeve ', '')}</option>
                    ))}
                 </optgroup>
                 <optgroup label="BEZ: Raglan Layered">
                    {APPAREL_TYPES.filter(a => a.id.includes('bez_raglan_layered')).map((apparel) => (
                        <option key={apparel.id} value={apparel.id}>{apparel.name}</option>
                    ))}
                 </optgroup>
             </select>
           </div>

           <hr className="border-gray-200" />

           {/* Design Overlay */}
           <div className="space-y-4">
             <div className="flex items-center justify-between">
                <label className="text-sm font-bold uppercase text-gray-600">Print Design</label>
                {activeMockup.design && (
                  <button onClick={() => updateActiveMockup({ design: undefined })} className="text-red-500 hover:underline text-xs">Remove</button>
                )}
             </div>

             {!activeMockup.design ? (
                <div className="border border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-gray-50 cursor-pointer hover:bg-gray-100 relative transition-colors">
                  <Upload size={20} className="text-gray-400 mb-2" />
                  <span className="text-xs text-center text-gray-500 font-medium">Upload Artwork</span>
                  <input type="file" accept="image/*" onChange={handleDesignUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                </div>
             ) : (
                <div className="space-y-4 bg-gray-50 p-4 border border-gray-200 rounded-lg">
                   <div className="w-full h-24 border border-gray-200 bg-white shadow-sm flex items-center justify-center p-2 rounded relative group">
                      <img src={activeMockup.design} alt="Design" className="max-w-full max-h-full object-contain" />
                       <input type="file" accept="image/*" onChange={handleDesignUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                   </div>

                   <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs text-gray-500 uppercase font-bold">
                        <span>Scale</span>
                        <span className="font-mono">{activeMockup.designSize || 50}%</span>
                      </div>
                      <input 
                         type="range" 
                         min="10" max="100" 
                         value={activeMockup.designSize || 50} 
                         onChange={(e) => updateActiveMockup({ designSize: parseInt(e.target.value) })}
                         className="w-full h-1 accent-black" 
                      />
                   </div>
                   
                   <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs text-gray-500 uppercase font-bold">
                        <span>Vertical Position</span>
                      </div>
                      <input 
                         type="range" 
                         min="10" max="90" 
                         value={activeMockup.designY || 30} 
                         onChange={(e) => updateActiveMockup({ designY: parseInt(e.target.value) })}
                         className="w-full h-1 accent-black" 
                      />
                   </div>

                   <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs text-gray-500 uppercase font-bold">
                        <span>Horizontal Position</span>
                      </div>
                      <input 
                         type="range" 
                         min="10" max="90" 
                         value={activeMockup.designX || 50} 
                         onChange={(e) => updateActiveMockup({ designX: parseInt(e.target.value) })}
                         className="w-full h-1 accent-black" 
                      />
                   </div>

                   <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs text-gray-500 uppercase font-bold">
                        <span>Opacity</span>
                        <span className="font-mono">{activeMockup.designOpacity ?? 100}%</span>
                      </div>
                      <input 
                         type="range" 
                         min="10" max="100" 
                         value={activeMockup.designOpacity ?? 100} 
                         onChange={(e) => updateActiveMockup({ designOpacity: parseInt(e.target.value) })}
                         className="w-full h-1 accent-black" 
                      />
                   </div>

                   <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs text-gray-500 uppercase font-bold">
                        <span>Rotation</span>
                        <span className="font-mono">{activeMockup.designRotation ?? 0}°</span>
                      </div>
                      <input 
                         type="range" 
                         min="-180" max="180" 
                         value={activeMockup.designRotation ?? 0} 
                         onChange={(e) => updateActiveMockup({ designRotation: parseInt(e.target.value) })}
                         className="w-full h-1 accent-black" 
                      />
                   </div>

                   <p className="text-[10px] text-gray-400 text-center uppercase tracking-wider font-bold pt-2">Drag graphic on canvas to move</p>
                </div>
             )}
           </div>

           <hr className="border-gray-200" />

           {/* Color Selection */}
           <div className="space-y-6">
             <div className="space-y-3">
               <label className="text-sm font-bold uppercase text-gray-600">Garment Body Color</label>
               <div className="flex flex-wrap gap-2 mb-4">
                 {COLORS.map(color => (
                   <button
                     key={color}
                     onClick={() => updateActiveMockup({ color })}
                     className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 flex-shrink-0 ${activeMockup.color === color ? 'border-black scale-110 shadow-md' : 'border-gray-300'}`}
                     style={{ backgroundColor: color }}
                     title={color}
                   />
                 ))}
               </div>
               <details className="group">
                 <summary className="text-xs font-bold uppercase text-gray-500 mb-2 cursor-pointer hover:text-gray-700 flex justify-between items-center list-none" style={{ listStyle: 'none' }}>
                   <span>Custom Body Color Picker</span>
                   <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-1 rounded-sm group-open:bg-gray-800 group-open:text-white transition-colors">Toggle</span>
                 </summary>
                 <div className="pt-2 flex justify-center">
                   <ChromePicker 
                      color={activeMockup.color}
                      onChange={(color) => updateActiveMockup({ color: color.hex })}
                      disableAlpha={true}
                   />
                 </div>
               </details>
             </div>

             {/* Sleeve/Secondary Color */}
             {(activeMockup.type.includes('raglan') || activeMockup.type.includes('henley')) && (
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center">
                      <label className="text-sm font-bold uppercase flex items-center gap-2 text-indigo-600">
                         Sleeve Color
                      </label>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => updateActiveMockup({ sleeveColor: color })}
                        className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 flex-shrink-0 ${(activeMockup.sleeveColor || activeMockup.color) === color ? 'border-black scale-110 shadow-md' : 'border-gray-300'}`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                  <details className="group">
                    <summary className="text-xs font-bold uppercase text-gray-500 mb-2 cursor-pointer hover:text-gray-700 flex justify-between items-center list-none" style={{ listStyle: 'none' }}>
                      <span>Custom Sleeve Color Picker</span>
                      <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-1 rounded-sm group-open:bg-gray-800 group-open:text-white transition-colors">Toggle</span>
                    </summary>
                    <div className="pt-2 flex justify-center">
                      <ChromePicker 
                        color={activeMockup.sleeveColor || activeMockup.color}
                        onChange={(color) => updateActiveMockup({ sleeveColor: color.hex })}
                        disableAlpha={true}
                      />
                    </div>
                  </details>
                </div>
             )}
           </div>

           <button onClick={() => removeMockup(activeMockupIdx)} className="w-full py-2 text-sm text-red-500 font-bold border border-red-200 hover:bg-red-50 rounded-lg transition-colors mt-auto">
             Delete Mockup View
           </button>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 bg-gray-100 rounded-lg border border-gray-200 overflow-hidden flex flex-col relative min-h-[500px] md:h-[600px] md:sticky md:top-8 self-start w-full">
           
           <div className="absolute inset-0 flex items-center justify-center p-8 bg-white" style={{ 
               backgroundImage: `repeating-linear-gradient(45deg, #f9fafb 25%, transparent 25%, transparent 75%, #f9fafb 75%, #f9fafb), repeating-linear-gradient(45deg, #f9fafb 25%, #ffffff 25%, #ffffff 75%, #f9fafb 75%, #f9fafb)`,
               backgroundPosition: `0 0, 10px 10px`,
               backgroundSize: `20px 20px`,
            }}>
              
              <div 
                ref={printRef}
                className="relative w-full max-w-[500px] aspect-square transition-all duration-300 overflow-hidden" 
              >
                  {/* Tinted Base Mockup */}
                  <TintedApparel 
                    imageUrl={currentApparel.url} 
                    color={activeMockup.color}
                    className={`absolute inset-0 w-full h-full pointer-events-none drop-shadow-lg object-contain`}
                   />
                  {/* Layered Mockup */}
                  {(currentApparel as any).layerUrl && (
                    <TintedApparel 
                      imageUrl={(currentApparel as any).layerUrl} 
                      color={activeMockup.sleeveColor || activeMockup.color}
                      className={`absolute inset-0 w-full h-full pointer-events-none object-contain`}
                      style={{ transform: currentApparel.id.includes('back') ? 'scaleX(-1)' : 'none' }}
                     />
                  )}

                  {/* Design Overlay */}
                  {activeMockup.design && (
                     <div 
                       className="absolute"
                       style={{
                         top: `${activeMockup.designY || 30}%`,
                         left: `${activeMockup.designX || 50}%`,
                         width: `${(activeMockup.designSize || 50)}%`,
                         transform: `translate(-50%, -50%) rotate(${activeMockup.designRotation ?? 0}deg)`,
                         opacity: (activeMockup.designOpacity ?? 100) / 100,
                         cursor: 'move'
                       }}
                       onMouseDown={(e) => {
                          e.preventDefault();
                          const startX = e.clientX;
                          const startY = e.clientY;
                          const startLeft = activeMockup.designX || 50;
                          const startTop = activeMockup.designY || 30;
                          
                          const handleMouseMove = (mouseEvent: MouseEvent) => {
                             const container = (e.target as HTMLElement).parentElement;
                             if (!container) return;
                             
                             const deltaX = ((mouseEvent.clientX - startX) / container.offsetWidth) * 100;
                             const deltaY = ((mouseEvent.clientY - startY) / container.offsetHeight) * 100;
                             
                             updateActiveMockup({
                               designX: Math.min(Math.max(startLeft + deltaX, 0), 100),
                               designY: Math.min(Math.max(startTop + deltaY, 0), 100)
                             });
                          };
                          
                          const handleMouseUp = () => {
                             window.removeEventListener('mousemove', handleMouseMove);
                             window.removeEventListener('mouseup', handleMouseUp);
                          };
                          
                          window.addEventListener('mousemove', handleMouseMove);
                          window.addEventListener('mouseup', handleMouseUp);
                       }}
                     >
                        <img 
                          src={activeMockup.design} 
                          alt="Print Design" 
                          className="w-full h-auto drop-shadow-md pointer-events-none" 
                        />
                        <div className="absolute inset-x-0 -top-6 flex justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <span className="bg-black text-white text-[10px] px-2 py-1 rounded font-bold uppercase whitespace-nowrap">Drag to position</span>
                        </div>
                     </div>
                  )}
              </div>

           </div>
        </div>
      </div>
    </div>
  );
}
