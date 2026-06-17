'use client';

import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  Font,
  Svg,
  Path,
  Rect,
  Circle,
  Line,
} from '@react-pdf/renderer';

// Styles matching the reference PDF exactly
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 20,
    fontFamily: 'Helvetica',
    height: '100%',
  },
  // Table Header Grid
  headerTable: {
    width: '100%',
    flexDirection: 'row',
    borderWidth: 1.2,
    borderColor: '#111111',
    marginBottom: 12,
    alignItems: 'stretch',
  },
  headerLogoCol: {
    width: '28%',
    borderRightWidth: 1,
    borderRightColor: '#000',
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogoText: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    color: '#000000',
  },
  headerGridCol: {
    width: '72%',
    flexDirection: 'column',
  },
  headerGridRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    minHeight: 22,
    alignItems: 'stretch',
  },
  headerGridRowLast: {
    flexDirection: 'row',
    minHeight: 22,
    alignItems: 'stretch',
  },
  headerCellKey: {
    width: '13%',
    fontSize: 6,
    fontWeight: 'bold',
    color: '#111111',
    paddingLeft: 4,
    paddingRight: 4,
    textTransform: 'uppercase',
    borderRightWidth: 1,
    borderRightColor: '#d1d5db',
    justifyContent: 'center',
  },
  headerCellValue: {
    width: '20%',
    fontSize: 6.5,
    fontWeight: 'bold',
    color: '#111111',
    paddingLeft: 4,
    paddingRight: 4,
    textTransform: 'uppercase',
    borderRightWidth: 1,
    borderRightColor: '#111111',
    justifyContent: 'center',
  },
  headerCellKey2: {
    width: '15%',
    fontSize: 6,
    fontWeight: 'bold',
    color: '#111111',
    paddingLeft: 4,
    paddingRight: 4,
    textTransform: 'uppercase',
    borderRightWidth: 1,
    borderRightColor: '#d1d5db',
    justifyContent: 'center',
  },
  headerCellValue2: {
    width: '22%',
    fontSize: 6.5,
    fontWeight: 'bold',
    color: '#111111',
    paddingLeft: 4,
    paddingRight: 4,
    textTransform: 'uppercase',
    borderRightWidth: 1,
    borderRightColor: '#111111',
    justifyContent: 'center',
  },
  headerCellKey3: {
    width: '12%',
    fontSize: 6,
    fontWeight: 'bold',
    color: '#111111',
    paddingLeft: 4,
    paddingRight: 4,
    textTransform: 'uppercase',
    borderRightWidth: 1,
    borderRightColor: '#d1d5db',
    justifyContent: 'center',
  },
  headerCellValue3: {
    width: '18%',
    fontSize: 6.5,
    fontWeight: 'bold',
    color: '#111111',
    paddingLeft: 4,
    paddingRight: 4,
    textTransform: 'uppercase',
    justifyContent: 'center',
  },
  // Section Headings (black ribbon style)
  sectionHeading: {
    fontSize: 8,
    fontWeight: 'bold',
    backgroundColor: '#000000',
    color: '#ffffff',
    padding: 3,
    paddingHorizontal: 8,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  // Subtitle
  subtitle: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#4b5563',
    marginBottom: 10,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  // Multi-column layouts
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col2: {
    width: '50%',
    flexDirection: 'column',
  },
  col3: {
    width: '33.3%',
    flexDirection: 'column',
  },
  // Page 1: Side by side Mockup
  page1MockupRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    flex: 1,
    paddingVertical: 20,
    backgroundColor: '#fdfdfd',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
  },
  mockupWrap: {
    position: 'relative',
    width: 220,
    height: 247,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Page 2 & 3: Detailed Placement Sheet
  placementLeft: {
    width: '63%',
    flexDirection: 'column',
  },
  placementRight: {
    width: '37%',
    flexDirection: 'column',
  },
  mockupFramePlacement: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    padding: 10,
    height: 250,
  },
  specCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
    backgroundColor: '#fbfbfb',
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7.5,
    paddingVertical: 3.5,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  label: {
    color: '#4b5563',
    fontWeight: 'bold',
  },
  value: {
    color: '#000000',
    fontWeight: 'bold',
  },
  pantoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pantoneColorBox: {
    width: 12,
    height: 12,
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: '#9ca3af',
  },
  pantoneName: {
    fontSize: 7.5,
    fontWeight: 'bold',
    color: '#111111',
  },
  pantoneHex: {
    fontSize: 7,
    color: '#6b7280',
    fontFamily: 'Courier',
  },
  // Notes list
  notesText: {
    fontSize: 7,
    color: '#4b5563',
    lineHeight: 1.4,
  },
  // Page 4: Trims and labels grid card layout
  trimGridRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  trimCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    padding: 6,
    backgroundColor: '#fafafa',
  },
  trimCardTitle: {
    fontSize: 7.5,
    fontWeight: 'bold',
    backgroundColor: '#f3f4f6',
    color: '#1f2937',
    padding: 2.5,
    textAlign: 'center',
    marginBottom: 4,
    borderWidth: 0.5,
    borderColor: '#d1d5db',
    borderRadius: 2,
  },
  trimImagePlaceholder: {
    height: 50,
    backgroundColor: '#ffffff',
    borderWidth: 0.5,
    borderColor: '#e5e7eb',
    borderRadius: 3,
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trimImageText: {
    fontSize: 6,
    color: '#9ca3af',
    fontWeight: 'bold',
  },
  trimSpecs: {
    fontSize: 6.5,
    lineHeight: 1.25,
  },
  trimSpecItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 0.5,
    borderBottomColor: '#f1f1f1',
    paddingVertical: 1.5,
  },
  trimSpecLabel: {
    color: '#6b7280',
    fontWeight: 'bold',
  },
  trimSpecValue: {
    color: '#111111',
    fontWeight: 'bold',
  },
  careIconRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 4,
    backgroundColor: '#ffffff',
    borderWidth: 0.5,
    borderColor: '#e5e7eb',
    borderRadius: 3,
  },
  careIconItem: {
    alignItems: 'center',
    width: '20%',
  },
  careIconText: {
    fontSize: 4.5,
    color: '#4b5563',
    marginTop: 2,
    textAlign: 'center',
  },
  // Page 5: Sizing Sheet
  sizingLeft: {
    width: '60%',
  },
  sizingRight: {
    width: '40%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  table: {
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: '#111111',
    borderRadius: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    alignItems: 'center',
    paddingVertical: 3.5,
  },
  tableRowStriped: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    alignItems: 'center',
    paddingVertical: 3.5,
    backgroundColor: '#fafafa',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#111111',
    alignItems: 'center',
    paddingVertical: 5,
  },
  tableCellHeader: {
    color: '#ffffff',
    fontSize: 7.5,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  tableCellHeaderLg: {
    color: '#ffffff',
    fontSize: 7.5,
    fontWeight: 'bold',
    paddingLeft: 6,
    flex: 2.2,
  },
  tableCell: {
    fontSize: 7.5,
    color: '#111111',
    textAlign: 'center',
    flex: 1,
  },
  tableCellLg: {
    fontSize: 7.5,
    color: '#111111',
    paddingLeft: 6,
    textAlign: 'left',
    fontWeight: 'bold',
    flex: 2.2,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 12,
    left: 20,
    right: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: '#9ca3af',
  },
});

