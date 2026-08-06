import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Product, PackageItem, StockLogItem, ScanActionType } from './types';
import {
  loadProductsFromStorage,
  saveProductsToStorage,
  loadLogsFromStorage,
  saveLogsToStorage,
  exportToCSV,
  loadCategoriesFromStorage,
} from './lib/storage';
import { calculateCompleteSet, calculateWarehouseStats } from './lib/setCalculator';
import { Navbar } from './components/Navbar';
import { ProductCard } from './components/ProductCard';
import { QuickScanModal } from './components/QuickScanModal';
import { BarcodePrintModal } from './components/BarcodePrintModal';
import { AddProductModal } from './components/AddProductModal';
import { StockAdjustModal } from './components/StockAdjustModal';
import { StockHistoryModal } from './components/StockHistoryModal';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { ExportModal } from './components/ExportModal';
import { syncToFirebase, stokDokumanRef } from './lib/firebase';
import { onSnapshot } from 'firebase/firestore';
import {
  Search,
  Filter,
  PlusCircle,
  Barcode,
  PackageCheck,
  Boxes,
  AlertTriangle,
  Tag,
  History,
  Layers,
  CheckCircle2,
  Package,
  Eye,
} from 'lucide-react';

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [logs, setLogs] = useState<StockLogItem[]>([]);

  // Refs to avoid stale closures in Firestore snapshot callback
  const productsRef = useRef<Product[]>(products);
  const logsRef = useRef<StockLogItem[]>(logs);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);

  // Search and Filtering
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState<'ALL' | 'READY' | 'INCOMPLETE'>('ALL');
  const [viewMode, setViewMode] = useState<'BOTH' | 'PRODUCT_ONLY' | 'PACKAGES_ONLY'>('BOTH');

  // Modal visibility states
  const [isQuickScanOpen, setIsQuickScanOpen] = useState<boolean>(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [storedCategories, setStoredCategories] = useState(() => loadCategoriesFromStorage());

  // Selected items for Modals
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<PackageItem | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [initialBarcodeForAdd, setInitialBarcodeForAdd] = useState<string | null>(null);

  // Load from local storage initially, then sync with Firebase in real time
  useEffect(() => {
    const loadedProducts = loadProductsFromStorage();
    const loadedLogs = loadLogsFromStorage();
    setProducts(loadedProducts);
    setLogs(loadedLogs);

    let isInitialLocal = true;

    const unsubscribe = onSnapshot(
      stokDokumanRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const bulutData = docSnapshot.data();
          const remoteProducts = bulutData.products || [];
          const remoteLogs = bulutData.logs || [];

          if (JSON.stringify(productsRef.current) !== JSON.stringify(remoteProducts)) {
            setProducts(remoteProducts);
            saveProductsToStorage(remoteProducts);
          }

          if (JSON.stringify(logsRef.current) !== JSON.stringify(remoteLogs)) {
            setLogs(remoteLogs);
            saveLogsToStorage(remoteLogs);
          }

          isInitialLocal = false;
        } else if (isInitialLocal) {
          // If Firestore is empty initially, seed it with local/demo data
          syncToFirebase(loadedProducts, loadedLogs);
          isInitialLocal = false;
        }
      },
      (error) => {
        console.error('Firebase canlı dinleme hatası:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Helper to persist state both to LocalStorage and Firebase Cloud
  const persistProductsAndLogs = (newProducts: Product[], newLogs: StockLogItem[]) => {
    setProducts(newProducts);
    setLogs(newLogs);
    saveProductsToStorage(newProducts);
    saveLogsToStorage(newLogs);
    syncToFirebase(newProducts, newLogs);
  };

  const persistProducts = (updatedProducts: Product[]) => {
    persistProductsAndLogs(updatedProducts, logsRef.current);
  };

  const persistLogs = (updatedLogs: StockLogItem[]) => {
    persistProductsAndLogs(productsRef.current, updatedLogs);
  };

  // Add Log Item helper
  const appendLog = (
    product: Product,
    pkg: PackageItem | null,
    action: 'IN' | 'OUT' | 'SET_ADJUST',
    change: number,
    oldQty: number,
    newQty: number,
    reason: string,
    source: 'BARCODE_CAMERA' | 'BARCODE_USB' | 'MANUAL'
  ): StockLogItem => {
    const logItem: StockLogItem = {
      id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
      productId: product.id,
      productName: product.name,
      koliId: pkg ? pkg.koliId : 'ALL',
      koliName: pkg ? pkg.name : 'Tüm Koliler Eşzamanlı',
      koliBarcode: pkg ? pkg.barcode : (product.sku || 'SKU'),
      action,
      quantityChange: change,
      previousQty: oldQty,
      newQty: newQty,
      reason,
      source,
    };
    const nextLogs = [logItem, ...logsRef.current.slice(0, 199)]; // retain latest 200 logs
    persistLogs(nextLogs);
    return logItem;
  };

  // Quick Action from Barcode Scanner (Camera / USB)
  const handleScanAction = (
    product: Product,
    pkg: PackageItem,
    actionType: ScanActionType,
    source: 'BARCODE_CAMERA' | 'BARCODE_USB' | 'MANUAL',
    targetQty?: number
  ): { updatedProduct: Product; logItem: StockLogItem | null } => {
    const oldQty = pkg.quantity;
    let newQty = oldQty;
    let change = 0;
    let reason = '';

    if (actionType === 'IN') {
      newQty = oldQty + 1;
      change = 1;
      reason = 'Barkod Okuma ile Stok Girişi (+1)';
    } else if (actionType === 'OUT') {
      newQty = Math.max(0, oldQty - 1);
      change = newQty - oldQty;
      reason = 'Barkod Okuma ile Sevkiyat / Çıkış (-1)';
    } else if (actionType === 'SET' && typeof targetQty === 'number') {
      newQty = Math.max(0, targetQty);
      change = newQty - oldQty;
      reason = `Barkod Terminalinde Miktar Güncellendi (${oldQty} -> ${newQty})`;
    } else {
      // INFO mode: don't change quantity
      return { updatedProduct: product, logItem: null };
    }

    if (change === 0 && actionType === 'SET') {
      return { updatedProduct: product, logItem: null };
    }

    const updatedPackages = product.packages.map((p) =>
      p.koliId === pkg.koliId ? { ...p, quantity: newQty } : p
    );

    const updatedProduct: Product = {
      ...product,
      packages: updatedPackages,
      updatedAt: new Date().toISOString(),
    };

    const nextProducts = products.map((p) => (p.id === product.id ? updatedProduct : p));
    persistProducts(nextProducts);

    const logItem = appendLog(
      updatedProduct,
      pkg,
      change > 0 ? 'IN' : change < 0 ? 'OUT' : 'SET_ADJUST',
      change,
      oldQty,
      newQty,
      reason,
      source
    );

    return { updatedProduct, logItem };
  };

  // Quick inline +1/-1 button on product card
  const handleQuickCardAdjust = (product: Product, pkg: PackageItem, change: number) => {
    const oldQty = pkg.quantity;
    const newQty = Math.max(0, oldQty + change);
    if (oldQty === newQty) return;

    const updatedPackages = product.packages.map((p) =>
      p.koliId === pkg.koliId ? { ...p, quantity: newQty } : p
    );

    const updatedProduct: Product = {
      ...product,
      packages: updatedPackages,
      updatedAt: new Date().toISOString(),
    };

    const nextProducts = products.map((p) => (p.id === product.id ? updatedProduct : p));
    persistProducts(nextProducts);

    appendLog(
      updatedProduct,
      pkg,
      change > 0 ? 'IN' : 'OUT',
      change,
      oldQty,
      newQty,
      change > 0 ? 'Kart Üzerinden Hızlı Giriş (+1)' : 'Kart Üzerinden Hızlı Çıkış (-1)',
      'MANUAL'
    );
  };

  // Confirm manual adjustment from StockAdjustModal
  const handleConfirmAdjustment = (
    productId: string,
    koliId: string,
    changeType: 'ADD' | 'SUBTRACT' | 'SET_EXACT',
    amount: number,
    reason: string
  ): { updatedProduct: Product; newLogs: StockLogItem[] } => {
    const product = products.find((p) => p.id === productId);
    if (!product) return { updatedProduct: products[0], newLogs: logs };

    const newLogs: StockLogItem[] = [];

    const updatedPackages = product.packages.map((pkg) => {
      if (koliId === 'ALL' || pkg.koliId === koliId) {
        const oldQty = pkg.quantity;
        let newQty = oldQty;

        if (changeType === 'ADD') {
          newQty = oldQty + amount;
        } else if (changeType === 'SUBTRACT') {
          newQty = Math.max(0, oldQty - amount);
        } else if (changeType === 'SET_EXACT') {
          newQty = amount;
        }

        const change = newQty - oldQty;
        if (change !== 0) {
          const lItem = appendLog(
            product,
            pkg,
            change > 0 ? 'IN' : change < 0 ? 'OUT' : 'SET_ADJUST',
            change,
            oldQty,
            newQty,
            reason,
            'MANUAL'
          );
          newLogs.push(lItem);
        }

        return { ...pkg, quantity: newQty };
      }
      return pkg;
    });

    const updatedProduct: Product = {
      ...product,
      packages: updatedPackages,
      updatedAt: new Date().toISOString(),
    };

    const nextProducts = products.map((p) => (p.id === product.id ? updatedProduct : p));
    persistProducts(nextProducts);

    return { updatedProduct, newLogs };
  };

  // Save new or edited product
  const handleSaveProduct = (productData: Omit<Product, 'id' | 'updatedAt'>, editId?: string) => {
    if (editId) {
      const updated = products.map((p) =>
        p.id === editId
          ? {
              ...p,
              ...productData,
              updatedAt: new Date().toISOString(),
            }
          : p
      );
      persistProducts(updated);
    } else {
      const newProd: Product = {
        ...productData,
        id: 'prod-' + Date.now(),
        updatedAt: new Date().toISOString(),
      };
      persistProducts([newProd, ...products]);
    }
    setEditingProduct(null);
  };

  // Delete product and all its packages
  const handleDeleteProduct = (product: Product) => {
    const updated = products.filter((p) => p.id !== product.id);
    persistProducts(updated);
  };

  // Export CSV Modal
  const handleExportCSV = () => {
    setIsExportModalOpen(true);
  };

  // Calculate Warehouse Stats
  const stats = useMemo(() => calculateWarehouseStats(products), [products]);

  // All unique categories for filter
  const categories = useMemo(() => {
    const set = new Set<string>();
    storedCategories.forEach((c) => set.add(c.name));
    products.forEach((p) => set.add(p.category));
    return ['ALL', ...Array.from(set)];
  }, [products, storedCategories]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      // search match
      const matchesSearch =
        prod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (prod.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        prod.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (prod.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        prod.packages.some(
          (pkg) =>
            pkg.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
            pkg.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

      // category match
      const matchesCategory = categoryFilter === 'ALL' || prod.category === categoryFilter;

      // stock status match
      const setStatus = calculateCompleteSet(prod);
      const isIncomplete = setStatus.missingPackagesToReachMax.length > 0 || setStatus.completeSets === 0;

      const matchesStatus =
        stockStatusFilter === 'ALL' ||
        (stockStatusFilter === 'READY' && setStatus.completeSets > 0) ||
        (stockStatusFilter === 'INCOMPLETE' && isIncomplete);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchTerm, categoryFilter, stockStatusFilter]);

  return (
    <div className="min-h-screen bg-gray-100/80 text-gray-900 flex flex-col">
      {/* Primary Navbar */}
      <Navbar
        onOpenQuickScan={() => setIsQuickScanOpen(true)}
        onOpenCategoryManager={() => setIsCategoryModalOpen(true)}
        onOpenAddProduct={() => {
          setEditingProduct(null);
          setIsAddModalOpen(true);
        }}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onExportCSV={handleExportCSV}
        totalProducts={stats.totalProducts}
        totalCompleteSets={stats.totalCompleteSets}
      />

      {/* Main Single-View Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Warehouse KPI Overview Cards */}
        <section aria-label="Depo Özeti ve İstatistikler">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: Toplam Ürün & Koli Çeşidi */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
                <Boxes className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  KAYITLI TAKIM & KOLİ
                </div>
                <div className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5">
                  {stats.totalProducts}{' '}
                  <span className="text-sm font-normal text-gray-500">
                    ({stats.totalKoliTypes} Koli)
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Hazır Sevk Edilebilir Tam Set */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
                <PackageCheck className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  SEVK EDİLEBİLİR TAM SET
                </div>
                <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-0.5">
                  {stats.totalCompleteSets}{' '}
                  <span className="text-sm font-normal text-gray-500">Takım Hazır</span>
                </div>
              </div>
            </div>

            {/* Card 3: Fiziksel Koli Adedi */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-200 shadow-sm flex items-center space-x-4">
              <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
                <Layers className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  TOPLAM FİZİKSEL KOLİ
                </div>
                <div className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5">
                  {stats.totalPhysicalKoliCount}{' '}
                  <span className="text-sm font-normal text-gray-500">Adet Koli</span>
                </div>
              </div>
            </div>

            {/* Card 4: Eksik Takımlı Ürün */}
            <div
              className={`rounded-2xl p-4 sm:p-5 border shadow-sm flex items-center space-x-4 transition ${
                stats.incompleteProductsCount > 0
                  ? 'bg-amber-50/70 border-amber-300'
                  : 'bg-white border-gray-200'
              }`}
            >
              <div className="p-3 bg-rose-500/10 text-rose-600 rounded-xl">
                <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  EKSİK KOLİLİ TAKIM
                </div>
                <div className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5">
                  {stats.incompleteProductsCount}{' '}
                  <span className="text-sm font-normal text-gray-500">Ürün Uyarıda</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Filter, Search & View Mode Toolbar */}
        <section aria-label="Ürün Arama, Filtreleme ve Görünüm">
          <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex flex-col space-y-3">
            {/* Top row: Search input + Action buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Mobilya adı, koli tanımı veya koli barkodu ara..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 bg-gray-50/50 text-xs sm:text-sm focus:border-amber-500 focus:bg-white focus:outline-none transition"
                />
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setIsQuickScanOpen(true)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-extrabold text-xs rounded-xl shadow-sm transition flex items-center justify-center space-x-1.5"
                >
                  <Barcode className="w-4 h-4 stroke-[2.5]" />
                  <span>Barkod Tara</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedProduct(products[0] || null);
                    setSelectedPackage(null);
                    setIsPrintModalOpen(true);
                  }}
                  className="px-3 py-2 bg-gray-900 hover:bg-gray-800 text-white font-semibold text-xs rounded-xl transition flex items-center space-x-1.5"
                  title="Etiket Yazdır"
                >
                  <Tag className="w-3.5 h-3.5 text-amber-400" />
                  <span>Etiketler</span>
                </button>
              </div>
            </div>

            {/* Bottom row: Filters + Compact View Mode Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center space-x-1 text-xs font-semibold text-gray-500">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Kategori:</span>
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold focus:border-amber-500 focus:outline-none"
                >
                  <option value="ALL">Tüm Kategoriler</option>
                  {categories
                    .filter((c) => c !== 'ALL')
                    .map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                </select>

                <select
                  value={stockStatusFilter}
                  onChange={(e) =>
                    setStockStatusFilter(e.target.value as 'ALL' | 'READY' | 'INCOMPLETE')
                  }
                  className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold focus:border-amber-500 focus:outline-none"
                >
                  <option value="ALL">Tüm Stok Durumları</option>
                  <option value="READY">✅ Hazır Sevk Edilebilir</option>
                  <option value="INCOMPLETE">🚨 Eksik Kolili Takımlar</option>
                </select>

                {(searchTerm || categoryFilter !== 'ALL' || stockStatusFilter !== 'ALL') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setCategoryFilter('ALL');
                      setStockStatusFilter('ALL');
                    }}
                    className="px-2.5 py-1.5 text-xs font-semibold text-amber-800 hover:text-amber-900 bg-amber-50 rounded-lg border border-amber-200 transition"
                  >
                    Sıfırla
                  </button>
                )}
              </div>

              {/* Segmented View Switcher */}
              <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
                <button
                  onClick={() => setViewMode('BOTH')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                    viewMode === 'BOTH'
                      ? 'bg-white text-gray-900 shadow-sm font-black'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Detaylı</span>
                </button>

                <button
                  onClick={() => setViewMode('PRODUCT_ONLY')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                    viewMode === 'PRODUCT_ONLY'
                      ? 'bg-white text-gray-900 shadow-sm font-black'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sadece Ürün</span>
                </button>

                <button
                  onClick={() => setViewMode('PACKAGES_ONLY')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                    viewMode === 'PACKAGES_ONLY'
                      ? 'bg-white text-gray-900 shadow-sm font-black'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Koli Listesi</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Product Cards Grid */}
        <section aria-label="Kayıtlı Mobilya Ürünleri ve Kolileri">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-sm font-extrabold text-gray-800 tracking-wide flex items-center space-x-2">
              <span>{viewMode === 'PACKAGES_ONLY' ? 'KAYITLI KOLİ STOKLARI' : 'KAYITLI MOBİLYA TAKIMLARI'}</span>
              <span className="bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                {viewMode === 'PACKAGES_ONLY' 
                  ? filteredProducts.reduce((sum, p) => sum + p.packages.length, 0) 
                  : filteredProducts.length}
              </span>
            </h2>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setIsAddModalOpen(true);
                }}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs rounded-xl shadow-sm transition"
              >
                <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Yeni Ürün Ekle</span>
              </button>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                <Boxes className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-gray-800">
                Arama kriterlerine uygun mobilya takımı bulunamadı
              </h3>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                Filtreleri sıfırlayabilir veya "Yeni Mobilya Takımı Tanımla" butonu ile yeni bir kolili
                mobilya ürünü ekleyebilirsiniz.
              </p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('ALL');
                  setStockStatusFilter('ALL');
                }}
                className="mt-4 px-4 py-2 bg-gray-900 text-white text-xs font-semibold rounded-lg transition"
              >
                Tüm Ürünleri Göster
              </button>
            </div>
          ) : viewMode === 'PACKAGES_ONLY' ? (
            /* Koli Olarak Gör (Liste Görünümü) */
            <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-4">Kategori / Ürün Adı</th>
                      <th className="p-4">Koli İndeksi</th>
                      <th className="p-4">Koli Tanımı</th>
                      <th className="p-4">Barkod No</th>
                      <th className="p-4 text-center">Stok Durumu</th>
                      <th className="p-4 text-center">Stok Adedi</th>
                      <th className="p-4 text-right">Stok Güncelle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150">
                    {filteredProducts.flatMap(prod => {
                      const setStatus = calculateCompleteSet(prod);
                      return prod.packages.map(pkg => {
                        const isMissing = setStatus.missingPackagesToReachMax.some(
                          m => m.koliIndex === pkg.koliIndex
                        );
                        return { prod, pkg, setStatus, isMissing };
                      });
                    }).map(({ prod, pkg, setStatus, isMissing }) => (
                      <tr key={pkg.koliId} className={`hover:bg-gray-50/50 transition-colors ${isMissing ? 'bg-rose-50/20' : ''}`}>
                        <td className="p-4">
                          <div className="font-semibold text-gray-900">{prod.name}</div>
                          <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mt-0.5">{prod.category}</div>
                        </td>
                        <td className="p-4 font-mono font-bold text-gray-700">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${isMissing ? 'bg-rose-100 text-rose-800' : 'bg-gray-100 text-gray-800'}`}>
                            {pkg.koliIndex} / {prod.packages.length}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-gray-800">{pkg.name}</td>
                        <td className="p-4">
                          <div className="flex items-center space-x-1.5 font-mono text-gray-600">
                            <Barcode className="w-3.5 h-3.5 text-gray-400" />
                            <span>{pkg.barcode}</span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          {isMissing ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                              Eksik Koli
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                              Tam / Dengeli
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center font-black text-sm text-gray-950">
                          {pkg.quantity} adet
                        </td>
                        <td className="p-4 text-right">
                          <div className="inline-flex items-center space-x-1">
                            <button
                              onClick={() => handleQuickCardAdjust(prod, pkg, -1)}
                              disabled={pkg.quantity <= 0}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition"
                              title="-1 Azalt"
                            >
                              -
                            </button>
                            <button
                              onClick={() => handleQuickCardAdjust(prod, pkg, 1)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200 transition"
                              title="+1 Ekle"
                            >
                              +
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : viewMode === 'PRODUCT_ONLY' ? (
            /* Sadece Ürün Stoğu Görünümü (Sade Alt Alta Liste) */
            <div className="bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-4">Kategori / Ürün Adı</th>
                      <th className="p-4">SKU / Kod</th>
                      <th className="p-4 text-center">Koli Yapısı</th>
                      <th className="p-4 text-center">Hazır Tam Takım</th>
                      <th className="p-4 text-center">Toplam Fiziksel Koli</th>
                      <th className="p-4 text-center">Stok Durumu</th>
                      <th className="p-4 text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150">
                    {filteredProducts.map((prod) => {
                      const setStatus = calculateCompleteSet(prod);
                      const totalPhysical = prod.packages.reduce((sum, p) => sum + p.quantity, 0);
                      const hasMissing = setStatus.missingPackagesToReachMax.length > 0;

                      return (
                        <tr key={prod.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="p-4">
                            <div className="font-bold text-gray-900 text-sm">{prod.name}</div>
                            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">
                              {prod.category}
                            </div>
                          </td>
                          <td className="p-4 font-mono font-medium text-gray-600">
                            {prod.sku || '-'}
                          </td>
                          <td className="p-4 text-center font-semibold text-gray-700">
                            {prod.packages.length} Koli
                          </td>
                          <td className="p-4 text-center">
                            <span
                              className={`text-base font-black ${
                                setStatus.completeSets > 0 && !hasMissing
                                  ? 'text-emerald-700'
                                  : setStatus.completeSets > 0
                                  ? 'text-amber-700'
                                  : 'text-rose-600'
                              }`}
                            >
                              {setStatus.completeSets} Takım
                            </span>
                          </td>
                          <td className="p-4 text-center font-bold text-gray-800">
                            {totalPhysical} adet
                          </td>
                          <td className="p-4 text-center">
                            {setStatus.completeSets > 0 && !hasMissing ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                ✅ Sevkiyata Hazır
                              </span>
                            ) : hasMissing ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                ⚠️ Eksik Kolili ({setStatus.missingPackagesToReachMax.length} koli eksik)
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                🚨 Stok Yok / Tamamlanmamış
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right space-x-1.5">
                            <button
                              onClick={() => {
                                setSelectedProduct(prod);
                                setSelectedPackage(null);
                                setIsAdjustModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-semibold rounded-lg border border-gray-200 transition"
                            >
                              Stok / Set Düzenle
                            </button>
                            <button
                              onClick={() => {
                                setEditingProduct(prod);
                                setIsAddModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 bg-gray-900 hover:bg-gray-800 text-amber-400 text-xs font-semibold rounded-lg transition"
                            >
                              Düzenle
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {filteredProducts.map((prod) => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  viewMode={viewMode}
                  onEdit={(p) => {
                    setEditingProduct(p);
                    setIsAddModalOpen(true);
                  }}
                  onDelete={handleDeleteProduct}
                  onOpenAdjust={(p, pkg) => {
                    setSelectedProduct(p);
                    setSelectedPackage(pkg || null);
                    setIsAdjustModalOpen(true);
                  }}
                  onQuickAdjust={handleQuickCardAdjust}
                />
              ))}
            </div>
          )}
        </section>

        {/* En Sonda Eksik Koliler Listesi */}
        <section aria-label="Eksik Koliler Listesi" className="mt-12">
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
              <div>
                <h2 className="text-base font-extrabold text-gray-900 tracking-tight flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse" />
                  <span>EKSİK KOLİLER VE TAM TAKIM TAMAMLAMA LİSTESİ</span>
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Takımların sevk edilmeye tam hazır olmasını engelleyen, stokta eksik kalan tüm koliler aşağıda listelenmiştir.
                </p>
              </div>
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-full">
                Eksikleri Gider
              </span>
            </div>

            {(() => {
              // Gather all missing packages across all products
              const missingList: {
                product: Product;
                koliIndex: number;
                koliName: string;
                barcode: string;
                currentQty: number;
                targetQty: number;
                missingCount: number;
                pkg: any;
              }[] = [];

              products.forEach((prod) => {
                const setStatus = calculateCompleteSet(prod);
                setStatus.missingPackagesToReachMax.forEach((m) => {
                  const pkg = prod.packages.find((p) => p.koliIndex === m.koliIndex);
                  missingList.push({
                    product: prod,
                    koliIndex: m.koliIndex,
                    koliName: m.koliName,
                    barcode: pkg?.barcode || '',
                    currentQty: m.currentQty,
                    targetQty: m.targetQty,
                    missingCount: m.missingCount,
                    pkg,
                  });
                });
              });

              if (missingList.length === 0) {
                return (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3 text-emerald-500 border border-emerald-100">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-emerald-800">Harika! Eksik Koli Bulunmamaktadır</h3>
                    <p className="text-xs text-emerald-600/80 mt-1 max-w-md mx-auto">
                      Deponuzdaki tüm mobilya takımlarının koli stokları birbiriyle tam olarak dengeli durumda. Hiçbir takım yarım kalmamıştır!
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {missingList.map((item, idx) => (
                      <div
                        key={`${item.product.id}-${item.koliIndex}-${idx}`}
                        className="bg-rose-50/40 border border-rose-200/80 rounded-xl p-4 flex items-center justify-between gap-3 transition hover:shadow-sm"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-100/60 px-2 py-0.5 rounded">
                            {item.product.category}
                          </span>
                          <h4 className="text-xs font-bold text-gray-900 mt-1 truncate" title={item.product.name}>
                            {item.product.name}
                          </h4>
                          <div className="text-xs text-rose-900 font-semibold mt-1.5 flex items-center gap-1">
                            <span className="bg-rose-600 text-white font-mono px-1.5 py-0.5 rounded text-[10px] font-black">
                              {item.koliIndex}/{item.product.packages.length}
                            </span>
                            <span>{item.koliName}</span>
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono mt-1 flex items-center gap-1">
                            <Barcode className="w-3.5 h-3.5 text-gray-400" />
                            <span>{item.barcode}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <div className="text-right flex-shrink-0">
                            <div className="text-xs font-bold text-gray-500">Mevcut: <strong className="text-gray-900 font-mono">{item.currentQty}</strong></div>
                            <div className="text-xs font-bold text-rose-700 mt-0.5">Eksik: <span className="font-black font-mono">-{item.missingCount}</span></div>
                            <div className="text-[10px] text-gray-400 mt-0.5 font-medium">Hedef: {item.targetQty} Takım</div>
                          </div>
                          {/* Hızlı koli tamamlama butonu */}
                          <button
                            onClick={() => handleQuickCardAdjust(item.product, item.pkg, 1)}
                            className="p-2.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-lg shadow-sm transition-all hover:scale-105 active:scale-95 text-xs font-bold flex items-center gap-1"
                            title="Eksik koliyi tamamlamak için +1 ekle"
                          >
                            <span>+1</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-xs text-rose-950/90 mt-2 flex items-start gap-2.5">
                    <span className="text-base flex-shrink-0">💡</span>
                    <p className="leading-normal">
                      <strong>Depocu Tavsiyesi:</strong> Yukarıdaki kolilerden ekleme yaparak yarım kalan mobilya takımlarını satışa ve sevkiyata hazır tam set haline getirebilirsiniz. Her tamamlama doğrudan <strong>"Hazır Sevk Edilebilir Takım"</strong> sayınızı artıracaktır.
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <div>
            <strong>Mobilya Depo & Koli Stok Takip Sistemi</strong> • Çoklu koli mimarisiyle tam takım hesabı
            (Örn: 3 koli = 1 takım)
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="hover:text-gray-800 transition flex items-center space-x-1"
            >
              <History className="w-3.5 h-3.5" />
              <span>İşlem Tarihçesi</span>
            </button>
            <span>•</span>
            <button
              onClick={() => {
                setSelectedProduct(products[0] || null);
                setSelectedPackage(null);
                setIsPrintModalOpen(true);
              }}
              className="hover:text-gray-800 transition flex items-center space-x-1"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Koli Etiketleri Yazdır</span>
            </button>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      {/* 1. Quick Barcode Scanner Modal (iOS Camera & USB/Laser) */}
      <QuickScanModal
        isOpen={isQuickScanOpen}
        onClose={() => setIsQuickScanOpen(false)}
        products={products}
        onScanAction={handleScanAction}
        onOpenAddProductWithBarcode={(barcode) => {
          setEditingProduct(null);
          setInitialBarcodeForAdd(barcode);
          setIsAddModalOpen(true);
        }}
        onOpenEditProduct={(prod) => {
          setEditingProduct(prod);
          setIsAddModalOpen(true);
        }}
        onOpenStockAdjust={(prod, pkg) => {
          setSelectedProduct(prod);
          setSelectedPackage(pkg);
          setIsAdjustModalOpen(true);
        }}
      />

      {/* 2. Barcode & Label Print Modal */}
      <BarcodePrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        products={products}
        selectedProduct={selectedProduct}
        selectedPackage={selectedPackage}
      />

      {/* 3. Add / Edit Furniture Product Modal */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingProduct(null);
          setInitialBarcodeForAdd(null);
        }}
        onSave={handleSaveProduct}
        onDelete={handleDeleteProduct}
        editingProduct={editingProduct}
        initialBarcode={initialBarcodeForAdd}
      />

      {/* 4. Manual Stock Adjust Modal */}
      <StockAdjustModal
        isOpen={isAdjustModalOpen}
        onClose={() => {
          setIsAdjustModalOpen(false);
          setSelectedProduct(null);
          setSelectedPackage(null);
        }}
        product={selectedProduct}
        selectedPackage={selectedPackage}
        onConfirmAdjustment={handleConfirmAdjustment}
      />

      {/* 5. Scan & Stock Activity History Modal */}
      <StockHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        logs={logs}
        onClearHistory={() => {
          persistLogs([]);
        }}
      />

      {/* 6. Category Manager Modal */}
      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onCategoriesUpdated={(updatedCats) => {
          setStoredCategories(updatedCats);
        }}
      />

      {/* 7. Export CSV Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        products={products}
      />
    </div>
  );
}
