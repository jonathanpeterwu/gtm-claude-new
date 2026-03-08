'use client';

import { X } from 'lucide-react';
import { KEYBOARD_SHORTCUTS } from '@/types';
import { useEffect } from 'react';

export function KeyboardShortcutsModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-border-subtle bg-bg-secondary p-6 shadow-xl animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="rounded p-1 text-text-muted hover:text-text-primary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2">
          {KEYBOARD_SHORTCUTS.map((shortcut) => (
            <div key={shortcut.action} className="flex items-center justify-between py-1">
              <span className="text-sm text-text-secondary">{shortcut.description}</span>
              <kbd className="rounded border border-border-subtle bg-bg-primary px-2 py-0.5 text-xs font-mono text-text-muted">
                {shortcut.modifiers?.map((m) => m.charAt(0).toUpperCase() + m.slice(1) + '+').join('') || ''}
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
