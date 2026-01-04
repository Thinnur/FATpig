import React, { useEffect, useState } from "react";
import { AppLayout } from "../components/layout/AppLayout";
import { useThemeStore, THEMES } from "../store/themeStore";
import { supabase } from "../lib/supabase";
import {
  Moon,
  Save,
  LogOut,
  CheckCircle,
  ChevronRight,
  Palette,
  PiggyBank,
  Mic,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export const Pengaturan: React.FC = () => {
  const navigate = useNavigate();
  const { currentTheme, setTheme, isDarkMode, toggleMode } = useThemeStore();
  const themeColors = THEMES[currentTheme]; // Ambil warna tema aktif

  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [nama, setNama] = useState("");
  const [avatar, setAvatar] = useState("🐷");
  const [akumulasiSisa, setAkumulasiSisa] = useState(true);
  const [bahasaSuara, setBahasaSuara] = useState("id-ID");
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserEmail(user.email || "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (profile) {
        setNama(profile.nama || "");
        setAvatar(profile.avatar || "🐷");
        setAkumulasiSisa(profile.akumulasi_sisa !== false);
        setBahasaSuara(profile.bahasa_suara || "id-ID");
        if (profile.tema && THEMES[profile.tema]) setTheme(profile.tema as any);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase
        .from("profiles")
        .update({
          nama,
          avatar,
          tema: currentTheme,
          akumulasi_sisa: akumulasiSisa,
          bahasa_suara: bahasaSuara,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      if (!error) {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
      } else {
        alert("Gagal menyimpan: " + error.message);
      }
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };
  const avatarOptions = [
    "🐷",
    "🦁",
    "🐱",
    "🐶",
    "🦊",
    "🐼",
    "🐸",
    "🐔",
    "🦄",
    "👽",
  ];

  return (
    <AppLayout>
      <header className="mb-5 animate-fade-in-down">
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-widest">
          Preferences
        </p>
        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          Pengaturan
        </h2>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl">
        <div className="space-y-6">
          <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-4">
            Profil Saya
          </h3>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-[32px] p-6 shadow-sm border border-gray-100 dark:border-white/5">
            <div className="flex flex-col items-center mb-6">
              <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-[#2C2C2E] flex items-center justify-center text-5xl mb-4 border-4 border-white dark:border-gray-700 shadow-md">
                {avatar}
              </div>
              <div className="flex gap-2 flex-wrap justify-center px-4">
                {avatarOptions.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setAvatar(emoji)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      avatar === emoji
                        ? "bg-gray-200 dark:bg-gray-600 ring-2"
                        : ""
                    }`}
                    style={{
                      borderColor:
                        avatar === emoji ? themeColors.primary : "transparent",
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase ml-1 mb-1">
                  Nama Panggilan
                </label>
                <input
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-black text-gray-900 dark:text-white border-none font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase ml-1 mb-1">
                  Email
                </label>
                <input
                  disabled
                  value={userEmail}
                  className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-black text-gray-500 border-none font-medium cursor-not-allowed opacity-70"
                />
              </div>

              {/* TOMBOL SIMPAN DINAMIS */}
              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full py-4 rounded-[20px] font-bold text-white flex justify-center items-center gap-2 mt-4 hover:opacity-90 shadow-lg transition-all"
                style={{
                  backgroundColor: themeColors.primary,
                  boxShadow: `0 10px 30px -10px ${themeColors.primary}66`,
                }}
              >
                {isSaved ? <CheckCircle size={20} /> : <Save size={20} />}{" "}
                {isSaved
                  ? "Tersimpan!"
                  : loading
                  ? "Menyimpan..."
                  : "Simpan Profil"}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-4">
            Tampilan & Sistem
          </h3>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-[32px] overflow-hidden shadow-sm border border-gray-100 dark:border-white/5 divide-y divide-gray-100 dark:divide-white/5">
            <div className="p-5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl text-white flex items-center justify-center"
                  style={{
                    backgroundColor: isDarkMode ? "#333" : themeColors.primary,
                  }}
                >
                  <Moon size={20} />
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">
                    Dark Mode
                  </p>
                  <p className="text-xs text-gray-500">
                    Tampilan gelap yang nyaman.
                  </p>
                </div>
              </div>
              {/* TOGGLE DINAMIS */}
              <button
                onClick={toggleMode}
                className="w-14 h-8 rounded-full p-1 transition-all duration-300"
                style={{
                  backgroundColor: isDarkMode ? themeColors.primary : "#E5E7EB",
                }}
              >
                <div
                  className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-all duration-300 ${
                    isDarkMode ? "translate-x-6" : "translate-x-0"
                  }`}
                ></div>
              </button>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-xl text-white flex items-center justify-center"
                  style={{ backgroundColor: themeColors.primary }}
                >
                  <Palette size={20} />
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">
                    Warna Tema
                  </p>
                  <p className="text-xs text-gray-500">
                    Pilih warna aksen favoritmu.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 justify-between">
                {Object.entries(THEMES).map(([key, colors]) => (
                  <button
                    key={key}
                    onClick={() => setTheme(key as any)}
                    className={`w-10 h-10 rounded-full transition-all flex items-center justify-center ${
                      currentTheme === key
                        ? "ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-600 scale-110"
                        : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: colors.primary }}
                  >
                    {currentTheme === key && (
                      <CheckCircle size={16} className="text-white/80" />
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl text-white flex items-center justify-center"
                  style={{
                    backgroundColor: akumulasiSisa
                      ? themeColors.primary
                      : "#666",
                  }}
                >
                  <PiggyBank size={20} />
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">
                    Akumulasi Sisa Amplop
                  </p>
                  <p className="text-xs text-gray-500">
                    Sisa limit harian otomatis ditabung.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAkumulasiSisa(!akumulasiSisa)}
                className="w-14 h-8 rounded-full p-1 transition-all duration-300"
                style={{
                  backgroundColor: akumulasiSisa
                    ? themeColors.primary
                    : "#E5E7EB",
                }}
              >
                <div
                  className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-all duration-300 ${
                    akumulasiSisa ? "translate-x-6" : "translate-x-0"
                  }`}
                ></div>
              </button>
            </div>
            <div className="p-5 flex justify-between items-center border-t border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl text-white flex items-center justify-center"
                  style={{
                    backgroundColor: themeColors.primary,
                  }}
                >
                  <Mic size={20} />
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">
                    Bahasa Suara
                  </p>
                  <p className="text-xs text-gray-500">
                    Bahasa untuk pengenalan suara.
                  </p>
                </div>
              </div>
              <select
                value={bahasaSuara}
                onChange={(e) => setBahasaSuara(e.target.value)}
                className="px-4 py-2 rounded-xl bg-gray-50 dark:bg-[#2C2C2E] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="id-ID">🇮🇩 Indonesia</option>
                <option value="en-US">🇺🇸 English (US)</option>
                <option value="en-GB">🇬🇧 English (UK)</option>
                <option value="ms-MY">🇲🇾 Malay</option>
                <option value="zh-CN">🇨🇳 Chinese</option>
                <option value="ja-JP">🇯🇵 Japanese</option>
                <option value="ko-KR">🇰🇷 Korean</option>
              </select>
            </div>
          </div>
          <div className="bg-white dark:bg-[#1C1C1E] rounded-[32px] p-2 shadow-sm border border-gray-100 dark:border-white/5">
            <button
              onClick={handleLogout}
              className="w-full p-4 rounded-[24px] flex items-center justify-between hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-500 flex items-center justify-center group-hover:bg-red-200 dark:group-hover:bg-red-800">
                  <LogOut size={20} />
                </div>
                <span className="font-bold">Keluar Aplikasi</span>
              </div>
              <ChevronRight size={20} className="opacity-50" />
            </button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-8">
            FATpig v1.5.0 (Build 2025) • Made with ❤️
          </p>
        </div>
      </div>
    </AppLayout>
  );
};
