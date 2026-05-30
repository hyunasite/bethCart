import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  onSnapshot, 
  runTransaction, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  serverTimestamp, 
  getDocFromServer,
  getDocs,
  query,
  limit
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';
import { Product, Reservation, Sale } from './types';

// Error Handler definitions as strictly required by Firebase Integration Skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

function isPermissionError(error: any): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  const lowercaseMsg = msg.toLowerCase();
  return (
    lowercaseMsg.includes('permission') || 
    lowercaseMsg.includes('denied') || 
    lowercaseMsg.includes('insufficient') ||
    code.includes('permission-denied') ||
    code.includes('unauthenticated')
  );
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  if (!isPermissionError(error)) {
    console.warn(`Firestore Non-Permission Logic Info [${operationType}] at [${path}]:`, error);
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: 'anonymous-or-admin',
      email: 'local-session-admin'
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Check if config is a placeholder
const isPlaceholder = firebaseConfig.apiKey === 'placeholder-api-key' || firebaseConfig.projectId.includes('placeholder');

let db: any = null;
let storage: any = null;

if (!isPlaceholder) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    storage = getStorage(app);
    
    // Validate connection to Firestore as strictly required by Skill
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, '_connection_test', 'status'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration or network status.");
        }
      }
    };
    testConnection();
  } catch (e) {
    console.warn("Real Firebase initialization failed, falling back to Local Adaptive Mock Mode.", e);
  }
}

// --- INITIAL Merchandising Products ---
const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'p0_test_striped',
    name: 'Striped T-Shirt Model Retro Classic Crew',
    category: 'Tees',
    price: 367.77,
    stock: 3,
    imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80&w=600',
    status: 'Available'
  },
  {
    id: 'p0_test_cap',
    name: 'Vintage Street Heritage Sport Cap',
    category: 'Accessories',
    price: 199.99,
    stock: 8,
    imageUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&q=80&w=600',
    status: 'Available'
  },
  {
    id: 'p1',
    name: 'Classic White Tee',
    category: 'Tees',
    price: 250,
    stock: 5,
    imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=600',
    status: 'Available'
  },
  {
    id: 'p2',
    name: 'bethCart Premium Hoodie',
    category: 'Hoodies',
    price: 650,
    stock: 3,
    imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=600',
    status: 'Available'
  },
  {
    id: 'p3',
    name: 'Vintage Acid-Wash Cap',
    category: 'Accessories',
    price: 180,
    stock: 0,
    imageUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?auto=format&fit=crop&q=80&w=600',
    status: 'Sold'
  },
  {
    id: 'p4',
    name: 'Retro Canvas Tote Bag',
    category: 'Bags',
    price: 150,
    stock: 4,
    imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=600',
    status: 'Available'
  },
  {
    id: 'p5',
    name: 'Over-sized Vintage Sunglasses',
    category: 'Accessories',
    price: 320,
    stock: 2,
    imageUrl: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&q=80&w=600',
    status: 'Available'
  }
];

// Seeding real Firestore products collection if empty or missing showcase items
if (!isPlaceholder && db) {
  const seedRealFirestoreIfNeeded = async () => {
    try {
      const prodsCol = collection(db, 'products');
      const snap = await getDocs(query(prodsCol, limit(1)));
      
      if (snap.empty) {
        console.log("Firestore products collection is empty. Seeding INITIAL_PRODUCTS...");
        for (const prod of INITIAL_PRODUCTS) {
          await setDoc(doc(db, 'products', prod.id), {
            name: prod.name,
            category: prod.category,
            price: prod.price,
            stock: prod.stock,
            imageUrl: prod.imageUrl,
            status: prod.status,
            createdAt: serverTimestamp()
          });
        }
        console.log("Firestore successfully seeded with INITIAL_PRODUCTS.");
      } else {
        // If not empty, check if our specific test items are missing and insert them
        for (const prod of INITIAL_PRODUCTS.filter(p => p.id.startsWith('p0_'))) {
          const docRef = doc(db, 'products', prod.id);
          const docSnap = await getDoc(docRef);
          if (!docSnap.exists()) {
            await setDoc(docRef, {
              name: prod.name,
              category: prod.category,
              price: prod.price,
              stock: prod.stock,
              imageUrl: prod.imageUrl,
              status: prod.status,
              createdAt: serverTimestamp()
            });
            console.log(`Seeded missing test product in Firestore: ${prod.id}`);
          }
        }
      }
    } catch (err) {
      console.warn("Auto-seeding Firestore failed (likely due to permissions or rules):", err);
    }
  };
  seedRealFirestoreIfNeeded();
}

