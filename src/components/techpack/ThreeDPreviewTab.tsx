import React, { useState } from 'react';
import { TechPackData } from '@/types/techpack';
import { Box, Play, Pause, Upload } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

interface Props {
  data: TechPackData;
  updateData: (data: Partial<TechPackData>) => void;
}

export default function ThreeDPreviewTab({ data, updateData }: Props) {
  const [isPlaying, setIsPlaying] = useState(true);
  
  // A pseudo "turntable" using the existing 2D images if no true 3D model is uploaded
  const frontImage = data.frontSketch || null;
  const backImage = data.backSketch || null;
  const sideImage = null;
  const hasImages = !!(frontImage || backImage);
  const isSimulated = !data.threeDModelUrl && hasImages;

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        updateData({ threeDModelUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png'], 'model/gltf-binary': ['.glb'] },
    multiple: false
  });

  return (
    <div className="flex flex-col h-full bg-white rounded-lg">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Box className="text-gray-400" /> 3D Preview Turntable</h2>
          <p className="text-gray-500">View your garment in 360 degrees or simulate a 3D turnaround.</p>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={() => setIsPlaying(!isPlaying)}
             className="px-4 py-2 border border-gray-300 rounded-md flex items-center gap-2 hover:bg-gray-50 transition-colors"
           >
             {isPlaying ? <Pause size={16} /> : <Play size={16} />}
             <span className="font-medium text-sm">{isPlaying ? 'Pause' : 'Play'}</span>
           </button>
        </div>
      </div>

      <div className="flex-1 rounded-2xl bg-gradient-to-b from-gray-100 to-gray-200 border border-gray-300 overflow-hidden relative shadow-inner">
        {data.threeDModelUrl ? (
          // True Model or User Uploaded Poster
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="text-center p-8 bg-white/50 backdrop-blur-md rounded-xl shadow-lg border border-white max-w-sm w-full mx-4 relative overflow-hidden">
                {/* Simulated 3D wrapper that just rotates the uploaded image as a flat plane for now if it's an image. 
                    If we had @react-three/fiber we would render an actual Canvas. */}
                <img 
                  src={data.threeDModelUrl} 
                  className={`max-w-full h-auto drop-shadow-2xl mx-auto ${isPlaying ? 'animate-spin-slow' : ''}`}
                  style={{ animationDuration: '20s' }}
                  alt="3D Preview" 
                />
                <button 
                  onClick={() => updateData({ threeDModelUrl: '' })} 
                  className="absolute top-2 right-2 text-gray-500 hover:text-black"
                >
                  <span className="text-xs font-bold uppercase tracking-wider bg-gray-100 px-2 py-1 rounded">Clear</span>
                </button>
             </div>
          </div>
        ) : isSimulated ? (
          // Simulated 2.5D CSS Turntable using the TechPack images
          <div className="w-full h-full perspective flex items-center justify-center">
            <div className={`transform-style-3d relative w-64 h-96 ${isPlaying ? 'animate-spin-3d' : ''}`} style={{ animationDuration: '15s', animationTimingFunction: 'linear', animationIterationCount: 'infinite' }}>
              
              {/* Note: In a real advanced 3D mapped sphere, we'd use complex CSS. 
                  Here we create a triangular prism using front, side, and back. */}
              
              {/* Front Face */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur border border-white/40 shadow-xl rounded-xl p-4" style={{ transform: 'translateZ(100px)' }}>
                <p className="text-[10px] uppercase font-bold text-gray-400 mb-2 tracking-widest">FRONT</p>
                {frontImage ? (
                  <img src={frontImage} alt="Front" className="object-contain h-full w-full filter drop-shadow-md" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg text-gray-400"><p className="text-xs">No Image</p></div>
                )}
              </div>

              {/* Side Face */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur border border-white/40 shadow-xl rounded-xl p-4" style={{ transform: 'rotateY(120deg) translateZ(100px)' }}>
                <p className="text-[10px] uppercase font-bold text-gray-400 mb-2 tracking-widest">SIDE</p>
                {sideImage ? (
                  <img src={sideImage} alt="Side" className="object-contain h-full w-full filter drop-shadow-md" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg text-gray-400"><p className="text-xs">No Image</p></div>
                )}
              </div>

              {/* Back Face */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur border border-white/40 shadow-xl rounded-xl p-4" style={{ transform: 'rotateY(240deg) translateZ(100px)' }}>
                <p className="text-[10px] uppercase font-bold text-gray-400 mb-2 tracking-widest">BACK</p>
                {backImage ? (
                  <img src={backImage} alt="Back" className="object-contain h-full w-full filter drop-shadow-md" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg text-gray-400"><p className="text-xs">No Image</p></div>
                )}
              </div>

            </div>
          </div>
        ) : (
          <div {...getRootProps()} className="w-full h-full flex flex-col items-center justify-center cursor-pointer group">
            <input {...getInputProps()} />
            <div className={`p-10 rounded-2xl border-2 border-dashed flex flex-col items-center transition-colors ${isDragActive ? 'bg-white/80 border-black' : 'bg-white/50 border-gray-300 group-hover:border-gray-500'}`}>
               <Upload size={48} className="text-gray-300 mb-4 group-hover:text-gray-400 transition-colors" />
               <p className="text-lg font-bold text-gray-800 mb-2">Upload 3D Asset or Render</p>
               <p className="text-sm text-gray-500 text-center max-w-sm">
                 Drag & drop a high-res turntable render. <br/> (Upload images in the Artwork tab to auto-generate a pseudo-3D turntable).
               </p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .perspective {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        @keyframes spin-3d {
          from { transform: rotateY(0deg); }
          to { transform: rotateY(360deg); }
        }
        .animate-spin-3d {
          animation-name: spin-3d;
        }
        .animate-spin-slow {
          animation: spin-3d 20s linear infinite;
        }
      `}</style>
    </div>
  );
}
