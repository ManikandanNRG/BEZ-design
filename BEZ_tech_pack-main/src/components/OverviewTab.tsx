import React from 'react';
import { TechPackData } from '../types';

interface OverviewTabProps {
  data: TechPackData;
  updateData: (data: Partial<TechPackData>) => void;
}

export default function OverviewTab({ data, updateData }: OverviewTabProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    updateData({ [e.target.name]: e.target.value });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-medium text-gray-900">General Information</h2>
        <p className="text-sm text-gray-500 mb-4">These details will populate the standard header on every page.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Brand Name</label>
          <input type="text" name="brand" value={data.brand || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm uppercase" placeholder="BUDDY ENGINEERZ" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <input type="text" name="category" value={data.category || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm uppercase" placeholder="MENSWEAR" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Date</label>
          <input type="text" name="date" value={data.date || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm uppercase" placeholder="25/05/2025" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Style No.</label>
          <input type="text" name="styleNo" value={data.styleNo || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm uppercase" placeholder="BEZ-TS-001" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Size Range</label>
          <input type="text" name="sizeRange" value={data.sizeRange || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm uppercase" placeholder="S - M - L - XL - XXL" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Version</label>
          <input type="text" name="version" value={data.version || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm uppercase" placeholder="1.0" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Style Name</label>
          <input type="text" name="styleName" value={data.styleName || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm uppercase" placeholder="BE CORE TEE" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Fit</label>
          <input type="text" name="fit" value={data.fit || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm uppercase" placeholder="REGULAR FIT" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Designer</label>
          <input type="text" name="designer" value={data.designer || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm uppercase" placeholder="BUDDY ENGINEERZ" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <input type="text" name="description" value={data.description || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm uppercase" placeholder="ROUND NECK T-SHIRT" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Fabric</label>
          <input type="text" name="fabric" value={data.fabric || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm uppercase" placeholder="100% COTTON" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Approved By</label>
          <input type="text" name="approvedBy" value={data.approvedBy || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm uppercase" placeholder="" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Season</label>
          <input type="text" name="season" value={data.season || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm uppercase" placeholder="ALL SEASON" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Fabric Weight</label>
          <input type="text" name="fabricWeight" value={data.fabricWeight || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm uppercase" placeholder="180 GSM" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Made In</label>
          <input type="text" name="madeIn" value={data.madeIn || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm uppercase" placeholder="INDIA" />
        </div>

      </div>
    </div>
  );
}
