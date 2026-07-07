/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export interface ToastData {
  id?: string;
  type: 'success' | 'warning' | 'error' | 'info';
  message: string;
  title?: string;
}

interface ToastProps {
  toast: ToastData | null;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ toast, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [toast, onClose, duration]);

  if (!toast) return null;

  const typeConfig = {
    success: {
      bg: 'bg-emerald-50 border-emerald-100',
      text: 'text-emerald-800',
      iconText: 'text-emerald-500',
      icon: CheckCircle,
      bar: 'bg-emerald-500',
    },
    warning: {
      bg: 'bg-amber-50 border-amber-100',
      text: 'text-amber-800',
      iconText: 'text-amber-500',
      icon: AlertTriangle,
      bar: 'bg-amber-500',
    },
    error: {
      bg: 'bg-rose-50 border-rose-100',
      text: 'text-rose-800',
      iconText: 'text-rose-500',
      icon: XCircle,
      bar: 'bg-rose-500',
    },
    info: {
      bg: 'bg-blue-50 border-blue-100',
      text: 'text-blue-800',
      iconText: 'text-blue-500',
      icon: Info,
      bar: 'bg-blue-500',
    },
  };

  const config = typeConfig[toast.type];
  const Icon = config.icon;

  return (
    <div className="fixed top-5 right-5 z-[100] max-w-sm w-full no-print pointer-events-auto">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          className={`flex flex-col rounded-xl border p-4 shadow-lg ${config.bg} ${config.text} overflow-hidden`}
        >
          <div className="flex gap-3">
            <Icon className={`h-5 w-5 shrink-0 ${config.iconText}`} />
            <div className="flex-1 space-y-1">
              {toast.title && <h4 className="text-sm font-bold tracking-tight">{toast.title}</h4>}
              <p className="text-xs font-medium leading-relaxed opacity-90">{toast.message}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-black/5 transition-colors shrink-0 self-start text-slate-400 hover:text-slate-600"
              title="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: duration / 1000, ease: 'linear' }}
            className={`h-1 mt-3 rounded-full ${config.bar}`}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
