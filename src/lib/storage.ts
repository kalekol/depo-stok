import { Product, StockLogItem, CategoryItem } from '../types';
import { INITIAL_PRODUCTS } from '../data/mockProducts';

const STORAGE_KEY_PRODUCTS = 'mobilya_stok_takip_products_v1';
const STORAGE_KEY_LOGS = 'mobilya_stok_takip_logs_v1';
const STORAGE_KEY_CATEGORIES = 'mobilya_stok_takip_categories_v1';

const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: 'cat-1', name: 'Gardırop & Dolap' },
  { id: 'cat-2', name: 'Yemek Odası' },
  { id: 'cat-3', name: 'Oturma Odası' },
  { id: 'cat-4', name: 'Çalışma Odası' },
  { id: 'cat-5', name: 'Yatak Odası' },
  { id: 'cat-6', name: 'Diğer' },
];

export function loadCategoriesFromStorage(): CategoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CATEGORIES);
    if (!raw) {
      saveCategoriesToStorage(DEFAULT_CATEGORIES);
      return DEFAULT_CATEGORIES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_CATEGORIES;
  } catch (e) {
    console.warn('Error loading categories from storage:', e);
    return DEFAULT_CATEGORIES;
  }
}

export function saveCategoriesToStorage(categories: CategoryItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CATEGORIES, JSON.stringify(categories));
  } catch (e) {
    console.error('Error saving categories to localStorage:', e);
  }
}

export function loadProductsFromStorage(): Product[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (e) {
    console.warn('Error loading products from storage:', e);
    return [];
  }
}

export function saveProductsToStorage(products: Product[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
  } catch (e) {
    console.error('Error saving products to localStorage:', e);
  }
}

export function loadLogsFromStorage(): StockLogItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOGS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function saveLogsToStorage(logs: StockLogItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
  } catch (e) {
    console.error('Error saving logs:', e);
  }
}

export function resetToDemoData(): { products: Product[]; logs: StockLogItem[]; categories: CategoryItem[] } {
  saveProductsToStorage([]);
  saveCategoriesToStorage(DEFAULT_CATEGORIES);
  const logs: StockLogItem[] = [];
  saveLogsToStorage(logs);
  return { products: [], logs, categories: DEFAULT_CATEGORIES };
}

/**
 * Exports product summary as a readable CSV string for Excel / Sheets (1 row per product)
 */
export function exportProductSummaryCSV(products: Product[]): string {
  const headers = [
    'Ürün Adı',
    'Kategori',
    'Koli Çeşidi',
    'Hazır Tam Takım Sayısı',
    'Toplam Fiziksel Koli',
    'Durum',
  ];

  const rows: string[][] = [headers];

  for (const prod of products) {
    const totalPkg = prod.packages.length;
    let minSet = Infinity;
    let totalPhysicalBoxes = 0;
    for (const p of prod.packages) {
      if (p.quantity < minSet) minSet = p.quantity;
      totalPhysicalBoxes += p.quantity;
    }
    if (minSet === Infinity) minSet = 0;

    const statusText = minSet > 0 ? 'Tam Takım Hazır' : 'Eksik / Hazır Değil';

    rows.push([
      `"${prod.name.replace(/"/g, '""')}"`,
      `"${prod.category}"`,
      `${totalPkg} Koli`,
      minSet.toString(),
      totalPhysicalBoxes.toString(),
      `"${statusText}"`,
    ]);
  }

  return rows.map((r) => r.join(';')).join('\n');
}

/**
 * Exports detailed koli stock as a readable CSV string for Excel / Sheets (1 row per koli)
 */
export function exportPackageDetailCSV(products: Product[]): string {
  const headers = [
    'Ürün Adı',
    'Kategori',
    'Koli Sırası',
    'Koli Adı',
    'Koli Barkodu',
    'Koli Stok Adedi',
    'Takım Durumu',
  ];

  const rows: string[][] = [headers];

  for (const prod of products) {
    const totalPkg = prod.packages.length;
    let minSet = Infinity;
    for (const p of prod.packages) {
      if (p.quantity < minSet) minSet = p.quantity;
    }
    if (minSet === Infinity) minSet = 0;

    for (const pkg of prod.packages) {
      const isMissing = pkg.quantity < minSet || (minSet === 0 && pkg.quantity === 0);
      const statusText = isMissing ? 'Eksik Koli' : 'Yeterli';

      rows.push([
        `"${prod.name.replace(/"/g, '""')}"`,
        `"${prod.category}"`,
        `${pkg.koliIndex}/${totalPkg}`,
        `"${pkg.name.replace(/"/g, '""')}"`,
        `"${pkg.barcode}"`,
        pkg.quantity.toString(),
        `"${statusText}"`,
      ]);
    }
  }

  return rows.map((r) => r.join(';')).join('\n');
}

/**
 * Exports products and boxes as a readable CSV string for Excel / Sheets
 */
export function exportToCSV(products: Product[]): string {
  return exportPackageDetailCSV(products);
}
