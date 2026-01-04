import { create } from "zustand";
import { persist } from "zustand/middleware";

// 1. Definisi Tipe Data (Ini yang kemarin kurang lengkap)
interface ThemeState {
  currentTheme: "ungu" | "hijau" | "biru" | "pink" | "orange";
  isDarkMode: boolean;
  setTheme: (theme: "ungu" | "hijau" | "biru" | "pink" | "orange") => void;
  toggleMode: () => void; // <--- INI YANG HILANG SEBELUMNYA
}

// 2. Definisi Warna (Palette)
export const THEMES: Record<string, { primary: string; accent: string }> = {
  ungu: { primary: "#6366f1", accent: "#818cf8" }, // Indigo
  hijau: { primary: "#10b981", accent: "#34d399" }, // Emerald
  biru: { primary: "#3b82f6", accent: "#60a5fa" }, // Blue
  pink: { primary: "#ec4899", accent: "#f472b6" }, // Pink
  orange: { primary: "#f97316", accent: "#fb923c" }, // Orange
};

// 3. Store Utama (Logic)
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      currentTheme: "ungu",
      isDarkMode: false,

      // Fungsi Ganti Warna Tema
      setTheme: (theme) => set({ currentTheme: theme }),

      // Fungsi Ganti Dark/Light Mode
      toggleMode: () =>
        set((state) => {
          const newMode = !state.isDarkMode;

          // Efek langsung ke HTML tag agar Tailwind merespon
          if (newMode) {
            document.documentElement.classList.add("dark");
          } else {
            document.documentElement.classList.remove("dark");
          }

          return { isDarkMode: newMode };
        }),
    }),
    {
      name: "fatpig-theme-storage", // Nama key di LocalStorage browser
      onRehydrateStorage: () => (state) => {
        // Saat website direfresh, cek apakah dulu user set Dark Mode?
        if (state?.isDarkMode) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      },
    }
  )
);
