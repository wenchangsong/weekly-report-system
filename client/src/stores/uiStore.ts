import { create } from 'zustand';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface UIState {
  sidebarOpen: boolean;
  toasts: Toast[];
  activeTeamId: number | null;
  teamRefreshKey: number;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setActiveTeamId: (id: number | null) => void;
  triggerTeamRefresh: () => void;
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toasts: [],
  activeTeamId: (() => {
    try { return JSON.parse(localStorage.getItem('activeTeamId') || 'null'); } catch { return null; }
  })(),
  teamRefreshKey: 0,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveTeamId: (id) => {
    localStorage.setItem('activeTeamId', JSON.stringify(id));
    set({ activeTeamId: id });
  },
  triggerTeamRefresh: () => set((s) => ({ teamRefreshKey: s.teamRefreshKey + 1 })),

  addToast: (message, type = 'info') => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
