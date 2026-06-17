'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Layers, FileDown, Eye, Edit, Plus, ArrowLeft } from 'lucide-react';

export default function Dashboard() {
  const [techPacks, setTechPacks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTechPacks() {
      try {
        const res = await fetch('/api/techpacks');
        if (res.ok) {
          const data = await res.json();
          setTechPacks(data);
        }
      } catch (error) {
        console.error('Error fetching tech packs:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTechPacks();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-2 transition-colors">
              <ArrowLeft size={16} className="mr-1" /> Back to Generator
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Tech Packs Dashboard</h1>
            <p className="text-gray-500 mt-1">Manage and edit your saved tech packs</p>
          </div>
          <Link href="/" className="inline-flex items-center justify-center gap-2 bg-black hover:bg-gray-800 text-white font-medium px-5 py-2.5 rounded-lg transition-colors shadow-sm">
            <Plus size={18} /> New Tech Pack
          </Link>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : techPacks.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Layers size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No tech packs yet</h3>
            <p className="text-gray-500 mb-6">Create your first tech pack using the generator.</p>
            <Link href="/" className="inline-flex items-center justify-center gap-2 bg-black text-white font-medium px-5 py-2.5 rounded-lg hover:bg-gray-800 transition-colors">
              Go to Generator
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {techPacks.map((tp) => {
              // Try to parse the JSON to get the style name/number if available
              let parsedData: any = {};
              try {
                if (tp.jsonData) parsedData = JSON.parse(tp.jsonData);
              } catch (e) {
                console.error('Failed to parse json data for', tp.id);
              }

              const styleNo = tp.product?.styleNo || parsedData?.styleNumber || 'Unknown Style';
              const styleName = tp.product?.styleName || parsedData?.styleName || 'Untitled Tech Pack';
              const date = new Date(tp.createdAt).toLocaleDateString();

              return (
                <div key={tp.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group flex flex-col">
                  <div className="p-5 flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-600 rounded-md">v{tp.version}</span>
                      <span className="text-xs text-gray-400">{date}</span>
                    </div>
                    <h3 className="font-bold text-lg text-gray-900 truncate mb-1" title={styleName}>{styleName}</h3>
                    <p className="text-sm text-gray-500 font-mono mb-4">{styleNo}</p>
                    
                    <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
                      <p className="truncate"><strong>Product ID:</strong> {tp.productId || 'Unlinked'}</p>
                      <p className="truncate mt-1"><strong>Created By:</strong> {tp.createdBy || 'Unknown'}</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                    <Link href={`/?id=${tp.id}`} className="text-sm font-medium text-black hover:text-gray-600 flex items-center gap-1.5 transition-colors">
                      <Edit size={16} /> Edit
                    </Link>
                    <div className="flex gap-2">
                      {tp.pdfUrl && (
                        <a href={tp.pdfUrl} target="_blank" rel="noreferrer" className="p-2 text-gray-400 hover:text-black bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors" title="View PDF">
                          <Eye size={16} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
