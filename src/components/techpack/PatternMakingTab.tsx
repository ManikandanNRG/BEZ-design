import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Stage, Layer, Line, Circle, Rect, Group, Text, Path } from 'react-konva';
import { TechPackData } from '@/types/techpack';
import { MousePointer2, Plus, Move, Square, Box, Trash2, BoxSelect, Loader2, Wand2, Image, Upload, Settings, X } from 'lucide-react';
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
  notches?: Point[];
};

const getCubicBezierPoint = (p0: Point, cp1: Point, cp2: Point, p3: Point, t: number): Point => {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: mt3 * p0.x + 3 * mt2 * t * cp1.x + 3 * mt * t2 * cp2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * cp1.y + 3 * mt * t2 * cp2.y + t3 * p3.y
  };
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
  const [showSeamAllowance, setShowSeamAllowance] = useState<boolean>(true);
  const [seamAllowanceMm, setSeamAllowanceMm] = useState<number>(10);
  const [bottomHemAllowanceMm, setBottomHemAllowanceMm] = useState<number>(20);
  const [showSeamAudit, setShowSeamAudit] = useState<boolean>(true);
  const [garmentType, setGarmentType] = useState<'tshirt' | 'hoodie' | 'tanktop' | 'polo'>('tshirt');
  const [designEase, setDesignEase] = useState<number>(0);
  const [shrinkageWidth, setShrinkageWidth] = useState<number>(0);
  const [shrinkageLength, setShrinkageLength] = useState<number>(0);
  const [fabricStretch, setFabricStretch] = useState<number>(0);
  const [settingsExpanded, setSettingsExpanded] = useState<boolean>(true);
  const [mirrorFullView, setMirrorFullView] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const svgUploadRef = useRef<HTMLInputElement>(null);

  // Generates visual (scaled down) patterns for the Canvas
  const generateParametricPatterns = (classification?: any) => {
    const meas = data.measurements || [];
    
    // Use the robust MeasurementMapper (extracts everything normalized to MM)
    const { vars: rawVars, isCm, scale, presentFields } = MeasurementMapper.extract(meas, '', {
      designEase,
      shrinkageWidth,
      shrinkageLength,
      fabricStretch
    });
    
    // Visual rendering scale. Since rawVars are in MM, we need to scale them down for the canvas.
    const renderScale = isCm ? (5.6 / 10) : (15.0 / 25.4);

    // Scale everything for rendering
    const variables: Record<string, number> = {};
    for (const [k, v] of Object.entries(rawVars)) {
      variables[k] = v * renderScale;
    }

    // Spec sheet measurements are used exactly as-is (no ease added here).
    // Fabric compensation (shrinkage, stretch recovery) is applied in MeasurementMapper when user sets those controls.
    variables.adjustedSleeveCap = variables.sleeveCap;
    variables.bottomHemAllowance = bottomHemAllowanceMm * (scale / (isCm ? 10 : 25.4));

    const newPieces: PatternPiece[] = [];

    const seamAllowanceVal = seamAllowanceMm * (scale / (isCm ? 10 : 25.4));

    // 1. Bodice Front
    const resolvedFront = resolveOps(basePieces.bodiceFront.ops, variables);
    const frontStitch = buildSvgPathString(resolvedFront);
    const frontPoints = discretizeOps(resolvedFront);
    
    const frontSvg = showSeamAllowance 
      ? buildPolygonPathString(offsetPolygon(frontPoints, seamAllowanceVal, true, 'bevel', true))
      : frontStitch;
    const frontCut = showSeamAllowance ? frontStitch : undefined;

    const frontDims = basePieces.bodiceFront.dimensionLines 
      ? resolveDimensions(basePieces.bodiceFront.dimensionLines, variables, isCm, rawVars, presentFields) 
      : [];

    const frontArmholeNotch = getCubicBezierPoint(
      resolvedFront[2].points[0],
      resolvedFront[3].points[0],
      resolvedFront[3].points[1],
      resolvedFront[3].points[2],
      0.5
    );

    newPieces.push({
      id: uuidv4(),
      name: 'Bodice Front (Cut 1 on Fold)',
      points: frontPoints,
      svgData: frontSvg,
      cutLineSvgData: frontCut,
      dimensionLines: frontDims,
      color: '#e0f2fe',
      offsetX: 50,
      offsetY: 50,
      notches: [frontArmholeNotch]
    });

    // 2. Bodice Back
    const resolvedBack = resolveOps(basePieces.bodiceBack.ops, variables);
    const backStitch = buildSvgPathString(resolvedBack);
    const backPoints = discretizeOps(resolvedBack);
    
    const backSvg = showSeamAllowance 
      ? buildPolygonPathString(offsetPolygon(backPoints, seamAllowanceVal, true, 'bevel', true))
      : backStitch;
    const backCut = showSeamAllowance ? backStitch : undefined;

    const backDims = basePieces.bodiceBack.dimensionLines 
      ? resolveDimensions(basePieces.bodiceBack.dimensionLines, variables, isCm, rawVars, presentFields) 
      : [];

    const backArmholeNotch = getCubicBezierPoint(
      resolvedBack[2].points[0],
      resolvedBack[3].points[0],
      resolvedBack[3].points[1],
      resolvedBack[3].points[2],
      0.5
    );

    newPieces.push({
      id: uuidv4(),
      name: 'Bodice Back (Cut 1 on Fold)',
      points: backPoints,
      svgData: backSvg,
      cutLineSvgData: backCut,
      dimensionLines: backDims,
      color: '#f3e8ff',
      offsetX: mirrorFullView ? (variables.halfChest * 2 + 100) : (variables.halfChest + 100),
      offsetY: 50,
      notches: [backArmholeNotch]
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

    // 3. Sleeve — skip for tank tops
    const hasSleeves = classification ? classification.hasSleeves !== false : garmentType !== 'tanktop';
    if (hasSleeves) {
      const isShortSleeve = variables.sleeveLength < variables.elbowPosition;
      const sleevePiece = isShortSleeve ? basePieces.sleeveShort : basePieces.sleeve;
      
      const hasAsymmetry = Math.abs((rawVars.acrossFront || 0) - (rawVars.acrossBack || 0)) > 0.05;
      const sleeveOps = JSON.parse(JSON.stringify(sleevePiece.ops));
      if (hasAsymmetry) {
        // Front curve (op index 1)
        sleeveOps[1].points[0].x = 'halfBicep * 0.25';
        sleeveOps[1].points[1].x = 'halfBicep * 0.55';
        // Back curve (op index 2)
        sleeveOps[2].points[0].x = 'halfBicep * 1.35';
        sleeveOps[2].points[1].x = 'halfBicep * 1.75';
      } else {
        // Front curve (op index 1)
        sleeveOps[1].points[0].x = 'halfBicep * 0.2';
        sleeveOps[1].points[1].x = 'halfBicep * 0.6';
        // Back curve (op index 2)
        sleeveOps[2].points[0].x = 'halfBicep * 1.4';
        sleeveOps[2].points[1].x = 'halfBicep * 1.8';
      }

      const resolvedSleeve = resolveOps(sleeveOps, variables);
      const sleeveStitch = buildSvgPathString(resolvedSleeve);
      const sleevePoints = discretizeOps(resolvedSleeve);
      
      const sleeveSvg = showSeamAllowance 
        ? buildPolygonPathString(offsetPolygon(sleevePoints, seamAllowanceVal, false, 'bevel', true))
        : sleeveStitch;
      const sleeveCut = showSeamAllowance ? sleeveStitch : undefined;

      const sleeveDims = sleevePiece.dimensionLines 
        ? resolveDimensions(sleevePiece.dimensionLines, variables, isCm, rawVars, presentFields) 
        : [];

      // Calculate sleeve notches along the front cap and back cap curves
      const sleeveFrontNotch = getCubicBezierPoint(
        resolvedSleeve[0].points[0], // Start: (0, adjustedSleeveCap)
        resolvedSleeve[1].points[0], // CP1
        resolvedSleeve[1].points[1], // CP2
        resolvedSleeve[1].points[2], // End: (halfBicep, 0)
        0.5
      );
      const sleeveBackNotch = getCubicBezierPoint(
        resolvedSleeve[1].points[2], // Start: (halfBicep, 0)
        resolvedSleeve[2].points[0], // CP1
        resolvedSleeve[2].points[1], // CP2
        resolvedSleeve[2].points[2], // End: (halfBicep*2, adjustedSleeveCap)
        0.5
      );

      newPieces.push({
        id: uuidv4(),
        name: sleevePiece.name,
        points: sleevePoints,
        svgData: sleeveSvg,
        cutLineSvgData: sleeveCut,
        dimensionLines: sleeveDims,
        color: '#dcfce7',
        offsetX: mirrorFullView ? (variables.halfChest * 4 + 150) : (variables.halfChest * 2 + 150),
        offsetY: 50,
        notches: [sleeveFrontNotch, sleeveBackNotch]
      });
    }

    // 4. Hood (Conditional) — drawn when AI says hoodie OR when garment type is hoodie
    const hasHood = classification ? (classification.hasHood || classification.garmentType === 'hoodie') : garmentType === 'hoodie';
    if (hasHood) {
      const resolvedHood = resolveOps(basePieces.hood.ops, variables);
      const hoodStitch = buildSvgPathString(resolvedHood);
      const hoodPoints = discretizeOps(resolvedHood);
      
      const hoodSvg = showSeamAllowance 
        ? buildPolygonPathString(offsetPolygon(hoodPoints, seamAllowanceVal, false, 'bevel', true))
        : hoodStitch;
      const hoodCut = showSeamAllowance ? hoodStitch : undefined;

      const hoodDims = basePieces.hood.dimensionLines 
        ? resolveDimensions(basePieces.hood.dimensionLines, variables, isCm, rawVars, presentFields) 
        : [];

      newPieces.push({
        id: uuidv4(),
        name: 'Hood (Cut 2 Mirrored)',
        points: hoodPoints,
        svgData: hoodSvg,
        cutLineSvgData: hoodCut,
        dimensionLines: hoodDims,
        color: '#fef08a',
        offsetX: mirrorFullView ? (variables.halfChest * 4 + variables.halfBicep * 2 + 200) : (variables.halfChest * 2 + variables.halfBicep * 2 + 200),
        offsetY: 50
      });
    }

    // 5. Collar (Conditional) — drawn when garment type is polo
    const hasCollar = garmentType === 'polo';
    if (hasCollar) {
      const resolvedCollar = resolveOps(basePieces.collar.ops, variables);
      const collarStitch = buildSvgPathString(resolvedCollar);
      const collarPoints = discretizeOps(resolvedCollar);
      
      const collarSvg = showSeamAllowance 
        ? buildPolygonPathString(offsetPolygon(collarPoints, seamAllowanceVal, true, 'bevel', true))
        : collarStitch;
      const collarCut = showSeamAllowance ? collarStitch : undefined;

      const collarDims = basePieces.collar.dimensionLines 
        ? resolveDimensions(basePieces.collar.dimensionLines, variables, isCm, rawVars, presentFields) 
        : [];

      newPieces.push({
        id: uuidv4(),
        name: 'Collar (Cut 1 on Fold)',
        points: collarPoints,
        svgData: collarSvg,
        cutLineSvgData: collarCut,
        dimensionLines: collarDims,
        color: '#fee2e2',
        offsetX: mirrorFullView ? (variables.halfChest * 4 + 150) : (variables.halfChest * 2 + 150),
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
        const { vars: rawVars, isCm, scale, presentFields } = MeasurementMapper.extract(meas, sizeKey, {
          designEase,
          shrinkageWidth,
          shrinkageLength,
          fabricStretch
        });
        const variables: Record<string, number> = { ...rawVars };

        // Spec sheet measurements are used exactly as-is.
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
          const resolvedDims = basePiece.dimensionLines ? resolveDimensions(basePiece.dimensionLines, variables, isCm, rawVars, presentFields) : [];
          
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
      
      const isFoldPiece = piece.name?.toLowerCase().includes('fold');
      const maxPxVal = maxPx;

      if (mirrorFullView && isFoldPiece) {
        const pMaxX = (piece.offsetX || 0) + maxPxVal * 2;
        const pMaxY = (piece.offsetY || 0) + maxPy;
        if (pMaxX > maxX) maxX = pMaxX;
        if (pMaxY > maxY) maxY = pMaxY;

        svgContent += `
        <g transform="translate(${piece.offsetX || 0}, ${piece.offsetY || 0})">
          <!-- Right half -->
          <g transform="translate(${maxPxVal}, 0) scale(1, 1)">
            <path d="${piece.svgData || ''}" fill="${piece.color || '#fff'}" fill-opacity="0.5" stroke="#000" stroke-width="2"/>
            ${piece.notches ? piece.notches.map((pt: any) => `<circle cx="${pt.x}" cy="${pt.y}" r="3.5" fill="#374151" stroke="#fff" stroke-width="1"/>`).join('\n') : ''}
          </g>
          <!-- Left half (Mirrored) -->
          <g transform="translate(${maxPxVal}, 0) scale(-1, 1)">
            <path d="${piece.svgData || ''}" fill="${piece.color || '#fff'}" fill-opacity="0.5" stroke="#000" stroke-width="2"/>
            ${piece.notches ? piece.notches.map((pt: any) => `<circle cx="${pt.x}" cy="${pt.y}" r="3.5" fill="#374151" stroke="#fff" stroke-width="1"/>`).join('\n') : ''}
          </g>
          <text x="${maxPxVal + 10}" y="20" font-family="Arial" font-size="16" fill="#000">${piece.name || ''}</text>
        </g>
        `;
      } else {
        const pMaxX = (piece.offsetX || 0) + maxPx;
        const pMaxY = (piece.offsetY || 0) + maxPy;
        if (pMaxX > maxX) maxX = pMaxX;
        if (pMaxY > maxY) maxY = pMaxY;

        svgContent += `
        <g transform="translate(${piece.offsetX || 0}, ${piece.offsetY || 0})">
          <path d="${piece.svgData || ''}" fill="${piece.color || '#fff'}" fill-opacity="0.5" stroke="#000" stroke-width="2"/>
          ${piece.notches ? piece.notches.map((pt: any) => `<circle cx="${pt.x}" cy="${pt.y}" r="3.5" fill="#374151" stroke="#fff" stroke-width="1"/>`).join('\n') : ''}
          <text x="10" y="20" font-family="Arial" font-size="16" fill="#000">${piece.name || ''}</text>
        </g>
        `;
      }
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
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setStageSize({
          width: entry.contentRect.width || 800,
          height: entry.contentRect.height || 600
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    updateData({ patternData: { pieces } });
  }, [pieces, updateData]);

  useEffect(() => {
    generateParametricPatterns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    showSeamAllowance, 
    seamAllowanceMm, 
    bottomHemAllowanceMm, 
    data.measurements,
    designEase,
    shrinkageWidth,
    shrinkageLength,
    fabricStretch
  ]);

  const getSeamAuditData = () => {
    const meas = data.measurements || [];
    const { vars: rawVars, isCm, scale: mmScale } = MeasurementMapper.extract(meas, '', {
      designEase,
      shrinkageWidth,
      shrinkageLength,
      fabricStretch
    });
    const vars = { ...rawVars };

    // Spec sheet measurements are used exactly as-is.
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
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${viewMode === '2d' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}
              onClick={() => setViewMode('2d')}
            >
              2D
            </button>
            <button
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${viewMode === '3d' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-900'}`}
              onClick={() => setViewMode('3d')}
            >
              3D
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden border border-gray-200 rounded-xl relative">
        
        {/* Slim Icon Toolbar */}
        {viewMode === '2d' && (
          <div className="w-14 bg-gray-50 border-r border-gray-200 flex flex-col items-center py-4 gap-4 z-10 shrink-0">
            <button 
              onClick={() => { setTool('select'); setDrawingPoints([]); }}
              className={`p-2 rounded-lg transition-colors ${tool === 'select' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:bg-gray-200'}`}
              title="Select"
            >
              <MousePointer2 size={20} />
            </button>
            <button 
              onClick={() => { setTool('draw'); setSelectedPieceId(null); setSelectedPointIndex(null); }}
              className={`p-2 rounded-lg transition-colors ${tool === 'draw' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-500 hover:bg-gray-200'}`}
              title="Draw Polygon"
            >
              <Plus size={20} />
            </button>
            
            <div className="w-8 h-[1px] bg-gray-300 my-2"></div>
            
            <button 
              onClick={() => addPreset('bodiceFront')}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
              title="Add Bodice Front"
            >
              <Square size={20} />
            </button>
            <button 
              onClick={() => addPreset('sleeve')}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-200 transition-colors"
              title="Add Sleeve"
            >
              <BoxSelect size={20} />
            </button>

            {selectedPieceId && (
              <>
                <div className="w-8 h-[1px] bg-gray-300 my-2"></div>
                <button 
                  onClick={deleteSelected}
                  className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                  title="Delete Selected"
                >
                  <Trash2 size={20} />
                </button>
              </>
            )}

            <div className="flex-1"></div>

            <button 
              onClick={() => setSettingsExpanded(!settingsExpanded)}
              className={`p-2 rounded-lg transition-all ${settingsExpanded ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'text-gray-500 hover:bg-gray-200'}`}
              title={settingsExpanded ? "Hide Settings Panel" : "Show Settings Panel"}
            >
              <Settings size={20} />
            </button>
          </div>
        )}

        {/* Settings Sidebar */}
        {viewMode === '2d' && (
          <div className={`
            bg-white border-r border-gray-200 flex flex-col z-10 overflow-y-auto shrink-0 select-none text-xs
            transition-all duration-300
            ${settingsExpanded ? 'w-64 opacity-100' : 'w-0 opacity-0 pointer-events-none border-r-0'}
          `}>
            <div className="p-4 flex flex-col gap-5 w-64">
              {/* Pattern Mode Section */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Garment Config</span>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-gray-600 uppercase">Garment Type</label>
                    <select
                      value={garmentType}
                      onChange={(e) => setGarmentType(e.target.value as any)}
                      className="w-full text-xs p-1.5 border border-gray-300 rounded focus:outline-none focus:border-indigo-500 bg-white shadow-sm"
                    >
                      <option value="tshirt">T-Shirt / Crew Neck</option>
                      <option value="hoodie">Hoodie</option>
                      <option value="polo">Polo / Collar</option>
                      <option value="tanktop">Tank Top (Sleeveless)</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-gray-600 uppercase">AI Model</label>
                    <select
                      value={modelPreference}
                      onChange={(e) => setModelPreference(e.target.value as any)}
                      className="w-full text-xs p-1.5 border border-gray-300 rounded focus:outline-none focus:border-indigo-500 bg-white shadow-sm"
                    >
                      <option value="auto">Auto (Fallback)</option>
                      <option value="gemini">Gemini 1.5</option>
                      <option value="openai">GPT-4o-mini</option>
                    </select>
                  </div>
                  <button 
                    onClick={() => generateParametricPatterns()}
                    className="w-full mt-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100 transition-colors"
                  >
                    <Box size={14} /> Update Canvas
                  </button>
                </div>
              </div>

              {/* Fabric Properties & Ease Section */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Fabric & Ease Properties</span>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex flex-col gap-3">
                  
                  {/* Ease Allowance Slider */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-[10px] font-semibold text-gray-600 uppercase">
                      <span>Design Ease</span>
                      <span className="text-indigo-600 font-bold">{designEase > 0 ? `+${designEase}` : designEase}"</span>
                    </div>
                    <input
                      type="range"
                      min="-2"
                      max="5"
                      step="0.25"
                      value={designEase}
                      onChange={(e) => setDesignEase(Number(e.target.value))}
                      className="w-full h-1 accent-indigo-600 animate-pulse-slow"
                    />
                    <span className="text-[9px] text-gray-400 leading-tight">
                      Adds extra room to Chest/Bust & Bicep circumference. (Default is 0)
                    </span>
                  </div>

                  <div className="w-full h-[1px] bg-gray-200 my-0.5"></div>

                  {/* Width Shrinkage Slider */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-[10px] font-semibold text-gray-600 uppercase">
                      <span>Width Shrinkage</span>
                      <span className="text-indigo-600 font-bold">{shrinkageWidth}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      step="0.5"
                      value={shrinkageWidth}
                      onChange={(e) => setShrinkageWidth(Number(e.target.value))}
                      className="w-full h-1 accent-indigo-600"
                    />
                    {shrinkageWidth > 0 && (
                      <span className="text-[9px] text-emerald-600 font-medium leading-tight">
                        Cuts pattern +{(100 / (100 - shrinkageWidth) - 1.0).toLocaleString('en-US', { style: 'percent', minimumFractionDigits: 1 })} wider
                      </span>
                    )}
                  </div>

                  {/* Length Shrinkage Slider */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-[10px] font-semibold text-gray-600 uppercase">
                      <span>Length Shrinkage</span>
                      <span className="text-indigo-600 font-bold">{shrinkageLength}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      step="0.5"
                      value={shrinkageLength}
                      onChange={(e) => setShrinkageLength(Number(e.target.value))}
                      className="w-full h-1 accent-indigo-600"
                    />
                    {shrinkageLength > 0 && (
                      <span className="text-[9px] text-emerald-600 font-medium leading-tight">
                        Cuts pattern +{(100 / (100 - shrinkageLength) - 1.0).toLocaleString('en-US', { style: 'percent', minimumFractionDigits: 1 })} longer
                      </span>
                    )}
                  </div>

                  {/* Fabric Stretch Slider */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-[10px] font-semibold text-gray-600 uppercase">
                      <span>Fabric Stretch Width</span>
                      <span className="text-indigo-600 font-bold">{fabricStretch}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      step="1"
                      value={fabricStretch}
                      onChange={(e) => setFabricStretch(Number(e.target.value))}
                      className="w-full h-1 accent-indigo-600"
                    />
                    {fabricStretch > 0 && (
                      <span className="text-[9px] text-rose-600 font-medium leading-tight">
                        Cuts pattern -{fabricStretch}% narrower for snug fit
                      </span>
                    )}
                  </div>

                </div>
              </div>

              {/* Seam & Construction Section */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Seams & Audits</span>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex flex-col gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-gray-600 font-semibold select-none">
                    <input
                      type="checkbox"
                      checked={showSeamAllowance}
                      onChange={(e) => setShowSeamAllowance(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                    />
                    Seam Allowance
                  </label>
                  
                  {showSeamAllowance && (
                    <div className="flex flex-col gap-2.5 pl-5">
                      <div className="flex flex-col gap-0.5">
                        <label className="text-gray-500 font-semibold text-[9px] uppercase tracking-wider">General Seam: {seamAllowanceMm} mm</label>
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
                      <div className="flex flex-col gap-0.5">
                        <label className="text-gray-500 font-semibold text-[9px] uppercase tracking-wider">Bottom Hem: {bottomHemAllowanceMm} mm</label>
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

                  <div className="w-full h-[1px] bg-gray-200 my-0.5"></div>

                  <label className="flex items-center gap-2 cursor-pointer text-gray-600 font-semibold select-none">
                    <input
                      type="checkbox"
                      checked={showSeamAudit}
                      onChange={(e) => setShowSeamAudit(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                    />
                    Seam Match Audit
                  </label>
                  
                  <div className="w-full h-[1px] bg-gray-200 my-0.5"></div>

                  <label className="flex items-center gap-2 cursor-pointer text-gray-600 font-semibold select-none">
                    <input
                      type="checkbox"
                      checked={mirrorFullView}
                      onChange={(e) => setMirrorFullView(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                    />
                    Mirror Full View
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Work Area */}
        <div className="flex-1 w-full min-h-[650px] relative" ref={containerRef}>

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

                  const isFoldPiece = piece.name.toLowerCase().includes('fold');
                  let maxXPoints = 0;
                  let minYPoints = 0;
                  let maxYPoints = 0;
                  if (piece.points && piece.points.length > 0) {
                    maxXPoints = Math.max(...piece.points.map((p: any) => p.x), 0);
                    minYPoints = Math.min(...piece.points.map((p: any) => p.y), 0);
                    maxYPoints = Math.max(...piece.points.map((p: any) => p.y), 0);
                  }

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
                      {mirrorFullView && isFoldPiece ? (
                        <>
                          {/* Right Half */}
                          <Group x={maxXPoints} scaleX={1}>
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

                            {/* Dimension lines (only on right side) */}
                            {piece.dimensionLines?.map((dim: any, idx: number) => {
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
                                  <Group x={cx} y={cy} rotation={rot}>
                                    <Rect x={-textWidth / 2} y={-textHeight / 2} width={textWidth} height={textHeight} fill="#f9fafb" cornerRadius={2} />
                                    <Text
                                      x={0} y={0} text={dim.label} fontSize={10} fill="#2563eb" align="center" verticalAlign="middle"
                                      offsetX={textWidth / 2} offsetY={textHeight / 2} width={textWidth} height={textHeight}
                                    />
                                  </Group>
                                </React.Fragment>
                              );
                            })}

                            {/* Notches */}
                            {piece.notches?.map((pt: any, i: number) => (
                              <Circle key={`notch-${i}`} x={pt.x} y={pt.y} radius={3.5} fill="#374151" stroke="#ffffff" strokeWidth={1} />
                            ))}

                            {/* Editing Circles */}
                            {isSelected && piece.points && piece.points.map((pt: any, i: number) => (
                              <Circle
                                key={`pt-${i}`} x={pt.x} y={pt.y} radius={6} fill="#ffffff" stroke="#4f46e5" strokeWidth={2} draggable
                                onDragMove={(e) => handleDragPoint(e, piece.id, i)}
                                onMouseDown={(e) => { setSelectedPointIndex(i); e.cancelBubble = true; }}
                              />
                            ))}
                          </Group>

                          {/* Left Half (Mirrored) */}
                          <Group x={maxXPoints} scaleX={-1}>
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

                            {/* Notches */}
                            {piece.notches?.map((pt: any, i: number) => (
                              <Circle key={`notch-mirrored-${i}`} x={pt.x} y={pt.y} radius={3.5} fill="#374151" stroke="#ffffff" strokeWidth={1} />
                            ))}
                          </Group>
                        </>
                      ) : (
                        <>
                          {/* Normal single view rendering */}
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
                          {/* Notches */}
                          {piece.notches?.map((pt: any, i: number) => (
                            <Circle key={`notch-${i}`} x={pt.x} y={pt.y} radius={3.5} fill="#374151" stroke="#ffffff" strokeWidth={1} />
                          ))}

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
                                e.cancelBubble = true;
                              }}
                            />
                          ))}
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
                          } else if (mirrorFullView && isFoldPiece) {
                            textX = maxXPoints - 100;
                            textW = 200;
                            textY = minYPoints + (maxYPoints - minYPoints) * 0.65;
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

        {/* Right Side Bar */}
        {viewMode === '2d' && (
          <div className="w-48 bg-white border-l border-gray-200 flex flex-col z-10 overflow-y-auto shrink-0 select-none text-[11px] p-3 gap-4">
            
            {/* Pattern Generation Engines */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Drafting Engine</span>
              <div className="bg-gray-50 p-2 rounded border border-gray-200 flex flex-col gap-1.5">
                <button 
                  onClick={() => generateParametricPatterns()}
                  className="w-full flex items-center justify-center gap-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded shadow-sm transition-colors text-[10px]"
                  title="Generate pattern from measurements using Native Engine (Draws on Canvas)"
                >
                  📐 Native Engine
                </button>
                <button 
                  onClick={handleFreeSewingExport}
                  className="w-full flex items-center justify-center gap-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded shadow-sm transition-colors text-[10px]"
                  title="Export factory-ready SVG via FreeSewing engine"
                >
                  ✂️ FreeSewing
                </button>
                <button 
                  onClick={handleSmartDraft}
                  disabled={isGenerating}
                  className={`w-full flex items-center justify-center gap-1 py-1.5 px-2 font-semibold rounded shadow-sm transition-colors text-[10px] ${isGenerating ? 'bg-gray-300 text-gray-500 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                  title="AI classifies reference image then generates pattern"
                >
                  {isGenerating ? <Loader2 size={10} className="animate-spin" /> : <Wand2 size={10} />} Smart AI
                </button>
              </div>
            </div>

            {/* Export / Download */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Export / Download</span>
              <div className="bg-gray-50 p-2 rounded border border-gray-200 flex flex-col gap-1.5">
                <button 
                  onClick={exportToSVG}
                  className="w-full flex items-center justify-center gap-1 py-1.5 px-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded hover:bg-gray-50 shadow-sm transition-colors text-[10px]"
                  title="Download current visual canvas as SVG"
                >
                  <Upload size={10} className="rotate-180 text-gray-400" /> Canvas SVG
                </button>
                <button 
                  onClick={handleNativeExport}
                  className="w-full flex items-center justify-center gap-1 py-1.5 px-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded hover:bg-gray-50 shadow-sm transition-colors text-[10px]"
                  title="Export DXF-AAMA + SVG via Native Engine (Original Curves)"
                >
                  <Upload size={10} className="rotate-180 text-gray-400" /> DXF-AAMA
                </button>
                <button 
                  onClick={() => svgUploadRef.current?.click()}
                  className="w-full flex items-center justify-center gap-1 py-1.5 px-2 bg-white border border-gray-200 text-gray-700 font-semibold rounded hover:bg-gray-50 shadow-sm transition-colors text-[10px]"
                  title="Upload Master SVG & Morph to measurements"
                >
                  <Upload size={10} className="rotate-180 text-gray-400" /> Morph Block
                </button>
                <input 
                  type="file" 
                  accept=".svg" 
                  ref={svgUploadRef} 
                  className="hidden" 
                  onChange={handleMasterMorphUpload} 
                />
              </div>
            </div>

            {/* Reference Image */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Reference Image</span>
              <div className="bg-gray-50 p-2 rounded border border-gray-200 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-semibold text-gray-600 uppercase">Sketch / Photo</span>
                  <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                  <div className="flex items-center gap-1">
                    <button onClick={() => fileInputRef.current?.click()} className="text-indigo-600 hover:bg-indigo-50 p-0.5 rounded" title="Upload Sketch">
                      <Upload size={10} />
                    </button>
                    {uploadedImage && (
                      <button onClick={() => setUploadedImage(null)} className="text-red-500 hover:bg-red-50 p-0.5 rounded" title="Remove Sketch">
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                </div>
                {uploadedImage ? (
                  <div className="relative group mt-1">
                    <img src={uploadedImage} alt="Reference" className="w-full h-auto rounded border border-gray-200" />
                    <button 
                      onClick={() => setUploadedImage(null)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded p-0.5 hover:bg-red-600 transition-colors"
                      title="Remove Sketch"
                    >
                      <Trash2 size={8} />
                    </button>
                  </div>
                ) : (
                  <div 
                    className="w-full h-20 bg-gray-50 border border-dashed border-gray-300 rounded flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 mt-1"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Image size={16} className="text-gray-400 mb-0.5" />
                    <span className="text-[9px] text-gray-500 text-center px-1">Upload Sketch</span>
                  </div>
                )}
              </div>
            </div>

            {/* Seam Length Audit */}
            {showSeamAudit && (() => {
              const audit = getSeamAuditData();
              const diffVal = Math.abs(audit.difference) / audit.mmScale;
              const diffText = (audit.difference / audit.mmScale).toFixed(2) + (audit.isCm ? ' cm' : ' in');
              const totalArmholeText = (audit.totalArmhole / audit.mmScale).toFixed(2) + (audit.isCm ? ' cm' : ' in');
              const sleeveCapText = (audit.sleeveCap / audit.mmScale).toFixed(2) + (audit.isCm ? ' cm' : ' in');
              
              const isPerfect = diffVal < (audit.isCm ? 0.5 : 0.2);
              const isAcceptable = audit.difference >= 0 && diffVal <= (audit.isCm ? 1.5 : 0.6);

              let statusBg = 'bg-rose-50 text-rose-700 border-rose-200';
              let statusBadge = 'bg-rose-100 text-rose-800';
              let statusTitle = 'Mismatch';
              let statusDesc = 'Sleeve cap should be 0-0.5" larger than armhole for ease.';

              if (isPerfect) {
                statusBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                statusBadge = 'bg-emerald-100 text-emerald-800';
                statusTitle = 'Perfect';
                statusDesc = 'Sleeve cap and armhole curve lengths match perfectly.';
              } else if (isAcceptable) {
                statusBg = 'bg-amber-50 text-amber-700 border-amber-200';
                statusBadge = 'bg-amber-100 text-amber-800';
                statusTitle = 'Acceptable';
                statusDesc = `Sleeve cap has standard ease (${diffText} ease-in). Ready for production.`;
              }

              return (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Seam Length Audit</span>
                  <div className="bg-gray-50 p-2.5 rounded border border-gray-200 flex flex-col gap-2">
                    <div className="flex items-center justify-between pb-1 border-b border-gray-200">
                      <span className="font-semibold text-gray-700 text-[10px]">Audit Status</span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${statusBadge}`}>{statusTitle}</span>
                    </div>
                    <div className="flex flex-col gap-1 text-gray-600 text-[10px]">
                      <div className="flex justify-between">
                        <span>Armhole:</span>
                        <span className="font-medium text-gray-900">{totalArmholeText}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sleeve Cap:</span>
                        <span className="font-medium text-gray-900">{sleeveCapText}</span>
                      </div>
                      <div className="flex justify-between font-semibold pt-0.5 border-t border-dashed border-gray-200">
                        <span>Diff:</span>
                        <span className={audit.difference >= 0 && isAcceptable ? 'text-amber-600' : isPerfect ? 'text-emerald-600' : 'text-rose-600'}>
                          {audit.difference > 0 ? '+' : ''}{diffText}
                        </span>
                      </div>
                    </div>
                    <div className={`p-1.5 rounded text-[9px] leading-snug border ${statusBg}`}>
                      {statusDesc}
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>
        )}
      </div>
    </div>
  );
}
