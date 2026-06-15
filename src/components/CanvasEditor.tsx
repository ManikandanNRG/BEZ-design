'use client';

import React, { useState, useRef, useEffect } from 'react';
import { RotateCcw, Check, Eye } from 'lucide-react';

interface CanvasEditorProps {
  artworkUrl: string | null;
  artworkCategory: string; // FRONT, BACK, SLEEVE, CHEST_LOGO
  garmentCategory: string; // T-Shirt, Hoodie
  garmentColor: string; // e.g. Black, White, Charcoal
  onSave: (specs: {
    placement: string;
    width: number;
    height: number;
    offsetFromHps: number;
    offsetFromCf: number;
    mockupDataUrl: string;
  }) => void;
}

// Crisp Vector Outlines for Garments - FRONT
const TShirtOutline = ({ color }: { color: string }) => (
  <svg viewBox="0 0 400 450" className="w-full h-full drop-shadow-lg select-none" pointerEvents="none">
    {/* Body Base */}
    <path
      d="M 120 40 C 140 40, 160 46, 200 46 C 240 46, 260 40, 280 40 C 295 40, 310 44, 320 52 L 390 100 C 398 106, 396 118, 388 122 L 350 142 C 342 146, 335 142, 332 135 L 320 105 L 320 410 C 320 416, 315 420, 308 420 L 92 420 C 85 420, 80 416, 80 410 L 80 105 L 68 135 C 65 142, 58 146, 50 142 L 12 122 C 4 118, 2 106, 10 100 L 80 52 C 90 44, 105 40, 120 40 Z"
      fill={color}
      stroke="#27272a"
      strokeWidth="2"
    />
    {/* Soft side shading overlay */}
    <path
      d="M 320 105 L 320 410 C 320 416, 315 420, 308 420 L 260 420 C 275 400, 280 300, 280 200 C 280 120, 295 105, 320 105 Z"
      fill="#000000"
      opacity="0.06"
    />
    <path
      d="M 80 105 L 80 410 C 80 416, 85 420, 92 420 L 140 420 C 125 400, 120 300, 120 200 C 120 120, 105 105, 80 105 Z"
      fill="#ffffff"
      opacity="0.12"
    />
    {/* Crewneck Ribbing lines */}
    <path
      d="M 140 40 C 160 66, 240 66, 260 40"
      fill="none"
      stroke="#18181b"
      strokeWidth="3"
    />
    <path
      d="M 145 42 C 160 62, 240 62, 255 42"
      fill="none"
      stroke="#71717a"
      strokeWidth="0.8"
      strokeDasharray="2 2"
      opacity="0.8"
    />
    {/* Sleeve cuffs double stitching */}
    <path d="M 356 139 L 382 125 M 359 141 L 385 127" fill="none" stroke="#27272a" strokeWidth="0.8" opacity="0.5" strokeDasharray="3 2" />
    <path d="M 44 139 L 18 125 M 41 141 L 15 127" fill="none" stroke="#27272a" strokeWidth="0.8" opacity="0.5" strokeDasharray="3 2" />
    
    {/* Bottom Hem double stitching */}
    <path d="M 82 412 L 318 412 M 82 415 L 318 415" fill="none" stroke="#27272a" strokeWidth="1" opacity="0.5" strokeDasharray="4 2" />
    
    {/* Armhole seam lines */}
    <path d="M 96 85 C 96 115, 96 130, 96 150" fill="none" stroke="#27272a" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
    <path d="M 304 85 C 304 115, 304 130, 304 150" fill="none" stroke="#27272a" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
    
    {/* Wrinkles and Creases */}
    <path d="M 98 125 Q 110 135 120 130" fill="none" stroke="#27272a" strokeWidth="0.8" opacity="0.25" />
    <path d="M 302 125 Q 290 135 280 130" fill="none" stroke="#27272a" strokeWidth="0.8" opacity="0.25" />
    <path d="M 170 65 Q 200 75 230 65" fill="none" stroke="#27272a" strokeWidth="0.8" opacity="0.2" />
    <path d="M 85 360 Q 110 370 120 380" fill="none" stroke="#27272a" strokeWidth="0.8" opacity="0.15" />
    <path d="M 315 360 Q 290 370 280 380" fill="none" stroke="#27272a" strokeWidth="0.8" opacity="0.15" />
  </svg>
);

