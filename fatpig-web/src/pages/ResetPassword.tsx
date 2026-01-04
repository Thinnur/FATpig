import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Lock, Eye, EyeOff, Check, Loader2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Check if we have a valid session from the reset link
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setError("Link reset password tidak valid atau sudah kadaluarsa");
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password minimal 6 karakter");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password tidak cocok");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setSuccess(true);
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Gagal mereset password");
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
              Password Berhasil Direset!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Password Anda telah berhasil diubah. Anda akan diarahkan ke halaman login...
            </p>
            <div className="flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-purple-600" />
            </div>
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
            Reset Password
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl rounded-[32px] p-8 shadow-2xl border border-white/20">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Buat Password Baru
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 text-sm">
            Masukkan password baru Anda. Pastikan minimal 6 karakter dan mudah diingat.
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl flex items-start gap-3">
              <AlertCircle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Password Input */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Password Baru
              </label>
              <div className="relative">
                <Lock
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full pl-12 pr-12 py-4 bg-gray-50 dark:bg-[#2C2C2E] border-2 border-transparent focus:border-purple-500 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Konfirmasi Password
              </label>
              <div className="relative">
                <Lock
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Masukkan password lagi"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-[#2C2C2E] border-2 border-transparent focus:border-purple-500 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 transition-all outline-none"
                />
              </div>
            </div>

            {/* Password Strength Indicator */}
            {password && (
              <div className="text-xs text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${password.length >= 6 ? "bg-green-500" : "bg-gray-300"}`} />
                  <span>Minimal 6 karakter</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${password === confirmPassword && password ? "bg-green-500" : "bg-gray-300"}`} />
                  <span>Password cocok</span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !password || password !== confirmPassword}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Mereset Password...
                </>
              ) : (
                <>
                  <Check size={20} />
                  Reset Password
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