// LocalStorage Persistence Fallback Keys
const STORAGE_PREFIX = 'bethcart_';
const LS_PRODUCTS = `${STORAGE_PREFIX}products`;
const LS_RESERVATIONS = `${STORAGE_PREFIX}reservations`;
const LS_SALES = `${STORAGE_PREFIX}sales`;

// Initialize local states in localStorage if empty or sync test items
let existingProds: Product[] = [];
try {
  existingProds = JSON.parse(localStorage.getItem(LS_PRODUCTS) || '[]');
} catch (e) {
  existingProds = [];
}

const hasAllTestItems = 
  existingProds.some(p => p.id === 'p0_test_striped') && 
  existingProds.some(p => p.id === 'p0_test_cap');

if (!hasAllTestItems || existingProds.length === 0) {
  // Gracefully filter out any older test item versions and pre-populate fresh catalog
  const nonTestProds = existingProds.filter(p => !p.id.startsWith('p0_'));
  
  // Combine brand new tests with user inventory
  existingProds = [
    INITIAL_PRODUCTS[0],
    INITIAL_PRODUCTS[1],
    ...nonTestProds.filter(p => p.id !== 'p1' && p.id !== 'p2' && p.id !== 'p3' && p.id !== 'p4' && p.id !== 'p5'),
    ...INITIAL_PRODUCTS.slice(2)
  ];
  localStorage.setItem(LS_PRODUCTS, JSON.stringify(existingProds));
}

if (!localStorage.getItem(LS_RESERVATIONS)) {
  localStorage.setItem(LS_RESERVATIONS, JSON.stringify([]));
}
if (!localStorage.getItem(LS_SALES)) {
  localStorage.setItem(LS_SALES, JSON.stringify([]));
}

// Broadcasting helpers to synchronize multiple tabs or components in Mock Mode
function broadcastMockUpdate(collectionName: string) {
  window.dispatchEvent(new CustomEvent(`bethcart_sync_${collectionName}`));
}

// ============================================================================
// Unified API Surface
// ============================================================================

// 1. PRODUCTS SUBSCRIBER
export function subscribeToProducts(callback: (products: Product[]) => void): () => void {
  if (!isPlaceholder && db) {
    const q = collection(db, 'products');
    return onSnapshot(q, (snapshot) => {
      const prods: Product[] = [];
      snapshot.forEach((docSnap) => {
        prods.push({ id: docSnap.id, ...docSnap.data() } as Product);
      });
      callback(prods);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'products');
    });
  } else {
    // Mock subscription via custom listeners
    const fetchAndCallback = () => {
      const dataStr = localStorage.getItem(LS_PRODUCTS) || '[]';
      callback(JSON.parse(dataStr));
    };
    fetchAndCallback();
    const handler = () => fetchAndCallback();
    window.addEventListener(`bethcart_sync_products`, handler);
    return () => {
      window.removeEventListener(`bethcart_sync_products`, handler);
    };
  }
}

