export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  imageUrl: string;
  status: 'Available' | 'Reserved' | 'Sold';
  createdAt?: any; // Firestore serverTimestamp
}

export interface Reservation {
  id: string;
  productId: string;
  productName: string;
  productPrice: number;
  customerName: string;
  queueNumber: number;
  timestamp: any; // Firestore timestamp
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
  customerName: string;
  queueNumber: number;
  timestamp: any; // Firestore timestamp
  dateStr: string; // YYYY-MM-DD for reporting
  timeStr: string; // HH:MM:SS
}

export interface StoreContextType {
  products: Product[];
  reservations: Reservation[];
  sales: Sale[];
  isLoading: boolean;
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}
