import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useThemeStore, THEMES } from "../store/themeStore";
import { motion } from "framer-motion";
import {
  Mail,
  Lock,
  LogIn,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { setTheme } = useThemeStore();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMsg("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      // Load user theme from database immediately after login
      if (authData.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("tema")
          .eq("id", authData.user.id)
          .single();

        if (profile?.tema && THEMES[profile.tema]) {
          setTheme(profile.tema as any);
        }
      }

      // Login berhasil, redirect ke Dashboard
      navigate("/");
    } catch (err: any) {
      setErrorMsg("Email atau password salah.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-white p-4 relative overflow-hidden font-sans">
      {/* Background Blobs (Sama dengan Register agar konsisten) */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-600/30 rounded-full blur-[100px] animate-pulse"></div>
      <div
        className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] animate-pulse"
        style={{ animationDelay: "2s" }}
      ></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[40px] shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-purple-500 to-blue-500 rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-lg mb-4">
              🐷
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Selamat Datang Kembali
            </h1>
            <p className="text-gray-400 text-sm mt-2">
              Login untuk mengelola keuanganmu
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-2xl flex items-center gap-2 text-red-400 text-xs font-medium animate-shake">
                <AlertCircle size={16} /> {errorMsg}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">
                Email
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                  size={20}
                />
                <input
                  required
                  name="email"
                  type="email"
                  placeholder="nama@email.com"
                  className="w-full bg-black/20 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">
                Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                  size={20}
                />
                <input
                  required
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="******"
                  className="w-full bg-black/20 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="text-right">
              <a
                href="/forgot-password"
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                Lupa password?
              </a>
            </div>

            <button
              disabled={loading}
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 py-4 rounded-2xl font-bold text-white shadow-lg shadow-blue-500/25 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  Masuk <LogIn size={20} />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-gray-400 text-sm">
              Belum punya akun?{" "}
              <Link
                to="/register"
                className="text-white font-bold hover:underline decoration-blue-500 decoration-2 underline-offset-4"
              >
                Daftar sekarang
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
