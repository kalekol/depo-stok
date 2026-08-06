import React, { useState, useEffect } from 'react';
import { Product, PackageItem, CategoryItem } from '../types';
import { Plus, Trash2, Box, Sparkles, X, FolderPlus } from 'lucide-react';
import { loadCategoriesFromStorage, saveCategoriesToStorage } from '../lib/storage';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: Omit<Product, 'id' | 'updatedAt'>, editId?: string) => void;
  onDelete?: (product: Product) => void;
  editingProduct?: Product | null;
  initialBarcode?: string | null;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingProduct,
  initialBarcode,
}) => {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('Gardırop & Dolap');
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [newCatInput, setNewCatInput] = useState('');
  const [showCatInput, setShowCatInput] = useState(false);
  const [notes, setNotes] = useState('');
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowConfirmDelete(false);
      const loaded = loadCategoriesFromStorage();
      setCategories(loaded);
      if (loaded.length > 0 && !category) {
        setCategory(loaded[0].name);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (editingProduct) {
      setName(editingProduct.name);
      setSku(editingProduct.sku);
      setCategory(editingProduct.category);
      setNotes(editingProduct.notes || '');
      setPackages(editingProduct.packages || []);
    } else {
      const defaultSku = 'DLB-YENI-' + Math.floor(100 + Math.random() * 900);
      setName('');
      setSku(defaultSku);
      setNotes('');
      const firstBarcode = initialBarcode || '8691000' + Math.floor(100000 + Math.random() * 900000);
      setPackages([
        {
          koliId: `pkg-1-${Date.now()}`,
          koliIndex: 1,
          name: 'Koli 1/3',
          barcode: firstBarcode,
          quantity: 0,
        },
        {
          koliId: `pkg-2-${Date.now()}`,
          koliIndex: 2,
          name: 'Koli 2/3',
          barcode: '8691000' + Math.floor(100000 + Math.random() * 900000),
          quantity: 0,
        },
        {
          koliId: `pkg-3-${Date.now()}`,
          koliIndex: 3,
          name: 'Koli 3/3',
          barcode: '8691000' + Math.floor(100000 + Math.random() * 900000),
          quantity: 0,
        },
      ]);
    }
  }, [editingProduct, isOpen, initialBarcode]);

  if (!isOpen) return null;

  const handleAddPackage = () => {
    const nextIdx = packages.length + 1;
    const newPkg: PackageItem = {
      koliId: `pkg-${nextIdx}-${Date.now()}`,
      koliIndex: nextIdx,
      name: `Koli ${nextIdx}/${nextIdx}`,
      barcode: '8691000' + Math.floor(100000 + Math.random() * 900000),
      quantity: 0,
    };

    const updated = [...packages, newPkg].map((p, idx) => ({
      ...p,
      koliIndex: idx + 1,
      name: `Koli ${idx + 1}/${packages.length + 1}`,
    }));

    setPackages(updated);
  };

  const handleRemovePackage = (indexToRemove: number) => {
    if (packages.length <= 1) return;
    const filtered = packages.filter((_, idx) => idx !== indexToRemove);
    const updated = filtered.map((p, idx) => ({
      ...p,
      koliIndex: idx + 1,
      name: `Koli ${idx + 1}/${filtered.length}`,
    }));
    setPackages(updated);
  };

  const handlePackageChange = (
    index: number,
    field: keyof PackageItem,
    value: string | number
  ) => {
    const updated = [...packages];
    updated[index] = { ...updated[index], [field]: value };
    setPackages(updated);
  };

  const handleGenerateAllBarcodes = () => {
    const baseCode = Math.floor(1000 + Math.random() * 9000);
    const updated = packages.map((pkg, idx) => ({
      ...pkg,
      barcode: `8690900${baseCode}0${idx + 1}`,
    }));
    setPackages(updated);
  };

  const handleAddInlineCategory = () => {
    if (!newCatInput.trim()) return;
    const exists = categories.some(
      (c) => c.name.toLowerCase() === newCatInput.trim().toLowerCase()
    );
    if (!exists) {
      const nextCats = [...categories, { id: 'cat-' + Date.now(), name: newCatInput.trim() }];
      saveCategoriesToStorage(nextCats);
      setCategories(nextCats);
      setCategory(newCatInput.trim());
    } else {
      setCategory(newCatInput.trim());
    }
    setNewCatInput('');
    setShowCatInput(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Lütfen mobilya veya ürün adı girin.');
      return;
    }
    if (packages.length === 0) {
      alert('En az 1 adet koli tanımlamalısınız.');
      return;
    }

    onSave(
      {
        name: name.trim(),
        sku: '',
        category,
        notes: notes.trim(),
        packages,
      },
      editingProduct?.id
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">
                {editingProduct ? 'Mobilya Ürün & Kolilerini Düzenle' : 'Yeni Mobilya & Koli Tanımla'}
              </h3>
              <p className="text-xs text-gray-400">
                Örn: "A Dolabı (3 Kolili)" için her koliye ayrı takip barkodu atayın
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Product General Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
            <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center space-x-2">
              <span>1. Ürün Temel Bilgileri</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Ürün Adı <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Örn: Alesta 3 Kapaklı Aynalı Gardırop - Ceviz"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-3">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700">Kategori</label>
                  <button
                    type="button"
                    onClick={() => setShowCatInput(!showCatInput)}
                    className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center space-x-1"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>{showCatInput ? 'Listeden Seç' : '+ Yeni Kategori Ekle'}</span>
                  </button>
                </div>
                {showCatInput ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newCatInput}
                      onChange={(e) => setNewCatInput(e.target.value)}
                      placeholder="Yeni kategori adı girin..."
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddInlineCategory}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition"
                    >
                      Ekle & Seç
                    </button>
                  </div>
                ) : (
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Ürün Notları / Sevkiyat Uyarıları
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Örn: 3 Koli tamamlanmadan sevkiyat yapılmamalıdır."
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Multi-Koli Packages Structure */}
          <div className="bg-amber-50/40 border border-amber-200 rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h4 className="text-sm font-bold text-gray-900">
                  2. Koli ve Parça Yapısı ({packages.length} Koli Tanımlı)
                </h4>
                <p className="text-xs text-gray-600">
                  Her koliye ayrı bir barkod ve isim tanımlayın. Ürünün tam takım stoğu, en az stoktaki
                  kolinin adedine göre hesaplanır.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleGenerateAllBarcodes}
                  className="inline-flex items-center px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-50 text-amber-800 text-xs font-semibold rounded-lg shadow-sm transition space-x-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Yeniden Barkod Üret</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddPackage}
                  className="inline-flex items-center px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm transition space-x-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Koli Ekle</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {packages.map((pkg, idx) => (
                <div
                  key={pkg.koliId}
                  className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-3"
                >
                  <div className="bg-gray-900 text-amber-400 font-bold text-xs px-3 py-2 rounded-lg flex-shrink-0">
                    KOLİ {pkg.koliIndex}/{packages.length}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 w-full">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                        Koli Adı (Sadece Koli 1/3 vb.)
                      </label>
                      <input
                        type="text"
                        value={pkg.name}
                        onChange={(e) => handlePackageChange(idx, 'name', e.target.value)}
                        placeholder="Örn: Koli 1/3"
                        className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                        Koli Barkodu / Takip No
                      </label>
                      <input
                        type="text"
                        value={pkg.barcode}
                        onChange={(e) => handlePackageChange(idx, 'barcode', e.target.value)}
                        placeholder="869010..."
                        className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-mono font-bold text-gray-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                        Başlangıç Stok Adedi
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={pkg.quantity}
                        onChange={(e) =>
                          handlePackageChange(idx, 'quantity', parseInt(e.target.value) || 0)
                        }
                        className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-bold text-center"
                      />
                    </div>
                  </div>

                  {packages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePackage(idx)}
                      className="p-2 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition self-end md:self-center"
                      title="Koliyi Kaldır"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Silme Doğrulama Alanı (window.confirm iframe engelleri için inline butonlu onay) */}
          {showConfirmDelete ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
              <div className="flex items-center space-x-2 text-rose-800">
                <Trash2 className="w-5 h-5 text-rose-600 flex-shrink-0" />
                <span className="text-xs font-bold">
                  "{editingProduct?.name}" ürününü ve tüm kolilerini kalıcı olarak silmek istediğinize emin misiniz?
                </span>
              </div>
              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg transition"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (editingProduct && onDelete) {
                      onDelete(editingProduct);
                      setShowConfirmDelete(false);
                      onClose();
                    }
                  }}
                  className="px-4 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition"
                >
                  Evet, Kalıcı Olarak Sil
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div>
                {editingProduct && onDelete && (
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(true)}
                    className="px-4 py-2.5 text-sm font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition flex items-center space-x-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Ürünü Sil</span>
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-lg shadow-sm transition"
                >
                  {editingProduct ? 'Değişiklikleri Kaydet' : 'Ürünü ve Kolileri Oluştur'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
