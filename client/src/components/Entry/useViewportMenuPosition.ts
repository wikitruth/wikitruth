import { useCallback, useLayoutEffect, useState, type RefObject } from 'react';

export interface ViewportMenuPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

interface UseViewportMenuPositionOptions {
  isOpen: boolean;
  triggerRef: RefObject<HTMLElement | null>;
  menuRef: RefObject<HTMLElement | null>;
}

export function useViewportMenuPosition({
  isOpen,
  triggerRef,
  menuRef,
}: UseViewportMenuPositionOptions): ViewportMenuPosition | null {
  const [position, setPosition] = useState<ViewportMenuPosition | null>(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;

    const visualViewport = window.visualViewport;
    const viewportTop = visualViewport?.offsetTop || 0;
    const viewportHeight = visualViewport?.height || window.innerHeight;
    const viewportBottom = viewportTop + viewportHeight;
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const edgeGap = 12;
    const triggerRect = trigger.getBoundingClientRect();
    const width = Math.min(300, Math.max(220, viewportWidth - edgeGap * 2));
    const naturalHeight = Math.min(menu.scrollHeight, 420);
    const availableAbove = Math.max(0, triggerRect.top - viewportTop - edgeGap);
    const availableBelow = Math.max(0, viewportBottom - triggerRect.bottom - edgeGap);
    const placeAbove = availableAbove > availableBelow && availableBelow < naturalHeight;
    const availableHeight = placeAbove ? availableAbove : availableBelow;
    const maxHeight = Math.max(140, Math.min(420, availableHeight));
    const renderedHeight = Math.min(menu.scrollHeight, maxHeight);
    const top = placeAbove
      ? Math.max(viewportTop + edgeGap, triggerRect.top - renderedHeight - 8)
      : Math.min(triggerRect.bottom + 8, viewportBottom - renderedHeight - edgeGap);
    const left = Math.min(
      Math.max(edgeGap, triggerRect.right - width),
      Math.max(edgeGap, viewportWidth - width - edgeGap),
    );

    setPosition({ top, left, width, maxHeight });
  }, [menuRef, triggerRef]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }

    updatePosition();
    const frame = window.requestAnimationFrame(updatePosition);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    window.visualViewport?.addEventListener('resize', updatePosition);
    window.visualViewport?.addEventListener('scroll', updatePosition);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      window.visualViewport?.removeEventListener('resize', updatePosition);
      window.visualViewport?.removeEventListener('scroll', updatePosition);
    };
  }, [isOpen, updatePosition]);

  return position;
}
