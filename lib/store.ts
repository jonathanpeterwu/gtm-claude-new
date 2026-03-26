import { create } from 'zustand';
import { Thread, EmailCategory, GTMTask, LinkedAccount, InboxMode, InboxSuggestion } from '@/types';
import { useMemo } from 'react';

const ACCOUNT_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

interface InboxState {
  threads: Thread[];
  selectedThreadId: string | null;
  selectedIndex: number;
  isLoading: boolean;
  searchQuery: string;
  activeFilter: EmailCategory | 'all';
  categories: Map<string, EmailCategory>;
  tasks: GTMTask[];
  sidebarOpen: boolean;
  composing: boolean;
  aiDrafting: boolean;

  // Multi-account
  accounts: LinkedAccount[];
  activeAccountEmail: string | null;
  inboxMode: InboxMode;
  threadAccountMap: Map<string, string>;
  suggestions: InboxSuggestion[];

  setThreads: (threads: Thread[]) => void;
  selectThread: (id: string | null) => void;
  selectIndex: (index: number) => void;
  moveSelection: (delta: number) => void;
  setLoading: (loading: boolean) => void;
  setSearchQuery: (query: string) => void;
  setActiveFilter: (filter: EmailCategory | 'all') => void;
  setCategories: (categories: Map<string, EmailCategory>) => void;
  updateThread: (id: string, updates: Partial<Thread>) => void;
  removeThread: (id: string) => void;
  addTask: (task: GTMTask) => void;
  updateTask: (id: string, updates: Partial<GTMTask>) => void;
  setSidebarOpen: (open: boolean) => void;
  setComposing: (composing: boolean) => void;
  setAiDrafting: (aiDrafting: boolean) => void;

  // Multi-account actions
  addAccount: (account: LinkedAccount) => void;
  removeAccount: (email: string) => void;
  setActiveAccount: (email: string | null) => void;
  setInboxMode: (mode: InboxMode) => void;
  setThreadAccountMap: (map: Map<string, string>) => void;
  mergeThreads: (threads: Thread[], accountEmail: string) => void;
  setSuggestions: (suggestions: InboxSuggestion[]) => void;

  // Optimistic actions
  optimisticArchive: (threadId: string) => string | null;
  optimisticStar: (threadId: string, starred: boolean) => void;
  optimisticMarkRead: (threadId: string) => void;
}

