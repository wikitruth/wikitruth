import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  closeButton?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeButton = true,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClass = size !== 'md' ? `modal-${size}` : '';

  return (
    <>
      <div className="modal fade in" style={{ display: 'block' }} onClick={onClose}>
        <div className={`modal-dialog ${sizeClass}`.trim()} onClick={(e) => e.stopPropagation()}>
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
                <h4 className="modal-title">{title}</h4>
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
