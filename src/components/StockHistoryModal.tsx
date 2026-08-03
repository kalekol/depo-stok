import React, { useState } from 'react';
import { StockLogItem } from '../types';
import { X, History, Camera, Keyboard, User, ArrowDownRight, ArrowUpRight, Search, Download } from 'lucide-react';

interface StockHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: StockLogItem[];
  onClearHistory: () => void;
}

export const StockHistoryModal: React.FC<StockHistoryModalProps> = ({
  isOpen,
  onClose,
  logs,
  onClearHistory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'BARCODE_CAMERA' | 'BARCODE_USB' | 'MANUAL'>('ALL');

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.koliName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.koliBarcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.reason.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSource = sourceFilter === 'ALL' || log.source === sourceFilter;
    return matchesSearch && matchesSource;
  });

  const exportLogsToCSV = () => {
    const headers = [
      'Tarih & Saat',
      'Ürün Adı',
      'Koli Adı',
      'Barkod No',
      'İşlem Türü',
      'Miktar Değişimi',
      'Önceki Stok',
      'Yeni Stok',
      'İşlem Kaynağı',
      'Açıklama / Seviye',
    ];
    const rows = [
      headers,
      ...filteredLogs.map((item) => [
        `"${new Date(item.timestamp).toLocaleString('tr-TR')}"`,
        `"${item.productName.replace(/"/g, '""')}"`,
        `"${item.koliName.replace(/"/g, '""')}"`,
        `"${item.koliBarcode}"`,
        `"${item.action}"`,
        item.quantityChange.toString(),
        item.previousQty.toString(),
        item.newQty.toString(),
        `"${item.source}"`,
        `"${item.reason.replace(/"/g, '""')}"`,
      ]),
    ];
    const csvContent = rows.map((e) => e.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `depo_stok_tarihcesi_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-900 text-white border-b border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Depo Stok Hareketi ve Tarama Geçmişi</h3>
              <p className="text-xs text-gray-400">
                Tüm barkod okumaları, manuel girişler ve sevkiyat kayıtları
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

        {/* Filter bar */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ürün adı, koli, barkod no veya açıklama ara..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 bg-white text-xs focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={sourceFilter}
              onChange={(e) =>
                setSourceFilter(
                  e.target.value as 'ALL' | 'BARCODE_CAMERA' | 'BARCODE_USB' | 'MANUAL'
                )
              }
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold"
            >
              <option value="ALL">Tüm Kaynaklar</option>
              <option value="BARCODE_CAMERA">📷 Kamera / QR Okuyucu</option>
              <option value="BARCODE_USB">⚡ Lazer / USB Barkod</option>
              <option value="MANUAL">✏️ Manuel Giriş</option>
            </select>

            <button
              onClick={exportLogsToCSV}
              className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-sm transition"
              title="CSV olarak indir"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV İndir</span>
            </button>
          </div>
        </div>

        {/* List of Logs */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              Bu kriterlere uygun stok işlem kaydı bulunmuyor.
            </div>
          ) : (
            filteredLogs.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-gray-200 rounded-xl p-3.5 hover:shadow-sm transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-lg bg-gray-100 text-gray-700 flex-shrink-0 mt-0.5">
                    {item.source === 'BARCODE_CAMERA' ? (
                      <Camera className="w-4 h-4 text-emerald-600" />
                    ) : item.source === 'BARCODE_USB' ? (
                      <Keyboard className="w-4 h-4 text-amber-600" />
                    ) : (
                      <User className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-gray-900 text-sm">{item.productName}</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-700 border border-gray-200">
                        {item.koliBarcode}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 font-medium mt-0.5">{item.koliName}</div>
                    <div className="text-[11px] text-gray-400 mt-1 flex items-center space-x-2">
                      <span>{new Date(item.timestamp).toLocaleString('tr-TR')}</span>
                      <span>•</span>
                      <span>{item.reason}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-4">
                  <div className="text-right">
                    <div
                      className={`text-sm font-black flex items-center justify-end space-x-0.5 ${
                        item.quantityChange > 0
                          ? 'text-emerald-600'
                          : item.quantityChange < 0
                          ? 'text-rose-600'
                          : 'text-gray-700'
                      }`}
                    >
                      {item.quantityChange > 0 ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                      <span>
                        {item.quantityChange > 0 ? `+${item.quantityChange}` : item.quantityChange}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Stok: {item.previousQty} ➔ <strong className="text-gray-800">{item.newQty}</strong>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500">
          <span>Toplam {filteredLogs.length} adet işlem listeleniyor</span>
          <div className="flex space-x-3">
            <button
              onClick={() => {
                if (window.confirm('Tüm geçmiş kayıtları silmek istediğinize emin misiniz?')) {
                  onClearHistory();
                }
              }}
              className="text-rose-600 hover:text-rose-700 font-semibold"
            >
              Geçmişi Temizle
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded-lg"
            >
              Kapat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
