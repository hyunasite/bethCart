import React, { useState } from 'react';
import { Product } from '../types';
import { useStore } from '../StoreContext';
import { createReservationTransaction } from '../firebase';
import { X, CalendarCheck, AlertCircle, Sparkles } from 'lucide-react';

interface ReservationModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReservationModal: React.FC<ReservationModalProps> = ({ product, isOpen, onClose }) => {
  const { reservations } = useStore();
  const [fullName, setFullName] = useState('');
  const [queueNumber, setQueueNumber] = useState<number | ''>('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen || !product) return null;

  // Real-time active queue numbers already reserved in store
  const takenQueueNumbers = new Set(reservations.map((r) => r.queueNumber));

  // Regex Name Validation: Letters, spaces, apostrophes, hyphens allowed
  const validateFullName = (name: string): boolean => {
    const trimmed = name.trim();
    if (trimmed.length < 2) return false;
    // Allow standard localized letters, spaces, apostrophes, hyphens
    const nameRegex = /^[a-zA-Z\s'-]+$/;
    return nameRegex.test(trimmed);
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // 1. Validate full name inputs
    if (!validateFullName(fullName)) {
      setErrorMessage('Please enter a valid full name.');
      return;
    }

    // 2. Validate Queue select
    if (queueNumber === '') {
      setErrorMessage('Please select a queue number.');
      return;
    }

    const numericQueue = Number(queueNumber);
    if (isNaN(numericQueue) || numericQueue < 1 || numericQueue > 100) {
      setErrorMessage('Queue number must be between 1 and 100.');
      return;
    }

    // Double check on client side first (User convenience)
    if (takenQueueNumbers.has(numericQueue)) {
      setErrorMessage('Queue number already taken.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Execute the high-fidelity concurrency protected transaction
      const txnResult = await createReservationTransaction(product.id, fullName.trim(), numericQueue);
      
      if (txnResult.success) {
        setIsSuccess(true);
        // Clear input state
        setFullName('');
        setQueueNumber('');
        setTimeout(() => {
          setIsSuccess(false);
          onClose();
        }, 2200);
      } else {
        setErrorMessage(txnResult.message);
      }
    } catch (e) {
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm transition-opacity" 
        onClick={isSubmitting ? undefined : onClose}
      />

      {/* Modal Box */}
      <div className="relative bg-white/70 backdrop-blur-xl border border-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl z-10 p-6 md:p-8 transform transition-all animate-scale-up">
        
        {/* Close Button */}
        {!isSubmitting && !isSuccess && (
          <button 
            id="close-reserve-btn"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full hover:bg-white/50 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* SUCCESS Screen state */}
        {isSuccess ? (
          <div className="text-center py-8 flex flex-col items-center">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-5 animate-bounce">
              <CalendarCheck className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Reservation Confirmed!</h3>
            <p className="text-slate-500 text-xs mt-2 px-4 leading-relaxed">
              We look forward to seeing you at our store. Please present your assigned queue number to clear pickup pay-ins.
            </p>
            <div className="mt-6 flex items-center gap-1.5 px-4 py-2 bg-white/60 rounded-2xl border border-white">
              <Sparkles className="w-4 h-4 text-violet-500" />
              <span className="text-xs font-mono font-bold text-slate-600">Reserved for 24 Hours</span>
            </div>
          </div>
        ) : (
          /* REGULAR FORM STATE */
          <form onSubmit={handleConfirm} className="space-y-5">
            {/* Header */}
            <div>
              <span className="text-2xl mb-2 inline-block">📅</span>
              <h3 className="text-lg font-bold text-slate-950">Reserve Product</h3>
              <p className="text-xs text-slate-450 font-semibold">Complete details below to secure your pickup.</p>
            </div>

            {/* Target Product Summary Box */}
            <div className="flex items-center gap-3.5 bg-white/60 p-3 rounded-2xl border border-white shadow-sm">
              <img 
                src={product.imageUrl} 
                alt={product.name} 
                className="w-12 h-12 rounded-xl object-cover bg-white"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider leading-none">{product.category}</p>
                <p className="text-sm font-bold text-slate-900 truncate mt-1">{product.name}</p>
                <p className="text-sm font-extrabold text-[#6C4CF1] mt-0.5">₱{product.price.toLocaleString()}</p>
              </div>
            </div>

            {/* Error Message banner */}
            {errorMessage && (
              <div id="reservation-error" className="flex items-start gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 text-xs font-semibold">
                <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Customer Full Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Full Name
              </label>
              <input
                id="reserve-name-input"
                type="text"
                required
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (errorMessage.includes('name')) setErrorMessage('');
                }}
                placeholder="e.g. Juan Dela Cruz"
                className="w-full px-4 py-3.5 rounded-xl border border-white bg-white/50 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 outline-none text-slate-900 font-medium text-sm transition-all"
                disabled={isSubmitting}
              />
              <p className="text-[10px] text-slate-400 leading-normal">
                Letters, spaces, hyphens (-), and apostrophes (') only.
              </p>
            </div>

            {/* Queue Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Choose Queue Number
              </label>
              <div className="relative">
                <select
                  id="reserve-queue-select"
                  required
                  value={queueNumber}
                  onChange={(e) => {
                    setQueueNumber(e.target.value ? Number(e.target.value) : '');
                    if (errorMessage.includes('Queue')) setErrorMessage('');
                  }}
                  className="w-full px-4 py-3.5 rounded-xl border border-white focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 outline-none text-slate-900 font-semibold text-sm bg-white/50 cursor-pointer transition-all"
                  disabled={isSubmitting}
                >
                  <option value="">-- Choose Queue (1-100) --</option>
                  {Array.from({ length: 100 }, (_, i) => i + 1).map((num) => {
                    const isTaken = takenQueueNumbers.has(num);
                    return (
                      <option 
                        key={num} 
                        value={num} 
                        disabled={isTaken}
                        className={isTaken ? 'text-slate-300' : 'text-slate-800'}
                      >
                        {num} {isTaken ? '❌ (Already Taken)' : '✅ (Available)'}
                      </option>
                    );
                  })}
                </select>
              </div>
              <p className="text-[10px] text-slate-400">
                Unique queue lock prevents multiple active users claiming the same slot.
              </p>
            </div>

            {/* Submit Block */}
            <button
              id="confirm-reservation-btn"
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3.5 rounded-2xl font-bold tracking-wider uppercase text-sm text-white shadow-lg cursor-pointer transition-all ${
                isSubmitting 
                  ? 'bg-slate-300 shadow-none cursor-wait' 
                  : 'bg-gradient-brand hover:brightness-110 shadow-violet-600/15'
              }`}
            >
              {isSubmitting ? 'Processing Concurrency Check...' : 'Confirm Reservation'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