// Crisp Vector Outlines for Garments - BACK
const TShirtBackOutline = ({ color }: { color: string }) => (
  <svg viewBox="0 0 400 450" className="w-full h-full drop-shadow-lg select-none" pointerEvents="none">
    {/* Body Base */}
    <path
      d="M 120 40 C 140 40, 160 46, 200 46 C 240 46, 260 40, 280 40 C 295 40, 310 44, 320 52 L 390 100 C 398 106, 396 118, 388 122 L 350 142 C 342 146, 335 142, 332 135 L 320 105 L 320 410 C 320 416, 315 420, 308 420 L 92 420 C 85 420, 80 416, 80 410 L 80 105 L 68 135 C 65 142, 58 146, 50 142 L 12 122 C 4 118, 2 106, 10 100 L 80 52 C 90 44, 105 40, 120 40 Z"
      fill={color}
      stroke="#27272a"
      strokeWidth="2"
    />
    {/* Soft side shading overlay */}
    <path
      d="M 320 105 L 320 410 C 320 416, 315 420, 308 420 L 260 420 C 275 400, 280 300, 280 200 C 280 120, 295 105, 320 105 Z"
      fill="#000000"
      opacity="0.06"
    />
    <path
      d="M 80 105 L 80 410 C 80 416, 85 420, 92 420 L 140 420 C 125 400, 120 300, 120 200 C 120 120, 105 105, 80 105 Z"
      fill="#ffffff"
      opacity="0.12"
    />
    {/* High Neck Collar line */}
    <path
      d="M 140 40 C 160 46, 240 46, 260 40"
      fill="none"
      stroke="#18181b"
      strokeWidth="3.5"
    />
    {/* Half Moon Back Patch */}
    <path
      d="M 148 44 C 160 78, 240 78, 252 44"
      fill="none"
      stroke="#27272a"
      strokeWidth="1.2"
      strokeDasharray="3 2"
      opacity="0.6"
    />
    {/* Sleeve cuffs double stitching */}
    <path d="M 356 139 L 382 125 M 359 141 L 385 127" fill="none" stroke="#27272a" strokeWidth="0.8" opacity="0.5" strokeDasharray="3 2" />
    <path d="M 44 139 L 18 125 M 41 141 L 15 127" fill="none" stroke="#27272a" strokeWidth="0.8" opacity="0.5" strokeDasharray="3 2" />
    {/* Bottom Hem double stitching */}
    <path d="M 82 412 L 318 412 M 82 415 L 318 415" fill="none" stroke="#27272a" strokeWidth="1" opacity="0.5" strokeDasharray="4 2" />
    {/* Armhole seam lines */}
    <path d="M 96 85 C 96 115, 96 130, 96 150" fill="none" stroke="#27272a" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
    <path d="M 304 85 C 304 115, 304 130, 304 150" fill="none" stroke="#27272a" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
  </svg>
);

// Hoodie Vector Outline - FRONT
const HoodieOutline = ({ color }: { color: string }) => (
  <svg viewBox="0 0 400 450" className="w-full h-full drop-shadow-lg select-none" pointerEvents="none">
    {/* Body Base */}
    <path
      d="M 115 65 C 130 65, 150 78, 200 78 C 250 78, 270 65, 285 65 C 295 65, 310 70, 320 80 L 390 140 C 397 146, 395 156, 388 160 L 355 178 C 348 182, 340 178, 336 172 L 325 145 L 320 390 C 320 398, 312 405, 300 405 L 100 405 C 88 405, 80 398, 80 390 L 75 145 L 64 172 C 60 178, 52 182, 45 178 L 12 160 C 5 156, 3 146, 10 140 L 80 80 C 90 70, 105 65, 115 65 Z"
      fill={color}
      stroke="#27272a"
      strokeWidth="2"
    />
    {/* Soft side shading overlay */}
    <path
      d="M 320 120 L 320 390 C 320 398, 312 405, 300 405 L 250 405 C 265 390, 270 300, 270 200 C 270 140, 290 120, 320 120 Z"
      fill="#000000"
      opacity="0.06"
    />
    <path
      d="M 80 120 L 75 145 L 80 390 C 80 398, 88 405, 100 405 L 150 405 C 135 390, 130 300, 130 200 C 130 140, 110 120, 80 120 Z"
      fill="#ffffff"
      opacity="0.12"
    />
    {/* Hood */}
    <path
      d="M 140 68 C 120 68, 110 5, 200 5 C 290 5, 280 68, 260 68 C 240 70, 160 70, 140 68 Z"
      fill={color}
      stroke="#27272a"
      strokeWidth="1.8"
    />
    {/* Hood opening inside */}
    <path
      d="M 160 68 C 160 25, 240 25, 240 68"
      fill="#1f2937"
      opacity="0.35"
      stroke="#1f2937"
      strokeWidth="1.5"
    />
    {/* Drawstrings */}
    <path d="M 185 68 L 185 135" fill="none" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="185" cy="135" r="2" fill="#9ca3af" />
    <path d="M 215 68 L 215 125" fill="none" stroke="#d1d5db" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="215" cy="125" r="2" fill="#9ca3af" />
    
    {/* Kangaroo Pocket */}
    <path
      d="M 120 270 L 280 270 L 290 330 C 290 340, 280 350, 270 350 L 130 350 C 120 350, 110 340, 110 330 Z"
      fill="none"
      stroke="#27272a"
      strokeWidth="1.8"
    />
    <path d="M 110 330 L 130 295" fill="none" stroke="#27272a" strokeWidth="1.5" />
    <path d="M 290 330 L 270 295" fill="none" stroke="#27272a" strokeWidth="1.5" />
    
    {/* Ribbed cuffs & waistband */}
    <line x1="80" y1="390" x2="320" y2="390" stroke="#27272a" strokeWidth="3" />
    <line x1="80" y1="400" x2="320" y2="400" stroke="#27272a" strokeWidth="2" />
    {/* Wrinkle lines */}
    <path d="M 82 165 Q 92 175 102 170" fill="none" stroke="#27272a" strokeWidth="0.8" opacity="0.25" />
    <path d="M 318 165 Q 308 175 298 170" fill="none" stroke="#27272a" strokeWidth="0.8" opacity="0.25" />
  </svg>
);

