'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarState {
  isExpanded: boolean;
  expandSidebar: () => void;
  collapseSidebar: () => void;
  toggleSidebar: () => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isExpanded: true,
      expandSidebar: () => set({ isExpanded: true }),
      collapseSidebar: () => set({ isExpanded: false }),
      toggleSidebar: () => set((state) => ({ isExpanded: !state.isExpanded })),
    }),
    {
      name: 'sidebar-storage',
      partialize: (state) => ({ isExpanded: state.isExpanded }),
    }
  )
);