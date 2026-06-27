import React, { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import Button from './Button';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

const Modal = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  children,
  showCloseButton = true,
  closeOnOverlay = true,
}) => {
  const { t } = useTranslation();
  const panelRef = useRef(null);
  const triggerRef = useRef(null);

  // Capture triggering element so focus returns after close
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement;
    }
  }, [isOpen]);

  // Focus first focusable element inside modal when it opens
  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusable = panel.querySelectorAll(FOCUSABLE);
    const first = focusable[0];
    if (first) setTimeout(() => first.focus(), 50);
  }, [isOpen]);

  // Return focus to trigger when modal closes
  useEffect(() => {
    if (!isOpen && triggerRef.current) {
      triggerRef.current.focus?.();
      triggerRef.current = null;
    }
  }, [isOpen]);

  // Trap focus inside modal
  const handleKeyDown = useCallback((e) => {
    if (!isOpen) return;

    if (e.key === 'Escape') {
      onClose?.();
      return;
    }

    if (e.key !== 'Tab') return;

    const panel = panelRef.current;
    if (!panel) return;
    const focusable = Array.from(panel.querySelectorAll(FOCUSABLE));
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, [isOpen, onClose]);

  // Voice commands: "confirm" and "cancel"
  useEffect(() => {
    if (!isOpen) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    recognition.onresult = (event) => {
      const text = (event.results?.[0]?.[0]?.transcript || '').toLowerCase().trim();
      const confirmWords = ['confirm', 'yes', 'ok', 'okay', 'sure', 'proceed', 'हाँ', 'हाना'];
      const cancelWords = ['cancel', 'no', 'stop', 'back', 'नहीं', 'রদ'];
      if (confirmWords.some(w => text.includes(w))) onConfirm?.();
      else if (cancelWords.some(w => text.includes(w))) { onCancel?.(); onClose?.(); }
    };

    recognition.onerror = () => { /* silent */ };

    try { recognition.start(); } catch { /* ok */ }
    return () => { try { recognition.stop(); } catch { /* ok */ } };
  }, [isOpen, onConfirm, onCancel, onClose]);

  if (!isOpen) return null;

  const icons = {
    success: <CheckCircle className="w-16 h-16 text-green-500" />,
    error:   <AlertCircle className="w-16 h-16 text-red-500" />,
    warning: <AlertTriangle className="w-16 h-16 text-yellow-500" />,
    info:    <Info className="w-16 h-16 text-blue-500" />,
    confirm: <AlertTriangle className="w-16 h-16 text-government-blue" />,
  };

  const handleOverlayClick = (e) => {
    if (closeOnOverlay && e.target === e.currentTarget) onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fade-in"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={message ? 'modal-desc' : undefined}
        className="bg-white rounded-kiosk-lg shadow-2xl w-full animate-slide-up overflow-hidden flex flex-col"
        style={{ maxWidth: 'calc(1100px * var(--ui-scale))', height: 'calc(620px * var(--ui-scale))', maxHeight: '88vh' }}
      >
        {/* Header */}
        <div className="relative p-6 pb-0">
          {showCloseButton && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              aria-label={t('app.close')}
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-8 text-center flex-1 overflow-y-auto flex flex-col items-center justify-center">
          {type && icons[type] && (
            <div className="flex justify-center mb-6" aria-hidden="true">
              {icons[type]}
            </div>
          )}

          {title && (
            <h2 id="modal-title" className="text-kiosk-2xl font-bold text-gray-800 mb-4">
              {title}
            </h2>
          )}

          {message && (
            <p id="modal-desc" className="text-kiosk-lg text-gray-600 mb-6">
              {message}
            </p>
          )}

          {children}
        </div>

        {/* Actions */}
        {(confirmText || cancelText) && (
          <div className="p-6 bg-gray-50 flex flex-col sm:flex-row gap-4 justify-center flex-shrink-0">
            {cancelText && (
              <Button variant="secondary" onClick={onCancel || onClose} size="large" className="min-w-[150px]">
                {cancelText}
              </Button>
            )}
            {confirmText && (
              <Button variant="primary" onClick={onConfirm} size="large" className="min-w-[150px]">
                {confirmText}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
