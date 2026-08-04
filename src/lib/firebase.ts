import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { Product, StockLogItem } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyCBijhncvfG5W3-Za5uPszA-at5wFVVNfM",
  authDomain: "depo-stok-ae5fe.firebaseapp.com",
  projectId: "depo-stok-ae5fe",
  storageBucket: "depo-stok-ae5fe.firebasestorage.app",
  messagingSenderId: "534517681416",
  appId: "1:534517681416:web:c3954b1b39e0d9b4e670bd",
  measurementId: "G-R597KFR2ES"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export const stokDokumanRef = doc(db, 'depo-verileri', 'guncel-durum');

/**
 * Pushes updated products and logs to Firebase Firestore in real-time
 */
export async function syncToFirebase(products: Product[], logs: StockLogItem[]) {
  try {
    await setDoc(
      stokDokumanRef,
      {
        products,
        logs,
        sonGuncelleme: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error('Firebase senkronizasyon hatası:', err);
  }
}
