'use client';

import { useEffect, useCallback } from 'react';
import { useInboxStore } from '@/lib/store';

interface KeyboardHandlers {
  onArchive?: () => void;
  onReply?: () => void;
  onStar?: () => void;
  onDraft?: () => void;
  onCompose?: () => void;
  onSearch?: () => void;
  onOpen?: () => void;
  onBack?: () => void;
  onMarkUnread?: () => void;
}

export function useKeyboardShortcuts(handlers: KeyboardHandlers) {
  const moveSelection = useInboxStore((s) => s.moveSelection);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      switch (e.key) {
        case 'j':
          e.preventDefault();
          moveSelection(1);
          break;
        case 'k':
          e.preventDefault();
          moveSelection(-1);
          break;
        case 'Enter':
          e.preventDefault();
          handlers.onOpen?.();
          break;
        case 'Escape':
          e.preventDefault();
          handlers.onBack?.();
          break;
        case 'e':
          e.preventDefault();
          handlers.onArchive?.();
          break;
        case 'r':
          if (!e.shiftKey) {
            e.preventDefault();
            handlers.onReply?.();
          }
          break;
        case 's':
          e.preventDefault();
          handlers.onStar?.();
          break;
        case 'd':
          e.preventDefault();
          handlers.onDraft?.();
          break;
        case 'c':
          e.preventDefault();
          handlers.onCompose?.();
          break;
        case '/':
          e.preventDefault();
          handlers.onSearch?.();
          break;
        case 'U':
          if (e.shiftKey) {
            e.preventDefault();
            handlers.onMarkUnread?.();
          }
          break;
      }
    },
    [moveSelection, handlers]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
