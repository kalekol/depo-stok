import React, { useState, useEffect, useRef } from 'react';
import { Product, PackageItem, StockLogItem, ScanActionType } from '../types';
import { calculateCompleteSet } from '../lib/setCalculator';
import { soundEffects } from '../lib/sound';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  X,
  Camera,
  CameraOff,
  Barcode,
  ArrowDownCircle,
  ArrowUpCircle,
  Search,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  VolumeX,
  Keyboard,
  PackageCheck,
} from 'lucide-react';

interface QuickScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onScanAction: (
    product: Product,
    pkg: PackageItem,
    actionType: ScanActionType,
    source: 'BARCODE_CAMERA' | 'BARCODE_USB' | 'MANUAL'
  ) => { updatedProduct: Product; logItem: StockLogItem | null };
}

interface LastScanResult {
  product: Product;
  pkg: PackageItem;
  actionType: ScanActionType;
  oldQty: number;
  newQty: number;
  completeSets: number;
  missingPackages: {
    koliIndex: number;
    koliName: string;
    missingCount: number;
  }[];
  timestamp: string;
}

export const QuickScanModal: React.FC<QuickScanModalProps> = ({
  isOpen,
  onClose,
  products,
  onScanAction,
}) => {
  const [scanMode, setScanMode] = useState<ScanActionType>('IN'); // 'IN' = Stok Girişi (+1), 'OUT' = Stok Çıkışı (-1), 'INFO' = Sorgula
  const [inputSource, setInputSource] = useState<'CAMERA' | 'USB_KEYBOARD'>('USB_KEYBOARD');
  const [manualBarcode, setManualBarcode] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Scan History in this session
  const [sessionScans, setSessionScans] = useState<LastScanResult[]>([]);
  const [lastScan, setLastScan] = useState<LastScanResult | null>(null);
  const [notFoundAlert, setNotFoundAlert] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  // Auto focus USB/Keyboard input when USB mode is active
  useEffect(() => {
    if (isOpen && inputSource === 'USB_KEYBOARD') {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, inputSource]);

  // Clean up camera on modal close
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (html5QrcodeRef.current) {
        await stopCamera();
      }
      const scanner = new Html5Qrcode('qr-reader-container', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ],
        verbose: false,
      });

      html5QrcodeRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 260, height: 160 },
        },
        (decodedText) => {
          handleBarcodeScanned(decodedText.trim(), 'BARCODE_CAMERA');
        },
        () => {
          // Ignore scanning frame errors
        }
      );
      setIsCameraActive(true);
    } catch (err: unknown) {
      console.error('Camera start failed:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setCameraError('Kamera başlatılamadı. Cihaz izinlerini kontrol edin veya Lazer/USB modunu kullanın.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      try {
        await html5QrcodeRef.current.stop();
        await html5QrcodeRef.current.clear();
      } catch (e) {
        console.warn('Error stopping camera:', e);
      }
    }
    setIsCameraActive(false);
  };

  const toggleCamera = () => {
    if (isCameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  // Find product and koli matching barcode
  const handleBarcodeScanned = (
    scannedBarcode: string,
    source: 'BARCODE_CAMERA' | 'BARCODE_USB' | 'MANUAL'
  ) => {
    if (!scannedBarcode) return;
    setNotFoundAlert(null);

    let foundProduct: Product | undefined;
    let foundPkg: PackageItem | undefined;

    for (const prod of products) {
      for (const pkg of prod.packages) {
        if (
          pkg.barcode.toLowerCase() === scannedBarcode.toLowerCase() ||
          pkg.koliId.toLowerCase() === scannedBarcode.toLowerCase() ||
          prod.sku.toLowerCase() === scannedBarcode.toLowerCase()
        ) {
          foundProduct = prod;
          foundPkg = pkg;
          break;
        }
      }
      if (foundProduct) break;
    }

    if (!foundProduct || !foundPkg) {
      if (soundEnabled) soundEffects.playErrorBuzz();
      setNotFoundAlert(`"${scannedBarcode}" barkoduna sahip herhangi bir koli veya ürün sistemde bulunamadı.`);
      setManualBarcode('');
      return;
    }

    // Play sound based on mode
    if (soundEnabled) {
      if (scanMode === 'IN') {
        soundEffects.playSuccessBeep();
      } else if (scanMode === 'OUT') {
        soundEffects.playOutBeep();
      } else {
        soundEffects.playSuccessBeep();
      }
    }

    const oldQty = foundPkg.quantity;
    const { updatedProduct } = onScanAction(foundProduct, foundPkg, scanMode, source);

    // Calculate new complete set count
    const setStatus = calculateCompleteSet(updatedProduct);
    const updatedPkg = updatedProduct.packages.find((p) => p.koliId === foundPkg.koliId) || foundPkg;

    const result: LastScanResult = {
      product: updatedProduct,
      pkg: updatedPkg,
      actionType: scanMode,
      oldQty,
      newQty: updatedPkg.quantity,
      completeSets: setStatus.completeSets,
      missingPackages: setStatus.missingPackagesForNextSet,
      timestamp: new Date().toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    };

    setLastScan(result);
    setSessionScans((prev) => [result, ...prev.slice(0, 19)]); // Keep last 20 scans
    setManualBarcode('');

    // Re-focus input if USB mode
    if (inputSource === 'USB_KEYBOARD') {
      inputRef.current?.focus();
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    handleBarcodeScanned(manualBarcode.trim(), 'BARCODE_USB');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-gray-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gray-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
              <Barcode className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Hızlı Barkod Taraması & Koli İşlem Terminali</h3>
              <p className="text-xs text-gray-400">
                iOS Kamera, PC Webcam veya Lazer / USB Barkod Okuyucu ile anında stok güncelleyin
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
              title={soundEnabled ? 'Sesli Uyarı Açık' : 'Sesli Uyarı Kapalı'}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5 text-amber-400" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scan Mode Toggle: IN (+1) / OUT (-1) / INFO */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            1. İşlem Modunu Seçin:
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setScanMode('IN')}
              className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-bold text-sm border-2 transition ${
                scanMode === 'IN'
                  ? 'bg-emerald-600 border-emerald-700 text-white shadow-md'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-500'
              }`}
            >
              <ArrowDownCircle className="w-5 h-5" />
              <span>STOK GİRİŞİ (+1)</span>
            </button>

            <button
              type="button"
              onClick={() => setScanMode('OUT')}
              className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-bold text-sm border-2 transition ${
                scanMode === 'OUT'
                  ? 'bg-rose-600 border-rose-700 text-white shadow-md'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-rose-500'
              }`}
            >
              <ArrowUpCircle className="w-5 h-5" />
              <span>SEVKİYAT / ÇIKIŞ (-1)</span>
            </button>

            <button
              type="button"
              onClick={() => setScanMode('INFO')}
              className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-bold text-sm border-2 transition ${
                scanMode === 'INFO'
                  ? 'bg-blue-600 border-blue-700 text-white shadow-md'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-blue-500'
              }`}
            >
              <Search className="w-5 h-5" />
              <span>STOK SORGULA</span>
            </button>
          </div>
        </div>

        {/* Input Source Selector & Reader Area */}
        <div className="p-5 flex-1 overflow-y-auto">
          {/* Input Source Tabs */}
          <div className="flex space-x-2 mb-4">
            <button
              type="button"
              onClick={() => {
                setInputSource('USB_KEYBOARD');
                stopCamera();
              }}
              className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg text-sm font-semibold border ${
                inputSource === 'USB_KEYBOARD'
                  ? 'bg-amber-500/10 border-amber-500 text-amber-800'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Keyboard className="w-4 h-4 text-amber-600" />
              <span>USB / Lazer Barkod Tabancası & Manuel</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setInputSource('CAMERA');
                startCamera();
              }}
              className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg text-sm font-semibold border ${
                inputSource === 'CAMERA'
                  ? 'bg-amber-500/10 border-amber-500 text-amber-800'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Camera className="w-4 h-4 text-amber-600" />
              <span>iOS & Mobil Kamera Tarayıcı</span>
            </button>
          </div>

          {/* USB / KEYBOARD INPUT MODE */}
          {inputSource === 'USB_KEYBOARD' && (
            <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 mb-4">
              <form onSubmit={handleFormSubmit} className="flex space-x-2">
                <div className="relative flex-1">
                  <Barcode className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value)}
                    placeholder="Barkod okutun veya numarayı yazıp Enter'a basın (örn: 8690100100018)..."
                    className="w-full pl-11 pr-4 py-3 rounded-lg border-2 border-amber-400 focus:border-amber-600 focus:outline-none text-base font-mono bg-white text-gray-900 shadow-sm"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-sm transition"
                >
                  Okut
                </button>
              </form>
              <div className="flex items-center justify-between text-xs text-gray-500 mt-2 px-1">
                <span>⚡ USB barkod okuyucunuz her tarama sonunda otomatik olarak Enter gönderir.</span>
                <span className="font-semibold text-amber-700">İpucu: Örnek barkod: 8690100100018</span>
              </div>
            </div>
          )}

          {/* CAMERA SCANNER MODE */}
          {inputSource === 'CAMERA' && (
            <div className="bg-gray-900 rounded-xl p-4 mb-4 text-white flex flex-col items-center">
              <div
                id="qr-reader-container"
                className="w-full max-w-sm rounded-lg overflow-hidden bg-black min-h-[220px] flex items-center justify-center border border-gray-700"
              />
              <div className="flex items-center justify-between w-full mt-3">
                <span className="text-xs text-gray-400">
                  {isCameraActive ? '📷 Kamera aktif - Barkodu ortalayın' : 'Kamera durdu'}
                </span>
                <button
                  type="button"
                  onClick={toggleCamera}
                  className={`flex items-center space-x-2 px-4 py-1.5 rounded-lg text-xs font-semibold ${
                    isCameraActive
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {isCameraActive ? (
                    <>
                      <CameraOff className="w-3.5 h-3.5" />
                      <span>Kamerayı Durdur</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-3.5 h-3.5" />
                      <span>Kamerayı Aç</span>
                    </>
                  )}
                </button>
              </div>
              {cameraError && (
                <div className="mt-3 p-3 bg-rose-900/50 border border-rose-700 rounded-lg text-xs text-rose-200 w-full">
                  {cameraError}
                </div>
              )}
            </div>
          )}

          {/* Not Found Alert */}
          {notFoundAlert && (
            <div className="p-4 mb-4 bg-rose-50 border-2 border-rose-300 rounded-xl flex items-center space-x-3 text-rose-800 animate-shake">
              <AlertTriangle className="w-6 h-6 text-rose-600 flex-shrink-0" />
              <div className="text-sm font-medium">{notFoundAlert}</div>
            </div>
          )}

          {/* Last Scan Success Card */}
          {lastScan && (
            <div
              className={`p-5 rounded-2xl border-2 mb-4 shadow-sm transition-all ${
                lastScan.actionType === 'IN'
                  ? 'bg-emerald-50/80 border-emerald-400'
                  : lastScan.actionType === 'OUT'
                  ? 'bg-rose-50/80 border-rose-400'
                  : 'bg-blue-50/80 border-blue-400'
              }`}
            >
              <div className="flex items-start justify-between border-b border-black/10 pb-3 mb-3">
                <div className="flex items-center space-x-2">
                  <CheckCircle2
                    className={`w-6 h-6 ${
                      lastScan.actionType === 'IN'
                        ? 'text-emerald-600'
                        : lastScan.actionType === 'OUT'
                        ? 'text-rose-600'
                        : 'text-blue-600'
                    }`}
                  />
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      {lastScan.actionType === 'IN'
                        ? 'STOK GİRİŞİ BAŞARILI'
                        : lastScan.actionType === 'OUT'
                        ? 'STOK ÇIKIŞI BAŞARILI'
                        : 'STOK BİLGİ SORGULANDI'}{' '}
                      • {lastScan.timestamp}
                    </div>
                    <div className="text-lg font-black text-gray-900">{lastScan.product.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 bg-gray-900 text-amber-400 text-xs font-black rounded-md">
                    KOLİ {lastScan.pkg.koliIndex}/{lastScan.product.packages.length}
                  </span>
                  <div className="text-[11px] font-mono text-gray-500 mt-1">{lastScan.pkg.barcode}</div>
                </div>
              </div>

              {/* Koli Name & Quantity change */}
              <div className="grid grid-cols-2 gap-4 items-center mb-3">
                <div>
                  <div className="text-xs text-gray-500 font-semibold">Okunan Koli İçeriği:</div>
                  <div className="text-sm font-bold text-gray-800">{lastScan.pkg.name}</div>
                  <div className="text-xs text-gray-500">Depo: {lastScan.product.location}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 font-semibold">Koli Stok Adedi:</div>
                  <div className="flex items-center justify-end space-x-2">
                    <span className="text-base text-gray-400 font-medium line-through">
                      {lastScan.oldQty}
                    </span>
                    <span className="text-2xl font-black text-gray-900">{lastScan.newQty}</span>
                    <span className="text-xs font-bold text-gray-500">adet</span>
                  </div>
                </div>
              </div>

              {/* Tam Takım Durumu (Set Analysis) */}
              <div className="bg-white/80 rounded-xl p-3 border border-gray-200">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                  <span className="flex items-center gap-1.5">
                    <PackageCheck className="w-4 h-4 text-amber-600" />
                    <span>Sevk Edilebilir Tam Takım Sayısı:</span>
                  </span>
                  <span className="text-sm font-black text-amber-600">
                    {lastScan.completeSets} TAKIM HAZIR
                  </span>
                </div>

                {lastScan.missingPackages.length > 0 && (
                  <div className="mt-2 text-xs text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                    <strong>Eksik Koliler (Bir sonraki tam set için):</strong>{' '}
                    {lastScan.missingPackages
                      .map((mp) => `Koli ${mp.koliIndex} (${mp.missingCount} adet eksik)`)
                      .join(', ')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Session Scan History List */}
          {sessionScans.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs font-semibold text-gray-500 mb-2">
                <span>BU OTURUMDA OKUNAN BARKODLAR ({sessionScans.length})</span>
                <button
                  type="button"
                  onClick={() => {
                    setSessionScans([]);
                    setLastScan(null);
                  }}
                  className="text-amber-600 hover:text-amber-700"
                >
                  Listeyi Temizle
                </button>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {sessionScans.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          item.actionType === 'IN'
                            ? 'bg-emerald-500'
                            : item.actionType === 'OUT'
                            ? 'bg-rose-500'
                            : 'bg-blue-500'
                        }`}
                      />
                      <span className="font-bold text-gray-800">{item.product.name}</span>
                      <span className="text-gray-500">
                        (Koli {item.pkg.koliIndex}/{item.product.packages.length})
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-gray-500">{item.pkg.barcode}</span>
                      <span className="font-bold text-gray-900">
                        {item.oldQty} ➔ {item.newQty}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500">
          <span>
            Tarama modu:{' '}
            <strong className="text-gray-700">
              {scanMode === 'IN'
                ? 'Stok Girişi (+1)'
                : scanMode === 'OUT'
                ? 'Stok Çıkışı (-1)'
                : 'Bilgi Sorgula'}
            </strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white font-semibold rounded-lg transition"
          >
            Tamam & Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