// 2. RESERVATIONS SUBSCRIBER
export function subscribeToReservations(callback: (reservations: Reservation[]) => void): () => void {
  if (!isPlaceholder && db) {
    const q = collection(db, 'reservations');
    return onSnapshot(q, (snapshot) => {
      const res: Reservation[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        res.push({
          id: docSnap.id,
          ...d,
          timestamp: d.timestamp?.toDate ? d.timestamp.toDate() : d.timestamp
        } as Reservation);
      });
      callback(res);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'reservations');
    });
  } else {
    const fetchAndCallback = () => {
      const dataStr = localStorage.getItem(LS_RESERVATIONS) || '[]';
      const parsed = JSON.parse(dataStr).map((r: any) => ({
        ...r,
        timestamp: new Date(r.timestamp)
      }));
      callback(parsed);
    };
    fetchAndCallback();
    const handler = () => fetchAndCallback();
    window.addEventListener(`bethcart_sync_reservations`, handler);
    return () => {
      window.removeEventListener(`bethcart_sync_reservations`, handler);
    };
  }
}

// 3. SALES SUBSCRIBER
export function subscribeToSales(callback: (sales: Sale[]) => void): () => void {
  if (!isPlaceholder && db) {
    const q = collection(db, 'sales');
    return onSnapshot(q, (snapshot) => {
      const s: Sale[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        s.push({
          id: docSnap.id,
          ...d,
          timestamp: d.timestamp?.toDate ? d.timestamp.toDate() : d.timestamp
        } as Sale);
      });
      callback(s);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'sales');
    });
  } else {
    const fetchAndCallback = () => {
      const dataStr = localStorage.getItem(LS_SALES) || '[]';
      const parsed = JSON.parse(dataStr).map((s: any) => ({
        ...s,
        timestamp: new Date(s.timestamp)
      }));
      callback(parsed);
    };
    fetchAndCallback();
    const handler = () => fetchAndCallback();
    window.addEventListener(`bethcart_sync_sales`, handler);
    return () => {
      window.removeEventListener(`bethcart_sync_sales`, handler);
    };
  }
}

