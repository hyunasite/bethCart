import React from 'react';
import { Product } from '../types';
import { ShoppingCart, CalendarRange } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onReserve: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onReserve, onAddToCart }) => {
  const isAvailable = product.stock > 0;
  
  // Status Bullet Rendering Logic (exactly as shown in mockup design image)
  let statusText = '';
  let statusColor = '';

  if (product.stock > 0) {
    statusText = 'Available';
    statusColor = 'text-emerald-500';
  } else if (product.status === 'Reserved') {
    statusText = 'Reserved';
    statusColor = 'text-amber-500';
  } else {
    statusText = 'Sold out';
    statusColor = 'text-[#F43F5E]';
  }

  return (
    <div id={`product-card-${product.id}`} className="group relative bg-white/75 backdrop-blur-xl border border-white/60 rounded-[32px] overflow-hidden shadow-[0_12px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_24px_48px_rgba(108,76,241,0.18)] transition-all duration-300 flex flex-col h-full transform hover:-translate-y-1">
      {/* Product Image Area */}
      <div className="relative aspect-square overflow-hidden bg-violet-50/10 p-2">
        <img
          src={product.imageUrl || 'https://images.unsplash.com/photo-1534126511673-b6899657816a?auto=format&fit=crop&q=80&w=600'}
          alt={product.name}
          className="w-full h-full object-cover rounded-[24px] group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        
        {/* Small subtle Category overlay */}
        <span className="absolute bottom-4 left-4 bg-slate-900/40 text-white leading-none text-[8px] uppercase font-extrabold tracking-widest px-2.5 py-1.5 rounded-lg backdrop-blur-md">
          {product.category}
        </span>
      </div>

      {/* product Info details */}
      <div className="p-5 flex flex-col flex-grow justify-between gap-4">
        <div className="space-y-2">
          {/* Name wraps elegantly with max-height and ellipsis constraint */}
          <h3 className="text-slate-800 font-bold text-sm tracking-tight leading-snug line-clamp-2 h-10 group-hover:text-[#6C4CF1] transition-colors">
            {product.name}
          </h3>
          
          {/* Status bullet precisely below name (Mockup specification) */}
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-emerald-500' : product.status === 'Reserved' ? 'bg-amber-500' : 'bg-red-500'}`} />
            <span className={`text-[11px] font-extrabold ${statusColor} tracking-wide`}>
              {statusText}
            </span>
          </div>

          {/* Price and Stock details */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-base font-extrabold text-[#6C4CF1] tracking-tight">
              ₱{product.price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
            <span className="text-slate-400 font-bold text-[11px] font-sans">
              {product.stock > 0 ? `${product.stock} pcs left` : 'Sold out'}
            </span>
          </div>
        </div>

        {/* Action Button Segment (Double Column layout matching design spec, stacked on mobile) */}
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Add to Cart button */}
          <button
            id={`add-to-cart-${product.id}`}
            onClick={() => onAddToCart(product)}
            disabled={!isAvailable}
            className={`w-full sm:flex-1 flex items-center justify-center gap-1.5 py-3 px-2 rounded-2xl text-[10px] font-extrabold tracking-wider uppercase transition-all duration-200 bg-zinc-200/60 hover:bg-zinc-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm cursor-pointer`}
            title="Add to local Cart"
          >
            <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
            <span>Cart</span>
          </button>

          {/* Reserve Now button */}
          <button
            id={`reserve-btn-${product.id}`}
            onClick={() => onReserve(product)}
            disabled={!isAvailable}
            className={`w-full sm:flex-[1.5] flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl text-[10px] font-extrabold tracking-wider uppercase transition-all duration-200 text-white shadow-md active:scale-[0.98] cursor-pointer ${
              isAvailable 
                ? 'bg-gradient-brand hover:brightness-110 shadow-violet-500/10 hover:shadow-violet-500/25' 
                : 'bg-white/30 text-slate-400 border border-white/50 shadow-none disabled:cursor-not-allowed'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5 shrink-0" />
            <span>Reserve Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
