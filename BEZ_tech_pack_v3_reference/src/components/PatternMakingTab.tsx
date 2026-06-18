import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Stage, Layer, Path, Group, Text, Line } from 'react-konva';
import { TechPackData } from '../types';
import { MousePointer2, Wand2, Plus, Move, Square, Box, Trash2, BoxSelect } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Center, Environment, ContactShadows, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';

interface PatternMakingTabProps {
  data: TechPackData;
  updateData: (data: Partial<TechPackData>) => void;
}

type PatternPiece = {
  id: string;
  name: string;
  svgData: string;
  color: string;
  x: number;
  y: number;
};

// --- Stylized 3D Garment Component ---
function StylizedGarment({ measurements, color }: { measurements: any[], color: string }) {
  // Extract measurements securely
  const getMeas = (desc: string, fallback: number) => {
    const m = measurements.find(m => m.description.toLowerCase().includes(desc.toLowerCase()));
    if (m && m.m) {
       // Match first sequence of digits and optional decimals
       const match = m.m.match(/(\d+(\.\d+)?)/);
       if (match) {
           return parseFloat(match[1]);
       }
    }
    return fallback;
  };

  const chest = getMeas('chest', 20) / 10;
  const length = getMeas('length', 28) / 10;
  const sleeve = getMeas('sleeve', 8) / 10;
  const armhole = getMeas('armhole', 9) / 10;

  const chestW = Math.max(1.5, Math.min(3.5, chest));
  const torsoH = Math.max(2.0, Math.min(5, length));
  const slvL = Math.max(0.2, Math.min(2.5, sleeve));
  const slvW = Math.max(0.5, Math.min(1.5, armhole)) * 1.2;

  const capRadius = chestW/2;
  const bodyScaleZ = 0.4;

  return (
    <group position={[0, -torsoH/2, 0]}>
      {/* Main Body */}
      <mesh position={[0, torsoH/2, 0]} scale={[1, 1, bodyScaleZ]} castShadow receiveShadow>
        <cylinderGeometry args={[capRadius, capRadius * 0.95, torsoH, 32]} />
        <meshPhysicalMaterial color={color} roughness={0.8} clearcoat={0.1} />
      </mesh>

      {/* Shoulders smoothing spheres */}
      <mesh position={[-capRadius + 0.15, torsoH - 0.05, 0]} scale={[1, 0.4, bodyScaleZ]} castShadow>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshPhysicalMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh position={[capRadius - 0.15, torsoH - 0.05, 0]} scale={[1, 0.4, bodyScaleZ]} castShadow>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshPhysicalMaterial color={color} roughness={0.8} />
      </mesh>
      
      {/* Neck base slope */}
      <mesh position={[0, torsoH, 0]} scale={[1, 0.3, bodyScaleZ]} castShadow>
        <sphereGeometry args={[capRadius * 0.8, 32, 32]} />
        <meshPhysicalMaterial color={color} roughness={0.8} />
      </mesh>
      
      {/* Neck Collar */}
      <mesh position={[0, torsoH + 0.1, capRadius * bodyScaleZ * 0.3]} rotation={[Math.PI/2 - 0.15, 0, 0]} castShadow>
         <torusGeometry args={[chestW * 0.18, 0.06, 16, 32]} />
         <meshPhysicalMaterial color={color} roughness={0.9} />
      </mesh>

      {/* Inside neck hole */}
      <mesh position={[0, torsoH + 0.09, capRadius * bodyScaleZ * 0.3]} rotation={[Math.PI/2 - 0.15, 0, 0]}>
         <cylinderGeometry args={[chestW * 0.18, chestW * 0.18, 0.08, 32]} />
         <meshBasicMaterial color="#111" />
      </mesh>

      {/* Left Sleeve */}
      <mesh position={[-capRadius - slvL/2 * 0.8 + 0.1, torsoH - slvW/2 - 0.1, 0]} rotation={[0, 0, Math.PI/3]} scale={[1, 1, bodyScaleZ*1.5]} castShadow receiveShadow>
        <cylinderGeometry args={[slvW/2, slvW/2 * 0.8, slvL, 32]} />
        <meshPhysicalMaterial color={color} roughness={0.8} clearcoat={0.1} />
      </mesh>

      {/* Right Sleeve */}
      <mesh position={[capRadius + slvL/2 * 0.8 - 0.1, torsoH - slvW/2 - 0.1, 0]} rotation={[0, 0, -Math.PI/3]} scale={[1, 1, bodyScaleZ*1.5]} castShadow receiveShadow>
        <cylinderGeometry args={[slvW/2, slvW/2 * 0.8, slvL, 32]} />
        <meshPhysicalMaterial color={color} roughness={0.8} clearcoat={0.1} />
      </mesh>
    </group>
  );
}


