import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Arrow, Line, Text as KonvaText, Circle as KonvaCircle, Rect as KonvaRect } from 'react-konva';
import useImage from 'use-image';
import { Annotation } from '@/types/techpack';
import { MousePointer2, MoveRight, ArrowRightLeft, Minus, Circle, Square, Type, Undo, Trash2, X, Download, Eraser } from 'lucide-react';

interface AnnotationCanvasProps {
  baseImage: string;
  annotations: Annotation[];
  onChangeAnnotations: (annotations: Annotation[]) => void;
  onUpdateExportImage: (dataUrl: string) => void;
  onRemove: () => void;
}

export default function AnnotationCanvas({
  baseImage,
  annotations,
  onChangeAnnotations,
  onUpdateExportImage,
  onRemove
}: AnnotationCanvasProps) {
  const [image, status] = useImage(baseImage, 'anonymous');
  const stageRef = useRef<any>(null);
  
  const [tool, setTool] = useState<'select' | 'arrow' | 'bi-arrow' | 'line' | 'circle' | 'rect' | 'text' | 'eraser'>('select');
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  const [textPrompt, setTextPrompt] = useState<{ id: string, text: string } | null>(null);
  
  const [localAnnotations, setLocalAnnotations] = useState<Annotation[]>(annotations);

  useEffect(() => {
    setLocalAnnotations(annotations);
  }, [annotations]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.offsetWidth,
        height: Math.min(containerRef.current.offsetWidth * 0.7, 500)
      });
    }
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: Math.min(containerRef.current.offsetWidth * 0.7, 500)
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const onUpdateExportImageRef = useRef(onUpdateExportImage);
  useEffect(() => {
    onUpdateExportImageRef.current = onUpdateExportImage;
  }, [onUpdateExportImage]);

  const triggerExport = useCallback(() => {
    if (status === 'loaded' && stageRef.current) {
      setTimeout(() => {
        if(stageRef.current) {
           const dataUrl = stageRef.current.toDataURL({ pixelRatio: 1, mimeType: 'image/jpeg', quality: 0.7 });
           onUpdateExportImageRef.current(dataUrl);
        }
      }, 50);
    }
  }, [status]);

  const commitChanges = useCallback((newAnns: Annotation[]) => {
    setLocalAnnotations(newAnns);
    onChangeAnnotations(newAnns);
    triggerExport();
  }, [onChangeAnnotations, triggerExport]);

  // Initial export on load
  useEffect(() => {
     if (status === 'loaded' && annotations.length > 0) {
        triggerExport();
     }
  }, [status, triggerExport]);

  const handleMouseDown = (e: any) => {
    if (tool === 'select' || tool === 'eraser') return;
    
    const pos = e.target.getStage().getPointerPosition();
    
    if (tool === 'text') {
      const newAnnotation: Annotation = {
        id: crypto.randomUUID(),
        type: tool as any,
        x: pos.x,
        y: pos.y,
        text: 'A',
        color: '#ff0000',
      };
      const newAnns = [...localAnnotations, newAnnotation];
      setLocalAnnotations(newAnns);
      setTextPrompt({ id: newAnnotation.id, text: 'A' });
      return;
    }

    setIsDrawing(true);
    const newAnnotation: Annotation = {
      id: crypto.randomUUID(),
      type: tool as any,
      x: pos.x,
      y: pos.y,
      points: (tool === 'arrow' || tool === 'bi-arrow' || tool === 'line') ? [0, 0, 0, 0] : undefined,
      radius: tool === 'circle' ? 0 : undefined,
      width: tool === 'rect' ? 0 : undefined,
      height: tool === 'rect' ? 0 : undefined,
      color: '#ff0000',
    };
    
    setActiveAnnotationId(newAnnotation.id);
    setLocalAnnotations([...localAnnotations, newAnnotation]);
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing || tool === 'select' || tool === 'text') return;
    if (!activeAnnotationId) return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    
    setLocalAnnotations(
      localAnnotations.map((ann) => {
        if (ann.id === activeAnnotationId) {
          if (tool === 'circle') {
             const dx = point.x - ann.x;
             const dy = point.y - ann.y;
             return {
                ...ann,
                radius: Math.sqrt(dx * dx + dy * dy)
             };
          } else if (tool === 'rect') {
             return {
                ...ann,
                width: point.x - ann.x,
                height: point.y - ann.y
             };
          } else {
             return {
               ...ann,
               points: [0, 0, point.x - ann.x, point.y - ann.y],
             };
          }
        }
        return ann;
      })
    );
  };

  const handleMouseUp = () => {
    if (isDrawing) {
      commitChanges(localAnnotations);
    }
    setIsDrawing(false);
    setActiveAnnotationId(null);
  };

  const undo = () => {
    commitChanges(localAnnotations.slice(0, -1));
  };
  
  const clearAll = () => {
      if(window.confirm("Clear all annotations?")) {
         commitChanges([]);
      }
  };

  return (
    <div className="flex flex-col border border-gray-300 rounded-lg overflow-hidden bg-gray-50 mt-2 shadow-sm">
      <div className="bg-white border-b border-gray-200 p-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => setTool('select')}
            className={`p-1.5 rounded transition-colors ${tool === 'select' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            title="Select/Move"
          >
            <MousePointer2 size={16} />
          </button>
          <div className="w-px h-6 bg-gray-300 mx-1"></div>
          <button
            onClick={() => setTool('arrow')}
            className={`p-1.5 rounded transition-colors ${tool === 'arrow' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            title="Draw Arrow"
          >
            <MoveRight size={16} />
          </button>
          <button
            onClick={() => setTool('bi-arrow')}
            className={`p-1.5 rounded transition-colors ${tool === 'bi-arrow' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            title="Bidirectional Arrow"
          >
            <ArrowRightLeft size={16} />
          </button>
          <button
            onClick={() => setTool('line')}
            className={`p-1.5 rounded transition-colors ${tool === 'line' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            title="Draw Line"
          >
            <Minus size={16} />
          </button>
          <button
            onClick={() => setTool('circle')}
            className={`p-1.5 rounded transition-colors ${tool === 'circle' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            title="Draw Circle"
          >
            <Circle size={16} />
          </button>
          <button
            onClick={() => setTool('rect')}
            className={`p-1.5 rounded transition-colors ${tool === 'rect' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            title="Draw Rectangle"
          >
            <Square size={16} />
          </button>
          <button
            onClick={() => setTool('text')}
            className={`p-1.5 rounded transition-colors ${tool === 'text' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            title="Add Text"
          >
            <Type size={16} />
          </button>
          <div className="w-px h-6 bg-gray-300 mx-1"></div>
          <button
            onClick={() => setTool('eraser')}
            className={`p-1.5 rounded transition-colors ${tool === 'eraser' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            title="Erase Details"
          >
            <Eraser size={16} />
          </button>
          <button onClick={undo} className="p-1.5 rounded text-gray-600 hover:bg-gray-100 transition-colors" title="Undo Last">
            <Undo size={16} />
          </button>
          <button onClick={clearAll} className="p-1.5 rounded text-gray-600 hover:bg-gray-100 transition-colors" title="Clear All Annotations">
            <Trash2 size={16} />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500 hidden lg:inline-block">
                {(tool === 'arrow' || tool === 'bi-arrow' || tool === 'line' || tool === 'circle' || tool === 'rect') && 'Drag to draw shape.'}
                {tool === 'text' && 'Click to add text.'}
                {tool === 'select' && 'Select elements (Drag to move elements).'}
                {tool === 'eraser' && 'Click on an element to erase it.'}
            </span>
            <button 
                onClick={() => {
                  if (stageRef.current) {
                    const dataUrl = stageRef.current.toDataURL({ pixelRatio: 2 });
                    const link = document.createElement('a');
                    link.download = 'annotated-image.png';
                    link.href = dataUrl;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }
                }}
                className="text-black hover:bg-gray-100 p-1.5 rounded flex items-center gap-1 text-xs font-medium border border-transparent shadow-sm hover:border-gray-200 transition-all"
            >
                <Download size={14} /> Download Image
            </button>
            <button 
                onClick={onRemove}
                className="text-red-500 hover:bg-red-50 p-1.5 rounded flex items-center gap-1 text-xs font-medium border border-transparent shadow-sm hover:border-red-200 transition-all"
            >
                <X size={14} /> Remove Image
            </button>
        </div>
      </div>
      
      <div 
        ref={containerRef} 
        className="w-full relative overflow-hidden bg-gray-50 flex items-center justify-center"
      >
          <Stage
            width={dimensions.width}
            height={dimensions.height}
            onMouseDown={handleMouseDown}
            onMousemove={handleMouseMove}
            onMouseup={handleMouseUp}
            ref={stageRef}
            className={tool === 'eraser' ? 'cursor-not-allowed' : tool !== 'select' ? 'cursor-crosshair' : 'cursor-default'}
          >
            <Layer>
               {/* Background Image constrained to fit dimensions */}
              {image && (() => {
                  const scale = Math.min(
                    dimensions.width / image.width,
                    dimensions.height / image.height
                  );
                  const imgWidth = image.width * scale;
                  const imgHeight = image.height * scale;
                  const x = (dimensions.width - imgWidth) / 2;
                  const y = (dimensions.height - imgHeight) / 2;
                  return (
                      <KonvaImage 
                          image={image} 
                          x={x} 
                          y={y} 
                          width={imgWidth} 
                          height={imgHeight} 
                      />
                  );
              })()}
              
              {localAnnotations.map((ann, i) => {
                const onDragEndUpdate = (e: any) => {
                    const newAnn = [...localAnnotations];
                    newAnn[i] = { ...newAnn[i], x: e.target.x(), y: e.target.y() };
                    commitChanges(newAnn);
                };
                
                const handleShapeClick = (e: any) => {
                    if (tool === 'eraser') {
                        e.cancelBubble = true;
                        commitChanges(localAnnotations.filter(a => a.id !== ann.id));
                    }
                };

                if (ann.type === 'line' && ann.points) {
                  return (
                    <Line
                      key={ann.id}
                      x={ann.x}
                      y={ann.y}
                      points={ann.points}
                      stroke={ann.color}
                      strokeWidth={2}
                      hitStrokeWidth={20}
                      draggable={tool === 'select'}
                      onDragEnd={onDragEndUpdate}
                      onClick={handleShapeClick}
                      onTap={handleShapeClick}
                    />
                  );
                }

                if ((ann.type === 'arrow' || ann.type === 'bi-arrow') && ann.points) {
                  const isBiArrow = ann.type === 'bi-arrow';
                  
                  return (
                    <Arrow
                      key={ann.id}
                      x={ann.x}
                      y={ann.y}
                      points={ann.points}
                      fill={ann.color}
                      stroke={ann.color}
                      strokeWidth={2}
                      hitStrokeWidth={20}
                      draggable={tool === 'select'}
                      onDragEnd={onDragEndUpdate}
                      onClick={handleShapeClick}
                      onTap={handleShapeClick}
                      pointerLength={10}
                      pointerWidth={10}
                      pointerAtBeginning={isBiArrow}
                    />
                  );
                }
                
                if (ann.type === 'circle') {
                  return (
                     <KonvaCircle
                        key={ann.id}
                        x={ann.x}
                        y={ann.y}
                        radius={ann.radius || 0}
                        stroke={ann.color}
                        strokeWidth={2}
                        hitStrokeWidth={20}
                        draggable={tool === 'select'}
                        onDragEnd={onDragEndUpdate}
                        onClick={handleShapeClick}
                        onTap={handleShapeClick}
                     />
                  );
                }

                if (ann.type === 'rect') {
                  return (
                     <KonvaRect
                        key={ann.id}
                        x={ann.x}
                        y={ann.y}
                        width={ann.width || 0}
                        height={ann.height || 0}
                        stroke={ann.color}
                        strokeWidth={2}
                        hitStrokeWidth={20}
                        draggable={tool === 'select'}
                        onDragEnd={onDragEndUpdate}
                        onClick={handleShapeClick}
                        onTap={handleShapeClick}
                     />
                  );
                }

                if (ann.type === 'text') {
                  return (
                    <KonvaText
                      key={ann.id}
                      x={ann.x}
                      y={ann.y}
                      text={ann.text}
                      fontSize={16}
                      fontFamily="Arial"
                      fill={ann.color}
                      fontStyle="bold"
                      draggable={tool === 'select'}
                      onClick={(e) => {
                          if(tool === 'select') {
                              setTextPrompt({ id: ann.id, text: ann.text || '' });
                          } else if (tool === 'eraser') {
                              handleShapeClick(e);
                          }
                      }}
                      onTap={(e) => {
                          if (tool === 'eraser') {
                              handleShapeClick(e);
                          }
                      }}
                      onDragEnd={onDragEndUpdate}
                    />
                  );
                }
                return null;
              })}
            </Layer>
          </Stage>
          
          {/* Text Input Modal Overlay */}
          {textPrompt && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => setTextPrompt(null)}>
              <div 
                className="bg-white p-4 rounded-lg shadow-lg flex flex-col gap-3 min-w-[250px]"
                onClick={(e) => e.stopPropagation()}
              >
                <label className="text-sm font-bold">Edit Text</label>
                <input 
                  type="text" 
                  autoFocus
                  className="border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  value={textPrompt.text}
                  onChange={(e) => setTextPrompt({ ...textPrompt, text: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const newAnn = localAnnotations.map(a => a.id === textPrompt.id ? { ...a, text: textPrompt.text } : a);
                      commitChanges(newAnn);
                      setTextPrompt(null);
                    }
                  }}
                />
                <div className="flex justify-end gap-2 mt-2">
                   <button 
                     onClick={() => setTextPrompt(null)} 
                     className="px-3 py-1 text-xs font-bold text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                   >Cancel</button>
                   <button 
                     onClick={() => {
                      const newAnn = localAnnotations.map(a => a.id === textPrompt.id ? { ...a, text: textPrompt.text } : a);
                      commitChanges(newAnn);
                      setTextPrompt(null);
                     }} 
                     className="px-3 py-1 text-xs font-bold text-white bg-black rounded shadow-sm hover:bg-gray-800 transition-colors"
                   >Save</button>
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
