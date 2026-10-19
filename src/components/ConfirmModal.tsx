import React, { useEffect } from 'react';
import { AlertTriangle, Info, CheckCircle2, Trash2, Edit3, X, HelpCircle } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message?: string;
  description?: string;
  confirmText?: string;
  confirmLabel?: string;
  cancelText?: string;
  cancelLabel?: string;
  type?: 'danger' | 'warning' | 'primary' | 'info';
  variant?: 'danger' | 'warning' | 'primary' | 'info';
  icon?: React.ReactNode;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  description,
  confirmText,
  confirmLabel,
  cancelText,
  cancelLabel,
  type,
  variant,
  icon,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const actualType = variant || type || 'warning';
  const actualMessage = description || message || '';
  const actualConfirmText = confirmLabel || confirmText || 'Confirmar';
  const actualCancelText = cancelLabel || cancelText || 'Cancelar';

  const getStyleByType = () => {
    switch (actualType) {
      case 'danger':
        return {
          headerBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          btnConfirm: 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30',
          defaultIcon: <Trash2 className="w-6 h-6 text-rose-400 animate-pulse" />,
          badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        };
      case 'primary':
      case 'info':
        return {
          headerBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
          btnConfirm: 'bg-gradient-to-r from-primary to-indigo-600 hover:brightness-110 text-white shadow-primary/30',
          defaultIcon: <Edit3 className="w-6 h-6 text-primary-light" />,
          badge: 'bg-primary/20 text-primary-light border-primary/40',
        };
      case 'warning':
      default:
        return {
          headerBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          btnConfirm: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-dark-900 font-black shadow-amber-500/30',
          defaultIcon: <AlertTriangle className="w-6 h-6 text-amber-400 animate-pulse" />,
          badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        };
    }
  };

  const style = getStyleByType();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="bg-[#121528] border border-white/15 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl animate-scaleIn relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Glow */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 ${actualType === 'danger' ? 'bg-rose-500' : actualType === 'primary' ? 'bg-primary' : 'bg-amber-500'}`} />

        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${style.headerBg}`}>
            {icon || style.defaultIcon}
          </div>

          <div className="space-y-1 flex-1 min-w-0">
            <h3 className="text-lg font-black text-white tracking-tight leading-snug">
              {title}
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">
              {actualMessage}
            </p>
          </div>

          <button
            onClick={onCancel}
            disabled={isLoading}
            className="text-gray-400 hover:text-white p-1 rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
          >
            {actualCancelText}
          </button>
          <button
            type="button"
            onClick={async () => {
              await onConfirm();
            }}
            disabled={isLoading}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer ${style.btnConfirm}`}
          >
            {isLoading && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
            <span>{actualConfirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
