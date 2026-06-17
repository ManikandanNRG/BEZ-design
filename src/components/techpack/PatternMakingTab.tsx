import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Line, Circle, Rect, Group, Text } from 'react-konva';
import { TechPackData } from '@/types/techpack';
import { MousePointer2, Plus, Move, Square, Box, Trash2, BoxSelect } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Center, useTexture } from '@react-three/drei';
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
  points: Point[];
  color: string;
};

export default function PatternMakingTab({ data, updateData }: PatternMakingTabProps) {
  const [pieces, setPieces] = useState<PatternPiece[]>(data.patternData?.pieces || []);
  const [tool, setTool] = useState<'select' | 'draw' | 'move'>('select');
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);
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
        const newPts = [...p.points];
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
    const groupX = e.target.x();
    const groupY = e.target.y();
    
    // Snap translation
    const snapX = Math.round(groupX / gridStep) * gridStep;
    const snapY = Math.round(groupY / gridStep) * gridStep;
    
    e.target.position({ x: snapX, y: snapY });

    setPieces(prev => prev.map(p => {
      if (p.id === pieceId) {
        return {
          ...p,
          points: p.points.map(pt => ({ x: pt.x + snapX, y: pt.y + snapY }))
        };
      }
      return p;
    }));
    
    // Reset group position since we baked it into points
    e.target.position({ x: 0, y: 0 });
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
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('2d')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${viewMode === '2d' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            2D Drafting
          </button>
          <button
            onClick={() => setViewMode('3d')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${viewMode === '3d' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            3D Preview
          </button>
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
                  const flattenedPoints = piece.points.flatMap(p => [p.x, p.y]);
                  const isSelected = selectedPieceId === piece.id;

                  return (
                    <Group 
                      key={piece.id}
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
                      <Line
                        points={flattenedPoints}
                        closed
                        fill={piece.color}
                        opacity={isSelected ? 0.8 : 0.5}
                        stroke={isSelected ? '#4f46e5' : '#6b7280'}
                        strokeWidth={isSelected ? 2 : 1}
                      />
                      <Text
                        text={piece.name}
                        x={piece.points[0]?.x}
                        y={piece.points[0]?.y - 20}
                        fontSize={12}
                        fill="#374151"
                      />
                      {isSelected && piece.points.map((pt, i) => (
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
            <div className="w-full h-full bg-gray-900 rounded-r-xl overflow-hidden">
               <Canvas camera={{ position: [0, 0, 500], fov: 50 }}>
                  <ambientLight intensity={0.5} />
                  <directionalLight position={[10, 10, 10]} intensity={1} />
                  <Center>
                    <group>
                      {pieces.map((piece, i) => {
                        // Create a shape from points
                        const shape = new THREE.Shape();
                        if (piece.points.length > 0) {
                          shape.moveTo(piece.points[0].x, -piece.points[0].y); // Invert Y for 3D
                          for (let j = 1; j < piece.points.length; j++) {
                            shape.lineTo(piece.points[j].x, -piece.points[j].y);
                          }
                          shape.closePath();
                        }

                        const extrudeSettings = { depth: 2, bevelEnabled: false };
                        return (
                          <mesh key={piece.id} position={[0, 0, i * 10]}>
                            <extrudeGeometry args={[shape, extrudeSettings]} />
                            <meshStandardMaterial color={piece.color} side={THREE.DoubleSide} />
                          </mesh>
                        );
                      })}
                    </group>
                  </Center>
                  <OrbitControls />
               </Canvas>
               <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded text-xs">
                 Click and drag to rotate. Scroll to zoom.
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
