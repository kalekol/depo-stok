import { Product, CompleteSetStatus } from '../types';

/**
 * Calculates the complete set status for a multi-package furniture product.
 * Example: A Dolabı has 3 koliler:
 * Koli 1: qty 10, Koli 2: qty 8, Koli 3: qty 12 -> Complete Sets = 8, bottleneck = Koli 2.
 */
export function calculateCompleteSet(product: Product): CompleteSetStatus {
  if (!product.packages || product.packages.length === 0) {
    return {
      productId: product.id,
      totalPackages: 0,
      completeSets: 0,
      maxPackageQty: 0,
      missingPackagesToReachMax: [],
      missingPackagesForNextSet: [],
    };
  }

  // Find minimum and maximum quantity among all packages
  let minQty = Infinity;
  let maxQty = -Infinity;
  let bottleneckIndex: number | undefined = undefined;

  for (const pkg of product.packages) {
    if (pkg.quantity < minQty) {
      minQty = pkg.quantity;
      bottleneckIndex = pkg.koliIndex;
    }
    if (pkg.quantity > maxQty) {
      maxQty = pkg.quantity;
    }
  }

  if (minQty === Infinity || minQty < 0) minQty = 0;
  if (maxQty === -Infinity || maxQty < 0) maxQty = 0;

  // Calculate missing packages needed to get (minQty + 1) complete sets
  const nextTargetSet = minQty + 1;
  const missingPackagesForNextSet = product.packages
    .filter((pkg) => pkg.quantity < nextTargetSet)
    .map((pkg) => ({
      koliIndex: pkg.koliIndex,
      koliName: pkg.name,
      missingCount: nextTargetSet - pkg.quantity,
    }));

  // Calculate missing packages needed to match the highest package quantity (maxQty)
  const missingPackagesToReachMax = product.packages
    .filter((pkg) => pkg.quantity < maxQty)
    .map((pkg) => ({
      koliIndex: pkg.koliIndex,
      koliName: pkg.name,
      missingCount: maxQty - pkg.quantity,
      currentQty: pkg.quantity,
      targetQty: maxQty,
    }));

  return {
    productId: product.id,
    totalPackages: product.packages.length,
    completeSets: minQty,
    bottleneckKoliIndex: bottleneckIndex,
    maxPackageQty: maxQty,
    missingPackagesToReachMax,
    missingPackagesForNextSet,
  };
}

/**
 * Global Warehouse Stats summary
 */
export function calculateWarehouseStats(products: Product[]) {
  let totalProducts = products.length;
  let totalKoliTypes = 0;
  let totalPhysicalKoliCount = 0;
  let totalCompleteSets = 0;
  let incompleteProductsCount = 0; // Products where some packages are missing compared to maxQty or 0 sets

  for (const prod of products) {
    totalKoliTypes += prod.packages.length;
    const setStatus = calculateCompleteSet(prod);
    totalCompleteSets += setStatus.completeSets;

    for (const pkg of prod.packages) {
      totalPhysicalKoliCount += pkg.quantity;
    }

    // A product is considered incomplete/warning if it has missing packages to reach max (uneven stocks)
    // or if its completeSets is 0 while having any boxes
    if (setStatus.missingPackagesToReachMax.length > 0 || setStatus.completeSets === 0) {
      incompleteProductsCount++;
    }
  }

  return {
    totalProducts,
    totalKoliTypes,
    totalPhysicalKoliCount,
    totalCompleteSets,
    incompleteProductsCount,
  };
}
