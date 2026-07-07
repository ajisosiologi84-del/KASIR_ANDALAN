/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2, Info, HelpCircle } from 'lucide-react';

export interface ConfirmDialogData {
  show: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel?: () => void;
}

interface ConfirmModalProps {
  dialog: ConfirmDialogData | null;
  onClose: () => void;
}

export default function ConfirmModal({ dialog, onClose }: ConfirmModalProps) {
  if (!dialog) return null;

  const typeConfig = {
    danger: {
      accentBg: 'bg-rose-50 text-rose-600 border-rose-100',
      btnBg: 'bg-rose-600 hover:bg-rose-700 text-white',
      icon: Trash2,
    },
    warning: {
      accentBg: 'bg-amber-50 text-amber-600 border-amber-100',
      btnBg: 'bg-amber-500 hover:bg-amber-600 text-white',
      icon: AlertTriangle,
    },
    info: {
      accentBg: 'bg-blue-50 text-blue-600 border-blue-100',
      btnBg: 'bg-blue-600 hover:bg-blue-700 text-white',
      icon: Info,
    },
  };

  const config = typeConfig[dialog.type] || {
    accentBg: 'bg-slate-50 text-slate-600 border-slate-100',
    btnBg: 'bg-slate-800 hover:bg-slate-900 text-white',
    icon: HelpCircle,
  };

  const Icon = config.icon;

  const handleConfirm = () => {
    dialog.onConfirm();
    onClose();
  };

  const handleCancel = () => {
    if (dialog.onCancel) {
      dialog.onCancel();
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 no-print overflow-y-auto">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleCancel}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal content box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 p-6 z-10 flex flex-col gap-4 text-left"
        >
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl border shrink-0 ${config.accentBg}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="text-lg font-bold text-slate-900 font-display leading-tight">
                {dialog.title}
              </h3>
              <p className="text-slate-500 text-xs font-medium leading-relaxed">
                {dialog.message}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 mt-2 border-t border-slate-50">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              {dialog.cancelText || 'Batalkan'}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-sm ${config.btnBg}`}
            >
              {dialog.confirmText || 'Ya, Lanjutkan'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