// Logo image component — uses the actual master logo file (icon + BUDDY ENGINEERZ text)
const LogoSVG = () => (
  <Image src="/logo.png" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
);

// Vector Garment outlines
const TShirtFrontPDF = ({ color }: { color: string }) => (
  <Svg viewBox="0 0 400 450" style={{ width: 140, height: 155 }}>
    {/* Body Base */}
    <Path
      d="M 120 40 C 140 40, 160 46, 200 46 C 240 46, 260 40, 280 40 C 295 40, 310 44, 320 52 L 390 100 C 398 106, 396 118, 388 122 L 350 142 C 342 146, 335 142, 332 135 L 320 105 L 320 410 C 320 416, 315 420, 308 420 L 92 420 C 85 420, 80 416, 80 410 L 80 105 L 68 135 C 65 142, 58 146, 50 142 L 12 122 C 4 118, 2 106, 10 100 L 80 52 C 90 44, 105 40, 120 40 Z"
      fill={color}
      stroke="#27272a"
      strokeWidth={2}
    />
    {/* Soft side shading overlay */}
    <Path
      d="M 320 105 L 320 410 C 320 416, 315 420, 308 420 L 260 420 C 275 400, 280 300, 280 200 C 280 120, 295 105, 320 105 Z"
      fill="#000000"
      opacity={0.06}
    />
    <Path
      d="M 80 105 L 80 410 C 80 416, 85 420, 92 420 L 140 420 C 125 400, 120 300, 120 200 C 120 120, 105 105, 80 105 Z"
      fill="#ffffff"
      opacity={0.12}
    />
    <Path d="M 140 40 C 160 66, 240 66, 260 40" fill="none" stroke="#18181b" strokeWidth={3} />
    <Path d="M 145 42 C 160 62, 240 62, 255 42" fill="none" stroke="#71717a" strokeWidth={0.8} strokeDasharray="2,2" />
    <Path d="M 356 139 L 382 125 M 359 141 L 385 127" fill="none" stroke="#27272a" strokeWidth={0.8} opacity={0.5} strokeDasharray="3,2" />
    <Path d="M 44 139 L 18 125 M 41 141 L 15 127" fill="none" stroke="#27272a" strokeWidth={0.8} opacity={0.5} strokeDasharray="3,2" />
    <Path d="M 82 412 L 318 412 M 82 415 L 318 415" fill="none" stroke="#27272a" strokeWidth={1} opacity={0.5} strokeDasharray="4,2" />
    <Path d="M 96 85 C 96 115, 96 130, 96 150" fill="none" stroke="#27272a" strokeWidth={1} strokeDasharray="3,3" opacity={0.4} />
    <Path d="M 304 85 C 304 115, 304 130, 304 150" fill="none" stroke="#27272a" strokeWidth={1} strokeDasharray="3,3" opacity={0.4} />
    <Path d="M 98 125 Q 110 135 120 130" fill="none" stroke="#27272a" strokeWidth={0.8} opacity={0.25} />
    <Path d="M 302 125 Q 290 135 280 130" fill="none" stroke="#27272a" strokeWidth={0.8} opacity={0.25} />
    <Path d="M 170 65 Q 200 75 230 65" fill="none" stroke="#27272a" strokeWidth={0.8} opacity={0.2} />
    <Path d="M 85 360 Q 110 370 120 380" fill="none" stroke="#27272a" strokeWidth={0.8} opacity={0.15} />
    <Path d="M 315 360 Q 290 370 280 380" fill="none" stroke="#27272a" strokeWidth={0.8} opacity={0.15} />
  </Svg>
);

const TShirtBackPDF = ({ color }: { color: string }) => (
  <Svg viewBox="0 0 400 450" style={{ width: 140, height: 155 }}>
    <Path
      d="M 120 40 C 140 40, 160 46, 200 46 C 240 46, 260 40, 280 40 C 295 40, 310 44, 320 52 L 390 100 C 398 106, 396 118, 388 122 L 350 142 C 342 146, 335 142, 332 135 L 320 105 L 320 410 C 320 416, 315 420, 308 420 L 92 420 C 85 420, 80 416, 80 410 L 80 105 L 68 135 C 65 142, 58 146, 50 142 L 12 122 C 4 118, 2 106, 10 100 L 80 52 C 90 44, 105 40, 120 40 Z"
      fill={color}
      stroke="#27272a"
      strokeWidth={2}
    />
    {/* Soft side shading overlay */}
    <Path
      d="M 320 105 L 320 410 C 320 416, 315 420, 308 420 L 260 420 C 275 400, 280 300, 280 200 C 280 120, 295 105, 320 105 Z"
      fill="#000000"
      opacity={0.06}
    />
    <Path
      d="M 80 105 L 80 410 C 80 416, 85 420, 92 420 L 140 420 C 125 400, 120 300, 120 200 C 120 120, 105 105, 80 105 Z"
      fill="#ffffff"
      opacity={0.12}
    />
    <Path d="M 140 40 C 160 46, 240 46, 260 40" fill="none" stroke="#18181b" strokeWidth={3.5} />
    <Path d="M 148 44 C 160 78, 240 78, 252 44" fill="none" stroke="#27272a" strokeWidth={1.2} strokeDasharray="3,2" opacity={0.6} />
    <Path d="M 356 139 L 382 125 M 359 141 L 385 127" fill="none" stroke="#27272a" strokeWidth={0.8} opacity={0.5} strokeDasharray="3,2" />
    <Path d="M 44 139 L 18 125 M 41 141 L 15 127" fill="none" stroke="#27272a" strokeWidth={0.8} opacity={0.5} strokeDasharray="3,2" />
    <Path d="M 82 412 L 318 412 M 82 415 L 318 415" fill="none" stroke="#27272a" strokeWidth={1} opacity={0.5} strokeDasharray="4,2" />
    <Path d="M 96 85 C 96 115, 96 130, 96 150" fill="none" stroke="#27272a" strokeWidth={1} strokeDasharray="3,3" opacity={0.4} />
    <Path d="M 304 85 C 304 115, 304 130, 304 150" fill="none" stroke="#27272a" strokeWidth={1} strokeDasharray="3,3" opacity={0.4} />
  </Svg>
);

