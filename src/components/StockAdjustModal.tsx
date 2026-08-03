import React, { useState, useEffect } from 'react';
import { Product, PackageItem, StockLogItem } from '../types';
import { calculateCompleteSet } from '../lib/setCalculator';
import { X, Sliders, ArrowUpRight, ArrowDownRight, RefreshCw, Check, PackageCheck } from 'lucide-react';

interface StockAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  selectedPackage?: PackageItem | null;
  onConfirmAdjustment: (
    productId: string,
    koliId: string, // 'ALL' for complete set adjust
    changeType: 'ADD' | 'SUBTRACT' | 'SET_EXACT',
    amount: number,
    reason: string
  ) => { updatedProduct: Product; newLogs: StockLogItem[] };
}

export const StockAdjustModal: React.FC<StockAdjustModalProps> = ({
  isOpen,
  onClose,
  product,
  selectedPackage,
  onConfirmAdjustment,
}) => {
  const [targetKoliId, setTargetKoliId] = useState<string>('ALL');
  const [changeType, setChangeType] = useState<'ADD' | 'SUBTRACT' | 'SET_EXACT'>('ADD');
  const [amount, setAmount] = useState<number>(1);
  const [reason, setReason] = useState<string>('Manuel Stok Girişi / Düzeltme');

  useEffect(() => {
    if (product) {
      if (selectedPackage) {
        setTargetKoliId(selectedPackage.koliId);
      } else {
        setTargetKoliId('ALL');
      }
      setAmount(1);
      setChangeType('ADD');
      setReason('Manuel Stok Girişi / Düzeltme');
    }
  }, [product, selectedPackage, isOpen]);

  if (!isOpen || !product) return null;

  const setStatus = calculateCompleteSet(product);

  const handleQuickAmount = (val: number) => {
    setAmount((prev) => Math.max(1, prev + val));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount < 0) {
      alert('Geçerli bir sayı giriniz.');
      return;
    }
    onConfirmAdjustment(
      product.id,
      targetKoliId,
      changeType,
      amount,
      reason.trim() || 'Manuel İşlem'
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Manuel Stok Düzenleme & Giriş</h3>
              <p className="text-xs text-gray-400">
                {product.name} ({product.packages.length} Koli)
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

        {/* Current Set Overview */}
        <div className="bg-amber-50/70 border-b border-amber-200 px-6 py-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
            <PackageCheck className="w-4 h-4 text-amber-600" />
            <span>Hazır Sevk Edilebilir Tam Takım:</span>
          </span>
          <span className="text-sm font-black text-amber-800">
            {setStatus.completeSets} TAKIM STOKTA
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Target Koli selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              İşlem Yapılacak Koli veya Tüm Takım
            </label>
            <select
              value={targetKoliId}
              onChange={(e) => setTargetKoliId(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-semibold shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="ALL">
                🌟 Tüm Kolilere Eşzamanlı Uygula ({product.packages.length} Koli Birlikte)
              </option>
              {product.packages.map((pkg) => (
                <option key={pkg.koliId} value={pkg.koliId}>
                  Koli {pkg.koliIndex}/{product.packages.length} - {pkg.name} (Stok: {pkg.quantity} adet)
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-500 mt-1">
              {targetKoliId === 'ALL'
                ? 'Seçili işlem ürünün tüm kolilerine (1/3, 2/3 vb.) aynı anda uygulanır.'
                : 'Seçili işlem sadece belirttiğiniz tekil koliye uygulanır.'}
            </p>
          </div>

          {/* Action Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              İşlem Türü
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setChangeType('ADD')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border-2 transition flex items-center justify-center space-x-1 ${
                  changeType === 'ADD'
                    ? 'bg-emerald-600 border-emerald-700 text-white shadow-sm'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-400'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Stok Ekle (+)</span>
              </button>

              <button
                type="button"
                onClick={() => setChangeType('SUBTRACT')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border-2 transition flex items-center justify-center space-x-1 ${
                  changeType === 'SUBTRACT'
                    ? 'bg-rose-600 border-rose-700 text-white shadow-sm'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-rose-400'
                }`}
              >
                <ArrowDownRight className="w-4 h-4" />
                <span>Stok Düş (-)</span>
              </button>

              <button
                type="button"
                onClick={() => setChangeType('SET_EXACT')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold border-2 transition flex items-center justify-center space-x-1 ${
                  changeType === 'SET_EXACT'
                    ? 'bg-blue-600 border-blue-700 text-white shadow-sm'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-blue-400'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Net Sayı Sabitle</span>
              </button>
            </div>
          </div>

          {/* Amount input + Quick increment chips */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              {changeType === 'SET_EXACT' ? 'Yeni Net Stok Sayısı' : 'Adet Miktarı'}
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="0"
                required
                value={amount}
                onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full text-center text-xl font-black rounded-xl border-2 border-gray-300 px-3 py-2.5 focus:border-amber-500 focus:outline-none"
              />
              <div className="flex space-x-1">
                <button
                  type="button"
                  onClick={() => handleQuickAmount(1)}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-xs"
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAmount(5)}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-xs"
                >
                  +5
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAmount(10)}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-xs"
                >
                  +10
                </button>
              </div>
            </div>
          </div>

          {/* Reason / Note */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              İşlem Nedeni / Açıklama (Sevkiyat, Satın Alma, Sayım vb.)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Örn: Fabrikadan Yeni Koli Girişi - Sipariş #209"
              className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-lg shadow-sm flex items-center space-x-2 transition"
            >
              <Check className="w-4 h-4" />
              <span>İşlemi Onayla & Stoğu Güncelle</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
