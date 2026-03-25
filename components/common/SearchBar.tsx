'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { useInboxStore } from '@/lib/store';

export function SearchBar({ onSearch }: { onSearch: (query: string) => void }) {
  const searchQuery = useInboxStore((s) => s.searchQuery);
  const setSearchQuery = useInboxStore((s) => s.setSearchQuery);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Cancel any pending debounced search and fire immediately
    clearTimeout(debounceRef.current);
    onSearch(searchQuery);
  };

  const handleChange = useCallback((value: string) => {
    setSearchQuery(value);
    // Debounce: auto-search after 400ms of inactivity
    clearTimeout(debounceRef.current);
    if (value.length >= 3 || value.length === 0) {
      debounceRef.current = setTimeout(() => onSearch(value), 400);
    }
  }, [setSearchQuery, onSearch]);

  const handleClear = () => {
    clearTimeout(debounceRef.current);
    setSearchQuery('');
    onSearch('');
    inputRef.current?.focus();
  };

  // Keyboard shortcut: / to focus search
  useEffect(() => {
    const handleSlash = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleSlash);
    return () => window.removeEventListener('keydown', handleSlash);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  return (
    <form onSubmit={handleSubmit} className="relative flex-1 max-w-xl">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search emails... (press /)"
        className="w-full rounded-lg border border-border-subtle bg-bg-primary py-2 pl-9 pr-8 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-blue focus:outline-none transition"
      />
      {searchQuery && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-muted hover:text-text-primary"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </form>
  );
}
