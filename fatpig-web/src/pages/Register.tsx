import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  AlertCircle,
} from "lucide-react";

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    nama: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMsg(""); // Hilangkan error saat user mengetik ulang
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    // 1. Validasi Input
    if (formData.password !== formData.confirmPassword) {
      return setErrorMsg("Password dan Konfirmasi Password tidak sama.");
    }
    if (formData.password.length < 6) {
      return setErrorMsg("Password minimal 6 karakter.");
    }

    setLoading(true);

    try {
      // 2. Daftar ke Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.nama, // Simpan nama di metadata juga
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // 3. Simpan data profil ke tabel 'profiles'
        // Ini penting agar Avatar dan Tema bisa berjalan di Dashboard
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: authData.user.id,
          nama: formData.nama,
          email: formData.email,
          tema: "ungu", // Default tema awal
          avatar: "🐷", // Default avatar awal
          updated_at: new Date().toISOString(),
        });

        if (profileError) {
          console.error("Gagal membuat profil:", profileError);
          // Kita tidak throw error di sini agar user tetap bisa login meski profil gagal (opsional)
        }

        // 4. Sukses
        alert("Registrasi Berhasil! Silakan Login.");
        navigate("/login");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat registrasi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-white p-4 relative overflow-hidden font-sans">
      {/* Background Blobs (Efek Cahaya Belakang) */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-600/30 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-[100px]"></div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
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
              Buat Akun Baru
            </h1>
            <p className="text-gray-400 text-sm mt-2">
              Mulai atur keuanganmu dengan FATpig
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleRegister} className="space-y-5">
            {/* Pesan Error */}
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="bg-red-500/10 border border-red-500/20 p-3 rounded-2xl flex items-center gap-2 text-red-400 text-xs font-medium"
              >
                <AlertCircle size={16} /> {errorMsg}
              </motion.div>
            )}

            {/* Input Nama */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">
                Nama Lengkap
              </label>
              <div className="relative">
                <User
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                  size={20}
                />
                <input
                  required
                  name="nama"
                  type="text"
                  placeholder="Contoh: Budi Santoso"
                  className="w-full bg-black/20 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  value={formData.nama}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Input Email */}
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
                  className="w-full bg-black/20 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Grid untuk Password & Confirm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                    size={18}
                  />
                  <input
                    required
                    name="password"
                    type="password"
                    placeholder="******"
                    className="w-full bg-black/20 border border-white/10 rounded-2xl py-4 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-sm"
                    value={formData.password}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">
                  Konfirmasi
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                    size={18}
                  />
                  <input
                    required
                    name="confirmPassword"
                    type="password"
                    placeholder="******"
                    className="w-full bg-black/20 border border-white/10 rounded-2xl py-4 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-sm"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Tombol Register */}
            <button
              disabled={loading}
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 py-4 rounded-2xl font-bold text-white shadow-lg shadow-purple-500/25 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  Daftar Sekarang <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          {/* Footer Link ke Login */}
          <div className="mt-8 text-center">
            <p className="text-gray-400 text-sm">
              Sudah punya akun?{" "}
              <Link
                to="/login"
                className="text-white font-bold hover:underline decoration-purple-500 decoration-2 underline-offset-4"
              >
                Login di sini
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
