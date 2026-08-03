import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAuthPrompt } from '../../context/AuthPromptContext';
import type { LegacyEntity } from '../../types/legacy';
import {
  buildEntryReplyOptions,
  normalizeEntryObjectName,
  type SupportedEntryObjectName,
} from './entryReplyOptions';
import { useViewportMenuPosition } from './useViewportMenuPosition';

type EntryReplyMenuProps = {
  entry: LegacyEntity;
  objectName?: SupportedEntryObjectName;
  compact?: boolean;
  onQuickContribution?: () => void;
  onOpen?: () => void;
};

const EntryReplyMenu: React.FC<EntryReplyMenuProps> = ({
  entry,
  objectName: providedObjectName,
  compact = false,
  onQuickContribution,
  onOpen,
}) => {
  const { user } = useAuth();
  const { requestSignIn } = useAuthPrompt();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLAnchorElement | null>(null);
  const menuRef = useRef<HTMLUListElement | null>(null);
  const menuPosition = useViewportMenuPosition({ isOpen, triggerRef, menuRef });
  const objectName = normalizeEntryObjectName(providedObjectName || entry.objectName);
  const options = useMemo(
    () => buildEntryReplyOptions(entry, objectName),
    [entry, objectName],
  );

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsidePointer = (event: PointerEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', handleOutsidePointer);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className={`dropdown pull-left entry-options ${isOpen ? 'open' : ''}`}>
      <a
        ref={triggerRef}
        href="#"
        className="text-muted no-underline dropdown-toggle"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label={compact ? 'Reply with…' : undefined}
        title={compact ? 'Reply with…' : undefined}
        onClick={(event) => {
          event.preventDefault();
          setIsOpen((value) => {
            const next = !value;
            if (next) onOpen?.();
            return next;
          });
        }}
      >
        <i className="fa fa-reply" aria-hidden="true"></i>
        {compact ? null : <span> Reply</span>}
      </a>
      {isOpen ? (
        <ul
          ref={menuRef}
          className="dropdown-menu wt-entry-actions-menu"
          style={{
            position: 'fixed',
            top: menuPosition?.top,
            left: menuPosition?.left,
            width: menuPosition?.width,
            maxHeight: menuPosition?.maxHeight,
            visibility: menuPosition ? 'visible' : 'hidden',
          }}
        >
          <li className="dropdown-header">REPLY WITH…</li>
          {onQuickContribution ? (
            <>
              <li>
                <button
                  type="button"
                  className="btn btn-link"
                  onClick={() => {
                    setIsOpen(false);
                    if (!user) {
                      requestSignIn({
                        intent: 'contribute',
                        returnUrl: `/opinions/create?parentId=${encodeURIComponent(entry._id)}&parentType=${encodeURIComponent(objectName)}`,
                      });
                      return;
                    }
                    onQuickContribution();
                  }}
                >
                  <i className="fa fa-bolt" aria-hidden="true"></i> Quick Contribution
                </button>
              </li>
              <li role="separator" className="divider"></li>
            </>
          ) : null}
          {options.map((item) => (
            <React.Fragment key={item.key}>
              {item.dividerBefore ? <li role="separator" className="divider"></li> : null}
              <li>
                <Link
                  to={item.to}
                  onClick={(event) => {
                    setIsOpen(false);
                    if (!user) {
                      event.preventDefault();
                      requestSignIn({
                        intent: item.key === 'new-comment' ? 'reply' : 'contribute',
                        returnUrl: item.to,
                      });
                    }
                  }}
                >
                  <span className={item.iconClass} aria-hidden="true"></span> {item.label}
                </Link>
              </li>
            </React.Fragment>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

export default EntryReplyMenu;
