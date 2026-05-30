import React from 'react';
import { useStore } from '../StoreContext';
import { X, Trash2, Plus, Minus, ArrowRight } from 'lucide-react';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenReserve: (productId: string) => void;
}

export const CartModal: React.FC<CartModalProps> = ({ isOpen, onClose, onOpenReserve }) => {
  const { cart, removeFromCart, updateCartQuantity } = useStore();

  if (!isOpen) return null;

  const totalSum = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop overlay */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Cart Panel Slide-over */}
      <div className="relative w-full max-w-md bg-white/70 backdrop-blur-xl border-l border-white h-full shadow-2xl flex flex-col z-10 animate-slide-in">
        
        {/* Header Drawer */}
        <div className="p-6 border-b border-white/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🛍️</span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Your Cart</h2>
              <p className="text-xs text-slate-400 font-medium">Local temporary shopping list</p>
            </div>
          </div>
          <button 
            id="close-cart-btn"
            onClick={onClose}
            className="p-2 -mr-2 rounded-full hover:bg-white/50 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center justify-center h-full">
              <span className="text-5xl mb-4 select-none">🛒</span>
              <p className="text-slate-900 font-bold text-base">Your cart is currently empty</p>
              <p className="text-slate-400 text-xs mt-1 px-4 max-w-xs leading-relaxed">
                Add available neighborhood items to your cart to keep track of your choices.
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div 
                key={item.product.id} 
                className="flex items-center gap-4 bg-white/50 backdrop-blur-md p-3.5 rounded-2xl border border-white/80 shadow-sm"
              >
                {/* Mini Image */}
                <img 
                  src={item.product.imageUrl} 
                  alt={item.product.name} 
                  className="w-16 h-16 object-cover rounded-xl bg-white"
                  referrerPolicy="no-referrer"
                />
                
                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-slate-900 truncate">
                    {item.product.name}
                  </h3>
                  <p className="text-xs text-slate-400 leading-none mt-1">{item.product.category}</p>
                  <p className="text-sm font-extrabold text-[#6C4CF1] mt-1.5">
                    ₱{item.product.price.toLocaleString()}
                  </p>
                </div>

                {/* Micro Quantities & Actions */}
                <div className="flex flex-col items-end gap-2.5">
                  <button 
                    id={`remove-cart-item-${item.product.id}`}
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-slate-450 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex items-center bg-white/60 backdrop-blur-sm border border-slate-200/50 rounded-xl overflow-hidden px-1">
                    <button 
                      onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                      className="p-1 text-slate-500 hover:bg-white rounded-lg cursor-pointer transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-2.5 text-xs text-slate-900 font-bold select-none min-w-[20px] text-center font-mono">
                      {item.quantity}
                    </span>
                    <button 
                      onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                      className="p-1 text-slate-500 hover:bg-white rounded-lg cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Area with Pricing & Checkout notice */}
        {cart.length > 0 && (
          <div className="p-6 border-t border-white/50 bg-white/50 backdrop-blur-lg space-y-4">
            <div className="flex items-center justify-between font-bold text-slate-800 text-base">
              <span>Estimated Value:</span>
              <span className="text-xl font-black text-[#6C4CF1]">
                ₱{totalSum.toLocaleString()}
              </span>
            </div>

            {/* No-Checkout system guidance */}
            <div className="p-4 bg-violet-500/10 backdrop-blur-md rounded-2xl border border-violet-500/25 flex flex-col gap-2.5">
              <div className="flex items-start gap-2.5">
                <span className="text-lg leading-none">💡</span>
                <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                  <strong>Online checkout is disabled.</strong> To secure yours, reserve products individually using the <strong>Reserve Now</strong> modal on the store shelf.
                </p>
              </div>
              <div className="space-y-1.5">
                {cart.map((item) => (
                  <button
                    key={item.product.id}
                    onClick={() => {
                      onOpenReserve(item.product.id);
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 bg-gradient-brand hover:brightness-110 text-white rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer shadow-sm"
                  >
                    <span>Reserve "{item.product.name}"</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
