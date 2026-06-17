import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { TechPackData, BOMItem } from '../types';

interface BomTabProps {
  data: TechPackData;
  updateData: (data: Partial<TechPackData>) => void;
}

export default function BomTab({ data, updateData }: BomTabProps) {
  const addBOMItem = () => {
    const newItem: BOMItem = {
      id: crypto.randomUUID(),
      item: '',
      placement: '',
      description: '',
      supplier: '',
      color: '',
      qty: ''
    };
    updateData({ bom: [...data.bom, newItem] });
  };

  const updateItem = (id: string, field: keyof BOMItem, value: string) => {
    const updated = data.bom.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    );
    updateData({ bom: updated });
  };

  const removeItem = (id: string) => {
    updateData({ bom: data.bom.filter(item => item.id !== id) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Bill of Materials (Optional)</h2>
          <p className="text-sm text-gray-500">List fabrics, trims, thread, and hardware if needed.</p>
        </div>
        <button
          onClick={addBOMItem}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 focus:outline-none"
        >
          <Plus size={16} />
          Add Item
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Item (e.g. Fabric, Trim)</th>
              <th className="px-3 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Placement</th>
              <th className="px-3 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Description</th>
              <th className="px-3 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Supplier</th>
              <th className="px-3 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Color</th>
              <th className="px-3 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">Qty/Garment</th>
              <th className="px-3 py-3 text-right text-xs font-bold text-gray-900 uppercase tracking-wider">Act</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.bom.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">
                  No materials added yet. Click "Add Item" to start your BOM.
                </td>
              </tr>
            ) : (
              data.bom.map((item) => (
                <tr key={item.id} className="group hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={item.item}
                      onChange={(e) => updateItem(item.id, 'item', e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-transparent focus:border-black focus:ring-0 sm:text-sm"
                      placeholder="Shell Fabric"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={item.placement}
                      onChange={(e) => updateItem(item.id, 'placement', e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-transparent focus:border-black focus:ring-0 sm:text-sm"
                      placeholder="Self"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-transparent focus:border-black focus:ring-0 sm:text-sm"
                      placeholder="100% Cotton Twill, 200gsm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={item.supplier}
                      onChange={(e) => updateItem(item.id, 'supplier', e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-transparent focus:border-black focus:ring-0 sm:text-sm font-mono text-xs"
                      placeholder="Ref #1234"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={item.color}
                      onChange={(e) => updateItem(item.id, 'color', e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-transparent focus:border-black focus:ring-0 sm:text-sm"
                      placeholder="Navy"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={item.qty}
                      onChange={(e) => updateItem(item.id, 'qty', e.target.value)}
                      className="w-full bg-transparent border-0 border-b border-transparent focus:border-black focus:ring-0 sm:text-sm"
                      placeholder="1.5 yds"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      title="Remove Item"
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
    </div>
  );
}
