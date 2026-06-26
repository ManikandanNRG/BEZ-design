import React, { useState } from 'react';
import { Shirt, HelpCircle, Check, Circle, Layers } from 'lucide-react';
import { TechPackData } from '@/types/techpack';
import AnnotationCanvas from './AnnotationCanvas';
import { MeasurementMapper } from '@/lib/cad/MeasurementMapper';
import { basePieces, resolveOps, buildSvgPathString, solveSleeveCapHeight, calculateArmholeLength } from '@/lib/cad/CADKernel';

interface GuideTabProps {
  data: TechPackData;
  updateData: (updates: Partial<TechPackData>) => void;
}

const DEFAULT_SHIRT_SVG = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAwIDYwMCI+CiAgPGcgaWQ9ImZyb250IiBmaWxsPSJub25lIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMyIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+CiAgICA8cGF0aCBkPSJNIDIzMCAxNTAgUSAzMDAgMjAwIDM3MCAxNTAiLz4KICAgIDxwYXRoIGQ9Ik0gMjMwIDE1MCBDIDIzMCAxMzAgMzcwIDEzMCAzNzAgMTUwIi8+CiAgICA8cGF0aCBkPSJNIDIzMCAxNTAgTCAxNTAgMTgwIEwgMTAwIDMwMCBMIDE3MCAzMzAgTCAyMTAgMjMwIi8+CiAgICA8cGF0aCBkPSJNIDM3MCAxNTAgTCA0NTAgMTgwIEwgNTAwIDMwMCBMIDQzMCAzMzAgTCAzOTAgMjMwIi8+CiAgICA8cGF0aCBkPSJNIDIxMCAyMzAgTCAyMjAgNTAwIEwgMzgwIDUwMCBMIDM5MCAyMzAiLz4KICAgIDxwYXRoIGQ9Ik0gMjIwIDQ4MCBMIDM4MCA0ODAiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWRhc2hhcnJheT0iNiw0Ii8+CiAgICA8cGF0aCBkPSJNIDEyMCAzMTAgTCAxNjAgMzI1IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1kYXNoYXJyYXk9IjYsNCIvPgogICAgPHBhdGggZD0iTSA0NDAgMzI1IEwgNDgwIDMxMCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtZGFzaGFycmF5PSI2LDQiLz4KICAgIDx0ZXh0IHg9IjMwMCIgeT0iNTUwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIyNCIgZmlsbD0iIzY2NiIgc3Ryb2tlPSJub25lIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5GUk9OVDwvdGV4dD4KICA8L2c+CiAgPGcgaWQ9ImJhY2siIHRyYW5zZm9ybT0idHJhbnNsYXRlKDQ1MCwwKSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjMiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPgogICAgPHBhdGggZD0iTSAyMzAgMTUwIFEgMzAwIDE2MCAzNzAgMTUwIi8+CiAgICA8cGF0aCBkPSJNIDIzMCAxNTAgQyAyMzAgMTMwIDM3MCAxMzAgMzcwIDE1MCIvPgogICAgPHBhdGggZD0iTSAyMzAgMTUwIEwgMTUwIDE4MCBMIDEwMCAzMDAgTCAxNzAgMzMwIEwgMjEwIDIzMCIvPgogICAgPHBhdGggZD0iTSAzNzAgMTUwIEwgNDUwIDE4MCBMIDUwMCAzMDAgTCA0MzAgMzMwIEwgMzkwIDIzMCIvPgogICAgPHBhdGggZD0iTSAyMTAgMjMwIEwgMjIwIDUwMCBMIDM4MCA1MDAgTCAzOTAgMjMwIi8+CiAgICA8cGF0aCBkPSJNIDIyMCA0ODAgTCAzODAgNDgwIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1kYXNoYXJyYXk9IjYsNCIvPgogICAgPHBhdGggZD0iTSAxMjAgMzEwIEwgMTYwIDMyNSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtZGFzaGFycmF5PSI2LDQiLz4KICAgIDx0ZXh0IHg9IjMwMCIgeT0iNTUwIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIyNCIgZmlsbD0iIzY2NiIgc3Ryb2tlPSJub25lIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5CQUNLPC90ZXh0PgogIDwvZz4KPC9zdmc+';