// Hoodie Vector Outline - BACK
const HoodieBackOutline = ({ color }: { color: string }) => (
  <svg viewBox="0 0 400 450" className="w-full h-full drop-shadow-lg select-none" pointerEvents="none">
    {/* Body Base */}
    <path
      d="M 115 65 C 130 65, 150 78, 200 78 C 250 78, 270 65, 285 65 C 295 65, 310 70, 320 80 L 390 140 C 397 146, 395 156, 388 160 L 355 178 C 348 182, 340 178, 336 172 L 325 145 L 320 390 C 320 398, 312 405, 300 405 L 100 405 C 88 405, 80 398, 80 390 L 75 145 L 64 172 C 60 178, 52 182, 45 178 L 12 160 C 5 156, 3 146, 10 140 L 80 80 C 90 70, 105 65, 115 65 Z"
      fill={color}
      stroke="#27272a"
      strokeWidth="2"
    />
    {/* Soft side shading overlay */}
    <path
      d="M 320 120 L 320 390 C 320 398, 312 405, 300 405 L 250 405 C 265 390, 270 300, 270 200 C 270 140, 290 120, 320 120 Z"
      fill="#000000"
      opacity="0.06"
    />
    <path
      d="M 80 120 L 75 145 L 80 390 C 80 398, 88 405, 100 405 L 150 405 C 135 390, 130 300, 130 200 C 130 140, 110 120, 80 120 Z"
      fill="#ffffff"
      opacity="0.12"
    />
    {/* Hood seen from back */}
    <path
      d="M 140 68 C 120 68, 100 5, 200 5 C 300 5, 280 68, 260 68 C 240 70, 160 70, 140 68 Z"
      fill={color}
      stroke="#27272a"
      strokeWidth="1.8"
    />
    {/* Hood center seam */}
    <path d="M 200 5 L 200 68" fill="none" stroke="#27272a" strokeWidth="1.2" strokeDasharray="3 2" />
    
    {/* Ribbed cuffs & waistband */}
    <line x1="80" y1="390" x2="320" y2="390" stroke="#27272a" strokeWidth="3" />
    <line x1="80" y1="400" x2="320" y2="400" stroke="#27272a" strokeWidth="2" />
  </svg>
);

