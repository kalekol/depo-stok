import React, { useEffect, useRef, useState } from 'react';
import { Product, PackageItem } from '../types';
import JsBarcode from 'jsbarcode';
import { X, Printer, Tag, Layers, CheckCircle2 } from 'lucide-react';

interface BarcodePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  selectedProduct?: Product | null;
  selectedPackage?: PackageItem | null;
}

export const BarcodePrintModal: React.FC<BarcodePrintModalProps> = ({
  isOpen,
  onClose,
  products,
  selectedProduct,
  selectedPackage,
}) => {
  const [targetProductId, setTargetProductId] = useState<string>('');
  const [targetPackageId, setTargetPackageId] = useState<string>('ALL'); // 'ALL' = print all boxes for this product
  const [printCopies, setPrintCopies] = useState<number>(1);
  const [labelSize, setLabelSize] = useState<'THERMAL_100x60' | 'A4_GRID'>('THERMAL_100x60');
  const printContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedProduct) {
      setTargetProductId(selectedProduct.id);
      if (selectedPackage) {
        setTargetPackageId(selectedPackage.koliId);
      } else {
        setTargetPackageId('ALL');
      }
    } else if (products.length > 0 && !targetProductId) {
      setTargetProductId(products[0].id);
    }
  }, [selectedProduct, selectedPackage, products]);

  const activeProduct = products.find((p) => p.id === targetProductId);

  // Determine which packages to print
  const packagesToPrint: { product: Product; pkg: PackageItem }[] = [];
  if (activeProduct) {
    if (targetPackageId === 'ALL') {
      for (const pkg of activeProduct.packages) {
        for (let i = 0; i < printCopies; i++) {
          packagesToPrint.push({ product: activeProduct, pkg });
        }
      }
    } else {
      const singlePkg = activeProduct.packages.find((p) => p.koliId === targetPackageId);
      if (singlePkg) {
        for (let i = 0; i < printCopies; i++) {
          packagesToPrint.push({ product: activeProduct, pkg: singlePkg });
        }
      }
    }
  }

  // Render JsBarcode SVG after DOM update
  useEffect(() => {
    if (!isOpen || packagesToPrint.length === 0) return;

    packagesToPrint.forEach((_, idx) => {
      const svgElem = document.getElementById(`barcode-svg-${idx}`);
      const pkgObj = packagesToPrint[idx]?.pkg;
      if (svgElem && pkgObj) {
        try {
          JsBarcode(svgElem, pkgObj.barcode, {
            format: 'CODE128',
            width: labelSize === 'THERMAL_100x60' ? 2 : 1.6,
            height: labelSize === 'THERMAL_100x60' ? 52 : 40,
            displayValue: true,
            fontSize: 13,
            margin: 4,
            background: '#ffffff',
            lineColor: '#111827',
          });
        } catch (e) {
          console.warn('JsBarcode render error for:', pkgObj.barcode, e);
        }
      }
    });
  }, [isOpen, targetProductId, targetPackageId, printCopies, labelSize]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-900 text-white border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Koli Barkod Etiketi Yazdır & Oluştur</h3>
              <p className="text-xs text-gray-400">
                Kolilere yapıştırılacak CODE128 barkodlarını yazıcıdan çıkarın
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Controls - Hidden during print */}
        <div className="p-6 bg-gray-50 border-b border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4 print:hidden">
          {/* Select Product */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Ürün Seçimi
            </label>
            <select
              value={targetProductId}
              onChange={(e) => {
                setTargetProductId(e.target.value);
                setTargetPackageId('ALL');
              }}
              className="w-full text-sm rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.packages.length} Koli)
                </option>
              ))}
            </select>
          </div>

          {/* Select Box / Koli */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Yazdırılacak Koli
            </label>
            <select
              value={targetPackageId}
              onChange={(e) => setTargetPackageId(e.target.value)}
              className="w-full text-sm rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="ALL">
                Tüm Koliler ({activeProduct?.packages.length || 0} adet)
              </option>
              {activeProduct?.packages.map((pkg) => (
                <option key={pkg.koliId} value={pkg.koliId}>
                  {pkg.koliIndex}/{activeProduct.packages.length} - {pkg.name}
                </option>
              ))}
            </select>
          </div>

          {/* Label Size */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Etiket Boyutu / Düzen
            </label>
            <select
              value={labelSize}
              onChange={(e) => setLabelSize(e.target.value as 'THERMAL_100x60' | 'A4_GRID')}
              className="w-full text-sm rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="THERMAL_100x60">100x60 mm (Termal Rulo / Büyük Etiket)</option>
              <option value="A4_GRID">A4 Kağıt Çoklu Düzen (Standart Yazıcı)</option>
            </select>
          </div>

          {/* Copies per Koli */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Koli Başına Kopya
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={printCopies}
              onChange={(e) => setPrintCopies(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full text-sm rounded-lg border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Printable Labels Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-100">
          <div className="flex items-center justify-between mb-4 print:hidden">
            <div className="text-xs font-semibold text-gray-600 flex items-center gap-2">
              <Layers className="w-4 h-4 text-gray-500" />
              <span>
                Önizleme: <strong>{packagesToPrint.length} adet</strong> etiket hazırlanıyor
              </span>
            </div>
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium text-sm rounded-lg shadow-sm transition space-x-2"
            >
              <Printer className="w-4 h-4" />
              <span>Yazdır / PDF Olarak Kaydet</span>
            </button>
          </div>

          {/* The actual Printable Grid */}
          <div
            ref={printContainerRef}
            className={`grid gap-4 print:gap-2 print:m-0 print:p-0 ${
              labelSize === 'THERMAL_100x60'
                ? 'grid-cols-1 sm:grid-cols-2 print:grid-cols-2'
                : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 print:grid-cols-3'
            }`}
          >
            {packagesToPrint.map((item, idx) => (
              <div
                key={`${item.pkg.koliId}-${idx}`}
                className="bg-white border-2 border-gray-800 rounded-xl p-4 shadow-sm flex flex-col justify-between relative print:break-inside-avoid print:shadow-none print:border print:border-black print:rounded-lg"
              >
                {/* Top Badge: Koli Index and SKU */}
                <div className="flex items-start justify-between border-b border-gray-200 pb-2 mb-2">
                  <div>
                    <div className="text-[11px] font-mono font-bold text-gray-500 tracking-wider">
                      {item.product.sku} • {item.product.category}
                    </div>
                    <div className="font-bold text-gray-900 text-sm leading-tight line-clamp-1">
                      {item.product.name}
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-2 bg-gray-900 text-amber-400 font-black text-sm px-2.5 py-1 rounded-md border border-gray-700">
                    KOLİ {item.pkg.koliIndex}/{item.product.packages.length}
                  </div>
                </div>

                {/* Koli Name & Dimensions */}
                <div className="text-xs font-semibold text-gray-800 mb-2">
                  <div className="line-clamp-2">{item.pkg.name}</div>
                  {item.pkg.weightOrSize && (
                    <div className="text-[11px] text-gray-500 font-normal mt-0.5">
                      Ölçü/Ağırlık: {item.pkg.weightOrSize}
                    </div>
                  )}
                </div>

                {/* Barcode SVG */}
                <div className="flex flex-col items-center justify-center my-2 bg-white py-1">
                  <svg id={`barcode-svg-${idx}`} className="w-full max-h-16" />
                </div>

                {/* Footer Info */}
                <div className="flex items-center justify-between text-[11px] text-gray-500 border-t border-gray-200 pt-2 font-mono">
                  <div>Depo: {item.product.location}</div>
                  <div>ID: #{item.pkg.koliIndex} / {item.product.packages.length}</div>
                </div>
              </div>
            ))}
          </div>

          {packagesToPrint.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              Yazdırılacak koli seçilmedi veya ürünün kolisi bulunmuyor.
            </div>
          )}
        </div>

        {/* Modal Footer - Hidden during print */}
        <div className="px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between print:hidden">
          <div className="text-xs text-gray-500">
            İpucu: Tarayıcı yazdırma penceresinde <strong>"Arka Plan Grafikleri"</strong> seçeneğini işaretleyin.
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Kapat
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg shadow-sm flex items-center space-x-2 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Yazdır / PDF Olarak Kaydet</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