export const useInboxStore = create<InboxState>((set, get) => ({
  threads: [],
  selectedThreadId: null,
  selectedIndex: 0,
  isLoading: false,
  searchQuery: '',
  activeFilter: 'all',
  categories: new Map(),
  tasks: [],
  sidebarOpen: true,
  composing: false,
  aiDrafting: false,

  accounts: [],
  activeAccountEmail: null,
  inboxMode: 'single' as InboxMode,
  threadAccountMap: new Map(),
  suggestions: [],

  setThreads: (threads) => set({ threads }),
  selectThread: (id) => {
    const index = id ? get().threads.findIndex((t) => t.id === id) : 0;
    set({ selectedThreadId: id, selectedIndex: Math.max(0, index) });
  },
  selectIndex: (index) => {
    const { threads, activeFilter, categories } = get();
    const filtered = activeFilter === 'all' ? threads : threads.filter((t) => categories.get(t.id) === activeFilter);
    const clamped = Math.max(0, Math.min(index, filtered.length - 1));
    set({ selectedIndex: clamped, selectedThreadId: filtered[clamped]?.id || null });
  },
  moveSelection: (delta) => {
    const { selectedIndex } = get();
    get().selectIndex(selectedIndex + delta);
  },
  setLoading: (isLoading) => set({ isLoading }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setActiveFilter: (activeFilter) => set({ activeFilter, selectedIndex: 0, selectedThreadId: null }),
  setCategories: (categories) => set({ categories }),
  updateThread: (id, updates) =>
    set((state) => ({
      threads: state.threads.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
  removeThread: (id) =>
    set((state) => ({
      threads: state.threads.filter((t) => t.id !== id),
      selectedThreadId: state.selectedThreadId === id ? null : state.selectedThreadId,
    })),
  addTask: (task) => set((state) => ({ tasks: [task, ...state.tasks] })),
  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setComposing: (composing) => set({ composing }),
  setAiDrafting: (aiDrafting) => set({ aiDrafting }),

  // Multi-account actions
  addAccount: (account) =>
    set((state) => {
      if (state.accounts.some((a) => a.email === account.email)) return state;
      const color = ACCOUNT_COLORS[state.accounts.length % ACCOUNT_COLORS.length];
      return { accounts: [...state.accounts, { ...account, color }] };
    }),
  removeAccount: (email) =>
    set((state) => ({
      accounts: state.accounts.filter((a) => a.email !== email),
      activeAccountEmail: state.activeAccountEmail === email ? null : state.activeAccountEmail,
    })),
  setActiveAccount: (email) => set({ activeAccountEmail: email }),
  setInboxMode: (inboxMode) => set({ inboxMode }),
  setThreadAccountMap: (threadAccountMap) => set({ threadAccountMap }),
  mergeThreads: (threads, accountEmail) =>
    set((state) => {
      const newMap = new Map(state.threadAccountMap);
      threads.forEach((t) => newMap.set(t.id, accountEmail));
      const existing = state.threads.filter((t) => newMap.get(t.id) !== accountEmail);
      const merged = [...existing, ...threads].sort(
        (a, b) => new Date(b.lastMessageDate).getTime() - new Date(a.lastMessageDate).getTime()
      );
      return { threads: merged, threadAccountMap: newMap };
    }),
  setSuggestions: (suggestions) => set({ suggestions }),

  // Optimistic UI actions — update store instantly, return next thread ID
  optimisticArchive: (threadId) => {
    const { threads, selectedIndex, activeFilter, categories, threadAccountMap } = get();
    const filtered = activeFilter === 'all' ? threads : threads.filter((t) => categories.get(t.id) === activeFilter);
    const currentIndex = filtered.findIndex((t) => t.id === threadId);
    const remaining = filtered.filter((t) => t.id !== threadId);
    const nextIndex = Math.min(currentIndex, remaining.length - 1);
    const nextThreadId = nextIndex >= 0 ? remaining[nextIndex]?.id || null : null;

    const cleanedMap = new Map(threadAccountMap);
    cleanedMap.delete(threadId);

    set((state) => ({
      threads: state.threads.filter((t) => t.id !== threadId),
      threadAccountMap: cleanedMap,
      selectedThreadId: nextThreadId,
      selectedIndex: Math.max(0, nextIndex),
    }));

    return nextThreadId;
  },

  optimisticStar: (threadId, starred) => {
    set((state) => ({
      threads: state.threads.map((t) =>
        t.id === threadId ? { ...t, isStarred: starred } : t
      ),
    }));
  },

  optimisticMarkRead: (threadId) => {
    set((state) => {
      const thread = state.threads.find((t) => t.id === threadId);
      if (!thread || !thread.isUnread) return state;
      return {
        threads: state.threads.map((t) =>
          t.id === threadId
            ? { ...t, isUnread: false, messages: t.messages.map((m) => ({ ...m, isUnread: false })) }
            : t
        ),
      };
    });
  },
}));

// Memoized filtered threads hook
export function useFilteredThreads(): Thread[] {
  const threads = useInboxStore((s) => s.threads);
  const activeFilter = useInboxStore((s) => s.activeFilter);
  const categories = useInboxStore((s) => s.categories);

  return useMemo(() => {
    if (activeFilter === 'all') return threads;
    return threads.filter((t) => categories.get(t.id) === activeFilter);
  }, [threads, activeFilter, categories]);
}

// Selector for a single thread's category — avoids re-render of all rows
export function useThreadCategory(threadId: string): EmailCategory | undefined {
  return useInboxStore((s) => s.categories.get(threadId));
}
