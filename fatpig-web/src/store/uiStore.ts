import { create } from "zustand";

interface UIState {
  showNavbar: boolean;
  setShowNavbar: (show: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  showNavbar: true,
  setShowNavbar: (show) => set({ showNavbar: show }),
}));
