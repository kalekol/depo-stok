import React, { useState } from 'react';
import { Product } from '../types';
import { exportProductSummaryCSV, exportPackageDetailCSV } from '../lib/storage';
import { calculateCompleteSet } from '../lib/setCalculator';
import {
  X,
  Download,
  FileSpreadsheet,
  Package,
  Boxes,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  products,
}) => {
  const [activeTab, setActiveTab] = useState<'PRODUCT_SUMMARY' | 'PACKAGE_DETAIL'>('PRODUCT_SUMMARY');

  if (!isOpen) return null;

  const handleDownload = () => {
    let csvContent = '';
    let filename = '';
    const dateStr = new Date().toISOString().slice(0, 10);

    if (activeTab === 'PRODUCT_SUMMARY') {
      csvContent = exportProductSummaryCSV(products);
      filename = `Mobilya_Urun_Stok_Ozeti_${dateStr}.csv`;
    } else {
      csvContent = exportPackageDetailCSV(products);
      filename = `Mobilya_Koli_Stok_Detayi_${dateStr}.csv`;
    }

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500 rounded-xl text-gray-950 shadow-sm">
              <FileSpreadsheet className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-black">Stok Raporları & Excel (CSV) İndir</h3>
              <p className="text-xs text-gray-400">
                İndirmeden önce tabloları inceleyebilir ve istediğiniz formatta indirebilirsiniz
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection Bar */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 bg-gray-200/80 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('PRODUCT_SUMMARY')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'PRODUCT_SUMMARY'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Package className="w-4 h-4 text-amber-600" />
              <span>Sadece Ürün Bazlı (Özet)</span>
            </button>
            <button
              onClick={() => setActiveTab('PACKAGE_DETAIL')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'PACKAGE_DETAIL'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Boxes className="w-4 h-4 text-emerald-600" />
              <span>Koli Koli Detaylı Listele</span>
            </button>
          </div>

          <button
            onClick={handleDownload}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>
              {activeTab === 'PRODUCT_SUMMARY'
                ? 'Ürün Raporunu İndir (.CSV)'
                : 'Koli Detay Raporunu İndir (.CSV)'}
            </span>
          </button>
        </div>

        {/* Live Preview Table */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'PRODUCT_SUMMARY' ? (
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                📦 Ürün Bazlı Takım Özet Tablosu ({products.length} Mobilya)
              </div>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100/80 border-b border-gray-200 text-gray-600">
                      <th className="py-3 px-4 font-bold">Ürün Adı</th>
                      <th className="py-3 px-4 font-bold">Kategori</th>
                      <th className="py-3 px-4 font-bold">Koli Yapısı</th>
                      <th className="py-3 px-4 font-bold text-center">Hazır Tam Takım</th>
                      <th className="py-3 px-4 font-bold text-center">Toplam Fiziksel Koli</th>
                      <th className="py-3 px-4 font-bold text-right">Durum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products.map((prod) => {
                      const setStatus = calculateCompleteSet(prod);
                      const totalPhysical = prod.packages.reduce((acc, p) => acc + p.quantity, 0);
                      const isReady = setStatus.completeSets > 0 && setStatus.missingPackagesToReachMax.length === 0;

                      return (
                        <tr key={prod.id} className="hover:bg-gray-50/60 transition">
                          <td className="py-2.5 px-4 font-bold text-gray-900">{prod.name}</td>
                          <td className="py-2.5 px-4 text-gray-600">
                            <span className="px-2 py-0.5 bg-gray-100 rounded text-[11px] font-semibold">
                              {prod.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-gray-600">{prod.packages.length} Koli</td>
                          <td className="py-2.5 px-4 text-center font-black text-sm text-gray-900">
                            {setStatus.completeSets}
                          </td>
                          <td className="py-2.5 px-4 text-center font-bold text-gray-700">
                            {totalPhysical}
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            {isReady ? (
                              <span className="inline-flex items-center space-x-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Hazır</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                <span>Eksik Kolili</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                📑 Koli Koli Detaylı Liste ({products.reduce((acc, p) => acc + p.packages.length, 0)} Koli)
              </div>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100/80 border-b border-gray-200 text-gray-600">
                      <th className="py-3 px-4 font-bold">Ürün Adı</th>
                      <th className="py-3 px-4 font-bold">Kategori</th>
                      <th className="py-3 px-4 font-bold">Koli Sırası</th>
                      <th className="py-3 px-4 font-bold">Koli Adı</th>
                      <th className="py-3 px-4 font-bold font-mono">Barkod</th>
                      <th className="py-3 px-4 font-bold text-center">Stok Adedi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products.map((prod) =>
                      prod.packages.map((pkg) => (
                        <tr
                          key={`${prod.id}-${pkg.koliId}`}
                          className="hover:bg-gray-50/60 transition"
                        >
                          <td className="py-2.5 px-4 font-bold text-gray-900">{prod.name}</td>
                          <td className="py-2.5 px-4 text-gray-600">
                            <span className="px-2 py-0.5 bg-gray-100 rounded text-[11px] font-semibold">
                              {prod.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-bold text-gray-700">
                            {pkg.koliIndex}/{prod.packages.length}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-gray-800">{pkg.name}</td>
                          <td className="py-2.5 px-4 font-mono text-gray-500">{pkg.barcode}</td>
                          <td className="py-2.5 px-4 text-center font-black text-gray-900 text-sm">
                            {pkg.quantity}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            ℹ️ İndirilen Excel / CSV dosyasını Microsoft Excel veya Google E-Tablolar ile doğrudan açabilirsiniz.
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs rounded-xl transition"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
