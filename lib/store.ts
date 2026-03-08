import { create } from 'zustand';
import { Thread, EmailCategory, GTMTask } from '@/types';

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
}));

export function useFilteredThreads(): Thread[] {
  const threads = useInboxStore((s) => s.threads);
  const activeFilter = useInboxStore((s) => s.activeFilter);
  const categories = useInboxStore((s) => s.categories);

  if (activeFilter === 'all') return threads;
  return threads.filter((t) => categories.get(t.id) === activeFilter);
}