const HoodieFrontPDF = ({ color }: { color: string }) => (
  <Svg viewBox="0 0 400 450" style={{ width: 140, height: 155 }}>
    <Path
      d="M 115 65 C 130 65, 150 78, 200 78 C 250 78, 270 65, 285 65 C 295 65, 310 70, 320 80 L 390 140 C 397 146, 395 156, 388 160 L 355 178 C 348 182, 340 178, 336 172 L 325 145 L 320 390 C 320 398, 312 405, 300 405 L 100 405 C 88 405, 80 398, 80 390 L 75 145 L 64 172 C 60 178, 52 182, 45 178 L 12 160 C 5 156, 3 146, 10 140 L 80 80 C 90 70, 105 65, 115 65 Z"
      fill={color}
      stroke="#27272a"
      strokeWidth={2}
    />
    {/* Soft side shading overlay */}
    <Path
      d="M 320 120 L 320 390 C 320 398, 312 405, 300 405 L 250 405 C 265 390, 270 300, 270 200 C 270 140, 290 120, 320 120 Z"
      fill="#000000"
      opacity={0.06}
    />
    <Path
      d="M 80 120 L 75 145 L 80 390 C 80 398, 88 405, 100 405 L 150 405 C 135 390, 130 300, 130 200 C 130 140, 110 120, 80 120 Z"
      fill="#ffffff"
      opacity={0.12}
    />
    <Path d="M 140 68 C 120 68, 110 5, 200 5 C 290 5, 280 68, 260 68 C 240 70, 160 70, 140 68 Z" fill={color} stroke="#27272a" strokeWidth={1.8} />
    <Path d="M 160 68 C 160 25, 240 25, 240 68" fill="#1f2937" opacity={0.35} stroke="#1f2937" strokeWidth={1.5} />
    <Path d="M 185 68 L 185 135" fill="none" stroke="#d1d5db" strokeWidth={2.5} strokeLinecap="round" />
    <Path d="M 215 68 L 215 125" fill="none" stroke="#d1d5db" strokeWidth={2.5} strokeLinecap="round" />
    <Path d="M 120 270 L 280 270 L 290 330 C 290 340, 280 350, 270 350 L 130 350 C 120 350, 110 340, 110 330 Z" fill="none" stroke="#27272a" strokeWidth={1.8} />
    <Line x1="80" y1="390" x2="320" y2="390" stroke="#27272a" strokeWidth={3} />
    <Line x1="80" y1="400" x2="320" y2="400" stroke="#27272a" strokeWidth={2} />
    {/* Wrinkle lines */}
    <Path d="M 82 165 Q 92 175 102 170" fill="none" stroke="#27272a" strokeWidth={0.8} opacity={0.25} />
    <Path d="M 318 165 Q 308 175 298 170" fill="none" stroke="#27272a" strokeWidth={0.8} opacity={0.25} />
  </Svg>
);

const HoodieBackPDF = ({ color }: { color: string }) => (
  <Svg viewBox="0 0 400 450" style={{ width: 140, height: 155 }}>
    <Path
      d="M 115 65 C 130 65, 150 78, 200 78 C 250 78, 270 65, 285 65 C 295 65, 310 70, 320 80 L 390 140 C 397 146, 395 156, 388 160 L 355 178 C 348 182, 340 178, 336 172 L 325 145 L 320 390 C 320 398, 312 405, 300 405 L 100 405 C 88 405, 80 398, 80 390 L 75 145 L 64 172 C 60 178, 52 182, 45 178 L 12 160 C 5 156, 3 146, 10 140 L 80 80 C 90 70, 105 65, 115 65 Z"
      fill={color}
      stroke="#27272a"
      strokeWidth={2}
    />
    {/* Soft side shading overlay */}
    <Path
      d="M 320 120 L 320 390 C 320 398, 312 405, 300 405 L 250 405 C 265 390, 270 300, 270 200 C 270 140, 290 120, 320 120 Z"
      fill="#000000"
      opacity={0.06}
    />
    <Path
      d="M 80 120 L 75 145 L 80 390 C 80 398, 88 405, 100 405 L 150 405 C 135 390, 130 300, 130 200 C 130 140, 110 120, 80 120 Z"
      fill="#ffffff"
      opacity={0.12}
    />
    <Path d="M 140 68 C 120 68, 100 5, 200 5 C 300 5, 280 68, 260 68 C 240 70, 160 70, 140 68 Z" fill={color} stroke="#27272a" strokeWidth={1.8} />
    <Path d="M 200 5 L 200 68" fill="none" stroke="#27272a" strokeWidth={1.2} strokeDasharray="3,2" />
    <Line x1="80" y1="390" x2="320" y2="390" stroke="#27272a" strokeWidth={3} />
    <Line x1="80" y1="400" x2="320" y2="400" stroke="#27272a" strokeWidth={2} />
  </Svg>
);

