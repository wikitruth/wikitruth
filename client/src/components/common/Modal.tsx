import React, { useEffect, useId, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  closeButton?: boolean;
  className?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeButton = true,
  className = '',
}) => {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      document.body.classList.remove('modal-open');
      return undefined;
    }

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    document.body.classList.add('modal-open');
    const focusFrame = window.requestAnimationFrame(() => {
      const preferredTarget = dialogRef.current?.querySelector<HTMLElement>('[data-autofocus]');
      (preferredTarget || dialogRef.current)?.focus();
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('modal-open');
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClass = size !== 'md' ? `modal-${size}` : '';

  return (
    <>
      <div
        className={`modal fade in ${className}`.trim()}
        style={{ display: 'block' }}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : 'Dialog'}
      >
        <div
          ref={dialogRef}
          className={`modal-dialog ${sizeClass}`.trim()}
          onClick={(e) => e.stopPropagation()}
          tabIndex={-1}
        >
          <div className="modal-content">
            {title && (
              <div className="modal-header">
                {closeButton && (
                  <button
                    type="button"
                    className="close"
                    onClick={onClose}
                    aria-label="Close"
                  >
                    <span aria-hidden="true">&times;</span>
                  </button>
                )}
                <h4 className="modal-title" id={titleId}>{title}</h4>
              </div>
            )}
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade in"></div>
    </>
  );
};

export default Modal;
