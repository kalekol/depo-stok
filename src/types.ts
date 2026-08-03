export interface PackageItem {
  koliId: string; // Unique koli ID e.g., "DLB-A-K01"
  koliIndex: number; // 1-indexed (1, 2, 3...)
  name: string; // e.g., "Koli 1/3", "Koli 2/3"
  barcode: string; // Unique barcode string
  quantity: number; // Current stock count of this specific koli
  weightOrSize?: string; // Optional/Deprecated
}

export interface Product {
  id: string;
  name: string; // e.g., "A Dolabı - 3 Kapaklı Ceviz"
  sku?: string; // Optional/Deprecated
  category: string; // e.g., "Gardırop", "Yemek Masası"
  location?: string; // Optional/Deprecated
  minSetThreshold?: number; // Optional/Deprecated
  packages: PackageItem[]; // List of Koliler (1 to N boxes)
  notes?: string;
  updatedAt: string;
}

export interface CategoryItem {
  id: string;
  name: string;
}

export type ScanActionType = 'IN' | 'OUT' | 'INFO';

export interface StockLogItem {
  id: string;
  timestamp: string;
  productId: string;
  productName: string;
  koliId: string;
  koliName: string;
  koliBarcode: string;
  action: 'IN' | 'OUT' | 'SET_ADJUST';
  quantityChange: number; // e.g., +1, -1, +5
  previousQty: number;
  newQty: number;
  reason: string;
  source: 'BARCODE_CAMERA' | 'BARCODE_USB' | 'MANUAL';
}

export interface CompleteSetStatus {
  productId: string;
  totalPackages: number;
  completeSets: number; // Min quantity among all packages
  bottleneckKoliIndex?: number;
  maxPackageQty: number; // Highest quantity among packages
  missingPackagesToReachMax: {
    koliIndex: number;
    koliName: string;
    missingCount: number;
    currentQty: number;
    targetQty: number;
  }[];
  missingPackagesForNextSet: {
    koliIndex: number;
    koliName: string;
    missingCount: number;
  }[];
}
