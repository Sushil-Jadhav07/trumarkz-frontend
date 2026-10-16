import React, { createContext, useContext, useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const FooterContext = createContext(null);
let openModalCount = 0;
let previousBodyOverflow = '';

// Keep conditional actions in their existing React scope while rendering them
// outside the scrolling body. The dialog form still owns its submit buttons.
const ModalFooter = ({ children, className = '', ...props }) => {
  const target = useContext(FooterContext);
  return target ? createPortal(<div {...props} className={className}>{children}</div>, target) : null;
};

// `sidePanel` is optional — when provided (and isOpen), it renders as a
// second card docked to the right of the main dialog, inside the same
// overlay, sliding in/out independently. Existing callers that don't pass
// it are completely unaffected.
// Put bottom actions in <Modal.Footer>. For forms, pass onSubmit to Modal
// and render fields in a div; the fixed footer stays inside the native form.
export const Modal = ({ isOpen, onClose, title, description = null, headerActions = null, children, footer = null, onSubmit, formId, bodyClassName = '', size = 'md', sidePanel = null, sidePanelWidth = 'max-w-sm', containerClassName = '' }) => {
  const titleId = useId();
  const [footerTarget, setFooterTarget] = useState(null);
  const Panel = onSubmit ? motion.form : motion.div;
  useEffect(() => {
    if (!isOpen) return;
    if (openModalCount === 0) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    openModalCount += 1;
    return () => {
      openModalCount -= 1;
      if (openModalCount === 0) document.body.style.overflow = previousBodyOverflow;
    };
  }, [isOpen]);
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-full'
  };

  // Anchor every popup to the viewport, outside animated page containers.
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 !m-0 flex items-center justify-center p-2"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className={`relative flex min-h-0 max-h-[96dvh] items-stretch gap-4 ${containerClassName}`}>
            <Panel
              id={formId}
              onSubmit={onSubmit}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? titleId : undefined}
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className={`min-h-0 w-full ${sizes[size]} bg-white rounded-2xl shadow-xl overflow-hidden max-h-[96dvh] flex flex-col`}
            >
              {title && (
                <div className="flex shrink-0 items-center justify-between gap-3 px-6 py-4 border-b border-gray-100">
                  <div className="min-w-0">
                    <h3 id={titleId} className="font-sora font-semibold text-lg text-brand-dark">{title}</h3>
                    {description && <p className="mt-0.5 text-xs text-gray-400 font-inter">{description}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {headerActions}
                    <button
                      type="button"
                      aria-label="Close dialog"
                      disabled={!onClose}
                      onClick={onClose}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>
              )}
              <FooterContext.Provider value={footerTarget}>
                <div data-modal-body className={`min-h-0 p-6 overflow-y-auto overscroll-contain thin-scrollbar ${bodyClassName}`}>{children}</div>
                <div ref={setFooterTarget} data-modal-footer className="shrink-0 border-t border-gray-100 bg-white px-6 py-4 empty:hidden">{footer}</div>
              </FooterContext.Provider>
            </Panel>
            <AnimatePresence>
              {sidePanel && (
                <motion.div
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24 }}
                  transition={{ duration: 0.18 }}
                  className={`hidden min-h-0 w-full ${sidePanelWidth} bg-white rounded-2xl shadow-xl overflow-hidden max-h-[96dvh] flex-col sm:flex`}
                >
                  {sidePanel}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

Modal.Footer = ModalFooter;

export default Modal;
