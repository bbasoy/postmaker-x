import { create } from 'zustand';

interface GuideState {
  isOpen: boolean;
  activeSection: string | null;
  toggle: () => void;
  setOpen: (open: boolean) => void;
  setActiveSection: (section: string | null) => void;
}

export const useGuideStore = create<GuideState>((set) => ({
  isOpen: false,
  activeSection: null,
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  setOpen: (open) => set({ isOpen: open }),
  setActiveSection: (section) => set({ activeSection: section }),
}));
