import React, { useState, useEffect } from 'react';
import { TechPackData } from '../types';
import { Calculator, DollarSign, PieChart, TrendingUp, IndianRupee } from 'lucide-react';

interface Props {
  data: TechPackData;
  updateData: (data: Partial<TechPackData>) => void;
}

export default function CostingTab({ data, updateData }: Props) {
  const costing = data.costing || {
    fabricCostPerUnit: 0,
    trimCostPerUnit: 0,
    printCostPerUnit: 0,
    cutMakeTrimCost: 0,
    packagingCost: 0,
    shippingCost: 0,
    markupPercentage: 50,
    currency: '$'
  };

  const currencySymbol = costing.currency || '$';

  const updateCost = (field: keyof typeof costing, value: string) => {
    if (field === 'currency') {
      updateData({ costing: { ...costing, [field]: value } });
    } else {
      const numValue = parseFloat(value) || 0;
      updateData({ costing: { ...costing, [field]: numValue } });
    }
  };

  // Calculations
  const calcTotalCOGS = () => {
    return (
      costing.fabricCostPerUnit +
      costing.trimCostPerUnit +
      costing.printCostPerUnit +
      costing.cutMakeTrimCost +
      costing.packagingCost +
      costing.shippingCost
    );
  };

  const calcWholesalePrice = () => {
    const cogs = calcTotalCOGS();
    const markupFactor = (100 + costing.markupPercentage) / 100;
    return cogs * markupFactor;
  };

  const calcRetailPrice = () => {
    const wholesale = calcWholesalePrice();
    // Standard retail rule of thumb is usually 2x to 2.5x wholesale
    return wholesale * 2; 
  };

  const calcProfitMargin = () => {
    const cogs = calcTotalCOGS();
    const wholesale = calcWholesalePrice();
    if (wholesale === 0) return 0;
    return ((wholesale - cogs) / wholesale) * 100;
  };

  const cogs = calcTotalCOGS();
  const wholesale = calcWholesalePrice();
  const retail = calcRetailPrice();
  const margin = calcProfitMargin();

  return (
    <div className="flex flex-col h-full bg-white rounded-lg">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Calculator className="text-gray-400" /> Costing & Pricing Estimator</h2>
          <p className="text-gray-500">Calculate estimated manufacturing costs and retail pricing.</p>
        </div>
        
        <div className="flex flex-col items-end">
          <label className="text-xs font-bold text-gray-500 uppercase mb-1">Currency</label>
          <select 
            value={currencySymbol}
            onChange={(e) => updateCost('currency', e.target.value)}
            className="border border-gray-300 rounded px-3 py-1 focus:outline-none focus:border-black font-medium"
          >
            <option value="$">$ (USD)</option>
            <option value="₹">₹ (INR)</option>
            <option value="€">€ (EUR)</option>
            <option value="£">£ (GBP)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Cost Inputs Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h3 className="text-lg font-bold mb-4 uppercase tracking-tight flex items-center gap-2">
               Unit Costs (COGS)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Fabric Cost / Unit</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{currencySymbol}</span>
                  <input 
                    type="number" step="0.01" min="0"
                    value={costing.fabricCostPerUnit || ''}
                    onChange={(e) => updateCost('fabricCostPerUnit', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded focus:border-black focus:ring-1 focus:ring-black"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Trims & Hardware</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{currencySymbol}</span>
                  <input 
                    type="number" step="0.01" min="0"
                    value={costing.trimCostPerUnit || ''}
                    onChange={(e) => updateCost('trimCostPerUnit', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded focus:border-black focus:ring-1 focus:ring-black"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Print / Embroidery / Wash</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{currencySymbol}</span>
                  <input 
                    type="number" step="0.01" min="0"
                    value={costing.printCostPerUnit || ''}
                    onChange={(e) => updateCost('printCostPerUnit', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded focus:border-black focus:ring-1 focus:ring-black"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Cut, Make, Trim (CMT)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{currencySymbol}</span>
                  <input 
                    type="number" step="0.01" min="0"
                    value={costing.cutMakeTrimCost || ''}
                    onChange={(e) => updateCost('cutMakeTrimCost', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded focus:border-black focus:ring-1 focus:ring-black"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Packaging (Polybag, Tags)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{currencySymbol}</span>
                  <input 
                    type="number" step="0.01" min="0"
                    value={costing.packagingCost || ''}
                    onChange={(e) => updateCost('packagingCost', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded focus:border-black focus:ring-1 focus:ring-black"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Inbound Shipping / Freight</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{currencySymbol}</span>
                  <input 
                    type="number" step="0.01" min="0"
                    value={costing.shippingCost || ''}
                    onChange={(e) => updateCost('shippingCost', e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded focus:border-black focus:ring-1 focus:ring-black"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
             <h3 className="text-lg font-bold mb-4 uppercase tracking-tight">Pricing Strategy</h3>
             <div className="max-w-md">
                <label className="block text-sm font-bold text-gray-700 mb-2">Target Markup Percentage (%)</label>
                <input 
                  type="range" min="0" max="200" step="5"
                  value={costing.markupPercentage || 0}
                  onChange={(e) => updateCost('markupPercentage', e.target.value)}
                  className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer mb-2"
                />
                <div className="flex justify-between text-xs text-gray-500 font-mono">
                  <span>0%</span>
                  <span className="font-bold text-black text-lg">{costing.markupPercentage}% Markup</span>
                  <span>200%</span>
                </div>
             </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-1">
          <div className="bg-black text-white p-6 rounded-xl shadow-lg sticky top-6">
             <h3 className="text-lg font-bold opacity-80 uppercase tracking-widest mb-6 border-b border-white/20 pb-4">Financial Summary</h3>
             
             <div className="space-y-6">
               <div>
                 <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">Total COGS / Unit</p>
                 <p className="text-3xl font-light font-mono">{currencySymbol}{cogs.toFixed(2)}</p>
               </div>

               <div className="pt-4 border-t border-white/10">
                 <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                   Estimated Wholesale 
                   <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-white">{margin.toFixed(0)}% Margin</span>
                 </p>
                 <p className="text-4xl font-bold font-mono text-green-400">{currencySymbol}{wholesale.toFixed(2)}</p>
               </div>

               <div className="pt-4 border-t border-white/10">
                 <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                   Suggested Retail Price 
                   <span className="text-xs text-gray-500">(2x Wholesale)</span>
                 </p>
                 <p className="text-3xl font-medium font-mono">{currencySymbol}{retail.toFixed(2)}</p>
               </div>
             </div>

             <div className="mt-8 pt-6 border-t border-white/20">
               <div className="flex items-center gap-3 text-sm text-gray-400">
                 <TrendingUp size={16} />
                 <p>Profit per unit sold at wholesale: <strong className="text-white font-mono">{currencySymbol}{(wholesale - cogs).toFixed(2)}</strong></p>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
