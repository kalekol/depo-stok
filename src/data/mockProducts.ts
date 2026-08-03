import { Product } from '../types';

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-alesta-gardirop',
    name: 'Alesta 3 Kapaklı Aynalı Gardırop - Ceviz',
    category: 'Gardırop & Dolap',
    updatedAt: new Date().toISOString(),
    notes: 'Ağır koli grubudur. Koli 3 kırılgan ayna içerir.',
    packages: [
      {
        koliId: 'alesta-k01',
        koliIndex: 1,
        name: 'Koli 1/3',
        barcode: '8690100100018',
        quantity: 14,
      },
      {
        koliId: 'alesta-k02',
        koliIndex: 2,
        name: 'Koli 2/3',
        barcode: '8690100100025',
        quantity: 11,
      },
      {
        koliId: 'alesta-k03',
        koliIndex: 3,
        name: 'Koli 3/3',
        barcode: '8690100100032',
        quantity: 15,
      },
    ],
  },
  {
    id: 'prod-nordic-masa',
    name: 'Nordic Açılabilir Ahşap Yemek Masası - Meşe',
    category: 'Yemek Odası',
    updatedAt: new Date().toISOString(),
    notes: 'Koli 2 içerisinde mekanizma vidaları kontrol edilmeli.',
    packages: [
      {
        koliId: 'nordic-k01',
        koliIndex: 1,
        name: 'Koli 1/2',
        barcode: '8690200200015',
        quantity: 8,
      },
      {
        koliId: 'nordic-k02',
        koliIndex: 2,
        name: 'Koli 2/2',
        barcode: '8690200200022',
        quantity: 8,
      },
    ],
  },
  {
    id: 'prod-verona-koltuk',
    name: 'Verona Lüks Köşe Koltuk Takımı - Antrasit',
    category: 'Oturma Odası',
    updatedAt: new Date().toISOString(),
    notes: '4 Koli tamamlanmadan sevkiyat yapılmamalıdır.',
    packages: [
      {
        koliId: 'verona-k01',
        koliIndex: 1,
        name: 'Koli 1/4',
        barcode: '8690300300012',
        quantity: 6,
      },
      {
        koliId: 'verona-k02',
        koliIndex: 2,
        name: 'Koli 2/4',
        barcode: '8690300300029',
        quantity: 5,
      },
      {
        koliId: 'verona-k03',
        koliIndex: 3,
        name: 'Koli 3/4',
        barcode: '8690300300036',
        quantity: 7,
      },
      {
        koliId: 'verona-k04',
        koliIndex: 4,
        name: 'Koli 4/4',
        barcode: '8690300300043',
        quantity: 6,
      },
    ],
  },
  {
    id: 'prod-loft-kitaplik',
    name: 'Loft Metal İskeletli 5 Raflı Kitaplık',
    category: 'Çalışma Odası',
    updatedAt: new Date().toISOString(),
    notes: 'Metal iskelet paslanmaya karşı silika jel ile korunmaktadır.',
    packages: [
      {
        koliId: 'loft-k01',
        koliIndex: 1,
        name: 'Koli 1/2',
        barcode: '8690400400019',
        quantity: 18,
      },
      {
        koliId: 'loft-k02',
        koliIndex: 2,
        name: 'Koli 2/2',
        barcode: '8690400400026',
        quantity: 15,
      },
    ],
  },
  {
    id: 'prod-ergopro-sandalye',
    name: 'ErgoPro Ofis ve Çalışma Sandalyesi',
    category: 'Çalışma Odası',
    updatedAt: new Date().toISOString(),
    notes: 'Tek Koli içerisinde tüm montaj parçaları bulunmaktadır.',
    packages: [
      {
        koliId: 'ergopro-k01',
        koliIndex: 1,
        name: 'Koli 1/1',
        barcode: '8690500500016',
        quantity: 24,
      },
    ],
  },
];
