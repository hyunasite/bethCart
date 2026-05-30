import React, { useState, useRef } from 'react';
import { useStore } from '../StoreContext';
import { Product, Reservation, Sale } from '../types';
import { 
  addProduct, 
  updateProduct, 
  deleteProductRecord, 
  uploadProductImage,
  confirmPickupAndPayment,
  cancelReservation
} from '../firebase';
import { 
  Lock, DollarSign, ShoppingBag, Calendar, TrendingUp, Search, 
  Plus, Edit, Trash2, UploadCloud, CheckCircle, RefreshCcw, X, ShieldAlert
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { products, reservations, sales } = useStore();
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('isAdminAuthenticated') === 'true';
  });
  const [authError, setAuthError] = useState('');

  // Search & Filter state
  const [resSearch, setResSearch] = useState('');
  const [inventorySearch, setInventorySearch] = useState('');
  const [salesSearch, setSalesSearch] = useState('');

  // Product management state
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Tees');
  const [formPrice, setFormPrice] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // File Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- PASSWORD CONSTRAINTS ---
  const MASTER_ADMIN_PASS = 'bethCart2026';

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === MASTER_ADMIN_PASS) {
      setIsAuthenticated(true);
      localStorage.setItem('isAdminAuthenticated', 'true');
      setAuthError('');
    } else {
      setAuthError('Incorrect Password. Please try again.');
    }
  };

  // --- ANALYTICS CALCULATIONS ---
  const totalEarnings = sales.reduce((sum, s) => sum + s.productPrice * s.quantity, 0);
  const totalItemsSold = sales.reduce((sum, s) => sum + s.quantity, 0);
  const totalActiveReservations = reservations.length;

  // Date strings comparison for reports
  const getTodayStr = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const getEarningSegment = (daysCount: number) => {
    const now = new Date();
    const cutoff = now.getTime() - (daysCount * 24 * 60 * 60 * 1000);
    return sales
      .filter(s => new Date(s.timestamp).getTime() >= cutoff)
      .reduce((sum, s) => sum + s.productPrice * s.quantity, 0);
  };

  const todayEarnings = sales
    .filter(s => s.dateStr === getTodayStr())
    .reduce((sum, s) => sum + s.productPrice * s.quantity, 0);

  const weeklyEarnings = getEarningSegment(7);
  const monthlyEarnings = getEarningSegment(30);

  // ==========================================
  // Product Operations
  // ==========================================
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setFormName('');
    setFormCategory('Tees');
    setFormPrice('');
    setFormStock('');
    setFormImageUrl('');
    setShowProductModal(true);
  };

  const handleOpenEditProduct = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormCategory(p.category);
    setFormPrice(p.price.toString());
    setFormStock(p.stock.toString());
    setFormImageUrl(p.imageUrl);
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formPrice || !formStock || !formImageUrl) {
      alert('Please fill out all product details.');
      return;
    }

    const priceNum = parseFloat(formPrice);
    const stockNum = parseInt(formStock);

    if (isNaN(priceNum) || priceNum <= 0) {
      alert('Price must be a valid positive number');
      return;
    }

    if (isNaN(stockNum) || stockNum < 0) {
      alert('Stock must be a non-negative integer.');
      return;
    }

    const productPayload = {
      name: formName.trim(),
      category: formCategory,
      price: priceNum,
      stock: stockNum,
      imageUrl: formImageUrl.trim(),
      status: (stockNum > 0 ? 'Available' : 'Sold') as 'Available' | 'Sold'
    };

    if (editingProduct) {
      await updateProduct(editingProduct.id, productPayload);
    } else {
      await addProduct(productPayload);
    }

    setShowProductModal(false);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (confirm('Are you absolutely sure you want to delete this product? This action cannot be undone.')) {
      await deleteProductRecord(productId);
    }
  };

  // --- Drag and Drop Cover handler ---
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('File must be an image.');
      return;
    }
    setIsUploading(true);
    try {
      const url = await uploadProductImage(file);
      setFormImageUrl(url);
    } catch (e) {
      alert('Image upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  // ==========================================
  // Pickup and Cancellations Workflows (Transactions)
  // ==========================================
  const handleConfirmPickup = async (reservationId: string) => {
    const success = await confirmPickupAndPayment(reservationId);
    if (success) {
      alert('Pickup and payment cleared! Sales ledger registered.');
    } else {
      alert('Transaction failed. Product stock may be out of sync.');
    }
  };

  const handleCancelHold = async (reservationId: string) => {
    if (confirm('Are you sure you want to cancel this hold? Selected stock will be restored back into available shelf.')) {
      const success = await cancelReservation(reservationId);
      if (success) {
        alert('Reservation holds cancelled. Category stock restored.');
      } else {
        alert('Action failed.');
      }
    }
  };

  const handleSignOut = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isAdminAuthenticated');
    setPassword('');
  };

  // ============================================================================
  // GATED VISUAL LOGS OR PASSWORD COMPONENT
  // ============================================================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        {/* Ambient glows behind the lock box */}
        <div className="absolute top-[30%] left-[20%] w-72 h-72 bg-[#6C4CF1]/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[30%] right-[20%] w-72 h-72 bg-[#8B5CF6]/15 rounded-full blur-[100px] pointer-events-none" />

        <div className="bg-white/60 backdrop-blur-xl border border-white rounded-[32px] p-6 md:p-8 w-full max-w-md shadow-2xl text-center space-y-6 relative">
          <div className="w-14 h-14 bg-white/80 border border-white text-[#6C4CF1] rounded-full flex items-center justify-center mx-auto shadow-md">
            <Lock className="w-6 h-6" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Admin System Lock</h2>
            <p className="text-slate-500 text-xs mt-1.5 leading-relaxed font-semibold">
              ADMIN ACCESS ONLY
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {authError && (
              <div id="admin-auth-error" className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2 text-rose-600 font-semibold text-xs text-left">
                <ShieldAlert className="w-4.5 h-4.5 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <div className="space-y-1.5 text-left">
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                Enter password
              </label>
              <input
                id="admin-password-input"
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (authError) setAuthError('');
                }}
                placeholder="• • • • • •"
                className="w-full px-4 py-3.5 bg-white/40 border border-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 outline-none rounded-xl text-center font-bold tracking-[0.2em] text-slate-900 transition-all font-mono backdrop-blur-sm shadow-sm"
              />
            </div>

            <button
              id="admin-login-submit-btn"
              type="submit"
              className="w-full bg-gradient-brand hover:brightness-115 text-white py-3.5 rounded-2xl font-bold tracking-wider uppercase text-xs shadow-lg shadow-violet-600/20 cursor-pointer transition-all active:scale-[0.98]"
            >
              Unlock Controls
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- FILTERED DATA SETS ---
  const filteredReservations = reservations.filter((r) => 
    r.customerName.toLowerCase().includes(resSearch.toLowerCase()) ||
    r.productName.toLowerCase().includes(resSearch.toLowerCase()) ||
    r.queueNumber.toString() === resSearch.trim()
  );

  const filteredInventory = products.filter((p) =>
    p.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
    p.category.toLowerCase().includes(inventorySearch.toLowerCase())
  );

  const filteredSales = sales.filter((s) =>
    s.productName.toLowerCase().includes(salesSearch.toLowerCase()) ||
    s.customerName.toLowerCase().includes(salesSearch.toLowerCase()) ||
    s.queueNumber.toString() === salesSearch.trim()
  );

  return (
    <div className="space-y-10 py-4 max-w-7xl mx-auto px-4 md:px-0">
      
      {/* SALES & EARNINGS METRICS HEADER WITH GREEN $ SYMBOL & SIGN OUT */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          {/* Green $ symbol */}
          <span className="text-[#10B981] text-xl font-bold font-mono">
            $
          </span>
          <h1 className="text-[#8B5CF6] font-bold text-xs sm:text-sm tracking-widest font-mono uppercase">
            SALES & EARNINGS METRICS
          </h1>
        </div>
        
        {/* Sign Out button */}
        <button
          id="admin-signout-btn"
          onClick={handleSignOut}
          className="px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 text-[10px] sm:text-xs font-bold tracking-wider uppercase shadow-sm transition-all duration-200 cursor-pointer"
        >
          SIGN OUT DASHBOARD
        </button>
      </div>

      {/* 1. SALES & EARNINGS METRICS BENTO BOARD (Matching user image style) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-scale-up">
        {/* Card 1: TOTAL EARNINGS */}
        <div className="bg-white border-2 border-[#10B981]/20 hover:border-[#10B981]/40 rounded-[24px] p-6 md:p-8 flex flex-col justify-between shadow-[0_8px_30px_rgba(0,0,0,0.02)] transition-all duration-300">
          <div>
            <p className="text-[10px] text-[#0D9488] font-black uppercase tracking-wider font-mono">TOTAL EARNINGS</p>
            <h3 className="text-3xl md:text-4xl font-extrabold text-slate-950 mt-4 tracking-tight">
              ₱{totalEarnings.toLocaleString()}
            </h3>
          </div>
          <p className="text-xs text-[#10B981] font-bold mt-6 tracking-wide">
            Total received cash
          </p>
        </div>

        {/* Card 2: TODAY'S EARNINGS */}
        <div className="bg-white border border-[#E5E7EB] hover:border-slate-300 rounded-[24px] p-6 md:p-8 flex flex-col justify-between shadow-[0_8px_30px_rgba(0,0,0,0.02)] transition-all duration-300">
          <div>
            <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider font-mono">TODAY'S EARNINGS</p>
            <h3 className="text-3xl md:text-4xl font-extrabold text-[#7C3AED] mt-4 tracking-tight">
              ₱{todayEarnings.toLocaleString()}
            </h3>
          </div>
          <p className="text-xs text-[#8B5CF6]/85 font-semibold mt-6 tracking-wide">
            Daily sales
          </p>
        </div>

        {/* Card 3: WEEKLY SALES */}
        <div className="bg-white border border-[#E5E7EB] hover:border-slate-300 rounded-[24px] p-6 md:p-8 flex flex-col justify-between shadow-[0_8px_30px_rgba(0,0,0,0.02)] transition-all duration-300">
          <div>
            <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider font-mono">WEEKLY SALES</p>
            <h3 className="text-3xl md:text-4xl font-extrabold text-[#7C3AED] mt-4 tracking-tight">
              ₱{weeklyEarnings.toLocaleString()}
            </h3>
          </div>
          <p className="text-xs text-[#8B5CF6]/85 font-semibold mt-6 tracking-wide">
            Last 7 days
          </p>
        </div>

        {/* Card 4: MONTHLY SALES */}
        <div className="bg-white border border-[#E5E7EB] hover:border-slate-300 rounded-[24px] p-6 md:p-8 flex flex-col justify-between shadow-[0_8px_30px_rgba(0,0,0,0.02)] transition-all duration-300">
          <div>
            <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider font-mono">MONTHLY SALES</p>
            <h3 className="text-3xl md:text-4xl font-extrabold text-[#7C3AED] mt-4 tracking-tight">
              ₱{monthlyEarnings.toLocaleString()}
            </h3>
          </div>
          <p className="text-xs text-[#8B5CF6]/85 font-semibold mt-6 tracking-wide">
            Last 30 days
          </p>
        </div>

        {/* Card 5: ITEMS SOLD & PAID */}
        <div className="bg-white border border-[#E5E7EB] hover:border-slate-300 rounded-[24px] p-6 md:p-8 flex flex-col justify-between shadow-[0_8px_30px_rgba(0,0,0,0.02)] transition-all duration-300">
          <div>
            <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider font-mono">ITEMS SOLD & PAID</p>
            <h3 className="text-3xl md:text-4xl font-extrabold text-[#7C3AED] mt-4 tracking-tight">
              {totalItemsSold} <span className="text-xl md:text-2xl font-bold tracking-normal align-middle text-[#8B5CF6]">pcs</span>
            </h3>
          </div>
          <p className="text-xs text-[#8B5CF6]/85 font-semibold mt-6 tracking-wide">
            Paid and checked out
          </p>
        </div>

        {/* Card 6: ACTIVE HOLDS */}
        <div className="bg-white border border-[#E5E7EB] hover:border-slate-300 rounded-[24px] p-6 md:p-8 flex flex-col justify-between shadow-[0_8px_30px_rgba(0,0,0,0.02)] transition-all duration-300">
          <div>
            <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider font-mono">ACTIVE HOLDS</p>
            <h3 className="text-3xl md:text-4xl font-extrabold text-[#7C3AED] mt-4 tracking-tight">
              {totalActiveReservations} <span className="text-xl md:text-2xl font-bold tracking-normal align-middle text-[#8B5CF6]">holds</span>
            </h3>
          </div>
          <p className="text-xs text-[#8B5CF6]/85 font-semibold mt-6 tracking-wide">
            Expiring in 24 hrs
          </p>
        </div>
      </div>

      {/* 2. CHOOSE ACTION: ACTIVE RESERVATIONS & HOLD WORKFLOWS */}
      <div className="bg-white/40 backdrop-blur-md border border-white rounded-[32px] shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Active Reservation Hold List</h2>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Verify hold requests, clear payments, or release expired allocations.</p>
          </div>

          {/* Search Hold */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Name / Item / Queue..."
              value={resSearch}
              onChange={(e) => setResSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-white rounded-2xl text-xs outline-none focus:border-violet-500 transition-all text-slate-800 shadow-sm"
            />
          </div>
        </div>

        {filteredReservations.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-white/80 bg-white/20 rounded-[24px] flex flex-col items-center">
            <span className="text-4xl mb-3">📅</span>
            <p className="text-slate-800 font-bold text-xs">No active hold reservations found</p>
            <p className="text-slate-400 text-[11px] mt-0.5 max-w-xs font-medium">All allocated products have been cleared or cancelled.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[24px] border border-white/60 bg-white/20">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/50 border-b border-slate-100 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  <th className="px-5 py-4">Queue #</th>
                  <th className="px-5 py-4">Customer Name</th>
                  <th className="px-5 py-4">Reserved Item</th>
                  <th className="px-5 py-4">Reserved Time</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 text-xs">
                {filteredReservations.map((res) => (
                  <tr key={res.id} className="hover:bg-white/40 transition-colors">
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center justify-center font-mono font-bold w-10 h-10 rounded-xl bg-violet-50 text-violet-600 border border-violet-100 shadow-sm">
                        {res.queueNumber}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-900">{res.customerName}</td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-800">{res.productName}</div>
                      <div className="text-[10px] text-violet-600 font-bold mt-0.5">₱{res.productPrice.toLocaleString()}</div>
                    </td>
                    <td className="px-5 py-4 font-mono text-slate-400 text-[10px]">
                      {res.timestamp ? new Date(res.timestamp).toLocaleString() : 'Saving...'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2 shrink-0">
                        <button
                          id={`cancel-hold-${res.id}`}
                          onClick={() => handleCancelHold(res.id)}
                          className="flex items-center gap-1.5 px-3 py-2 border-2 border-red-500 hover:border-red-600 hover:bg-red-50 text-red-600 font-bold hover:text-red-700 rounded-xl transition-all uppercase tracking-wider text-[10px] cursor-pointer bg-white/50"
                          title="Reject Reservation & Restore Stock"
                        >
                          <RefreshCcw className="w-3.5 h-3.5" />
                          <span>Cancel Reservation</span>
                        </button>
                        <button
                          id={`confirm-pickup-${res.id}`}
                          onClick={() => handleConfirmPickup(res.id)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-sm transition-all font-semibold uppercase tracking-wider text-[10px] cursor-pointer"
                          title="Confirm customer pickup, checkout, and load to sales ledger"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Confirm Pickup & Payment</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. PRODUCT INVENTORY MANAGEMENT */}
      <div className="bg-white/40 backdrop-blur-md border border-white rounded-[32px] shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Store Catalog & Inventory</h2>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Add new products, restock shelves, or tweak pricing metrics.</p>
          </div>

          <div className="flex w-full sm:w-auto items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 sm:flex-initial sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Item / Category..."
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/50 border border-white rounded-2xl text-xs outline-none focus:border-violet-500 transition-all text-slate-800 shadow-sm"
              />
            </div>
            
            <button
              id="add-product-dashboard-btn"
              onClick={handleOpenAddProduct}
              className="px-4 py-2 bg-gradient-brand text-white text-xs font-bold uppercase tracking-wider rounded-2xl hover:brightness-110 flex items-center gap-2 cursor-pointer shadow-md shadow-violet-500/15 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          </div>
        </div>

        {filteredInventory.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-white/80 bg-white/20 rounded-[24px] flex flex-col items-center">
            <span className="text-4xl mb-3">👕</span>
            <p className="text-slate-800 font-bold text-xs">No catalog products on shelves</p>
            <p className="text-slate-400 text-[11px] mt-0.5 font-medium">Click "Add Product" to load inventory metadata.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredInventory.map((prod) => (
              <div 
                key={prod.id} 
                className="flex gap-4 p-4 border border-white/60 rounded-2xl items-center bg-white/30 backdrop-blur-sm shadow-sm hover:shadow-md transition-shadow"
              >
                <img 
                  src={prod.imageUrl} 
                  alt={prod.name} 
                  className="w-16 h-16 rounded-xl object-cover bg-white"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-200/60 backdrop-blur-sm text-slate-700 text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md">
                      {prod.category}
                    </span>
                    <span className={`text-[10px] font-bold ${prod.stock > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {prod.stock > 0 ? `● ${prod.stock} left` : '● Out of stock'}
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 truncate mt-1">{prod.name}</h4>
                  <p className="text-xs text-[#6C4CF1] font-bold mt-0.5">₱{prod.price.toLocaleString()}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    id={`edit-prod-${prod.id}`}
                    onClick={() => handleOpenEditProduct(prod)}
                    className="p-2 border border-slate-200/50 hover:border-violet-200 hover:bg-white text-slate-500 hover:text-[#6C4CF1] bg-white/30 rounded-xl transition-all cursor-pointer"
                    title="Edit Metadata"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    id={`delete-prod-${prod.id}`}
                    onClick={() => handleDeleteProduct(prod.id)}
                    className="p-2 border border-slate-200/50 hover:border-rose-200 hover:bg-rose-50 text-slate-500 hover:text-rose-600 bg-white/30 rounded-xl transition-all cursor-pointer"
                    title="Delete item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. SALES TRANSACTION LOG HISTORY LEDGER */}
      <div className="bg-white/40 backdrop-blur-md border border-white rounded-[32px] shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Sales ledger & Audit History</h2>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Permanent ledger of all completed, paid-in neighbor purchases.</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Buyer / Item / Queue..."
              value={salesSearch}
              onChange={(e) => setSalesSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/50 border border-white rounded-2xl text-xs outline-none focus:border-violet-500 transition-all text-slate-800 shadow-sm"
            />
          </div>
        </div>

        {filteredSales.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-white/80 bg-white/20 rounded-[24px] flex flex-col items-center">
            <span className="text-4xl mb-3">💵</span>
            <p className="text-slate-800 font-bold text-xs">Sales ledger is clear</p>
            <p className="text-slate-400 text-[11px] mt-0.5 font-medium">Transactions populate once active reservations are checked-out.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[24px] border border-white/60 bg-white/20">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/50 border-b border-slate-100 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  <th className="px-5 py-4">Receipt Date</th>
                  <th className="px-5 py-4">Receipt Time</th>
                  <th className="px-5 py-4">Customer Name</th>
                  <th className="px-5 py-4">Queue ID</th>
                  <th className="px-5 py-4 col-span-2">Acquired Product</th>
                  <th className="px-5 py-4 text-right">Settled Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 text-xs">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-white/40 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-slate-500 text-[10px]">{sale.dateStr}</td>
                    <td className="px-5 py-4 font-mono text-slate-400 text-[10px]">{sale.timeStr}</td>
                    <td className="px-5 py-4 font-bold text-slate-900">{sale.customerName}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex px-2.5 py-1 font-mono text-[10px] font-bold rounded-lg bg-slate-100 text-slate-800 border border-slate-200/50 shadow-sm">
                        Q-{sale.queueNumber}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-800" colSpan={2}>
                      <span>{sale.productName}</span>
                      <span className="text-[10px] text-slate-400 block font-normal mt-0.5">Qty: {sale.quantity} unit</span>
                    </td>
                    <td className="px-5 py-4 text-right font-black text-emerald-600 text-sm">
                      ₱{(sale.productPrice * sale.quantity).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================================
          POPUP MODAL: ADD / EDIT PRODUCT METADATA
          ============================================================================ */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowProductModal(false)} />

          <div className="relative bg-white/70 backdrop-blur-xl border border-white rounded-[32px] w-full max-w-lg shadow-2xl p-6 md:p-8 z-10 space-y-6 animate-scale-up">
            
            {/* Modal Exit */}
            <button 
              onClick={() => setShowProductModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/50 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div>
              <h3 className="text-lg font-bold text-slate-950">
                {editingProduct ? 'Edit Catalog Product' : 'Add New Inventory Item'}
              </h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Specify product specifics and upload cover assets.</p>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              
              {/* Product Cover Drag & Drop Asset Area */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Product Cover Photo
                </label>
                
                {formImageUrl ? (
                  <div className="relative group rounded-2xl overflow-hidden aspect-[16/9] border border-slate-200">
                    <img 
                      src={formImageUrl} 
                      alt="Preview upload" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                    <button
                      type="button"
                      onClick={() => setFormImageUrl('')}
                      className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-bold gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-5 h-5" />
                      <span>Change Cover Picture</span>
                    </button>
                  </div>
                ) : (
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl aspect-[16/9] flex flex-col items-center justify-center text-center p-6 cursor-pointer transition-all ${
                      dragActive 
                        ? 'border-violet-500 bg-violet-50/50' 
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/30'
                    }`}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden" 
                      accept="image/*"
                    />
                    
                    {isUploading ? (
                      <div className="space-y-2">
                        <RefreshCcw className="w-8 h-8 text-violet-500 animate-spin mx-auto" />
                        <p className="text-xs text-slate-500 font-medium">Uploading cover photo...</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
                        <p className="text-xs text-slate-500 leading-normal font-medium">
                          <strong>Drag and Drop picture here</strong> or click to explore computer
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">Supports PNG, JPG, GIF up to 5MB</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Text Input URL Fallback */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Or Paste Custom image URL
                </label>
                <input
                  type="url"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  placeholder="e.g. https://images.unsplash.com/your-image"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-violet-500 outline-none rounded-xl text-xs"
                />
              </div>

              {/* Product Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Vintage Oversized Shirt"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-violet-500 outline-none rounded-xl text-xs"
                />
              </div>

              {/* Category, Price, Stock Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 outline-none rounded-xl text-xs cursor-pointer"
                  >
                    <option value="Tees">Tees</option>
                    <option value="Hoodies">Hoodies</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Bags">Bags</option>
                    <option value="Outerwear">Outerwear</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Price (₱)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="300"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-violet-500 outline-none rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    Inventory Stock
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    placeholder="10"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-violet-500 outline-none rounded-xl text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isUploading}
                className="w-full bg-gradient-brand text-white py-3 md:py-3.5 rounded-2xl font-bold tracking-wider uppercase text-xs shadow-md shadow-violet-500/10 cursor-pointer disabled:bg-slate-300 transition-all text-center block"
              >
                {editingProduct ? 'Save Product Editions' : 'Load Product to Shelf'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
