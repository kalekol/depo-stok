import React from 'react';
import {
  Boxes,
  Barcode,
  FolderOpen,
  PlusCircle,
  History,
  Download,
  RotateCcw,
  Smartphone,
  Laptop,
} from 'lucide-react';

interface NavbarProps {
  onOpenQuickScan: () => void;
  onOpenCategoryManager: () => void;
  onOpenAddProduct: () => void;
  onOpenHistory: () => void;
  onExportCSV: () => void;
  onResetDemo: () => void;
  totalProducts: number;
  totalCompleteSets: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenQuickScan,
  onOpenCategoryManager,
  onOpenAddProduct,
  onOpenHistory,
  onExportCSV,
  onResetDemo,
  totalProducts,
  totalCompleteSets,
}) => {
  return (
    <header className="bg-gray-900 text-white shadow-xl border-b border-gray-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-amber-500 rounded-xl text-gray-950 shadow-md">
              <Boxes className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg sm:text-xl font-black tracking-tight text-white">
                  KOLİ & DEPO<span className="text-amber-400">TAKİP</span>
                </span>
              </div>
            </div>
          </div>

          {/* Key Actions Toolbar */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Hızlı Barkod Taraması - PRIMARY BUTTON */}
            <button
              onClick={onOpenQuickScan}
              className="px-3.5 sm:px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-gray-950 font-black text-xs sm:text-sm rounded-xl shadow-lg hover:shadow-amber-500/20 transition flex items-center space-x-2 border border-amber-400"
            >
              <Barcode className="w-5 h-5 stroke-[2.5]" />
              <span>Hızlı Barkod / Kamera</span>
            </button>

            {/* Yeni Mobilya Tanımla */}
            <button
              onClick={onOpenAddProduct}
              className="px-3 sm:px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs sm:text-sm rounded-xl border border-gray-700 shadow-sm transition flex items-center space-x-1.5"
            >
              <PlusCircle className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline">Yeni Mobilya & Koli Ekle</span>
              <span className="md:hidden">Ürün Ekle</span>
            </button>

            {/* Kategori Yönetimi */}
            <button
              onClick={onOpenCategoryManager}
              className="px-3 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white rounded-xl border border-gray-700 transition flex items-center space-x-1.5"
              title="Kategori Ekle / Çıkar / Düzenle"
            >
              <FolderOpen className="w-5 h-5 text-amber-400" />
              <span className="hidden xl:inline text-xs font-bold">Kategoriler</span>
            </button>

            {/* Tarihçe / Geçmiş */}
            <button
              onClick={onOpenHistory}
              className="p-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white rounded-xl border border-gray-700 transition"
              title="Barkod Tarama ve Stok İşlem Geçmişi"
            >
              <History className="w-5 h-5" />
            </button>

            {/* Excel CSV & Demo Reset dropdown / icons */}
            <button
              onClick={onExportCSV}
              className="hidden lg:flex items-center space-x-1.5 px-3 py-2 bg-gray-800/80 hover:bg-gray-800 text-xs text-gray-300 hover:text-white rounded-xl border border-gray-700 transition"
              title="Excel / CSV Olarak İndir"
            >
              <Download className="w-4 h-4" />
              <span>Excel (CSV)</span>
            </button>

            <button
              onClick={onResetDemo}
              className="p-2 text-gray-500 hover:text-gray-300 rounded-lg hover:bg-gray-800 transition"
              title="Örnek Mobilya Verilerini Yükle"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