// Header grid component that replicates the top header details grid
const HeaderTable = ({ product, dateStr, pageNum, pageTitle }: { product: any; dateStr: string; pageNum: number; pageTitle: string }) => (
  <View style={styles.headerTable}>
    {/* Left Logo block — shows full master logo (icon + text already included) */}
    <View style={[styles.headerLogoCol, { justifyContent: 'center', alignItems: 'center' }]}>
      <LogoSVG />
    </View>

    {/* Right data grid details */}
    <View style={styles.headerGridCol}>
      {/* Row 1 */}
      <View style={styles.headerGridRow}>
        <View style={styles.headerCellKey}><Text>BRAND</Text></View>
        <View style={styles.headerCellValue}><Text>{product.metaBrand || 'BUDDY ENGINEERZ'}</Text></View>
        <View style={styles.headerCellKey2}><Text>CATEGORY</Text></View>
        <View style={styles.headerCellValue2}><Text>{product.template?.category === 'Hoodie' ? 'MENSWEAR / OUTERWEAR' : 'MENSWEAR / ATHLETIC'}</Text></View>
        <View style={styles.headerCellKey3}><Text>DATE</Text></View>
        <View style={styles.headerCellValue3}><Text>{dateStr}</Text></View>
      </View>
      {/* Row 2 */}
      <View style={styles.headerGridRow}>
        <View style={styles.headerCellKey}><Text>STYLE NO.</Text></View>
        <View style={[styles.headerCellValue, { color: '#dc2626', fontWeight: 'extrabold' }]}><Text>{product.styleNo}</Text></View>
        <View style={styles.headerCellKey2}><Text>SIZE RANGE</Text></View>
        <View style={styles.headerCellValue2}><Text>{product.metaSizeRange || 'S - M - L - XL - XXL'}</Text></View>
        <View style={styles.headerCellKey3}><Text>VERSION</Text></View>
        <View style={styles.headerCellValue3}><Text>{product.metaVersion || '1.0'}</Text></View>
      </View>
      {/* Row 3 */}
      <View style={styles.headerGridRow}>
        <View style={styles.headerCellKey}><Text>STYLE NAME</Text></View>
        <View style={styles.headerCellValue}><Text>{product.styleName}</Text></View>
        <View style={styles.headerCellKey2}><Text>FIT</Text></View>
        <View style={styles.headerCellValue2}><Text>{product.template?.fitType || 'REGULAR FIT'}</Text></View>
        <View style={styles.headerCellKey3}><Text>DESIGNER</Text></View>
        <View style={styles.headerCellValue3}><Text>{product.metaDesigner || 'BUDDY ENGINEERZ'}</Text></View>
      </View>
      {/* Row 4 */}
      <View style={styles.headerGridRow}>
        <View style={styles.headerCellKey}><Text>DESCRIPTION</Text></View>
        <View style={styles.headerCellValue}><Text>{product.template?.category === 'Hoodie' ? 'HEAVY HOODED SWEATSHIRT' : 'ROUND NECK T-SHIRT'}</Text></View>
        <View style={styles.headerCellKey2}><Text>FABRIC</Text></View>
        <View style={styles.headerCellValue2}><Text>{product.template?.fabricType || '100% COTTON'}</Text></View>
        <View style={styles.headerCellKey3}><Text>APPROVED BY</Text></View>
        <View style={styles.headerCellValue3}><Text>{product.metaApprovedBy || '_______________'}</Text></View>
      </View>
      {/* Row 5 */}
      <View style={styles.headerGridRowLast}>
        <View style={styles.headerCellKey}><Text>SEASON</Text></View>
        <View style={styles.headerCellValue}><Text>{product.season || 'ALL SEASON'}</Text></View>
        <View style={styles.headerCellKey2}><Text>FABRIC WEIGHT</Text></View>
        <View style={styles.headerCellValue2}><Text>{product.template?.gsm || 180} GSM</Text></View>
        <View style={styles.headerCellKey3}><Text>MADE IN</Text></View>
        <View style={styles.headerCellValue3}><Text>{product.metaMadeIn || 'INDIA'}</Text></View>
      </View>
    </View>
  </View>
);

interface TechPackPDFProps {
  product: any;
  placementSpecs: {
    placement: string;
    width: number;
    height: number;
    offsetFromHps: number;
    offsetFromCf: number;
    mockupDataUrl: string;
  } | null;
  pantones: Array<{ name: string; hex: string }>;
}

