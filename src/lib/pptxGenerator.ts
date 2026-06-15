// PowerPoint exporter helper for BETPG using PptxGenJS client-side
import pptxgen from 'pptxgenjs';

export async function generateTechPackPPTX(
  product: any,
  placementSpecs: any,
  pantones: Array<{ name: string; hex: string }>
) {
  console.log('Generating PPTX in browser...');
  
  const pptx = new pptxgen();
  pptx.layout = 'LAYOUT_16x9';

  const dateStr = new Date(product.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const getMeasurements = () => {
    if (product.template?.measurements) {
      return product.template.measurements;
    }
    return [];
  };

  const standardPoints = [
    { num: 1, desc: 'Neck width seam to seam', key: 'neckWidth', baseRatio: 1.0, tol: '1/8' },
    { num: 2, desc: 'Front neck drop HPS to neck seam', key: 'neckWidth', baseRatio: 0.6, tol: '1/8' },
    { num: 3, desc: 'Back neck drop HPS to neck seam', key: 'neckWidth', baseRatio: 0.17, tol: '0' },
    { num: 4, desc: 'Neck rib height', key: 'custom', baseVal: 0.5, tol: '0' },
    { num: 5, desc: 'Shoulder width seam to seam', key: 'shoulderWidth', baseRatio: 1.0, tol: '1/4' },
    { num: 6, desc: 'Shoulder Slope', key: 'custom', baseVal: 2.5, tol: '0' },
    { num: 7, desc: 'Chest 1" below from Armhole', key: 'chestWidth', baseRatio: 2.0, tol: '1/2' },
    { num: 8, desc: 'Bottom Sweep at straight edge', key: 'bottomWidth', baseRatio: 2.0, tol: '1/2' },
    { num: 9, desc: 'Armhole straight', key: 'sleeveOpening', baseRatio: 1.25, tol: '1/4' },
    { num: 10, desc: 'Sleeve length from shoulder seam', key: 'sleeveLength', baseRatio: 1.0, tol: '1/8' },
    { num: 11, desc: 'Sleeve underarm length', key: 'sleeveLength', baseRatio: 0.68, tol: '1/8' },
    { num: 12, desc: 'Biceps 1" Below Arm hole', key: 'sleeveOpening', baseRatio: 2.14, tol: '1/4' },
    { num: 13, desc: 'Sleeve opening at edge', key: 'sleeveOpening', baseRatio: 2.0, tol: '1/4' },
    { num: 14, desc: 'Front length from HPS', key: 'bodyLength', baseRatio: 1.0, tol: '1/4' },
    { num: 15, desc: 'Moon patch width', key: 'neckWidth', baseRatio: 1.1, tol: '1/8' },
    { num: 16, desc: 'Back moon patch height at CB', key: 'custom', baseVal: 4.0, tol: '1/8' },
    { num: 17, desc: 'Chest logo vertical from HPS', key: 'custom', baseVal: 7.75, tol: '1/8' },
    { num: 18, desc: 'Chest logo horizontal from CF', key: 'custom', baseVal: 3.25, tol: '1/8' },
    { num: 19, desc: 'Bottom Tail height', key: 'custom', baseVal: 2.0, tol: '0' },
  ];

  const getGradedValue = (sizeCode: string, point: typeof standardPoints[0]) => {
    const list = getMeasurements();
    const sizeItem = list.find((m: any) => m.size === sizeCode);
    if (!sizeItem) return 'N/A';

    if (point.key === 'custom') {
      let val = point.baseVal || 0;
      if (sizeCode === 'S') val -= 0.125;
      if (sizeCode === 'L') val += 0.125;
      if (sizeCode === 'XL') val += 0.25;
      if (sizeCode === 'XXL') val += 0.375;
      return formatFraction(val);
    }

    const baseVal = sizeItem[point.key] || 0;
    const finalVal = baseVal * (point.baseRatio ?? 1.0);
    return formatFraction(finalVal);
  };

  // Common Header style for all slides
  const addHeader = (slide: pptxgen.Slide, title: string) => {
    // Brand name
    slide.addText([
      { text: 'BUDDY ENGINEER', options: { bold: true, color: '111111' } },
      { text: 'Z', options: { bold: true, color: 'D62828' } }
    ], {
      x: 0.5,
      y: 0.25,
      w: 6.0,
      h: 0.4,
      fontSize: 16,
      charSpacing: 2,
    });
    // Slide Title
    slide.addText(title, {
      x: 0.5,
      y: 0.6,
      w: 6.0,
      h: 0.3,
      fontSize: 11,
      bold: true,
      color: '4B5563',
    });
    // Header Info Box
    slide.addText(`STYLE NO: ${product.styleNo}\nDATE: ${dateStr}\nVERSION: v1.0`, {
      x: 9.5,
      y: 0.25,
      w: 3.3,
      h: 0.65,
      fontSize: 8.5,
      align: 'right',
      color: '4B5563',
      lineSpacing: 1.2,
    });
    // Thick black underline separator
    slide.addShape('rect', {
      x: 0.5,
      y: 0.95,
      w: 12.3,
      h: 0.03,
      fill: { color: '111111' },
    });
  };

  // Common Footer
  const addFooter = (slide: pptxgen.Slide, pageNum: number) => {
    slide.addText('Buddy Engineerz Tech Pack System | Confidential Production Spec Sheet', {
      x: 0.5,
      y: 7.1,
      w: 8.0,
      h: 0.3,
      fontSize: 8,
      color: '9CA3AF',
    });
    slide.addText(`Page ${pageNum} of 5`, {
      x: 11.5,
      y: 7.1,
      w: 1.3,
      h: 0.3,
      fontSize: 8,
      align: 'right',
      color: '9CA3AF',
    });
  };

  // ====================================================
  // SLIDE 1: PRODUCT OVERVIEW
  // ====================================================
  const slide1 = pptx.addSlide();
  addHeader(slide1, 'PAGE 1: PRODUCT OVERVIEW');
  
  // Left Specs Box (Table format)
  const specRows = [
    [
      { text: 'Style Property', options: { bold: true, fill: { color: '1F2937' }, color: 'FFFFFF' } },
      { text: 'Details', options: { bold: true, fill: { color: '1F2937' }, color: 'FFFFFF' } }
    ],
    [{ text: 'Style Name' }, { text: product.styleName }],
    [{ text: 'Style Number' }, { text: product.styleNo }],
    [{ text: 'Category' }, { text: product.template?.category || 'T-Shirt' }],
    [{ text: 'Fit Style' }, { text: product.template?.fitType || 'Regular Fit' }],
    [{ text: 'Fabric Composition' }, { text: product.template?.fabricType || '100% Cotton' }],
    [{ text: 'Fabric Weight' }, { text: `${product.template?.gsm || '180'} GSM` }],
    [{ text: 'Garment Color' }, { text: product.color }],
    [{ text: 'Season Collection' }, { text: product.season || 'All Season' }],
  ];

  slide1.addTable(specRows, {
    x: 0.5,
    y: 1.2,
    w: 5.5,
    h: 3.5,
    colW: [2.0, 3.5],
    border: { type: 'solid', color: 'E5E7EB', pt: 1 },
    fontSize: 9.5,
    valign: 'middle',
  });

  // Packaging instructions card
  slide1.addShape('roundRect', {
    x: 0.5,
    y: 4.9,
    w: 5.5,
    h: 2.0,
    fill: { color: 'F9FAFB' },
    line: { color: 'E5E7EB', width: 1 },
  });
  slide1.addText('PACKAGING INSTRUCTIONS', {
    x: 0.7,
    y: 5.0,
    w: 5.1,
    h: 0.3,
    fontSize: 9.5,
    bold: true,
    color: '1F2937',
  });
  slide1.addText(product.template?.defaultPackaging || 'Individual piece in clear polybag packaging. Standard Master carton delivery.', {
    x: 0.7,
    y: 5.3,
    w: 5.1,
    h: 1.4,
    fontSize: 8.5,
    color: '4B5563',
    lineSpacing: 1.3,
  });

  // Right mockup container
  if (placementSpecs?.mockupDataUrl) {
    slide1.addImage({
      data: placementSpecs.mockupDataUrl,
      x: 6.5,
      y: 1.2,
      w: 6.3,
      h: 5.7,
    });
  } else {
    slide1.addShape('rect', {
      x: 6.5,
      y: 1.2,
      w: 6.3,
      h: 5.7,
      fill: { color: 'F3F4F6' },
      line: { color: 'D1D5DB', width: 1 },
    });
    slide1.addText('No placement mockup available.', {
      x: 6.5,
      y: 3.8,
      w: 6.3,
      h: 0.4,
      align: 'center',
      fontSize: 11,
      color: '9CA3AF',
    });
  }
  addFooter(slide1, 1);

  // ====================================================
  // SLIDE 2: WHITE GARMENT - PLACEMENT & SPEC
  // ====================================================
  const slide2 = pptx.addSlide();
  addHeader(slide2, 'PAGE 2: WHITE GARMENT ARTWORK PLACEMENT');

  const coordRows = [
    [
      { text: 'Placement Criteria', options: { bold: true, fill: { color: '1F2937' }, color: 'FFFFFF' } },
      { text: 'Value & Sizing', options: { bold: true, fill: { color: '1F2937' }, color: 'FFFFFF' } }
    ],
    [{ text: 'Print Method' }, { text: product.printType.replace('_', ' ') }],
    [{ text: 'Placement Position' }, { text: placementSpecs?.placement || 'Chest / Back' }],
    [{ text: 'Print Sizing' }, { text: `${placementSpecs?.width || 'N/A'}x${placementSpecs?.height || 'N/A'} cm` }],
    [{ text: 'Collar Seam Offset (HPS)' }, { text: `${placementSpecs?.offsetFromHps || 'N/A'} cm` }],
    [{ text: 'Crease Offset (CF)' }, { text: placementSpecs?.offsetFromCf === 0 ? 'Centered' : `${Math.abs(placementSpecs?.offsetFromCf || 0)} cm` }],
    [{ text: 'Ink Colors' }, { text: 'Black, Red (Pantone 185C)' }],
  ];

  slide2.addTable(coordRows, {
    x: 0.5,
    y: 1.2,
    w: 5.5,
    h: 3.2,
    colW: [2.2, 3.3],
    border: { type: 'solid', color: 'E5E7EB', pt: 1 },
    fontSize: 9.5,
    valign: 'middle',
  });

  slide2.addShape('roundRect', {
    x: 0.5,
    y: 4.6,
    w: 5.5,
    h: 2.3,
    fill: { color: 'F9FAFB' },
    line: { color: 'E5E7EB', width: 1 },
  });
  slide2.addText('WHITE GARMENT PRINTING NOTES', {
    x: 0.7,
    y: 4.7,
    w: 5.1,
    h: 0.3,
    fontSize: 9.5,
    bold: true,
    color: '1F2937',
  });
  slide2.addText(
    `1. Print size must measure precisely as indicated. Tolerance: +/- 0.5 cm.\n2. Align center of graphic perfectly with Center Front crease line.\n3. Run trial prints on sample white blanks before launching machinery carousels.\n4. Strictly use lead-free, eco-friendly matte plastisol inks.`,
    {
      x: 0.7,
      y: 5.0,
      w: 5.1,
      h: 1.7,
      fontSize: 8.5,
      color: '4B5563',
      lineSpacing: 1.4,
    }
  );

  if (placementSpecs?.mockupDataUrl) {
    slide2.addImage({
      data: placementSpecs.mockupDataUrl,
      x: 6.5,
      y: 1.2,
      w: 6.3,
      h: 5.7,
    });
  }
  addFooter(slide2, 2);

  // ====================================================
  // SLIDE 3: BLACK GARMENT - PLACEMENT & SPEC
  // ====================================================
  const slide3 = pptx.addSlide();
  addHeader(slide3, 'PAGE 3: BLACK GARMENT ARTWORK PLACEMENT');

  const blackCoordRows = [
    [
      { text: 'Placement Criteria', options: { bold: true, fill: { color: '1F2937' }, color: 'FFFFFF' } },
      { text: 'Value & Sizing', options: { bold: true, fill: { color: '1F2937' }, color: 'FFFFFF' } }
    ],
    [{ text: 'Print Method' }, { text: product.printType.replace('_', ' ') }],
    [{ text: 'Placement Position' }, { text: placementSpecs?.placement || 'Chest / Back' }],
    [{ text: 'Print Sizing' }, { text: `${placementSpecs?.width || 'N/A'}x${placementSpecs?.height || 'N/A'} cm` }],
    [{ text: 'Collar Seam Offset (HPS)' }, { text: `${placementSpecs?.offsetFromHps || 'N/A'} cm` }],
    [{ text: 'Crease Offset (CF)' }, { text: placementSpecs?.offsetFromCf === 0 ? 'Centered' : `${Math.abs(placementSpecs?.offsetFromCf || 0)} cm` }],
    [{ text: 'Ink Colors' }, { text: 'White, Red (Pantone 185C)' }],
  ];

  slide3.addTable(blackCoordRows, {
    x: 0.5,
    y: 1.2,
    w: 5.5,
    h: 3.2,
    colW: [2.2, 3.3],
    border: { type: 'solid', color: 'E5E7EB', pt: 1 },
    fontSize: 9.5,
    valign: 'middle',
  });

  slide3.addShape('roundRect', {
    x: 0.5,
    y: 4.6,
    w: 5.5,
    h: 2.3,
    fill: { color: '1F2937' },
    line: { color: '374151', width: 1 },
  });
  slide3.addText('BLACK GARMENT PRINTING NOTES', {
    x: 0.7,
    y: 4.7,
    w: 5.1,
    h: 0.3,
    fontSize: 9.5,
    bold: true,
    color: 'FFFFFF',
  });
  slide3.addText(
    `1. Discharge white under-base layer printing is mandatory on black fabric.\n2. Prevent dye migration (fabric bleed into white print) via careful curing controls.\n3. Keep black blanks dry and flat before loading screen carousels.\n4. Check red/white registration overlaps carefully to prevent bleeding borders.`,
    {
      x: 0.7,
      y: 5.0,
      w: 5.1,
      h: 1.7,
      fontSize: 8.5,
      color: 'D1D5DB',
      lineSpacing: 1.4,
    }
  );

  if (placementSpecs?.mockupDataUrl) {
    slide3.addImage({
      data: placementSpecs.mockupDataUrl,
      x: 6.5,
      y: 1.2,
      w: 6.3,
      h: 5.7,
    });
  }
  addFooter(slide3, 3);

  // ====================================================
  // SLIDE 4: LABELS & TRIMS
  // ====================================================
  const slide4 = pptx.addSlide();
  addHeader(slide4, 'PAGE 4: LABELS & TRIMS SPECIFICATIONS');

  slide4.addShape('roundRect', {
    x: 0.5,
    y: 1.2,
    w: 5.5,
    h: 5.7,
    fill: { color: 'F9FAFB' },
    line: { color: 'E5E7EB', width: 1 },
  });
  slide4.addText('BRANDING & WOVEN LABELS', {
    x: 0.7,
    y: 1.4,
    w: 5.1,
    h: 0.3,
    fontSize: 10,
    bold: true,
    color: '1F2937',
  });
  
  const neckLabelRows = [
    [
      { text: 'Neck Label Spec', options: { bold: true, fill: { color: '374151' }, color: 'FFFFFF' } },
      { text: 'Details', options: { bold: true, fill: { color: '374151' }, color: 'FFFFFF' } }
    ],
    [{ text: 'Label Type' }, { text: 'Woven Damask Loop Fold' }],
    [{ text: 'Positioning' }, { text: 'Sewed center inside neck band ribbing' }],
    [{ text: 'Dimensions' }, { text: '6 x 4 CM' }],
    [{ text: 'Yarn Colors' }, { text: 'Black base, White and Red logo yarns' }],
  ];

  slide4.addTable(neckLabelRows, {
    x: 0.7,
    y: 1.8,
    w: 5.1,
    h: 2.0,
    colW: [2.0, 3.1],
    border: { type: 'solid', color: 'E5E7EB', pt: 1 },
    fontSize: 9,
    valign: 'middle',
  });

  const careLabelRows = [
    [
      { text: 'Care Label Spec', options: { bold: true, fill: { color: '374151' }, color: 'FFFFFF' } },
      { text: 'Details', options: { bold: true, fill: { color: '374151' }, color: 'FFFFFF' } }
    ],
    [{ text: 'Label Material' }, { text: 'Soft white Satin Ribbon' }],
    [{ text: 'Positioning' }, { text: 'Stitched in left side seam, 10cm from bottom hem' }],
    [{ text: 'Dimensions' }, { text: '3 x 8 CM' }],
  ];

  slide4.addTable(careLabelRows, {
    x: 0.7,
    y: 4.1,
    w: 5.1,
    h: 1.8,
    colW: [2.0, 3.1],
    border: { type: 'solid', color: 'E5E7EB', pt: 1 },
    fontSize: 9,
    valign: 'middle',
  });

  slide4.addShape('roundRect', {
    x: 6.5,
    y: 1.2,
    w: 6.3,
    h: 5.7,
    fill: { color: 'F9FAFB' },
    line: { color: 'E5E7EB', width: 1 },
  });
  slide4.addText('PACKAGING & COMPONENT SPECIFICATIONS', {
    x: 6.7,
    y: 1.4,
    w: 5.9,
    h: 0.3,
    fontSize: 10,
    bold: true,
    color: '1F2937',
  });

  const trimRows = [
    [
      { text: 'Trim Item', options: { bold: true, fill: { color: '1F2937' }, color: 'FFFFFF' } },
      { text: 'Sourcing & Construction Guidelines', options: { bold: true, fill: { color: '1F2937' }, color: 'FFFFFF' } }
    ],
    [{ text: 'Size Tags' }, { text: '1x4 CM black size loops caught in neck rib.' }],
    [{ text: 'Hang Tag' }, { text: '9x14 CM cardstock brand tag attached via safety pin.' }],
    [{ text: 'Polybag' }, { text: '30x40 CM frosted LDPE slider bag, 50 micron thickness.' }],
    [{ text: 'Packing Sticker' }, { text: '6x4 CM barcode sticker showing Style, Size, and Color.' }],
  ];

  slide4.addTable(trimRows, {
    x: 6.7,
    y: 1.8,
    w: 5.9,
    h: 3.5,
    colW: [2.0, 3.9],
    border: { type: 'solid', color: 'E5E7EB', pt: 1 },
    fontSize: 9,
    valign: 'middle',
  });
  slide4.addText('*Notes: Thread parameters (Main & Overlock) are 100% polyester, color matched to black or white fabric respectively.', {
    x: 6.7,
    y: 5.8,
    w: 5.9,
    h: 0.8,
    fontSize: 8,
    color: '6B7280',
    lineSpacing: 1.3,
  });

  addFooter(slide4, 4);

  // ====================================================
  // SLIDE 5: MEASUREMENT SIZE CHART
  // ====================================================
  const slide5 = pptx.addSlide();
  addHeader(slide5, 'PAGE 5: SIZE CHART & MEASUREMENT SPEC SHEET');

  const tableHeaders = [
    { text: 'Measurement Point Description', options: { bold: true, fill: { color: '111111' }, color: 'FFFFFF' } },
    { text: 'Tol (+/-)', options: { bold: true, fill: { color: '111111' }, color: 'FFFFFF' } },
    { text: 'S', options: { bold: true, fill: { color: '111111' }, color: 'FFFFFF' } },
    { text: 'M', options: { bold: true, fill: { color: '111111' }, color: 'FFFFFF' } },
    { text: 'L', options: { bold: true, fill: { color: '111111' }, color: 'FFFFFF' } },
    { text: 'XL', options: { bold: true, fill: { color: '111111' }, color: 'FFFFFF' } },
    { text: 'XXL', options: { bold: true, fill: { color: '111111' }, color: 'FFFFFF' } },
  ];

  const sizeRows: pptxgen.TableCell[][] = [tableHeaders];

  const mList = getMeasurements();
  if (mList.length > 0) {
    standardPoints.forEach((point) => {
      sizeRows.push([
        { text: `${point.num}. ${point.desc}` },
        { text: `${point.tol}"` },
        { text: getGradedValue('S', point) + '"' },
        { text: getGradedValue('M', point) + '"' },
        { text: getGradedValue('L', point) + '"' },
        { text: getGradedValue('XL', point) + '"' },
        { text: getGradedValue('XXL', point) + '"' },
      ]);
    });
  } else {
    sizeRows.push([
      { text: 'No size measurements compiled for this template.', options: { colspan: 7, align: 'center' } }
    ]);
  }

  slide5.addTable(sizeRows, {
    x: 0.5,
    y: 1.1,
    w: 12.3,
    h: 5.0,
    colW: [4.7, 1.2, 1.28, 1.28, 1.28, 1.28, 1.28],
    border: { type: 'solid', color: 'E5E7EB', pt: 1 },
    fontSize: 8.5,
    align: 'center',
    valign: 'middle',
  });

  slide5.addText(
    '*Notes: Dimensions are in INCHES. Grading controls follow standard manufacturer blank tolerances. QC checks exceeding tolerances must be rejected.',
    {
      x: 0.5,
      y: 6.3,
      w: 12.3,
      h: 0.6,
      fontSize: 8,
      color: '6B7280',
    }
  );

  addFooter(slide5, 5);

  const filename = `${product.styleNo}_Tech_Pack_${product.styleName.replace(/\s+/g, '_')}.pptx`;
  await pptx.writeFile({ fileName: filename });
  console.log('PPTX file generated and downloaded!');
}

function formatFraction(val: number): string {
  if (val === 0) return '0';
  const integer = Math.floor(val);
  const remainder = val - integer;
  
  if (remainder < 0.05) return `${integer}`;
  if (Math.abs(remainder - 0.125) < 0.05) return integer > 0 ? `${integer} 1/8` : '1/8';
  if (Math.abs(remainder - 0.25) < 0.05) return integer > 0 ? `${integer} 1/4` : '1/4';
  if (Math.abs(remainder - 0.375) < 0.05) return integer > 0 ? `${integer} 3/8` : '3/8';
  if (Math.abs(remainder - 0.5) < 0.05) return integer > 0 ? `${integer} 1/2` : '1/2';
  if (Math.abs(remainder - 0.625) < 0.05) return integer > 0 ? `${integer} 5/8` : '5/8';
  if (Math.abs(remainder - 0.75) < 0.05) return integer > 0 ? `${integer} 3/4` : '3/4';
  if (Math.abs(remainder - 0.875) < 0.05) return integer > 0 ? `${integer} 7/8` : '7/8';
  
  return `${val.toFixed(2)}`;
}
