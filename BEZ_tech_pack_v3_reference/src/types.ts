export interface BOMItem {
  id: string;
  item: string;
  placement: string;
  description: string;
  supplier: string;
  color: string;
  qty: string;
}

export interface SeamDetail {
  id: string;
  placement: string;
  seamType: string;
  stitchType: string;
  spi: string;
  notes: string;
}

export interface Colorway {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor?: string;
  pantoneRef?: string;
  image?: string;
}

export interface CostingData {
  fabricCostPerUnit: number;
  trimCostPerUnit: number;
  printCostPerUnit: number;
  cutMakeTrimCost: number;
  packagingCost: number;
  shippingCost: number;
  markupPercentage: number;
  currency?: string;
}

export interface MeasurementItem {
  id: string;
  srNo: string;
  description: string;
  tol: string;
  grade?: string;
  s: string;
  m: string;
  l: string;
  xl: string;
  xxl: string;
}

export interface Annotation {
  id: string;
  type: 'arrow' | 'bi-arrow' | 'line' | 'circle' | 'text' | 'rect';
  points?: number[];
  text?: string;
  radius?: number;
  width?: number;
  height?: number;
  x: number;
  y: number;
  color: string;
}

export interface MockupData {
  type: string;
  color: string;
  sleeveColor?: string;
  collarColor?: string;
  design?: string;
  designSize?: number;
  designX?: number;
  designY?: number;
  designOpacity?: number;
  designRotation?: number;
}

export interface TechPackData {
  brand: string;
  styleNo: string;
  styleName: string;
  description: string;
  season: string;
  category: string;
  sizeRange: string;
  fit: string;
  fabric: string;
  fabricWeight: string;
  date: string;
  version: string;
  designer: string;
  approvedBy: string;
  madeIn: string;
  bom: BOMItem[];
  measurements: MeasurementItem[];
  logoImage?: string;
  logoScale?: number;
  logoScaleX?: number;
  logoScaleY?: number;
  frontSketch?: string;
  frontSketchScale?: number;
  frontSketchScaleX?: number;
  frontSketchScaleY?: number;
  backSketch?: string;
  backSketchScale?: number;
  backSketchScaleX?: number;
  backSketchScaleY?: number;
  printDetailsImage?: string;
  mockups?: MockupData[];
  
  // Trims & Labels
  trimMainLabel?: string;
  trimWashCare?: string;
  trimSizeLabel?: string;
  trimHangTag?: string;
  trimHangTagBack?: string;
  trimPolyBag?: string;
  trimPackingSticker?: string;
  trimTagline?: string;
  trimCare?: string;
  trimThread?: string;
  // Print & Artwork Details
  printPlacementFront?: string;
  printPlacementBack?: string;
  artworkLogo1?: string;
  artworkLogo2?: string;
  artworkLogo3?: string;
  printSpecType?: string;
  printSpecMethod?: string;
  printSpecInkType?: string;
  printSpecInkFinish?: string;
  printSpecLocation?: string;
  printSpecColors?: string;
  printColorsList?: { colorCode: string; colorName: string; pantoneCode: string }[];
  printingNotes?: string;
  printReferenceImage?: string;
  
  // Measurements
  measurementNotes?: string;
  measurementGuideImage?: string;
  measurementGuideBaseImage?: string;
  measurementAnnotations?: Annotation[];
  // Print Sketch Tools
  printSketchImage?: string;
  printSketchBaseImage?: string;
  printSketchAnnotations?: Annotation[];
  colorways?: Colorway[];
  costing?: CostingData;
  constructionImage?: string;
  seamDetails?: SeamDetail[];
  threeDModelUrl?: string;
  // Pattern Drafting
  patternData?: any;
}

export const initialTechPack: TechPackData = {
  brand: 'BUDDY ENGINEERZ',
  styleNo: 'BEZ-TS-001',
  styleName: 'BE CORE TEE',
  description: 'ROUND NECK T-SHIRT',
  season: 'ALL SEASON',
  category: 'MENSWEAR',
  sizeRange: 'S - M - L - XL - XXL',
  fit: 'REGULAR FIT',
  fabric: '100% COTTON',
  fabricWeight: '180 GSM',
  date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
  version: '1.0',
  designer: 'BUDDY ENGINEERZ',
  approvedBy: '',
  madeIn: 'INDIA',
  bom: [],
  measurements: [],
  colorways: [],
  seamDetails: [],
  costing: {
    fabricCostPerUnit: 0,
    trimCostPerUnit: 0,
    printCostPerUnit: 0,
    cutMakeTrimCost: 0,
    packagingCost: 0,
    shippingCost: 0,
    markupPercentage: 50
  }
};
