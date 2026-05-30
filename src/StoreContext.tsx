import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, Reservation, Sale, CartItem, StoreContextType } from './types';
import { 
  subscribeToProducts, 
  subscribeToReservations, 
  subscribeToSales,
  cleanExpiredReservations 
} from './firebase';

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const CART_KEY = 'bethcart_active_cart';

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);

  // Load Cart from localStorage on boot
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_KEY);
      if (stored) {
        setCart(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to parse cart from localStorage', e);
    }
  }, []);

  // Sync Cart with localStorage
  const saveCartToLocalStorage = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem(CART_KEY, JSON.stringify(newCart));
  };

  // Subscribe to Firestore collections in Realtime
  useEffect(() => {
    let prodsLoaded = false;
    let resLoaded = false;
    let salesLoaded = false;

    const checkReady = () => {
      if (prodsLoaded && resLoaded && salesLoaded) {
        // Add a small stylish delay for our beautiful logo intro screen
        setTimeout(() => {
          setIsLoading(false);
        }, 1200);
      }
    };

    const unsubProducts = subscribeToProducts((loadedProds) => {
      setProducts(loadedProds);
      prodsLoaded = true;
      checkReady();
    });

    const unsubReservations = subscribeToReservations((loadedRes) => {
      setReservations(loadedRes);
      resLoaded = true;
      checkReady();
    });

    const unsubSales = subscribeToSales((loadedSales) => {
      setSales(loadedSales);
      salesLoaded = true;
      checkReady();
    });

    // Run custom automatic reservation cleanup on load
    cleanExpiredReservations().then((clearedCount) => {
      if (clearedCount > 0) {
        console.log(`Cleaned up ${clearedCount} expired reservations in background.`);
      }
    });

    // Run continuous background scan every 30 seconds for real-time expirations
    const intervalId = setInterval(() => {
      cleanExpiredReservations();
    }, 30000);

    return () => {
      unsubProducts();
      unsubReservations();
      unsubSales();
      clearInterval(intervalId);
    };
  }, []);

  // --- Cart Implementations ---
  const addToCart = (product: Product) => {
    const existingIndex = cart.findIndex(item => item.product.id === product.id);
    if (existingIndex > -1) {
      const updated = [...cart];
      const newQty = updated[existingIndex].quantity + 1;
      // Do not exceed current available stock
      if (newQty <= product.stock) {
        updated[existingIndex].quantity = newQty;
        saveCartToLocalStorage(updated);
      }
    } else {
      if (product.stock > 0) {
        saveCartToLocalStorage([...cart, { product, quantity: 1 }]);
      }
    }
  };

  const removeFromCart = (productId: string) => {
    saveCartToLocalStorage(cart.filter(item => item.product.id !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    const pRef = products.find(p => p.id === productId);
    const maxStock = pRef ? pRef.stock : 999;
    
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const targetQty = Math.min(quantity, maxStock);
    const updated = cart.map(item => {
      if (item.product.id === productId) {
        return { ...item, quantity: targetQty };
      }
      return item;
    });
    saveCartToLocalStorage(updated);
  };

  const clearCart = () => {
    saveCartToLocalStorage([]);
  };

  return (
    <StoreContext.Provider value={{
      products,
      reservations,
      sales,
      isLoading,
      cart,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      clearCart
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
