import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { supabase } from "./lib/supabase";
import { Loader2 } from "lucide-react";

// Import Pages
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { RiwayatTransaksi } from "./pages/Transaksi";
import { Anggaran } from "./pages/Anggaran";
import { Pengaturan } from "./pages/Pengaturan";
import Analitik from "./pages/Analitik";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import LogoTest from "./pages/LogoTest";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
        <Loader2 className="animate-spin text-blue-500 w-10 h-10" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/transaksi"
        element={
          <ProtectedRoute>
            <RiwayatTransaksi />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analitik"
        element={
          <ProtectedRoute>
            <Analitik />
          </ProtectedRoute>
        }
      />
      <Route
        path="/anggaran"
        element={
          <ProtectedRoute>
            <Anggaran />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pengaturan"
        element={
          <ProtectedRoute>
            <Pengaturan />
          </ProtectedRoute>
        }
      />
      <Route
        path="/logo-test"
        element={
          <ProtectedRoute>
            <LogoTest />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
