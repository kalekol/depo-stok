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
  Upload,
  Plus,
  Edit3,
  Sliders,
  Link as LinkIcon,
  Zap,
  ZapOff,
} from 'lucide-react';

interface QuickScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onScanAction: (
    product: Product,
    pkg: PackageItem,
    actionType: ScanActionType,
    source: 'BARCODE_CAMERA' | 'BARCODE_USB' | 'MANUAL',
    targetQty?: number
  ) => { updatedProduct: Product; logItem: StockLogItem | null };
  onOpenAddProductWithBarcode?: (barcode: string) => void;
  onOpenEditProduct?: (product: Product) => void;
  onOpenStockAdjust?: (product: Product, pkg: PackageItem) => void;
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
  onOpenAddProductWithBarcode,
  onOpenEditProduct,
  onOpenStockAdjust,
}) => {
  const [scanMode, setScanMode] = useState<ScanActionType>('IN'); // 'IN' = Stok Girişi (+1), 'OUT' = Stok Çıkışı (-1), 'SET' = Miktar Düzenle, 'INFO' = Sorgula
  const [inputSource, setInputSource] = useState<'CAMERA' | 'USB_KEYBOARD'>('USB_KEYBOARD');
  const [manualBarcode, setManualBarcode] = useState<string>('');
  const [targetSetQty, setTargetSetQty] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [availableCameras, setAvailableCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [hasFlash, setHasFlash] = useState<boolean>(false);
  const [isFlashOn, setIsFlashOn] = useState<boolean>(false);

  // Scan History in this session
  const [sessionScans, setSessionScans] = useState<LastScanResult[]>([]);
  const [lastScan, setLastScan] = useState<LastScanResult | null>(null);
  const [unmatchedBarcode, setUnmatchedBarcode] = useState<string | null>(null);
  const [notFoundAlert, setNotFoundAlert] = useState<string | null>(null);

  // Inline Barcode Assignment Drawer state
  const [showAssignDrawer, setShowAssignDrawer] = useState<boolean>(false);
  const [selectedAssignProdId, setSelectedAssignProdId] = useState<string>('');
  const [selectedAssignKoliId, setSelectedAssignKoliId] = useState<string>('');

  // Inline custom stock adjust for last scanned item
  const [inlineQtyInput, setInlineQtyInput] = useState<string>('');

  const inputRef = useRef<HTMLInputElement>(null);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const lastScannedBarcodeRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);

  // Auto focus USB/Keyboard input when USB mode is active
  useEffect(() => {
    if (isOpen && inputSource === 'USB_KEYBOARD') {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, inputSource]);

  // Handle camera lifecycle when tab or modal state changes
  useEffect(() => {
    let isMounted = true;
    let timer: NodeJS.Timeout;

    if (isOpen && inputSource === 'CAMERA') {
      timer = setTimeout(() => {
        if (isMounted) {
          startCamera(selectedCameraId || undefined);
        }
      }, 200);
    } else {
      stopCamera();
    }

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
      stopCamera();
    };
  }, [isOpen, inputSource]);

  const stopCamera = async () => {
    if (html5QrcodeRef.current) {
      try {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop();
        }
        await html5QrcodeRef.current.clear();
      } catch (e) {
        console.warn('Camera stop warning:', e);
      }
      html5QrcodeRef.current = null;
    }
    setIsCameraActive(false);
    setIsFlashOn(false);
  };

  const startCamera = async (targetCameraId?: string) => {
    setCameraError(null);

    // Verify DOM element exists before attempting scanner attachment
    const container = document.getElementById('qr-reader-container');
    if (!container) {
      console.warn('qr-reader-container element not mounted in DOM yet.');
      return;
    }

    try {
      await stopCamera();

      const scanner = new Html5Qrcode('qr-reader-container', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.AZTEC,
          Html5QrcodeSupportedFormats.CODABAR,
        ],
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      });

      html5QrcodeRef.current = scanner;

      const config = {
        fps: 20,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const width = Math.min(viewfinderWidth - 10, Math.floor(viewfinderWidth * 0.95));
          const height = Math.min(viewfinderHeight - 10, Math.floor(viewfinderHeight * 0.65));
          return {
            width: Math.max(width, 240),
            height: Math.max(height, 140),
          };
        },
        aspectRatio: 1.333333,
        disableFlip: false,
      };

      const onSuccess = (decodedText: string) => {
        const cleanCode = decodedText.trim();
        const now = Date.now();
        // Prevent rapid duplicate scans within 1.5 seconds
        if (
          lastScannedBarcodeRef.current === cleanCode &&
          now - lastScannedTimeRef.current < 1500
        ) {
          return;
        }
        lastScannedBarcodeRef.current = cleanCode;
        lastScannedTimeRef.current = now;

        handleBarcodeScanned(cleanCode, 'BARCODE_CAMERA');
      };

      const onError = () => {
        // Continuous frame analysis logs ignored
      };

      const cameraConstraints = targetCameraId
        ? targetCameraId
        : {
            facingMode: 'environment',
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
          };

      try {
        await scanner.start(cameraConstraints, config, onSuccess, onError);
      } catch (envErr) {
        console.warn('Environment facing mode failed, falling back to camera devices list:', envErr);
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          const preferredCam =
            devices.find(
              (d) =>
                d.label.toLowerCase().includes('back') ||
                d.label.toLowerCase().includes('rear') ||
                d.label.toLowerCase().includes('arka')
            ) || devices[0];
          setSelectedCameraId(preferredCam.id);
          await scanner.start(preferredCam.id, config, onSuccess, onError);
        } else {
          await scanner.start({ facingMode: 'user' }, config, onSuccess, onError);
        }
      }

      setIsCameraActive(true);

      // Fetch list of cameras for user selection UI
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          setAvailableCameras(devices);
        }
      } catch (e) {
        // Camera enumeration ignored
      }

      // Check for torch capability
      try {
        const capabilities = scanner.getRunningTrackCapabilities();
        if (capabilities && 'torch' in capabilities) {
          setHasFlash(true);
        }
      } catch (e) {
        // Torch capability check ignored
      }
    } catch (err: unknown) {
      console.error('Camera start error:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (
        errMsg.toLowerCase().includes('permission') ||
        errMsg.toLowerCase().includes('notallowed') ||
        errMsg.toLowerCase().includes('denied')
      ) {
        setCameraError(
          'Kamera erişim izni engellendi. Lütfen tarayıcı adres çubuğundaki kilit ikona dokunup kamera iznini "İzin Ver" olarak değiştirin.'
        );
      } else {
        setCameraError(
          `Kamera başlatılamadı (${errMsg}). Lütfen cihaz kamerasının başka bir uygulama tarafından kullanılmadığından emin olun veya USB/Manuel modunu tercih edin.`
        );
      }
      setIsCameraActive(false);
    }
  };

  const toggleCamera = () => {
    if (isCameraActive) {
      stopCamera();
    } else {
      startCamera(selectedCameraId || undefined);
    }
  };

  const toggleFlashlight = async () => {
    if (!html5QrcodeRef.current || !isCameraActive) return;
    try {
      const nextState = !isFlashOn;
      await html5QrcodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState } as any],
      });
      setIsFlashOn(nextState);
    } catch (e) {
      console.warn('Flashlight toggle error:', e);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setCameraError(null);
    try {
      const html5Qr = new Html5Qrcode('qr-reader-container', {
        verbose: false,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      });
      const decodedText = await html5Qr.scanFile(file, true);
      if (decodedText) {
        handleBarcodeScanned(decodedText.trim(), 'BARCODE_CAMERA');
      }
    } catch (err) {
      console.error('Fotoğraftan barkod okuma hatası:', err);
      setCameraError(
        'Seçilen fotoğraftaki barkod okunamadı. Lütfen barkodun net, tam ve iyi aydınlatılmış olduğundan emin olun.'
      );
    }
  };

  // Find product and koli matching barcode
  const handleBarcodeScanned = (
    scannedBarcode: string,
    source: 'BARCODE_CAMERA' | 'BARCODE_USB' | 'MANUAL'
  ) => {
    if (!scannedBarcode) return;
    setNotFoundAlert(null);
    setUnmatchedBarcode(null);
    setShowAssignDrawer(false);

    let foundProduct: Product | undefined;
    let foundPkg: PackageItem | undefined;

    const query = scannedBarcode.toLowerCase().trim();

    for (const prod of products) {
      for (const pkg of prod.packages) {
        if (
          pkg.barcode.toLowerCase() === query ||
          pkg.koliId.toLowerCase() === query ||
          (prod.sku && prod.sku.toLowerCase() === query)
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
      setNotFoundAlert(`"${scannedBarcode}" barkoduna sahip koli veya ürün bulunamadı.`);
      setUnmatchedBarcode(scannedBarcode);
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
    const targetVal = scanMode === 'SET' && targetSetQty ? parseInt(targetSetQty, 10) : undefined;
    const { updatedProduct } = onScanAction(foundProduct, foundPkg, scanMode, source, targetVal);

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
    setInlineQtyInput(updatedPkg.quantity.toString());
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

  // Perform direct action on last scanned card (+1, -1, or set custom qty)
  const handleQuickCardAction = (
    action: 'IN' | 'OUT' | 'SET',
    customVal?: number
  ) => {
    if (!lastScan) return;
    const { product, pkg } = lastScan;
    const targetValue = action === 'SET' ? customVal : undefined;

    const { updatedProduct } = onScanAction(product, pkg, action, 'MANUAL', targetValue);
    const setStatus = calculateCompleteSet(updatedProduct);
    const updatedPkg = updatedProduct.packages.find((p) => p.koliId === pkg.koliId) || pkg;

    const newResult: LastScanResult = {
      product: updatedProduct,
      pkg: updatedPkg,
      actionType: action,
      oldQty: pkg.quantity,
      newQty: updatedPkg.quantity,
      completeSets: setStatus.completeSets,
      missingPackages: setStatus.missingPackagesForNextSet,
      timestamp: new Date().toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    };

    setLastScan(newResult);
    setInlineQtyInput(updatedPkg.quantity.toString());
    setSessionScans((prev) => [newResult, ...prev.filter((s) => s.pkg.koliId !== pkg.koliId).slice(0, 19)]);
  };

  // Assign unmatched barcode to an existing package
  const handleAssignBarcodeToPackage = () => {
    if (!unmatchedBarcode || !selectedAssignProdId || !selectedAssignKoliId) return;

    const targetProd = products.find((p) => p.id === selectedAssignProdId);
    if (!targetProd) return;

    const targetPkg = targetProd.packages.find((p) => p.koliId === selectedAssignKoliId);
    if (!targetPkg) return;

    // Assign barcode to target package
    const updatedPackages = targetProd.packages.map((pkg) =>
      pkg.koliId === selectedAssignKoliId ? { ...pkg, barcode: unmatchedBarcode } : pkg
    );

    const updatedProduct: Product = {
      ...targetProd,
      packages: updatedPackages,
      updatedAt: new Date().toISOString(),
    };

    // Perform scan action or update
    const { updatedProduct: finalProd } = onScanAction(updatedProduct, { ...targetPkg, barcode: unmatchedBarcode }, 'INFO', 'MANUAL');
    const setStatus = calculateCompleteSet(finalProd);
    const finalPkg = finalProd.packages.find((p) => p.koliId === selectedAssignKoliId) || targetPkg;

    const result: LastScanResult = {
      product: finalProd,
      pkg: finalPkg,
      actionType: 'INFO',
      oldQty: finalPkg.quantity,
      newQty: finalPkg.quantity,
      completeSets: setStatus.completeSets,
      missingPackages: setStatus.missingPackagesForNextSet,
      timestamp: new Date().toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    };

    setLastScan(result);
    setNotFoundAlert(null);
    setUnmatchedBarcode(null);
    setShowAssignDrawer(false);
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
                Kamera, Lazer Okuyucu veya Manuel Giriş ile stok ekleyin, çıkarın veya güncelleyin
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

        {/* Scan Mode Toggle: IN (+1) / OUT (-1) / SET (Miktar Güncelle) / INFO */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            1. Okutma İşlem Modunu Seçin:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setScanMode('IN')}
              className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl font-bold text-xs border-2 transition ${
                scanMode === 'IN'
                  ? 'bg-emerald-600 border-emerald-700 text-white shadow-md'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-500'
              }`}
            >
              <ArrowDownCircle className="w-4 h-4" />
              <span>STOK GİRİŞİ (+1)</span>
            </button>

            <button
              type="button"
              onClick={() => setScanMode('OUT')}
              className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl font-bold text-xs border-2 transition ${
                scanMode === 'OUT'
                  ? 'bg-rose-600 border-rose-700 text-white shadow-md'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-rose-500'
              }`}
            >
              <ArrowUpCircle className="w-4 h-4" />
              <span>SEVKİYAT (-1)</span>
            </button>

            <button
              type="button"
              onClick={() => setScanMode('SET')}
              className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl font-bold text-xs border-2 transition ${
                scanMode === 'SET'
                  ? 'bg-purple-600 border-purple-700 text-white shadow-md'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-purple-500'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>MİKTAR GÜNCELLE</span>
            </button>

            <button
              type="button"
              onClick={() => setScanMode('INFO')}
              className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl font-bold text-xs border-2 transition ${
                scanMode === 'INFO'
                  ? 'bg-blue-600 border-blue-700 text-white shadow-md'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-blue-500'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>SORGULA / DÜZENLE</span>
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
              }}
              className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg text-xs sm:text-sm font-semibold border ${
                inputSource === 'USB_KEYBOARD'
                  ? 'bg-amber-500/10 border-amber-500 text-amber-800'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Keyboard className="w-4 h-4 text-amber-600" />
              <span>USB Barkod Okuyucu & Manuel Giriş</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setInputSource('CAMERA');
              }}
              className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-lg text-xs sm:text-sm font-semibold border ${
                inputSource === 'CAMERA'
                  ? 'bg-amber-500/10 border-amber-500 text-amber-800'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Camera className="w-4 h-4 text-amber-600" />
              <span>Canlı Kamera & Fotoğraftan Tara</span>
            </button>
          </div>

          {/* USB / KEYBOARD INPUT MODE */}
          {inputSource === 'USB_KEYBOARD' && (
            <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 mb-4">
              <form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Barcode className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value)}
                    placeholder="Barkod okutun veya numarayı yazıp Enter'a basın..."
                    className="w-full pl-11 pr-4 py-3 rounded-lg border-2 border-amber-400 focus:border-amber-600 focus:outline-none text-base font-mono bg-white text-gray-900 shadow-sm"
                    autoFocus
                  />
                </div>

                {scanMode === 'SET' && (
                  <div className="w-full sm:w-36">
                    <input
                      type="number"
                      min="0"
                      value={targetSetQty}
                      onChange={(e) => setTargetSetQty(e.target.value)}
                      placeholder="Hedef Adet"
                      className="w-full px-3 py-3 rounded-lg border-2 border-purple-400 focus:border-purple-600 focus:outline-none text-base font-mono bg-white text-gray-900 font-bold"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-sm transition whitespace-nowrap"
                >
                  Okut & İşle
                </button>
              </form>
              <div className="flex items-center justify-between text-xs text-gray-500 mt-2 px-1">
                <span>⚡ Lazer okuyucunuz otomatik Enter gönderir. Manuel numara girip "Okut & İşle" butonuna da basabilirsiniz.</span>
              </div>
            </div>
          )}

          {/* CAMERA SCANNER MODE */}
          {inputSource === 'CAMERA' && (
            <div className="bg-gray-900 rounded-xl p-4 mb-4 text-white flex flex-col items-center">
              <style>{`
                #qr-reader-container video {
                  width: 100% !important;
                  height: auto !important;
                  max-height: 280px;
                  object-fit: cover !important;
                  border-radius: 0.5rem;
                }
                #qr-reader-container img[alt="Info icon"] {
                  display: none !important;
                }
              `}</style>

              <div
                id="qr-reader-container"
                className="w-full max-w-sm rounded-lg overflow-hidden bg-black min-h-[240px] flex items-center justify-center border border-gray-700 relative"
              />

              <div className="flex flex-col sm:flex-row items-center justify-between w-full mt-3 gap-2 flex-wrap">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-300 font-medium">
                    {isCameraActive ? '📷 Canlı kamera aktif - Barkodu hizalayın' : 'Kamera kapalı'}
                  </span>

                  {/* Camera Selection Dropdown */}
                  {availableCameras.length > 1 && (
                    <select
                      value={selectedCameraId}
                      onChange={(e) => {
                        const newCamId = e.target.value;
                        setSelectedCameraId(newCamId);
                        startCamera(newCamId);
                      }}
                      className="bg-gray-800 text-amber-400 text-xs rounded-lg border border-gray-700 px-2 py-1 focus:outline-none"
                    >
                      {availableCameras.map((cam, idx) => (
                        <option key={cam.id} value={cam.id}>
                          {cam.label || `Kamera ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {hasFlash && isCameraActive && (
                    <button
                      type="button"
                      onClick={toggleFlashlight}
                      className={`p-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1 ${
                        isFlashOn
                          ? 'bg-amber-400 text-gray-900 border-amber-300 font-bold'
                          : 'bg-gray-800 text-amber-400 border-gray-700 hover:bg-gray-700'
                      }`}
                      title="Flaş / Işık Aç/Kapat"
                    >
                      {isFlashOn ? <ZapOff className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
                      <span>{isFlashOn ? 'Flaş Kapat' : 'Flaş Aç'}</span>
                    </button>
                  )}

                  <label className="cursor-pointer px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-amber-400 text-xs font-semibold rounded-lg border border-gray-700 transition flex items-center space-x-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Galeriden Tara</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={toggleCamera}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      isCameraActive
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {isCameraActive ? (
                      <>
                        <CameraOff className="w-3.5 h-3.5" />
                        <span>Kapat</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-3.5 h-3.5" />
                        <span>Yeniden Aç</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {cameraError && (
                <div className="mt-3 p-3 bg-rose-900/60 border border-rose-700 rounded-lg text-xs text-rose-200 w-full flex flex-col gap-2">
                  <div>{cameraError}</div>
                  <button
                    type="button"
                    onClick={() => startCamera(selectedCameraId || undefined)}
                    className="self-start px-3 py-1 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded text-xs transition"
                  >
                    Kamerayı Tekrar Dene
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Not Found Alert & Action Panel */}
          {notFoundAlert && (
            <div className="p-4 mb-4 bg-rose-50 border-2 border-rose-300 rounded-xl space-y-3 animate-shake">
              <div className="flex items-center space-x-3 text-rose-800">
                <AlertTriangle className="w-6 h-6 text-rose-600 flex-shrink-0" />
                <div className="text-sm font-bold">{notFoundAlert}</div>
              </div>

              {unmatchedBarcode && (
                <div className="pt-2 border-t border-rose-200 flex flex-col sm:flex-row gap-2">
                  {onOpenAddProductWithBarcode && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenAddProductWithBarcode(unmatchedBarcode);
                      }}
                      className="flex-1 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center justify-center space-x-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Bu Barkod İle Yeni Ürün/Koli Ekle</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowAssignDrawer(!showAssignDrawer)}
                    className="flex-1 py-2 px-3 bg-gray-900 hover:bg-gray-800 text-amber-400 text-xs font-bold rounded-lg shadow-sm transition flex items-center justify-center space-x-1.5"
                  >
                    <LinkIcon className="w-4 h-4" />
                    <span>Mevcut Bir Ürünün Kolisine Bağla</span>
                  </button>
                </div>
              )}

              {/* Inline drawer to bind unmatched barcode */}
              {showAssignDrawer && (
                <div className="bg-white p-3.5 rounded-lg border border-rose-200 text-xs space-y-3 text-gray-900">
                  <div className="font-bold text-gray-800">
                    "{unmatchedBarcode}" barkodunu hangi ürüne ve koliye atamak istiyorsunuz?
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 mb-1">
                        Ürün Seçin:
                      </label>
                      <select
                        value={selectedAssignProdId}
                        onChange={(e) => {
                          setSelectedAssignProdId(e.target.value);
                          const prod = products.find((p) => p.id === e.target.value);
                          if (prod && prod.packages.length > 0) {
                            setSelectedAssignKoliId(prod.packages[0].koliId);
                          }
                        }}
                        className="w-full p-2 border border-gray-300 rounded-lg text-xs font-semibold"
                      >
                        <option value="">-- Ürün Seçiniz --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.category})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-500 mb-1">
                        Koli Seçin:
                      </label>
                      <select
                        value={selectedAssignKoliId}
                        onChange={(e) => setSelectedAssignKoliId(e.target.value)}
                        disabled={!selectedAssignProdId}
                        className="w-full p-2 border border-gray-300 rounded-lg text-xs font-semibold disabled:bg-gray-100"
                      >
                        <option value="">-- Koli Seçiniz --</option>
                        {products
                          .find((p) => p.id === selectedAssignProdId)
                          ?.packages.map((pkg) => (
                            <option key={pkg.koliId} value={pkg.koliId}>
                              {pkg.name} (Mevcut Barkod: {pkg.barcode})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAssignBarcodeToPackage}
                    disabled={!selectedAssignProdId || !selectedAssignKoliId}
                    className="w-full py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 text-white font-bold rounded-lg text-xs transition"
                  >
                    Barkodu Atayarak Stok Güncelle
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Last Scan Success Card & Interactive Actions */}
          {lastScan && (
            <div
              className={`p-5 rounded-2xl border-2 mb-4 shadow-sm transition-all ${
                lastScan.actionType === 'IN'
                  ? 'bg-emerald-50/80 border-emerald-400'
                  : lastScan.actionType === 'OUT'
                  ? 'bg-rose-50/80 border-rose-400'
                  : lastScan.actionType === 'SET'
                  ? 'bg-purple-50/80 border-purple-400'
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
                        : lastScan.actionType === 'SET'
                        ? 'text-purple-600'
                        : 'text-blue-600'
                    }`}
                  />
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      {lastScan.actionType === 'IN'
                        ? 'STOK GİRİŞİ YAPILDI'
                        : lastScan.actionType === 'OUT'
                        ? 'STOK ÇIKIŞI YAPILDI'
                        : lastScan.actionType === 'SET'
                        ? 'MİKTAR GÜNCELLENDİ'
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center mb-4">
                <div>
                  <div className="text-xs text-gray-500 font-semibold">Okunan Koli / Takım:</div>
                  <div className="text-sm font-bold text-gray-800">{lastScan.pkg.name}</div>
                  <div className="text-xs text-gray-500">Kategori: {lastScan.product.category}</div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-xs text-gray-500 font-semibold">Güncel Koli Stok Adedi:</div>
                  <div className="flex items-center sm:justify-end space-x-2">
                    {lastScan.oldQty !== lastScan.newQty && (
                      <span className="text-base text-gray-400 font-medium line-through">
                        {lastScan.oldQty}
                      </span>
                    )}
                    <span className="text-3xl font-black text-gray-900">{lastScan.newQty}</span>
                    <span className="text-xs font-bold text-gray-500">adet</span>
                  </div>
                </div>
              </div>

              {/* DIRECT ACTION CONTROL BAR ON SCANNED ITEM */}
              <div className="pt-3 border-t border-gray-200/80 bg-white/90 p-3 rounded-xl space-y-2">
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Okunan Koli İçin Hızlı İşlemler:
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickCardAction('IN')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-sm transition flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+1 Stok Ekle</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickCardAction('OUT')}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs shadow-sm transition flex items-center space-x-1"
                  >
                    <span>-1 Stok Düş</span>
                  </button>

                  {/* Custom Qty Inline form */}
                  <div className="flex items-center space-x-1 bg-gray-100 p-1 rounded-lg border border-gray-300">
                    <input
                      type="number"
                      min="0"
                      value={inlineQtyInput}
                      onChange={(e) => setInlineQtyInput(e.target.value)}
                      className="w-16 px-2 py-0.5 text-xs font-mono font-bold border border-gray-300 rounded focus:outline-none bg-white text-gray-900"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = parseInt(inlineQtyInput, 10);
                        if (!isNaN(val)) {
                          handleQuickCardAction('SET', Math.max(0, val));
                        }
                      }}
                      className="px-2 py-0.5 bg-purple-700 hover:bg-purple-800 text-white text-[11px] font-bold rounded transition"
                    >
                      Miktar Yap
                    </button>
                  </div>

                  {onOpenEditProduct && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenEditProduct(lastScan.product);
                      }}
                      className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-amber-400 font-bold rounded-lg text-xs transition flex items-center space-x-1 ml-auto"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Ürünü Düzenle</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Tam Takım Durumu (Set Analysis) */}
              <div className="mt-3 bg-white/80 rounded-xl p-3 border border-gray-200">
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
                <span>BU OTURUMDA TARANAN / İŞLENEN BARKODLAR ({sessionScans.length})</span>
                <button
                  type="button"
                  onClick={() => {
                    setSessionScans([]);
                    setLastScan(null);
                  }}
                  className="text-amber-600 hover:text-amber-700 font-bold"
                >
                  Listeyi Temizle
                </button>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {sessionScans.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-xs hover:bg-gray-100/70 transition"
                  >
                    <div className="flex items-center space-x-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          item.actionType === 'IN'
                            ? 'bg-emerald-500'
                            : item.actionType === 'OUT'
                            ? 'bg-rose-500'
                            : item.actionType === 'SET'
                            ? 'bg-purple-500'
                            : 'bg-blue-500'
                        }`}
                      />
                      <span className="font-bold text-gray-800">{item.product.name}</span>
                      <span className="text-gray-500">
                        ({item.pkg.name})
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-gray-500">{item.pkg.barcode}</span>
                      <span className="font-bold text-gray-900">
                        {item.oldQty} ➔ {item.newQty} adet
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
            Tarama Modu:{' '}
            <strong className="text-gray-700">
              {scanMode === 'IN'
                ? 'Stok Girişi (+1)'
                : scanMode === 'OUT'
                ? 'Stok Çıkışı (-1)'
                : scanMode === 'SET'
                ? 'Miktar Güncelle'
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
