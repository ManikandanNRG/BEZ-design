import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Stage, Layer, Line, Circle, Rect, Group, Text, Path } from 'react-konva';
import { TechPackData } from '@/types/techpack';
import { MousePointer2, Plus, Move, Square, Box, Trash2, BoxSelect, Loader2, Wand2, Image, Upload } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Center, useTexture, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';

interface PatternMakingTabProps {
  data: TechPackData;
  updateData: (data: Partial<TechPackData>) => void;
}

type Point = { x: number; y: number };
type PatternPiece = {
  id: string;
  name: string;
  points?: Point[];
  svgData?: string;
  color: string;
};

export function StylizedGarment({ measurements, color }: { measurements: any[], color: string }) {
  // Extract measurements securely
  const getMeas = (desc: string, fallback: number) => {
    const m = measurements?.find((m: any) => m.description?.toLowerCase().includes(desc.toLowerCase()));
    if (m && m.m) {
       // Match first sequence of digits and optional decimals
       const match = String(m.m).match(/(\d+(\.\d+)?)/);
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
  const [tool, setTool] = useState<'select' | 'draw' | 'move'>('select');
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [isGenerating, setIsGenerating] = useState(false);
  const [modelPreference, setModelPreference] = useState<'auto' | 'gemini' | 'openai'>('auto');
  const [uploadedImage, setUploadedImage] = useState<string | null>(data.frontSketch || null);
  const [easeAllowance, setEaseAllowance] = useState<number>(2); // Default ease
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateParametricPatterns = (classification?: any) => {
    const meas = data.measurements || [];
    
    const getMeasRaw = (keywords: string[]) => {
      const m = meas.find((m: any) => {
         const desc = m.description?.toLowerCase() || '';
         return keywords.every(kw => desc.includes(kw));
      });
      if (m && m.m) {
         let valStr = String(m.m).trim();
         let val = 0;
         if (valStr.includes(' ')) {
             const parts = valStr.split(' ');
             if (parts.length === 2 && parts[1].includes('/')) {
                 val += parseFloat(parts[0]);
                 valStr = parts[1];
             }
         }
         if (valStr.includes('/')) {
             const parts = valStr.split('/');
             val += parseFloat(parts[0]) / parseFloat(parts[1]);
         } else {
             const match = valStr.match(/(\d+(\.\d+)?)/);
             if (match) val += parseFloat(match[1]);
         }
         if (val > 0) return val;
      }
      return null;
    };

    const rawLength = getMeasRaw(['front length']) || 28;
    const isCm = rawLength > 50;
    const visualScale = isCm ? 3.937 : 10; 

    const getMeas = (keywords: string[], fallbackRaw: number) => {
       const raw = getMeasRaw(keywords);
       if (raw !== null) return raw * visualScale;
       return fallbackRaw;
    };

    const chestRaw = getMeas(['chest', 'below'], isCm ? 100 : 39);
    const chestFlat = chestRaw > 260 ? chestRaw / 2 : chestRaw;
    const bodyWidth = (chestFlat / 2) + (easeAllowance * 5);

    const bodyLength = getMeas(['front length'], isCm ? 70 : 28);
    
    const shoulderRaw = getMeas(['shoulder width'], isCm ? 40 : 16);
    const shoulderFlat = shoulderRaw > 260 ? shoulderRaw / 2 : shoulderRaw;
    const halfShoulder = shoulderFlat / 2;

    const neckRaw = getMeas(['neck width'], isCm ? 18 : 7);
    const halfNeck = neckRaw / 2;

    const armholeCirc = getMeas(['armhole curve'], isCm ? 48 : 19);
    const armholeDepth = armholeCirc > 100 ? (armholeCirc / 2) * 0.85 : armholeCirc;
    
    const sleeveType = classification?.sleeveType || 'short';

    const bicepRaw = getMeas(['bicep'], isCm ? 35 : 14);
    const bicepFlat = bicepRaw > 200 ? bicepRaw / 2 : bicepRaw; 
    const bicep = bicepFlat * (sleeveType === 'long' ? 1.4 : 1.6);
    
    // Sleeve
    const sleeveLength = getMeas(['sleeve length'], isCm ? 65 : 25);
    const sleeveOpening = getMeas(['sleeve opening'], isCm ? 18 : 7);

    const newPieces = [];

    // 1. Bodice Front (Half)
    const frontDrop = Math.max(30, bodyLength * 0.1);
    const shoulderDrop = Math.max(15, armholeDepth * 0.2);
    const armholeW = bodyWidth - halfShoulder;
    
    const cp1X = halfShoulder;
    const cp1Y = shoulderDrop + (armholeDepth - shoulderDrop) * 0.6;
    const cp2X = halfShoulder - armholeW * 0.8;
    const cp2Y = armholeDepth;

    newPieces.push({
      id: uuidv4(),
      name: 'Bodice Front (Cut 1 on Fold)',
      svgData: `M 0,${frontDrop} Q ${halfNeck},${frontDrop} ${halfNeck},0 L ${halfShoulder},${shoulderDrop} C ${cp1X},${cp1Y} ${cp2X},${cp2Y} ${bodyWidth},${armholeDepth} L ${bodyWidth},${bodyLength} L 0,${bodyLength} Z`,
      color: '#c7d2fe',
      offsetX: 50, offsetY: 50
    });

    // 2. Bodice Back (Half)
    const backDrop = Math.max(15, frontDrop * 0.4);
    newPieces.push({
      id: uuidv4(),
      name: 'Bodice Back (Cut 1 on Fold)',
      svgData: `M 0,${backDrop} Q ${halfNeck * 1.1},${backDrop} ${halfNeck * 1.1},0 L ${halfShoulder},${shoulderDrop} C ${cp1X},${cp1Y} ${cp2X + 10},${cp2Y - 10} ${bodyWidth},${armholeDepth} L ${bodyWidth},${bodyLength} L 0,${bodyLength} Z`,
      color: '#e0e7ff',
      offsetX: bodyWidth + 100, offsetY: 50
    });

    if (classification?.hasSleeves !== false) {
      // 3. Sleeve
      const capHeight = armholeDepth * 0.5; // Visually proportionate cap height
      const sLen = sleeveType === 'long' ? sleeveLength : Math.min(sleeveLength, 120);
      const hemWidth = bicep * (sleeveType === 'long' ? 0.6 : 0.85); 
      const hemOffset = (bicep - hemWidth) / 2;
      
      newPieces.push({
        id: uuidv4(),
        name: `Sleeve (${sleeveType === 'long' ? 'Long' : 'Short'}) (Cut 2)`,
        svgData: sleeveType === 'long' 
          ? `M 0,${capHeight} 
             C ${bicep*0.1},${capHeight} ${bicep*0.25},0 ${bicep*0.5},0 
             C ${bicep*0.75},0 ${bicep*0.9},${capHeight} ${bicep},${capHeight} 
             L ${bicep - hemOffset},${capHeight + sLen} 
             L ${hemOffset},${capHeight + sLen} 
             Z`
          : `M 0,${capHeight} 
             C ${bicep*0.1},${capHeight} ${bicep*0.3},0 ${bicep*0.5},0 
             C ${bicep*0.7},0 ${bicep*0.9},${capHeight} ${bicep},${capHeight} 
             L ${bicep - hemOffset},${capHeight + sLen} 
             Q ${bicep/2},${capHeight + sLen + 10} ${hemOffset},${capHeight + sLen}
             Z`,
        color: '#c7d2fe',
        offsetX: 450, offsetY: 100
      });
    }

    // 4. Neck Rib (Conditional)
    if (!classification?.hasHood && classification?.garmentType !== 'hoodie') {
      newPieces.push({
        id: uuidv4(),
        name: 'Neck Rib (Cut 1)',
        svgData: `M 0,0 L ${halfNeck * 5},0 L ${halfNeck * 5},15 L 0,15 Z`,
        color: '#a5b4fc',
        offsetX: 100, offsetY: 450
      });
    }

    // 5. Hood (Optional)
    if (classification?.hasHood || classification?.garmentType === 'hoodie') {
       const hoodW = Math.max(220, bodyWidth * 1.6);
       const hoodH = Math.max(320, bodyLength * 0.8);
       newPieces.push({
         id: uuidv4(),
         name: 'Hood (Cut 2)',
         svgData: `M 0,${hoodH} L 0,${hoodH * 0.1} C 0,0 ${hoodW * 0.4},0 ${hoodW * 0.6},${hoodH * 0.1} C ${hoodW},${hoodH * 0.3} ${hoodW},${hoodH * 0.7} ${hoodW * 0.8},${hoodH} Q ${hoodW * 0.4},${hoodH + 20} 0,${hoodH} Z`,
         color: '#cbd5e1',
         offsetX: 100, offsetY: 450
       });
    }

    // 6. Kangaroo Pocket (Optional)
    if (classification?.hasPocket) {
       const pW = bodyWidth * 1.2;
       const pH = bodyLength * 0.3;
       const topW = pW * 0.5;
       const topOffset = (pW - topW) / 2;
       newPieces.push({
         id: uuidv4(),
         name: 'Kangaroo Pocket (Cut 1)',
         svgData: `M 0,${pH} L ${pW},${pH} L ${pW},${pH * 0.4} L ${pW - topOffset},0 L ${topOffset},0 L 0,${pH * 0.4} Z`,
         color: '#f1f5f9',
         offsetX: 450, offsetY: 450
       });
    }

    setPieces(newPieces as any);
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setUploadedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleFreeSewingExport = async () => {
    try {
      // Dynamically import FreeSewing to prevent SSR/bundle issues
      const brianLib = await import('@freesewing/brian');
      
      const Brian = brianLib.Brian || brianLib.default || brianLib.brian; 
      
      if (!Brian) {
         alert("FreeSewing Brian block could not be loaded.");
         return;
      }

      const meas = data.measurements || [];
      const getMeasRaw = (keywords: string[]) => {
        const m = meas.find((m: any) => {
           const desc = m.description?.toLowerCase() || '';
           return keywords.every(kw => desc.includes(kw));
        });
        if (m && m.m) {
           let valStr = String(m.m).trim();
           let val = 0;
           if (valStr.includes(' ')) {
               const parts = valStr.split(' ');
               if (parts.length === 2 && parts[1].includes('/')) {
                   val += parseFloat(parts[0]);
                   valStr = parts[1];
               }
           }
           if (valStr.includes('/')) {
               const parts = valStr.split('/');
               val += parseFloat(parts[0]) / parseFloat(parts[1]);
           } else {
               const match = valStr.match(/(\d+(\.\d+)?)/);
               if (match) val += parseFloat(match[1]);
           }
           if (val > 0) return val;
        }
        return null;
      };

      const rawLength = getMeasRaw(['front length']) || 28;
      const isCm = rawLength > 50;
      const mmScale = isCm ? 10 : 25.4;

      const getMeas = (keywords: string[], fallbackMm: number) => {
         const raw = getMeasRaw(keywords);
         if (raw !== null) return raw * mmScale;
         return fallbackMm; // Fallback is ALREADY in MM, do not multiply!
      };

      // Normalize tech pack measurements to FreeSewing human body measurements
      const chestRawMm = getMeas(['chest', 'below'], 1000);
      const chestCirc = chestRawMm < 600 ? chestRawMm * 2 : chestRawMm;

      const shoulderRawMm = getMeas(['shoulder width'], 400);
      const shoulderFlat = shoulderRawMm > 600 ? shoulderRawMm / 2 : shoulderRawMm;

      const lengthMm = getMeas(['front length'], 700);

      const neckRawMm = getMeas(['neck width'], 180);
      const neckCirc = neckRawMm < 250 ? neckRawMm * 2.2 : neckRawMm;

      const armholeCircMm = getMeas(['armhole curve'], 480);
      const armholeDepthMm = armholeCircMm > 250 ? (armholeCircMm / 2) * 0.85 : armholeCircMm;
      const waistToArmpit = Math.max(100, lengthMm - armholeDepthMm);

      const sweepRawMm = getMeas(['bottom sweep'], 1000);
      const sweepCirc = sweepRawMm < 600 ? sweepRawMm * 2 : sweepRawMm;

      const bicepRawMm = getMeas(['bicep'], 350);
      // Ensure bicep flat measurements are properly doubled to get circumference. (Threshold 250mm so 14.25" circ is NOT doubled)
      const bicepCirc = bicepRawMm < 250 ? bicepRawMm * 2 : bicepRawMm;

      // Sleeve length scaling (Hack to make Brian draft a short sleeve)
      const sleeveLengthMm = getMeas(['sleeve length'], 650);
      const sleeveOpeningMm = getMeas(['sleeve opening'], 200);
      // Ensure sleeve opening flat measurements are properly doubled
      const sleeveOpeningCirc = sleeveOpeningMm < 250 ? sleeveOpeningMm * 2 : sleeveOpeningMm;

      // Instantiate a locked Brian pattern with precise POM data
      const pattern = new Brian({
        measurements: {
          biceps: bicepCirc,
          chest: chestCirc, 
          hpsToBust: lengthMm * 0.4, 
          hpsToWaistBack: lengthMm, 
          neck: neckCirc,
          shoulderSlope: 13, 
          shoulderToShoulder: shoulderFlat,
          waistToArmpit: waistToArmpit, 
          waistToHips: 200, // REQUIRED BY BRIAN
          waist: sweepCirc,
          hips: sweepCirc,
          shoulderToElbow: sleeveLengthMm * 0.6, // Scale elbow to be above the hem
          shoulderToWrist: sleeveLengthMm, // Force Brian to end the sleeve exactly at the desired short sleeve hem
          wrist: sleeveOpeningCirc, // Use the sleeve opening as the "wrist" circumference
        },
        options: {
           // FreeSewing generates Seam Allowances perfectly
           sa: 10, // 10mm / ~3/8 inch seam allowance
        }
      });

      // Render factory SVG
      let svg = pattern.draft().render();
      // Inject CSS that overrides ANY defaults and ensures paths are not filled black
      svg = svg.replace(/<svg\b[^>]*>/, (match) => match + '<style>path, svg * { fill: none !important; stroke: black !important; stroke-width: 2px !important; }</style>');
      
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Factory_Ready_FreeSewing_${Date.now()}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (e: any) {
      console.error(e);
      alert("Error generating FreeSewing pattern. Ensure @freesewing/brian is installed. " + e.message);
    }
  };

  const exportToSVG = () => {
    let svgContent = '';
    let maxX = 0;
    let maxY = 0;

    pieces.forEach(p => {
      let maxPx = 0; let maxPy = 0;
      const pathBBoxMatch = p.svgData.match(/[\d.]+/g);
      if (pathBBoxMatch) {
        const points = pathBBoxMatch.map(Number);
        for (let i = 0; i < points.length; i += 2) {
          if (points[i] > maxPx) maxPx = points[i];
          if (points[i+1] > maxPy) maxPy = points[i+1];
        }
      }
      
      const pMaxX = p.offsetX + maxPx;
      const pMaxY = p.offsetY + maxPy;
      if (pMaxX > maxX) maxX = pMaxX;
      if (pMaxY > maxY) maxY = pMaxY;

      svgContent += `
        <g transform="translate(${p.offsetX}, ${p.offsetY})">
          <path d="${p.svgData}" fill="${p.color}" fill-opacity="0.5" stroke="#000" stroke-width="2"/>
          <text x="10" y="20" font-family="Arial" font-size="16" fill="#000">${p.name}</text>
        </g>
      `;
    });

    maxX += 100;
    maxY += 100;

    const fullSVG = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="${maxX}px" height="${maxY}px" viewBox="0 0 ${maxX} ${maxY}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#ffffff"/>
  ${svgContent}
</svg>`;

    const blob = new Blob([fullSVG], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TechPack_Pattern_${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSmartDraft = async () => {
    if (!uploadedImage) {
      alert("Please upload a reference sketch first so the AI can determine the garment style!");
      return;
    }
    
    setIsGenerating(true);
    try {
      const res = await fetch('/api/classify-garment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: uploadedImage, modelPreference })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to classify garment");
      }
      const classification = await res.json();
      generateParametricPatterns(classification);
    } catch (e: any) {
      console.error(e);
      // Don't use a blocking alert for 503s, just fallback silently or use a console warning
      const isOverloaded = e.message?.includes("503") || e.message?.includes("high demand");
      if (!isOverloaded) {
          alert("Error generating pattern: " + e.message);
      } else {
          console.warn("AI is currently overloaded. Falling back to default T-Shirt pattern.");
      }
      // Fallback to default
      generateParametricPatterns();
    } finally {
      setIsGenerating(false);
    }
  };
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (containerRef.current) {
      setStageSize({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight
      });
    }
  }, []);

  useEffect(() => {
    updateData({ patternData: { pieces } });
  }, [pieces, updateData]);

  // Basic grid step
  const gridStep = 20;

  const handleStageClick = (e: any) => {
    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    if (!pointerPosition) return;
    
    // Snap to grid
    const x = Math.round(pointerPosition.x / gridStep) * gridStep;
    const y = Math.round(pointerPosition.y / gridStep) * gridStep;

    if (tool === 'draw') {
      const newPoints = [...drawingPoints, { x, y }];
      setDrawingPoints(newPoints);
    } else if (tool === 'select') {
      // If clicking on stage empty area
      if (e.target === stage) {
        setSelectedPieceId(null);
        setSelectedPointIndex(null);
      }
    }
  };

  const handleFinishDrawing = () => {
    if (drawingPoints.length > 2) {
      setPieces([...pieces, {
        id: uuidv4(),
        name: `Piece ${pieces.length + 1}`,
        points: drawingPoints,
        color: `hsl(${Math.random() * 360}, 70%, 80%)`
      }]);
    }
    setDrawingPoints([]);
    setTool('select');
  };

  const addPreset = (type: 'bodiceFront' | 'bodiceBack' | 'sleeve') => {
    let presetPoints: Point[] = [];
    const offsetX = 100;
    const offsetY = 100;
    
    if (type === 'bodiceFront') {
      presetPoints = [
        { x: 0, y: 0 }, { x: 80, y: 0 }, { x: 120, y: 40 }, 
        { x: 120, y: 200 }, { x: 0, y: 200 }, { x: -40, y: 100 }, { x: 0, y: 40 }
      ].map(p => ({ x: p.x + offsetX, y: p.y + offsetY }));
    } else if (type === 'sleeve') {
      presetPoints = [
        { x: 50, y: 0 }, { x: 100, y: 60 }, { x: 80, y: 200 }, 
        { x: 20, y: 200 }, { x: 0, y: 60 }
      ].map(p => ({ x: p.x + offsetX, y: p.y + offsetY }));
    }
    
    if (presetPoints.length > 0) {
      setPieces([...pieces, {
        id: uuidv4(),
        name: type,
        points: presetPoints,
        color: `hsl(${Math.random() * 360}, 70%, 80%)`
      }]);
    }
  };

  const deleteSelected = () => {
    if (selectedPieceId) {
      setPieces(pieces.filter(p => p.id !== selectedPieceId));
      setSelectedPieceId(null);
      setSelectedPointIndex(null);
    }
  };

  const handleDragPoint = (e: any, pieceId: string, ptIndex: number) => {
    const x = Math.round(e.target.x() / gridStep) * gridStep;
    const y = Math.round(e.target.y() / gridStep) * gridStep;

    setPieces(prev => prev.map(p => {
      if (p.id === pieceId) {
        const newPts = [...(p.points || [])];
        newPts[ptIndex] = { x, y };
        return { ...p, points: newPts };
      }
      return p;
    }));
  };
  
  const handleDragPiece = (e: any, pieceId: string) => {
    // We only drag piece if it's the whole group.
    // Actually konva handles group dragging implicitly via e.target.x() / y()
    // It's easier not to update state for group drag until dragend
  };

  const handleDragEndPiece = (e: any, pieceId: string) => {
    const newX = e.target.x();
    const newY = e.target.y();
    
    // Snap translation
    const snapX = Math.round(newX / gridStep) * gridStep;
    const snapY = Math.round(newY / gridStep) * gridStep;

    setPieces(prev => prev.map(p => {
      if (p.id === pieceId) {
        if (p.svgData) {
          // For SVG components, the position is absolute, so we set it directly.
          return {
            ...p,
            offsetX: snapX,
            offsetY: snapY
          };
        } else {
          // For custom drawn polygons, group position is kept at 0,0 and the dragged delta is applied to all points.
          return {
            ...p,
            points: (p.points || []).map(pt => ({ x: pt.x + snapX, y: pt.y + snapY }))
          };
        }
      }
      return p;
    }));
    
    // Only reset the Konva group transform for polygons
    const piece = pieces.find(p => p.id === pieceId);
    if (piece && !piece.svgData) {
      e.target.position({ x: 0, y: 0 });
    }
  };

  // Draw Grid
  const gridLines = [];
  for (let i = 0; i < stageSize.width / gridStep; i++) {
    gridLines.push(<Line key={`v${i}`} points={[i * gridStep, 0, i * gridStep, stageSize.height]} stroke="#e5e7eb" strokeWidth={1} />);
  }
  for (let i = 0; i < stageSize.height / gridStep; i++) {
    gridLines.push(<Line key={`h${i}`} points={[0, i * gridStep, stageSize.width, i * gridStep]} stroke="#e5e7eb" strokeWidth={1} />);
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">2D/3D CAD Pattern Maker</h2>
          <p className="text-sm text-gray-500">Draft flat patterns and preview them in 3D scale.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === '2d' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}
              onClick={() => setViewMode('2d')}
            >
              2D CAD Pattern
            </button>
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === '3d' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}
              onClick={() => setViewMode('3d')}
            >
              3D Garment Preview
            </button>
          </div>
          {viewMode === '2d' && (
            <div className="flex gap-2">
              <button 
                onClick={exportToSVG}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                title="Download current visual canvas"
              >
                <Upload size={16} className="rotate-180" /> Visual SVG
              </button>
              <button 
                onClick={handleFreeSewingExport}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                title="Generates a locked Factory Pattern with Seam Allowances"
              >
                <Upload size={16} className="rotate-180" /> Factory Export (FreeSewing)
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden border border-gray-200 rounded-xl relative">
        
        {/* Toolbar */}
        {viewMode === '2d' && (
          <div className="w-16 bg-gray-50 border-r border-gray-200 flex flex-col items-center py-4 gap-4 z-10">
            <button 
              onClick={() => { setTool('select'); setDrawingPoints([]); }}
              className={`p-2 rounded-lg ${tool === 'select' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:bg-gray-200'}`}
              title="Select"
            >
              <MousePointer2 size={20} />
            </button>
            <button 
              onClick={() => { setTool('draw'); setSelectedPieceId(null); setSelectedPointIndex(null); }}
              className={`p-2 rounded-lg ${tool === 'draw' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:bg-gray-200'}`}
              title="Draw Polygon"
            >
              <Plus size={20} />
            </button>
            
            <div className="w-8 h-[1px] bg-gray-300 my-2"></div>
            
            <button 
              onClick={() => addPreset('bodiceFront')}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-200"
              title="Add Bodice Front"
            >
              <Square size={20} />
            </button>
            <button 
              onClick={() => addPreset('sleeve')}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-200"
              title="Add Sleeve"
            >
              <BoxSelect size={20} />
            </button>

            <div className="w-8 h-[1px] bg-gray-300 my-2"></div>
            
            <div className="flex flex-col gap-2 items-center w-full px-2">
              <label className="text-[10px] uppercase font-bold text-gray-500 self-start">Ease Allowance: {easeAllowance}"</label>
              <input 
                type="range" 
                min="0" max="10" step="0.5" 
                value={easeAllowance}
                onChange={(e) => setEaseAllowance(parseFloat(e.target.value))}
                onMouseUp={() => generateParametricPatterns()} // Redraw when slider is released
                className="w-full h-1 accent-indigo-600" 
                title="Adjust Fit (Ease)"
              />

              <div className="w-full h-[1px] bg-gray-200 my-1"></div>

              <select
                value={modelPreference}
                onChange={(e) => setModelPreference(e.target.value as any)}
                className="w-full text-[10px] p-1 border border-gray-300 rounded focus:outline-none focus:border-indigo-500 bg-white shadow-sm"
                title="AI Model Selection"
              >
                <option value="auto">Auto (Fallback)</option>
                <option value="gemini">Gemini 1.5</option>
                <option value="openai">GPT-4o-mini</option>
              </select>
              <button 
                onClick={handleSmartDraft}
                disabled={isGenerating}
                className={`w-full flex items-center justify-center p-2 rounded-lg transition-colors ${isGenerating ? 'bg-gray-200 text-gray-400 animate-pulse' : 'text-indigo-600 hover:bg-indigo-100 bg-indigo-50'}`}
                title="✨ Smart AI Auto-Draft"
              >
                <Wand2 size={18} />
              </button>
            </div>

            {selectedPieceId && (
              <>
                <div className="w-8 h-[1px] bg-gray-300 my-2"></div>
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
        <div className="flex-1 w-full h-full relative" ref={containerRef}>
          {/* Image Upload Floating Box */}
          {viewMode === '2d' && (
            <div className="absolute top-4 right-4 z-10 bg-white shadow-lg rounded-xl border border-gray-200 p-3 w-48 flex flex-col gap-2">
              <div className="text-xs font-semibold text-gray-600 flex items-center justify-between">
                <span>Reference Image</span>
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                <button onClick={() => fileInputRef.current?.click()} className="text-indigo-600 hover:bg-indigo-50 p-1 rounded">
                  <Upload size={14} />
                </button>
              </div>
              {uploadedImage ? (
                <img src={uploadedImage} alt="Reference" className="w-full h-auto rounded border border-gray-100" />
              ) : (
                <div 
                  className="w-full h-32 bg-gray-50 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Image size={24} className="text-gray-400 mb-1" />
                  <span className="text-xs text-gray-500 text-center px-2">Upload Sketch</span>
                </div>
              )}
            </div>
          )}

          {viewMode === '2d' ? (
            <Stage 
              width={stageSize.width} 
              height={stageSize.height}
              onClick={handleStageClick}
              style={{ cursor: tool === 'draw' ? 'crosshair' : 'default', backgroundColor: '#f9fafb' }}
            >
              <Layer>
                {gridLines}
              </Layer>
              <Layer>
                {pieces.map((piece) => {
                  const flattenedPoints = (piece.points || []).flatMap(p => [p.x, p.y]);
                  const isSelected = selectedPieceId === piece.id;
                  const groupX = (piece as any).offsetX || 0;
                  const groupY = (piece as any).offsetY || 0;

                  return (
                    <Group 
                      key={piece.id}
                      x={groupX}
                      y={groupY}
                      draggable={tool === 'select'}
                      onDragStart={(e) => {
                        if (tool === 'select') setSelectedPieceId(piece.id);
                      }}
                      onDragEnd={(e) => handleDragEndPiece(e, piece.id)}
                      onClick={(e) => {
                        if (tool === 'select') {
                          setSelectedPieceId(piece.id);
                          e.cancelBubble = true;
                        }
                      }}
                    >
                      {piece.svgData ? (
                        <Path
                          data={piece.svgData}
                          fill={piece.color}
                          opacity={isSelected ? 0.8 : 0.5}
                          stroke={isSelected ? '#4f46e5' : '#6b7280'}
                          strokeWidth={isSelected ? 2 : 1}
                        />
                      ) : (
                        <Line
                          points={flattenedPoints}
                          closed
                          fill={piece.color}
                          opacity={isSelected ? 0.8 : 0.5}
                          stroke={isSelected ? '#4f46e5' : '#6b7280'}
                          strokeWidth={isSelected ? 2 : 1}
                        />
                      )}
                      <Text
                        text={piece.name}
                        x={piece.points && piece.points.length > 0 ? piece.points[0]?.x : 0}
                        y={piece.points && piece.points.length > 0 ? piece.points[0]?.y - 20 : -20}
                        fontSize={12}
                        fill="#374151"
                      />
                      {isSelected && piece.points && piece.points.map((pt, i) => (
                        <Circle
                          key={`pt-${i}`}
                          x={pt.x}
                          y={pt.y}
                          radius={6}
                          fill="#ffffff"
                          stroke="#4f46e5"
                          strokeWidth={2}
                          draggable
                          onDragMove={(e) => handleDragPoint(e, piece.id, i)}
                          onMouseDown={(e) => {
                            setSelectedPointIndex(i);
                            e.cancelBubble = true; // Prevent piece drag
                          }}
                        />
                      ))}
                    </Group>
                  );
                })}

                {/* Drawing in progress */}
                {drawingPoints.length > 0 && (
                  <Group>
                    <Line
                      points={drawingPoints.flatMap(p => [p.x, p.y])}
                      stroke="#4f46e5"
                      strokeWidth={2}
                      dash={[5, 5]}
                    />
                    {drawingPoints.map((pt, i) => (
                      <Circle key={`dpt-${i}`} x={pt.x} y={pt.y} radius={4} fill="#4f46e5" />
                    ))}
                  </Group>
                )}
              </Layer>
            </Stage>
          ) : (
            <div className="w-full h-full bg-[#111827] rounded-r-xl overflow-hidden relative">
               <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
                 <Suspense fallback={null}>
                  <ambientLight intensity={0.5} />
                  <spotLight position={[100, 200, 100]} angle={0.15} penumbra={1} intensity={1} castShadow />
                  <pointLight position={[-100, -100, -100]} intensity={0.5} />
                  <Environment preset="city" />

                  <Center>
                     <StylizedGarment measurements={data.measurements || []} color={data.mockups?.[0]?.color || '#ffffff'} />
                  </Center>
                  
                  <ContactShadows position={[0, -35, 0]} opacity={0.6} scale={50} blur={2.5} far={100} />
                  <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.5} />
                 </Suspense>
               </Canvas>
               <div className="absolute top-4 left-4 bg-black/60 text-white px-3 py-1.5 rounded-lg text-xs backdrop-blur-sm border border-white/10">
                 ✨ Professional 3D Garment Render (Parametric)
               </div>
            </div>
          )}

          {/* Draw helper UI */}
          {tool === 'draw' && viewMode === '2d' && drawingPoints.length > 0 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-lg border border-gray-200 flex items-center gap-4">
               <span className="text-sm font-medium text-gray-700">Drawing Shape ({drawingPoints.length} points)</span>
               <button 
                 onClick={handleFinishDrawing}
                 className="bg-indigo-600 text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-indigo-700"
               >
                 Finish Shape
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
