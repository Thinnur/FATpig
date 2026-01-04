import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Wallet,
  PieChart,
  Settings,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { useThemeStore, THEMES } from "../../store/themeStore"; // Import THEMES
import { useUIStore } from "../../store/uiStore";
import { supabase } from "../../lib/supabase";
import { motion } from "framer-motion";

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentTheme, toggleMode, isDarkMode } = useThemeStore();
  const themeColors = THEMES[currentTheme]; // Ambil warna
  const { showNavbar } = useUIStore();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const menuItems = [
    { icon: LayoutDashboard, label: "Home", path: "/" },
    { icon: Wallet, label: "Dompet", path: "/transaksi" },
    { icon: PieChart, label: "Budget", path: "/anggaran" },
    { icon: Settings, label: "Settings", path: "/pengaturan" },
  ];

  return (
    <div
      className={`${
        isDarkMode ? "dark" : ""
      } min-h-screen flex flex-col md:flex-row bg-[#F2F2F7] dark:bg-black text-gray-900 dark:text-white transition-colors duration-300 font-sans theme-${currentTheme}`}
    >
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex w-72 fixed inset-y-0 left-0 z-50 bg-[#F2F2F7]/50 dark:bg-black/50 backdrop-blur-xl border-r border-gray-200/50 dark:border-white/10 p-6 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-10 px-4">
            <img
              src="/logo-ig.png"
              alt="FATpig"
              className="w-10 h-10 rounded-2xl shadow-lg object-cover"
            />
            <h1 className="text-2xl font-bold tracking-tight">FATpig</h1>
          </div>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl w-full transition-all duration-200 font-semibold text-[15px] ${
                    isActive
                      ? "bg-white dark:bg-[#1C1C1E] shadow-sm"
                      : "text-gray-500 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-[#1C1C1E]/50"
                  }`}
                  style={{ color: isActive ? themeColors.primary : undefined }}
                >
                  <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
        {/* ... (Footer Sidebar sama) */}
        <div className="bg-white/50 dark:bg-[#1C1C1E]/50 p-2 rounded-3xl backdrop-blur-md">
          <button
            onClick={toggleMode}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl hover:bg-white dark:hover:bg-[#2C2C2E] transition-all mb-1"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
          >
            <LogOut size={20} />
          </button>
        </div>
      </aside>

      {/* MOBILE TOP BAR */}
      <div className="md:hidden fixed top-0 w-full z-40 px-4 pt-safe mt-2">
        <div className="flex justify-between items-center bg-white/70 dark:bg-[#1C1C1E]/70 backdrop-blur-xl border border-white/20 dark:border-white/5 p-3 rounded-[24px] shadow-lg">
          <div className="flex items-center gap-2">
            <img
              src="/logo-ig.png"
              alt="FATpig"
              className="w-8 h-8 rounded-full object-cover"
            />
            <h1 className="text-lg font-bold tracking-tight">FATpig</h1>
          </div>
          <button
            onClick={toggleMode}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-black flex items-center justify-center transition-colors"
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>

      <main className="flex-1 pt-24 pb-32 px-4 md:ml-72 md:p-10 md:pt-10 relative z-0 selection:bg-blue-500/30">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 15, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.2, 0.65, 0.3, 0.9] }}
          className="max-w-5xl mx-auto"
        >
          {children}
        </motion.div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      {showNavbar && (
        <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[400px] z-30">
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="flex justify-around items-center h-20 bg-white/85 dark:bg-[#1C1C1E]/85 backdrop-blur-xl rounded-[32px] shadow-2xl border border-white/20 dark:border-white/10 px-1"
          >
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-300 ${
                    isActive
                      ? "text-white shadow-lg scale-105"
                      : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  }`}
                  style={{
                    backgroundColor: isActive
                      ? themeColors.primary
                      : "transparent",
                    boxShadow: isActive
                      ? `0 8px 20px -6px ${themeColors.primary}66`
                      : "none",
                  }}
                >
                  <item.icon size={24} strokeWidth={2.5} />
                </button>
              );
            })}
          </motion.div>
        </nav>
      )}
    </div>
  );
};