export default function GuideTab({ data, updateData }: GuideTabProps) {
  const [guideMode, setGuideMode] = useState<'auto' | 'custom'>('auto');
  const [selectedSize, setSelectedSize] = useState<string>('M');
  const [hoveredPom, setHoveredPom] = useState<number | null>(null);

  const measurements = data.measurements || [];
  const sizeCols = data.sizeColumns || ['S', 'M', 'L', 'XL', 'XXL'];

  // Resolve CAD variables for the selected size
  const sizeKey = selectedSize.toLowerCase();
  const { vars: rawVars, isCm, scale } = MeasurementMapper.extract(measurements, sizeKey);

  // Apply render-scale to draw the t-shirt guide layout beautifully inside SVG
  // 1000px width by 600px height. 
  // Let's use a scale of 0.55 relative to raw millimeter variables.
  const renderScale = 0.55;
  const variables: Record<string, number> = {};
  for (const [k, v] of Object.entries(rawVars)) {
    variables[k] = v * renderScale;
  }
  variables.bottomHemAllowance = 20;

  // Calculate dynamic values
  const frontNeckDrop = variables.frontNeckDrop;
  const backNeckDrop = variables.backNeckDrop;
  const halfNeck = variables.halfNeck;
  const halfShoulder = variables.halfShoulder;
  const shoulderSlope = variables.shoulderSlope;
  const acrossFront = variables.acrossFront;
  const acrossBack = variables.acrossBack;
  const halfChest = variables.halfChest;
  const halfHem = variables.halfHem;
  const bodyLength = variables.bodyLength;
  const sleeveLength = variables.sleeveLength;
  const halfBicep = variables.halfBicep;
  const halfWrist = variables.halfWrist;
  const elbowPosition = variables.elbowPosition;
  const halfElbow = variables.halfElbow;
  const forearmPosition = variables.forearmPosition;
  const halfForearm = variables.halfForearm;
  const bicepOffset = variables.bicepOffset || (1.0 * 25.4 * renderScale);

  // Solve for armhole control point and cap height
  const resolvedFront = resolveOps(basePieces.bodiceFront.ops, variables);
  const resolvedBack = resolveOps(basePieces.bodiceBack.ops, variables);
  const frontArmholeLen = calculateArmholeLength(resolvedFront, false);
  const backArmholeLen = calculateArmholeLength(resolvedBack, false);
  const totalArmholeLen = frontArmholeLen + backArmholeLen;

  let adjustedSleeveCap = variables.sleeveCap;
  if (totalArmholeLen > 0) {
    adjustedSleeveCap = solveSleeveCapHeight(halfBicep, totalArmholeLen + 5);
  }
  variables.adjustedSleeveCap = adjustedSleeveCap;

  // Determine if this is a short sleeve
  const isShortSleeve = sleeveLength < elbowPosition;
  const sleevePiece = isShortSleeve ? basePieces.sleeveShort : basePieces.sleeve;
  const resolvedSleeve = resolveOps(sleevePiece.ops, variables);

  // Construct SVG paths
  const frontPath = buildSvgPathString(resolvedFront);
  const backPath = buildSvgPathString(resolvedBack);
  const sleevePath = buildSvgPathString(resolvedSleeve);

  // Back Shoulder Y rise for rendering the shoulder height difference
  const backShoulderRise = halfShoulder * 0.019 + (halfChest - halfShoulder) * 0.110;

  // Define 18 POM locations & values
  const pomList = [
    {
      id: 1,
      name: "Neck width from seam to seam",
      valueKey: "halfNeck",
      isCircumference: false,
      displayVal: (rawVars.halfNeck * 2 / (isCm ? 10 : 25.4)).toFixed(3) + (isCm ? "cm" : '"'),
      getCoords: () => ({
        start: { x: -halfNeck, y: 0 },
        end: { x: halfNeck, y: 0 },
        placement: 'front' as const
      })
    },
    {
      id: 2,
      name: "Front neck drop from HPS to neck seam",
      valueKey: "frontNeckDrop",
      isCircumference: false,
      displayVal: (rawVars.frontNeckDrop / (isCm ? 10 : 25.4)).toFixed(3) + (isCm ? "cm" : '"'),
      getCoords: () => ({
        start: { x: 0, y: 0 },
        end: { x: 0, y: frontNeckDrop },
        placement: 'front' as const
      })
    },
    {
      id: 3,
      name: "Back neck drop from HPS to neck seam",
      valueKey: "backNeckDrop",
      isCircumference: false,
      displayVal: (rawVars.backNeckDrop / (isCm ? 10 : 25.4)).toFixed(3) + (isCm ? "cm" : '"'),
      getCoords: () => ({
        start: { x: 0, y: backNeckDrop },
        end: { x: 0, y: 0 },
        placement: 'back' as const
      })
    },
    {
      id: 4,
      name: "Shoulder width seam to seam",
      valueKey: "halfShoulder",
      isCircumference: false,
      displayVal: (rawVars.halfShoulder * 2 / (isCm ? 10 : 25.4)).toFixed(3) + (isCm ? "cm" : '"'),
      getCoords: () => ({
        start: { x: -halfShoulder, y: shoulderSlope - backShoulderRise },
        end: { x: halfShoulder, y: shoulderSlope - backShoulderRise },
        placement: 'back' as const
      })
    },
    {
      id: 5,
      name: "Shoulder Slope",
      valueKey: "shoulderSlope",
      isCircumference: false,
      displayVal: (rawVars.shoulderSlope / (isCm ? 10 : 25.4)).toFixed(3) + (isCm ? "cm" : '"'),
      getCoords: () => ({
        start: { x: halfShoulder, y: 0 },
        end: { x: halfShoulder, y: shoulderSlope },
        placement: 'front' as const
      })
    },
    {
      id: 6,
      name: "Across Front Middle of armhole",
      valueKey: "acrossFront",
      isCircumference: false,
      displayVal: (rawVars.acrossFront * 2 / (isCm ? 10 : 25.4)).toFixed(3) + (isCm ? "cm" : '"'),
      getCoords: () => ({
        start: { x: -acrossFront, y: shoulderSlope + (variables.armholeStraight - shoulderSlope) * 0.5 },
        end: { x: acrossFront, y: shoulderSlope + (variables.armholeStraight - shoulderSlope) * 0.5 },
        placement: 'front' as const
      })
    },
    {
      id: 7,
      name: "Across back middle of armhole",
      valueKey: "acrossBack",
      isCircumference: false,
      displayVal: (rawVars.acrossBack * 2 / (isCm ? 10 : 25.4)).toFixed(3) + (isCm ? "cm" : '"'),
      getCoords: () => ({
        start: { x: -acrossBack, y: (shoulderSlope - backShoulderRise) + (variables.armholeStraight - (shoulderSlope - backShoulderRise)) * 0.5 },
        end: { x: acrossBack, y: (shoulderSlope - backShoulderRise) + (variables.armholeStraight - (shoulderSlope - backShoulderRise)) * 0.5 },
        placement: 'back' as const
      })
    },
    {
      id: 8,
      name: 'Chest 1" below Armhole',
      valueKey: "halfChest",
      isCircumference: true,
      displayVal: (rawVars.halfChest * 4 / (isCm ? 10 : 25.4)).toFixed(3) + (isCm ? "cm" : '"'),
      getCoords: () => ({
        start: { x: -halfChest, y: variables.armholeStraight },
        end: { x: halfChest, y: variables.armholeStraight },
        placement: 'front' as const
      })
    },
    {
      id: 9,
      name: "Bottom Sweep relax",
      valueKey: "halfHem",
      isCircumference: true,
      displayVal: (rawVars.halfHem * 4 / (isCm ? 10 : 25.4)).toFixed(3) + (isCm ? "cm" : '"'),
      getCoords: () => ({
        start: { x: -halfHem, y: bodyLength },
        end: { x: halfHem, y: bodyLength },
        placement: 'front' as const
      })
    },
    {
      id: 10,
      name: "Armhole Curve all round",
      valueKey: "armholeCirc",
      isCircumference: true,
      displayVal: (rawVars.armholeCirc * 2 / (isCm ? 10 : 25.4)).toFixed(3) + (isCm ? "cm" : '"'),
      getCoords: () => ({
        // Curved line badge placement near armhole
        start: { x: acrossFront + 25, y: shoulderSlope + (variables.armholeStraight - shoulderSlope) * 0.5 },
        end: { x: acrossFront + 25, y: shoulderSlope + (variables.armholeStraight - shoulderSlope) * 0.5 },
        placement: 'front' as const,
        isBadgeOnly: true
      })
    },
    {
      id: 11,
      name: "Sleeve length from shoulder seam",
      valueKey: "sleeveLength",
      isCircumference: false,
      displayVal: (rawVars.sleeveLength / (isCm ? 10 : 25.4)).toFixed(3) + (isCm ? "cm" : '"'),
      getCoords: () => ({
        start: { x: halfBicep, y: 0 },
        end: { x: halfBicep, y: sleeveLength },
        placement: 'sleeve' as const
      })
    },
    {
      id: 12,
      name: "Biceps 1\" Below Arm hole",
      valueKey: "halfBicep",
      isCircumference: true,
      displayVal: (rawVars.halfBicep * 2 / (isCm ? 10 : 25.4)).toFixed(3) + (isCm ? "cm" : '"'),
      getCoords: () => ({
        start: { x: 0, y: adjustedSleeveCap + bicepOffset },
        end: { x: halfBicep * 2, y: adjustedSleeveCap + bicepOffset },
        placement: 'sleeve' as const
      })
    },
    {
      id: 13,
      name: "Elbow position from Shoulder seam",
      valueKey: "elbowPosition",
      isCircumference: false,
      disabled: isShortSleeve,
      displayVal: isShortSleeve ? "N/A" : (rawVars.elbowPosition / (isCm ? 10 : 25.4)).toFixed(3) + (isCm ? "cm" : '"'),
      getCoords: () => ({
        start: { x: halfBicep - halfElbow - 25, y: 0 },
        end: { x: halfBicep - halfElbow - 25, y: elbowPosition },
        placement: 'sleeve' as const
      })
    },
    {
      id: 14,
      name: "Elbow width all round",
      valueKey: "halfElbow",
      isCircumference: true,
      disabled: isShortSleeve,
      displayVal: isShortSleeve ? "N/A" : (rawVars.halfElbow * 2 / (isCm ? 10 : 25.4)).toFixed(3) + (isCm ? "cm" : '"'),
      getCoords: () => ({
        start: { x: halfBicep - halfElbow, y: elbowPosition },
        end: { x: halfBicep + halfElbow, y: elbowPosition },
        placement: 'sleeve' as const
      })
    },
    {
      id: 15,
      name: "Forearm position from Shoulder seam",
      valueKey: "forearmPosition",
      isCircumference: false,
      disabled: isShortSleeve,
      displayVal: isShortSleeve ? "N/A" : (rawVars.forearmPosition / (isCm ? 10 : 25.4)).toFixed(3) + (isCm ? "cm" : '"'),
      getCoords: () => ({
        start: { x: halfBicep - halfForearm - 15, y: 0 },
        end: { x: halfBicep - halfForearm - 15, y: forearmPosition },
        placement: 'sleeve' as const
      })
    },
    {
      id: 16,
      name: "Forearm width all round",
      valueKey: "halfForearm",
      isCircumference: true,
      disabled: isShortSleeve,
      displayVal: isShortSleeve ? "N/A" : (rawVars.halfForearm * 2 / (isCm ? 10 : 25.4)).toFixed(3) + (isCm ? "cm" : '"'),
      getCoords: () => ({
        start: { x: halfBicep - halfForearm, y: forearmPosition },
        end: { x: halfBicep + halfForearm, y: forearmPosition },
        placement: 'sleeve' as const
      })
    },
    {
      id: 17,
      name: "Sleeve open at edge",
      valueKey: "halfWrist",
      isCircumference: true,
      displayVal: (rawVars.halfWrist * 2 / (isCm ? 10 : 25.4)).toFixed(3) + (isCm ? "cm" : '"'),
      getCoords: () => ({
        start: { x: halfBicep - halfWrist, y: sleeveLength },
        end: { x: halfBicep + halfWrist, y: sleeveLength },
        placement: 'sleeve' as const
      })
    },
    {
      id: 18,
      name: "Front length from Hps",
      valueKey: "bodyLength",
      isCircumference: false,
      displayVal: (rawVars.bodyLength / (isCm ? 10 : 25.4)).toFixed(3) + (isCm ? "cm" : '"'),
      getCoords: () => ({
        start: { x: halfNeck, y: 0 },
        end: { x: halfNeck, y: bodyLength },
        placement: 'front' as const
      })
    }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold uppercase tracking-tight text-gray-900">Pattern Measurement Guide</h2>
          <p className="text-sm text-gray-500">Visual mapping of tech pack measurements directly resolved against garment patterns.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-gray-100 p-0.5 rounded-lg inline-flex border border-gray-200">
            <button
              onClick={() => setGuideMode('auto')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${guideMode === 'auto' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Auto-Generated Guide
            </button>
            <button
              onClick={() => setGuideMode('custom')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${guideMode === 'custom' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Custom Sketch Annotation
            </button>
          </div>

          {guideMode === 'auto' && (
            <select
              value={selectedSize}
              onChange={(e) => setSelectedSize(e.target.value)}
              className="bg-white border border-gray-300 rounded-md text-xs font-semibold px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
            >
              {sizeCols.map(sz => (
                <option key={sz} value={sz}>Size: {sz}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {guideMode === 'custom' ? (
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-sm font-bold uppercase text-gray-700">Guide Canvas</h3>
             {!data.measurementGuideBaseImage && (
                 <button 
                    onClick={() => updateData({ measurementGuideBaseImage: DEFAULT_SHIRT_SVG, measurementAnnotations: [] })}
                    className="text-xs bg-black text-white hover:bg-gray-800 px-3 py-1.5 rounded flex items-center gap-2 font-medium transition-colors"
                 >
                    <Shirt size={14} /> Load Generic Garment
                 </button>
             )}
          </div>
          {data.measurementGuideBaseImage ? (
             <AnnotationCanvas 
                baseImage={data.measurementGuideBaseImage}
                annotations={data.measurementAnnotations || []}
                onChangeAnnotations={(anns) => updateData({ measurementAnnotations: anns })}
                onUpdateExportImage={(dataUrl) => updateData({ measurementGuideImage: dataUrl })}
                onRemove={() => updateData({ measurementGuideBaseImage: undefined, measurementGuideImage: undefined, measurementAnnotations: [] })}
             />
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50 flex flex-col items-center justify-center hover:bg-gray-100 transition-colors relative cursor-pointer min-h-[300px]">
               <Shirt className="text-gray-300 mb-4" size={48} />
               <span className="text-sm font-medium text-gray-600">Click to upload your own outline image</span>
               <span className="text-xs text-gray-400 mt-1">or use the generic button above</span>
               <input 
                 type="file" 
                 accept="image/*"
                 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                 onChange={async (e) => {
                   const file = e.target.files?.[0];
                   if (file) {
                     const formData = new FormData();
                     formData.append('file', file);
                     try {
                       const res = await fetch('/api/upload', { method: 'POST', body: formData });
                       const resData = await res.json();
                       if (resData.success) {
                         updateData({ 
                           measurementGuideBaseImage: resData.fileUrl,
                           measurementGuideImage: resData.fileUrl,
                           measurementAnnotations: []
                         });
                       }
                     } catch (error) { console.error('Upload error:', error); }
                   }
                 }}
               />
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main SVG Vector Canvas */}
          <div className="lg:col-span-2 border border-gray-200 rounded-xl overflow-hidden bg-gray-50 p-4 flex items-center justify-center min-h-[500px]">
            <svg viewBox="0 0 1000 600" className="w-full h-auto max-h-[550px]">
              {/* Definitions for arrow markers */}
              <defs>
                <marker id="arrow-start" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 5 L 10 2 L 8 5 L 10 8 Z" fill="red" />
                </marker>
                <marker id="arrow-end" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 5 L 10 2 L 8 5 L 10 8 Z" fill="red" />
                </marker>
                <marker id="arrow-start-highlight" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 0 5 L 10 2 L 8 5 L 10 8 Z" fill="#2563eb" />
                </marker>
                <marker id="arrow-end-highlight" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                  <path d="M 0 5 L 10 2 L 8 5 L 10 8 Z" fill="#2563eb" />
                </marker>
              </defs>

              {/* 1. FRONT BODICE (Mirrored, centered at X=200, Y=100) */}
              <g transform="translate(200, 100)">
                <path d={frontPath} fill="#f8fafc" stroke="#64748b" strokeWidth="1.5" />
                <path d={frontPath} transform="scale(-1, 1)" fill="#f8fafc" stroke="#64748b" strokeWidth="1.5" />
                <text x="0" y={bodyLength + 30} textAnchor="middle" className="text-xs font-bold fill-gray-500 font-sans tracking-wider">FRONT</text>
              </g>

              {/* 2. BACK BODICE (Mirrored, centered at X=500, Y=100) */}
              <g transform="translate(500, 100)">
                <path d={backPath} fill="#f8fafc" stroke="#64748b" strokeWidth="1.5" />
                <path d={backPath} transform="scale(-1, 1)" fill="#f8fafc" stroke="#64748b" strokeWidth="1.5" />
                <text x="0" y={bodyLength + 30} textAnchor="middle" className="text-xs font-bold fill-gray-500 font-sans tracking-wider">BACK</text>
              </g>

              {/* 3. SLEEVE (Symmetrical, centered at X=800, Y=100) */}
              <g transform={`translate(${800 - halfBicep}, 120)`}>
                <path d={sleevePath} fill="#f8fafc" stroke="#64748b" strokeWidth="1.5" />
                <text x={halfBicep} y={sleeveLength + 30} textAnchor="middle" className="text-xs font-bold fill-gray-500 font-sans tracking-wider">SLEEVE</text>
              </g>

              {/* 4. ANNOTATIONS OVERLAY */}
              {pomList.map((pom) => {
                if (pom.disabled) return null;
                const isHovered = hoveredPom === pom.id;
                const coords = pom.getCoords();

                // Compute final pixel positions inside the SVG
                let tx = 0;
                let ty = 0;
                if (coords.placement === 'front') {
                  tx = 200;
                  ty = 100;
                } else if (coords.placement === 'back') {
                  tx = 500;
                  ty = 100;
                } else if (coords.placement === 'sleeve') {
                  tx = 800 - halfBicep;
                  ty = 120;
                }

                const sx = coords.start.x + tx;
                const sy = coords.start.y + ty;
                const ex = coords.end.x + tx;
                const ey = coords.end.y + ty;

                // Center of the annotation line
                const cx = (sx + ex) / 2;
                const cy = (sy + ey) / 2;

                const isBadgeOnly = (coords as any).isBadgeOnly;

                return (
                  <g 
                    key={pom.id}
                    onMouseEnter={() => setHoveredPom(pom.id)}
                    onMouseLeave={() => setHoveredPom(null)}
                    className="cursor-pointer"
                  >
                    {!isBadgeOnly && (
                      <line
                        x1={sx}
                        y1={sy}
                        x2={ex}
                        y2={ey}
                        stroke={isHovered ? '#2563eb' : 'red'}
                        strokeWidth={isHovered ? 2.5 : 1.5}
                        strokeDasharray="4,3"
                        markerStart={`url(#${isHovered ? 'arrow-start-highlight' : 'arrow-start'})`}
                        markerEnd={`url(#${isHovered ? 'arrow-end-highlight' : 'arrow-end'})`}
                        style={{ transition: 'stroke-width 0.2s' }}
                      />
                    )}

                    {/* Circle Tag badge */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHovered ? 13 : 10}
                      fill={isHovered ? '#2563eb' : 'red'}
                      stroke="white"
                      strokeWidth={1.5}
                      className="transition-all duration-200"
                    />
                    <text
                      x={cx}
                      y={cy + 3.5}
                      textAnchor="middle"
                      fill="white"
                      fontSize={isHovered ? 11 : 9}
                      fontWeight="bold"
                      className="font-mono transition-all duration-200"
                    >
                      {pom.id}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Right Checklist Sidebar */}
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col h-[500px]">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <Layers size={14} className="text-blue-600" /> POM Utilization Checklist
              </span>
              <span className="text-[10px] bg-green-100 text-green-800 font-semibold px-2 py-0.5 rounded-full">
                {pomList.filter(p => !p.disabled).length} / {pomList.length} Mapped
              </span>
            </div>

            <div className="overflow-y-auto divide-y divide-gray-100 flex-1">
              {pomList.map((pom) => {
                const isHovered = hoveredPom === pom.id;
                return (
                  <div
                    key={pom.id}
                    onMouseEnter={() => setHoveredPom(pom.id)}
                    onMouseLeave={() => setHoveredPom(null)}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                      pom.disabled 
                        ? 'opacity-40 bg-gray-50 cursor-not-allowed' 
                        : isHovered 
                          ? 'bg-blue-50/70 cursor-pointer' 
                          : 'hover:bg-gray-50 cursor-pointer'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold border transition-colors ${
                      pom.disabled
                        ? 'bg-gray-200 text-gray-400 border-gray-300'
                        : isHovered 
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-red-50 text-red-600 border-red-200'
                    }`}>
                      {pom.id}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${isHovered ? 'text-blue-900 font-semibold' : 'text-gray-700'}`}>
                        {pom.name}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">
                        Key: {pom.valueKey} {pom.isCircumference ? '(Circ.)' : '(Flat)'}
                      </p>
                    </div>

                    <div className="text-right">
                      {pom.disabled ? (
                        <span className="text-[10px] font-mono text-gray-400 font-medium italic">N/A</span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className={`text-xs font-mono font-bold ${isHovered ? 'text-blue-600' : 'text-gray-900'}`}>
                            {pom.displayVal}
                          </span>
                          <Check size={12} className="text-green-500 font-bold" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