export default function PatternMakingTab({ data, updateData }: PatternMakingTabProps) {
  const [pieces, setPieces] = useState<PatternPiece[]>(data.patternData?.pieces || []);
  const [tool, setTool] = useState<'select' | 'move'>('select');
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (containerRef.current) {
      setStageSize({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight
      });
    }
  }, [viewMode]);

  useEffect(() => {
    updateData({ patternData: { pieces } });
  }, [pieces, updateData]);

  const generateParametricPatterns = () => {
    const meas = data.measurements || [];
    
    // Extract measurements securely to avoid hallucinative parsing
    const getMeas = (desc: string, fallback: number) => {
      const m = meas.find((m: any) => m.description.toLowerCase().includes(desc.toLowerCase()));
      if (m && m.m) {
         const match = m.m.match(/(\d+(\.\d+)?)/);
         if (match) {
             return parseFloat(match[1]) * 10; // Scale for SVG canvas
         }
      }
      return fallback;
    };

    const chest = getMeas('chest', 200);
    const bodyLength = getMeas('length', 280);
    const shoulder = getMeas('shoulder', 180);
    const neckW = getMeas('neck', 70);
    const sleeveLength = Math.min(getMeas('sleeve', 90), 400); // cap unreasonable sleeve sizes
    const armhole = getMeas('armhole', 90);

    const newPieces: PatternPiece[] = [];

    // 1. Bodice Front (Half)
    const frontDrop = 40;
    newPieces.push({
      id: uuidv4(),
      name: 'Bodice Front (Cut 1 on Fold)',
      svgData: `M 0,${frontDrop} Q ${neckW/2},${frontDrop} ${neckW/2},0 L ${shoulder/2},20 Q ${shoulder/2-20},${armhole} ${chest/2},${armhole} L ${chest/2},${bodyLength} L 0,${bodyLength} Z`,
      color: '#e0e7ff',
      x: 100, y: 100
    });

    // 2. Bodice Back (Half)
    const backDrop = 15;
    newPieces.push({
      id: uuidv4(),
      name: 'Bodice Back (Cut 1 on Fold)',
      svgData: `M 0,${backDrop} Q ${neckW/2},${backDrop} ${neckW/2},0 L ${shoulder/2},20 Q ${shoulder/2-10},${armhole} ${chest/2},${armhole} L ${chest/2},${bodyLength} L 0,${bodyLength} Z`,
      color: '#e0e7ff',
      x: 250, y: 100
    });

    // 3. Sleeve
    const bicep = armhole * 1.5; // realistic bicep width is larger than armhole drop
    const capHeight = armhole * 0.6;
    const hemWidth = bicep * 0.7; // slight taper at hem
    const hemOffset = (bicep - hemWidth) / 2;
    
    newPieces.push({
      id: uuidv4(),
      name: 'Sleeve (Cut 2)',
      svgData: `M 0,${capHeight} 
                C 0,${capHeight*0.4} ${bicep*0.15},0 ${bicep*0.5},0 
                C ${bicep*0.85},0 ${bicep},${capHeight*0.4} ${bicep},${capHeight} 
                L ${bicep - hemOffset},${capHeight + sleeveLength} 
                L ${hemOffset},${capHeight + sleeveLength} 
                Z`,
      color: '#c7d2fe',
      x: 450, y: 100
    });

    // 4. Neck Rib
    newPieces.push({
      id: uuidv4(),
      name: 'Neck Rib (Cut 1)',
      svgData: `M 0,0 L ${neckW * 2.5},0 L ${neckW * 2.5},15 L 0,15 Z`,
      color: '#a5b4fc',
      x: 100, y: 450
    });

    setPieces(newPieces);
  };

  const deleteSelected = () => {
    if (selectedPieceId) {
      setPieces(pieces.filter(p => p.id !== selectedPieceId));
      setSelectedPieceId(null);
    }
  };

  const handleDragEndPiece = (e: any, pieceId: string) => {
    const x = e.target.x();
    const y = e.target.y();
    setPieces(prev => prev.map(p => p.id === pieceId ? { ...p, x, y } : p));
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">2D/3D CAD Pattern Maker</h2>
          <p className="text-sm text-gray-500">Parametric drafting engine based on Vision AI measurements.</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('2d')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${viewMode === '2d' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            2D CAD Drafting
          </button>
          <button
            onClick={() => setViewMode('3d')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${viewMode === '3d' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            3D Garment Render
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden border border-gray-200 rounded-xl relative">
        
        {/* Toolbar */}
        {viewMode === '2d' && (
          <div className="w-20 bg-gray-50 border-r border-gray-200 flex flex-col items-center py-4 gap-4 z-10 shrink-0">
            <button 
              onClick={generateParametricPatterns}
              className="p-3 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-md flex flex-col items-center gap-1 group"
              title="Magic Wand: Draft from Measurements"
            >
              <Wand2 size={24} className="group-hover:rotate-12 transition-transform" />
              <span className="text-[9px] font-bold uppercase text-center leading-tight mt-1">Auto<br/>Draft</span>
            </button>
            
            <div className="w-10 h-[2px] bg-gray-200 my-2"></div>
            
            <button 
              onClick={() => { setTool('select'); }}
              className={`p-2 rounded-lg ${tool === 'select' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:bg-gray-200'}`}
              title="Select / Move"
            >
              <MousePointer2 size={20} />
            </button>

            {selectedPieceId && (
              <>
                <div className="w-10 h-[2px] bg-gray-200 my-2"></div>
                <button 
                  onClick={deleteSelected}
                  className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                  title="Delete Selected"
                >
                  <Trash2 size={20} />
                </button>
              </>
            )}
          </div>
        )}

        {/* Work Area */}
        <div className="flex-1 w-full h-full relative bg-[#f8fafc]" ref={containerRef}>
          {viewMode === '2d' ? (
            <Stage 
              width={stageSize.width} 
              height={stageSize.height}
              onClick={(e) => {
                 if (e.target === e.target.getStage()) {
                   setSelectedPieceId(null);
                 }
              }}
            >
              {/* Engineering Grid */}
              <Layer>
                 {Array.from({ length: Math.ceil(stageSize.width / 50) }).map((_, i) => (
                    <Line key={`v${i}`} points={[i * 50, 0, i * 50, stageSize.height]} stroke="#e2e8f0" strokeWidth={1} />
                 ))}
                 {Array.from({ length: Math.ceil(stageSize.height / 50) }).map((_, i) => (
                    <Line key={`h${i}`} points={[0, i * 50, stageSize.width, i * 50]} stroke="#e2e8f0" strokeWidth={1} />
                 ))}
              </Layer>

              <Layer>
                {pieces.map((piece) => {
                  const isSelected = selectedPieceId === piece.id;

                  return (
                    <Group 
                      key={piece.id}
                      draggable={tool === 'select'}
                      x={piece.x}
                      y={piece.y}
                      onDragStart={(e) => setSelectedPieceId(piece.id)}
                      onDragEnd={(e) => handleDragEndPiece(e, piece.id)}
                      onClick={(e) => {
                        setSelectedPieceId(piece.id);
                        e.cancelBubble = true;
                      }}
                    >
                      <Path
                        data={piece.svgData}
                        fill={piece.color}
                        opacity={isSelected ? 0.9 : 0.7}
                        stroke={isSelected ? '#4f46e5' : '#475569'}
                        strokeWidth={isSelected ? 3 : 1.5}
                        shadowColor="rgba(0,0,0,0.1)"
                        shadowBlur={5}
                        shadowOffset={{ x: 2, y: 2 }}
                      />
                      <Text
                        text={piece.name}
                        x={0}
                        y={-20}
                        fontSize={14}
                        fontFamily="sans-serif"
                        fontStyle="bold"
                        fill="#334155"
                      />
                    </Group>
                  );
                })}
              </Layer>
            </Stage>
          ) : (
            <div className="w-full h-full bg-[#111827] rounded-r-xl overflow-hidden relative">
               <Canvas camera={{ position: [0, 2, 8], fov: 45 }}>
                  <color attach="background" args={['#1e293b']} />
                  <ambientLight intensity={0.5} />
                  <directionalLight position={[10, 10, 10]} intensity={1} castShadow />
                  <directionalLight position={[-10, 5, -10]} intensity={0.5} color="#4f46e5" />
                  
                  {/* Stylized Garment generation based on measurements */}
                  <Center>
                     <StylizedGarment measurements={data.measurements || []} color={data.mockups?.[0]?.color || '#ffffff'} />
                  </Center>

                  <Environment preset="city" />
                  <ContactShadows resolution={1024} scale={20} blur={2} opacity={0.5} far={10} color="#000000" position={[0, -2, 0]} />
                  <OrbitControls autoRotate autoRotateSpeed={1} minPolarAngle={Math.PI/4} maxPolarAngle={Math.PI/2 + 0.2} />
               </Canvas>
               
               <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm text-white/90 px-4 py-2 rounded-lg text-xs font-medium border border-white/10 shadow-xl">
                 <p className="font-bold mb-1 text-indigo-400">Professional 3D Garment Render</p>
                 <p>Material: MeshPhysicalMaterial (Real-world shading)</p>
                 <p>Lighting: HDRI Environment (Studio City) + Dynamics</p>
                 <p>Size: Auto-scaled via Measurement specs</p>
               </div>
            </div>
          )}

          {pieces.length === 0 && viewMode === '2d' && (
             <div className="absolute inset-0 flex flex-col justify-center items-center pointer-events-none">
                <Wand2 size={48} className="text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">Click the Magic Wand to auto-draft patterns from measurements.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
