import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Stage, Layer, Line, Circle, Rect, Group, Text, Path } from 'react-konva';
import { TechPackData } from '@/types/techpack';
import { MousePointer2, Plus, Move, Square, Box, Trash2, BoxSelect, Loader2, Wand2, Image, Upload } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Center, useTexture, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import { basePieces, resolveOps, resolveDimensions, buildSvgPathString, getCubicBezierLength, DimensionLine, calculateArmholeLength, solveSleeveCapHeight } from '@/lib/cad/CADKernel';
import { MeasurementMapper } from '@/lib/cad/MeasurementMapper';
import { offsetPolygon, discretizeOps, buildPolygonPathString } from '@/lib/cad/SeamOffsetter';
import { DxfSerializer } from '@/lib/cad/DxfSerializer';

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
  cutLineSvgData?: string;
  dimensionLines?: DimensionLine[];
  color: string;
  offsetX?: number;
  offsetY?: number;
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
  const [showSeamAllowance, setShowSeamAllowance] = useState<boolean>(true);
  const [seamAllowanceMm, setSeamAllowanceMm] = useState<number>(10);
  const [bottomHemAllowanceMm, setBottomHemAllowanceMm] = useState<number>(20);
  const [showSeamAudit, setShowSeamAudit] = useState<boolean>(true);
  const [garmentType, setGarmentType] = useState<'tshirt' | 'hoodie' | 'tanktop' | 'polo'>('tshirt');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const svgUploadRef = useRef<HTMLInputElement>(null);

  // Generates visual (scaled down) patterns for the Canvas
  const generateParametricPatterns = (classification?: any) => {
    const meas = data.measurements || [];
    
    // Use the robust MeasurementMapper (extracts everything normalized to MM)
    const { vars: rawVars, isCm, scale } = MeasurementMapper.extract(meas, '');
    
    // Visual rendering scale. Since rawVars are in MM, we need to scale them down for the canvas.
    const renderScale = isCm ? (5.6 / 10) : (15.0 / 25.4);

    // Scale everything for rendering
    const variables: Record<string, number> = {};
    for (const [k, v] of Object.entries(rawVars)) {
      variables[k] = v * renderScale;
    }

    // Apply ease allowance to key dimensions
    variables.halfChest += (easeAllowance * scale * renderScale * 0.25);
    variables.halfBicep += (easeAllowance * scale * renderScale * 0.1);
    variables.adjustedSleeveCap = variables.sleeveCap;
    variables.bottomHemAllowance = bottomHemAllowanceMm * (scale / (isCm ? 10 : 25.4));

    const newPieces: PatternPiece[] = [];

    // 1. Bodice Front
    const resolvedFront = resolveOps(basePieces.bodiceFront.ops, variables);
    const frontStitch = buildSvgPathString(resolvedFront);
    const frontPoints = discretizeOps(resolvedFront);
    const frontCut = showSeamAllowance 
      ? buildPolygonPathString(offsetPolygon(frontPoints, seamAllowanceMm * (scale / (isCm ? 10 : 25.4)), true))
      : undefined;

    const frontDims = basePieces.bodiceFront.dimensionLines 
      ? resolveDimensions(basePieces.bodiceFront.dimensionLines, variables, isCm, rawVars) 
      : [];

    newPieces.push({
      id: uuidv4(),
      name: 'Bodice Front (Cut 1 on Fold)',
      points: frontPoints,
      svgData: frontStitch,
      cutLineSvgData: frontCut,
      dimensionLines: frontDims,
      color: '#e0f2fe',
      offsetX: 50,
      offsetY: 50
    });

    // 2. Bodice Back
    const resolvedBack = resolveOps(basePieces.bodiceBack.ops, variables);
    const backStitch = buildSvgPathString(resolvedBack);
    const backPoints = discretizeOps(resolvedBack);
    const backCut = showSeamAllowance 
      ? buildPolygonPathString(offsetPolygon(backPoints, seamAllowanceMm * (scale / (isCm ? 10 : 25.4)), true))
      : undefined;

    const backDims = basePieces.bodiceBack.dimensionLines 
      ? resolveDimensions(basePieces.bodiceBack.dimensionLines, variables, isCm, rawVars) 
      : [];

    newPieces.push({
      id: uuidv4(),
      name: 'Bodice Back (Cut 1 on Fold)',
      points: backPoints,
      svgData: backStitch,
      cutLineSvgData: backCut,
      dimensionLines: backDims,
      color: '#f3e8ff',
      offsetX: variables.halfChest + 100,
      offsetY: 50
    });

    // Calculate dynamic armhole lengths (in render-scale units)
    const frontArmholeLen = calculateArmholeLength(resolvedFront, false);
    const backArmholeLen = calculateArmholeLength(resolvedBack, false);
    const totalArmholeLen = frontArmholeLen + backArmholeLen;
    if (totalArmholeLen > 0) {
      const W = variables.halfBicep;
      // Target length includes a standard visual ease (approx 5 pixels)
      const targetL = totalArmholeLen + 5;
      variables.adjustedSleeveCap = solveSleeveCapHeight(W, targetL);
    }

    // Calculate dynamic neck lengths in render-scale to solve for collar dimensions
    const frontNeckLen = getCubicBezierLength(resolvedFront[0].points[0], resolvedFront[1].points[0], resolvedFront[1].points[1], resolvedFront[1].points[2]);
    const backNeckLen = getCubicBezierLength(resolvedBack[0].points[0], resolvedBack[1].points[0], resolvedBack[1].points[1], resolvedBack[1].points[2]);
    variables.collarLength = 2 * (frontNeckLen + backNeckLen);
    variables.collarHeight = 3.0 * scale * renderScale; // 3 inches in render scale
    rawVars.collarLength = variables.collarLength / renderScale;
    rawVars.collarHeight = variables.collarHeight / renderScale;

    // 3. Sleeve (Symmetric) — skip for tank tops
    const hasSleeves = classification ? classification.hasSleeves !== false : garmentType !== 'tanktop';
    if (hasSleeves) {
      const isShortSleeve = variables.sleeveLength < variables.elbowPosition;
      const sleevePiece = isShortSleeve ? basePieces.sleeveShort : basePieces.sleeve;
      
      const resolvedSleeve = resolveOps(sleevePiece.ops, variables);
      const sleeveStitch = buildSvgPathString(resolvedSleeve);
      const sleevePoints = discretizeOps(resolvedSleeve);
      const sleeveCut = showSeamAllowance 
        ? buildPolygonPathString(offsetPolygon(sleevePoints, seamAllowanceMm * (scale / (isCm ? 10 : 25.4)), false))
        : undefined;

      const sleeveDims = sleevePiece.dimensionLines 
        ? resolveDimensions(sleevePiece.dimensionLines, variables, isCm, rawVars) 
        : [];

      newPieces.push({
        id: uuidv4(),
        name: sleevePiece.name,
        points: sleevePoints,
        svgData: sleeveStitch,
        cutLineSvgData: sleeveCut,
        dimensionLines: sleeveDims,
        color: '#dcfce7',
        offsetX: variables.halfChest * 2 + 150,
        offsetY: 50
      });
    }

    // 4. Hood (Conditional) — drawn when AI says hoodie OR when garment type is hoodie
    const hasHood = classification ? (classification.hasHood || classification.garmentType === 'hoodie') : garmentType === 'hoodie';
    if (hasHood) {
      const resolvedHood = resolveOps(basePieces.hood.ops, variables);
      const hoodStitch = buildSvgPathString(resolvedHood);
      const hoodPoints = discretizeOps(resolvedHood);
      const hoodCut = showSeamAllowance 
        ? buildPolygonPathString(offsetPolygon(hoodPoints, seamAllowanceMm * (scale / (isCm ? 10 : 25.4)), false))
        : undefined;

      const hoodDims = basePieces.hood.dimensionLines 
        ? resolveDimensions(basePieces.hood.dimensionLines, variables, isCm, rawVars) 
        : [];

      newPieces.push({
        id: uuidv4(),
        name: 'Hood (Cut 2 Mirrored)',
        points: hoodPoints,
        svgData: hoodStitch,
        cutLineSvgData: hoodCut,
        dimensionLines: hoodDims,
        color: '#fef08a',
        offsetX: variables.halfChest * 2 + variables.halfBicep * 2 + 200,
        offsetY: 50
      });
    }

    // 5. Collar (Conditional) — drawn when garment type is polo
    const hasCollar = garmentType === 'polo';
    if (hasCollar) {
      const resolvedCollar = resolveOps(basePieces.collar.ops, variables);
      const collarStitch = buildSvgPathString(resolvedCollar);
      const collarPoints = discretizeOps(resolvedCollar);
      const collarCut = showSeamAllowance 
        ? buildPolygonPathString(offsetPolygon(collarPoints, seamAllowanceMm * (scale / (isCm ? 10 : 25.4)), true))
        : undefined;

      const collarDims = basePieces.collar.dimensionLines 
        ? resolveDimensions(basePieces.collar.dimensionLines, variables, isCm, rawVars) 
        : [];

      newPieces.push({
        id: uuidv4(),
        name: 'Collar (Cut 1 on Fold)',
        points: collarPoints,
        svgData: collarStitch,
        cutLineSvgData: collarCut,
        dimensionLines: collarDims,
        color: '#fee2e2',
        offsetX: variables.halfChest * 2 + 150,
        offsetY: variables.sleeveLength + 150
      });
    }

    setPieces(newPieces);
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setUploadedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // NEW: Option B - Native Parametric Engine Export (100% Deterministic)
  const handleNativeExport = async () => {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      const meas = data.measurements || [];
      const availableSizes = ['s', 'm', 'l', 'xl', 'xxl'].filter(sz => meas.some(m => m[sz] && String(m[sz]).trim() !== ''));
      const sizesToGenerate = availableSizes.length > 0 ? availableSizes : ['m'];

      let firstSizeSvg = '';

      for (const sizeKey of sizesToGenerate) {
        const { vars: rawVars, isCm, scale } = MeasurementMapper.extract(meas, sizeKey);
        const variables: Record<string, number> = { ...rawVars };

        // Apply ease allowance to key dimensions
        variables.halfChest += (easeAllowance * scale * 0.25);
        variables.halfBicep += (easeAllowance * scale * 0.1);
        variables.adjustedSleeveCap = variables.sleeveCap;
        variables.bottomHemAllowance = bottomHemAllowanceMm;

        // Pre-calculate armhole lengths in MM to solve for sleeve cap height
        const preResolvedFront = resolveOps(basePieces.bodiceFront.ops, variables);
        const preResolvedBack = resolveOps(basePieces.bodiceBack.ops, variables);
        const frontArmholeLenMm = calculateArmholeLength(preResolvedFront, false);
        const backArmholeLenMm = calculateArmholeLength(preResolvedBack, false);
        const totalArmholeLenMm = frontArmholeLenMm + backArmholeLenMm;

        if (totalArmholeLenMm > 0) {
          const W_mm = variables.halfBicep;
          // Target length includes a standard 12mm industrial ease for sleeve cap easing
          const targetL_mm = totalArmholeLenMm + 12;
          variables.adjustedSleeveCap = solveSleeveCapHeight(W_mm, targetL_mm);
        }

        // Calculate dynamic neck lengths in MM to solve for collar dimensions
        const frontNeckLenMm = getCubicBezierLength(preResolvedFront[0].points[0], preResolvedFront[1].points[0], preResolvedFront[1].points[1], preResolvedFront[1].points[2]);
        const backNeckLenMm = getCubicBezierLength(preResolvedBack[0].points[0], preResolvedBack[1].points[0], preResolvedBack[1].points[1], preResolvedBack[1].points[2]);
        variables.collarLength = 2 * (frontNeckLenMm + backNeckLenMm);
        variables.collarHeight = 3.0 * scale; // 3 inches in mm
        rawVars.collarLength = variables.collarLength;
        rawVars.collarHeight = variables.collarHeight;

        // Resolve pieces for DXF and SVG — filter by garment type
        const dxfPieces = [];
        let svgContent = '';

        const allKeys = ['bodiceFront', 'bodiceBack', 'sleeve', 'hood', 'collar'];
        const keys = allKeys.filter(k => {
          if (k === 'hood' && garmentType !== 'hoodie') return false;
          if (k === 'sleeve' && garmentType === 'tanktop') return false;
          if (k === 'collar' && garmentType !== 'polo') return false;
          return true;
        });

        // Helper: convert mm back to display units for dimension labels
        const toDisplay = (mm: number) => isCm ? (mm / 10).toFixed(1) + ' cm' : (mm / 25.4).toFixed(2) + '"';

        for (const key of keys) {
          const basePiece = basePieces[key];
          const resolved = resolveOps(basePiece.ops, variables);
          const stitchPts = discretizeOps(resolved);
          
          const isOnFold = key === 'bodiceFront' || key === 'bodiceBack' || key === 'collar';
          const cutPts = offsetPolygon(stitchPts, seamAllowanceMm, isOnFold);

          dxfPieces.push({
            name: basePiece.name,
            stitchLine: stitchPts,
            cutLine: cutPts
          });

          const stitchPath = buildSvgPathString(resolved);
          const cutPath = buildPolygonPathString(cutPts);

          // Build dimension annotation lines per piece dynamically from Kernel
          let dimLines = '';
          const resolvedDims = basePiece.dimensionLines ? resolveDimensions(basePiece.dimensionLines, variables, isCm, rawVars) : [];
          
          for (const dim of resolvedDims) {
            let cx = (dim.start.x + dim.end.x) / 2;
            let cy = (dim.start.y + dim.end.y) / 2;
            let rot = 0;
            
            if (dim.axis === 'y') {
              rot = -90;
              cx += dim.offset || -15;
            } else if (dim.axis === 'x') {
              cy += dim.offset || -15;
            }

            const textWidth = dim.label.length * 6.5;
            const textHeight = 14;

            dimLines += `<line x1="${dim.start.x}" y1="${dim.start.y}" x2="${dim.end.x}" y2="${dim.end.y}" stroke="#2563eb" stroke-width="0.8" stroke-dasharray="3,2" />`;
            dimLines += `
              <g transform="translate(${cx}, ${cy}) rotate(${rot})">
                <rect x="${-textWidth / 2}" y="${-textHeight / 2}" width="${textWidth}" height="${textHeight}" fill="#ffffff" rx="2" />
                <text x="0" y="4" class="dim" text-anchor="middle">${dim.label}</text>
              </g>
            `;
          }

          svgContent += `
            <g transform="translate(${basePiece.offsetX * (scale/8.0)}, ${basePiece.offsetY * (scale/8.0)})">
              <!-- Seam Allowance / Cut Line -->
              <path d="${cutPath}" fill="none" stroke="red" stroke-width="2" stroke-dasharray="4,4" />
              <!-- Sewing Line -->
              <path d="${stitchPath}" fill="${basePiece.color}" fill-opacity="0.3" stroke="black" stroke-width="3" />
              <text x="15" y="30" font-family="Arial" font-size="16" fill="black">${basePiece.name}</text>
              <!-- Dimension Lines -->
              ${dimLines}
            </g>
          `;
        }

        // Wrap SVG
        const fullSvg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg width="${variables.halfChest * 4 + 400}px" height="${variables.bodyLength + variables.sleeveLength + 400}px" viewBox="-100 -100 ${variables.halfChest * 4 + 400} ${variables.bodyLength + variables.sleeveLength + 400}" xmlns="http://www.w3.org/2000/svg">
  <style>
    path { fill: none; stroke: black; stroke-width: 2; stroke-linejoin: round; }
    text { font-family: sans-serif; font-size: 16px; font-weight: bold; }
    .dim { font-size: 12px; fill: #666; font-weight: normal; }
  </style>
  <rect width="100%" height="100%" fill="#ffffff" />
  <text x="0" y="-50" font-size="24">CAD Pattern Draft (Size: ${sizeKey.toUpperCase()})</text>
  <text x="0" y="-20" font-size="14" fill="#666">Scale 1:1 mm | Stitch (Black) | Cut (Red Dash)</text>
  ${svgContent}
</svg>`;

        zip.file(`Native_Pattern_${sizeKey.toUpperCase()}.svg`, fullSvg);

        // Serialize to DXF-AAMA
        const dxfContent = DxfSerializer.serialize(dxfPieces);
        zip.file(`Factory_Pattern_${sizeKey.toUpperCase()}.dxf`, dxfContent);

        if (sizeKey === sizesToGenerate[0]) {
          firstSizeSvg = fullSvg;
        }
      }

      // Update Database/Context for preview rendering
      if (firstSizeSvg) {
        updateData({ ...data, patternData: { ...data.patternData, svg: firstSizeSvg } });
      }

      // Download Graded ZIP containing SVG and DXF-AAMA files
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `BEZ_CAD_Pattern_Graded_Sizes.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error(err);
      alert('Native Export failed.');
    }
  };

  
  // NEW: Option C - Master Block Database Morphing Prototype
  const handleMasterMorphUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const svgStr = event.target?.result as string;
      
      // Prototype Logic: We will stretch the master SVG based on the Chest Width difference
      // Master Chest (Assume 1000mm) -> Target Chest (e.g. 1100mm) = 1.1x scale
      
      const meas = data.measurements || [];
      const getMeasRaw = (kw: string) => {
          const m = meas.find((m: any) => (m.description?.toLowerCase() || '').includes(kw));
          if (m && m['m']) return parseFloat(String(m['m']).match(/(\d+(\.\d+)?)/)?.[1] || '0');
          return 40; // Fallback 40 inches
      };
      
      const targetChestInch = getMeasRaw('chest');
      const targetLengthInch = getMeasRaw('length');
      
      // Assume Master is 40" chest and 28" length
      const scaleX = targetChestInch / 40;
      const scaleY = targetLengthInch / 28;

      // Wrap the master SVG in a scaling group
      let morphedSvg = svgStr.replace(/viewBox="[^"]*"/i, ''); // Strip existing viewBox
      morphedSvg = morphedSvg.replace('<svg', `<svg viewBox="0 0 3000 3000"`); // Ensure big enough viewBox
      morphedSvg = morphedSvg.replace(/(<svg[^>]*>)/i, `$1 <g transform="scale(${scaleX}, ${scaleY})"> \n<!-- PROTOTYPE MORPH LOGIC APPLIED -->\n`);
      morphedSvg = morphedSvg.replace(/<\/svg>/i, '</g></svg>');

      // Download Morphed SVG
      const blob = new Blob([morphedSvg], { type: 'image/svg+xml' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Morphed_Master_Pattern.svg`;
      a.click();
      window.URL.revokeObjectURL(url);
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const handleFreeSewingExport = async () => {
    try {
      // Dynamically import FreeSewing to prevent SSR/bundle issues
      // @ts-ignore
      const brianLib = await import('@freesewing/brian');
      
      const Brian = brianLib.Brian || brianLib.default || brianLib.brian; 
      
      if (!Brian) {
         alert("FreeSewing Brian block could not be loaded.");
         return;
      }

      const meas = data.measurements || [];
      const availableSizes = ['s', 'm', 'l', 'xl', 'xxl'].filter(sz => meas.some(m => m[sz] && String(m[sz]).trim() !== ''));
      const sizesToGenerate = availableSizes.length > 0 ? availableSizes : ['m']; // fallback to 'm' if no sizes specified
      
      // Dynamically import JSZip for bundling graded patterns
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      for (const sizeKey of sizesToGenerate) {
        const getMeasRaw = (keywords: string[]) => {
          const m = meas.find((m: any) => {
             const desc = m.description?.toLowerCase() || '';
             return keywords.every(kw => desc.includes(kw));
          });
          if (m) {
             const valToParse = m[sizeKey] || m.m || m.value;
             if (valToParse) {
               let valStr = String(valToParse).trim();
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
          }
          return null;
        };

        const rawLength = getMeasRaw(['front length']) || 28;
        const isCm = rawLength > 50;
        const mmScale = isCm ? 10 : 25.4;

        const getMeasMm = (keywords: string[], fallbackMm: number) => {
           const raw = getMeasRaw(keywords);
           if (raw !== null) return raw * mmScale;
           return fallbackMm; // Fallback is ALREADY in MM, do not multiply!
        };

        // 1.5 Threshold-based normalization to ensure circumferences vs flat are mathematically stable
        const chestRawMm = getMeasMm(['chest', 'below'], 1000);
        // Chest flat is usually max 35" (889mm). If > 1200mm, it's definitely a circumference.
        const chestCirc = chestRawMm < 700 ? chestRawMm * 2 : chestRawMm;

        const shoulderRawMm = getMeasMm(['shoulder width'], 400);
        // Shoulders can be up to 30" (762mm) for extreme drop shoulders. Only halve if > 800mm
        const shoulderFlat = shoulderRawMm > 800 ? shoulderRawMm / 2 : shoulderRawMm;

        const lengthMm = getMeasMm(['front length'], 700);

        const neckRawMm = getMeasMm(['neck width'], 180);
        const neckCirc = neckRawMm < 250 ? neckRawMm * 2.2 : neckRawMm;

        const bicepRawMm = getMeasMm(['bicep'], 350);
        // Biceps flat can be up to 15" (381mm). Circumference is usually 12-30" (304-762mm).
        // Let's assume if it's < 300mm it's a flat measurement, so we double it.
        const bicepCirc = bicepRawMm < 300 ? bicepRawMm * 2 : bicepRawMm;

        const armholeRawMm = getMeasMm(['armhole curve'], 480);
        let armholeCircMm = armholeRawMm < 350 ? armholeRawMm * 2 : armholeRawMm;
        
        // Smart Check: If the Bicep is extremely wide (oversized streetwear), FreeSewing will squash the sleeve cap flat
        // because it tries to map a short armhole onto a wide bicep. We guarantee a nice cap curve here:
        if (armholeCircMm < bicepCirc * 1.15) {
            armholeCircMm = bicepCirc * 1.15;
        }

        const armholeDepthMm = (armholeCircMm / 2) * 0.85;
        const waistToArmpit = Math.max(100, lengthMm - armholeDepthMm);

        const sweepRawMm = getMeasMm(['bottom sweep'], 1000);
        const sweepCirc = sweepRawMm < 600 ? sweepRawMm * 2 : sweepRawMm;

        const sleeveLengthMm = getMeasMm(['sleeve length'], 650);
        const sleeveOpeningMm = getMeasMm(['sleeve open'], 200);
        // Smart Check: 120mm is about 4.7 inches. A full cuff is usually 7-10 inches (180-250mm).
        // If it's less than 120mm, it's definitely a flat measurement (e.g., 4 inches) and must be doubled.
        const sleeveOpeningCirc = sleeveOpeningMm < 120 ? sleeveOpeningMm * 2 : sleeveOpeningMm;

        // Custom extra pieces for Hood
        const hoodHeightRawMm = getMeasMm(['hood height from'], 350);
        const hoodWidthRawMm = getMeasMm(['hood width'], 250);

        // Instantiate a locked Brian pattern with precise POM data for THIS SIZE
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
            waistToHips: 200, 
            waist: sweepCirc,
            hips: sweepCirc,
            shoulderToElbow: sleeveLengthMm * 0.6, 
            shoulderToWrist: sleeveLengthMm, 
            wrist: sleeveOpeningCirc, 
          },
          options: {
             sa: 10,
             // CRITICAL: Garment spec sheets already include wearing ease.
             // We must force FreeSewing to 0 ease so it drafts exactly to spec.
             chestEase: 0,
             shoulderEase: 0,
             collarEase: 0,
             bicepsEase: 0,
             cuffEase: 0,
             sleevecapEase: 0,
             lengthBonus: 0,
             sleeveLengthBonus: 0,
             // CRITICAL: Disable guarantee to allow sleeve to actually taper to the wrist!
             sleeveWidthGuarantee: 0
          },
          locale: 'en'
        });

        // Render factory SVG string
        let rawSvg = pattern.draft().render();
        
        // Clean up raw translation keys that FreeSewing outputs without i18n via quick replace
        rawSvg = rawSvg.replace(/plugin-annotations:cut,1,plugin-annotations:onFold,plugin-annotations:from,plugin-annotations:fabric/gi, "Cut 1 on fold");
        rawSvg = rawSvg.replace(/plugin-annotations:cut,2,plugin-annotations:mirrored,plugin-annotations:from,plugin-annotations:fabric/gi, "Cut 2 mirrored");
        rawSvg = rawSvg.replace(/plugin-annotations:cutOnFoldAndGrainline/gi, "Cut on fold / Grainline");
        rawSvg = rawSvg.replace(/plugin-annotations:[^\s<"]+/gi, ""); 

        // Inject Custom Hood and Measurement Audit Log with classes to reposition them safely later
        const customSvgInjections = `
          <!-- Audit Log -->
          <g class="custom-injection" transform="translate(50, 50)">
            <rect x="-10" y="-20" width="350" height="180" fill="white" stroke="black"/>
            <text x="0" y="0" font-family="sans-serif" font-size="14" font-weight="bold">Measurement Audit Log:</text>
            <text x="0" y="20" font-family="sans-serif" font-size="12">Chest: ${Math.round(chestCirc)} mm (Used)</text>
            <text x="0" y="35" font-family="sans-serif" font-size="12">Shoulder: ${Math.round(shoulderFlat)} mm (Used)</text>
            <text x="0" y="50" font-family="sans-serif" font-size="12">Length: ${Math.round(lengthMm)} mm (Used)</text>
            <text x="0" y="65" font-family="sans-serif" font-size="12">Bicep: ${Math.round(bicepCirc)} mm (Used)</text>
            <text x="0" y="80" font-family="sans-serif" font-size="12">Sleeve Open: ${Math.round(sleeveOpeningCirc)} mm (Used)</text>
            <text x="0" y="95" font-family="sans-serif" font-size="12">Hood HxW: ${Math.round(hoodHeightRawMm)} x ${Math.round(hoodWidthRawMm)} mm (Used for Custom Hood)</text>
            <text x="0" y="115" font-family="sans-serif" font-size="12">Sweep: ${Math.round(sweepCirc)} mm (Used for Hem)</text>
            <text x="0" y="145" font-family="sans-serif" font-size="10" fill="red">Note: Any spec not listed here are not part of the standard block</text>
            <text x="0" y="155" font-family="sans-serif" font-size="10" fill="red">and must be drafted manually (e.g. kangaroo pockets).</text>
          </g>
          
          <!-- Custom Drawn Hood -->
          <g class="custom-injection" transform="translate(50, 300)">
            <path d="M0,${hoodHeightRawMm} L0,0 C${hoodWidthRawMm * 0.2},0 ${hoodWidthRawMm},${hoodHeightRawMm * 0.1} ${hoodWidthRawMm},${hoodHeightRawMm * 0.5} L${hoodWidthRawMm},${hoodHeightRawMm} Z" fill="none" stroke="black" stroke-width="2"/>
            <text x="${hoodWidthRawMm / 2}" y="${hoodHeightRawMm / 2}" font-family="sans-serif" font-size="14" text-anchor="middle">Hood</text>
            <text x="${hoodWidthRawMm / 2}" y="${hoodHeightRawMm / 2 + 20}" font-family="sans-serif" font-size="10" text-anchor="middle">Cut 2 ( ${Math.round(hoodWidthRawMm)}x${Math.round(hoodHeightRawMm)} mm )</text>
          </g>
        </svg>`;
        
        rawSvg = rawSvg.replace('</svg>', customSvgInjections);

        // 3. Programmatic SVG Injection Refactor (Using DOMParser)
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawSvg, 'image/svg+xml');
        const svgEl = doc.documentElement;

        // Dynamically expand the SVG canvas to safely place our Audit Log and Hood on the right side
        const vbStr = svgEl.getAttribute('viewBox');
        if (vbStr) {
           const vb = vbStr.split(/[\s,]+/).filter(Boolean).map(Number);
           const origWidth = vb.length >= 3 ? vb[2] : 1500;
           const origHeight = vb.length >= 4 ? vb[3] : 1500;
           
           svgEl.setAttribute('viewBox', `${vb[0] || 0} ${vb[1] || 0} ${origWidth + 450} ${Math.max(origHeight, hoodHeightRawMm + 300)}`);
           
           // Find our injected groups and move them to the new sidebar area
           const customGroups = doc.querySelectorAll('.custom-injection');
           if (customGroups.length >= 2) {
              customGroups[0].setAttribute('transform', `translate(${origWidth + 50}, 50)`); // Audit Log
              customGroups[1].setAttribute('transform', `translate(${origWidth + 50}, 300)`); // Hood
           }
        }

        // Update Marker sizes and paths securely
        const markerUpdates: Record<string, string> = {
          'cutonfoldFrom': 'M 0,0 L 5,-2 C 4,-1 4,1 5,2 z',
          'cutonfoldTo': 'M 0,0 L -5,-2 C -4,-1 -4,1 -5,2 z',
          'grainlineFrom': 'M -5,0 L 1,-2 C 0,-1 0,1 1,2 z',
          'grainlineTo': 'M 5,0 L -1,-2 C 0,-1 0,1 -1,2 z'
        };

        Object.entries(markerUpdates).forEach(([id, d]) => {
          const marker = doc.getElementById(id);
          if (marker) {
            marker.setAttribute('markerWidth', id.includes('cutonfold') ? '5' : '6');
            const path = marker.querySelector('path');
            if (path) path.setAttribute('d', d);
          }
        });

        // Shorten the sleeve grainline symmetrically via path modification
        const grainlineStartPaths = doc.querySelectorAll('path[marker-start="url(#grainlineFrom)"]');
        grainlineStartPaths.forEach((pathNode) => {
          const d = pathNode.getAttribute('d');
          if (d) {
            const match = d.match(/M\s*([\d.-]+)\s*,\s*([\d.-]+)\s*L\s*([\d.-]+)\s*,\s*([\d.-]+)/);
            if (match) {
              const [, x1, y1, x2, y2] = match;
              const numY1 = parseFloat(y1);
              const numY2 = parseFloat(y2);
              const length = Math.abs(numY2 - numY1);
              const topY = Math.min(numY1, numY2);
              const bottomY = Math.max(numY1, numY2);
              const newTopY = topY + (length * 0.25);
              const newBottomY = bottomY - (length * 0.25);
              const newY1 = numY1 <= numY2 ? newTopY : newBottomY;
              const newY2 = numY2 >= numY1 ? newBottomY : newTopY;
              pathNode.setAttribute('d', `M ${x1},${newY1} L ${x2},${newY2}`);
            }
          }
        });

        // Inject CSS safely by creating a style element
        const styleEl = doc.createElementNS('http://www.w3.org/2000/svg', 'style');
        styleEl.textContent = `
          .logo, [id*="logo"], [class*="logo"] { display: none !important; } 
          path { fill: none !important; stroke: black !important; stroke-width: 2px !important; } 
          marker path { fill: black !important; stroke: none !important; } 
          text, tspan, textPath { fill: black !important; stroke: none !important; stroke-width: 0 !important; font-family: sans-serif; font-size: 5px !important; }
        `;
        doc.documentElement.appendChild(styleEl);

        // Serialize back to SVG string
        const serializer = new XMLSerializer();
        const finalSvg = serializer.serializeToString(doc);
        
        // Add to Zip
        zip.file(`Factory_Ready_FreeSewing_${sizeKey.toUpperCase()}.svg`, finalSvg);
      } // End of Size Loop
      
      // Download the ZIP file containing all graded sizes (or single SVG if only 1 size)
      if (sizesToGenerate.length === 1) {
         // If only one size was generated, just download the SVG directly to save the user from unzipping
         const singleSvg = await zip.file(`Factory_Ready_FreeSewing_${sizesToGenerate[0].toUpperCase()}.svg`)?.async('string');
         if (singleSvg) {
           const blob = new Blob([singleSvg], { type: 'image/svg+xml' });
           const url = URL.createObjectURL(blob);
           const a = document.createElement('a');
           a.href = url;
           a.download = `Factory_Ready_FreeSewing_${sizesToGenerate[0].toUpperCase()}.svg`;
           document.body.appendChild(a);
           a.click();
           document.body.removeChild(a);
           URL.revokeObjectURL(url);
         }
      } else {
         // Download the bundled Zip file
         const blob = await zip.generateAsync({ type: 'blob' });
         const url = URL.createObjectURL(blob);
         const a = document.createElement('a');
         a.href = url;
         a.download = `Factory_Ready_FreeSewing_Graded_Sizes.zip`;
         document.body.appendChild(a);
         a.click();
         document.body.removeChild(a);
         URL.revokeObjectURL(url);
      }
      
    } catch (e: any) {
      console.error(e);
      alert("Error generating FreeSewing pattern. Ensure @freesewing/brian is installed. " + e.message);
    }
  };

  const exportToSVG = () => {
    let svgContent = '';
    let maxX = 0;
    let maxY = 0;

    pieces.forEach((piece: any) => {
      let maxPx = 0; let maxPy = 0;
      const pathBBoxMatch = piece.svgData?.match(/[\d.]+/g);
      if (pathBBoxMatch) {
        const points = pathBBoxMatch.map(Number);
        for (let i = 0; i < points.length; i += 2) {
          if (points[i] > maxPx) maxPx = points[i];
          if (points[i+1] > maxPy) maxPy = points[i+1];
        }
      }
      
      const pMaxX = (piece.offsetX || 0) + maxPx;
      const pMaxY = (piece.offsetY || 0) + maxPy;
      if (pMaxX > maxX) maxX = pMaxX;
      if (pMaxY > maxY) maxY = pMaxY;

      svgContent += `
        <g transform="translate(${piece.offsetX || 0}, ${piece.offsetY || 0})">
          <path d="${piece.svgData || ''}" fill="${piece.color || '#fff'}" fill-opacity="0.5" stroke="#000" stroke-width="2"/>
          <text x="10" y="20" font-family="Arial" font-size="16" fill="#000">${piece.name || ''}</text>
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
        width: containerRef.current.clientWidth || 800,
        height: containerRef.current.clientHeight || 600
      });
    }
  }, []);

  useEffect(() => {
    updateData({ patternData: { pieces } });
  }, [pieces, updateData]);

  useEffect(() => {
    generateParametricPatterns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSeamAllowance, seamAllowanceMm, bottomHemAllowanceMm, easeAllowance, data.measurements]);

  const getSeamAuditData = () => {
    const meas = data.measurements || [];
    const { vars: rawVars, isCm, scale: mmScale } = MeasurementMapper.extract(meas, '');
    const vars = { ...rawVars };

    // Apply ease allowance to key dimensions
    vars.halfChest += (easeAllowance * mmScale * 0.25);
    vars.halfBicep += (easeAllowance * mmScale * 0.1);
    vars.adjustedSleeveCap = vars.sleeveCap;
    vars.bottomHemAllowance = bottomHemAllowanceMm * (mmScale / (isCm ? 10 : 25.4));

    // Resolve operations to get exact CAD armholes
    const resolvedFront = resolveOps(basePieces.bodiceFront.ops, vars);
    const resolvedBack = resolveOps(basePieces.bodiceBack.ops, vars);
    const frontArmhole = calculateArmholeLength(resolvedFront, false);
    const backArmhole = calculateArmholeLength(resolvedBack, false);
    const totalArmhole = frontArmhole + backArmhole;

    // Resolve sleeve cap height
    const W_mm = vars.halfBicep;
    // Target length includes standard 12mm ease
    const targetL_mm = totalArmhole + 12;
    vars.adjustedSleeveCap = solveSleeveCapHeight(W_mm, targetL_mm);

    const resolvedSleeve = resolveOps(basePieces.sleeve.ops, vars);
    const sc1 = getCubicBezierLength(
      resolvedSleeve[0].points[0],
      resolvedSleeve[1].points[0],
      resolvedSleeve[1].points[1],
      resolvedSleeve[1].points[2]
    );
    const sc2 = getCubicBezierLength(
      resolvedSleeve[1].points[2],
      resolvedSleeve[2].points[0],
      resolvedSleeve[2].points[1],
      resolvedSleeve[2].points[2]
    );
    const sleeveCap = sc1 + sc2;

    return {
      frontArmhole,
      backArmhole,
      totalArmhole,
      sleeveCap,
      difference: sleeveCap - totalArmhole,
      isCm,
      mmScale
    };
  };

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
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">2D/3D CAD Pattern Maker</h2>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm">
              Default Round Neck Pattern
            </span>
          </div>
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
            <div className="flex flex-col gap-3 w-full max-w-2xl">
              {/* Generate Pattern Engines */}
              <div className="flex flex-col gap-1.5 w-full">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">Pattern Generation Engines:</span>
                <div className="flex gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-100">
                  <button 
                    onClick={() => generateParametricPatterns()}
                    className="flex-1 flex items-center justify-center gap-1.5 p-2 bg-emerald-600 text-white text-xs font-medium rounded hover:bg-emerald-700 shadow-sm transition-colors"
                    title="Generate pattern from measurements using Native Engine (Draws on Canvas)"
                  >
                    📐 Native Engine
                  </button>
                  <button 
                    onClick={handleFreeSewingExport}
                    className="flex-1 flex items-center justify-center gap-1.5 p-2 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 shadow-sm transition-colors"
                    title="Export factory-ready SVG via FreeSewing engine"
                  >
                    ✂️ FreeSewing Engine
                  </button>
                  <button 
                    onClick={handleSmartDraft}
                    disabled={isGenerating}
                    className={`flex-1 flex items-center justify-center gap-1.5 p-2 text-xs font-medium rounded shadow-sm transition-colors ${isGenerating ? 'bg-gray-300 text-gray-500 animate-pulse' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                    title="AI classifies reference image then generates pattern"
                  >
                    {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} Smart AI Engine
                  </button>
                </div>
              </div>

              {/* Export / Download Options */}
              <div className="flex flex-col gap-1.5 w-full">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pl-1">Export / Download:</span>
                <div className="flex gap-2">
                  <button 
                    onClick={exportToSVG}
                    className="flex-1 flex items-center justify-center gap-1.5 p-2 bg-white border border-gray-200 text-gray-700 text-xs font-medium rounded hover:bg-gray-50 shadow-sm transition-colors"
                    title="Download current visual canvas as SVG"
                  >
                    <Upload size={14} className="rotate-180 text-gray-400" /> Canvas SVG
                  </button>
                  <button 
                    onClick={handleNativeExport}
                    className="flex-1 flex items-center justify-center gap-1.5 p-2 bg-white border border-gray-200 text-gray-700 text-xs font-medium rounded hover:bg-gray-50 shadow-sm transition-colors"
                    title="Export DXF-AAMA + SVG via Native Engine (Original Curves)"
                  >
                    <Upload size={14} className="rotate-180 text-gray-400" /> Native DXF
                  </button>
                  <button 
                    onClick={() => svgUploadRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-1.5 p-2 bg-white border border-gray-200 text-gray-700 text-xs font-medium rounded hover:bg-gray-50 shadow-sm transition-colors"
                    title="Upload Master Block SVG & Morph to measurements"
                  >
                    <Upload size={14} className="rotate-180 text-gray-400" /> Morph Master
                  </button>
                </div>
                <input 
                  type="file" 
                  accept=".svg" 
                  ref={svgUploadRef} 
                  className="hidden" 
                  onChange={handleMasterMorphUpload} 
                />
              </div>
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

              <div className="flex flex-col gap-1.5 w-full text-[10px] items-start">
                <label className="flex items-center gap-1.5 cursor-pointer text-gray-600 font-medium select-none">
                  <input
                    type="checkbox"
                    checked={showSeamAllowance}
                    onChange={(e) => setShowSeamAllowance(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-3 h-3"
                  />
                  Seam Allowance
                </label>
                
                {showSeamAllowance && (
                  <div className="flex flex-col gap-2 w-full pl-4.5 mt-0.5">
                    <div className="flex flex-col gap-0.5 w-full">
                      <label className="text-gray-500 font-medium text-[9px] uppercase tracking-wider">General Seam: {seamAllowanceMm} mm</label>
                      <input
                        type="range"
                        min="5"
                        max="25"
                        step="1"
                        value={seamAllowanceMm}
                        onChange={(e) => setSeamAllowanceMm(Number(e.target.value))}
                        className="w-full h-1 accent-indigo-600"
                      />
                    </div>
                    <div className="flex flex-col gap-0.5 w-full mt-1">
                      <label className="text-gray-500 font-medium text-[9px] uppercase tracking-wider">Bottom Hem: {bottomHemAllowanceMm} mm</label>
                      <input
                        type="range"
                        min="15"
                        max="35"
                        step="1"
                        value={bottomHemAllowanceMm}
                        onChange={(e) => setBottomHemAllowanceMm(Number(e.target.value))}
                        className="w-full h-1 accent-indigo-600"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="w-full h-[1px] bg-gray-200 my-1"></div>

              <div className="flex flex-col gap-1 w-full text-[10px] items-start">
                <label className="flex items-center gap-1.5 cursor-pointer text-gray-600 font-medium select-none">
                  <input
                    type="checkbox"
                    checked={showSeamAudit}
                    onChange={(e) => setShowSeamAudit(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-3 h-3"
                  />
                  Seam Match Audit
                </label>
              </div>

              <div className="w-full h-[1px] bg-gray-200 my-1"></div>

              <label className="text-[10px] uppercase font-bold text-gray-500 self-start">Garment Type</label>
              <select
                value={garmentType}
                onChange={(e) => setGarmentType(e.target.value as any)}
                className="w-full text-[10px] p-1 border border-gray-300 rounded focus:outline-none focus:border-indigo-500 bg-white shadow-sm"
                title="Select garment type for pattern generation"
              >
                <option value="tshirt">T-Shirt / Crew Neck</option>
                <option value="hoodie">Hoodie</option>
                <option value="polo">Polo / Collar</option>
                <option value="tanktop">Tank Top (Sleeveless)</option>
              </select>

              <div className="w-full h-[1px] bg-gray-200 my-1"></div>

              <label className="text-[10px] uppercase font-bold text-gray-500 self-start">AI Model</label>
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
                onClick={() => generateParametricPatterns()}
                className="w-full flex items-center justify-center p-2 rounded-lg transition-colors text-emerald-600 hover:bg-emerald-100 bg-emerald-50"
                title="📐 Generate from measurements (Native Engine)"
              >
                <Box size={18} />
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
        <div className="flex-1 w-full min-h-[650px] relative" ref={containerRef}>
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
                        <>
                          <Path
                            data={piece.svgData}
                            fill={piece.color}
                            opacity={isSelected ? 0.8 : 0.5}
                            stroke={isSelected ? '#4f46e5' : '#6b7280'}
                            strokeWidth={isSelected ? 2 : 1}
                          />
                          {showSeamAllowance && piece.cutLineSvgData && (
                            <Path
                              data={piece.cutLineSvgData}
                              stroke="red"
                              strokeWidth={1.5}
                              dash={[4, 4]}
                            />
                          )}
                          {piece.dimensionLines?.map((dim, idx) => {
                            let cx = (dim.start.x + dim.end.x) / 2;
                            let cy = (dim.start.y + dim.end.y) / 2;
                            let rot = 0;
                            if (dim.axis === 'y') {
                              rot = -90;
                              cx += dim.offset || -15;
                            } else if (dim.axis === 'x') {
                              cy += dim.offset || -15;
                            } else if (dim.axis === 'aligned') {
                              const dx = dim.end.x - dim.start.x;
                              const dy = dim.end.y - dim.start.y;
                              rot = Math.atan2(dy, dx) * 180 / Math.PI;
                              if (rot > 90) rot -= 180;
                              if (rot < -90) rot += 180;
                              const len = Math.sqrt(dx * dx + dy * dy);
                              if (len > 0) {
                                const offsetVal = dim.offset || -15;
                                const px = -dy / len * offsetVal;
                                const py = dx / len * offsetVal;
                                cx += px;
                                cy += py;
                              }
                            }
                            const textWidth = dim.label.length * 6.5;
                            const textHeight = 14;
                            return (
                              <React.Fragment key={idx}>
                                <Line
                                  points={[dim.start.x, dim.start.y, dim.end.x, dim.end.y]}
                                  stroke="#2563eb"
                                  strokeWidth={0.8}
                                  dash={[3, 2]}
                                />
                                <Group
                                  x={cx}
                                  y={cy}
                                  rotation={rot}
                                >
                                  <Rect
                                    x={-textWidth / 2}
                                    y={-textHeight / 2}
                                    width={textWidth}
                                    height={textHeight}
                                    fill="#f9fafb"
                                    cornerRadius={2}
                                  />
                                  <Text
                                    x={0}
                                    y={0}
                                    text={dim.label}
                                    fontSize={10}
                                    fill="#2563eb"
                                    align="center"
                                    verticalAlign="middle"
                                    offsetX={textWidth / 2}
                                    offsetY={textHeight / 2}
                                    width={textWidth}
                                    height={textHeight}
                                  />
                                </Group>
                              </React.Fragment>
                            );
                          })}
                        </>
                      ) : (
                        <>
                          <Line
                            points={flattenedPoints}
                            closed
                            fill={piece.color}
                            opacity={isSelected ? 0.8 : 0.5}
                            stroke={isSelected ? '#4f46e5' : '#6b7280'}
                            strokeWidth={isSelected ? 2 : 1}
                          />
                          {showSeamAllowance && piece.cutLineSvgData && (
                            <Path
                              data={piece.cutLineSvgData}
                              stroke="red"
                              strokeWidth={1.5}
                              dash={[4, 4]}
                            />
                          )}
                        </>
                      )}
                      {(() => {
                        let textX = 20;
                        let textY = -20;
                        let textW = 200;
                        const isSleeve = piece.name.toLowerCase().includes('sleeve');
                        
                        if (piece.points && piece.points.length > 0) {
                          const xs = piece.points.map(p => p.x);
                          const ys = piece.points.map(p => p.y);
                          const minX = Math.min(...xs);
                          const maxX = Math.max(...xs);
                          const minY = Math.min(...ys);
                          const maxY = Math.max(...ys);
                          
                          if (isSleeve) {
                            textX = (minX + maxX) / 2 - 40; // Shift to the left half of the sleeve
                            textY = minY + (maxY - minY) * 0.5; // Centered vertically
                          } else {
                            textX = minX + 8;
                            textW = maxX - minX - 16;
                            textY = minY + (maxY - minY) * 0.65;
                          }
                        }
                        
                        if (isSleeve) {
                          return (
                            <Text
                              text={piece.name}
                              x={textX}
                              y={textY}
                              rotation={-90}
                              width={200}
                              align="center"
                              offsetX={100}
                              offsetY={3.5}
                              fontSize={7.0}
                              fontStyle="bold"
                              fill="#374151"
                            />
                          );
                        }
                        
                        return (
                          <Text
                            text={piece.name}
                            x={textX}
                            y={textY}
                            width={textW}
                            align="center"
                            fontSize={7.0}
                            fontStyle="bold"
                            fill="#374151"
                          />
                        );
                      })()}
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

          {/* Seam Mismatch Audit Panel */}
          {viewMode === '2d' && showSeamAudit && (() => {
            const audit = getSeamAuditData();
            const diffVal = Math.abs(audit.difference) / audit.mmScale;
            const diffText = (audit.difference / audit.mmScale).toFixed(2) + (audit.isCm ? ' cm' : ' in');
            const totalArmholeText = (audit.totalArmhole / audit.mmScale).toFixed(2) + (audit.isCm ? ' cm' : ' in');
            const sleeveCapText = (audit.sleeveCap / audit.mmScale).toFixed(2) + (audit.isCm ? ' cm' : ' in');
            
            const isPerfect = diffVal < (audit.isCm ? 0.5 : 0.2);
            const isAcceptable = audit.difference >= 0 && diffVal <= (audit.isCm ? 1.5 : 0.6);

            let statusBg = 'bg-rose-50 text-rose-700 border-rose-200';
            let statusBadge = 'bg-rose-100 text-rose-800';
            let statusTitle = 'Mismatch Alert';
            let statusDesc = 'Sleeve cap and armhole curve lengths must be adjusted to match closely (recommended: cap should be 0-0.5" larger than armhole for ease).';

            if (isPerfect) {
              statusBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
              statusBadge = 'bg-emerald-100 text-emerald-800';
              statusTitle = 'Perfect Match';
              statusDesc = 'Sleeve cap and armhole curve lengths match perfectly.';
            } else if (isAcceptable) {
              statusBg = 'bg-amber-50 text-amber-700 border-amber-200';
              statusBadge = 'bg-amber-100 text-amber-800';
              statusTitle = 'Acceptable Ease';
              statusDesc = `Sleeve cap has standard ease (${diffText} ease-in) relative to armhole curve. Ready for production.`;
            }

            return (
              <div className="absolute bottom-4 right-4 z-10 bg-white/95 backdrop-blur shadow-lg rounded-xl border border-gray-200 p-4 w-72 flex flex-col gap-2.5 text-xs select-none">
                <div className="font-semibold text-gray-800 flex items-center justify-between border-b border-gray-100 pb-1.5">
                  <span className="flex items-center gap-1">📐 Seam Length Audit</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusBadge}`}>{statusTitle}</span>
                </div>
                <div className="grid grid-cols-2 gap-y-1.5 text-gray-600">
                  <span>Bodice Armhole:</span>
                  <span className="text-right font-medium text-gray-900">{totalArmholeText}</span>
                  
                  <span>Sleeve Cap:</span>
                  <span className="text-right font-medium text-gray-900">{sleeveCapText}</span>
                  
                  <span className="font-medium">Difference:</span>
                  <span className={`text-right font-bold ${audit.difference >= 0 && isAcceptable ? 'text-amber-600' : isPerfect ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {audit.difference > 0 ? '+' : ''}{diffText}
                  </span>
                </div>
                <div className={`p-2 rounded-lg border text-[10px] leading-relaxed ${statusBg}`}>
                  {statusDesc}
                </div>
              </div>
            );
          })()}

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