export default function CanvasEditor({
  artworkUrl,
  artworkCategory,
  garmentCategory,
  garmentColor,
  onSave,
}: CanvasEditorProps) {
  // Navigation states & interactive coordinates
  const [viewSide, setViewSide] = useState<'front' | 'back'>('front');
  const [position, setPosition] = useState({ x: 140, y: 110 }); // Center in editor
  const [scale, setScale] = useState(100); // Width of print
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragMode, setDragMode] = useState<'translate' | 'scale' | 'rotate'>('translate');
  const [initialPointer, setInitialPointer] = useState({ x: 0, y: 0 });
  const [initialGeometry, setInitialGeometry] = useState({ x: 0, y: 0, scale: 100 });

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync side view with default artwork placement category
  useEffect(() => {
    setRotation(0);
    if (artworkCategory === 'BACK') {
      setViewSide('back');
      setPosition({ x: 100, y: 120 });
      setScale(200); // Back print defaults larger
    } else if (artworkCategory === 'CHEST_LOGO') {
      setViewSide('front');
      setPosition({ x: 235, y: 115 });
      setScale(55); // Left chest print defaults smaller
    } else {
      setViewSide('front');
      setPosition({ x: 140, y: 110 });
      setScale(120); // Front print size
    }
  }, [artworkCategory]);

  const PIXELS_TO_CM = 0.2167; // Calibration factor
  const collarY = garmentCategory === 'Hoodie' ? 78 : 62;
  const centerX = 200;

  // Real world output metrics
  const printWidthCm = Math.round(scale * PIXELS_TO_CM * 10) / 10;
  const printHeightCm = Math.round(scale * PIXELS_TO_CM * 10) / 10;

  // HPS offset (from collar rib center top to print top)
  const offsetFromHpsCm = Math.round((position.y - collarY) * PIXELS_TO_CM * 10) / 10;
  // Center Line offset
  const artworkCenter = position.x + scale / 2;
  const offsetFromCfCm = Math.round((artworkCenter - centerX) * PIXELS_TO_CM * 10) / 10;

  // Generate vector placeholder SVG URL (Fallback print box)
  const getPlaceholderSvg = () => {
    const labelText = artworkCategory === 'BACK' ? 'BACK ARTWORK' : artworkCategory === 'CHEST_LOGO' ? 'CHEST LOGO' : 'FRONT ARTWORK';
    const svgStr = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <rect width="98" height="98" x="1" y="1" fill="#2d3748" fill-opacity="0.65" stroke="#f6ad55" stroke-width="2.5" stroke-dasharray="4 3" rx="6"/>
        <text x="50%" y="40%" dominant-baseline="middle" text-anchor="middle" font-size="8.5" font-family="monospace" fill="#ffffff" font-weight="bold">${labelText}</text>
        <text x="50%" y="65%" dominant-baseline="middle" text-anchor="middle" font-size="7.5" font-family="sans-serif" fill="#cbd5e0" font-weight="bold">${printWidthCm}x${printHeightCm} cm</text>
      </svg>
    `;
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
  };

  const activeArtworkUrl = artworkUrl || getPlaceholderSvg();

  // Pointer dragging handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setDragMode('translate');
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleScalePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragMode('scale');
    setIsDragging(true);
    setInitialPointer({ x: e.clientX, y: e.clientY });
    setInitialGeometry({ x: position.x, y: position.y, scale });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleRotatePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragMode('rotate');
    setIsDragging(true);
    setInitialPointer({ x: e.clientX, y: e.clientY });
    setInitialGeometry({ x: position.x, y: position.y, scale });
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    
    if (dragMode === 'translate') {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    } else if (dragMode === 'scale') {
      const deltaX = e.clientX - initialPointer.x;
      const newScale = Math.max(30, Math.min(250, initialGeometry.scale + deltaX));
      const centerXVal = initialGeometry.x + initialGeometry.scale / 2;
      const centerYVal = initialGeometry.y + initialGeometry.scale / 2;
      setPosition({
        x: centerXVal - newScale / 2,
        y: centerYVal - newScale / 2,
      });
      setScale(newScale);
    } else if (dragMode === 'rotate') {
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (containerRect) {
        const graphicCenterX = containerRect.left + position.x + scale / 2;
        const graphicCenterY = containerRect.top + position.y + scale / 2;
        
        const angleRad = Math.atan2(e.clientY - graphicCenterY, e.clientX - graphicCenterX);
        const angleDeg = angleRad * (180 / Math.PI) + 90; // +90 because handle is at top
        
        let normAngle = Math.round(angleDeg) % 360;
        if (normAngle < 0) normAngle += 360;
        setRotation(normAngle);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const getGarmentColorHex = (colorStr: string) => {
    const colors: Record<string, string> = {
      black: '#151515',
      white: '#f9f9f9',
      grey: '#52525b',
      charcoal: '#27272a',
      red: '#D62828',
      navy: '#1e3a8a',
      green: '#14532d',
      beige: '#f5f5f4',
    };
    return colors[colorStr.toLowerCase()] || '#18181b';
  };

  // Lock Specs and trigger export snapshot URL
  const handleSaveSpecs = () => {
    const svgColor = getGarmentColorHex(garmentColor);
    let garmentSvgStr = '';

    if (garmentCategory === 'Hoodie') {
      if (viewSide === 'back') {
        garmentSvgStr = `<path d="M 115 65 C 130 65, 150 78, 200 78 C 250 78, 270 65, 285 65 C 295 65, 310 70, 320 80 L 390 140 C 397 146, 395 156, 388 160 L 355 178 C 348 182, 340 178, 336 172 L 325 145 L 320 390 C 320 398, 312 405, 300 405 L 100 405 C 88 405, 80 398, 80 390 L 75 145 L 64 172 C 60 178, 52 182, 45 178 L 12 160 C 5 156, 3 146, 10 140 L 80 80 C 90 70, 105 65, 115 65 Z" fill="${svgColor}" stroke="#27272a" stroke-width="2.5"/><path d="M 320 120 L 320 390 C 320 398, 312 405, 300 405 L 250 405 C 265 390, 270 300, 270 200 C 270 140, 290 120, 320 120 Z" fill="#000000" opacity="0.06"/><path d="M 80 120 L 75 145 L 80 390 C 80 398, 88 405, 100 405 L 150 405 C 135 390, 130 300, 130 200 C 130 140, 110 120, 80 120 Z" fill="#ffffff" opacity="0.12"/><path d="M 140 68 C 120 68, 100 5, 200 5 C 300 5, 280 68, 260 68 C 240 70, 160 70, 140 68 Z" fill="${svgColor}" stroke="#27272a" stroke-width="1.8"/><path d="M 200 5 L 200 68" fill="none" stroke="#27272a" stroke-width="1.2" stroke-dasharray="3,2" /><line x1="80" y1="390" x2="320" y2="390" stroke="#27272a" stroke-width="3" /><line x1="80" y1="400" x2="320" y2="400" stroke="#27272a" stroke-width="2" />`;
      } else {
        garmentSvgStr = `<path d="M 115 65 C 130 65, 150 78, 200 78 C 250 78, 270 65, 285 65 C 295 65, 310 70, 320 80 L 390 140 C 397 146, 395 156, 388 160 L 355 178 C 348 182, 340 178, 336 172 L 325 145 L 320 390 C 320 398, 312 405, 300 405 L 100 405 C 88 405, 80 398, 80 390 L 75 145 L 64 172 C 60 178, 52 182, 45 178 L 12 160 C 5 156, 3 146, 10 140 L 80 80 C 90 70, 105 65, 115 65 Z" fill="${svgColor}" stroke="#27272a" stroke-width="2.5"/><path d="M 320 120 L 320 390 C 320 398, 312 405, 300 405 L 250 405 C 265 390, 270 300, 270 200 C 270 140, 290 120, 320 120 Z" fill="#000000" opacity="0.06"/><path d="M 80 120 L 75 145 L 80 390 C 80 398, 88 405, 100 405 L 150 405 C 135 390, 130 300, 130 200 C 130 140, 110 120, 80 120 Z" fill="#ffffff" opacity="0.12"/><path d="M 140 68 C 120 68, 110 5, 200 5 C 290 5, 280 68, 260 68 C 240 70, 160 70, 140 68 Z" fill="${svgColor}" stroke="#27272a" stroke-width="1.8"/><path d="M 160 68 C 160 25, 240 25, 240 68" fill="#1f2937" opacity="0.35" stroke="#1f2937" stroke-width="1.5"/><path d="M 185 68 L 185 135" stroke="#d1d5db" stroke-width="2.5" stroke-linecap="round"/><path d="M 215 68 L 215 125" stroke="#d1d5db" stroke-width="2.5" stroke-linecap="round"/><path d="M 120 270 L 280 270 L 290 330 C 290 340, 280 350, 270 350 L 130 350 C 120 350, 110 340, 110 330 Z" fill="none" stroke="#27272a" stroke-width="1.8"/><line x1="80" y1="390" x2="320" y2="390" stroke="#27272a" stroke-width="3" /><line x1="80" y1="400" x2="320" y2="400" stroke="#27272a" stroke-width="2" /><path d="M 82 165 Q 92 175 102 170" fill="none" stroke="#27272a" stroke-width="0.8" opacity="0.25"/><path d="M 318 165 Q 308 175 298 170" fill="none" stroke="#27272a" stroke-width="0.8" opacity="0.25" />`;
      }
    } else {
      if (viewSide === 'back') {
        garmentSvgStr = `<path d="M 120 40 C 140 40, 160 46, 200 46 C 240 46, 260 40, 280 40 C 295 40, 310 44, 320 52 L 390 100 C 398 106, 396 118, 388 122 L 350 142 C 342 146, 335 142, 332 135 L 320 105 L 320 410 C 320 416, 315 420, 308 420 L 92 420 C 85 420, 80 416, 80 410 L 80 105 L 68 135 C 65 142, 58 146, 50 142 L 12 122 C 4 118, 2 106, 10 100 L 80 52 C 90 44, 105 40, 120 40 Z" fill="${svgColor}" stroke="#27272a" stroke-width="2"/><path d="M 320 105 L 320 410 C 320 416, 315 420, 308 420 L 260 420 C 275 400, 280 300, 280 200 C 280 120, 295 105, 320 105 Z" fill="#000000" opacity="0.06"/><path d="M 80 105 L 80 410 C 80 416, 85 420, 92 420 L 140 420 C 125 400, 120 300, 120 200 C 120 120, 105 105, 80 105 Z" fill="#ffffff" opacity="0.12"/><path d="M 140 40 C 160 46, 240 46, 260 40" fill="none" stroke="#18181b" stroke-width="3.5"/><path d="M 148 44 C 160 78, 240 78, 252 44" fill="none" stroke="#27272a" stroke-width="1.2" stroke-dasharray="3 2" opacity="0.6"/><path d="M 356 139 L 382 125 M 359 141 L 385 127" stroke="#27272a" stroke-width="1" stroke-dasharray="3 2" opacity="0.6"/><path d="M 44 139 L 18 125 M 41 141 L 15 127" stroke="#27272a" stroke-width="1" stroke-dasharray="3 2" opacity="0.6"/><path d="M 82 412 L 318 412 M 82 415 L 318 415" stroke="#27272a" stroke-width="1.2" stroke-dasharray="4 2" opacity="0.6"/><path d="M 96 85 C 96 115, 96 130, 96 150" stroke="#27272a" stroke-width="1" stroke-dasharray="3 3" opacity="0.5"/><path d="M 304 85 C 304 115, 304 130, 304 150" stroke="#27272a" stroke-width="1" stroke-dasharray="3 3" opacity="0.5"/>`;
      } else {
        garmentSvgStr = `<path d="M 120 40 C 140 40, 160 46, 200 46 C 240 46, 260 40, 280 40 C 295 40, 310 44, 320 52 L 390 100 C 398 106, 396 118, 388 122 L 350 142 C 342 146, 335 142, 332 135 L 320 105 L 320 410 C 320 416, 315 420, 308 420 L 92 420 C 85 420, 80 416, 80 410 L 80 105 L 68 135 C 65 142, 58 146, 50 142 L 12 122 C 4 118, 2 106, 10 100 L 80 52 C 90 44, 105 40, 120 40 Z" fill="${svgColor}" stroke="#27272a" stroke-width="2"/><path d="M 320 105 L 320 410 C 320 416, 315 420, 308 420 L 260 420 C 275 400, 280 300, 280 200 C 280 120, 295 105, 320 105 Z" fill="#000000" opacity="0.06"/><path d="M 80 105 L 80 410 C 80 416, 85 420, 92 420 L 140 420 C 125 400, 120 300, 120 200 C 120 120, 105 105, 80 105 Z" fill="#ffffff" opacity="0.12"/><path d="M 140 40 C 160 66, 240 66, 260 40" fill="none" stroke="#18181b" stroke-width="3.5"/><path d="M 145 42 C 160 62, 240 62, 255 42" fill="none" stroke="#71717a" stroke-width="1" stroke-dasharray="2 2"/><path d="M 356 139 L 382 125 M 359 141 L 385 127" stroke="#27272a" stroke-width="1" stroke-dasharray="3 2" opacity="0.6"/><path d="M 44 139 L 18 125 M 41 141 L 15 127" stroke="#27272a" stroke-width="1" stroke-dasharray="3 2" opacity="0.6"/><path d="M 82 412 L 318 412 M 82 415 L 318 415" stroke="#27272a" stroke-width="1.2" stroke-dasharray="4 2" opacity="0.6"/><path d="M 96 85 C 96 115, 96 130, 96 150" stroke="#27272a" stroke-width="1" stroke-dasharray="3 3" opacity="0.5"/><path d="M 304 85 C 304 115, 304 130, 304 150" stroke="#27272a" stroke-width="1" stroke-dasharray="3 3" opacity="0.5"/><path d="M 98 125 Q 110 135 120 130" stroke="#27272a" stroke-width="1" opacity="0.3"/><path d="M 302 125 Q 290 135 280 130" stroke="#27272a" stroke-width="1" opacity="0.3"/><path d="M 170 65 Q 200 75 230 65" stroke="#27272a" stroke-width="1.2" opacity="0.25"/><path d="M 85 360 Q 110 370 120 380" stroke="#27272a" stroke-width="1" opacity="0.15"/><path d="M 315 360 Q 290 370 280 380" stroke="#27272a" stroke-width="1" opacity="0.15"/>`;
      }
    }

    const artworkSvgStr = `<image href="${activeArtworkUrl}" x="${position.x}" y="${position.y}" width="${scale}" height="${scale}" transform="rotate(${rotation} ${position.x + scale / 2} ${position.y + scale / 2})" />`;

    // Red guidelines representing exact physical HPS and CF measurements
    const lineHpsSvgStr = `
      <line x1="${centerX}" y1="${collarY}" x2="${centerX}" y2="${position.y}" stroke="#f43f5e" stroke-width="2" stroke-dasharray="3 2"/>
      <text x="${centerX + 6}" y="${collarY + (position.y - collarY) / 2}" fill="#f43f5e" font-size="11" font-family="sans-serif" font-weight="bold">${offsetFromHpsCm} cm (HPS)</text>
    `;

    const lineCfSvgStr = `
      <line x1="${centerX}" y1="${position.y - 15}" x2="${centerX}" y2="${position.y + scale + 15}" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="4 3"/>
      <line x1="${centerX}" y1="${position.y + scale / 2}" x2="${position.x + scale / 2}" y2="${position.y + scale / 2}" stroke="#10b981" stroke-width="2"/>
      <text x="${Math.min(centerX, position.x + scale / 2) + Math.abs(centerX - (position.x + scale / 2)) / 2 - 10}" y="${position.y + scale / 2 - 6}" fill="#10b981" font-size="10" font-family="sans-serif" font-weight="bold">${Math.abs(offsetFromCfCm)} cm</text>
    `;

    const borderBoxSvgStr = `
      <rect x="${position.x}" y="${position.y}" width="${scale}" height="${scale}" fill="none" stroke="#10b981" stroke-width="1.5" />
      <text x="${position.x + scale / 2 - 15}" y="${position.y - 6}" fill="#10b981" font-size="10" font-family="sans-serif" font-weight="bold">${printWidthCm} cm</text>
    `;

    const fullSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 450" width="400" height="450">
        <rect width="400" height="450" fill="#f8fafc"/>
        ${garmentSvgStr}
        ${artworkSvgStr}
        ${lineHpsSvgStr}
        ${lineCfSvgStr}
        ${borderBoxSvgStr}
      </svg>
    `;

    const encodedSvg = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(fullSvg)));

    onSave({
      placement: `${viewSide === 'back' ? 'Back' : artworkCategory === 'CHEST_LOGO' ? 'Left Chest' : 'Front'} Placement`,
      width: printWidthCm,
      height: printHeightCm,
      offsetFromHps: offsetFromHpsCm,
      offsetFromCf: offsetFromCfCm,
      mockupDataUrl: encodedSvg,
    });
  };

  return (
    <div ref={containerRef} className="flex flex-col lg:flex-row gap-6 bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
      {/* Interactive Editor Viewport */}
      <div className="flex-1 flex flex-col items-center">
        {/* Toggle between Front and Back views */}
        <div className="flex bg-zinc-950 p-1.5 border border-zinc-850 rounded-xl mb-4 w-full justify-between">
          <button
            type="button"
            onClick={() => setViewSide('front')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              viewSide === 'front' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Front View
          </button>
          <button
            type="button"
            onClick={() => setViewSide('back')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              viewSide === 'back' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Back View
          </button>
        </div>

        <div className="relative w-full max-w-[400px] h-[450px] bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden flex items-center justify-center select-none shadow-inner">
          {/* Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:20px_20px] opacity-15" />

          {/* Guidelines info */}
          <div className="absolute left-4 top-4 flex flex-col gap-1.5 z-10 text-[9px] text-zinc-500 font-mono">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> HPS = Collar Seam Center
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Width = Box Sizing
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> CF = Center Crease Line
            </div>
          </div>

          {/* Mockup Garment Vector Outline */}
          <div className="absolute inset-0 flex items-center justify-center p-4">
            {garmentCategory === 'Hoodie' ? (
              viewSide === 'back' ? (
                <HoodieBackOutline color={getGarmentColorHex(garmentColor)} />
              ) : (
                <HoodieOutline color={getGarmentColorHex(garmentColor)} />
              )
            ) : viewSide === 'back' ? (
              <TShirtBackOutline color={getGarmentColorHex(garmentColor)} />
            ) : (
              <TShirtOutline color={getGarmentColorHex(garmentColor)} />
            )}
          </div>

          {/* Interactive Bounding box overlay for graphic */}
          <div
            className="absolute cursor-move select-none group"
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
              width: `${scale}px`,
              height: `${scale}px`,
              transform: `rotate(${rotation}deg)`,
              touchAction: 'none',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* The Print Image or dashed box fallback */}
            <img
              src={activeArtworkUrl}
              alt="Design Overlay"
              className="w-full h-full object-contain pointer-events-none"
            />
            {/* Emerald dashed alignment border */}
            <div className="absolute inset-0 border-2 border-emerald-500 border-dashed pointer-events-none opacity-80" />
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-emerald-500 text-white font-mono text-[9px] px-1.5 py-0.5 rounded shadow whitespace-nowrap pointer-events-none font-bold">
              {printWidthCm} cm
            </div>
            {/* Center Anchor Dot */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500 opacity-80 pointer-events-none" />

            {/* Corner Scale Handles */}
            <div 
              className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-emerald-500 border border-white rounded-sm cursor-se-resize z-20 pointer-events-auto"
              onPointerDown={handleScalePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            />
            <div 
              className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-emerald-500 border border-white rounded-sm cursor-nw-resize z-20 pointer-events-auto opacity-40 hover:opacity-100"
              onPointerDown={handleScalePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            />
            <div 
              className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-emerald-500 border border-white rounded-sm cursor-ne-resize z-20 pointer-events-auto opacity-40 hover:opacity-100"
              onPointerDown={handleScalePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            />
            <div 
              className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-emerald-500 border border-white rounded-sm cursor-sw-resize z-20 pointer-events-auto opacity-40 hover:opacity-100"
              onPointerDown={handleScalePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            />

            {/* Rotation Handle (circle at the top with a vertical connector line) */}
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex flex-col items-center z-25">
              <div 
                className="w-3.5 h-3.5 bg-sky-500 border border-white rounded-full cursor-alias pointer-events-auto shadow-md"
                onPointerDown={handleRotatePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
              />
              <div className="w-[1.5px] h-3.5 bg-sky-500" />
            </div>
          </div>

          {/* Vertical center crease guide */}
          <div className="absolute top-0 bottom-0 left-1/2 w-[1px] border-l border-dashed border-blue-500 opacity-35 pointer-events-none" />

          {/* HPS collar rib seam guide line */}
          <div
            className="absolute left-0 right-0 border-t border-dashed border-rose-500 opacity-35 pointer-events-none"
            style={{ top: `${collarY}px` }}
          />
        </div>
      </div>

      {/* Editor Sliders & Controller Panel */}
      <div className="w-full lg:w-72 flex flex-col justify-between py-1 text-zinc-100">
        <div>
          <div className="mb-6">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-emerald-400" /> Visual Calibration
            </h3>
            <p className="text-zinc-400 text-xs">
              Drag artwork or corner handles to scale/rotate directly on the mockup, or use the sliders.
            </p>
          </div>

          <div className="space-y-5">
            {/* Width Calibration */}
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-1.5">
                <span>Print Width (Scale)</span>
                <span className="text-emerald-400 font-bold">{printWidthCm} cm</span>
              </div>
              <input
                type="range"
                min="30"
                max="250"
                value={scale}
                onChange={(e) => setScale(parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[9px] text-zinc-500 font-mono mt-1">
                <span>Min (6.5 cm)</span>
                <span>Max (54 cm)</span>
              </div>
            </div>

            {/* Vertical HPS Collar Seam Offset */}
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-1.5">
                <span>Neck Seam Offset (HPS)</span>
                <span className="text-rose-400 font-bold">{offsetFromHpsCm} cm</span>
              </div>
              <input
                type="range"
                min="10"
                max="320"
                value={position.y}
                onChange={(e) => setPosition({ ...position, y: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
              <div className="flex justify-between text-[9px] text-zinc-500 font-mono mt-1">
                <span>Higher</span>
                <span>Lower</span>
              </div>
            </div>

            {/* Horizontal crease alignment */}
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-1.5">
                <span>Crease Offset (CF)</span>
                <span className={`font-bold ${offsetFromCfCm === 0 ? 'text-blue-400' : 'text-zinc-300'}`}>
                  {offsetFromCfCm === 0 ? 'Dead Center' : `${Math.abs(offsetFromCfCm)} cm ${offsetFromCfCm < 0 ? 'Left' : 'Right'}`}
                </span>
              </div>
              <input
                type="range"
                min="10"
                max="320"
                value={position.x}
                onChange={(e) => setPosition({ ...position, x: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[9px] text-zinc-500 font-mono mt-1">
                <span>Move Left</span>
                <button
                  type="button"
                  onClick={() => setPosition({ ...position, x: centerX - scale / 2 })}
                  className="hover:text-blue-400 text-zinc-500 underline text-[9px] transition-colors"
                >
                  Snap Center
                </button>
                <span>Move Right</span>
              </div>
            </div>

            {/* Rotation Slider */}
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400 mb-1.5">
                <span>Rotation Angle</span>
                <span className="text-sky-400 font-bold">{rotation}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="359"
                value={rotation}
                onChange={(e) => setRotation(parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <div className="flex justify-between text-[9px] text-zinc-500 font-mono mt-1">
                <span>0°</span>
                <button
                  type="button"
                  onClick={() => setRotation(0)}
                  className="hover:text-sky-400 text-zinc-500 underline text-[9px] transition-colors"
                >
                  Reset Rotation
                </button>
                <span>359°</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={() => {
              setRotation(0);
              if (artworkCategory === 'CHEST_LOGO') {
                setPosition({ x: 235, y: 115 });
                setScale(55);
              } else if (artworkCategory === 'BACK') {
                setPosition({ x: 100, y: 120 });
                setScale(200);
              } else {
                setPosition({ x: 140, y: 110 });
                setScale(120);
              }
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 border border-zinc-700 hover:border-zinc-500 text-zinc-300 text-xs font-semibold rounded-xl hover:bg-zinc-800 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button
            type="button"
            onClick={handleSaveSpecs}
            className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 text-xs font-bold py-2 px-4 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" /> Lock Coordinates
          </button>
        </div>
      </div>
    </div>
  );
}