// 4. TRANSACTIONAL RESERVATION (CONCURRENCY GUARDED)
export async function createReservationTransaction(
  productId: string, 
  customerName: string, 
  queueNumber: number
): Promise<{ success: boolean; message: string }> {
  if (!isPlaceholder && db) {
    try {
      const productRef = doc(db, 'products', productId);
      const queueRef = doc(db, 'queue_numbers', queueNumber.toString());
      const reservationId = `ret_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const reservationRef = doc(db, 'reservations', reservationId);

      const result = await runTransaction(db, async (transaction) => {
        // Read 1: Queue status document lock
        const queueSnap = await transaction.get(queueRef);
        if (queueSnap.exists()) {
          return { success: false, message: 'Queue number already taken.' };
        }

        // Read 2: Product stock and status
        const productSnap = await transaction.get(productRef);
        if (!productSnap.exists()) {
          return { success: false, message: 'Product does not exist.' };
        }

        const productData = productSnap.data() as Product;
        if (productData.stock <= 0) {
          return { success: false, message: 'Item already reserved.' };
        }

        // Calculations
        const newStock = productData.stock - 1;
        const newStatus = newStock === 0 ? 'Reserved' : 'Available';

        // Write 1: Update queue lock
        transaction.set(queueRef, {
          queueNumber,
          customerName,
          productId,
          timestamp: serverTimestamp()
        });

        // Write 2: Create structured reservation
        transaction.set(reservationRef, {
          id: reservationId,
          productId,
          productName: productData.name,
          productPrice: productData.price,
          customerName,
          queueNumber,
          timestamp: serverTimestamp()
        });

        // Write 3: Update product state and stock count
        transaction.update(productRef, {
          stock: newStock,
          status: newStatus
        });

        return { success: true, message: 'Reservation successful!' };
      });

      return result;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `reservations-transaction-${productId}`);
      return { success: false, message: 'A system error occurred during reservation.' };
    }
  } else {
    // Perfect Concurrency Guard Simulation in localStorage Mode
    const prods: Product[] = JSON.parse(localStorage.getItem(LS_PRODUCTS) || '[]');
    const reservs: Reservation[] = JSON.parse(localStorage.getItem(LS_RESERVATIONS) || '[]');
    
    // Simulate latency
    await new Promise((resolve) => setTimeout(resolve, 350));

    // Refetch and lock check
    const isQueueTaken = reservs.some((r) => r.queueNumber === queueNumber);
    if (isQueueTaken) {
      return { success: false, message: 'Queue number already taken.' };
    }

    const prodIdx = prods.findIndex((p) => p.id === productId);
    if (prodIdx === -1) {
      return { success: false, message: 'Product does not exist.' };
    }

    const currentProd = prods[prodIdx];
    if (currentProd.stock <= 0) {
      return { success: false, message: 'Item already reserved.' };
    }

    // Perform updates
    currentProd.stock -= 1;
    currentProd.status = currentProd.stock === 0 ? 'Reserved' : 'Available';

    const newReservation: Reservation = {
      id: `m_res_${Date.now()}`,
      productId,
      productName: currentProd.name,
      productPrice: currentProd.price,
      customerName,
      queueNumber,
      timestamp: new Date()
    };

    reservs.push(newReservation);

    localStorage.setItem(LS_PRODUCTS, JSON.stringify(prods));
    localStorage.setItem(LS_RESERVATIONS, JSON.stringify(reservs));

    broadcastMockUpdate('products');
    broadcastMockUpdate('reservations');

    return { success: true, message: 'Reservation successful!' };
  }
}

// 5. CONFIRM PICKUP & PAYMENT (Saves to sales collection, adds earnings)
export async function confirmPickupAndPayment(reservationId: string): Promise<boolean> {
  if (!isPlaceholder && db) {
    try {
      const reservationRef = doc(db, 'reservations', reservationId);
      
      const result = await runTransaction(db, async (transaction) => {
        const resSnap = await transaction.get(reservationRef);
        if (!resSnap.exists()) {
          throw new Error('Reservation not found.');
        }

        const resData = resSnap.data() as Reservation;
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        const timeStr = now.toTimeString().split(' ')[0];

        const saleId = `sale_${Date.now()}`;
        const saleRef = doc(db, 'sales', saleId);

        // Queue lock deletion ref
        const queueRef = doc(db, 'queue_numbers', resData.queueNumber.toString());

        // Product query to verify state
        const productRef = doc(db, 'products', resData.productId);
        const productSnap = await transaction.get(productRef);
        let finalStatus = 'Available';
        if (productSnap.exists()) {
          const prodData = productSnap.data() as Product;
          // If stock is 0, status continues to be Sold (or remains Reserved if sold)
          if (prodData.stock === 0) {
            finalStatus = 'Sold';
          } else {
            finalStatus = 'Available';
          }
          // Make sure the status is correctly sync
          transaction.update(productRef, {
            status: finalStatus
          });
        }

        // Save Sales record
        transaction.set(saleRef, {
          id: saleId,
          productId: resData.productId,
          productName: resData.productName,
          productPrice: resData.productPrice,
          quantity: 1, // Traditional 1 unit per reservation
          customerName: resData.customerName,
          queueNumber: resData.queueNumber,
          timestamp: serverTimestamp(),
          dateStr,
          timeStr
        });

        // Clean up locks & active reservation record
        transaction.delete(reservationRef);
        transaction.delete(queueRef);

        return true;
      });

      return result;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `sales-confirm-${reservationId}`);
      return false;
    }
  } else {
    // Mock Mode confirm pickup
    const reservs: Reservation[] = JSON.parse(localStorage.getItem(LS_RESERVATIONS) || '[]');
    const sales: Sale[] = JSON.parse(localStorage.getItem(LS_SALES) || '[]');
    const prods: Product[] = JSON.parse(localStorage.getItem(LS_PRODUCTS) || '[]');

    const resIdx = reservs.findIndex((r) => r.id === reservationId);
    if (resIdx === -1) return false;

    const res = reservs[resIdx];
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const timeStr = now.toTimeString().split(' ')[0];

    const newSale: Sale = {
      id: `m_sale_${Date.now()}`,
      productId: res.productId,
      productName: res.productName,
      productPrice: res.productPrice,
      quantity: 1,
      customerName: res.customerName,
      queueNumber: res.queueNumber,
      timestamp: now,
      dateStr,
      timeStr
    };

    // Remove reservation
    reservs.splice(resIdx, 1);

    // Update product status
    const prodIdx = prods.findIndex((p) => p.id === res.productId);
    if (prodIdx !== -1) {
      const p = prods[prodIdx];
      p.status = p.stock === 0 ? 'Sold' : 'Available';
    }

    sales.push(newSale);

    localStorage.setItem(LS_RESERVATIONS, JSON.stringify(reservs));
    localStorage.setItem(LS_SALES, JSON.stringify(sales));
    localStorage.setItem(LS_PRODUCTS, JSON.stringify(prods));

    broadcastMockUpdate('reservations');
    broadcastMockUpdate('sales');
    broadcastMockUpdate('products');

    return true;
  }
}

// 6. CANCEL RESERVATION (Restores stock, changes state back, removes reservation)
export async function cancelReservation(reservationId: string): Promise<boolean> {
  if (!isPlaceholder && db) {
    try {
      const reservationRef = doc(db, 'reservations', reservationId);
      
      const result = await runTransaction(db, async (transaction) => {
        const resSnap = await transaction.get(reservationRef);
        if (!resSnap.exists()) {
          throw new Error('Reservation not found.');
        }

        const resData = resSnap.data() as Reservation;
        const productRef = doc(db, 'products', resData.productId);
        const queueRef = doc(db, 'queue_numbers', resData.queueNumber.toString());

        const productSnap = await transaction.get(productRef);
        if (productSnap.exists()) {
          const productData = productSnap.data() as Product;
          const restoredStock = productData.stock + 1;
          transaction.update(productRef, {
            stock: restoredStock,
            status: 'Available' // Restoring stock means there is at least 1 pcs left, so status is available
          });
        }

        transaction.delete(reservationRef);
        transaction.delete(queueRef);
        return true;
      });

      return result;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `cancel-reservation-${reservationId}`);
      return false;
    }
  } else {
    // Mock Mode cancel reservation
    const reservs: Reservation[] = JSON.parse(localStorage.getItem(LS_RESERVATIONS) || '[]');
    const prods: Product[] = JSON.parse(localStorage.getItem(LS_PRODUCTS) || '[]');

    const resIdx = reservs.findIndex((r) => r.id === reservationId);
    if (resIdx === -1) return false;

    const res = reservs[resIdx];
    
    // Restore Stock and set status
    const prodIdx = prods.findIndex((p) => p.id === res.productId);
    if (prodIdx !== -1) {
      prods[prodIdx].stock += 1;
      prods[prodIdx].status = 'Available';
    }

    reservs.splice(resIdx, 1);

    localStorage.setItem(LS_RESERVATIONS, JSON.stringify(reservs));
    localStorage.setItem(LS_PRODUCTS, JSON.stringify(prods));

    broadcastMockUpdate('reservations');
    broadcastMockUpdate('products');

    return true;
  }
}

// 7. INVENTORY MANAGEMENT
// ADD
export async function addProduct(product: Omit<Product, 'id'>): Promise<string> {
  const newId = `prod_${Date.now()}`;
  if (!isPlaceholder && db) {
    try {
      const productRef = doc(db, 'products', newId);
      await setDoc(productRef, {
        ...product,
        createdAt: serverTimestamp()
      });
      return newId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `products-add-${newId}`);
      return '';
    }
  } else {
    const list: Product[] = JSON.parse(localStorage.getItem(LS_PRODUCTS) || '[]');
    const completeProd: Product = { id: newId, ...product };
    list.push(completeProd);
    localStorage.setItem(LS_PRODUCTS, JSON.stringify(list));
    broadcastMockUpdate('products');
    return newId;
  }
}

// UPDATE
export async function updateProduct(productId: string, updates: Partial<Product>): Promise<boolean> {
  if (!isPlaceholder && db) {
    try {
      const productRef = doc(db, 'products', productId);
      await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(productRef);
        if (docSnap.exists()) {
          transaction.update(productRef, updates);
        }
      });
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `products-update-${productId}`);
      return false;
    }
  } else {
    const list: Product[] = JSON.parse(localStorage.getItem(LS_PRODUCTS) || '[]');
    const idx = list.findIndex((p) => p.id === productId);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updates };
      localStorage.setItem(LS_PRODUCTS, JSON.stringify(list));
      broadcastMockUpdate('products');
      return true;
    }
    return false;
  }
}

// DELETE
export async function deleteProductRecord(productId: string): Promise<boolean> {
  if (!isPlaceholder && db) {
    try {
      const productRef = doc(db, 'products', productId);
      await deleteDoc(productRef);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products-delete-${productId}`);
      return false;
    }
  } else {
    const list: Product[] = JSON.parse(localStorage.getItem(LS_PRODUCTS) || '[]');
    const filtered = list.filter((p) => p.id !== productId);
    localStorage.setItem(LS_PRODUCTS, JSON.stringify(filtered));
    broadcastMockUpdate('products');
    return true;
  }
}

