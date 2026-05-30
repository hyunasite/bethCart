/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { StoreProvider, useStore } from './StoreContext';
import { LoadingScreen } from './components/LoadingScreen';
import { ProductCard } from './components/ProductCard';
import { CartModal } from './components/CartModal';
import { ReservationModal } from './components/ReservationModal';
import { AdminDashboard } from './components/AdminDashboard';
import { 
  ShoppingCart, Shield, ArrowLeft, Archive, Grid, 
  HelpCircle, Sparkles, MapPin, BadgeCheck 
} from 'lucide-react';

const APP_NAME = 'bethCart';

function StorefrontApp() {
  const { products, isLoading, cart, addToCart } = useStore();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeRoute, setActiveRoute] = useState<'store' | 'admin'>('store');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [reservationProduct, setReservationProduct] = useState<any | null>(null);

  // Hash router support for GitHub Pages compatibility
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#/admin' || hash === '#admin') {
        setActiveRoute('admin');
      } else {
        setActiveRoute('store');
      }
    };

    handleHashChange(); // Run once on boot
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Sync hash state with view clicks
  const navigateTo = (route: 'store' | 'admin') => {
    window.location.hash = route === 'admin' ? '/admin' : '/';
    setActiveRoute(route);
  };

  const categories = ['All', 'Tees', 'Hoodies', 'Accessories', 'Bags', 'Outerwear'];

  const filteredProducts = selectedCategory === 'All' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  // Helper to open reservation from within the cart directly
  const handleOpenReserveFromCart = (productId: string) => {
    const pRef = products.find(p => p.id === productId);
    if (pRef) {
      setReservationProduct(pRef);
      setIsCartOpen(false);
    }
  };

  if (isLoading) {
    return <LoadingScreen appName={APP_NAME} />;
  }

  return (
    <div className="min-h-screen flex flex-col justify-between overflow-x-hidden bg-[#F8F7FF] relative">
      
      {/* Dynamic ambient glassmorphic background spheres */}
      <div className="absolute top-[8%] left-[-15%] w-[400px] sm:w-[550px] h-[400px] sm:h-[550px] bg-gradient-to-tr from-violet-200/40 to-indigo-300/40 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-[40%] right-[-15%] w-[500px] sm:w-[650px] h-[500px] sm:h-[650px] bg-gradient-to-br from-purple-200/40 to-pink-200/30 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[5%] left-[10%] w-[450px] sm:w-[600px] h-[450px] sm:h-[600px] bg-gradient-to-tr from-indigo-200/30 to-violet-200/40 rounded-full blur-[110px] pointer-events-none" />

      {/* ============================================================================
          UNIVERSAL HEADER NAVBAR
          ============================================================================ */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-[#6C4CF1] to-[#8B5CF6] text-white shadow-xl backdrop-blur-lg">
        <div className="w-full max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          
          {/* Logo Title BRAND */}
          <div 
            onClick={() => navigateTo('store')} 
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <span className="text-3xl transform group-hover:rotate-6 transition-transform duration-200">🛍️</span>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-white leading-none">
                {APP_NAME}
              </h1>
              <span className="text-[9px] uppercase font-bold tracking-widest text-violet-200 block mt-1">
                Neighborhood reservation
              </span>
            </div>
          </div>

          {/* Quick Controls Section */}
          <div className="flex items-center gap-3">
            {activeRoute === 'admin' ? (
              <button
                id="back-to-store-btn"
                onClick={() => navigateTo('store')}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-white/20 hover:bg-white/35 border border-white/30 text-white rounded-2xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md backdrop-blur-md"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Shop Shelf</span>
              </button>
            ) : (
              <>
                {/* Admin lock switch */}
                <button
                  id="admin-dashboard-header-toggle"
                  onClick={() => navigateTo('admin')}
                  className="p-2.5 border border-white/30 hover:border-white/50 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all cursor-pointer backdrop-blur-md"
                  title="Staff Portal Login"
                >
                  <Shield className="w-4.5 h-4.5" />
                </button>

                {/* Cart Badge Trigger */}
                <button
                  id="cart-trigger"
                  onClick={() => setIsCartOpen(true)}
                  className="relative flex items-center gap-2 bg-white/20 hover:bg-white/35 border border-white/30 text-white py-2.5 px-4 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md backdrop-blur-md"
                >
                  <ShoppingCart className="w-4.5 h-4.5" />
                  <span className="hidden sm:inline">My Cart</span>
                  {cart.length > 0 && (
                    <span id="cart-count-badge" className="inline-flex items-center justify-center bg-white text-[#6C4CF1] font-extrabold text-[10px] w-5 h-5 rounded-full border border-white shadow-sm font-mono leading-none">
                      {cart.length}
                    </span>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ============================================================================
          MAIN BODY RENDER PATH
          ============================================================================ */}
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 py-8 relative z-10">
        {activeRoute === 'admin' ? (
          /* ADMIN DASHBOARD COMPONENT */
          <AdminDashboard />
        ) : (
          /* CUSTOMER STOREFRONT LAYOUT */
          <div className="space-y-10">
            
            {/* HERO PROMOTIONAL BOX */}
            <div className="bg-gradient-to-br from-[#2D1B69] via-[#201053] to-[#110636] border border-[#3D2590]/50 rounded-[36px] p-6 sm:p-10 relative overflow-hidden shadow-2xl flex flex-col md:flex-row gap-8 items-center justify-between">
              
              {/* Decorative radial glows */}
              <div className="absolute -top-10 -right-10 w-96 h-96 bg-[#6C4CF1]/25 rounded-full blur-[110px] pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-pink-500/10 rounded-full blur-[100px] pointer-events-none" />

              <div className="relative max-w-xl space-y-4 text-left flex-1 z-10">
                {/* Micro-badge with sparkles */}
                <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#4F36AA]/50 text-violet-200 rounded-full border border-[#6C4CFF]/30 text-[9px] font-extrabold uppercase tracking-widest">
                  <Sparkles className="w-3.5 h-3.5 text-violet-300" />
                  <span>Reserve & Local Pickup Only</span>
                </div>
                
                {/* Heading */}
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight text-white leading-none">
                  Reserve Online,<br />
                  Pay Offline in<br />
                  Person<span className="text-[#8B5CF6]">.</span>
                </h2>
                
                {/* Paragraph copy */}
                <p className="hidden sm:block text-violet-200/80 text-xs sm:text-sm font-medium leading-relaxed max-w-md">
                  No online payment required. Secure your favorite item holds with simple queue numbers and settle cash transactions upon pick-up!
                </p>
              </div>

              {/* Stacked interactive indicators mimicking mockup design exactly */}
              <div className="hidden md:block w-full md:w-80 space-y-3 shrink-0 relative z-10">
                <div className="flex items-center gap-3.5 bg-[#25155c]/85 hover:bg-[#2b176d] border border-[#3e2590] p-4 rounded-2xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)] transition-all">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#1b0d4b]/60 border border-[#4c2fa8]/30">
                    <MapPin className="w-4 h-4 text-[#A78BFA]" />
                  </div>
                  <span className="text-xs font-bold text-slate-100 tracking-wide">100% In-store Pickups</span>
                </div>

                <div className="flex items-center gap-3.5 bg-[#25155c]/85 hover:bg-[#2b176d] border border-[#3e2590] p-4 rounded-2xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)] transition-all">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#1b0d4b]/60 border border-[#4c2fa8]/30">
                    <BadgeCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-xs font-bold text-slate-100 tracking-wide">24-hour Holds</span>
                </div>

                <div className="flex items-center gap-3.5 bg-[#25155c]/85 hover:bg-[#2b176d] border border-[#3e2590] p-4 rounded-2xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)] transition-all">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#1b0d4b]/60 border border-[#4c2fa8]/30">
                    <Archive className="w-4 h-4 text-amber-400" />
                  </div>
                  <span className="text-xs font-bold text-slate-100 tracking-wide">Real-time Catalog</span>
                </div>
              </div>

            </div>

            {/* CATEGORY SELECTOR SLIDE BAR */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <Grid className="w-4 h-4 text-[#6C4CF1]" />
                  <span>Explore Shelf Collections</span>
                </h3>
              </div>
              
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-2xl transition-all cursor-pointer whitespace-nowrap ${
                      selectedCategory === cat
                        ? 'bg-gradient-brand text-white shadow-lg shadow-violet-500/25'
                        : 'bg-white/50 backdrop-blur-md border border-white/80 text-slate-600 hover:border-violet-300 hover:bg-white/80 hover:text-slate-900 shadow-sm'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* MAIN SHELF PRODUCT GRID (Mobile: 2-cols, Tablet: 3-cols, Desktop: up to 6cols) */}
            <div>
              {filteredProducts.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-slate-200 bg-white/40 backdrop-blur-md rounded-[32px] flex flex-col items-center justify-center p-6">
                  <span className="text-5xl mb-4">👕</span>
                  <p className="text-slate-950 font-extrabold text-base">Nothing on this shelf yet</p>
                  <p className="text-slate-400 text-xs mt-1 max-w-xs leading-relaxed">
                    Come back later or switch categories! Store owners populate apparel in real time.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                  {filteredProducts.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      onReserve={setReservationProduct}
                      onAddToCart={addToCart}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* HELPER HOW-IT-WORKS FOOT NOTE */}
            <div className="bg-white/40 backdrop-blur-md p-5 rounded-[32px] border border-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex gap-3">
                <span className="text-xl leading-none">💡</span>
                <div>
                  <h4 className="font-bold text-xs text-slate-800">How do I order?</h4>
                  <p className="text-[11px] text-slate-500 leading-normal mt-0.5">Simply click 'Reserve Now' and lock in your unique customer queue. Claim within 24 hours!</p>
                </div>
              </div>
              <button 
                id="admin-dashboard-footer-toggle-btn"
                onClick={() => navigateTo('admin')}
                className="text-[#6C4CF1] hover:text-[#8B5CF6] text-[11px] font-extrabold uppercase tracking-wider underline cursor-pointer hover:scale-105 transition-transform"
              >
                Access Owner Portal
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================================
          LITERAL REQUIREMENT CENTRIC FOOTER
          ============================================================================ */}
      <footer className="w-full bg-white/40 backdrop-blur-md mt-12 py-8 border-t border-white/50">
        <div className="w-full max-w-7xl mx-auto px-4 flex flex-col items-center justify-center">
          
          {/* Logo brand label */}
          <span className="text-lg font-bold text-slate-400 font-sans tracking-wide mb-1.5">{APP_NAME}</span>
          
          <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-4 text-xs font-medium text-slate-500 text-center">
            <span>© 2026 {APP_NAME}</span>
            <span className="hidden sm:inline text-slate-200">|</span>
            <span>Owned by Bluu</span>
            <span className="hidden sm:inline text-slate-200">|</span>
            <span className="font-bold">📞 09XXXXXXXXX</span>
          </div>

        </div>
      </footer>

      {/* ============================================================================
          MODAL OVERLAYS
          ============================================================================ */}
      
      {/* 1. Local Cart slide-over Drawer */}
      <CartModal 
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onOpenReserve={handleOpenReserveFromCart}
      />

      {/* 2. Structured Reservation & Concurrency checkout form */}
      <ReservationModal 
        product={reservationProduct}
        isOpen={reservationProduct !== null}
        onClose={() => setReservationProduct(null)}
      />

    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <StorefrontApp />
    </StoreProvider>
  );
}
