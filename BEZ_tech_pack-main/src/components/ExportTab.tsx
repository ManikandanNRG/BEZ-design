import React, { ReactNode } from 'react';
import { TechPackData } from '../types';
import { Download, Printer } from 'lucide-react';

interface ExportTabProps {
  data: TechPackData;
}

export default function ExportTab({ data }: ExportTabProps) {
  const handlePrint = () => {
    window.print();
  };

  // Reusable component for the exact header grid shown in PDF on every page
  const TemplateHeader = () => (
    <div className="flex border-[2px] border-black mb-4 bg-white">
      {/* Box 1: Logo */}
      <div className="w-[180px] border-r-[2px] border-black relative flex-shrink-0 bg-white">
        <div className="absolute inset-0 p-[10%] flex items-center justify-center">
          {data.logoImage ? (
            <img 
              src={data.logoImage} 
              alt="Brand Logo" 
              className="w-full h-full object-contain" 
              style={{ transform: `scale(${data.logoScale || 1}) scaleX(${data.logoScaleX || 1}) scaleY(${data.logoScaleY || 1})` }} 
            />
          ) : (
            <span className="font-black text-5xl tracking-widest text-black">BEZ</span>
          )}
        </div>
      </div>
      
      {/* Box 2: Metadata Grid */}
      <div className="flex-1 grid grid-cols-6 text-[9px] sm:text-[10px]">
        {/* ROW 1 */}
        <div className="border-r border-b border-black p-1.5 font-bold uppercase flex items-center">BRAND</div>
        <div className="border-r border-b border-black p-1.5 uppercase flex items-center">{data.brand || '-'}</div>
        <div className="border-r border-b border-black p-1.5 font-bold uppercase flex items-center">CATEGORY</div>
        <div className="border-r border-b border-black p-1.5 uppercase flex items-center">{data.category || '-'}</div>
        <div className="border-r border-b border-black p-1.5 font-bold uppercase flex items-center">DATE</div>
        <div className="border-b border-black p-1.5 uppercase flex items-center">{data.date || '-'}</div>

        {/* ROW 2 */}
        <div className="border-r border-b border-black p-1.5 font-bold uppercase flex items-center">STYLE NO.</div>
        <div className="border-r border-b border-black p-1.5 uppercase flex items-center font-mono">{data.styleNo || '-'}</div>
        <div className="border-r border-b border-black p-1.5 font-bold uppercase flex items-center">SIZE RANGE</div>
        <div className="border-r border-b border-black p-1.5 uppercase flex items-center">{data.sizeRange || '-'}</div>
        <div className="border-r border-b border-black p-1.5 font-bold uppercase flex items-center">VERSION</div>
        <div className="border-b border-black p-1.5 uppercase flex items-center">{data.version || '-'}</div>

        {/* ROW 3 */}
        <div className="border-r border-b border-black p-1.5 font-bold uppercase flex items-center">STYLE NAME</div>
        <div className="border-r border-b border-black p-1.5 uppercase flex items-center">{data.styleName || '-'}</div>
        <div className="border-r border-b border-black p-1.5 font-bold uppercase flex items-center">FIT</div>
        <div className="border-r border-b border-black p-1.5 uppercase flex items-center">{data.fit || '-'}</div>
        <div className="border-r border-b border-black p-1.5 font-bold uppercase flex items-center">DESIGNER</div>
        <div className="border-b border-black p-1.5 uppercase flex items-center">{data.designer || '-'}</div>

        {/* ROW 4 */}
        <div className="border-r border-b border-black p-1.5 font-bold uppercase flex items-center">DESCRIPTION</div>
        <div className="border-r border-b border-black p-1.5 uppercase flex items-center">{data.description || '-'}</div>
        <div className="border-r border-b border-black p-1.5 font-bold uppercase flex items-center">FABRIC</div>
        <div className="border-r border-b border-black p-1.5 uppercase flex items-center">{data.fabric || '-'}</div>
        <div className="border-r border-b border-black p-1.5 font-bold uppercase flex items-center">APPROVED BY</div>
        <div className="border-b border-black p-1.5 uppercase flex items-center">{data.approvedBy || '-'}</div>

        {/* ROW 5 */}
        <div className="border-r border-black p-1.5 font-bold uppercase flex items-center">SEASON</div>
        <div className="border-r border-black p-1.5 uppercase flex items-center">{data.season || '-'}</div>
        <div className="border-r border-black p-1.5 font-bold uppercase flex items-center">FABRIC WEIGHT</div>
        <div className="border-r border-black p-1.5 uppercase flex items-center">{data.fabricWeight || '-'}</div>
        <div className="border-r border-black p-1.5 font-bold uppercase flex items-center">MADE IN</div>
        <div className="border-black p-1.5 uppercase flex items-center">{data.madeIn || '-'}</div>
      </div>
    </div>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <div className="bg-black text-white px-3 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-2 inline-block">
      {title}
    </div>
  );

  const TrimBox = ({ title, img, isFirst = false }: { title: string, img?: string, isFirst?: boolean }) => (
    <div className={`flex-1 flex flex-col ${isFirst ? '' : 'border-l-[2px] border-black'}`}>
      <div className="text-center font-bold text-[8px] sm:text-[9px] py-1.5 border-b-[2px] border-black">{title}</div>
      <div className="flex-1 p-2 flex items-center justify-center min-h-0">
        {img && <img src={img} className="max-h-full max-w-full object-contain drop-shadow-sm" />}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between no-print mb-8 pb-4 border-b border-gray-200">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Tech Pack Preview</h2>
          <p className="text-sm text-gray-500">Preview generated exactly like the required tabular PDF template. Hit Print to save (Select Landscape).</p>
        </div>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 transition-colors shadow-sm"
        >
          <Printer size={16} />
          Print / Save PDF
        </button>
      </div>

      {/* The Printable Tech Pack Document container (A4 Landscape aspect) */}
      <div className="bg-gray-100 p-4 sm:p-8 space-y-8 pb-12 print:bg-white print:p-0 print:space-y-0 print:pb-0 overflow-x-auto">
        
        {/* PAGE 1: Front & Back Sketches */}
        <div className="page-break-after print-page bg-white shadow-lg border-2 border-gray-200 ring-1 ring-gray-900/5 w-[297mm] h-[210mm] mx-auto p-[10mm] box-border relative print:shadow-none print:border print:border-gray-300 print:w-auto print:h-auto print:p-[5mm] print:mx-0 print:overflow-hidden flex flex-col overflow-hidden">
          <TemplateHeader />
          <div className="flex-1 flex justify-center items-center px-8 pb-4 min-h-0">
            {data.frontSketch || data.backSketch ? (
              <div className="w-full flex justify-center gap-6 items-center" style={{ height: '115%' }}>
                {data.frontSketch && (
                  <div className={`flex flex-col items-center justify-center h-full relative ${data.backSketch ? 'flex-[0.5]' : 'flex-1'}`}>
                    <img 
                      src={data.frontSketch} 
                      alt="Front View" 
                      className="absolute inset-0 w-full h-full object-contain object-center origin-center drop-shadow-xl"
                      style={{ transform: `scale(${data.frontSketchScale || 0.9}) scaleX(${data.frontSketchScaleX || 1}) scaleY(${data.frontSketchScaleY || 1})` }} 
                    />
                  </div>
                )}
                {data.backSketch && (
                  <div className={`flex flex-col items-center justify-center h-full relative ${data.frontSketch ? 'flex-[0.5]' : 'flex-1'}`}>
                    <img 
                      src={data.backSketch} 
                      alt="Back View" 
                      className="absolute inset-0 w-full h-full object-contain object-center origin-center drop-shadow-xl"
                      style={{ transform: `scale(${data.backSketchScale || 0.9}) scaleX(${data.backSketchScaleX || 1}) scaleY(${data.backSketchScaleY || 1})` }} 
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-gray-300 text-gray-400">
                (Upload Sketches in "Artwork & Sketches" Tab)
              </div>
            )}
          </div>
        </div>

        {/* PRINT PLACEMENT & SPECS */}
        {(data.printPlacementFront || data.printPlacementBack || data.printingNotes || data.printSpecType || (data.printColorsList && data.printColorsList.length > 0) || data.printReferenceImage) && (
          <div className="page-break-after print-page bg-white shadow-lg border-2 border-gray-200 ring-1 ring-gray-900/5 w-[297mm] h-[210mm] mx-auto p-[10mm] box-border relative print:shadow-none print:border print:border-gray-300 print:w-auto print:h-auto print:p-[5mm] print:mx-0 flex flex-col">
            <TemplateHeader />
            <div className="flex-1 flex border-[2px] border-black bg-white min-h-0 mb-4">
              
              {/* Left Column (60%) */}
              <div className="flex-[0.6] flex flex-col border-r-[2px] border-black h-full min-h-0">
                {/* Top Section: Placements (75% height) */}
                <div className="flex-[0.75] flex flex-col border-b-[2px] border-black min-h-0">
                  <div className="bg-black text-white text-[8px] sm:text-[9px] font-bold px-2 py-1 uppercase self-start m-2">1. PRINT PLACEMENT</div>
                  <div className="flex-1 flex items-center justify-around pb-2 min-h-0 px-4">
                    {data.printPlacementFront && (
                      <div className={`flex flex-col items-center ${data.printPlacementBack ? 'w-[48%]' : 'w-[80%]'} h-full relative p-2`}>
                        <span className="text-[8px] sm:text-[9px] font-bold uppercase mb-2">FRONT</span>
                        <div className="flex-1 w-full flex items-center justify-center min-h-0">
                          <img src={data.printPlacementFront} alt="Front Placement" className="max-h-full max-w-full object-contain drop-shadow-sm" />
                        </div>
                      </div>
                    )}
                    {data.printPlacementBack && (
                      <div className={`flex flex-col items-center ${data.printPlacementFront ? 'w-[48%]' : 'w-[80%]'} h-full relative p-2`}>
                        <span className="text-[8px] sm:text-[9px] font-bold uppercase mb-2">BACK</span>
                        <div className="flex-1 w-full flex items-center justify-center min-h-0">
                          <img src={data.printPlacementBack} alt="Back Placement" className="max-h-full max-w-full object-contain drop-shadow-sm" />
                        </div>
                      </div>
                    )}
                    {(!data.printPlacementFront && !data.printPlacementBack) && (
                       <span className="text-gray-300 font-bold uppercase text-[10px]">No Placements</span>
                    )}
                  </div>
                </div>

                {/* Bottom Section: Printing Notes (25% height) */}
                <div className="flex-[0.25] p-2 flex flex-col min-h-0">
                  <div className="bg-black text-white text-[8px] sm:text-[9px] font-bold px-2 py-1 uppercase self-start mb-2">2. PRINTING NOTES</div>
                  <div className="text-[8px] sm:text-[9px] flex-1 whitespace-pre-wrap leading-snug px-2 overflow-y-auto text-gray-800">
                    {data.printingNotes || '• Ensure artwork placement as per given measurements.\n• Maintain proper registration and color accuracy.\n• Print should be durable and able to withstand recommended wash care.\n• Do not use harmful chemicals while printing.\n• Follow curing time as per ink supplier recommendation.'}
                  </div>
                </div>
              </div>

              {/* Right Column (40%) */}
              <div className="flex-[0.4] flex flex-col h-full min-h-0">
                {/* 3. PRINT SPECIFICATION */}
                <div className="flex-[0.33] border-b-[2px] border-black flex flex-col p-2 min-h-0">
                  <div className="bg-black text-white text-[8px] sm:text-[9px] font-bold px-2 py-1 uppercase self-start mb-2">3. PRINT SPECIFICATION</div>
                  <div className="text-[8px] sm:text-[9px] grid grid-cols-[auto_1fr] gap-x-2 gap-y-2 overflow-y-auto px-1">
                    <span className="font-bold">PRINT TYPE</span><span>: {data.printSpecType || '-'}</span>
                    <span className="font-bold">PRINT METHOD</span><span>: {data.printSpecMethod || '-'}</span>
                    <span className="font-bold">INK TYPE</span><span>: {data.printSpecInkType || '-'}</span>
                    <span className="font-bold">INK FINISH</span><span>: {data.printSpecInkFinish || '-'}</span>
                    <span className="font-bold">LOCATION</span><span>: {data.printSpecLocation || '-'}</span>
                    <span className="font-bold">COLORS</span><span>: {data.printSpecColors || '-'}</span>
                  </div>
                </div>
                
                {/* 4. PRINT COLORS */}
                <div className="flex-[0.33] border-b-[2px] border-black flex flex-col p-2 min-h-0">
                  <div className="bg-black text-white text-[8px] sm:text-[9px] font-bold px-2 py-1 uppercase self-start mb-2">4. PRINT COLORS</div>
                  <div className="flex-1 overflow-y-auto flex flex-col gap-2 px-1 pb-1 content-start">
                    {(data.printColorsList || []).map((c, i) => (
                      <div key={i} className="flex gap-2 items-center w-full">
                        <div className="w-6 h-6 border-[2px] border-black flex-shrink-0" style={{ backgroundColor: c.colorCode }}></div>
                        <div className="text-[7px] sm:text-[8px] leading-tight flex-1 truncate">
                          <div className="font-bold truncate text-[8px]">{c.colorName}</div>
                          <div className="text-gray-600 truncate">{c.pantoneCode}</div>
                        </div>
                      </div>
                    ))}
                    {!(data.printColorsList && data.printColorsList.length > 0) && (
                       <span className="text-gray-300 text-[10px] uppercase font-bold self-start mt-2">No Colors Specified</span>
                    )}
                  </div>
                </div>

                {/* 5. REFERENCE */}
                <div className="flex-[0.34] flex flex-col p-2 min-h-0">
                  <div className="bg-black text-white text-[8px] sm:text-[9px] font-bold px-2 py-1 uppercase self-start mb-2">5. REFERENCE</div>
                  <div className="flex-1 flex items-center justify-center min-h-0 p-1">
                    {data.printReferenceImage ? (
                      <img src={data.printReferenceImage} alt="Reference" className="max-h-full max-w-full object-contain drop-shadow-sm" />
                    ) : (
                      <span className="text-gray-300 text-[9px] uppercase font-bold text-center px-1">No Reference Image</span>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* PAGE 3: Artwork Details (Full page for Artwork to support large sizes) */}
        {(data.artworkLogo1 || data.artworkLogo2 || data.artworkLogo3) && (
          <div className="page-break-after print-page bg-white shadow-lg border-2 border-gray-200 ring-1 ring-gray-900/5 w-[297mm] h-[210mm] mx-auto p-[10mm] box-border relative print:shadow-none print:border print:border-gray-300 print:w-auto print:h-auto print:p-[5mm] print:mx-0 flex flex-col">
            <TemplateHeader />
            <div className="flex-1 flex flex-col border-[2px] border-black bg-white min-h-0 mb-4">
              <div className="bg-black text-white text-[8px] sm:text-[9px] font-bold px-2 py-1 uppercase self-start m-2">1. ARTWORK DETAILS</div>
              <div className="flex-1 flex flex-wrap items-center justify-around pb-4 min-h-0 px-4 gap-4">
                {data.artworkLogo1 && (
                  <div className={`flex flex-col items-center ${(!data.artworkLogo2 && !data.artworkLogo3) ? 'w-[80%]' : 'w-[45%] lg:w-[30%]'} h-full p-4 relative`}>
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase mb-4">FRONT</span>
                    <div className="flex-1 w-full flex items-center justify-center min-h-0 border-[1px] border-dashed border-gray-300 bg-gray-50/50 p-4">
                      <img src={data.artworkLogo1} alt="Logo 1" className="max-h-full max-w-full object-contain" />
                    </div>
                  </div>
                )}
                {data.artworkLogo2 && (
                  <div className={`flex flex-col items-center ${(!data.artworkLogo1 && !data.artworkLogo3) ? 'w-[80%]' : 'w-[45%] lg:w-[30%]'} h-full p-4 relative`}>
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase mb-4">BACK</span>
                    <div className="flex-1 w-full flex items-center justify-center min-h-0 border-[1px] border-dashed border-gray-300 bg-gray-50/50 p-4">
                      <img src={data.artworkLogo2} alt="Logo 2" className="max-h-full max-w-full object-contain" />
                    </div>
                  </div>
                )}
                {data.artworkLogo3 && (
                  <div className={`flex flex-col items-center ${(!data.artworkLogo1 && !data.artworkLogo2) ? 'w-[80%]' : 'w-[45%] lg:w-[30%]'} h-full p-4 relative`}>
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase mb-4">LOGO (FRONT)</span>
                    <div className="flex-1 w-full flex items-center justify-center min-h-0 border-[1px] border-dashed border-gray-300 bg-gray-50/50 p-4">
                      <img src={data.artworkLogo3} alt="Logo 3" className="max-h-full max-w-full object-contain" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PAGE 4: Trims & Labels */}
        {(data.trimMainLabel || data.trimWashCare || data.trimSizeLabel || data.trimHangTag || data.trimHangTagBack || data.trimPolyBag || data.trimPackingSticker || data.trimTagline || data.trimCare || data.trimThread) && (
          <div className="page-break-after print-page bg-white shadow-lg border-2 border-gray-200 ring-1 ring-gray-900/5 w-[297mm] h-[210mm] mx-auto p-[10mm] box-border relative print:shadow-none print:border print:border-gray-300 print:w-auto print:h-auto print:p-[5mm] print:mx-0 flex flex-col">
            <TemplateHeader />
            <div className="flex-1 flex flex-col min-h-0 mb-4">
              <SectionHeader title="1. TRIMS & LABELS" />
              <div className="flex-1 border-[2px] border-black flex flex-col bg-white min-h-0">
                
                {/* Row 1: 6 Columns */}
                <div className="flex-[0.6] border-b-[2px] border-black flex min-h-0">
                  <TrimBox title="A. MAIN LABEL (NECK LABEL)" img={data.trimMainLabel} isFirst />
                  <TrimBox title="B. SIZE LABEL (LOOP FOLD)" img={data.trimSizeLabel} />
                  <TrimBox title="C. WASH CARE LABEL" img={data.trimWashCare} />
                  <TrimBox title="D. HANG TAG (FRONT)" img={data.trimHangTag} />
                  <TrimBox title="E. HANG TAG (BACK)" img={data.trimHangTagBack} />
                  <TrimBox title="F. POLY BAG" img={data.trimPolyBag} />
                </div>
                
                {/* Row 2: 4 Columns */}
                <div className="flex-[0.4] flex min-h-0">
                  <div className="w-[20%] border-r-[2px] border-black flex flex-col min-h-0">
                    <div className="bg-black text-white text-[8px] sm:text-[9px] font-bold px-2 py-1 uppercase border-b-[2px] border-black">2. PACKING STICKER</div>
                    <div className="flex-1 p-2 flex items-center justify-center min-h-0">{data.trimPackingSticker && <img src={data.trimPackingSticker} className="max-h-full max-w-full object-contain" />}</div>
                  </div>
                  <div className="w-[30%] border-r-[2px] border-black flex flex-col min-h-0">
                    <div className="bg-black text-white text-[8px] sm:text-[9px] font-bold px-2 py-1 uppercase border-b-[2px] border-black">3. BRAND TAGLINE (OPTIONAL INNER PRINT)</div>
                    <div className="flex-1 p-2 flex items-center justify-center min-h-0">{data.trimTagline && <img src={data.trimTagline} className="max-h-full max-w-full object-contain" />}</div>
                  </div>
                  <div className="w-[30%] border-r-[2px] border-black flex flex-col min-h-0">
                    <div className="bg-black text-white text-[8px] sm:text-[9px] font-bold px-2 py-1 uppercase border-b-[2px] border-black">4. CARE INSTRUCTIONS (REFERENCE)</div>
                    <div className="flex-1 p-2 flex items-center justify-center min-h-0">{data.trimCare && <img src={data.trimCare} className="max-h-full max-w-full object-contain" />}</div>
                  </div>
                  <div className="w-[20%] flex flex-col min-h-0">
                    <div className="bg-black text-white text-[8px] sm:text-[9px] font-bold px-2 py-1 uppercase border-b-[2px] border-black">5. THREAD</div>
                    <div className="flex-1 p-2 flex items-center justify-center min-h-0">{data.trimThread && <img src={data.trimThread} className="max-h-full max-w-full object-contain" />}</div>
                  </div>
                </div>

              </div>
              <div className="text-[7px] sm:text-[8px] font-bold uppercase text-gray-600 flex gap-4 mt-2 border-t-[2px] border-gray-300 pt-2 shrink-0">
                <span className="text-black">NOTES:</span>
                <span>• All trims & labels should match the provided specifications.</span>
                <span>• Placement & size must be as per tech pack.</span>
                <span>• Use only approved vendors for trims & packaging.</span>
              </div>
            </div>
          </div>
        )}

        {/* PAGE 4: Measurements Sheet & Guide */}
        <div className="page-break-after print-page bg-white shadow-lg border-2 border-gray-200 ring-1 ring-gray-900/5 w-[297mm] h-[210mm] mx-auto p-[10mm] box-border relative print:shadow-none print:border print:border-gray-300 print:w-auto print:h-auto print:p-[5mm] print:mx-0 flex flex-col">
          <TemplateHeader />
          <div className="flex-1 flex gap-4 min-h-0 mb-4 h-[140mm]">
            
            {/* Left Column: Measurement Sheet Table + Notes */}
            <div className="flex-[0.55] flex flex-col min-h-0">
              <SectionHeader title="1. MEASUREMENT SHEET (ALL MEASUREMENTS ARE IN INCHES)" />
              <div className="flex-1 overflow-y-auto border-[2px] border-black relative bg-white flex flex-col">
                <table className="w-full border-collapse text-[8px] text-center max-w-full table-fixed">
                  <thead className="sticky top-0 bg-gray-100 z-10">
                    <tr>
                      <th className="border-b-[2px] border-black border-r-[2px] p-1 font-bold uppercase w-[6%]">SR.</th>
                      <th className="border-b-[2px] border-black border-r-[2px] p-1 font-bold uppercase text-left w-[44%]">DESCRIPTION</th>
                      <th className="border-b-[2px] border-black border-r-[2px] p-1 font-bold uppercase w-[8%]">TOL</th>
                      <th className="border-b-[2px] border-black border-r-[2px] p-1 font-bold uppercase w-[7%]">S</th>
                      <th className="border-b-[2px] border-black border-r-[2px] p-1 font-bold uppercase w-[7%]">M</th>
                      <th className="border-b-[2px] border-black border-r-[2px] p-1 font-bold uppercase w-[7%]">L</th>
                      <th className="border-b-[2px] border-black border-r-[2px] p-1 font-bold uppercase w-[7%]">XL</th>
                      <th className="border-b-[2px] border-black p-1 font-bold uppercase w-[7%]">XXL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.measurements.length > 0 ? (
                      data.measurements.map((m, idx) => (
                        <tr key={m.id}>
                          <td className="border-b border-black border-r-[2px] p-1 font-bold">{m.srNo || '-'}</td>
                          <td className="border-b border-black border-r-[2px] p-1 text-left truncate">{m.description || '-'}</td>
                          <td className="border-b border-black border-r-[2px] p-1 font-mono">{m.tol || '0'}</td>
                          <td className="border-b border-black border-r-[2px] p-1 font-mono">{m.s || '-'}</td>
                          <td className="border-b border-black border-r-[2px] p-1 font-mono">{m.m || '-'}</td>
                          <td className="border-b border-black border-r-[2px] p-1 font-mono font-bold bg-gray-50">{m.l || '-'}</td>
                          <td className="border-b border-black border-r-[2px] p-1 font-mono">{m.xl || '-'}</td>
                          <td className="border-b border-black p-1 font-mono">{m.xxl || '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="p-4 text-gray-400">No Measurements Entered</td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <div className="shrink-0 p-2 bg-white mt-auto border-t-[2px] border-black">
                   <span className="font-bold text-[9px] uppercase block mb-1">NOTES:</span>
                   <div className="text-[8px] whitespace-pre-wrap text-gray-800 leading-snug">
                     {data.measurementNotes || '• All measurements are in inches.\n• Tolerance (+/-) as per size chart.\n• Measurements are taken on flat garment.\n• Follow grading rules for other sizes.'}
                   </div>
                </div>
              </div>
              <div className="text-[7px] mt-1 text-gray-500 font-bold uppercase">
                NOTE: Use only approved measurements for production. Any deviation must be approved by the designer.
              </div>
            </div>

            {/* Right Column: Measurement Guide + Legend */}
            <div className="flex-[0.45] flex flex-col min-h-0">
              <SectionHeader title="2. MEASUREMENT GUIDE (REFERENCE)" />
              <div className="flex-1 flex flex-col bg-white overflow-hidden">
                <div className="flex-[0.55] flex items-center justify-center p-2 border-[2px] border-black border-b-0 bg-white min-h-0 relative">
                  {data.measurementGuideImage ? (
                    <img src={data.measurementGuideImage} alt="Measurement Guide" className="max-h-full max-w-full object-contain mix-blend-multiply drop-shadow-sm" />
                  ) : (
                    <div className="w-full h-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-[10px] text-center p-4">
                      Measurement Guide Not Inserted
                    </div>
                  )}
                </div>
                <div className="flex-[0.45] flex flex-col border-[2px] border-black min-h-0">
                  <div className="bg-black text-white text-[8px] font-bold px-2 py-1 uppercase">LEGEND</div>
                  <div className="flex-1 overflow-y-auto p-2">
                    <div className="columns-3 gap-2 text-[6.5px] leading-tight text-gray-800">
                      {data.measurements.map(m => (
                        <div key={m.id} className="break-inside-avoid flex gap-1 mb-1">
                          <span className="font-bold shrink-0">{m.srNo}.</span>
                          <span className="truncate">{m.description}</span>
                        </div>
                      ))}
                      {data.measurements.length === 0 && (
                          <div className="text-gray-400">No measurements specified.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* PAGE 8: COLORWAYS */}
        {(data.colorways && data.colorways.length > 0) && (
          <div className="page-break-after print-page bg-white shadow-lg border-2 border-gray-200 ring-1 ring-gray-900/5 w-[297mm] h-[210mm] mx-auto p-[10mm] box-border relative print:shadow-none print:border print:border-gray-300 print:w-auto print:h-auto print:p-[5mm] print:mx-0 flex flex-col">
            <TemplateHeader />
            <div className="flex-1 flex flex-col min-h-0 w-full relative h-[140mm]">
               <SectionHeader title="COLORWAYS & VARIATIONS" />
               <div className="flex-1 border-[2px] border-black p-4 grid grid-cols-4 gap-4 overflow-hidden bg-white">
                  {data.colorways.map(cw => (
                     <div key={cw.id} className="border border-gray-300 p-2 h-full flex flex-col gap-2">
                        <div className="font-bold text-[10px] uppercase truncate">{cw.name}</div>
                        <div className="flex-1 flex w-full border border-gray-200">
                           <div style={{ backgroundColor: cw.primaryColor }} className="h-full flex-[2]"></div>
                           {cw.secondaryColor && (
                             <div style={{ backgroundColor: cw.secondaryColor }} className="h-full flex-[1] border-l border-white/50"></div>
                           )}
                        </div>
                        <div className="text-[8px] space-y-0.5">
                           <div><span className="font-bold text-gray-500 mr-1">PRIMARY:</span><span className="font-mono">{cw.primaryColor}</span></div>
                           {cw.secondaryColor && <div><span className="font-bold text-gray-500 mr-1">SECONDARY:</span><span className="font-mono">{cw.secondaryColor}</span></div>}
                           {cw.pantoneRef && <div><span className="font-bold text-gray-500 mr-1">PANTONE/TPG:</span><span className="truncate inline-block max-w-full align-bottom">{cw.pantoneRef}</span></div>}
                        </div>
                     </div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {/* PAGE 10: PATTERN & SEAMS */}
        {(data.seamDetails && data.seamDetails.length > 0 || data.constructionImage) && (
          <div className="page-break-after print-page bg-white shadow-lg border-2 border-gray-200 ring-1 ring-gray-900/5 w-[297mm] h-[210mm] mx-auto p-[10mm] box-border relative print:shadow-none print:border print:border-gray-300 print:w-auto print:h-auto print:p-[5mm] print:mx-0 flex flex-col">
            <TemplateHeader />
            <div className="flex-1 flex flex-col min-h-0 w-full relative h-[140mm]">
               <SectionHeader title="PATTERN & CONSTRUCTION" />
               <div className="flex-1 flex border-[2px] border-black p-4 bg-white min-h-0 gap-6">
                  <div className="flex-1 border-[2px] border-gray-300 relative flex items-center justify-center p-2 bg-gray-50 h-[100%] overflow-hidden">
                     {data.constructionImage ? (
                        <img src={data.constructionImage} alt="Construction Sketch" className="max-w-full max-h-full object-contain filter grayscale contrast-125" />
                     ) : (
                        <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">NO SKETCH PROVIDED</span>
                     )}
                  </div>
                  <div className="flex-1 h-[100%] overflow-hidden border border-black p-4 flex flex-col">
                     <div className="font-bold text-[10px] uppercase text-gray-500 mb-2 border-b border-gray-300 pb-1">Seam Construction Callouts</div>
                     <div className="flex-1 overflow-auto text-[8px]">
                        {data.seamDetails?.map((s, i) => (
                           <div key={s.id} className="mb-3 border-b border-gray-200 pb-2">
                             <div className="font-bold uppercase flex justify-between">
                               <span>#{i+1} {s.placement}</span>
                               <span className="font-mono text-gray-500">{s.spi}</span>
                             </div>
                             <div className="mt-1">
                               <span className="font-bold text-gray-400">SEAM:</span> {s.seamType} 
                               <span className="font-bold text-gray-400 ml-2">STITCH:</span> {s.stitchType}
                             </div>
                             {s.notes && <div className="mt-1 text-gray-600"><span className="font-bold text-gray-400">NOTES:</span> {s.notes}</div>}
                           </div>
                        ))}
                        {(!data.seamDetails || data.seamDetails.length === 0) && (
                           <div className="text-gray-400 text-center mt-10 uppercase tracking-widest">No detailed callouts</div>
                        )}
                     </div>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @page {
          size: A4 landscape;
          margin: 10mm;
        }
        @media print {
          body {
            background: white;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .page-break-after {
            page-break-after: always;
            break-after: page;
          }
          .print-page {
            max-height: 190mm;
            overflow: hidden;
          }
        }
      `}</style>
    </div>
  );
}