export default function TechPackPDF({ product, placementSpecs, pantones }: TechPackPDFProps) {
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

  // 19 standard points matching reference PDF size sheet
  const standardPoints = [
    { num: 1, desc: 'Neck width from seam to seam', key: 'neckWidth', baseRatio: 1.0, tol: '1/8' },
    { num: 2, desc: 'Front neck drop from HPS to neck seam', key: 'neckWidth', baseRatio: 0.6, tol: '1/8' },
    { num: 3, desc: 'Back neck drop from HPS to neck seam', key: 'neckWidth', baseRatio: 0.17, tol: '0' },
    { num: 4, desc: 'Neck rib height', key: 'custom', baseVal: 0.5, tol: '0' },
    { num: 5, desc: 'Shoulder width seam to seam', key: 'shoulderWidth', baseRatio: 1.0, tol: '1/4' },
    { num: 6, desc: 'Shoulder Slope', key: 'custom', baseVal: 2.5, tol: '0' },
    { num: 7, desc: 'Chest 1" below from Armhole', key: 'chestWidth', baseRatio: 2.0, tol: '1/2' }, // Circumference
    { num: 8, desc: 'Bottom Sweep at straight edge', key: 'bottomWidth', baseRatio: 2.0, tol: '1/2' }, // Circumference
    { num: 9, desc: 'Armhole straight', key: 'sleeveOpening', baseRatio: 1.25, tol: '1/4' },
    { num: 10, desc: 'Sleeve length from shoulder seam', key: 'sleeveLength', baseRatio: 1.0, tol: '1/8' },
    { num: 11, desc: 'Sleeve underarm length', key: 'sleeveLength', baseRatio: 0.68, tol: '1/8' },
    { num: 12, desc: 'Biceps 1" Below Arm hole', key: 'sleeveOpening', baseRatio: 2.14, tol: '1/4' }, // Circumference
    { num: 13, desc: 'Sleeve opening at edge', key: 'sleeveOpening', baseRatio: 2.0, tol: '1/4' }, // Circumference
    { num: 14, desc: 'Front length from HPS', key: 'bodyLength', baseRatio: 1.0, tol: '1/4' },
    { num: 15, desc: 'Moon patch width', key: 'neckWidth', baseRatio: 1.1, tol: '1/8' },
    { num: 16, desc: 'Back moon patch height at CB', key: 'custom', baseVal: 4.0, tol: '1/8' },
    { num: 17, desc: 'Chest logo emb vertical placement from HPS', key: 'custom', baseVal: 7.75, tol: '1/8' },
    { num: 18, desc: 'Chest emb horizontal placement from CF', key: 'custom', baseVal: 3.25, tol: '1/8' },
    { num: 19, desc: 'Bottom Tail height', key: 'custom', baseVal: 2.0, tol: '0' },
  ];

  // Helper to resolve graded sizes using standard industry formulas
  const getGradedValue = (sizeCode: string, point: typeof standardPoints[0]) => {
    const list = getMeasurements();
    const sizeItem = list.find((m: any) => m.size === sizeCode);
    if (!sizeItem) return 'N/A';

    if (point.key === 'custom') {
      // Graded adjustments for static elements based on size
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

  return (
    <Document>
      {/* ==================================================== */}
      {/* PAGE 1: PRODUCT OVERVIEW                             */}
      {/* ==================================================== */}
      <Page size="A4" orientation="landscape" style={styles.page}>
        <HeaderTable product={product} dateStr={dateStr} pageNum={1} pageTitle="Product Overview" />
        
        <View style={styles.page1MockupRow}>
          {/* Black blank preview */}
          <View style={styles.mockupWrap}>
            <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#6b7280', position: 'absolute', top: 5 }}>BLACK BLANK</Text>
            {product.template?.category === 'Hoodie' ? (
              <HoodieFrontPDF color="#1a1a1a" />
            ) : (
              <TShirtFrontPDF color="#1a1a1a" />
            )}
            {/* Placed graphic overlay */}
            {product.artwork?.fileUrl && (
              <Image 
                src={product.artwork.fileUrl} 
                style={{ 
                  position: 'absolute', 
                  width: 32, 
                  height: 32, 
                  left: 132, 
                  top: 75,
                  opacity: 0.95 
                }} 
              />
            )}
          </View>

          {/* White blank preview */}
          <View style={styles.mockupWrap}>
            <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#6b7280', position: 'absolute', top: 5 }}>WHITE BLANK</Text>
            {product.template?.category === 'Hoodie' ? (
              <HoodieFrontPDF color="#f8f8f8" />
            ) : (
              <TShirtFrontPDF color="#f8f8f8" />
            )}
            {/* Placed graphic overlay */}
            {product.artwork?.fileUrl && (
              <Image 
                src={product.artwork.fileUrl} 
                style={{ 
                  position: 'absolute', 
                  width: 32, 
                  height: 32, 
                  left: 132, 
                  top: 75,
                  opacity: 0.95 
                }} 
              />
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Buddy Engineerz Tech Pack System v1.0</Text>
          <Text>Page 1 of 5</Text>
        </View>
      </Page>

      {/* ==================================================== */}
      {/* PAGE 2: WHITE GARMENT - PLACEMENT & SPEC             */}
      {/* ==================================================== */}
      <Page size="A4" orientation="landscape" style={styles.page}>
        <HeaderTable product={product} dateStr={dateStr} pageNum={2} pageTitle="White Placement Guide" />

        <View style={styles.row}>
          <View style={styles.placementLeft}>
            <Text style={styles.sectionHeading}>1. Print Details & Placement (White Garment)</Text>
            
            <View style={styles.mockupFramePlacement}>
              {/* Front view */}
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 6.5, fontWeight: 'bold', color: '#4b5563', marginBottom: 4 }}>FRONT (LEFT CHEST)</Text>
                <View style={{ position: 'relative' }}>
                  {product.template?.category === 'Hoodie' ? <HoodieFrontPDF color="#fcfcfc" /> : <TShirtFrontPDF color="#fcfcfc" />}
                  {placementSpecs?.mockupDataUrl && (
                    <Image src={placementSpecs.mockupDataUrl} style={{ position: 'absolute', width: 140, height: 155, left: 0, top: 0 }} />
                  )}
                </View>
                <Text style={{ fontSize: 6.5, fontWeight: 'bold', color: '#ef4444', marginTop: 4 }}>SCREEN PRINT</Text>
              </View>

              {/* Back view */}
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 6.5, fontWeight: 'bold', color: '#4b5563', marginBottom: 4 }}>BACK (CENTER)</Text>
                <View style={{ position: 'relative' }}>
                  {product.template?.category === 'Hoodie' ? <HoodieBackPDF color="#fcfcfc" /> : <TShirtBackPDF color="#fcfcfc" />}
                  {product.artwork?.fileUrl && (
                    <Image src={product.artwork.fileUrl} style={{ position: 'absolute', width: 65, height: 65, left: 37, top: 40 }} />
                  )}
                  {/* Vertical back print guide lines */}
                  <Svg style={{ position: 'absolute', width: 140, height: 155, left: 0, top: 0 }}>
                    <Line x1="70" y1="20" x2="70" y2="40" stroke="#f43f5e" strokeWidth={1} strokeDasharray="2,2" />
                    <Line x1="37" y1="110" x2="102" y2="110" stroke="#10b981" strokeWidth={1} />
                  </Svg>
                </View>
                <Text style={{ fontSize: 6.5, fontWeight: 'bold', color: '#ef4444', marginTop: 4 }}>SCREEN PRINT</Text>
              </View>
            </View>
          </View>

          <View style={styles.placementRight}>
            <Text style={styles.sectionHeading}>2. Artwork Details</Text>
            <View style={[styles.specCard, { height: 75, alignItems: 'center', justifyContent: 'center' }]}>
              {product.artwork?.fileUrl ? (
                <Image src={product.artwork.fileUrl} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
              ) : (
                <Text style={{ fontSize: 7, color: '#9ca3af' }}>No logo preview</Text>
              )}
            </View>

            <Text style={styles.sectionHeading}>3. Print Specification</Text>
            <View style={styles.specCard}>
              <View style={styles.rowItem}><Text style={styles.label}>PRINT TYPE</Text><Text style={styles.value}>{product.printType.replace('_', ' ')}</Text></View>
              <View style={styles.rowItem}><Text style={styles.label}>PRINT METHOD</Text><Text style={styles.value}>MANUAL FLAT BED</Text></View>
              <View style={styles.rowItem}><Text style={styles.label}>INK TYPE</Text><Text style={styles.value}>PLASTISOL INK</Text></View>
              <View style={styles.rowItem}><Text style={styles.label}>INK FINISH</Text><Text style={styles.value}>MATTE</Text></View>
              <View style={styles.rowItem}><Text style={styles.label}>LOCATION</Text><Text style={styles.value}>CHEST / BACK</Text></View>
            </View>

            <Text style={styles.sectionHeading}>4. Print Colors</Text>
            <View style={styles.specCard}>
              <View style={styles.rowItem}>
                <View style={styles.pantoneRow}>
                  <View style={[styles.pantoneColorBox, { backgroundColor: '#111111' }]} />
                  <Text style={styles.pantoneName}>BLACK</Text>
                </View>
                <Text style={styles.pantoneHex}>PANTONE BLACK C</Text>
              </View>
              <View style={styles.rowItem}>
                <View style={styles.pantoneRow}>
                  <View style={[styles.pantoneColorBox, { backgroundColor: '#ef4444' }]} />
                  <Text style={styles.pantoneName}>RED</Text>
                </View>
                <Text style={styles.pantoneHex}>PANTONE 185 C</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Notes section */}
        <View style={{ marginTop: 10 }}>
          <Text style={styles.sectionHeading}>5. Printing Notes</Text>
          <Text style={styles.notesText}>
            • Ensure artwork placement matches physical measurements (+/- 0.5cm tolerance max).
            {'\n'}• Maintain proper layer registration to prevent red/black ink overlap bleeding.
            {'\n'}• Prints must be fully cured to withstand commercial laundry washing tests.
            {'\n'}• Strictly use environment-friendly, lead-free plastisol ink formulations.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text>Buddy Engineerz Tech Pack System v1.0</Text>
          <Text>Page 2 of 5</Text>
        </View>
      </Page>

      {/* ==================================================== */}
      {/* PAGE 3: BLACK GARMENT - PLACEMENT & SPEC             */}
      {/* ==================================================== */}
      <Page size="A4" orientation="landscape" style={styles.page}>
        <HeaderTable product={product} dateStr={dateStr} pageNum={3} pageTitle="Black Placement Guide" />

        <View style={styles.row}>
          <View style={styles.placementLeft}>
            <Text style={styles.sectionHeading}>1. Print Details & Placement (Black Garment)</Text>
            
            <View style={[styles.mockupFramePlacement, { backgroundColor: '#1e1e1e' }]}>
              {/* Front view */}
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 6.5, fontWeight: 'bold', color: '#e5e7eb', marginBottom: 4 }}>FRONT (LEFT CHEST)</Text>
                <View style={{ position: 'relative' }}>
                  {product.template?.category === 'Hoodie' ? <HoodieFrontPDF color="#151515" /> : <TShirtFrontPDF color="#151515" />}
                  {placementSpecs?.mockupDataUrl && (
                    <Image src={placementSpecs.mockupDataUrl} style={{ position: 'absolute', width: 140, height: 155, left: 0, top: 0 }} />
                  )}
                </View>
                <Text style={{ fontSize: 6.5, fontWeight: 'bold', color: '#ef4444', marginTop: 4 }}>SCREEN PRINT</Text>
              </View>

              {/* Back view */}
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 6.5, fontWeight: 'bold', color: '#e5e7eb', marginBottom: 4 }}>BACK (CENTER)</Text>
                <View style={{ position: 'relative' }}>
                  {product.template?.category === 'Hoodie' ? <HoodieBackPDF color="#151515" /> : <TShirtBackPDF color="#151515" />}
                  {product.artwork?.fileUrl && (
                    <Image src={product.artwork.fileUrl} style={{ position: 'absolute', width: 65, height: 65, left: 37, top: 40 }} />
                  )}
                  {/* Vertical guides on black body */}
                  <Svg style={{ position: 'absolute', width: 140, height: 155, left: 0, top: 0 }}>
                    <Line x1="70" y1="20" x2="70" y2="40" stroke="#f43f5e" strokeWidth={1} strokeDasharray="2,2" />
                    <Line x1="37" y1="110" x2="102" y2="110" stroke="#10b981" strokeWidth={1} />
                  </Svg>
                </View>
                <Text style={{ fontSize: 6.5, fontWeight: 'bold', color: '#ef4444', marginTop: 4 }}>SCREEN PRINT</Text>
              </View>
            </View>
          </View>

          <View style={styles.placementRight}>
            <Text style={styles.sectionHeading}>2. Artwork Details</Text>
            <View style={[styles.specCard, { height: 75, alignItems: 'center', justifyContent: 'center' }]}>
              {product.artwork?.fileUrl ? (
                <Image src={product.artwork.fileUrl} style={{ width: '80%', height: '80%', objectFit: 'contain' }} />
              ) : (
                <Text style={{ fontSize: 7, color: '#9ca3af' }}>No logo preview</Text>
              )}
            </View>

            <Text style={styles.sectionHeading}>3. Print Specification</Text>
            <View style={styles.specCard}>
              <View style={styles.rowItem}><Text style={styles.label}>PRINT TYPE</Text><Text style={styles.value}>{product.printType.replace('_', ' ')}</Text></View>
              <View style={styles.rowItem}><Text style={styles.label}>PRINT METHOD</Text><Text style={styles.value}>MANUAL FLAT BED</Text></View>
              <View style={styles.rowItem}><Text style={styles.label}>INK TYPE</Text><Text style={styles.value}>PLASTISOL INK</Text></View>
              <View style={styles.rowItem}><Text style={styles.label}>INK FINISH</Text><Text style={styles.value}>MATTE</Text></View>
              <View style={styles.rowItem}><Text style={styles.label}>LOCATION</Text><Text style={styles.value}>CHEST / BACK</Text></View>
            </View>

            <Text style={styles.sectionHeading}>4. Print Colors</Text>
            <View style={styles.specCard}>
              <View style={styles.rowItem}>
                <View style={styles.pantoneRow}>
                  <View style={[styles.pantoneColorBox, { backgroundColor: '#ffffff' }]} />
                  <Text style={styles.pantoneName}>WHITE</Text>
                </View>
                <Text style={styles.pantoneHex}>PANTONE WHITE C</Text>
              </View>
              <View style={styles.rowItem}>
                <View style={styles.pantoneRow}>
                  <View style={[styles.pantoneColorBox, { backgroundColor: '#ef4444' }]} />
                  <Text style={styles.pantoneName}>RED</Text>
                </View>
                <Text style={styles.pantoneHex}>PANTONE 185 C</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Notes */}
        <View style={{ marginTop: 10 }}>
          <Text style={styles.sectionHeading}>5. Printing Notes</Text>
          <Text style={styles.notesText}>
            • Discharge under-base white printing is required on black fabric before red color layer to keep red vibrant.
            {'\n'}• Verify curing parameters carefully to prevent dye migration (bleeding of black fabric into white print).
          </Text>
        </View>

        <View style={styles.footer}>
          <Text>Buddy Engineerz Tech Pack System v1.0</Text>
          <Text>Page 3 of 5</Text>
        </View>
      </Page>

      {/* ==================================================== */}
      {/* PAGE 4: TRIMS & LABELS                               */}
      {/* ==================================================== */}
      <Page size="A4" orientation="landscape" style={styles.page}>
        <HeaderTable product={product} dateStr={dateStr} pageNum={4} pageTitle="Trims & Labels Spec" />
        
        <Text style={styles.sectionHeading}>1. Trims & Labels Spec</Text>
        <View style={styles.trimGridRow}>
          {/* Card A: Neck label */}
          <View style={styles.trimCard}>
            <Text style={styles.trimCardTitle}>A. MAIN LABEL (NECK LABEL)</Text>
            <View style={styles.trimImagePlaceholder}>
              <LogoSVG />
            </View>
            <View style={styles.trimSpecs}>
              <View style={styles.trimSpecItem}><Text style={styles.trimSpecLabel}>SIZE</Text><Text style={styles.trimSpecValue}>6x4 CM</Text></View>
              <View style={styles.trimSpecItem}><Text style={styles.trimSpecLabel}>MATERIAL</Text><Text style={styles.trimSpecValue}>WOVEN DAMASK</Text></View>
              <View style={styles.trimSpecItem}><Text style={styles.trimSpecLabel}>COLORS</Text><Text style={styles.trimSpecValue}>BLK/WHT/RED</Text></View>
            </View>
          </View>

          {/* Card B: Care label */}
          <View style={styles.trimCard}>
            <Text style={styles.trimCardTitle}>B. WASH CARE LABEL</Text>
            <View style={[styles.trimImagePlaceholder, { padding: 4 }]}>
              <Text style={{ fontSize: 5, color: '#374151', textAlign: 'center' }}>100% COTTON\nMACHINE WASH COLD\nDO NOT BLEACH\nMADE IN INDIA</Text>
            </View>
            <View style={styles.trimSpecs}>
              <View style={styles.trimSpecItem}><Text style={styles.trimSpecLabel}>SIZE</Text><Text style={styles.trimSpecValue}>3x8 CM</Text></View>
              <View style={styles.trimSpecItem}><Text style={styles.trimSpecLabel}>MATERIAL</Text><Text style={styles.trimSpecValue}>SATIN RIBBON</Text></View>
              <View style={styles.trimSpecItem}><Text style={styles.trimSpecLabel}>COLORS</Text><Text style={styles.trimSpecValue}>WHITE/BLACK</Text></View>
            </View>
          </View>

          {/* Card C: Size Label */}
          <View style={styles.trimCard}>
            <Text style={styles.trimCardTitle}>C. SIZE LABEL (LOOP FOLD)</Text>
            <View style={[styles.trimImagePlaceholder, { backgroundColor: '#111111' }]}>
              <Text style={{ fontSize: 10, color: '#ffffff', fontWeight: 'bold' }}>L</Text>
            </View>
            <View style={styles.trimSpecs}>
              <View style={styles.trimSpecItem}><Text style={styles.trimSpecLabel}>SIZE</Text><Text style={styles.trimSpecValue}>1x4 CM</Text></View>
              <View style={styles.trimSpecItem}><Text style={styles.trimSpecLabel}>MATERIAL</Text><Text style={styles.trimSpecValue}>WOVEN LOOP</Text></View>
              <View style={styles.trimSpecItem}><Text style={styles.trimSpecLabel}>COLORS</Text><Text style={styles.trimSpecValue}>BLACK/WHITE</Text></View>
            </View>
          </View>

          {/* Card D: Hang Tag */}
          <View style={styles.trimCard}>
            <Text style={styles.trimCardTitle}>D. HANG TAG (FRONT/BACK)</Text>
            <View style={styles.trimImagePlaceholder}>
              <Text style={{ fontSize: 7, color: '#111111', fontWeight: 'bold' }}>BUDDY ENGZ</Text>
            </View>
            <View style={styles.trimSpecs}>
              <View style={styles.trimSpecItem}><Text style={styles.trimSpecLabel}>SIZE</Text><Text style={styles.trimSpecValue}>9x14 CM</Text></View>
              <View style={styles.trimSpecItem}><Text style={styles.trimSpecLabel}>MATERIAL</Text><Text style={styles.trimSpecValue}>300GSM ART CARD</Text></View>
              <View style={styles.trimSpecItem}><Text style={styles.trimSpecLabel}>ATTACH</Text><Text style={styles.trimSpecValue}>SAFETY PIN</Text></View>
            </View>
          </View>

          {/* Card E: Polybag */}
          <View style={styles.trimCard}>
            <Text style={styles.trimCardTitle}>E. POLY BAG</Text>
            <View style={styles.trimImagePlaceholder}>
              <Text style={{ fontSize: 8, color: '#9ca3af' }}>[ FROSTED BAG ]</Text>
            </View>
            <View style={styles.trimSpecs}>
              <View style={styles.trimSpecItem}><Text style={styles.trimSpecLabel}>SIZE</Text><Text style={styles.trimSpecValue}>30x40 CM</Text></View>
              <View style={styles.trimSpecItem}><Text style={styles.trimSpecLabel}>MATERIAL</Text><Text style={styles.trimSpecValue}>LDPE SLIDER</Text></View>
              <View style={styles.trimSpecItem}><Text style={styles.trimSpecLabel}>THICKNESS</Text><Text style={styles.trimSpecValue}>50 MICRON</Text></View>
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.col3}>
            <Text style={styles.sectionHeading}>2. Packing Sticker</Text>
            <View style={[styles.specCard, { paddingVertical: 4 }]}>
              <View style={styles.trimSpecItem}><Text style={styles.trimSpecLabel}>SIZE</Text><Text style={styles.trimSpecValue}>6 x 4 CM</Text></View>
              <View style={styles.trimSpecItem}><Text style={styles.trimSpecLabel}>MATERIAL</Text><Text style={styles.trimSpecValue}>GLOSSY PAPER STICKER</Text></View>
            </View>
          </View>

          <View style={styles.col3}>
            <Text style={styles.sectionHeading}>3. Brand Tagline</Text>
            <View style={[styles.specCard, { paddingVertical: 4 }]}>
              <View style={styles.trimSpecItem}><Text style={styles.trimSpecLabel}>TYPE</Text><Text style={styles.trimSpecValue}>HEAT TRANSFER</Text></View>
              <View style={styles.trimSpecItem}><Text style={styles.trimSpecLabel}>LOCATION</Text><Text style={styles.trimSpecValue}>INNER BACK NECK</Text></View>
            </View>
          </View>

          <View style={styles.col3}>
            <Text style={styles.sectionHeading}>4. Care Reference</Text>
            <View style={styles.careIconRow}>
              <View style={styles.careIconItem}>
                <Svg viewBox="0 0 24 24" style={{ width: 10, height: 10 }}><Path d="M2 12h20M4 12c0 4.4 3.6 8 8 8s8-3.6 8-8" stroke="#111" strokeWidth={1.5} fill="none" /></Svg>
                <Text style={styles.careIconText}>30° Wash</Text>
              </View>
              <View style={styles.careIconItem}>
                <Svg viewBox="0 0 24 24" style={{ width: 10, height: 10 }}><Path d="M12 2 L2 20 L22 20 Z" stroke="#111" strokeWidth={1.5} fill="none" /><Line x1="2" y1="20" x2="22" y2="2" stroke="#111" strokeWidth={1.5} /></Svg>
                <Text style={styles.careIconText}>No Bleach</Text>
              </View>
              <View style={styles.careIconItem}>
                <Svg viewBox="0 0 24 24" style={{ width: 10, height: 10 }}><Rect x="4" y="4" width="16" height="16" rx="2" stroke="#111" strokeWidth={1.5} fill="none" /><Circle cx="12" cy="12" r="5" stroke="#111" strokeWidth={1.5} fill="none" /></Svg>
                <Text style={styles.careIconText}>Tumble Low</Text>
              </View>
              <View style={styles.careIconItem}>
                <Svg viewBox="0 0 24 24" style={{ width: 10, height: 10 }}><Path d="M2 18 h16 Q20 18 20 14 Q20 10 14 10 L6 10 L6 18 Z" stroke="#111" strokeWidth={1.5} fill="none" /><Circle cx="10" cy="14" r="1.5" fill="#111" /></Svg>
                <Text style={styles.careIconText}>Iron Low</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Buddy Engineerz Tech Pack System v1.0</Text>
          <Text>Page 4 of 5</Text>
        </View>
      </Page>

      {/* ==================================================== */}
      {/* PAGE 5: MEASUREMENT SIZE CHART & SCHEMATIC           */}
      {/* ==================================================== */}
      <Page size="A4" orientation="landscape" style={styles.page}>
        <HeaderTable product={product} dateStr={dateStr} pageNum={5} pageTitle="Size Spec & Measurements" />

        <View style={styles.row}>
          {/* Graded measurement table */}
          <View style={styles.sizingLeft}>
            <Text style={styles.sectionHeading}>1. Measurement Sheet (All Measurements in Inches)</Text>
            <View style={styles.table}>
              {/* Header */}
              <View style={styles.tableHeaderRow}>
                <Text style={styles.tableCellHeaderLg}>Description Point</Text>
                <Text style={styles.tableCellHeader}>Tol (+/-)</Text>
                <Text style={styles.tableCellHeader}>S</Text>
                <Text style={styles.tableCellHeader}>M</Text>
                <Text style={styles.tableCellHeader}>L</Text>
                <Text style={styles.tableCellHeader}>XL</Text>
                <Text style={styles.tableCellHeader}>XXL</Text>
              </View>
              {/* Data Rows */}
              {standardPoints.map((point, idx) => (
                <View key={idx} style={idx % 2 === 0 ? styles.tableRow : styles.tableRowStriped}>
                  <Text style={styles.tableCellLg}>{point.num}. {point.desc}</Text>
                  <Text style={styles.tableCell}>{point.tol}"</Text>
                  <Text style={styles.tableCell}>{getGradedValue('S', point)}"</Text>
                  <Text style={styles.tableCell}>{getGradedValue('M', point)}"</Text>
                  <Text style={styles.tableCell}>{getGradedValue('L', point)}"</Text>
                  <Text style={styles.tableCell}>{getGradedValue('XL', point)}"</Text>
                  <Text style={styles.tableCell}>{getGradedValue('XXL', point)}"</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Sizing Schematic layout guide */}
          <View style={styles.sizingRight}>
            <Text style={styles.sectionHeading}>2. Sizing Measurement Guide</Text>
            <View style={{ position: 'relative', width: 230, height: 180, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6, backgroundColor: '#fcfcfc', padding: 8 }}>
              {/* T-Shirt Front & Back schematic */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', height: '100%' }}>
                {/* Schematic Front */}
                <View style={{ position: 'relative' }}>
                  {product.template?.category === 'Hoodie' ? <HoodieFrontPDF color="#e5e7eb" /> : <TShirtFrontPDF color="#e5e7eb" />}
                  {/* Schematic arrow markers overlaid */}
                  <Svg style={{ position: 'absolute', width: 140, height: 155, left: 0, top: 0 }}>
                    {/* Neck width arrow (1) */}
                    <Line x1="45" y1="20" x2="95" y2="20" stroke="#f43f5e" strokeWidth={1} />
                    {/* Chest width arrow (7) */}
                    <Line x1="32" y1="65" x2="108" y2="65" stroke="#3b82f6" strokeWidth={1.2} />
                    {/* Front body length arrow (14) */}
                    <Line x1="70" y1="18" x2="70" y2="142" stroke="#10b981" strokeWidth={1.2} />
                    {/* Sleeve length arrow (10) */}
                    <Line x1="106" y1="25" x2="132" y2="48" stroke="#f59e0b" strokeWidth={1} />
                  </Svg>
                  {/* Numbers absolute positioned */}
                  <Text style={{ position: 'absolute', top: 10, left: 68, fontSize: 6, fontWeight: 'bold', color: '#f43f5e' }}>[1]</Text>
                  <Text style={{ position: 'absolute', top: 56, left: 68, fontSize: 6, fontWeight: 'bold', color: '#3b82f6' }}>[7]</Text>
                  <Text style={{ position: 'absolute', top: 80, left: 74, fontSize: 6, fontWeight: 'bold', color: '#10b981' }}>[14]</Text>
                  <Text style={{ position: 'absolute', top: 20, left: 120, fontSize: 6, fontWeight: 'bold', color: '#f59e0b' }}>[10]</Text>
                </View>

                {/* Schematic Back */}
                <View style={{ position: 'relative' }}>
                  {product.template?.category === 'Hoodie' ? <HoodieBackPDF color="#e5e7eb" /> : <TShirtBackPDF color="#e5e7eb" />}
                  {/* Schematic arrow markers overlaid */}
                  <Svg style={{ position: 'absolute', width: 140, height: 155, left: 0, top: 0 }}>
                    {/* Shoulder width seam to seam (5) */}
                    <Line x1="32" y1="22" x2="108" y2="22" stroke="#8b5cf6" strokeWidth={1} />
                    {/* Moon patch (15) */}
                    <Line x1="49" y1="26" x2="91" y2="26" stroke="#06b6d4" strokeWidth={1} />
                  </Svg>
                  <Text style={{ position: 'absolute', top: 10, left: 68, fontSize: 6, fontWeight: 'bold', color: '#8b5cf6' }}>[5]</Text>
                  <Text style={{ position: 'absolute', top: 28, left: 68, fontSize: 6, fontWeight: 'bold', color: '#06b6d4' }}>[15]</Text>
                </View>
              </View>
            </View>
            <Text style={{ fontSize: 6, color: '#6b7280', marginTop: 4 }}>*Drawings show location of core grading control dimensions 1-19.</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Buddy Engineerz Tech Pack System v1.0</Text>
          <Text>Page 5 of 5</Text>
        </View>
      </Page>
    </Document>
  );
}

// Decimal helper to round fractions to eighths or halves matching standard dressmaker sheets
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