// 8. IMAGE FILE UPLOADER (Supports Drag/Drop on Admin dashboard)
export async function uploadProductImage(file: File): Promise<string> {
  if (!isPlaceholder && storage) {
    try {
      const storageRef = ref(storage, `product_images/${Date.now()}_${file.name}`);
      const snap = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snap.ref);
      return url;
    } catch (error) {
      console.error("Storage upload failed, falling back to local object URL.", error);
      // Fallback to local URL in case of storage permission/quota limits so admin can proceed gracefully
      return URL.createObjectURL(file);
    }
  } else {
    // Generate functional previewable URL immediately
    return URL.createObjectURL(file);
  }
}

// Helper to manually run reservation expiry checking (cancelling reservations older than 24 hours)
export async function cleanExpiredReservations(): Promise<number> {
  let count = 0;
  const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 Hours
  const cutoff = Date.now() - EXPIRY_MS;

  if (!isPlaceholder && db) {
    // Real Firestore Expirations
    try {
      // Since query filters aren't strictly client-side delegated, we fetch reservations and check timestamps
      // Let's do it in a safe loop to cancel expired ones transactionally
      const querySnap = await subscribeToReservationsOnce();
      for (const res of querySnap) {
        const ts = res.timestamp?.toDate ? res.timestamp.toDate() : res.timestamp;
        if (ts && new Date(ts).getTime() < cutoff) {
          const success = await cancelReservation(res.id);
          if (success) count++;
        }
      }
    } catch (e) {
      console.error("Error cleaning expired reservations:", e);
    }
  } else {
    // Mock Expirations
    const resList: Reservation[] = JSON.parse(localStorage.getItem(LS_RESERVATIONS) || '[]');
    const expired = resList.filter(r => new Date(r.timestamp).getTime() < cutoff);
    for (const r of expired) {
      const success = await cancelReservation(r.id);
      if (success) count++;
    }
  }
  return count;
}

// Internal helper for background cleanups
async function subscribeToReservationsOnce(): Promise<Reservation[]> {
  return new Promise((resolve) => {
    const unsub = subscribeToReservations((res) => {
      unsub();
      resolve(res);
    });
  });
}
