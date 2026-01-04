import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Mail, ArrowLeft, Check, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Gagal mengirim email reset password");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl rounded-[32px] p-8 shadow-2xl border border-white/20">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check size={40} className="text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Email Terkirim!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Kami telah mengirimkan link reset password ke <span className="font-bold">{email}</span>.
              Silakan cek inbox Anda.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft size={20} />
              Kembali ke Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black mb-2">
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              FATpig
            </span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400 font-medium">
            Forgot Password
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl rounded-[32px] p-8 shadow-2xl border border-white/20">
          <div className="mb-6">
            <button
              onClick={() => navigate("/login")}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="text-sm font-bold">Kembali</span>
            </button>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Lupa Password?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 text-sm">
            Masukkan email Anda dan kami akan mengirimkan link untuk mereset password Anda.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-[#2C2C2E] border-2 border-transparent focus:border-purple-500 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 transition-all outline-none"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Mengirim...
                </>
              ) : (
                <>
                  <Mail size={20} />
                  Kirim Link Reset
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-8">
          Ingat password Anda?{" "}
          <button
            onClick={() => navigate("/login")}
            className="text-purple-600 dark:text-purple-400 font-bold hover:underline"
          >
            Login di sini
          </button>
        </p>
      </div>
    </div>
  );
}
