import React, { useRef } from 'react';
import { Plus, Trash2, List, Ruler, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { TechPackData, MeasurementItem } from '@/types/techpack';

interface MeasurementsTabProps {
  data: TechPackData;
  updateData: (data: Partial<TechPackData>) => void;
}

const parseMeasurement = (val: string): number | null => {
  if (!val) return null;
  val = val.trim();
  const parts = val.split(' ');
  if (parts.length === 2) {
    const whole = parseFloat(parts[0]);
    const frac = parts[1].split('/');
    if (frac.length === 2 && !isNaN(whole)) {
      return whole + (parseFloat(frac[0]) / parseFloat(frac[1]));
    }
  } else if (parts.length === 1) {
    if (val.includes('/')) {
      const frac = val.split('/');
      if (frac.length === 2) {
        return parseFloat(frac[0]) / parseFloat(frac[1]);
      }
    } else {
      const num = parseFloat(val);
      return isNaN(num) ? null : num;
    }
  }
  return null;
};

const formatMeasurement = (val: number): string => {
  if (val === 0) return '0';
  const isNegative = val < 0;
  const absVal = Math.abs(val);
  const whole = Math.floor(absVal);
  const frac = absVal - whole;
  
  let fracStr = '';
  const EPSILON = 0.001;
  if (Math.abs(frac - 0.125) < EPSILON) fracStr = '1/8';
  else if (Math.abs(frac - 0.25) < EPSILON) fracStr = '1/4';
  else if (Math.abs(frac - 0.375) < EPSILON) fracStr = '3/8';
  else if (Math.abs(frac - 0.5) < EPSILON) fracStr = '1/2';
  else if (Math.abs(frac - 0.625) < EPSILON) fracStr = '5/8';
  else if (Math.abs(frac - 0.75) < EPSILON) fracStr = '3/4';
  else if (Math.abs(frac - 0.875) < EPSILON) fracStr = '7/8';
  else if (frac > EPSILON) fracStr = frac.toFixed(3).replace(/\.?0+$/, ''); 

  const prefix = isNegative ? '-' : '';
  if (whole === 0) return prefix + (fracStr || '0');
  if (!fracStr) return prefix + whole.toString();
  return `${prefix}${whole} ${fracStr}`;
};

const defaultMeasurements: Omit<MeasurementItem, 'id'>[] = [
  { srNo: '1', description: 'Neck width from seam to seam', tol: '1/8', grade: '1/4', s: '7 1/2', m: '7 3/4', l: '8', xl: '8 1/4', xxl: '8 1/2' },
  { srNo: '2', description: 'Front neck drop from HPS to neck seam', tol: '1/8', grade: '1/8', s: '4 3/8', m: '4 1/2', l: '4 5/8', xl: '4 3/4', xxl: '4 7/8' },
  { srNo: '3', description: 'Back neck drop from HPS to neck seam', tol: '0', grade: '0', s: '1 1/4', m: '1 1/4', l: '1 1/4', xl: '1 1/4', xxl: '1 1/4' },
  { srNo: '4', description: 'Neck rib height', tol: '0', grade: '0', s: '1/2', m: '1/2', l: '1/2', xl: '1/2', xxl: '1/2' },
  { srNo: '5', description: 'Shoulder width seam to seam', tol: '1/4', grade: '1', s: '20 1/2', m: '21 1/2', l: '22 1/2', xl: '23 1/2', xxl: '24 1/2' },
];

export default function MeasurementsTab({ data, updateData }: MeasurementsTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addMeasurement = () => {
    const nextSrNo = (data.measurements.length + 1).toString();
    const newItem: MeasurementItem = {
      id: crypto.randomUUID(),
      srNo: nextSrNo,
      description: '',
      tol: '',
      grade: '',
      s: '',
      m: '',
      l: '',
      xl: '',
      xxl: ''
    };
    updateData({ measurements: [...data.measurements, newItem] });
  };

  const loadDefaults = () => {
    if (data.measurements.length > 0) {
      if (!window.confirm("This will overwrite your existing measurements with sample data. Continue?")) return;
    }
    const hydrated = defaultMeasurements.map(item => ({ ...item, id: crypto.randomUUID() }));
    updateData({ measurements: hydrated });
  };

  const updateItem = (id: string, field: keyof MeasurementItem, value: string) => {
    const updated = data.measurements.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // Auto-calculate grades if S or Grade is modified
        if (field === 's' || field === 'grade') {
          const sVal = parseMeasurement(updatedItem.s);
          const gradeVal = parseMeasurement(updatedItem.grade || '0');
          if (sVal !== null && gradeVal !== null && updatedItem.s.trim() !== '') {
            updatedItem.m = formatMeasurement(sVal + gradeVal);
            updatedItem.l = formatMeasurement(sVal + gradeVal * 2);
            updatedItem.xl = formatMeasurement(sVal + gradeVal * 3);
            updatedItem.xxl = formatMeasurement(sVal + gradeVal * 4);
          }
        }
        return updatedItem;
      }
      return item;
    });
    updateData({ measurements: updated });
  };

  const removeItem = (id: string) => {
    updateData({ measurements: data.measurements.filter(item => item.id !== id) });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        
        // Skip header, map rows
        const newMeasurements: MeasurementItem[] = [];
        // Detect header row to map safely, or just assume format like:
        // [SR.NO, DESCRIPTION, TOL, GRADE, S, M, L, XL, XXL]
        
        let started = false;
        for (const row of rows) {
          if (!row || row.length === 0) continue;
          
          const firstCell = String(row[0] || '').toLowerCase();
          if (firstCell.includes('sr') || firstCell.includes('no')) {
            started = true;
            continue; // skip header
          }
          
          if (started || (!isNaN(parseInt(row[0])))) {
            // try to parse
            const srNo = String(row[0] || '');
            const description = String(row[1] || '');
            const tol = String(row[2] || '');
            const grade = String(row[3] || '');
            const s = String(row[4] || '');
            const m = String(row[5] || '');
            const l = String(row[6] || '');
            const xl = String(row[7] || '');
            const xxl = String(row[8] || '');
            
            if (srNo || description) {
              newMeasurements.push({
                id: crypto.randomUUID(),
                srNo, description, tol, grade, s, m, l, xl, xxl
              });
            }
          }
        }
        
        if (newMeasurements.length > 0) {
          if (data.measurements.length > 0) {
            if (!window.confirm(`Found ${newMeasurements.length} measurements. Overwrite existing?`)) return;
          }
          updateData({ measurements: newMeasurements });
        } else {
           alert("No valid measurements found. Ensure columns match: SR.NO, DESCRIPTION, TOL, GRADE, S, M, L, XL, XXL");
        }
      } catch (err) {
        console.error(err);
        alert("Error parsing file. Please upload a valid Excel or CSV file.");
      }
      
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Measurement Sheet</h2>
          <p className="text-sm text-gray-500">Add grading details manually or upload an Excel sheet. Enter S and Grade to auto-calculate.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors focus:outline-none shadow-sm"
          >
            <Upload size={16} />
            Import Excel
          </button>
          <button
            onClick={loadDefaults}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors focus:outline-none"
            title="Load sample t-shirt measurements to see how it works"
          >
            <List size={16} />
            Sample Data
          </button>
          <button
            onClick={addMeasurement}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 transition-colors focus:outline-none"
          >
            <Plus size={16} />
            Add POM
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider w-16">SR.NO</th>
              <th className="px-3 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider w-1/3">DESCRIPTION</th>
              <th className="px-3 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider w-16">TOL (+/-)</th>
              <th className="px-3 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider w-16 text-blue-600" title="Grade Difference: auto-calculates sizes when added">Grade</th>
              <th className="px-3 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">S</th>
              <th className="px-3 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">M</th>
              <th className="px-3 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider font-bold">L</th>
              <th className="px-3 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">XL</th>
              <th className="px-3 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">XXL</th>
              <th className="px-3 py-3 text-right text-xs font-bold text-gray-900 uppercase tracking-wider">Act</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 font-mono text-sm shadow-sm">
            {data.measurements.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-6 py-12 text-center text-sm font-sans text-gray-500">
                  <div className="flex flex-col items-center justify-center">
                    <Ruler className="mb-2 text-gray-300" size={32} />
                    <p>No measurements added yet.</p>
                    <button onClick={loadDefaults} className="mt-2 text-blue-600 hover:underline">Click here to load standard template POMs</button>
                    <p className="text-xs text-gray-400 mt-1">or click "Add POM" to start from scratch.</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.measurements.map((item) => (
                <tr key={item.id} className="group hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={item.srNo}
                      onChange={(e) => updateItem(item.id, 'srNo', e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-transparent focus:border-black focus:ring-0 text-sm font-medium"
                      placeholder="1"
                    />
                  </td>
                  <td className="px-3 py-2 font-sans">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-transparent focus:border-black focus:ring-0 text-sm"
                      placeholder="Measurement Description"
                    />
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    <input
                      type="text"
                      value={item.tol}
                      onChange={(e) => updateItem(item.id, 'tol', e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-transparent focus:border-black focus:ring-0 text-xs text-center"
                      placeholder="1/8"
                    />
                  </td>
                  <td className="px-3 py-2 text-blue-600 bg-blue-50/30">
                    <input
                      type="text"
                      value={item.grade || ''}
                      onChange={(e) => updateItem(item.id, 'grade', e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-transparent focus:border-blue-500 focus:ring-0 text-xs text-center font-bold"
                      placeholder="+"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={item.s}
                      onChange={(e) => updateItem(item.id, 's', e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-transparent focus:border-black focus:ring-0 text-sm text-center font-bold hover:bg-gray-100"
                      placeholder="-"
                    />
                  </td>
                  <td className="px-3 py-2 bg-gray-50/50">
                    <input
                      type="text"
                      value={item.m}
                      onChange={(e) => updateItem(item.id, 'm', e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-transparent focus:border-black focus:ring-0 text-sm text-center"
                      placeholder="-"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={item.l}
                      onChange={(e) => updateItem(item.id, 'l', e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-transparent focus:border-black focus:ring-0 text-sm text-center"
                      placeholder="-"
                    />
                  </td>
                  <td className="px-3 py-2 bg-gray-50/50">
                    <input
                      type="text"
                      value={item.xl}
                      onChange={(e) => updateItem(item.id, 'xl', e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-transparent focus:border-black focus:ring-0 text-sm text-center"
                      placeholder="-"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={item.xxl}
                      onChange={(e) => updateItem(item.id, 'xxl', e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-transparent focus:border-black focus:ring-0 text-sm text-center"
                      placeholder="-"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      title="Remove POM"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-1 gap-8 mt-8">
        <div>
          <h3 className="text-sm font-bold uppercase mb-2">Notes</h3>
          <textarea
            value={data.measurementNotes || ''}
            onChange={(e) => updateData({ measurementNotes: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black text-sm"
            placeholder="1. All measurements are in inches.&#10;2. Tolerance (+/-) as per size chart.&#10;3. Measurements are taken on flat garment."
            rows={6}
          />
        </div>
      </div>
      
      <div className="text-xs text-gray-500 bg-gray-100 p-4 rounded-md mt-4">
        <strong>PRO TIP:</strong> Add a <strong>Grade</strong> fraction (e.g. 1/4) and type the <strong>S</strong> size to instantly calculate all other sizes! Check sample data to test it out.
      </div>
    </div>
  );
}
